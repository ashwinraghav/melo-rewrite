"""
Catalog publisher tests — static JSON generation for CDN.
"""
from mello_api.services.catalog_publisher import MockCatalogPublisher, _story_to_list_item, _story_to_detail
from mello_api.models.story import Story, StorySegment


def _make_story(id: str, topics: list[str], published: bool = True) -> Story:
    return Story(
        id=id,
        title=f"Story {id}",
        description=f"Description for {id}",
        duration_seconds=120,
        duration_category="short",
        age_min=1,
        age_max=6,
        topics=topics,
        audio_path=f"stories/{id}/audio.mp3",
        cover_art_path=f"stories/{id}/cover.webp",
        story_text="Once upon a time.",
        segments=[StorySegment(text="Once upon a time.", start_time=0.0, end_time=2.5)],
        is_published=published,
        created_at="2024-01-01T00:00:00Z",
        updated_at="2024-01-01T00:00:00Z",
    )


def test_list_item_has_cdn_urls():
    story = _make_story("s1", ["park"])
    item = _story_to_list_item(story, "melo-f5756-stories")
    assert item["audioUrl"] == "https://cdn.melostories.com/stories/s1/audio.mp3"
    assert item["coverArtUrl"] == "https://cdn.melostories.com/stories/s1/cover.webp"


def test_list_item_excludes_text_and_segments():
    story = _make_story("s1", ["park"])
    item = _story_to_list_item(story, "melo-f5756-stories")
    assert "storyText" not in item
    assert "segments" not in item


def test_detail_includes_text_and_segments():
    story = _make_story("s1", ["park"])
    detail = _story_to_detail(story, "melo-f5756-stories")
    assert detail["storyText"] == "Once upon a time."
    assert len(detail["segments"]) == 1
    assert detail["segments"][0]["text"] == "Once upon a time."
    assert detail["segments"][0]["startTime"] == 0.0
    assert detail["segments"][0]["endTime"] == 2.5


def test_detail_has_all_list_fields():
    story = _make_story("s1", ["park"])
    item = _story_to_list_item(story, "melo-f5756-stories")
    detail = _story_to_detail(story, "melo-f5756-stories")
    for key in item:
        assert key in detail, f"detail missing list field: {key}"


def test_mock_publisher_counts_published():
    publisher = MockCatalogPublisher()
    stories = [
        _make_story("s1", ["park"], published=True),
        _make_story("s2", ["park"], published=True),
        _make_story("s3", ["park"], published=False),  # unpublished
    ]
    result = publisher.publish_catalog(stories)
    assert result == 2  # only published count
    assert publisher.last_count == 2


def test_list_item_includes_required_fields():
    story = _make_story("s1", ["park", "friends"])
    item = _story_to_list_item(story, "bucket")
    assert item["id"] == "s1"
    assert item["title"] == "Story s1"
    assert item["durationSeconds"] == 120
    assert item["durationCategory"] == "short"
    assert item["ageMin"] == 1
    assert item["ageMax"] == 6
    assert item["topics"] == ["park", "friends"]
    assert item["isPublished"] is True
