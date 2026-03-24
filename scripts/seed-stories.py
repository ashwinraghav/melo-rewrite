#!/usr/bin/env python3
"""
Seed stories to GCS + Firestore from the generated manifest.

Usage:
    python scripts/seed-stories.py
    python scripts/seed-stories.py --only park-01,bedtime-03
    python scripts/seed-stories.py --dry-run

Reads from scripts/stories-output/manifest.json.
Uploads audio to gs://melo-f5756-stories/stories/{id}/audio.mp3
Creates/updates documents in Firestore collection 'stories'.
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from google.cloud import firestore, storage

PROJECT_ID = "melo-f5756"
BUCKET_NAME = f"{PROJECT_ID}-stories"
OUTPUT_DIR = Path(__file__).parent / "stories-output"


def categorize_duration(seconds: int) -> str:
    if seconds <= 299:
        return "short"
    if seconds <= 899:
        return "medium"
    return "long"


def main():
    parser = argparse.ArgumentParser(description="Seed Mello stories to GCS + Firestore")
    parser.add_argument("--only", default=None, help="Comma-separated story IDs to seed")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be done without doing it")
    parser.add_argument("--manifest", default=str(OUTPUT_DIR / "manifest.json"), help="Path to manifest.json")
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

    print(f"Seeding {len(stories)} stories...")

    if not args.dry_run:
        gcs_client = storage.Client(project=PROJECT_ID)
        bucket = gcs_client.bucket(BUCKET_NAME)
        db = firestore.Client(project=PROJECT_ID)

    now = datetime.now(timezone.utc).isoformat()

    for i, story in enumerate(stories):
        story_id = story["id"]
        audio_local = OUTPUT_DIR / story["audioFile"]
        gcs_path = f"stories/{story_id}/audio.mp3"

        print(f"[{i+1}/{len(stories)}] {story_id}: {story['title']}")

        # Upload audio to GCS
        if audio_local.exists():
            if args.dry_run:
                print(f"  Would upload {audio_local} -> gs://{BUCKET_NAME}/{gcs_path}")
            else:
                blob = bucket.blob(gcs_path)
                blob.upload_from_filename(str(audio_local), content_type="audio/mpeg")
                print(f"  Uploaded audio ({audio_local.stat().st_size} bytes)")
        else:
            print(f"  WARNING: Audio file not found at {audio_local}")

        # Create Firestore document
        doc_data = {
            "title": story["title"],
            "description": story["description"],
            "durationSeconds": story["durationSeconds"],
            "durationCategory": categorize_duration(story["durationSeconds"]),
            "ageMin": story["ageMin"],
            "ageMax": story["ageMax"],
            "topics": story["topics"],
            "audioPath": gcs_path,
            "coverArtPath": f"stories/{story_id}/cover.webp",  # placeholder
            "storyText": story["storyText"],
            "segments": story["segments"],
            "isPublished": True,
            "createdAt": now,
            "updatedAt": now,
        }

        if args.dry_run:
            print(f"  Would write Firestore doc: stories/{story_id}")
            print(f"    duration={story['durationSeconds']}s, topics={story['topics']}, segments={len(story.get('segments', []))}")
        else:
            db.collection("stories").document(story_id).set(doc_data)
            print(f"  Created Firestore doc: stories/{story_id}")

    print(f"\nDone! {len(stories)} stories seeded.")
    if not args.dry_run:
        print(f"GCS bucket: gs://{BUCKET_NAME}/stories/")
        print(f"Firestore collection: stories")


if __name__ == "__main__":
    main()
