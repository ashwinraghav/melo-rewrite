/**
 * Google Analytics (GA4) typed event tracking.
 *
 * Uses gtag.js loaded in root layout. All functions are safe to call
 * without the measurement ID set — they no-op when gtag is unavailable.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function gtag(...args: any[]) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
}

// ── Page views ──────────────────────────────────────────────────────────────

export function trackPageView(url: string, title?: string) {
  gtag("event", "page_view", {
    page_location: url,
    page_title: title,
  });
}

// ── Auth funnel ─────────────────────────────────────────────────────────────

export function trackSignInStart(method: "google" | "facebook" | "email") {
  gtag("event", "sign_in_start", { method });
}

export function trackSignInComplete(method: "google" | "facebook" | "email") {
  gtag("event", "login", { method });
}

export function trackSignUp(method: "google" | "facebook" | "email") {
  gtag("event", "sign_up", { method });
}

export function trackSignOut() {
  gtag("event", "sign_out");
}

export function trackTermsAccepted(version: string) {
  gtag("event", "terms_accepted", { version });
}

// ── Discovery & navigation ──────────────────────────────────────────────────

export function trackTopicSelected(topic: string) {
  gtag("event", "topic_selected", { topic });
}

export function trackSpinGalaxy() {
  gtag("event", "spin_galaxy");
}

// ── Playlist & story selection ──────────────────────────────────────────────

export function trackPlayAll(topicFilter: string | null, storyCount: number) {
  gtag("event", "play_all", { topic_filter: topicFilter, story_count: storyCount });
}

export function trackStorySelected(storyId: string, storyTitle: string, source: string) {
  gtag("event", "select_content", {
    content_type: "story",
    item_id: storyId,
    item_name: storyTitle,
    source,
  });
}

// ── Player events ───────────────────────────────────────────────────────────

export function trackStoryPlay(storyId: string, storyTitle: string) {
  gtag("event", "story_play", {
    story_id: storyId,
    story_title: storyTitle,
  });
}

export function trackStoryPause(storyId: string, progressPercent: number) {
  gtag("event", "story_pause", {
    story_id: storyId,
    progress_percent: Math.round(progressPercent),
  });
}

export function trackStoryComplete(storyId: string, storyTitle: string, durationSeconds: number) {
  gtag("event", "story_complete", {
    story_id: storyId,
    story_title: storyTitle,
    duration_seconds: durationSeconds,
  });
}

export function trackStoryProgress(storyId: string, progressPercent: number, durationSeconds: number) {
  gtag("event", "story_progress", {
    story_id: storyId,
    progress_percent: Math.round(progressPercent),
    duration_seconds: durationSeconds,
  });
}

export function trackSpeedChange(speed: number) {
  gtag("event", "speed_change", { speed });
}

export function trackSeek(storyId: string, fromPercent: number, toPercent: number) {
  gtag("event", "seek", {
    story_id: storyId,
    from_percent: Math.round(fromPercent),
    to_percent: Math.round(toPercent),
  });
}

export function trackSkipTrack(direction: "prev" | "next", storyId: string) {
  gtag("event", "skip_track", { direction, story_id: storyId });
}

export function trackPersonalizeOpened(storyId: string) {
  gtag("event", "personalize_opened", { story_id: storyId });
}

export function trackVoiceSelected(storyId: string, voiceId: string, voiceName: string) {
  gtag("event", "voice_selected", {
    story_id: storyId,
    voice_id: voiceId,
    voice_name: voiceName,
  });
}

// ── Search ──────────────────────────────────────────────────────────────────

export function trackSearch(query: string, resultCount: number) {
  gtag("event", "search", { search_term: query, result_count: resultCount });
}

export function trackSearchSuggestion(suggestion: string) {
  gtag("event", "search_suggestion", { suggestion });
}

// ── Story creation ──────────────────────────────────────────────────────────

export function trackGenerateStart(promptLength: number) {
  gtag("event", "generate_start", { prompt_length: promptLength });
}

export function trackGenerateComplete(storyId: string) {
  gtag("event", "generate_complete", { story_id: storyId });
}

export function trackPublishStart(storyId: string) {
  gtag("event", "publish_start", { story_id: storyId });
}

export function trackPublishComplete(storyId: string, storyTitle: string) {
  gtag("event", "publish_complete", { story_id: storyId, story_title: storyTitle });
}

// ── Voice cloning funnel ────────────────────────────────────────────────────

export function trackVoiceInviteCreated(voiceName: string, relationship: string) {
  gtag("event", "voice_invite_created", { voice_name: voiceName, relationship });
}

export function trackVoiceInviteCopied() {
  gtag("event", "voice_invite_copied");
}

export function trackVoiceRecordingStart() {
  gtag("event", "voice_recording_start");
}

export function trackVoiceRecordingComplete(durationSeconds: number) {
  gtag("event", "voice_recording_complete", { duration_seconds: durationSeconds });
}

export function trackVoiceRecordingSubmit() {
  gtag("event", "voice_recording_submit");
}

export function trackVoiceDeleted(voiceId: string) {
  gtag("event", "voice_deleted", { voice_id: voiceId });
}

export function trackVoiceConvertStart(storyId: string, voiceId: string) {
  gtag("event", "voice_convert_start", { story_id: storyId, voice_id: voiceId });
}

// ── Favorites ───────────────────────────────────────────────────────────────

export function trackFavoriteAdd(storyId: string) {
  gtag("event", "favorite_add", { story_id: storyId });
}

export function trackFavoriteRemove(storyId: string) {
  gtag("event", "favorite_remove", { story_id: storyId });
}
