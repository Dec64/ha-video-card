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

## 2.0 redesign (now/next, navigation, multiview)
Same setup, with the 2.0 build installed. For multiview add `multiview: true` (and `max_tiles: 4` on the desktop) to the Live TV card.

| Check | Fire HD 8 | Android app | iPhone app | iPhone Safari | Desktop | HA Cast (TV) |
|---|---|---|---|---|---|---|
| Layout fits: wall panel gets big buttons, phone/pop-up has controls under the picture, TV shows the 10-foot layout with no tap controls | | | | | | |
| Theme: card follows the HA theme (light and dark), text readable on the selected chips | | | | | | |
| Ident shows the programme now and next with a progress bar; guide tiles show what's on (needs EPG assigned in Dispatcharr) | | | | | | |
| Dispatcharr guide download is reasonable on this device (first load of the page isn't noticeably slower) | | | | | | |
| Big channel number on each zap; typing digits (keypad in the guide, or a keyboard/remote) tunes the channel | | | | | | |
| Last channel flips between the two latest channels; Recent tab lists this device's channels | | | | | | |
| Volume slider works and is remembered after a reload (iPhone: ignored, by design) | | | | n/a | | |
| Sleep timer 15 min: warning in the last minute with Keep watching / +30 min; at the end the client leaves Dispatcharr | | | | | | |
| Error on a broken channel offers **Back to** the previous channel | | | | | | |
| Multiview 2 tiles: two clients in Dispatcharr, sound on one tile, moving sound works | | | | | | n/a |
| Multiview: Exit, Stop, closing the pop-up and screen off each leave Dispatcharr with the right number of clients (0 after Stop/close/off, 1 after Exit) | | | | | | n/a |
| Multiview on the Fire HD 8: does 2 × 1080 decode keep up, or does "can't keep up" appear (then try a 540p `multiview.output_profile`) | | n/a | n/a | n/a | n/a | n/a |
| Cast: the TV plays, the clock and remote hints show, and stopping the cast releases the client | n/a | n/a | n/a | n/a | n/a | |

## Outcome
- All ticked on the devices you care about → tag the release (`v` + the version in `card/package.json`); the release workflow builds the zip and attaches the files.
- Anything device-specific (iPhone fallback, a video-transcode profile for some channels, buffer tuning on the Fire tablet) becomes v1.1 / Phase 2 work.
