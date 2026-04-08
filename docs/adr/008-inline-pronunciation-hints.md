# ADR 008 — Inline pronunciation hints for TTS

**Status:** Accepted

## Context

ElevenLabs' `eleven_multilingual_v2` model frequently mispronounces regional words, cultural terms, and character names — especially in stories with non-English vocabulary (e.g., Indian food words like "Idli", "Dosa", "upma"). The multilingual model interprets unfamiliar words through multiple language phonetic systems, producing inconsistent or incorrect pronunciation.

We tried two automated approaches that failed:

1. **ElevenLabs Pronunciation Dictionaries** — alias rules created via the API and attached to TTS calls. The dictionaries were created successfully but the multilingual model largely ignored or mangled the aliases (e.g., "idlee" was read as "idle-y", "dosaa" as "dasayah").

2. **LLM-generated pronunciation maps** — Claude generated a map of word-to-alias substitutions at publish time, which were applied as inline text replacements before TTS. The LLM reliably identified problematic words, but the aliases it produced were also mangled by the multilingual model. The core issue is that no one can predict how ElevenLabs will interpret a given respelling — it requires trial and error with the actual TTS engine.

## Decision

Authors annotate pronunciation directly in the story text using curly-brace hints:

```
"How strange," said upma {oopma}. Idli {idlee} bounced happily.
```

At publish time, the audio publisher splits the text into two versions:

- **TTS input:** `"How strange," said oopma. idlee bounced happily.` — the word before `{...}` is replaced by the hint
- **Display output:** `"How strange," said upma. Idli bounced happily.` — hints are stripped, original spelling preserved

The display version is used for sentence segments (the read-along UI). The TTS version is sent to ElevenLabs. The raw text with hints is stored in Firestore as-is so the author can iterate.

## Reasons

1. **Author has final say.** Only a human listening to the output can judge whether a pronunciation sounds right. Automated approaches (LLM maps, pronunciation dictionaries) can't predict how the TTS engine will interpret a given spelling.

2. **Zero infrastructure.** No API calls to create/delete dictionaries, no LLM inference at publish time, no ephemeral resources to manage. The hints live in the text itself.

3. **Iterative.** The author edits the hint, republishes, listens, adjusts. Fast feedback loop with no intermediaries.

4. **Transparent.** The `{hint}` syntax is visible in the editor. No hidden pronunciation state or side-channel data.

## Implementation

Two static methods on `ElevenLabsPublisher` (`apps/api/mello_api/services/audio_publisher.py`):

- `_prepare_for_tts(text)` — `re.sub(r'\S+\s*\{([^}]+)\}', r'\1', text)`
- `_prepare_for_display(text)` — `re.sub(r'\s*\{[^}]+\}', '', text)`

Called at the top of `publish()` before TTS and segment generation respectively.

## Trade-offs

- **Manual effort.** The author must identify and fix mispronunciations themselves. This is acceptable because the creator flow already includes a preview/republish loop.
- **Hints visible in raw text.** If the raw `storyText` field is ever exposed directly (e.g., in an API response or export), hints would be visible. The display stripping should be applied at read time too if this becomes an issue.
- **No bulk fix.** If a word is mispronounced across many stories, each story must be edited individually. A global dictionary could be layered on later if needed.
