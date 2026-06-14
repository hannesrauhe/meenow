# meenow

A decentralized, serverless, cat-themed spontaneous photo-sharing PWA for Pixelfed.

Users take a daily dual-camera photo (back + front stitched into one image) at a pseudo-random local time, then share it with friends via the Fediverse. No custom backend or database — the Pixelfed/Mastodon API is the entire backend.

---

## Implementation Blueprint

### 1. Architecture

```
   ┌────────────────────────────────────────────────────────┐
   │                     meenow PWA                         │
   │           Vite + Vanilla TypeScript + Tailwind         │
   └───────────┬────────────────────────────────┬───────────┘
               │                                │
               ▼                                ▼
   [ LocalStorage ]                   [ Pixelfed API Engine ]
   • PRNG daily timer                 • Dynamic OAuth registration
   • Camera capture state             • Token management (PKCE)
   • "Posted today" cache             • Post with #meenowApp
                                      • Feed filter + blur logic
```

**Hosting:** Static only — GitHub Pages or any Nginx/CDN.
**Platform targets:** Android and iOS mobile browsers are first-class. Desktop browsers are supported but deprioritized in UX design.
**Tech stack:** Vite + Vanilla TypeScript + Tailwind CSS. No framework runtime. TypeScript provides compile-time safety without framework overhead; Vite handles bundling and produces a minimal static asset bundle.

---

### 2. Core Functional Requirements

#### A. Pseudo-Random Daily Trigger (Local Spontaneity Model)

Each user gets a random trigger time within their own 9:00 AM–9:00 PM local window. The mechanic is spontaneous rather than globally simultaneous — friends in different timezones trigger at different moments, which is intentional.

- Seed the PRNG with the ISO date string in local time (`YYYY-MM-DD` derived from `new Date()` using local timezone).
- Apply a deterministic hash (e.g., a 32-bit xorshift) to the seed string to produce a stable float in [0, 1).
- Scale the float to the 12-hour window: `triggerTime = 9:00 AM local + fraction × 12 hours`.
- **State machine:**
  - Before trigger time: show a countdown.
  - After trigger time, no post yet: lock the timeline and prompt the user to capture.
  - After trigger time, post detected: show the filtered feed.
- On app load, check `localStorage` for a cached "posted today" flag (keyed by local date string). If absent, fetch the user's own recent statuses to detect whether a `#meenowApp` post exists from today. Cache the result to avoid repeated API calls.

#### B. Mobile Browser Dual-Camera Capture

Mobile browsers cannot stream two cameras simultaneously. The sequential approach:

1. Open back camera (`facingMode: "environment"`) via `getUserMedia`. Wait for the `loadedmetadata` event before capturing — do not use a fixed timer, as device camera initialization can take 1–2 s on both iOS and Android.
2. Capture a still frame to a canvas buffer and stop the back-camera stream.
3. Open front camera (`facingMode: "user"`). Again wait for `loadedmetadata`.
4. Display a 3-second countdown with a live thumbnail preview of the front camera in a corner overlay.
5. Capture the selfie frame and stop the front-camera stream.
6. **Canvas stitching:** Draw the back-camera frame as the full background. Draw the selfie as a rounded rectangle inset in the top-left quadrant (approximately 35% of image width, with a white border). Export the composite as JPEG at quality 0.92.

**Permission handling:** Catch `NotAllowedError` and `NotFoundError` from `getUserMedia`. Show a styled, platform-aware error card with instructions to reset camera permissions:
- Android: Settings → Apps → [Browser] → Permissions → Camera
- iOS: Settings → [Browser] → Camera

#### C. Pixelfed OAuth — Dynamic App Registration

The app has no hardcoded `client_id` or `client_secret` in its source. On first use with a given instance, the app registers itself at runtime:

1. User enters their instance domain (e.g., `pixelfed.social`).
2. App calls `POST https://{instance}/api/v1/apps` with:
   - `client_name`: `meenow`
   - `redirect_uris`: the app's own deployed URL
   - `scopes`: `read write`
