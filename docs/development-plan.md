# ha-stream-card: development plan

> **History.** The original phased plan. Phases 0–1 were replaced by [build-plan-v1.md](build-plan-v1.md); Phases 2–6 remain the roadmap. For how the card works now, see [architecture.md](architecture.md); for using it, the [README](../README.md).

**Date:** 2026-10-06 · **Builds on:** [rfc-001-review.md](rfc-001-review.md) and Declan's answers in the project thread.

## 1. What we're building (requirements as agreed)

| # | Requirement | Source |
|---|---|---|
| R1 | One Lovelace card that plays Dispatcharr IPTV, later YouTube | RFC + answer 6 |
| R2 | Works on Fire HD 8 wall dashboards (Fully Kiosk), phones (HA app) and desktop browsers | answer 1 |
| R3 | Works when an HA dashboard is **cast to a TV** (HA Cast on Chromecast/Google TV): the card plays on the TV itself | answer 1, clarified |
| R4 | Works remotely through Cloudflare (HA at `hayden-family.net`, Dispatcharr on its own HTTPS hostname). Streaming via Cloudflare is already in use and accepted | answers 2, 3, follow-up |
| R11 | iPhones are first-class (HA iOS app and Safari) | follow-up |
| R5 | No browser_mod dependency | answer 4 |
| R6 | Automations can start or stop playback on a **specific device's** card | answer 5 |
| R7 | IPTV first; YouTube second, ad-free with Premium where the platform allows | answers 6, 7 |
| R8 | No "one stream per device" enforcement; Dispatcharr owns connection limits. The card just plays media and lets go of it reliably | answer 8 |
| R9 | Personal use first, HACS once stable | answer 9 |
| R10 | Plays inside Bubble Card pop-ups and releases the Dispatcharr connection when closed | RFC |

**What answer 3 confirmed:** your channel URLs are `https://<dispatcharr-host>/proxy/ts/stream/<uuid>`, which is continuous MPEG-TS over HTTPS. The primary engine is therefore **mpegts.js**, not hls.js, and mixed-content is not a problem because both HA and Dispatcharr are HTTPS.

## 2. Architecture

```
 Button (fire-dom-event)      Automation (media_player.play_media / service)
          │                                   │
          ▼                                   ▼
 ┌─────────────────────┐        ┌──────────────────────────────┐
 │ Page controller     │◄───────│ Companion integration (opt.) │  ← HA side, Python
 │ (singleton/window)  │  WS    │ one media_player per screen  │
 │ • pending mailbox   │        └──────────────────────────────┘
 │ • routes by target  │
 │ • opens pop-up hash │
 └─────────┬───────────┘
           ▼
 ┌─────────────────────────────────────────────┐
 │ <stream-card> (Lit)                         │
 │  Lifecycle: connect/disconnect, IO,         │
 │  visibility, pagehide, Fully events, idle   │
 │  UI: title badge, play/mute, cast, debug    │
 └─────────┬───────────────────────────────────┘
           ▼ engine registry (dynamic import per engine)
  mpegts.js (TS) │ native <video> (iOS fallback, MP4) │ hls.js (HLS) │ YouTube IFrame
```

### Key design decisions
1. **Trigger:** `tap_action: action: fire-dom-event` with a `stream_card:` block. HA turns this into an `ll-custom` DOM event, which the page controller catches. No browser_mod, no eval'd JavaScript.
2. **Mailbox:** the controller stores the request per `target`, then opens the pop-up hash if `open:` is given. The card pulls its pending request when it connects. This fixes the Bubble 3.2.4 "pop-up removed from DOM" race.
3. **Teardown = destroy:** any of disconnect, hidden, page hidden, Fully screen-off or screensaver, pop-up closed, or the optional idle timer fully destroys the engine and aborts the fetch. Reopening rebuilds the player at the live edge. Acceptance is measured in Dispatcharr's stats, not assumed.
4. **Channel references, not URLs:** buttons say `channel: <uuid>`, and the card config holds `dispatcharr_url` once. That keeps YAML short and makes LAN/remote base-URL switching a one-line change.
5. **Engines are lazy chunks:** the ES-module build loads mpegts.js only when a TS source plays, and YouTube only when a YouTube source plays.
6. **Lit never touches `<video>`:** it's created imperatively, so HA's constant `hass` updates can't re-render or restart playback. Editor previews never autoplay.

