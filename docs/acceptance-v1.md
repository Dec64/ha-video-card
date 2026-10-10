# v1 acceptance on real devices (T10)

Replaces Phase 0. The automated tests cover the logic; this checks what only real devices can: decoding, autoplay rules, Fully Kiosk events and the HA apps.

## Before you start
- [ ] Dispatcharr output profile set up as in the [README](../README.md#output-profile), **Active**, and its ID noted.
- [ ] The CORS `curl` check prints `access-control-allow-origin: *`.
- [ ] Card installed (README section 2) and resource added with `?v=1.0.0`.
- [ ] A test dashboard: one Bubble pop-up `#tv-test` containing the card (`target: tv_test`, `output_profile: <id>`, `debug: true`), and two buttons on the main view playing two different channels with `open: "#tv-test"`, plus a stop button.
- [ ] Dispatcharr's Stats page open on another screen. That is where "released" is measured.

## Per device
Devices: Fire HD 8 (Fully Kiosk), Android phone (HA app), iPhone (HA app), iPhone (Safari), desktop Chrome.

| Check | Fire HD 8 | Android app | iPhone app | iPhone Safari | Desktop |
|---|---|---|---|---|---|
| Button opens the pop-up and plays with **picture and sound** | | | | | |
| Debug overlay shows `avc1…` and `mp4a.40.2` | | | | | |
| Closing the pop-up: client gone from Dispatcharr within 5 s | | | | | |
| Reopening the pop-up resumes the channel | | | | | |
| Second button switches channel; Dispatcharr never shows two clients for this device | | | | | |
| Stop button releases the client | | | | | |
| Screen off (or app to background): released; screen on: resumes | | | | | |
| Fully screensaver: released; ends: resumes | | n/a | n/a | n/a | n/a |
| Switching to another dashboard view: released | | | | | |
| Channel picker: logos load, search and group chips work, tapping a channel plays it | | | | | |
| Channel up/down switches channel; never two clients in Dispatcharr | | | | | |
| After reloading the dashboard, the card starts on the last channel | | | | | |
| 30 minutes playing without an error or a stall it can't recover from | | | | | |

If a device shows an error, the message plus the debug overlay text is all I need. "This browser can't play live MPEG-TS streams" on the iPhone HA app means the iOS fallback (v1.1) is needed.

## Outcome
- All ticked on the devices you care about → tag v1.0.0 (the release workflow builds the zip).
- Anything device-specific (iPhone fallback, a video-transcode profile for some channels, buffer tuning on the Fire tablet) becomes v1.1 / Phase 2 work.
