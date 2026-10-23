# Stream Card for Home Assistant

A Lovelace card that plays your [Dispatcharr](https://github.com/Dispatcharr/Dispatcharr) IPTV channels on wall tablets, phones and desktops, and **lets go of the Dispatcharr connection whenever nobody can see it**.

- **Every channel on the card.** Logos, search, Dispatcharr groups, favourites, channel up/down. Each device remembers what it was watching.
- **Releases the stream when hidden.** Closing a Bubble Card pop-up, switching view, screen off, Fully Kiosk screensaver, app in the background, idle timeout or dashboard edit mode all free the connection. Coming back resumes at the live edge.
- **Buttons anywhere.** Any HA button can play a channel (by name, number or ID) on a chosen card and open a pop-up, using HA's built-in `fire-dom-event`. No browser_mod.
- **Recovers by itself.** It reconnects after stalls and dropped connections, and never holds two connections at once.
- **Plain-language errors.** It names the problem (an unsupported codec, a broken output profile, a blocked request, an unknown channel) instead of showing a black box.
- **Visual editor.** Every option is in HA's card editor.

Plays Dispatcharr's MPEG-TS streams in the browser with [mpegts.js](https://github.com/xqq/mpegts.js), shipped unmodified next to the card and loaded only when something plays.

**Version 1.1.0.** Works on Android (HA app and Chrome), Fire tablets in Fully Kiosk and desktop browsers. iPhones need Media Source Extensions support; see [Troubleshooting](#7-troubleshooting).

## Contents
1. [Dispatcharr setup](#1-dispatcharr-setup-once)
2. [Install](#2-install)
3. [Add the card](#3-add-the-card)
4. [Using it](#4-using-it)
5. [Buttons and pop-ups](#5-buttons-and-pop-ups)
6. [All options](#6-all-options)
7. [Troubleshooting](#7-troubleshooting)
8. [Development](#8-development)

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

### Channel list
The card reads `<dispatcharr_url>/output/m3u`, the same playlist IPTV apps use. It needs no login, but Dispatcharr's **network access** settings for M3U/EPG must allow the devices that show the card. Channel numbers, names, groups and logos come from Dispatcharr, so set them there.

### Now and next
With `dispatcharr_url` set, the card also reads `<dispatcharr_url>/output/epg?days=1`, the next 24 hours of Dispatcharr's guide, to show what's on now and next. The guide is large (several MB on a big channel list), so the card downloads it once per dashboard page, keeps only titles and times, and refreshes it every 2 hours while a dashboard with the card is open (never in edit mode or while the page is hidden). Channels need guide data assigned in Dispatcharr. If the guide can't be loaded, or has nothing for a channel, the card simply shows no programme line. Set `epg: false` to never download it.

## 2. Install

The card is a folder of JavaScript files served from Home Assistant's `www` folder.

1. **Get the files:**
   - The **Assets** of the latest [release](https://github.com/Dec64/ha-video-card/releases).
   - Or the **stream-card-dist** artifact of the latest successful [CI run](https://github.com/Dec64/ha-video-card/actions).
   - Or build them: `cd card && npm ci && npm run build`, which puts them in `card/dist/`.
2. **Copy every `.js` file** into `/config/www/stream-card/`:
   - `stream-card.js`
   - the `stream-card-*.js` chunks
   - `mpegts-1.8.2.js` (identical to `https://cdn.jsdelivr.net/npm/mpegts.js@1.8.2/dist/mpegts.js`)

   They must sit together, because the card loads the others from its own folder.
3. **Add the resource:** Settings → Dashboards → ⋮ → Resources → **Add resource**, URL `/local/stream-card/stream-card.js?v=1.1.0`, type **JavaScript module**.
4. **Reload** the dashboard on each device. On Fully Kiosk, clear the cache first.

**Updating:** replace the files, then raise `?v=` on the resource (for example `?v=1.1.1`) so every device fetches the new version. Old chunk files can stay: their names change when their contents do.

**HACS:** the repository is laid out for HACS (custom repository, category *Dashboard*), using the release zip. This route is untested so far; the manual install above is the tested one.

## 3. Add the card

Edit a dashboard, **Add card**, pick **Stream Card**, and fill in:

| Setting | What to put |
|---|---|
| Dispatcharr URL | Your Dispatcharr address, e.g. `https://dispatcharr.example` |
| Output profile ID | The profile from section 1 (usually `3`) |
| Target name | A name for this screen, e.g. `living_room`. Buttons use it to reach the card |

That's a working TV: it lists every channel. The **Channels**, **Playback** and **Advanced** sections hold the rest (see [All options](#6-all-options)). The card never plays while you're editing.

The same in YAML:

```yaml
type: custom:stream-card
target: living_room
dispatcharr_url: https://dispatcharr.example
output_profile: 3
```

A bigger example: only some groups, favourites first, and a channel for the very first visit. Quote group names that contain `: ` (many Dispatcharr groups do), or YAML reads them as something else:

```yaml
type: custom:stream-card
target: living_room
dispatcharr_url: https://dispatcharr.example
output_profile: 3
channel_groups: ["UK: Entertainment", "UK: News"]
favourites: ["BBC One HD", "ITV1 HD", "101"]
channel: BBC One HD
```

**Layout tips:**
- In a sections view, give the card a full-width row (`grid_options: {columns: full}`) or its own wide section.
- A card with nothing playing shows the channel grid under the picture.
- For a TV that only appears when asked for, put the card in a Bubble Card pop-up (section 5).

## 4. Using it

**The guide.** Under the picture sits the channel guide (`guide: open`, the default). It opens on **Recent** (this device's last channels), then **★ Favourites** (your `favourites`, in the order you listed them), **All** and one chip per Dispatcharr group.
- **Search** matches names and numbers across every channel; Enter plays the first match, and Escape clears the search.
- **123** opens a number keypad: type a channel number and it tunes.
- Each tile shows the logo (or initials), number and name; with guide data, also what's on now and how far through it is. The playing channel is outlined.
- Picking a tile plays it and leaves the guide open. The guide button in the control bar collapses it. `guide: closed` starts it collapsed; `guide: off` never puts it under the picture, and the button opens it over the picture instead (as full screen and TVs always do).

**While playing**, the channel ident in the top left shows the logo, number, name and, with guide data, the programme and its progress. A big channel number flashes up on every change. Tap the picture to show or hide the ident and controls:

| Button | Does |
|---|---|
| ■ | Stop (frees the connection) |
| ↺ | Last channel, like a remote's Recall |
| ⌄ ⌃ | Previous / next channel, in channel-number order, wrapping round |
| 🔈 and slider | Mute / unmute, and volume |
| ☾ | Sleep timer: stop after 15, 30, 60 or 90 minutes |
| ☰ | Show or hide the guide |
| ⛶ | Full screen (the ident and controls come along) |
| ▦ | Multiview (only with `multiview` turned on) |

**States.** While tuning, the new channel's logo and name show before any video arrives. If the picture drops, the card says it's reconnecting, which try it's on and when the next one starts. If the browser blocks sound, playback starts muted with a **Tap for sound** button. If something fails, the card says what's wrong and offers **Back to** the previous channel first, then **Retry** and **Channels**. A minute before the sleep timer ends, **Keep watching** and **+30 min** appear. In the dashboard editor the card shows its target, output profile and number of favourites instead of playing.

**On each screen.** The layout follows the card's width and the device, with no settings:
- **Phones and Bubble pop-ups** (under 520 px wide): the ident and big round controls sit below the picture, in reach of a thumb, and the guide lists one channel per row.
- **Wall panels** (touch screens 900 px and wider, such as a Fire HD 8 in Fully Kiosk): 56 px buttons and bigger guide tiles for arm's-length taps.
- **Narrower cards** (under 680 px) drop the volume slider (the mute button stays) and use 44 px buttons, so every control fits on the bar. If a bar still doesn't fit (for example full screen on a phone held upright), it wraps onto a second row instead of pushing buttons off the edge.
- **Desktop**: everything floats over the picture, with "Next" in the control bar.
- **TV** (HA Cast to a Chromecast or Google TV): a 10-foot layout inside the TV-safe area with no tap controls; the clock shows, and remote-key hints appear once a key is pressed.

**Theme.** The card uses your Home Assistant theme (card background, text colours, primary colour, corner radius), light or dark. The picture area is always dark.

**Channel navigation.** These work from the keyboard (or a remote that sends keys) while focus is in the card, from the control bar and guide (Last channel, volume, sleep timer, number keypad) and from buttons (below).

| Key | Does |
|---|---|
| `0`–`9` | Type a channel number. It tunes after a 2-second pause, on Enter, or at once when no longer number can follow (typing `105` when there's no `1050`). A number that doesn't exist does nothing |
| Enter | Tune the number you typed; with nothing typed, open or close the channel guide (OK on a remote) |
| Escape | Cancel the number you're typing |
| Backspace | Delete a typed digit; with nothing typed, **last channel** (flip back to the previous channel) |
| ↑ ↓, Page Up/Down | Next / previous channel |
| M | Mute / unmute |
| F | Full screen |

Keys typed in the channel search box stay in the search box.

- **Recently watched.** Each device keeps the last 8 channels per target, newest first. **Last channel** goes to the newest one that isn't playing now, so pressing it twice flips between two channels.
- **Volume** is remembered per device and shared by every card on it. Raising it above 0 also unmutes. iPhones and iPads ignore page volume (use the side buttons there).
- **Sleep timer.** Stops a target after a number of minutes, through the same release path as Stop: the connection closes and the device remembers it was left stopped. It is shared by every card on the target, keeps running while a pop-up is closed, and survives a page reload. In its last minute the card shows **Keep watching** and **+30 min**. Stop cancels it.

**Multiview.** For watching several matches at once. Turn it on per card with `multiview: true` (it's off by default because **every tile is its own Dispatcharr connection**, counting against your provider's limits). Then:
- The multiview button turns the picture into a grid. The channel you were watching becomes the first tile and keeps the sound; the header shows how many Dispatcharr connections are open.
- **Add a channel** on an empty tile opens the channel grid for that tile.
- The speaker on a tile moves the sound there; on the tile that already has it, it mutes and unmutes. Only one tile ever plays sound.
- Tap a tile for **Channel** (change it), **Full size** (leave multiview with this channel) and **Remove** (closes its connection).
- 2 tiles side by side by default. `multiview: { enabled: true, max_tiles: 4 }` adds a **2 × 2** layout; switching back to 2 × 1 closes the extra tiles and keeps the one with sound.
- **Exit** goes back to one picture, playing the tile that had the sound.
- A button for this card's target, Stop, a stop button and the idle timeout all leave multiview and close every tile. Everything under "When it lets go" below releases every tile at once.
- Fire HD 8 tablets: keep `max_tiles` at 2. Each tile is a separate video decode, and these tablets run out of hardware decoders quickly. If a tile stutters, the card says the device can't keep up; a lower-resolution Dispatcharr output profile for tiles (`multiview.output_profile`, e.g. one that scales to 540p) helps, at the cost of Dispatcharr transcoding each tile.

**What it remembers.** Each device remembers the last channel on each target and whether it was left playing.
- Next time, it starts on that channel: playing if you left it playing, or stopped with a play button if you stopped it (Stop, a stop button or the idle timeout).
- `remember_channel: false` always starts on the configured `channel` instead.
- `autoplay: false` never starts by itself.

**When it lets go.** The connection is released, within about a second, when:
- the card leaves the page (pop-up closed, other view, other dashboard);
- the page or app goes to the background, or the screen turns off;
- Fully Kiosk's screen turns off or its screensaver starts;
- the card is scrolled out of view;
- `idle_timeout` passes with no touch, or the dashboard enters edit mode;
- the sleep timer runs out;
- Stop is pressed.

## 5. Buttons and pop-ups

### Play from any button
Any card with a `tap_action` (tile, button, Mushroom, a heading badge) can play a channel on a target:

```yaml
tap_action:
  action: fire-dom-event
  stream_card:
    target: living_room
    channel: BBC One HD          # name, number ("101") or Dispatcharr channel UUID
    open: "#tv"                  # optional: open this Bubble pop-up (or a dashboard path)
```

A stop button:

```yaml
tap_action:
  action: fire-dom-event
  stream_card:
    target: living_room
    action: stop
```

Remote-style buttons use other actions:

```yaml
stream_card: { target: living_room, action: channel_up }     # or channel_down
stream_card: { target: living_room, action: last_channel }
stream_card: { target: bedroom, action: sleep, sleep: 30 }   # minutes; sleep: 0 cancels
stream_card: { target: living_room, action: volume, volume: 40 }   # 0–100
stream_card: { target: living_room, action: mute }           # or unmute
```

`stream_card` fields: `target`, `channel` or `url` (a full stream URL), `title` (defaults to the channel's name), `open`, `action` (`play` (default), `stop`, `channel_up`, `channel_down`, `last_channel`, `sleep`, `volume`, `mute`, `unmute`), `sleep` (minutes, with `action: sleep`), `volume` (0–100, with `action: volume`).

With no card for the target on the page: a sleep timer still starts, a volume is saved for next time, last channel plays this device's previous channel, and channel up/down waits (like a play request) for the card to appear. Mute and unmute need a card that's showing. An unmute from a button can't override a browser that only allowed muted playback; the card keeps its **Tap to unmute** button.

Names and numbers are looked up in the receiving card's channel list. Case doesn't matter, and an unknown name shows "No channel called …" instead of guessing.

A request reaches every card with that target on the page. If none is showing yet (a closed pop-up), the request waits up to 30 s for one to appear. A stop applies even to a pop-up that's closed when it's pressed.

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
    target: living_room
    channel: BBC One HD
    open: "#tv"
button_action:
  tap_action: *bbc1
```

(The `&bbc1` / `*bbc1` YAML anchor saves repeating the block; Home Assistant expands it when the dashboard is saved.)

### In a Bubble Card pop-up
Put the stream card inside the pop-up, and give buttons `open:` with the pop-up's hash.
- Bubble Card removes closed pop-ups from the page. The card picks up the button's request when the pop-up opens, plays, and releases the stream when it closes.
- Reopening the pop-up resumes the channel at the live edge.

In a **sections** view, give the pop-up card **its own section**: Home Assistant 2026.10 doesn't render view-level `cards:` there, so a pop-up placed in them never opens. A closed pop-up takes no space.

```yaml
type: custom:bubble-card
card_type: pop-up
hash: "#tv"
name: TV
cards:
  - type: custom:stream-card
    target: living_room
    dispatcharr_url: https://dispatcharr.example
    output_profile: 3
```

### Fully Kiosk (Fire tablets)
- Web Content Settings → **Autoplay Videos**: on. Otherwise playback starts muted.
- Advanced Web Settings → **Enable JavaScript Interface**: on. The card then stops when the screen turns off or the screensaver starts, and resumes after.
- Advanced Web Settings → hardware acceleration: on.
- If playback pauses every few seconds, set the tablet's card to **Buffering: Stable** (`buffer: stable`). The picture starts after about 8 s of buffering and runs a few seconds behind live, but rides through the tablet's hiccups. If it still stutters with the debug overlay showing dropped frames climbing, the tablet can't decode the channel's video fast enough; a Dispatcharr output profile that converts to 720p for that tablet is the fix.

## 6. All options

| Option | Default | Meaning |
|---|---|---|
| `target` | `default` | This screen's name. Buttons with the same `target` play here |
| `dispatcharr_url` | — | Dispatcharr's address. Needed to play Dispatcharr channels |
| `output_profile` | none | Output profile ID, sent as `?output_profile=<id>` |
| `channel` | none | Channel for the first visit (name, number or UUID). After that, the remembered channel wins |
| `url` | none | A full stream URL instead of a channel (MPEG-TS, or MP4/HLS on browsers that play them natively) |
| `title` | channel name | Title shown in the channel ident |
| `channel_list` | on with `dispatcharr_url` | Load the channel list: guide, up/down, names in buttons |
| `guide` | `open` | The channel guide: `open` under the picture, `closed` until the guide button is pressed, or `off` (only ever over the picture) |
| `channel_groups` | all | Only these Dispatcharr groups, in this order |
| `favourites` | none | Names, numbers or UUIDs shown first under ★ Favourites |
| `remember_channel` | `true` | Start on this device's last channel for the target, playing or stopped as it was left |
| `epg` | on with `dispatcharr_url` | Show what's on now and next from Dispatcharr's guide (see [Now and next](#now-and-next)). Needs the channel list |
| `epg_url` | `<dispatcharr_url>/output/epg?days=1` | A different XMLTV guide. Its channel IDs must match the playlist's `tvg-id` (Dispatcharr's default: the channel number) |
| `m3u_url` | `<dispatcharr_url>/output/m3u` | A different playlist for the list. Playing Dispatcharr channels from it still needs `dispatcharr_url` |
| `autoplay` | `true` | Start playing when the card appears, unless this device left it stopped |
| `muted` | `false` | Start muted |
| `buffer` | `low` | `low` stays close to live. `stable` keeps about 8 s in reserve, never skips ahead and refills instead of stuttering: smoother on slow devices such as Fire tablets, a few seconds behind live |
| `aspect_ratio` | `16:9` | Picture shape |
| `idle_timeout` | `0` | Minutes with no touch or key press before stopping (remembered like a Stop). `0` = never |
| `start_timeout` | `20` | Seconds to wait for the first data before showing an error |
| `reconnect.max_attempts` | `5` | Reconnects after stalls or drops before giving up (backoff 1, 2, 4, 8, 15 s) |
| `url_template` | `{base}/proxy/ts/stream/{channel}` | How channel URLs are built |
| `debug` | `false` | Overlay with engine, codecs, buffer, frames, channel list state and the last error |
| `multiview` | off | `true`, or `{ enabled: true, max_tiles: 2, output_profile: <id> }`: the multiview button (needs the channel list). Each tile is its own Dispatcharr connection |
| `multiview.max_tiles` | `2` | Most tiles at once, 2 to 4. More than 2 adds the 2 × 2 layout |
| `multiview.output_profile` | the card's `output_profile` | Output profile for tiles, e.g. a lower resolution for tablets |

Theme variables:
- `--stream-card-picker-max-height`: height of the channel grid under the picture. Default `min(60vh, 460px)`.
- `--stream-card-accent`: colour for the selected tab, playing channel and phone Stop button. Default the theme's `--primary-color`.
- `--stream-card-font`, `--stream-card-mono-font`: text and number fonts. Default the theme's font and the system monospace font.
- `--stream-card-logo-background`: plate behind channel logos. Default dark, because most IPTV logos are white.

## 7. Troubleshooting

Turn on `debug: true` to see codecs, buffer, dropped frames, the channel list state and the last error on the card.

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
| None of the channel_groups match a Dispatcharr group. Groups in Dispatcharr: {groups}. | A typo in `channel_groups`: copy the names exactly as listed (case doesn't matter; dashes and colons do), and quote names that contain `: `. |
| Dispatcharr refused the stream ({status}). Check Dispatcharr's network access settings for streams. | Dispatcharr's network access rules block this device's IP. |
| Dispatcharr returned an error ({status}). | Dispatcharr is having trouble (often 503 when the provider's connection limit is reached). The card retries 5xx errors on its own. |
| Dispatcharr blocked this page's request (CORS). Check that nothing in front of Dispatcharr removes its Access-Control-Allow-Origin header. | Run the `curl` check in section 1. |
| Can't reach Dispatcharr. Check dispatcharr_url and that this device can reach it. | Open the stream URL in this device's browser. On HTTPS dashboards, Dispatcharr must be HTTPS too. |
| This browser can't play live MPEG-TS streams (no Media Source Extensions). | Old iOS, or a WebView without Media Source Extensions. An HLS fallback for these is planned (v1.1). |
| The stream kept dropping. Stopped after {attempts} attempts. | The stream stalled or disconnected repeatedly. Check Dispatcharr's logs for this channel; press Retry. |
| The player hit an error it could not recover from. | Turn on `debug` and note the last error. |
| This device can't keep up with this many tiles. Use fewer tiles, or a lower-resolution output profile for multiview. | Multiview: more than a quarter of frames were dropped across the tiles. Remove a tile, lower `multiview.max_tiles`, or set `multiview.output_profile` to a Dispatcharr profile that scales video down. |

Other symptoms:
- **Playback pauses every few seconds on one device** (typically a Fire tablet). Use `buffer: stable` on that device's card (see section 5, Fully Kiosk).
- **A device keeps playing an old version** after an update. Raise `?v=` on the resource, then reload. In the HA app, use the Companion app's **Reset frontend cache** setting. On Fully, clear the cache.
- **White logos are hard to read** on a light theme. They sit on a dark plate by default; set `--stream-card-logo-background` in your theme to change it.
- **iPhone shows "This browser can't play live MPEG-TS streams".** That iOS version or app lacks Media Source Extensions. An HLS fallback is planned.

## 8. Development

The source is in [`card/`](card): TypeScript, Lit and Vite.
- **Design and contracts:** [docs/architecture.md](docs/architecture.md).
- **Commands and rules for contributors and coding agents:** [CLAUDE.md](CLAUDE.md).
- **Status and decisions:** [HANDOVER.md](HANDOVER.md).
- **Other docs:** [docs/](docs/README.md).

```
card/
├── src/                     card, controller, lifecycle, session, engines, channel list, picker
├── test/unit/               Vitest
├── test/e2e/                Playwright against a fake Dispatcharr (ffmpeg) + MSE shim
├── test/fake-dispatcharr/   the fake server (streams and /output/m3u)
├── test/ha/                 real Home Assistant + Bubble Card tests (npm run e2e:ha)
└── test/live/               optional tests against a real Dispatcharr channel
docs/                        architecture, device checklist, project history
phase0-test-kit/             early diagnostic tools (kept for reference)
```

`cd card && npm ci && npm run check` runs lint, types, unit tests, the build, the size budget and the README message check.
