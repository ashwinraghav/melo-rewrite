#!/usr/bin/env python3
"""
Generate cover art for Mello stories using Gemini image generation.

Usage:
    python scripts/generate-covers.py
    python scripts/generate-covers.py --only park-01,bedtime-03
    python scripts/generate-covers.py --skip-existing
    python scripts/generate-covers.py --dry-run

Reads story metadata from scripts/stories-output/manifest.json.
Outputs WebP images to scripts/stories-output/covers/{story-id}.webp
"""

import argparse
import json
import sys
import time
from pathlib import Path

from google import genai
from google.genai import types
from PIL import Image
import io

OUTPUT_DIR = Path(__file__).parent / "stories-output"
COVERS_DIR = OUTPUT_DIR / "covers"

PROJECT_ID = "melo-f5756"
LOCATION = "us-central1"

# Imagen 3 model for image generation (Vertex AI)
MODEL = "imagen-3.0-generate-002"

# Consistent style prompt shared across all covers
STYLE_PROMPT = (
    "Create a children's book cover illustration in a soft watercolor style. "
    "Use gentle pastel colors with a warm, dreamy atmosphere. "
    "The style should be calm, cozy, and lo-fi — like a bedtime storybook. "
    "IMPORTANT: Do not include any text, words, letters, numbers, or title anywhere in the image. Pure illustration only, no typography. "
    "Soft rounded shapes, gentle lighting, muted shadows. "
    "The color palette should lean toward soft blues, lavenders, warm peaches, "
    "and mint greens on a slightly warm off-white background. "
    "Square format, simple composition with a clear focal point."
)

# Topic-specific color hints
TOPIC_PALETTE = {
    "park": "Use soft greens, warm yellows, and sky blues.",
    "friends": "Use warm peaches, soft pinks, and gentle lavenders.",
    "bedtime": "Use deep soft blues, lavenders, and moonlit silver tones.",
    "food": "Use warm oranges, soft reds, gentle yellows, and cream tones.",
}


def build_prompt(story: dict) -> str:
    """Build an image generation prompt from story metadata."""
    topic = story["topics"][0] if story["topics"] else "park"
    palette_hint = TOPIC_PALETTE.get(topic, "")

    return (
        f"{STYLE_PROMPT}\n\n"
        f"Story title: \"{story['title']}\"\n"
        f"Story description: {story['description']}\n"
        f"{palette_hint}\n\n"
        f"Illustrate the main scene or character from this children's story."
    )


def generate_cover(client: genai.Client, story: dict, output_path: Path, max_retries: int = 5) -> bool:
    """Generate a cover image for a single story. Retries on rate limit errors."""
    prompt = build_prompt(story)

    for attempt in range(max_retries):
        try:
            response = client.models.generate_images(
                model=MODEL,
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="1:1",
                ),
            )

            if not response.generated_images:
                print(f"    WARNING: No images generated (safety filter?), retrying...")
                time.sleep(5)
                continue

            image_data = response.generated_images[0].image.image_bytes
            image = Image.open(io.BytesIO(image_data))

            # Resize to a consistent size for covers
            image = image.resize((512, 512), Image.LANCZOS)

            # Save as WebP
            output_path.parent.mkdir(parents=True, exist_ok=True)
            image.save(str(output_path), "WEBP", quality=85)
            return True

        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                wait = 15 * (2 ** attempt)  # 15s, 30s, 60s, 120s, 240s
                print(f"    Rate limited (attempt {attempt+1}/{max_retries}), waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"    ERROR: {e}")
                return False

    print(f"    FAILED after {max_retries} retries")
    return False


def main():
    parser = argparse.ArgumentParser(description="Generate Mello story cover art with Gemini")
    parser.add_argument("--only", default=None, help="Comma-separated story IDs to generate")
    parser.add_argument("--skip-existing", action="store_true", help="Skip if cover already exists")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts without calling API")
    parser.add_argument("--manifest", default=str(OUTPUT_DIR / "manifest.json"), help="Path to manifest.json")
    parser.add_argument("--delay", type=float, default=12.0, help="Seconds between API calls (rate limiting)")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        print(f"Manifest not found at {manifest_path}")
        print("Run generate-stories.py first.")
        sys.exit(1)

    with open(manifest_path) as f:
        manifest = json.load(f)

    stories = manifest["stories"]
    if args.only:
        ids = set(args.only.split(","))
        stories = [s for s in stories if s["id"] in ids]
        if not stories:
            print(f"No stories found matching: {args.only}")
            sys.exit(1)

    COVERS_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Generating covers for {len(stories)} stories...")
    if args.dry_run:
        print("(DRY RUN — no API calls will be made)\n")

    if not args.dry_run:
        client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

    succeeded = 0
    skipped = 0
    failed = 0

    for i, story in enumerate(stories):
        story_id = story["id"]
        output_path = COVERS_DIR / f"{story_id}.webp"

        print(f"[{i+1}/{len(stories)}] {story_id}: {story['title']}")

        if args.skip_existing and output_path.exists():
            print(f"    Skipped (already exists: {output_path.stat().st_size} bytes)")
            skipped += 1
            continue

        if args.dry_run:
            prompt = build_prompt(story)
            print(f"    Topic: {story['topics']}")
            print(f"    Prompt: {prompt[:120]}...")
            print(f"    Would save to: {output_path}")
            succeeded += 1
            continue

        ok = generate_cover(client, story, output_path)
        if ok:
            size = output_path.stat().st_size
            print(f"    Saved ({size:,} bytes) -> {output_path}")
            succeeded += 1
        else:
            failed += 1

        # Rate limit between calls
        if i < len(stories) - 1:
            time.sleep(args.delay)

    print(f"\nDone! {succeeded} succeeded, {skipped} skipped, {failed} failed.")
    print(f"Covers directory: {COVERS_DIR}")


if __name__ == "__main__":
    main()
