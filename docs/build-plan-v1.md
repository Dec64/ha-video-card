# Build plan: v1 (IPTV card), for agentic coding

**Date:** 2026-10-10 · **Replaces:** Phase 0 and Phase 1 of [development-plan.md](development-plan.md) · **Scope:** card only, Dispatcharr/IPTV only.

> **History.** This is the plan v1 was built from; v1 and the 1.0 channel selection are built and merged. For how the card works now, see [architecture.md](architecture.md); for using it, the [README](../README.md).

## 1. Why Phase 0 is dropped

Phase 0 was there to find out what the stream looks like on each device before writing code. Dispatcharr's **output profiles** remove most of that question: we decide the stream format server-side instead of measuring whatever the provider sends.

| Phase 0 question | Now answered by |
|---|---|
| Audio codec per channel (AC-3/MP2 silence on Fire/Android) | Output profile transcodes all audio to AAC stereo; the card requests it with `?output_profile=<id>` |
| Container / engine | Profile always outputs MPEG-TS → mpegts.js everywhere it runs |
| Which teardown signals fire in Bubble pop-ups | The card listens to **all** of them anyway; automated tests prove the connection closes on each |
| Video codec | Card reads the codec from the stream and shows a clear "unsupported codec" error instead of a black screen (see §5) |

What a profile **cannot** settle is device capability, so these move from "test first" to "v1 acceptance on real devices" (task T10):
- **iPhone HA app:** whether its WebView has Managed Media Source (mpegts.js needs it). If not, iPhones get a fallback in v1.1. v1 shows a clear "not supported on this device" message rather than failing silently.
- **Video passthrough:** the profile copies video. An HEVC or MPEG-2 channel would still fail on Fire tablets. The card's codec check will name it, and a second profile can transcode just those channels.
- **CORS:** Dispatcharr already allows every origin (`CORS_ALLOW_ALL_ORIGINS = True` with django-cors-headers), so the Cloudflare rule is probably unnecessary. One `curl` confirms it (§2). The card reports a CORS failure by name if something in front strips the header.

The Phase 0 test kit stays in the repo as an optional diagnostic tool, not a gate.

## 2. Stream profile (Declan, before T10)

Your "Web Player (AAC Audio)" profile is the right idea, but it is a locked built-in, so **add a new profile** with these parameters (final version, verified 2026-10-10 against the Dispatcharr source and an ffmpeg test matrix; see the README for the field-by-field settings):

```
-fflags +discardcorrupt+genpts -probesize 1M -analyzeduration 1M -i pipe:0
-map 0:v:0? -map 0:a:0? -sn -dn
-c:v copy -c:a aac -b:a 192k -ac 2 -ar 48000 -af aresample=async=1:min_hard_comp=0.03
-max_muxing_queue_size 4096 -flush_packets 1
-mpegts_flags +pat_pmt_at_frames+resend_headers+initial_discontinuity -f mpegts pipe:1
```

| Change | Why |
|---|---|
| `-map 0` → `-map 0:v:0? -map 0:a:0? -sn -dn` | `-map 0` takes every stream. Channels with teletext/DVB subtitles or data streams can make ffmpeg fail to start, and channels with several audio tracks (e.g. audio description) transcode all of them. mpegts.js only plays one audio track. The `?` keeps radio-only or video-only channels working. |
| `-analyzeduration 0` → `1M`, `-probesize 512K` → `1M` | With zero analysis ffmpeg can start before it has seen the audio stream and drop it, or fail with "could not find codec parameters". Costs about 1 s of start-up. If start-up feels slow, try `500K` later. |
| add `-ar 48000` | Fixed sample rate; avoids odd rates some sources carry. |
| drop `+nobuffer` | It made ffmpeg discard the ~1.5 s it reads while probing, so output started two keyframes late, with no latency gain in a pipe-to-pipe setup. |
| add `-af aresample=async=1:min_hard_comp=0.03` | Without it, small audio drop-outs leave timestamp gaps that mpegts.js closes by pulling audio earlier, which drifts lip-sync. |

