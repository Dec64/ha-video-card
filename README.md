# Stream Card for Home Assistant

A Lovelace card that plays Dispatcharr IPTV channels on wall tablets, phones and desktop, including inside Bubble Card pop-ups, and **releases the Dispatcharr connection whenever nobody can see it**: pop-up closed, screen off, Fully Kiosk screensaver, app in the background, page hidden, edit mode or idle timeout.

- Plays Dispatcharr's MPEG-TS streams with [mpegts.js](https://github.com/xqq/mpegts.js) (shipped unmodified next to the card), loaded only when needed.
- Lists every Dispatcharr channel on the card: logos, search, groups, favourites, channel up/down, and the last channel remembered per device.
- Any button can play a channel (by name, number or UUID) on a chosen card with HA's built-in `fire-dom-event` action. No browser_mod.
- Reconnects on its own after stalls and dropped connections, and never holds two connections at once.
- Says what's wrong in plain words (unsupported codec, CORS, channel not found, a broken output profile) instead of showing a black box.

Status: **1.0**. Project status and decisions: [HANDOVER.md](HANDOVER.md); device checklist: [docs/acceptance-v1.md](docs/acceptance-v1.md).

## 1. Dispatcharr setup (once)

### Output profile
Browsers can't play the AC-3 or MP2 audio many channels carry. Add an output profile that converts audio to AAC and drops subtitle, teletext and data tracks: Dispatcharr → Settings → Output Profiles → **Add**.

| Field | Value |
|---|---|
| Name | `Stream Card (AAC)` (any unique name) |
| Command | **FFmpeg** |
| Parameters | see below |
| Is Active | ticked |

```
-fflags +discardcorrupt+genpts -probesize 1M -analyzeduration 1M -i pipe:0 -map 0:v:0? -map 0:a:0? -sn -dn -c:v copy -c:a aac -b:a 192k -ac 2 -ar 48000 -af aresample=async=1:min_hard_comp=0.03 -max_muxing_queue_size 4096 -flush_packets 1 -mpegts_flags +pat_pmt_at_frames+resend_headers+initial_discontinuity -f mpegts pipe:1
```

- **Add a new profile; don't edit "Web Player (AAC Audio)".** That one is a locked built-in (its fields are greyed out), and its `-map 0` breaks on channels with teletext, subtitle or data tracks such as BBC One: ffmpeg exits with "Encoder not found" and Dispatcharr sends nothing for about 50 s.
- **Find the new profile's ID:** the Output Profiles table doesn't show it. On the Channels page, open the M3U URL popover and pick the profile under "Output Profile"; the generated URL ends in `?output_profile=<id>`. It's usually `3`. Put it in the card's `output_profile`.
- **Check it works:** `ffprobe -v error -show_entries stream=codec_name -of csv=p=0 "https://<dispatcharr>/proxy/ts/stream/<uuid>?output_profile=<id>"` should list only `h264` and `aac`. If it lists `ac3` or `mp2`, the ID is wrong or the profile isn't Active: Dispatcharr silently falls back to the original stream.
- What it does: video is copied untouched; only audio is converted (about 4% of one CPU core per channel, shared by every viewer of that channel); only the first audio track is kept; `aresample=async=1` keeps lip-sync after small audio drop-outs from the provider.
- **MPEG-2 channels** (some SD channels) still show no picture, because the video is copied. They need a second profile that converts video, which costs much more CPU: replace `-c:v copy` with `-vf yadif=mode=send_frame:deint=interlaced -c:v libx264 -preset veryfast -tune zerolatency -profile:v high -pix_fmt yuv420p -crf 23 -maxrate 5M -bufsize 10M -g 50`.

### CORS
Dispatcharr already allows every origin. Check that nothing in front of it (a reverse proxy, Cloudflare) strips the header:

```
curl -sI -H "Origin: https://your-ha.example" "https://<dispatcharr>/proxy/ts/stream/<uuid>?output_profile=<id>" --max-time 3 | grep -i access-control
```

It should print `access-control-allow-origin: *`. If you add a header rule in Cloudflare anyway, use **Set**, not Add: two values make browsers reject the stream.

## 2. Install

Until the HACS release (Phase 6):

