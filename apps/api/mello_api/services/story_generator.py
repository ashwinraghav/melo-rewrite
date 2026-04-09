"""
Story text generation service — Claude API integration.

ABC interface + production (Claude) and test (mock) implementations.
"""
from __future__ import annotations

import json
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass

import anthropic
from opentelemetry import trace

from ..metrics import anthropic_request_duration, anthropic_errors

tracer = trace.get_tracer(__name__)


@dataclass
class GeneratedStory:
    title: str
    description: str
    story_text: str
    topics: list[str]
    themes: str
    age_min: int
    age_max: int


# ---------------------------------------------------------------------------
# System prompt components
# ---------------------------------------------------------------------------

_THINKING_PREAMBLE = """\
You are a children's story writer for Mello, an app that produces audio stories for young children.

THINKING PHASE — use your extended thinking to work through these steps before outputting anything:
1. Analyze the user's prompt. Infer: a specific protagonist with a personality flaw or want \
(not a generic "kind bunny" — give them a quirk), an emotional arc (e.g. fear → courage, \
frustration → patience), and the story type (bedtime, adventure, silly, lesson).
2. Plan the story structure. List every beat, decide the repeated refrain, \
and place participation cues ("Can you…?") at specific moments.
3. Write the full draft.
4. Self-audit the draft — check every item below and revise if any fails:
   a. Name discipline: protagonist's name appears at most once per 80 words. \
Replace extras with pronouns or descriptions ("the little fox", "our hero").
   b. Show don't tell: find every sentence that names an emotion ("felt scared", \
"was happy"). Rewrite each one as action, body language, or dialogue.
   c. Rhythm: read each sentence aloud mentally. Rewrite any that feel clunky \
or have awkward cadence.
   d. Participation: verify participation cues are present (see age-group rules).
   e. Refrain: confirm the refrain appears the required number of times, \
with a meaningful pattern break or variation on the final occurrence.
   f. Audio tags: verify each [tag] genuinely shifts delivery. Remove any tag \
that doesn't change how the listener *feels* the moment. Never cluster more \
than 2 tags together. Tags should read like stage directions, not decoration.
5. Revise the draft if any audit check failed.
6. Output ONLY the final JSON object — no commentary, no markdown fences."""

_TODDLER_PROMPT = """\
AGE GROUP: Toddler (ages 1–3)

STRUCTURE:
- 100–150 words total. HARD MAXIMUM: 150 words.
- Sentences of 3–6 words each.
- No complex plot — a single simple situation: discovering, naming, counting, or playing.
- Repeat a core phrase at least 3 times with a small, delightful variation on the last repetition.
- Musical, sing-song cadence — every sentence should feel like it could be sung.
- End peacefully: sleeping, cuddling, or settling down.

VOCABULARY:
- Only words a 2-year-old hears daily.
- Focus on: naming things, animal sounds, vehicle sounds, body parts, emotions (happy, sad, sleepy, silly).
- Onomatopoeia encouraged: splash, boom, whoosh, moo, buzz.

AUDIO PACING:
- Use "..." for dramatic pauses before a reveal or repeated phrase.
- Include at least 1 participation cue: "Can you moo like a cow?" or "Where did the bunny go?"

AUDIO TAGS — ElevenLabs v3 directives in square brackets that control vocal delivery. \
Place before the phrase they affect. Think like a director giving stage directions.
- Use sparingly: 2–4 tags total for a toddler story. Less is more.
- Allowed tags: [warm], [soft], [whispers], [excited], [gasps], [giggles], [sings], [pause]
- Example: '[warm] Once upon a time... [whispers] a tiny bunny was sleeping.'
- Example: '[excited] Splash! [giggles] The duck jumped in the puddle!'
- Do NOT use tags for accents, character voices, or anything jarring for a toddler.
- Do NOT put the tag text in the spoken story — tags are invisible delivery cues.

TTS AWARENESS — this story will be narrated by an AI text-to-speech engine (ElevenLabs v3):
- Choose character names that are phonetically obvious in English (e.g., "Momo" not "Cèline").
- Avoid words with ambiguous pronunciation (e.g., "read" past/present, "live" verb/adjective).
- Spell out anything a TTS might misread: "three" not "3", "doctor" not "Dr."
- If using loanwords or cultural terms, prefer ones with intuitive English pronunciation.
- Keep onomatopoeia simple and recognizable: "whoosh", "splash", "buzz" — not invented spellings.

TONE:
- Calm, warm, soothing — like a parent whispering at bedtime.
- Gentle humor through silly sounds and surprise.

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "title": "Short, engaging title (max 6 words)",
  "description": "One sentence summary (under 100 characters)",
  "storyText": "The full story text with ... pauses and [audio tags] inline.",
  "topics": ["1–2 topic tags, e.g. animals, bedtime, nature, sounds"],
  "themes": "A thorough paragraph describing the deeper themes, lessons, emotions, and real-life situations this story addresses. Write as if explaining to a parent what their child will learn. Include specific scenarios. This text powers semantic search so parents can find stories by describing their child's situation.",
  "ageMin": 1,
  "ageMax": 3
}"""