### How the card asks for the profile (decided 2026-10-10: URL parameter)
Dispatcharr's stream proxy reads `?output_profile=<id>` on `/proxy/ts/stream/<uuid>` (`_resolve_output_profile` in `apps/proxy/live_proxy/views.py`). The card config takes the profile's numeric ID once and appends it to every stream URL. The ID is in the profile's edit dialog, or from `GET /api/core/output-profiles/` if the UI doesn't show it.

**Watch out:** if the ID is wrong or the profile isn't **Active**, Dispatcharr silently serves the original stream with no conversion, rather than an error. The screenshot shows the Active toggle off, so switch it on. The card's codec check (T6) catches the silent case: an AC-3 or MP2 track shows "audio codec not supported, check the output profile" instead of silent video.

### CORS check (replaces the Cloudflare rule)
```
curl -sI -H "Origin: https://<your-ha-host>" "https://<dispatcharr-host>/proxy/ts/stream/<uuid>?output_profile=<id>" --max-time 3 | grep -i access-control
```
If that prints `access-control-allow-origin: *`, nothing else is needed. If you add a Cloudflare rule anyway, use **Set** (replace), not Add: two `Access-Control-Allow-Origin` values make the browser reject the response.

## 3. How the agents work

- **One task = one branch = one PR**, merged in dependency order. Tasks marked ∥ can run in parallel.
- **Every task has machine-checkable "done when" criteria.** An agent may not mark a task done on manual checks alone.
- **CLAUDE.md (created in T0) is the agents' contract:** commands, the interfaces in §4, rules below. Agents read it first.
- **Rules for agents:**
  - No real hostnames, channel UUIDs or tokens anywhere in the repo. Use `dispatcharr.example` and generated UUIDs.
  - No new runtime dependencies beyond Lit and mpegts.js without saying so in the PR.
  - Interfaces in §4 change only in their own PR, with CLAUDE.md updated in the same PR.
  - The `<video>` element is never in a Lit template.
  - Every teardown path gets an e2e test that asserts on the **server's open-connection count**, not on client state.

### Testing constraint discovered
Playwright's bundled Chromium (and the cloud container's) **cannot decode H.264 or AAC** (`MediaSource.isTypeSupported` is false for both). So:
- **Locally / in agent sessions:** e2e tests install an MSE shim that accepts any codec and discards data. That's enough to test fetch, connection lifecycle, reconnect and UI states.
- **In GitHub Actions:** a second e2e job runs with `channel: 'chrome'` (Google Chrome is on the Ubuntu runners and has the codecs) to prove real decode of the test stream.
- **Real devices:** T10.

