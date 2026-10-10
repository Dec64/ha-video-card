# Handover / status

Living document. Newest status at the top; the change log at the bottom keeps the history. Anyone (or any Claude session) picking this up should read this first, then [docs/development-plan.md](docs/development-plan.md).

## Current status (2026-10-10)
**Phase:** v1 build plan drafted ([docs/build-plan-v1.md](docs/build-plan-v1.md)). Phase 0 dropped: a Dispatcharr output profile fixes the stream format, and the remaining device questions become v1 acceptance checks.

**Next action (Declan):**
1. Review the build plan, especially §2: suggested changes to the "Web Player (AAC Audio)" profile, and switch it to **Active** (an inactive profile is silently ignored).
2. Note the profile's numeric ID; the card sends it as `?output_profile=<id>`.
3. Run the CORS `curl` check in §2. Dispatcharr allows all origins itself, so the Cloudflare rule is probably not needed.

**Next action (Claude), once the plan is approved:** T0 (scaffold, CLAUDE.md, CI) then T1 (test harness), per the build plan.

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
| 2026-10-07 | Code and docs live in the private repo [Dec64/ha-video-card](https://github.com/Dec64/ha-video-card); `C:\Users\Declan\Projects\HA Video Card` is a clone and project files keep a mirror |

## Open questions
- Card element name (`stream-card` is a placeholder; avoid the `ha-` prefix).
- iPhone HA app support for mpegts.js, HA Cast behaviour, YouTube ads per device (checked in T10 and later phases instead of Phase 0).

## Known risks
- The profile copies video, so any HEVC or MPEG-2 channel will still fail on Fire tablets; the card will name the codec, and a video-transcode profile fixes those channels.
- The HA iOS app may not support the feature mpegts.js needs (Managed Media Source); fallback planned.
- Ad-free YouTube in the embedded player is unlikely on iPhone (Safari blocks the needed cookies) and uncertain in Fully.

## Change log
- **2026-10-10:** Checked Dispatcharr's source: `?output_profile=<id>` selects the profile per stream (falls back silently to no conversion if the ID is wrong or the profile is inactive), and Dispatcharr already sends `Access-Control-Allow-Origin: *`. Plan updated.
- **2026-10-10:** Reviewed the approach after Declan's point about output profiles. Dropped Phase 0, wrote [docs/build-plan-v1.md](docs/build-plan-v1.md) (agentic task breakdown, contracts, test harness). Found that headless Chromium here can't decode H.264/AAC, so e2e uses an MSE shim locally and real Chrome in CI.
- **2026-10-07:** Created the private repo Dec64/ha-video-card and linked the PC folder to it (the direct folder copy wasn't working).
- **2026-10-07:** Organized files into `docs/` and `phase0-test-kit/`, added this handover and a README.
- **2026-10-07:** Built the Phase 0 test kit (test page, probe card, test dashboard, results sheet). Checked in headless Chromium against a fake TS server: the stream connection opens and closes correctly on pop-up removal, hide and re-show. Fixed a double-start and a stuck-resume bug found by that check.
- **2026-10-06:** Declan answered follow-ups (Cloudflare fine, companion media_player, HA Cast, iPhones). Plan updated.
- **2026-10-06:** Wrote the development plan from Declan's answers.
- **2026-10-06:** Reviewed RFC-001. Main findings: Bubble pop-ups are removed from the page, Dispatcharr serves MPEG-TS not HLS, and codecs/HTTPS are bigger risks than buffer size.