### Config sketch (illustrative)
```yaml
# The player, e.g. inside a Bubble pop-up
type: custom:stream-card
target: kitchen_popup
dispatcharr_url: https://<dispatcharr-host>
aspect_ratio: "16:9"
idle_timeout: 0          # minutes; 0 = off
debug: false

# A button anywhere on the dashboard
tap_action:
  action: fire-dom-event
  stream_card:
    target: kitchen_popup
    channel: de528019-264f-42bf-9250-c2a55366e77c
    title: Sky Sports Main Event
    open: "#kitchen-tv"
```

## 3. Infrastructure prerequisites (your side, not code)
These come before card work because they decide whether the card can play at all.

1. **CORS on Dispatcharr's hostname.** mpegts.js uses `fetch`, and HA (`hayden-family.net`) and Dispatcharr are different origins. Add `Access-Control-Allow-Origin: https://hayden-family.net` (plus your LAN HA origin if you use one) via a Cloudflare Response Header Transform Rule or your reverse proxy.
2. **Audio codec.** We'll `ffprobe` a few channels in Phase 0. If any carry AC-3/E-AC-3 or MP2 audio, create a Dispatcharr **ffmpeg stream profile** that copies video and converts audio to AAC (`-c:v copy -c:a aac`). That's cheap on CPU, and it's the single most likely reason a channel would play silently on Fire or Android.
3. **Cloudflare:** already used for streaming today and accepted as is. No action.
4. **Stream URL exposure.** `/proxy/ts/stream/<uuid>` is reachable by anyone who has the URL, and it will appear in dashboard YAML and browser traffic. Restrict stream access by network in Dispatcharr, or put the hostname behind an auth layer that works with cross-origin fetches. To be decided in Phase 0 once we see what works with mpegts.js.
5. **On the LAN:** tablets reaching Dispatcharr via its public hostname will hairpin through Cloudflare. Split DNS (the public hostname resolving to the LAN IP at home) avoids that, with no card changes thanks to decision 4.

## 4. Phases

### Phase 0: Spikes (prove the risky parts before building)
> **Dropped 2026-10-10.** A Dispatcharr output profile now defines the stream format, and device checks moved to v1 acceptance. Phases 0 and 1 are replaced by [build-plan-v1.md](build-plan-v1.md).

| Spike | What we do | Exit criterion |
|---|---|---|
| S1 Playback matrix | Standalone test page (no HA) with mpegts.js, native `<video>` and hls.js against one real channel. Run on Fire HD 8 + Fully, Android HA app, iPhone HA app + Safari, desktop Chrome. `ffprobe` 3–5 channels. | Each device plays video **with audio**. We know which needs the AAC profile, and whether the iPhone HA app's WebView exposes Managed Media Source (mpegts.js needs it on iOS ≥ 17.1). **If it doesn't, iPhones need an HLS fallback** (see Phase 1). |
| S2 Pop-up lifecycle | 20-line probe card in a Bubble pop-up logging connect/disconnect/IO/visibility on open, close, screen-off and screensaver, while watching Dispatcharr's connection count. | Connection count drops to 0 within a measured number of seconds after every close path. |
| S3 HA Cast | Cast a test dashboard containing the S1 test player to your Chromecast/Google TV with HA Cast, triggered remotely (no touch on the TV). | The Cast receiver loads the custom resource, plays TS **with audio** without a user gesture, and survives a 1-hour run. Also note memory headroom (older Chromecasts have less RAM than a Fire HD 8). |
| S4 YouTube | Embed a video while signed in to Premium on each device. | Ad-free yes/no per device. Expectation: desktop Chrome likely yes; Safari/iOS likely no (third-party cookies blocked); Fully uncertain. |

**Deliverable:** a short results table that decides the engine per platform and the infra changes from §3.

### Phase 1: Core card (IPTV on dashboards)
> Superseded by [build-plan-v1.md](build-plan-v1.md).

