"""Tests for cover art generation: safety filter detection, fallback prompts, logging."""
import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from mello_api.services.cover_generator import (
    VertexCoverGenerator,
    build_cover_prompt,
    build_safe_fallback_prompt,
)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_image_response(image_bytes: bytes | None = b"PNG_DATA", rai_reason: str | None = None):
    """Build a fake GenerateImagesResponse."""
    if image_bytes is None and rai_reason is None:
        # Empty response — no images at all
        return SimpleNamespace(generated_images=None)
    img = SimpleNamespace(
        image=SimpleNamespace(image_bytes=image_bytes) if image_bytes else None,
        rai_filtered_reason=rai_reason,
    )
    return SimpleNamespace(generated_images=[img])


def _make_generator() -> tuple[VertexCoverGenerator, AsyncMock, AsyncMock]:
    """Create a VertexCoverGenerator with mocked Imagen client and GCS storage."""
    gen = VertexCoverGenerator.__new__(VertexCoverGenerator)
    gen._bucket_name = "test-bucket"

    mock_generate = AsyncMock()
    gen._client = SimpleNamespace(
        aio=SimpleNamespace(
            models=SimpleNamespace(generate_images=mock_generate)
        )
    )

    mock_upload = AsyncMock()
    gen._storage = SimpleNamespace(upload=mock_upload)

    return gen, mock_generate, mock_upload


# ── Prompt builders ──────────────────────────────────────────────────────────

def test_build_cover_prompt_includes_title_and_description():
    prompt = build_cover_prompt("Brave Bunny", "A bunny overcomes fear", ["courage"])
    assert "Brave Bunny" in prompt
    assert "A bunny overcomes fear" in prompt


def test_build_cover_prompt_uses_topic_palette():
    prompt = build_cover_prompt("Night Story", "Sleepy time", ["bedtime"])
    assert "lavenders" in prompt


def test_build_safe_fallback_prompt_has_no_story_content():
    prompt = build_safe_fallback_prompt(["sports"])
    assert "peaceful" in prompt.lower()
    # Should NOT contain any story-specific content
    assert "Theme:" not in prompt
    assert "Scene mood:" not in prompt


# ── Successful generation ────────────────────────────────────────────────────

def test_generate_and_upload_success():
    """Happy path: Imagen returns an image, both variants uploaded to GCS."""
    gen, mock_generate, mock_upload = _make_generator()

    # Create a real 1x1 PNG so Pillow can open it
    import io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), color="red").save(buf, "PNG")
    png_bytes = buf.getvalue()

    mock_generate.return_value = _make_image_response(image_bytes=png_bytes)

    result = asyncio.run(
        gen.generate_and_upload("story-1", "Title", "Desc", ["park"])
    )

    assert result == "stories/story-1/cover.webp"
    assert mock_generate.await_count == 1
    # Two uploads: cover.webp + thumb.webp
    assert mock_upload.await_count == 2
    paths = [call.args[1] for call in mock_upload.call_args_list]
    assert "stories/story-1/cover.webp" in paths
    assert "stories/story-1/thumb.webp" in paths


# ── All retries fail → returns None ──────────────────────────────────────────

def test_generate_returns_none_on_total_failure():
    """When Imagen returns no images for all attempts, returns None (not a ghost path)."""
    gen, mock_generate, mock_upload = _make_generator()
    mock_generate.return_value = _make_image_response(image_bytes=None, rai_reason=None)

    result = asyncio.run(
        gen.generate_and_upload("story-1", "Title", "Desc", ["park"])
    )

    assert result is None
    assert mock_upload.await_count == 0
    assert mock_generate.await_count == 3  # MAX_RETRIES


# ── Safety filter (output filtered via RAI reason) ───────────────────────────

def test_safety_filter_triggers_fallback_prompt():
    """When Imagen returns a rai_filtered_reason, switches to fallback prompt on next attempt."""
    gen, mock_generate, mock_upload = _make_generator()

    import io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), color="blue").save(buf, "PNG")
    png_bytes = buf.getvalue()

    # Attempt 1: safety filtered → attempt 2: success with fallback prompt
    mock_generate.side_effect = [
        _make_image_response(image_bytes=None, rai_reason="56562880"),
        _make_image_response(image_bytes=png_bytes),
    ]

    result = asyncio.run(
        gen.generate_and_upload("story-1", "Title", "Desc", ["park"])
    )

    assert result == "stories/story-1/cover.webp"
    assert mock_generate.await_count == 2
    # Second call should use the fallback prompt
    second_call_prompt = mock_generate.call_args_list[1].kwargs.get("prompt") or mock_generate.call_args_list[1].args[0]
    fallback = build_safe_fallback_prompt(["park"])
    assert second_call_prompt == fallback


