#!/usr/bin/env python3
"""
Backfill themes + embeddings for existing stories.

Usage:
    python scripts/backfill-embeddings.py
    python scripts/backfill-embeddings.py --only park-01,bedtime-03
    python scripts/backfill-embeddings.py --skip-existing
    python scripts/backfill-embeddings.py --dry-run

Reads all published stories from Firestore, generates themes via Claude
(for stories missing them), generates embeddings via Vertex AI, and
writes both back to Firestore.
"""

import argparse
import json
import os
import sys
import time

import anthropic
from google import genai
from google.cloud import firestore

PROJECT_ID = "melo-f5756"
LOCATION = "us-central1"
EMBEDDING_MODEL = "text-embedding-005"

ANTHROPIC_API_KEY = os.environ.get(
    "ANTHROPIC_API_KEY", ""
)

THEME_SYSTEM_PROMPT = """\
You are analyzing children's stories for a semantic search system. Given a story, \
produce an elaborate paragraph describing the deeper themes, lessons, emotions, and \
real-life situations this story addresses.

Write as if explaining to a parent what their child will learn. Include specific \
scenarios like 'sibling jealousy', 'first day of school anxiety', 'learning to share \
with a new baby'. Be thorough — this text powers semantic search so parents can find \
stories by describing their child's situation.

Respond with ONLY the themes paragraph. No JSON, no markdown, no labels — just the \
paragraph text.
"""


def generate_themes(client: anthropic.Anthropic, title: str, description: str, story_text: str) -> str:
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=THEME_SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"Title: {title}\nDescription: {description}\n\nStory:\n{story_text}",
        }],
    )
    return message.content[0].text.strip()


def generate_embedding(client: genai.Client, text: str) -> list[float]:
    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
    )
    return list(response.embeddings[0].values)


def main():
    parser = argparse.ArgumentParser(description="Backfill themes + embeddings for Mello stories")
    parser.add_argument("--only", default=None, help="Comma-separated story IDs to process")
    parser.add_argument("--skip-existing", action="store_true", help="Skip stories that already have embeddings")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be done without writing")
    args = parser.parse_args()

    if not ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY env var is required")
        sys.exit(1)

    db = firestore.Client(project=PROJECT_ID)
    anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    genai_client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

    # Fetch all published stories
    docs = db.collection("stories").where("isPublished", "==", True).stream()
    stories = [(d.id, d.to_dict()) for d in docs]

    if args.only:
        ids = set(args.only.split(","))
        stories = [(sid, data) for sid, data in stories if sid in ids]

    print(f"Processing {len(stories)} stories...\n")

    themes_generated = 0
    embeddings_generated = 0

    for i, (story_id, data) in enumerate(stories):
        title = data.get("title", "")
        description = data.get("description", "")
        story_text = data.get("storyText", "")
        existing_themes = data.get("themes", "")
        existing_embedding = data.get("embedding", [])

        print(f"[{i+1}/{len(stories)}] {story_id}: {title}")

        if args.skip_existing and existing_themes and existing_embedding:
            print("  Skipped (already has themes + embedding)")
            continue

        update_data = {}

        # Generate themes if missing
        if not existing_themes:
            if args.dry_run:
                print("  Would generate themes via Claude")
            else:
                print("  Generating themes via Claude...")
                themes = generate_themes(anthropic_client, title, description, story_text)
                update_data["themes"] = themes
                existing_themes = themes
                themes_generated += 1
                print(f"  Themes: {themes[:100]}...")
                time.sleep(2)  # Rate limit Claude calls
        else:
            print(f"  Themes exist: {existing_themes[:80]}...")

        # Generate embedding
        if not existing_embedding or "themes" in update_data:
            embed_text = f"{title}. {description}. {existing_themes}"
            if args.dry_run:
                print(f"  Would generate embedding ({len(embed_text)} chars)")
            else:
                print("  Generating embedding via Vertex AI...")
                embedding = generate_embedding(genai_client, embed_text)
                update_data["embedding"] = embedding
                embeddings_generated += 1
                print(f"  Embedding: {len(embedding)} dimensions")
                time.sleep(1)  # Rate limit embedding calls
        else:
            print(f"  Embedding exists ({len(existing_embedding)} dims)")

        # Write updates
        if update_data and not args.dry_run:
            db.collection("stories").document(story_id).update(update_data)
            print("  Updated Firestore")

    print(f"\nDone! {themes_generated} themes generated, {embeddings_generated} embeddings generated.")


if __name__ == "__main__":
    main()