## 4. Contracts
Moved to [architecture.md § Contracts](architecture.md#contracts), which is kept current.

## 5. Tasks

| ID | Task | Depends on |
|---|---|---|
| T0 | Scaffold, CLAUDE.md, CI | — |
| T1 | Test harness: fake Dispatcharr + Playwright fixtures | T0 |
| T2 ∥ | Engines: mpegts.js + native, registry | T0 (T1 for e2e) |
| T3 ∥ | Page controller + mailbox | T0 |
| T4 ∥ | Card shell + config + edit-mode guard | T0 |
| T5 | Lifecycle manager: every release path | T2, T3, T4 |
| T6 ∥ | Resilience: stall/reconnect, error classification | T5 |
| T7 ∥ | UI: controls, error states, debug overlay | T5 |
| T8 | Build, packaging, HACS layout, release workflow | T6, T7 |
| T9 | README: setup and troubleshooting | T8 |
| T10 | Real-device acceptance (Declan) | T8 |

### T0: Scaffold
- `card/` with TypeScript (strict), Lit 3, Vite 8 (ES module, dynamic import per engine), Vitest, ESLint + Prettier, Playwright.
- `CLAUDE.md` with commands, §3 rules and §4 contracts.
- GitHub Actions: lint, typecheck, unit, build, e2e (shim), e2e (Chrome).
- **Done when:** `npm run check` (lint + typecheck + unit + build) passes locally and in CI on an empty card that renders "stream-card".

### T1: Test harness
- `card/test/fake-dispatcharr/`: Node server that spawns ffmpeg (`testsrc2` + `sine`) producing endless H.264 + AAC TS shaped like the profile output, served at `/proxy/ts/stream/:id` with CORS.
- Records the `output_profile` query on each request so tests can assert the card sent it.
- `GET /__stats` returns open stream connections; `POST /__fault` switches modes: `stall` (stop sending, keep socket), `drop` (close socket), `404`, `no-cors`, `slow-start`, `codec:hevc`, `codec:mpeg2`, `audio:ac3`.
- Playwright fixtures: a test page that loads the built card with a fake `hass`, a fake Bubble pop-up (host element added on hash `#popup`, **removed** on close, as in Bubble ≥ 3.2.4), a fake Lovelace edit mode, and the MSE shim.
- **Done when:** a smoke e2e test fetches a stream, sees `/__stats` = 1, aborts, sees 0 within 2 s. Fault modes have their own tests.

### T2: Engines ∥
- mpegts.js engine with live config: `isLive`, `liveBufferLatencyChasing`, `autoCleanupSourceBuffer`, stash buffer tuned for start-up. `destroy()` = `pause → unload → detachMediaElement → destroy`, then `removeAttribute('src')` + `load()`. Idempotent.
- Emits `media-info` with codecs. If MSE/MMS is missing → `unsupported-device` error, not a crash.
- Native engine (`<video src>`) for MP4/HLS URLs and as the future iOS fallback.
- Registry picks the engine by explicit type, then by capability; mpegts.js is a lazy chunk.
- **Done when:** unit tests for the registry and destroy idempotency; e2e: load → stats 1 → destroy → stats 0, twice in a row, and destroy called 3× doesn't throw.

### T3: Controller + mailbox ∥
- Listens for `ll-custom` on `window`, validates the `stream_card` payload, stores per target, opens `open:` by `history.pushState` + `location-changed`.
- Delivers to a registered card immediately if present; otherwise holds it until `take()`.
- `action: stop` releases the target.
- **Done when:** unit tests cover: request before card exists, card exists, two targets, expiry, stop, malformed payloads ignored with a console warning. e2e: button tap → pop-up opens → card plays the requested channel.

### T4: Card shell ∥
- Lit element, `setConfig` validation with readable errors, `getCardSize`, `getGridOptions`.
- Creates `<video>` once, imperatively; `hass` updates never touch it (test asserts the same element survives 100 `hass` updates).
- Builds the URL from `url_template`, then adds `output_profile` as a query parameter (keeping any query already in the template or in a button's `url:`). Button `url:` overrides are used as given.
- **Never plays in edit mode or the card-picker preview.**
- **Done when:** unit tests for config and URL building (with/without profile, template with an existing query); e2e: editor preview opens zero connections.

### T5: Lifecycle manager
Release (full destroy) on: `disconnectedCallback`, IntersectionObserver not visible, `visibilitychange` hidden, `pagehide`, Fully Kiosk `screenOff` / `onScreensaverStart` (when `window.fully` exists), pop-up hash change away, idle timeout, `stop` from the controller. Re-show rebuilds at the live edge.
- **Done when:** one e2e test per path asserting `/__stats` returns to 0 within 2 s; a 50-cycle open/close test ends at 0 with no growth in listeners (counted via an instrumented test build).

### T6: Resilience ∥
- Stall detection (no progress for 8 s while playing) → destroy and reconnect with backoff; give up after `max_attempts` and show retry.
- Error classification: CORS (opaque network failure) vs HTTP status vs codec vs device. `media-info` check: video not H.264 (or HEVC where the device supports it) or audio not AAC/MP3 → `codec` error naming the codec and pointing to the profile.
- **Done when:** e2e with each fault mode shows the right state; `stall` and `drop` recover on their own; the reconnect loop never holds two connections at once (stats ≤ 1 throughout).

### T7: UI ∥
- Title badge, play/stop, mute, "tap to unmute" when unmuted autoplay is blocked, fullscreen, error card with a plain message and retry, loading state.
- Debug overlay (`debug: true`): engine, codecs, buffer, dropped frames, reconnect count, last release reason.
- Uses HA theme variables; no hover-only controls (touch screens).
- **Done when:** Playwright screenshot tests for each state; axe check has no serious issues.

### T8: Packaging
- One entry `stream-card.js` + engine chunks in `dist/`; `hacs.json`; release workflow attaching `dist/` to a GitHub release.
- Size budget enforced in CI: entry ≤ 25 KB gz, mpegts chunk reported.
- **Done when:** a release build loads from a `/local/` path and from a `/hacsfiles/`-style path in e2e (chunk loading works from both).

### T9: README
- Install (manual `/local/` now, HACS later), Dispatcharr profile and how to find its ID (§2), the CORS `curl` check, Bubble pop-up example, Fully settings (autoplay, hardware acceleration), troubleshooting by symptom using the card's error messages.
- **Done when:** every error message the card can show is listed with its fix (checked by a script that greps the message table against the source).

### T10: Real-device acceptance (Declan)
A one-page checklist replacing Phase 0. For Fire HD 8 (Fully), Android HA app, iPhone HA app and Safari, desktop Chrome:
1. A button plays a channel in a Bubble pop-up with picture and sound.
2. Closing the pop-up, screen off, switching view and backgrounding the app each release the stream in Dispatcharr's stats.
3. 30-minute run on the Fire tablet without a stall it can't recover from.
4. Note any error the card shows (the debug overlay gives the details to paste back).

**Outcome:** v1 tagged; anything device-specific (iPhone fallback, video-transcode profile, buffer tuning) becomes v1.1 work.

## 6. After v1
Unchanged from [development-plan.md](development-plan.md): Fire hardening and soak tests (Phase 2), companion integration (Phase 3), HA Cast (Phase 4), YouTube (Phase 5), editor and HACS (Phase 6). HA Cast moves later, so it's checked in Phase 4 rather than up front.

## 7. Changes made during the build
- **mpegts.js abort bug, fixed with a custom loader.** On Chrome-based browsers, mpegts.js's fetch loader doesn't abort a request that is receiving data; it waits for the next chunk to cancel. A stalled Dispatcharr stream therefore kept its connection open. `ImmediateAbortLoader` (`card/src/engines/fetch-loader.ts`) aborts at once; the stall e2e test guards it.
- **Codec errors before media info.** Chrome rejects an unsupported codec (`addSourceBuffer`) before mpegts.js reports media info, so the codec is parsed from that error too. MPEG-2 video is skipped by mpegts.js without an error, so the card shows a "no picture" notice when the video has no size after 3 s of playback.
- **`start_timeout` option added.** A broken output profile makes Dispatcharr accept the request and never answer. The card reports this as a timeout that points at the output profile.
- **Screenshot tests attach images instead of comparing pixels.** Fonts differ between the dev container and CI, so pixel baselines would flap. States are asserted through the DOM; screenshots are attached to the report for review.
- **HACS:** `hacs.json` and a release workflow (zip of `dist/`) are in place but untested until Phase 6. v1 installs manually from the CI artifact.
- **Element name:** `stream-card`, confirmed by Declan on 2026-10-10.
- **Channel selection (1.0, asked for by Declan on 2026-10-10).** The card loads every channel from Dispatcharr's `/output/m3u` (no auth needed, CORS `*`; logos come from `/api/channels/logos/<id>/cache/`, also public) and shows a picker with search, groups, favourites and logos, channel up/down buttons, and a visual editor (`getConfigForm`). Buttons may name a channel by name or number. The EPG (8.7 MB on the real server) is not loaded. Contract additions are in §4.
- **Real Home Assistant tests added** (`card/test/ha`): a pinned HA + Bubble Card installed with uv, onboarded over the API, dashboard created over the websocket API. Not in the original plan; they caught the Bubble `button_action` detail that the fake harness couldn't.
