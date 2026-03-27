"""
Story text generation service — Claude API integration.

ABC interface + production (Claude) and test (mock) implementations.
"""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass

import anthropic


@dataclass
class GeneratedStory:
    title: str
    description: str
    story_text: str
    topics: list[str]
    themes: str
    age_min: int
    age_max: int


SYSTEM_PROMPT = """\
You are a children's story writer for Mello, an app that produces calm, lo-fi audio stories \
for young children (ages 1-12).

Given the user's prompt (which may be anything from a rough outline to a full story), \
produce a complete, well-written story suitable for audio narration.

Guidelines:
- Calm, gentle, soothing tone — like a bedtime storybook
- Age-appropriate vocabulary and themes
- 200-500 words (ideal length for 2-5 minute audio)
- Simple sentence structure for clear narration
- End on a peaceful, positive note
- No violence, scary content, or overly stimulating themes

Respond with ONLY a JSON object (no markdown, no code fences) with these fields:
{
  "title": "Short, engaging title",
  "description": "One sentence summary (under 100 characters)",
  "storyText": "The full story text, written as continuous prose with proper sentences.",
  "topics": ["one or two topic tags, e.g. park, friends, bedtime, food, animals, nature"],
  "themes": "An elaborate paragraph describing the deeper themes, lessons, emotions, and real-life situations this story addresses. Write as if explaining to a parent what their child will learn. Include specific scenarios like 'sibling jealousy', 'first day of school anxiety', 'learning to share with a new baby'. Be thorough — this text powers semantic search so parents can find stories by describing their child's situation.",
  "ageMin": 1,
  "ageMax": 6
}
"""


class StoryGeneratorService(ABC):
    @abstractmethod
    async def generate(self, prompt: str) -> GeneratedStory: ...


class ClaudeStoryGenerator(StoryGeneratorService):
    def __init__(self, api_key: str) -> None:
        self._client = anthropic.AsyncAnthropic(api_key=api_key)

    async def generate(self, prompt: str) -> GeneratedStory:
        message = await self._client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text
        data = json.loads(raw)
        return GeneratedStory(
            title=data["title"],
            description=data["description"],
            story_text=data["storyText"],
            topics=data["topics"],
            themes=data.get("themes", ""),
            age_min=data.get("ageMin", 1),
            age_max=data.get("ageMax", 6),
        )


class MockStoryGenerator(StoryGeneratorService):
    """Returns canned data for tests — no API calls."""

    async def generate(self, prompt: str) -> GeneratedStory:
        return GeneratedStory(
            title="The Gentle Breeze",
            description="A soft wind carries seeds across a meadow.",
            story_text=(
                "Once upon a time, a gentle breeze drifted across a quiet meadow. "
                "It carried tiny seeds from flower to flower. "
                "Each seed found a warm spot in the earth. "
                "By morning, new blossoms had opened their petals to the sun."
            ),
            topics=["nature"],
            themes=(
                "This story explores patience and the beauty of gentle persistence. "
                "It teaches children that small actions can lead to wonderful outcomes, "
                "and that nature works quietly and slowly to create beautiful things."
            ),
            age_min=1,
            age_max=6,
        )