# ── Safety filter (input rejected via exception) ────────────────────────────

def test_safety_exception_triggers_fallback_prompt():
    """HTTP 400 safety rejection triggers fallback prompt on retry."""
    gen, mock_generate, mock_upload = _make_generator()

    import io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), color="green").save(buf, "PNG")
    png_bytes = buf.getvalue()

    safety_error = Exception(
        "Image generation failed: This prompt contains sensitive words "
        "that violate Google's Responsible AI practices."
    )
    mock_generate.side_effect = [
        safety_error,
        _make_image_response(image_bytes=png_bytes),
    ]

    result = asyncio.run(
        gen.generate_and_upload("story-1", "Title", "Desc", ["park"])
    )

    assert result == "stories/story-1/cover.webp"
    assert mock_generate.await_count == 2
    second_call_prompt = mock_generate.call_args_list[1].kwargs.get("prompt") or mock_generate.call_args_list[1].args[0]
    fallback = build_safe_fallback_prompt(["park"])
    assert second_call_prompt == fallback


# ── Safety filter all retries exhausted ──────────────────────────────────────

def test_safety_filter_all_retries_returns_none():
    """If safety filter blocks all attempts (including fallback), returns None."""
    gen, mock_generate, mock_upload = _make_generator()
    mock_generate.return_value = _make_image_response(image_bytes=None, rai_reason="17301594")

    result = asyncio.run(
        gen.generate_and_upload("story-1", "Title", "Desc", ["park"])
    )

    assert result is None
    assert mock_upload.await_count == 0


# ── Logging ──────────────────────────────────────────────────────────────────

def test_logs_error_on_total_failure(caplog):
    """log.error is emitted when all retries are exhausted."""
    gen, mock_generate, mock_upload = _make_generator()
    mock_generate.return_value = _make_image_response(image_bytes=None, rai_reason=None)

    with caplog.at_level("ERROR", logger="mello_api.services.cover_generator"):
        asyncio.run(gen.generate_and_upload("story-99", "Title", "Desc", ["park"]))

    assert any("story-99" in r.message and "failed" in r.message.lower() for r in caplog.records)


def test_logs_rai_reason_on_filter(caplog):
    """log.warning includes the RAI reason code when an image is filtered."""
    gen, mock_generate, mock_upload = _make_generator()
    mock_generate.return_value = _make_image_response(image_bytes=None, rai_reason="56562880")

    with caplog.at_level("WARNING", logger="mello_api.services.cover_generator"):
        asyncio.run(gen.generate_and_upload("story-1", "Title", "Desc", ["park"]))

    assert any("56562880" in r.message for r in caplog.records)


def test_logs_safety_exception(caplog):
    """log.warning includes 'safety filter' when input prompt is rejected."""
    gen, mock_generate, mock_upload = _make_generator()
    mock_generate.side_effect = Exception(
        "This prompt contains sensitive words that violate Google's Responsible AI practices."
    )

    with caplog.at_level("WARNING", logger="mello_api.services.cover_generator"):
        asyncio.run(gen.generate_and_upload("story-1", "Title", "Desc", ["park"]))

    assert any("safety filter" in r.message.lower() for r in caplog.records)


def test_logs_fallback_switch(caplog):
    """log.info mentions switching to fallback when safety is triggered."""
    gen, mock_generate, mock_upload = _make_generator()
    mock_generate.return_value = _make_image_response(image_bytes=None, rai_reason="22137204")

    with caplog.at_level("INFO", logger="mello_api.services.cover_generator"):
        asyncio.run(gen.generate_and_upload("story-1", "Title", "Desc", ["park"]))

    assert any("fallback" in r.message.lower() for r in caplog.records)


# ── Non-safety errors ────────────────────────────────────────────────────────

def test_non_safety_error_does_not_switch_prompt():
    """A generic API error should not trigger the fallback prompt."""
    gen, mock_generate, mock_upload = _make_generator()

    import io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), color="red").save(buf, "PNG")
    png_bytes = buf.getvalue()

    mock_generate.side_effect = [
        Exception("503 Service Unavailable"),
        _make_image_response(image_bytes=png_bytes),
    ]

    result = asyncio.run(
        gen.generate_and_upload("story-1", "Title", "Desc", ["park"])
    )

    assert result == "stories/story-1/cover.webp"
    # Second call should still use the original prompt, not the fallback
    original = build_cover_prompt("Title", "Desc", ["park"])
    second_call_prompt = mock_generate.call_args_list[1].kwargs.get("prompt") or mock_generate.call_args_list[1].args[0]
    assert second_call_prompt == original
