# Handover / status

Living document. Newest status at the top; the change log at the bottom keeps the history. Anyone (or any Claude session) picking this up should read this first, then [docs/development-plan.md](docs/development-plan.md).

## Current status (2026-10-07)
**Phase:** 0, early tests. The test kit is built and checked against a fake stream; **waiting on Declan to run it on real devices.**

**Next action (Declan):**
1. Add the CORS header on Dispatcharr's hostname in Cloudflare (exact rule in [phase0-test-kit/README.md](phase0-test-kit/README.md), setup step 3).
2. Copy `phase0-test-kit/www/stream-test/` to HA's `/config/www/stream-test/`, add the probe card resource, and create the test dashboard.
3. Run tests 1–4 and paste the test page's "Copy everything" output into the thread, or fill in [phase0-test-kit/results.md](phase0-test-kit/results.md).

**Next action (Claude), once results are in:** fill in results.md, pick the engine per device, confirm the teardown signals, update the plan, then start Phase 1 (the real card) in a `card/` folder.

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
| 2026-10-07 | Code and docs live in the private repo [Dec64/ha-video-card](https://github.com/Dec64/ha-video-card); `C:\Users\Declan\Projects\HA Video Card` is a clone and project files keep a mirror |

## Open questions
- Card element name (`stream-card` is a placeholder; avoid the `ha-` prefix).
- Everything Phase 0 is designed to answer: audio codecs per channel, iPhone HA app support, HA Cast behaviour, YouTube ads per device.

## Known risks
- Channels with AC-3/MP2 audio may play silently on Fire/Android until a Dispatcharr ffmpeg profile converts audio to AAC.
- The HA iOS app may not support the feature mpegts.js needs (Managed Media Source); fallback planned.
- Ad-free YouTube in the embedded player is unlikely on iPhone (Safari blocks the needed cookies) and uncertain in Fully.

## Change log
- **2026-10-07:** Created the private repo Dec64/ha-video-card and linked the PC folder to it (the direct folder copy wasn't working).
- **2026-10-07:** Organized files into `docs/` and `phase0-test-kit/`, added this handover and a README.
- **2026-10-07:** Built the Phase 0 test kit (test page, probe card, test dashboard, results sheet). Checked in headless Chromium against a fake TS server: the stream connection opens and closes correctly on pop-up removal, hide and re-show. Fixed a double-start and a stuck-resume bug found by that check.
- **2026-10-06:** Declan answered follow-ups (Cloudflare fine, companion media_player, HA Cast, iPhones). Plan updated.
- **2026-10-06:** Wrote the development plan from Declan's answers.
- **2026-10-06:** Reviewed RFC-001. Main findings: Bubble pop-ups are removed from the page, Dispatcharr serves MPEG-TS not HLS, and codecs/HTTPS are bigger risks than buffer size.
