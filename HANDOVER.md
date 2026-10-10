# Handover / status

Living document. Newest status at the top; the change log at the bottom keeps the history. Anyone (or any Claude session) picking this up should read this first, then [docs/development-plan.md](docs/development-plan.md).

## Current status (2026-10-10)
**Phase:** v1 built (T0–T9 of [docs/build-plan-v1.md](docs/build-plan-v1.md)) in `card/`. Waiting on real-device acceptance (T10).

**What's verified:** 56 unit tests and 38 end-to-end tests (fake Dispatcharr + MSE shim; three `@real` tests run in Google Chrome in CI), plus 8 tests in a real, disposable Home Assistant 2026.10 with Bubble Card 3.4.1 (HA and Bubble buttons, pop-up close/back/forward, stop, view switching, edit mode, card editor preview, state churn). Live-tested here against the real BBC One channel: the raw channel gets a named AC-3 error, profile 2 as it stands gets the timeout error, and the recommended profile (applied by a local relay) plays H.264 High 1080p25 + AAC for a minute with no reconnects and releases on close. Real decoding on the actual devices is not verified yet.

**Next action (Declan):**
1. Fix output profile 2 in Dispatcharr: replace `-map 0` and the probe settings with the parameters in the [README](README.md#output-profile) and switch it **Active**. As it stands it fails on BBC One ("Encoder not found" on the teletext/data tracks) and Dispatcharr never answers.
2. Install the card (README section 2) and run the [acceptance checklist](docs/acceptance-v1.md) on each device.

**Next action (Claude):** fix anything T10 finds; tag v0.1.0 when it passes; then Phase 2 (Fire hardening) or the iPhone fallback if the HA iOS app needs it.

## Key facts
- HA is reached remotely through Cloudflare at `hayden-family.net`. Dispatcharr is on its own HTTPS hostname, also via Cloudflare.
- Dispatcharr channel URLs are `/proxy/ts/stream/<uuid>`: continuous MPEG-TS, so the player engine is **mpegts.js** (not hls.js as the RFC assumed).
- Bubble Card ≥ 3.2.4 **removes closed pop-ups from the page**, so the card must pick up play requests when it appears (a "mailbox") and release the stream when it's removed.
- Devices: Fire HD 8 wall dashboards (Fully Kiosk), Android and iPhone (HA app and browser), desktop, and TVs via HA Cast.

## Decisions made
| Date | Decision |
|---|---|
| 2026-10-06 | Keep the RFC's overall shape (client-side card, swappable players, hard teardown); change the trigger, engine and teardown details per [docs/rfc-001-review.md](docs/rfc-001-review.md) |
| 2026-10-06 | No browser_mod. Buttons use HA's built-in `fire-dom-event` |
| 2026-10-06 | IPTV first, YouTube second. Premium ad-free where the platform allows |
| 2026-10-06 | No one-stream-per-device enforcement; Dispatcharr handles limits |
| 2026-10-06 | Personal first, HACS once stable |
| 2026-10-06 | Streaming through Cloudflare is accepted as is |
| 2026-10-06 | Automations target a screen through a companion integration (one media_player per screen) |
| 2026-10-06 | "Cast to TV" means HA Cast of a dashboard with the card on it; the video plays in the card on the TV |
| 2026-10-06 | iPhones are first-class; HLS fallback via go2rtc if the HA iOS app can't run mpegts.js |
| 2026-10-10 | Skip Phase 0. Dispatcharr output profile (AAC audio, MPEG-TS) defines the stream; device checks move to v1 acceptance (T10) |
| 2026-10-10 | The card selects the output profile per URL with `?output_profile=<id>` (Dispatcharr's own parameter) |
| 2026-10-10 | v1 = card only, IPTV only. Companion integration, Cast and YouTube come after |
| 2026-10-10 | mpegts.js runs with our own fetch loader (`ImmediateAbortLoader`): its stock loader leaves a stalled connection open on Chrome |
| 2026-10-10 | v1 installs manually from the CI artifact; HACS packaging is prepared but waits for Phase 6 |
| 2026-10-10 | Card element name is `stream-card` (YAML `type: custom:stream-card`) |
| 2026-10-07 | Code and docs live in the private repo [Dec64/ha-video-card](https://github.com/Dec64/ha-video-card); `C:\Users\Declan\Projects\HA Video Card` is a clone and project files keep a mirror |

## Open questions
- iPhone HA app support for mpegts.js, HA Cast behaviour, YouTube ads per device (checked in T10 and later phases instead of Phase 0).

## Known risks
- The profile copies video, so any HEVC or MPEG-2 channel will still fail on Fire tablets; the card names the codec (or shows "no picture" for MPEG-2), and a video-transcode profile fixes those channels.
- BBC One is 1080i (interlaced) H.264 High. Fire HD 8 hardware decode of interlaced 1080 is untested; T10 will show it.
- The HA connector points at Declan's live home HA (not a dev instance). Claude doesn't install or restart anything there; HA integration tests run against a disposable HA inside the Claude session instead.
- The HA iOS app may not support the feature mpegts.js needs (Managed Media Source); fallback planned.
- Ad-free YouTube in the embedded player is unlikely on iPhone (Safari blocks the needed cookies) and uncertain in Fully.

## Change log
- **2026-10-10:** Added the real Home Assistant test suite (`card/test/ha`, `npm run e2e:ha`, CI job). Found that Bubble Card buttons only run `tap_action` from the icon; the body needs `button_action` (README updated). Hid the debug overlay in preview/empty states. Element name `stream-card` confirmed.
- **2026-10-10:** Built v1 (T0–T9): card, controller, lifecycle, session, engines, fake Dispatcharr, MSE shim, unit/e2e/live tests, CI, README, acceptance checklist. Found and worked around an mpegts.js bug that left stalled connections open on Chrome. Live tests against BBC One confirmed profile 2 is broken (`-map 0`) and the recommended profile works.
- **2026-10-10:** Checked Dispatcharr's source: `?output_profile=<id>` selects the profile per stream (falls back silently to no conversion if the ID is wrong or the profile is inactive), and Dispatcharr already sends `Access-Control-Allow-Origin: *`. Plan updated.
- **2026-10-10:** Reviewed the approach after Declan's point about output profiles. Dropped Phase 0, wrote [docs/build-plan-v1.md](docs/build-plan-v1.md) (agentic task breakdown, contracts, test harness). Found that headless Chromium here can't decode H.264/AAC, so e2e uses an MSE shim locally and real Chrome in CI.
- **2026-10-07:** Created the private repo Dec64/ha-video-card and linked the PC folder to it (the direct folder copy wasn't working).
- **2026-10-07:** Organized files into `docs/` and `phase0-test-kit/`, added this handover and a README.
- **2026-10-07:** Built the Phase 0 test kit (test page, probe card, test dashboard, results sheet). Checked in headless Chromium against a fake TS server: the stream connection opens and closes correctly on pop-up removal, hide and re-show. Fixed a double-start and a stuck-resume bug found by that check.
- **2026-10-06:** Declan answered follow-ups (Cloudflare fine, companion media_player, HA Cast, iPhones). Plan updated.
- **2026-10-06:** Wrote the development plan from Declan's answers.
- **2026-10-06:** Reviewed RFC-001. Main findings: Bubble pop-ups are removed from the page, Dispatcharr serves MPEG-TS not HLS, and codecs/HTTPS are bigger risks than buffer size.
