# ADR 001 — Web app over native mobile

**Status:** Accepted

## Context

The Stitch design mocks are exported as HTML/CSS. The target device is a parent's phone.
We considered React Native (Expo) and Flutter.

## Decision

Build a mobile-first web app with Next.js.

## Reasons

1. The Stitch HTML/CSS output can be used almost directly, cutting design implementation time significantly.
2. No App Store approval required — deploy instantly to Cloud Run.
3. Sharing a story via URL is free.
4. The web platform's `<audio>` element is sufficient for our playback requirements.
5. Parents can add it to their home screen (PWA manifest) for a near-native feel.

## Consequences

- No native push notifications in v1 (web push is possible later).
- Background audio playback is limited in some mobile browsers when the screen is off — acceptable for a bedtime app where the phone is on a nightstand, not locked.
- If we ever need true native features (lock-screen controls, Siri integration), we can wrap the web app in a WKWebView / React Native WebView shell.
