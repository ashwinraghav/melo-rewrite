#!/usr/bin/env python3
"""
One-time script to generate the static story catalog JSON files.

Run after deploying the catalog publisher for the first time, or
whenever you need to force-regenerate the entire catalog.

Usage:
  cd apps/api
  source .venv/bin/activate
  python ../../scripts/regenerate-catalog.py
"""
import os
import sys

# Add the api package to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'api'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'apps', 'api', '.env'))

from mello_api.config import config
from mello_api.models.story import StoryFilters
from mello_api.repositories.firestore import create_firestore_repositories
from mello_api.services.catalog_publisher import GcsCatalogPublisher

repos = create_firestore_repositories(
    project_id=config.gcp_project_id or "melo-f5756",
    bucket_name=config.storage_bucket or "melo-f5756-stories",
    url_ttl_seconds=900,
)

publisher = GcsCatalogPublisher(
    bucket_name=config.storage_bucket or "melo-f5756-stories",
    gcp_project_id=config.gcp_project_id or "melo-f5756",
)

stories = repos.stories.find_many(StoryFilters())
print(f"Found {len(stories)} published stories")

files = publisher.publish_catalog(stories)
print(f"Published {files} catalog files to gs://{config.storage_bucket or 'melo-f5756-stories'}/catalog/")
print("CDN URL: https://cdn.melostories.com/catalog/stories.json")