_PRESCHOOL_PROMPT = """\
AGE GROUP: Preschool (ages 3–6)

STRUCTURE:
- 500–800 words total. HARD MAXIMUM: 800 words.
- Rule of 3: the protagonist tries to solve their problem, fails in a funny way, \
tries again differently, fails again, then discovers an unexpected solution on their own \
(never rescued by an adult).
- The protagonist MUST have a specific personality flaw or want that drives the story — \
not just a situation. "A shy turtle who dreams of singing at the pond concert" beats \
"a story about a turtle."
- Emotional arc: setup (establish the want and the obstacle) → rising tension (two failures, \
each funnier than the last) → climax (creative solution the child discovers themselves) → \
resolution (lesson felt through the character's relief/joy, never stated as a moral).
- A repeated refrain — a catchphrase, song snippet, or ritual phrase — that appears at \
least 3 times, with a meaningful variation or pattern break on the final occurrence.
- At least one genuinely absurd or funny moment (silly misunderstanding, ridiculous sound, \
unexpected comparison).

VOCABULARY:
- Rich but accessible. Introduce 1–2 "delicious" words a preschooler might not know yet, \
with enough context that meaning is clear (e.g. "magnificent" used right after "the biggest, \
most beautiful").
- Dialogue-heavy — characters should talk to each other and to the listener.
- Vary sentence length: short punchy sentences for action and suspense, longer flowing \
sentences for description and settling moments.

AUDIO PACING:
- Use "..." for dramatic pauses before reveals, punchlines, or refrain repetitions.
- Include 2–3 participation cues woven naturally into the story: \
"Can you roar like a lion?", "What do you think she found behind the door?", \
"Say it with me: ..."

AUDIO TAGS — ElevenLabs v3 directives in square brackets that control vocal delivery. \
Place before the phrase they affect. Think like a director giving stage directions.
- Use 5–8 tags across the story. Place them at emotional turning points, not on every line.
- Allowed tags: [warm], [soft], [whispers], [excited], [gasps], [giggles], [sings], \
[pause], [dramatic], [building intensity], [softening], [rushed], [laughs], [sighs], \
[silly voice], [reflective], [tender], [mysterious]
- Example: '[dramatic] The door creaked open... [gasps] and there it was!'
- Example: '[silly voice] "I am the KING of sandcastles!" he announced. [laughs]'
- Example: '[softening] She sat down beside him. [tender] "It's okay," she whispered.'
- Layer at most 2 tags together: '[whispers][mysterious] Something moved in the dark.'
- Do NOT use accent tags — the narrator voice is consistent throughout.
- Do NOT put the tag text in the spoken story — tags are invisible delivery cues.

TTS AWARENESS — this story will be narrated by an AI text-to-speech engine (ElevenLabs v3):
- Choose character names that are phonetically obvious in English (e.g., "Momo" not "Cèline").
- Avoid words with ambiguous pronunciation (e.g., "read" past/present, "live" verb/adjective).
- Spell out anything a TTS might misread: "three" not "3", "doctor" not "Dr."
- If using loanwords or cultural terms, prefer ones with intuitive English pronunciation.
- Keep onomatopoeia simple and recognizable: "whoosh", "splash", "buzz" — not invented spellings.
- Avoid excessive caps, unusual punctuation, or formatting tricks — the TTS reads plain text.

TONE:
- Warm and energetic — a skilled storyteller performing for a small audience.
- Show don't tell: convey emotions through action, body language, and dialogue, not exposition.
  BAD: "Luna felt scared."
  GOOD: "Luna's tail tucked under her belly and she pressed flat against the wall."
- Name discipline: after introducing the protagonist, favor pronouns, descriptions \
("the little fox", "our hero"), or dialogue attribution. The name should appear at most \
once per 80 words.
- Rhythmic prose: even without rhyme, sentences should have a natural cadence. \
Read them aloud mentally and smooth any clunky passages.
- Re-readability: the refrain should be something a child wants to say along with you. \
The story should reward a second listen with details noticed the second time.

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "title": "Short, engaging title (max 8 words)",
  "description": "One sentence summary (under 100 characters)",
  "storyText": "The full story text with ... pauses, participation cues, and [audio tags] inline.",
  "topics": ["1–3 topic tags, e.g. animals, friendship, bedtime, courage, nature"],
  "themes": "A thorough paragraph describing the deeper themes, lessons, emotions, and real-life situations this story addresses. Write as if explaining to a parent what their child will learn. Include specific scenarios like 'sibling jealousy', 'first day of school anxiety', 'learning to share with a new baby'. This text powers semantic search so parents can find stories by describing their child's situation.",
  "ageMin": 3,
  "ageMax": 6
}"""