- **iPhone fallback if S1 says so:** when Managed Media Source isn't available (HA iOS app WebView, older iOS), play an HLS version of the channel natively. Candidates: HA's built-in go2rtc re-serving the Dispatcharr URL as HLS/MP4, or a Dispatcharr ffmpeg profile producing HLS. Picked from S1 results.
- Repo scaffold: TypeScript, Lit 3, Vite (ES module, per-engine chunks), ESLint/Prettier, Vitest, GitHub Actions build.
- Engine contract with async idempotent `destroy()`, a state/event stream, and `getStats()`.
- mpegts.js engine with live-tuned config (latency chasing, auto cleanup of source buffers); native engine; engine auto-selection from S1 results.
- Page controller: `ll-custom` listener, mailbox, `target` routing, pop-up opening.
- Lifecycle manager with every release path from decision 3.
- Minimal UI: title badge, play/pause, mute, fullscreen, "tap to unmute" fallback, error state with retry, debug overlay (buffer, dropped frames, engine).
- **Acceptance:** plays on all S1 devices; 50 open/close cycles leave Dispatcharr at 0 connections each time; no edit-mode autoplay.

### Phase 2: Fire tablet hardening
- 2-hour soak on the Fire HD 8 plus repeated channel switches, tracking memory via Fully remote admin / `chrome://inspect`.
- Tune buffer settings from measurements, not from the RFC's numbers.
- Fully Kiosk integration: screen-off and screensaver hooks; settings checklist in the README (autoplay, hardware acceleration).
- Stall recovery: auto-reconnect with backoff when the TS stream stalls or Dispatcharr restarts.

### Phase 3: Per-device control from automations (R6), decided: companion integration
- A Python custom integration that creates a `media_player.stream_card_<screen>` entity for each registered screen. Each browser generates a device ID once and stores it locally, and you name it on first run. Cast receivers can't be named by touch, so a card can also pin its screen name in config (`screen: living_room_tv`).
- Automations use standard `media_player.play_media` / `media_stop` / `volume_mute` against that entity. State (playing, title) flows back to HA.
- The card talks to it over a custom websocket command, which works for non-admin kiosk users (unlike custom event subscriptions).
- The integration serves the card JS itself, so it's one HACS install.
- Screens that disappear (tablet asleep, cast ended) go `unavailable` rather than lingering as `playing`.

### Phase 4: HA Cast support (R3)
The goal is that casting a dashboard with the card on it plays the video on the TV. There's no separate "send to TV" stream path.
- The cast screen is non-interactive, so control comes through Phase 3: the cast dashboard registers as a screen (`media_player.stream_card_living_room_tv`), and buttons on a phone or tablet, or automations, call `play_media` on it.
- A small button option `target_screen:` lets a tablet button play on the TV's card instead of its own.
- Tuning from S3: autoplay with sound (receivers normally allow it), buffer limits for low-RAM Chromecasts, no hover UI, and a TV-safe layout (fullscreen card view).
- Teardown matters here too: stopping or ending the cast session must release the Dispatcharr connection. Same acceptance test as Phase 1.
- YouTube on the TV: in-card iframe on the cast receiver (verify in S4), with the Cast integration's native YouTube app (`media_content_type: cast`, `app_name: youtube`) as the ad-free alternative. That replaces the dashboard on the TV, so it's an option, not the default.

### Phase 5: YouTube in the card (R7)
- Lazy IFrame API engine: video and live IDs, playlist URLs, sensible `playerVars`, `origin` set correctly.
- Honest styling: hide the control bar and use our controls where allowed, but don't overlay YouTube's own UI (API terms).
- Ad-free where the S4 results say the platform supports it; elsewhere, document it and offer the native YouTube app on the TV as the ad-free option. On iPhones, Safari blocks third-party cookies, so expect ads in the card.
- Clean teardown (iframe removed) to avoid leaks on Fire.

### Phase 6: Polish and HACS
- Visual card editor (target, channel picker if Dispatcharr's API proves easy, aspect, timeouts).
- README with Dispatcharr/Cloudflare/Fully setup, troubleshooting by symptom.
- Playwright e2e against a local ffmpeg-generated TS test server: asserts the connection closes on every teardown path. This is the regression test for the thing that matters most.
- HACS validation, semantic releases.

## 5. Decisions
- **A. Per-device automation control:** companion integration with a media_player per screen. *Decided 2026-10-06.*
- **B. TV:** HA Cast of a dashboard containing the card; the video plays in the card on the TV. *Decided 2026-10-06.*
- **C. Remote streaming through Cloudflare:** keep as is. *Decided 2026-10-06.*
- **D. iPhones:** first-class. HLS fallback built if S1 shows the HA iOS app can't use mpegts.js. *Decided 2026-10-06.*
- **E. Card element name:** `stream-card` (placeholder, still open). Avoids HA's reserved `ha-` prefix.
