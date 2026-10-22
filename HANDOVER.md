# Handover / status

Living document. Newest status at the top; the change log at the bottom keeps the history. Anyone (or any Claude session) picking this up should read this first, then [docs/architecture.md](docs/architecture.md) and [CLAUDE.md](CLAUDE.md).

## Current status (2026-10-11)
**Phase:** **1.0.0 merged into `main`** (PR #1) **and installed on Declan's HA**, with channel selection. Android and the tablet dashboard play well (the earlier iPhone glitches were the Dispatcharr source, since switched). Waiting on the 1.0 rows of the acceptance checklist.

**Installed on Declan's HA:**
- Files in `/config/www/stream-card/`: `stream-card.js`, the lazy chunks (`stream-card-mpegts-engine-*`, `stream-card-video-lock-*`, `stream-card-editor-form-*`) and `mpegts-1.8.2.js`, all byte-identical to the build (checked by SHA-256 through `/local/`). Resource `/local/stream-card/stream-card.js?v=1.0.0-2`.
- Dashboard **Live TV** (`/live-tv/tv`, in the sidebar): one full-width card, `target: tv`, `output_profile: 3`, every Dispatcharr channel in the picker. Favourites and group filters are empty; set them in the card's visual editor.
- Dashboard **Stream Card Test** (`/stream-card-test/tv`) still there from 0.1 (debug on); delete it whenever.
- Dispatcharr profile **3 "Stream Card (AAC)"**, verified: H.264 + AAC only. Dispatcharr's `/output/m3u` serves 226 channels in 12 groups, all with numbers and logos, no login needed.
- For installs: HACS "HA-MCP Custom Component" (File & YAML Tools) and the built-in **Downloader** (`download_dir: www`).

**How to update the card on that HA:** build, commit the changed dist files temporarily under `install/<version>/`, `downloader.download_file` each from `raw.githubusercontent.com/Dec64/ha-video-card/<commit>/...` into subdir `stream-card` with `overwrite: true` (chunks with unchanged hashed names can stay), compare SHA-256 through `https://<ha>/local/stream-card/...`, remove the files in the next commit, then bump `?v=` on the resource. (This session can't push tags.)

**What's verified:** 78 unit, 61 e2e (fake Dispatcharr + MSE shim; `@real` tests in Google Chrome in CI), 11 real-HA tests (HA 2026.10 + Bubble 3.4.1, sections view, visual editor), the picker rendered against the real 226-channel playlist (logos, groups), and an adversarial review of the 1.0 diff (26 confirmed findings, all fixed with regression tests). Not yet verified: the 1.0 rows of [docs/acceptance-v1.md](docs/acceptance-v1.md) on the actual devices.

**Next action (Declan):** open Live TV on each device, pick channels, try up/down, reload; tick the new acceptance rows. Optionally add favourites/groups in the card editor.

**Next action (Claude):** fix anything found; then tag v1.0.0 (from GitHub's UI, Releases → Draft a new release → tag `v1.0.0` on `main`, since tag pushes are blocked here; the release workflow attaches the files) and move to Phase 2 or the iPhone fallback.

## Key facts
- Docs: user guide in [README.md](README.md); design and contracts in [docs/architecture.md](docs/architecture.md); planning history indexed in [docs/README.md](docs/README.md).
- The PC clone at `C:\Users\Declan\Projects\HA Video Card` tracks this repo; `git pull` on `main` gets the latest.
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
| 2026-10-10 | Output profile: a new profile (not the locked built-in 2) with the parameters in the README; final version drops `+nobuffer` and adds `aresample=async=1` (workflow-verified against Dispatcharr source and an ffmpeg matrix) |
| 2026-10-10 | Repo made public by Declan so HA can download release files |
| 2026-10-10 | Card element name is `stream-card` (YAML `type: custom:stream-card`) |
| 2026-10-10 | 1.0 = channel selection: the card loads Dispatcharr's `/output/m3u` (no EPG; 8.7 MB) for a picker, channel up/down, favourites, group filters and names/numbers in buttons |
| 2026-10-10 | Each device remembers each target's last channel and whether it was left playing (localStorage); Stop, a stop button and the idle timeout all count as "left stopped" |
| 2026-10-10 | In-card picks, up/down and Stop go through the page controller like buttons, so every card on a target and every recreated card agree |
| 2026-10-10 | With the list loaded, an unknown name is an error, never guessed as a stream ID; names/numbers are resolved after edit mode, never during |
| 2026-10-22 | Now/next is opt-in (`epg: false` by default, pending Declan's confirmation): the card reads `/output/epg?days=1` (public like the M3U; Dispatcharr's JSON `current-programs` API needs a login), streams it, keeps titles and times only, and refreshes every 2 h. A failed or empty guide just hides the programme line. Only now/next; no full guide grid |
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
- **2026-10-22:** Now/next data for the redesign (branch `claude/project-thread-eu2dyi`): `epg` / `epg_url` options, `src/epg.ts` (streaming XMLTV parser, page-wide `GuideFeed`, lazy chunk), `Channel.tvgId`, the card's `nowNext(channel)` for the redesigned templates to render, fake `/output/epg`, unit and e2e tests (no guide download when off or in edit mode; one shared download; failures change nothing). Nothing is drawn yet: the "Card UI redesign build" thread renders it.
- **2026-10-11:** Merged PR #1 into `main`. Rewrote the docs: README as a 1.0 user guide (setup, install, add the card, using it, buttons and pop-ups, options, troubleshooting); new [docs/architecture.md](docs/architecture.md) with the design and the contracts (moved from build-plan §4); [docs/README.md](docs/README.md) index marking the planning docs as history; acceptance checklist made per-release.
- **2026-10-11:** Installed 1.0.0 on Declan's HA and created the Live TV dashboard. Rendering the picker against the real playlist found two more issues (long group names widened the card; white logos vanished on light themes), both fixed with a test.
- **2026-10-10:** Built 1.0 channel selection (channel list, picker, up/down, names/numbers, per-device memory, visual editor via `getConfigForm`, lazy editor chunk). An adversarial review workflow confirmed 26 findings (edit-mode lookups, stop vs pending lookup, stale `lastFor` after picks, a stop missed by a closed pop-up, phone-width overlaps, a flaky connection sampler, no playlist timeout, docs); all fixed with regression tests.
- **2026-10-10:** Installed 0.1.0-beta.1 on Declan's HA (files via Downloader from a pinned commit, resource, Stream Card Test dashboard with profile 3). Repo made public by Declan.
- **2026-10-10:** Real-HA suite now uses a sections view. Found that HA 2026.10 doesn't render view-level `cards:` in sections views, so Bubble pop-ups must sit in their own section (README updated). Dispatcharr profile 3 ("Stream Card (AAC)") created by Declan and verified: H.264 + AAC only; the card plays BBC One through it.
- **2026-10-10:** mpegts.js now ships as its unmodified upstream file (`mpegts-1.8.2.js`) next to the card instead of being bundled; the card's own code is 69 KB. Fixed a teardown race that made mpegts.js throw after codec errors. Installed the HA-MCP File & YAML Tools on Declan's HA (one restart, approved) so Claude can install and update the card.
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