1. Get the build: the **stream-card-dist** artifact of the latest successful [CI run](https://github.com/Dec64/ha-video-card/actions), or build it yourself with `cd card && npm ci && npm run build` (output in `card/dist/`).
2. Copy **every `.js` file** from it into `/config/www/stream-card/`. The card loads its player code and `mpegts-1.8.2.js` (the unmodified [mpegts.js](https://github.com/xqq/mpegts.js) build, identical to `https://cdn.jsdelivr.net/npm/mpegts.js@1.8.2/dist/mpegts.js`) from the same folder.
3. Settings → Dashboards → ⋮ → Resources → Add resource: URL `/local/stream-card/stream-card.js?v=1.0.0`, type **JavaScript module**. Raise `?v=` on each update so devices fetch the new version.
4. Reload the browser (on Fully Kiosk: clear cache and reload).

## 3. Card configuration

The smallest useful card: every Dispatcharr channel, ready to pick.

```yaml
type: custom:stream-card
target: kitchen_tv                    # name buttons use to reach this card
dispatcharr_url: https://dispatcharr.example
output_profile: 3                     # the output profile from section 1
```

Every option is also in the visual editor (Edit card), under Channels, Playback and Advanced.

### Choosing channels
With `dispatcharr_url` set, the card loads Dispatcharr's channel list (`<dispatcharr_url>/output/m3u`, the same playlist IPTV apps use; it needs no login) and offers it three ways:

- **The picker.** A card with nothing playing shows every channel below the picture: tap a logo to play it. While playing, the grid button (▦) opens it again; in full screen it opens over the picture. Search matches names and numbers (Enter plays the first match); chips filter by Dispatcharr group, and **★ Favourites** shows your `favourites` in their order.
- **Channel up/down** (⌃ ⌄) steps through the card's channels in channel-number order, wrapping round.
- **By name or number** in `channel:` and in buttons, e.g. `channel: BBC One HD` or `channel: "101"` (case doesn't matter). UUIDs still work.

Each device remembers the last channel per `target` and starts there next time (`remember_channel: false` always starts on `channel`). Channels open with the card's `output_profile`. If the list is long, narrow it with `channel_groups`:

```yaml
type: custom:stream-card
target: living_room
dispatcharr_url: https://dispatcharr.example
output_profile: 3
channel_groups: [UK Entertainment, UK News]   # Dispatcharr group names, in this order
favourites: [BBC One HD, ITV1 HD, "101"]
channel: BBC One HD                           # first-time default
```

| Option | Default | Meaning |
|---|---|---|
| `target` | `default` | Mailbox name. Buttons with the same `target` play on this card |
| `dispatcharr_url` | — | Dispatcharr base URL. Needed to play `channel` IDs |
| `output_profile` | none | Dispatcharr output profile ID, sent as `?output_profile=<id>` |
| `channel` | none | Channel to play when the card appears (if `autoplay`): name, number or UUID |
| `url` | none | A full stream URL instead of a channel (MPEG-TS, or MP4/HLS on browsers that play them natively) |
| `title` | none | Title for the default channel (default: its name from the channel list) |
| `channel_list` | `true` with `dispatcharr_url` | Load Dispatcharr's channel list for the picker, channel up/down and names |
| `channel_groups` | all | Only these Dispatcharr groups, in this order |
| `favourites` | none | Channel names, numbers or UUIDs shown first under ★ Favourites |
| `remember_channel` | `true` | Start on the channel this device watched last (per `target`) |
| `m3u_url` | `<dispatcharr_url>/output/m3u` | Another M3U playlist for the channel list |
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

Any card with a `tap_action` (tile, button, Mushroom) can play a channel:

```yaml
tap_action:
  action: fire-dom-event
  stream_card:
    target: kitchen_tv
    channel: BBC One HD          # name, number ("101") or UUID
    open: "#kitchen-tv"          # optional: opens this Bubble pop-up
```

Names and numbers are looked up in the receiving card's channel list, so that card needs `dispatcharr_url` (the default list) or `m3u_url`.

A stop button:

```yaml
tap_action:
  action: fire-dom-event
  stream_card:
    target: kitchen_tv
    action: stop
```

`stream_card` fields: `target`, `channel` or `url`, `title` (default: the channel's name), `open` (a pop-up hash like `#tv`, or a dashboard path), `action` (`play` or `stop`).

### Bubble Card buttons
On a Bubble Card button, `tap_action` only covers the **icon**. The rest of the button runs `button_action`, so set both:

```yaml
type: custom:bubble-card
card_type: button
button_type: name
name: BBC One HD
icon: mdi:television
tap_action: &bbc1
  action: fire-dom-event
  stream_card:
    target: kitchen_tv
    channel: BBC One HD
    open: "#kitchen-tv"
button_action:
  tap_action: *bbc1
```

(The `&bbc1` / `*bbc1` YAML anchor saves repeating the block; Home Assistant expands it when the dashboard is saved.)

### In a Bubble Card pop-up
Put the stream card inside the pop-up and give the pop-up's buttons `open:` with its hash. In a **sections** view, give the pop-up card **its own section**: Home Assistant 2026.10 doesn't render view-level `cards:` in a sections view, so a pop-up placed there never opens. A closed pop-up takes no space in its section. Bubble Card removes closed pop-ups from the page; the card keeps the request until the pop-up opens, plays, and releases the stream when it closes. Reopening the pop-up resumes the last channel at the live edge.

```yaml
type: custom:bubble-card
card_type: pop-up
hash: "#kitchen-tv"
name: TV
cards:
  - type: custom:stream-card
    target: kitchen_tv
    dispatcharr_url: https://dispatcharr.example
    output_profile: 3
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
| Dispatcharr doesn't know this channel (404). Check the channel ID. | Copy the channel UUID from Dispatcharr again, or use its name. |
| Couldn't load the channel list from Dispatcharr ({detail}). Check dispatcharr_url, or m3u_url if you set one. | Open `<dispatcharr_url>/output/m3u` on this device. HTTP 403 means Dispatcharr's network access settings block M3U/EPG for this device's IP. Press Try again after fixing it. |
| No channel called "{name}" in the channel list. | Check the spelling against the picker, or use the channel number. A `channel_groups` filter doesn't hide channels from names. |
| The channel list is empty. | Dispatcharr returned a playlist with no channels: check that channels are enabled and assigned to a channel profile. |
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
├── test/ha/                 real Home Assistant + Bubble Card integration tests (npm run e2e:ha)
└── test/live/               optional tests against a real Dispatcharr channel
docs/                        review, plans, acceptance checklist
phase0-test-kit/             earlier diagnostic tools (Phase 0 was dropped)
```

The PC clone at `C:\Users\Declan\Projects\HA Video Card` tracks this repo; `git pull` gets the latest.