3. Store the returned `client_id` and `client_secret` in `localStorage`, keyed by instance domain.
4. Initiate Authorization Code Flow with PKCE: generate a random `code_verifier`, derive `code_challenge` via SHA-256, redirect to `https://{instance}/oauth/authorize`.
5. On redirect back, exchange the authorization code for an access token via `POST /oauth/token`.
6. Store the access token in `localStorage`. It is never sent to any party other than the user's own instance.

**CORS:** Pixelfed is itself a browser-rendered web application; its own frontend makes these same API calls from the browser over CORS. Therefore all functional Pixelfed instances already serve the required `Access-Control-Allow-Origin: *` headers — confirmed on pixelfed.de and expected on all standard instances. If a user's instance is misconfigured, the app surfaces a clear error: _"Your instance does not support browser connections. Contact your instance administrator."_ There is no client-side workaround for a broken CORS configuration without a backend proxy, which violates the zero-backend constraint.

#### D. Posting

1. `POST /api/v1/media` with the stitched JPEG blob as `multipart/form-data`.
2. Poll `GET /api/v1/media/{id}` until `processing` returns `"processed"`.
3. `POST /api/v1/statuses` with `media_ids`, `visibility: "public"`, and a caption containing `#meenowApp`.
4. On success, write the "posted today" flag to `localStorage` (keyed by local date) and unlock the feed.

#### E. Feed Filtering

Fetch `GET /api/v1/timelines/home` (paginate as needed):

- Discard statuses where `Date.now() - new Date(status.created_at).getTime() > 86_400_000`.
- Discard statuses whose `tags` array does not include an entry with `name === "meenowapp"` (the API lowercases tag names).
- If the user has not posted today, render each remaining status card as a blurred placeholder with a cat-scratch texture overlay and the message: _"Curiosity killed the cat — post yours to see your friends."_
- If no posts remain after filtering, show the sleeping-cat empty state illustration.

---

### 3. UI/UX Specifications

**Design system:** Warm minimalist. Background `#FDFBF7` (cream), primary accent `#2D2D2D` (dark slate), secondary accent `#C9A96E` (warm tabby gold).

**Cat motifs (subtle):**
- Shutter button: circular, with two small triangular ears at the top edge rendered as inline SVG.
- Countdown arc: a thin circular progress indicator styled to fill like a winding ball of yarn.
- Empty state: a clean line-art sleeping cat SVG, centered with generous whitespace.
- Lock state: a semi-transparent paw-print pattern behind the blur overlay.

**PWA install nudge:** On first launch, show an unobtrusive bottom banner explaining that adding meenow to the home screen enables a native-app experience and is required for web push notifications on iOS. Android users see the standard browser install prompt where available. iOS users see step-by-step instructions (Share → Add to Home Screen). The banner reappears weekly until dismissed as installed.

**PWA manifest:** `display: "standalone"`, `orientation: "portrait"`, icon set covering iOS (180×180) and Android (192×192, 512×512 maskable). A Service Worker caches all static assets for offline resilience.

---

### 4. Known Limitations

- **Push notifications on iOS:** Web Push requires the PWA to be installed to the home screen (iOS 16.4+). Users who have not installed the app will not receive system-level notifications and must open the app manually to check if it is meenow time. The install nudge directly addresses this.
- **Camera resolution:** `getUserMedia` resolution is browser- and device-controlled and will typically be lower than the native camera application. The composite JPEG reflects whatever resolution the browser exposes.
- **Instance compatibility:** Designed and tested against standard Pixelfed instances. Mastodon instances expose the same API surface and are likely compatible but are not officially targeted.

---

### 5. Implementation Roadmap

| Phase | Scope |
|-------|-------|
| 1 | Project scaffold (Vite + TypeScript + Tailwind + PWA manifest + Service Worker), PRNG timer engine, countdown UI |
| 2 | Sequential camera capture, canvas stitching, permission error handling (Android + iOS) |
| 3 | Dynamic OAuth registration, PKCE flow, token storage |
| 4 | Media upload pipeline, status post, "posted today" detection logic |
| 5 | Feed fetch, 24-hour filter, `#meenowApp` tag filter, blur overlay |
| 6 | Cat theme polish, install nudge banner, responsive desktop fallback, deployment to GitHub Pages |