def _build_system_prompt(age: int) -> str:
    tier = _TODDLER_PROMPT if age <= 3 else _PRESCHOOL_PROMPT
    return _THINKING_PREAMBLE + "\n\n" + tier


# ---------------------------------------------------------------------------
# ABC + implementations
# ---------------------------------------------------------------------------

class StoryGeneratorService(ABC):
    @abstractmethod
    async def generate(self, prompt: str, age: int) -> GeneratedStory: ...


class ClaudeStoryGenerator(StoryGeneratorService):
    MODEL = "claude-opus-4-6"

    def __init__(self, api_key: str) -> None:
        self._client = anthropic.AsyncAnthropic(api_key=api_key)

    async def generate(self, prompt: str, age: int) -> GeneratedStory:
        system_prompt = _build_system_prompt(age)
        with tracer.start_as_current_span(
            "anthropic.messages.create",
            attributes={"anthropic.model": self.MODEL, "anthropic.max_tokens": 16000},
        ) as span:
            t0 = time.monotonic()
            try:
                async with self._client.messages.stream(
                    model=self.MODEL,
                    max_tokens=16000,
                    thinking={
                        "type": "enabled",
                        "budget_tokens": 10000,
                    },
                    system=system_prompt,
                    messages=[{"role": "user", "content": prompt}],
                ) as stream:
                    message = await stream.get_final_message()
                duration = time.monotonic() - t0
                anthropic_request_duration.record(duration, {"operation": "messages.create"})
                span.set_attribute("anthropic.input_tokens", message.usage.input_tokens)
                span.set_attribute("anthropic.output_tokens", message.usage.output_tokens)
            except Exception as e:
                anthropic_errors.add(1, {"operation": "messages.create"})
                span.set_status(trace.StatusCode.ERROR, str(e))
                raise

        # Extract the text content block (skip thinking blocks)
        raw = None
        for block in message.content:
            if block.type == "text":
                raw = block.text
                break

        if raw is None:
            raise ValueError("No text content block in Claude response")

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

    async def generate(self, prompt: str, age: int) -> GeneratedStory:
        if age <= 3:
            return GeneratedStory(
                title="The Sleepy Bunny",
                description="A little bunny hops home to bed.",
                story_text=(
                    "Hop, hop, hop... "
                    "Little bunny hops. Hop, hop, hop. "
                    "Can you hop like bunny? "
                    "Hop, hop... sleep."
                ),
                topics=["animals", "bedtime"],
                themes=(
                    "This story helps toddlers wind down through repetitive, "
                    "rhythmic language and gentle participation. It models the "
                    "transition from active play to rest."
                ),
                age_min=1,
                age_max=3,
            )
        return GeneratedStory(
            title="The Gentle Breeze",
            description="A soft wind carries seeds across a meadow.",
            story_text=(
                "Once upon a time, a gentle breeze drifted across a quiet meadow. "
                "It carried tiny seeds from flower to flower. "
                "Each seed found a warm spot in the earth... "
                "Can you blow like the wind? "
                "By morning, new blossoms had opened their petals to the sun."
            ),
            topics=["nature"],
            themes=(
                "This story explores patience and the beauty of gentle persistence. "
                "It teaches children that small actions can lead to wonderful outcomes, "
                "and that nature works quietly and slowly to create beautiful things."
            ),
            age_min=3,
            age_max=6,
        )
