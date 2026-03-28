"""Tests for observability modules — telemetry, logging, metrics."""
import json
import logging
import pytest

from mello_api.logging_config import CloudJsonFormatter, configure_logging
from mello_api.telemetry import init_telemetry
from mello_api.metrics import (
    stories_generated,
    stories_published,
    searches_performed,
    voice_clones_completed,
    story_generation_duration,
    story_publish_duration,
    gcs_operation_duration,
    gcs_errors,
    anthropic_request_duration,
    anthropic_errors,
    genai_request_duration,
    genai_errors,
    cohere_request_duration,
    cohere_errors,
    elevenlabs_request_duration,
    elevenlabs_errors,
)


# ── Telemetry init ────────────────────────────────────────────────────────────

def test_init_telemetry_is_noop_in_dev():
    """init_telemetry() should do nothing when ENV != production."""
    # Should not raise, should not install any providers
    init_telemetry()


# ── CloudJsonFormatter ────────────────────────────────────────────────────────

class TestCloudJsonFormatter:
    def setup_method(self):
        self.formatter = CloudJsonFormatter()

    def test_output_is_valid_json(self):
        record = logging.LogRecord(
            name="test", level=logging.INFO, pathname="", lineno=0,
            msg="hello world", args=(), exc_info=None,
        )
        output = self.formatter.format(record)
        parsed = json.loads(output)
        assert parsed["message"] == "hello world"
        assert parsed["severity"] == "INFO"
        assert parsed["logger"] == "test"

    def test_severity_mapping(self):
        for level, expected in [
            (logging.DEBUG, "DEBUG"),
            (logging.INFO, "INFO"),
            (logging.WARNING, "WARNING"),
            (logging.ERROR, "ERROR"),
            (logging.CRITICAL, "CRITICAL"),
        ]:
            record = logging.LogRecord(
                name="test", level=level, pathname="", lineno=0,
                msg="x", args=(), exc_info=None,
            )
            parsed = json.loads(self.formatter.format(record))
            assert parsed["severity"] == expected

    def test_trace_id_included_when_present(self):
        record = logging.LogRecord(
            name="test", level=logging.INFO, pathname="", lineno=0,
            msg="traced", args=(), exc_info=None,
        )
        record.otelTraceID = "abc123def456"
        record.otelSpanID = "span789"
        parsed = json.loads(self.formatter.format(record))
        assert "logging.googleapis.com/trace" in parsed
        assert parsed["logging.googleapis.com/trace"].endswith("/traces/abc123def456")
        assert parsed["logging.googleapis.com/spanId"] == "span789"

    def test_trace_id_excluded_when_zero(self):
        record = logging.LogRecord(
            name="test", level=logging.INFO, pathname="", lineno=0,
            msg="no trace", args=(), exc_info=None,
        )
        record.otelTraceID = "0"
        record.otelSpanID = "0"
        parsed = json.loads(self.formatter.format(record))
        assert "logging.googleapis.com/trace" not in parsed

    def test_exception_included(self):
        try:
            raise ValueError("boom")
        except ValueError:
            import sys
            exc_info = sys.exc_info()

        record = logging.LogRecord(
            name="test", level=logging.ERROR, pathname="", lineno=0,
            msg="failed", args=(), exc_info=exc_info,
        )
        parsed = json.loads(self.formatter.format(record))
        assert "exception" in parsed
        assert "ValueError: boom" in parsed["exception"]


# ── Metrics instruments ───────────────────────────────────────────────────────

def test_metric_instruments_are_callable():
    """All metric instruments should accept calls without error (no-op in test mode)."""
    # Business counters
    stories_generated.add(1)
    stories_published.add(1)
    searches_performed.add(1)
    voice_clones_completed.add(1)
    # Business histograms
    story_generation_duration.record(1.5)
    story_publish_duration.record(10.0)
    # Per-client duration histograms
    gcs_operation_duration.record(0.5, {"operation": "upload", "bucket": "test"})
    anthropic_request_duration.record(2.0, {"operation": "messages.create"})
    genai_request_duration.record(1.0, {"operation": "embed_content"})
    cohere_request_duration.record(0.3, {"operation": "rerank"})
    elevenlabs_request_duration.record(30.0, {"operation": "tts"})
    # Per-client error counters
    gcs_errors.add(1, {"operation": "upload", "bucket": "test"})
    anthropic_errors.add(1, {"operation": "messages.create"})
    genai_errors.add(1, {"operation": "embed_content"})
    cohere_errors.add(1, {"operation": "rerank"})
    elevenlabs_errors.add(1, {"operation": "tts"})
