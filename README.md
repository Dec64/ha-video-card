# Stream Card for Home Assistant

A Lovelace card that plays Dispatcharr IPTV channels on wall tablets, phones and desktop, including inside Bubble Card pop-ups, and **releases the Dispatcharr connection whenever nobody can see it**: pop-up closed, screen off, Fully Kiosk screensaver, app in the background, page hidden, edit mode or idle timeout.

- Plays Dispatcharr's MPEG-TS streams with [mpegts.js](https://github.com/xqq/mpegts.js), loaded only when needed.
- Any button can play a channel on a chosen card with HA's built-in `fire-dom-event` action. No browser_mod.
- Reconnects on its own after stalls and dropped connections, and never holds two connections at once.
- Says what's wrong in plain words (unsupported codec, CORS, channel not found, a broken output profile) instead of showing a black box.

Status: **v1 built, awaiting real-device acceptance** ([checklist](docs/acceptance-v1.md)). Project status and decisions: [HANDOVER.md](HANDOVER.md).

## 1. Dispatcharr setup (once)

### Output profile
Browsers can't play the AC-3 or MP2 audio many channels carry. Create an output profile in Dispatcharr that converts audio to AAC and drops subtitle, teletext and data tracks. Command `ffmpeg`, parameters:

```
-fflags +discardcorrupt+genpts+nobuffer -probesize 1M -analyzeduration 1M -i pipe:0 -map 0:v:0? -map 0:a:0? -sn -dn -c:v copy -c:a aac -b:a 192k -ac 2 -ar 48000 -max_muxing_queue_size 4096 -flush_packets 1 -mpegts_flags +pat_pmt_at_frames+resend_headers+initial_discontinuity -f mpegts pipe:1
```

- Switch the profile to **Active**. Dispatcharr ignores an inactive or unknown profile and silently sends the original stream.
- Note its numeric ID; it goes in the card's `output_profile`. The card requests it with `?output_profile=<id>` on every stream URL.
- Don't use `-map 0`: on channels with teletext or data tracks (BBC One, for example) ffmpeg exits with "Encoder not found" and Dispatcharr never answers.

### CORS
Dispatcharr already allows every origin. Check that nothing in front of it (a reverse proxy, Cloudflare) strips the header:

```
curl -sI -H "Origin: https://your-ha.example" "https://<dispatcharr>/proxy/ts/stream/<uuid>?output_profile=<id>" --max-time 3 | grep -i access-control
```

It should print `access-control-allow-origin: *`. If you add a header rule in Cloudflare anyway, use **Set**, not Add: two values make browsers reject the stream.

## 2. Install

Until the HACS release (Phase 6):

