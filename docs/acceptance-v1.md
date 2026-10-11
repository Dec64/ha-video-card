# Device acceptance (1.0)

The automated tests cover the logic; this checks what only real devices can: decoding, autoplay rules, Fully Kiosk events and the HA apps. Run it for each release on the devices you care about.

## Before you start
- [ ] Dispatcharr output profile set up as in the [README](../README.md#output-profile), **Active**, and its ID noted.
- [ ] The CORS `curl` check prints `access-control-allow-origin: *`.
- [ ] Card installed (README section 2) and the resource's `?v=` raised for this release; each device reloaded.
- [ ] A dashboard with the card on the page (e.g. Live TV), plus a Bubble pop-up containing a second card with its own target, two buttons playing two channels into the pop-up with `open:`, and a stop button. Turn on `debug: true` while testing.
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

If a device shows an error, the message plus the debug overlay text is all that's needed to diagnose it. "This browser can't play live MPEG-TS streams" on the iPhone HA app means the iOS fallback (v1.1) is needed.

## Outcome
- All ticked on the devices you care about → tag the release (`v` + the version in `card/package.json`); the release workflow builds the zip and attaches the files.
- Anything device-specific (iPhone fallback, a video-transcode profile for some channels, buffer tuning on the Fire tablet) becomes v1.1 / Phase 2 work.
