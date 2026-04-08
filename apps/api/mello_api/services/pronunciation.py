"""
Pronunciation map service — LLM-generated aliases for TTS pronunciation correction.

ABC interface + production (Claude) and test (mock) implementations.
"""
from __future__ import annotations

import json
import logging
import re
import time
from abc import ABC, abstractmethod

import anthropic
from opentelemetry import trace

from ..metrics import anthropic_request_duration, anthropic_errors

log = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)

_SYSTEM_PROMPT = """\
You are a pronunciation assistant for a children's story text-to-speech pipeline \
powered by ElevenLabs.

TARGET ACCENT: {accent}

Analyze the story text below and identify words that ElevenLabs is likely to \
mispronounce. Focus on:
- Character names and made-up/fantasy names
- Loanwords from other languages (especially food, cultural terms)
- Regional or cultural words
- Words where stress placement is ambiguous for the target accent
- Onomatopoeia with unusual spelling

For each problematic word, provide an alias — an alternative spelling that \
ElevenLabs will read aloud correctly. The alias is substituted into the text \
before speech synthesis, so it must read as natural flowing text.

CRITICAL rules for writing aliases:
- Write the alias as a natural English word or phrase, NOT a phonetic breakdown
- Do NOT use hyphens, caps, or syllable markers — ElevenLabs reads those literally
- Good: "Idli" → "idlee", "Māui" → "Mauee", "quinoa" → "keenwah"
- Bad: "Idli" → "ID-lee" (ElevenLabs would say "I-D-lee")
- Bad: "quinoa" → "KEEN-wah" (ElevenLabs would shout KEEN)
- The alias should sound correct when read as plain English text
- Only include words that genuinely need correction
- If no words need correction, return an empty object

Respond with ONLY a JSON object (no markdown, no code fences):
{{"original_word": "alias", ...}}"""


class PronunciationService(ABC):
    @abstractmethod
    async def generate_map(self, text: str, accent: str) -> dict[str, str]: ...


class ClaudePronunciationService(PronunciationService):
    MODEL = "claude-opus-4-6"

    def __init__(self, api_key: str) -> None:
        self._client = anthropic.AsyncAnthropic(api_key=api_key)

    async def generate_map(self, text: str, accent: str) -> dict[str, str]:
        with tracer.start_as_current_span(
            "anthropic.pronunciation_map",
            attributes={
                "anthropic.model": self.MODEL,
                "anthropic.text_length": len(text),
                "anthropic.accent": accent,
            },
        ) as span:
            t0 = time.monotonic()
            try:
                message = await self._client.messages.create(
                    model=self.MODEL,
                    max_tokens=2048,
                    system=_SYSTEM_PROMPT.format(accent=accent),
                    messages=[{"role": "user", "content": text}],
                )
                duration = time.monotonic() - t0
                anthropic_request_duration.record(
                    duration, {"operation": "pronunciation_map"}
                )
                span.set_attribute("anthropic.input_tokens", message.usage.input_tokens)
                span.set_attribute("anthropic.output_tokens", message.usage.output_tokens)
            except Exception as e:
                anthropic_errors.add(1, {"operation": "pronunciation_map"})
                span.set_status(trace.StatusCode.ERROR, str(e))
                log.warning("Claude pronunciation map call failed: %s", e)
                return {}

        raw = message.content[0].text.strip() if message.content else ""
        # Extract JSON object from response — model may wrap in code fences
        # or append extra text after the JSON
        match = re.search(r"\{[^{}]*\}", raw)
        if match:
            raw = match.group(0)
        try:
            result = json.loads(raw)
            if not isinstance(result, dict):
                log.warning("Pronunciation map returned non-dict: %s", type(result))
                return {}
            log.info("Pronunciation map generated %d aliases for accent=%s: %s", len(result), accent, result)
            return result
        except json.JSONDecodeError:
            log.warning("Pronunciation map returned invalid JSON: %.200s", raw)
            return {}


class MockPronunciationService(PronunciationService):
    """Returns empty dict for tests — no API calls."""

    async def generate_map(self, text: str, accent: str) -> dict[str, str]:
        return {}