1. Get the build: the **stream-card-dist** artifact of the latest successful [CI run](https://github.com/Dec64/ha-video-card/actions), or build it yourself with `cd card && npm ci && npm run build` (output in `card/dist/`).
2. Copy **every file** from it into `/config/www/stream-card/` (the main file loads the player from a second file next to it).
3. Settings → Dashboards → ⋮ → Resources → Add resource: URL `/local/stream-card/stream-card.js?v=0.1.0`, type **JavaScript module**. Raise `?v=` on each update so devices fetch the new version.
4. Reload the browser (on Fully Kiosk: clear cache and reload).

## 3. Card configuration

```yaml
type: custom:stream-card
target: kitchen_tv                    # name buttons use to reach this card
dispatcharr_url: https://dispatcharr.example
output_profile: 2                     # Dispatcharr output profile ID
```

| Option | Default | Meaning |
|---|---|---|
| `target` | `default` | Mailbox name. Buttons with the same `target` play on this card |
| `dispatcharr_url` | — | Dispatcharr base URL. Needed to play `channel` IDs |
| `output_profile` | none | Dispatcharr output profile ID, sent as `?output_profile=<id>` |
| `channel` | none | Channel UUID to play when the card appears (if `autoplay`) |
| `url` | none | A full stream URL instead of a channel (MPEG-TS, or MP4/HLS on browsers that play them natively) |
| `title` | none | Title for the default channel |
| `autoplay` | `true` | Play the default or last channel when the card appears |
| `muted` | `false` | Start muted. If a browser blocks sound, the card starts muted anyway and shows "Tap to unmute" |
| `aspect_ratio` | `16:9` | Card shape |
| `idle_timeout` | `0` | Minutes without any touch or key press before playback stops. `0` = never |
| `start_timeout` | `20` | Seconds to wait for the first data before showing an error |
| `reconnect.max_attempts` | `5` | Reconnects after stalls or drops before giving up (backoff 1, 2, 4, 8, 15 s) |
| `url_template` | `{base}/proxy/ts/stream/{channel}` | How channel URLs are built |
| `debug` | `false` | Overlay with engine, codecs, buffer, frames and the last error |

The card never plays in the dashboard editor or while the dashboard is in edit mode.

## 4. Buttons

Any card with a `tap_action` (tile, button, Mushroom, Bubble Card buttons) can play a channel:

```yaml
tap_action:
  action: fire-dom-event
  stream_card:
    target: kitchen_tv
    channel: de528019-264f-42bf-9250-c2a55366e77c
    title: BBC One HD
    open: "#kitchen-tv"          # optional: opens this Bubble pop-up
```

A stop button:

```yaml
tap_action:
  action: fire-dom-event
  stream_card:
    target: kitchen_tv
    action: stop
```

`stream_card` fields: `target`, `channel` or `url`, `title`, `open` (a pop-up hash like `#tv`, or a dashboard path), `action` (`play` or `stop`).

### In a Bubble Card pop-up
Put the stream card inside the pop-up and give the pop-up's buttons `open:` with its hash. Bubble Card removes closed pop-ups from the page; the card keeps the request until the pop-up opens, plays, and releases the stream when it closes. Reopening the pop-up resumes the last channel at the live edge.

```yaml
type: custom:bubble-card
card_type: pop-up
hash: "#kitchen-tv"
name: TV
cards:
  - type: custom:stream-card
    target: kitchen_tv
    dispatcharr_url: https://dispatcharr.example
    output_profile: 2
```

## 5. Fully Kiosk (Fire tablets)
- Web Content Settings → **Autoplay Videos**: on (otherwise playback starts muted).
- Advanced Web Settings → **Enable JavaScript Interface**: on. The card then stops the stream when the screen turns off or the screensaver starts, and resumes after.
- Advanced Web Settings → hardware acceleration: on.

## 6. Troubleshooting

Turn on `debug: true` to see codecs, buffer, dropped frames and the last error on the card.

| The card says | What to do |
|---|---|
| This device can't play {codec} audio. Use a Dispatcharr output profile that converts audio to AAC. | Set `output_profile` to a profile like the one in section 1, and check the profile is Active. |
| This device can't play {codec} video. Use a Dispatcharr output profile that converts video to H.264. | The channel's video (often HEVC) isn't supported on this device. Make a second profile with `-c:v libx264` for those channels. |
| This device can't play this stream's format. | As above; turn on `debug` to see the codecs. |
| No picture in this stream: its video track is missing or uses a codec the player skips. | The channel is probably MPEG-2 video. Use a profile that converts video to H.264. Sound still plays. |
| No data from Dispatcharr after {seconds} s. If an output profile is set, check its ffmpeg command works for this channel. | Usually a broken output profile (ffmpeg exits, Dispatcharr waits forever). Test the profile's command on the channel, or remove `output_profile` to compare. |
| Dispatcharr doesn't know this channel (404). Check the channel ID. | Copy the channel UUID from Dispatcharr again. |
| Dispatcharr refused the stream ({status}). Check Dispatcharr's network access settings for streams. | Dispatcharr's network access rules block this device's IP. |
| Dispatcharr returned an error ({status}). | Dispatcharr is having trouble (often 503 when the provider's connection limit is reached). The card retries 5xx errors on its own. |
| Dispatcharr blocked this page's request (CORS). Check that nothing in front of Dispatcharr removes its Access-Control-Allow-Origin header. | Run the `curl` check in section 1. |
| Can't reach Dispatcharr. Check dispatcharr_url and that this device can reach it. | Open the stream URL in this device's browser. On HTTPS dashboards, Dispatcharr must be HTTPS too. |
| This browser can't play live MPEG-TS streams (no Media Source Extensions). | Old iOS, or a WebView without Media Source Extensions. An HLS fallback for these is planned (v1.1). |
| The stream kept dropping. Stopped after {attempts} attempts. | The stream stalled or disconnected repeatedly. Check Dispatcharr's logs for this channel; press Retry. |
| The player hit an error it could not recover from. | Turn on `debug` and note the last error. |

## Development

Source is in [`card/`](card): TypeScript, Lit, Vite. See [CLAUDE.md](CLAUDE.md) for commands and conventions, and [docs/build-plan-v1.md](docs/build-plan-v1.md) for the design.

```
card/
├── src/                     card, controller, lifecycle, session, engines
├── test/unit/               Vitest
├── test/e2e/                Playwright against a fake Dispatcharr (ffmpeg) + MSE shim
├── test/fake-dispatcharr/   the fake server
└── test/live/               optional tests against a real Dispatcharr channel
docs/                        review, plans, acceptance checklist
phase0-test-kit/             earlier diagnostic tools (Phase 0 was dropped)
```

The PC clone at `C:\Users\Declan\Projects\HA Video Card` tracks this repo; `git pull` gets the latest.
