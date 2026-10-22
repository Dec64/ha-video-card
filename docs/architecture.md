# Stream Card architecture (1.0)

How the card works today and the contracts other code relies on. For using the card, see the [README](../README.md). For why it is built this way, see [rfc-001-review.md](rfc-001-review.md) and [build-plan-v1.md](build-plan-v1.md) (history).

## The one rule

**Nobody watching means no Dispatcharr connection.** Every design choice below serves it: a card holds at most one stream, releases it synchronously on every "not visible" signal, and never opens one in the dashboard editor. Every release path has an e2e test that counts open connections on a fake Dispatcharr server, not client state.

## Pieces

```
 HA button (fire-dom-event)                 Dispatcharr
          │ ll-custom                     /output/m3u   /proxy/ts/stream/<uuid>?output_profile=N
          ▼                                   │                 │
 ┌──────────────────────┐     loads    ┌──────┴───────┐         │
 │ Page controller      │              │ Channel list │         │
 │ window.__streamCard  │              │ (per page)   │         │
 │ mailbox per target,  │              └──────┬───────┘         │
 │ last channel, stops, │                     │ names/numbers   │
 │ Fully screen events  │                     ▼ → UUID          │
 └─────────┬────────────┘     ┌──────────────────────────────┐  │
           │ deliver / stop   │ <stream-card>  (Lit)          │  │
           └────────────────► │  evaluate(): the only place   │  │
                              │  that starts or stops         │  │
     Lifecycle watcher ─────► │  picker · controls · memory   │  │
     (visibility, IO,         └──────────────┬────────────────┘  │
      pagehide, Fully, idle)                 │ one at a time     │
                                             ▼                   │
                              ┌──────────────────────────────┐   │
                              │ PlaybackSession              │   │
                              │ start timeout, stall watch,  │   │
                              │ reconnect + backoff, errors  │   │
                              └──────────────┬───────────────┘   │
                                             ▼                   │
                              Engine: mpegts.js (lazy) or native ┘
                              on the card's single <video>
```

| File (`card/src/`) | Role |
|---|---|
| `index.ts` | Entry. Installs the controller and defines `stream-card` and `stream-card-picker`. |
| `controller.ts` | One per page. Turns `fire-dom-event` buttons into requests per target, keeps them until a card for that target is on the page (Bubble removes closed pop-ups), opens pop-ups, relays Fully Kiosk screen events. |
| `stream-card.ts` | The card. Picks what to play, decides whether to play (`evaluate()`), renders controls and the picker. Creates its `<video>` once and never puts it in a Lit template, so constant `hass` updates can't touch playback. |
| `lifecycle.ts` | `holdReason()`, a pure function of the conditions below, and the watcher that tracks them. |
| `session.ts` | One source on one `<video>`: start timeout, stall watchdog, reconnect with backoff, error classification. Tears down its engine before every retry. |
| `engines/` | `mpegts-engine.ts` (lazy chunk; loads the vendored `mpegts-<version>.js`), `native-engine.ts` (MP4/HLS where the browser plays them), `fetch-loader.ts` (`ImmediateAbortLoader`), `video-lock.ts`. |
| `channels.ts` | M3U parsing, `ChannelList`, page-wide playlist cache. |
| `picker.ts` | The channel browser element. It only fires events; the card plays. |
| `memory.ts` | Last channel and play intent per target, per device (localStorage). |
| `recents.ts`, `number-entry.ts`, `volume.ts`, `sleep-timer.ts` | Channel navigation logic: recently watched per target and device, remote-style number entry, remembered volume, sleep timers (owned by the controller). No markup. |
| `editor-form.ts` | Schema for HA's visual editor (`getConfigForm`), a lazy chunk. |
| `errors.ts` | Every user-facing message. The README troubleshooting table must list each one (checked by `scripts/check-messages.mjs`). |

## When the card plays

`holdReason()` returns why the card must not hold a stream, most specific first, or `null` to play:

| Reason | Comes from |
|---|---|
| `disconnected` | Element removed (closed Bubble pop-up, view switch, dashboard navigation) |
| `preview` | HA's card editor or dashboard edit mode (`preview` / `editMode`, or inside the editor dialog) |
| `no-source` | Nothing chosen yet |
| `stopped` | Stop button, a stop button action, idle timeout, sleep timer, or an error |
| `page-hidden` | `visibilitychange` hidden or `pagehide` (app backgrounded, tab hidden, screen locked) |
| `screen-off` | Fully Kiosk `screenOff` or screensaver |
| `hidden` | IntersectionObserver: the card isn't on screen (`display: none`, scrolled out of a hidden container) |

Any change re-runs `evaluate()`. A hold destroys the session at once: the engine aborts its fetch synchronously (`ImmediateAbortLoader`; mpegts.js's own loader leaves a stalled fetch open on Chrome) and defers the rest of mpegts.js's teardown one tick. The next engine waits on `videoIdle()` before touching the same `<video>`. Coming back plays from the live edge.

## Choosing what to play

On connect, the card takes the first of:
1. A button request for its target still in the controller's mailbox (30 s).
2. The controller's `lastFor(target)`: the target's latest channel in this page session.
3. This device's remembered channel for the target (`remember_channel`), playing only if it was left playing.
4. The configured `channel` / `url`.

Channel picks, up/down, the Stop button and the idle timeout go through the controller (`request` / `stop`) exactly like HA buttons. So every card on a target, a recreated card, and the device memory all agree on the latest choice. A stop also bumps `stopCount(target)`, so a pop-up card that was off the page when a stop button was pressed notices it when it comes back.

## Channel list

`loadChannels(m3uUrl)` downloads Dispatcharr's `/output/m3u` (no login; CORS `*`) once per page, shares it between cards for 10 minutes, and gives up after 15 s. `ChannelList` applies `channel_groups`, orders by channel number, builds favourites, and finds a channel by UUID, number or name (case-insensitive, across all groups). Logos are Dispatcharr's cached logo URLs from the playlist.

Names and numbers become the stream UUID before a URL is built, so playback and release don't care how a channel was chosen. With the list loaded, an unknown name is an error (`channelNotFound`), never guessed as a stream ID. In edit mode the list isn't downloaded, and a name waits until edit mode ends. The EPG isn't used (8.7 MB on a real server).

## Contracts

These are what buttons, dashboards and the code rely on. Change them only in their own PR, with this section updated.

### Card config
```yaml
type: custom:stream-card
target: kitchen_tv                  # mailbox key; buttons with this target play here (default "default")
dispatcharr_url: https://dispatcharr.example
output_profile: 3                   # sent as ?output_profile=3; omit for none
url_template: "{base}/proxy/ts/stream/{channel}"   # default
channel: BBC One HD                 # optional default: UUID, or a name/number from the channel list
url: https://…                      # optional: a full stream URL instead of a channel
title: Optional title               # default: the channel's name
channel_list: true                  # default true when dispatcharr_url or m3u_url is set
m3u_url: <url>                      # default {base}/output/m3u
channel_groups: ["UK: News"]        # optional: only these groups, in this order
favourites: [BBC One HD, "101"]     # optional: names, numbers or UUIDs under ★ Favourites
remember_channel: true              # start on this device's last channel for the target
autoplay: true                      # play the chosen channel when shown, unless left stopped
muted: false                        # start muted; falls back to muted + "tap to unmute" if blocked
aspect_ratio: "16:9"
idle_timeout: 0                     # minutes, 0 = off; counts as a stop
start_timeout: 20                   # seconds to wait for first data
reconnect: { max_attempts: 5 }      # backoff 1, 2, 4, 8, 15 s
debug: false
```

### Button action
```yaml
tap_action:
  action: fire-dom-event
  stream_card:
    target: kitchen_tv
    channel: BBC One HD      # UUID, name or number (looked up in the receiving card's list),
                             # or url: <full url> to bypass the template
    title: Optional title
    open: "#kitchen-tv"      # optional: Bubble pop-up hash or dashboard path
  # stream_card: { target: kitchen_tv, action: stop }   ← stop button
```
Other actions, which steer the target instead of choosing a channel: `channel_up`, `channel_down`, `last_channel`, `sleep` (with `sleep: <minutes>`, 0 cancels), `volume` (with `volume: 0–100`), `mute`, `unmute`. They never change the target's last channel. With no live card for the target: `sleep` still starts, `volume` is saved to device memory, `last_channel` plays the device's previous recent, `channel_up`/`channel_down` wait in the mailbox (30 s), and `mute`/`unmute` are dropped.

### Engine
`card/src/engines/types.ts`. Engines report data, media info and errors; the session watches the `<video>` itself for playing and stalls, so both engines share one watchdog.
```ts
interface Engine {
  readonly kind: 'mpegts' | 'native';
  load(video: HTMLVideoElement, src: StreamSource): Promise<void>;
  destroy(): Promise<void>;            // idempotent; aborts the fetch synchronously
  on(listener: (e: EngineEvent) => void): () => void;
  getStats(video: HTMLVideoElement): EngineStats;   // buffer s, frames, dropped, KB/s
}
type EngineEvent =
  | { type: 'data' }                                // first bytes arrived (ends the start timeout)
  | ({ type: 'media-info' } & MediaInfo)            // videoCodec, audioCodec, width, height, fps
  | { type: 'error'; error: EngineError };
interface EngineError {
  kind: 'network' | 'cors' | 'http' | 'timeout' | 'codec' | 'unsupported-device'
      | 'media' | 'stall' | 'ended' | 'config';
  detail: string; status?: number; track?: 'audio' | 'video'; codec?: string;
}
```

### Controller (one per page, on `window.__streamCard`)
`request(req)`, `take(target)`, `lastFor(target)`, `stop(target)`, `stopCount(target)`, `setSleep(target, minutes)`, `extendSleep(target, minutes)`, `sleepFor(target)`, `register(card)`, `unregister(card)`, `onFullyEvent(name)`. Pending requests expire after 30 s. Requests without a target go to `default`. `stop` clears the target's pending and last request, cancels its sleep timer, marks the device memory stopped, and bumps `stopCount`.

A registered card implements `ControllerCard`: `target`, `isLive`, `deliver(req)`, `stopFromController()`, `command(req)` (the navigation actions above) and `sleepChanged()`.

`request()` is the one entry point for every way of steering a target: HA buttons, the card's own controls, and later the companion integration (below).

**Sleep timer.** One per target, owned by the controller, so every card on the target shares it and a closed pop-up still stops on time. It wakes once when its last minute starts (`sleepFor(target).warning`, cards repaint each second from then) and once at the deadline, where it calls `stop(target)`: the same release path as a stop button.

### Device memory
- `localStorage['stream-card:last:<target>']` = `{ channel?, url?, title?, playing }`. `channel` is always the resolved stream ID.
- `localStorage['stream-card:recent:<target>']` = up to 8 `{ channel?, url?, title? }`, newest first, no duplicates. Last channel is the newest entry that isn't playing now.
- `localStorage['stream-card:volume']` = `0`–`1`, for every card on the device.
- `localStorage['stream-card:sleep:<target>']` = the sleep deadline (epoch ms). One that passed while the page was closed stops the target when the controller next looks at it.

### Card navigation API
For the templates (`navView()` returns the data, `navActions()` the callbacks; an action left out hides its control): `recents`, `previousChannel`, `numberEntry` (`{ digits, candidates }`), `volume` (0–1), `sleep` (`{ endsAt, remainingMs, warning }`); `lastChannel()`, `pressDigit(d)`, `clearDigits()`, `commitDigits()`, `setVolume(v)`, `setSleep(minutes)`, `extendSleep(minutes)`, plus `channelUp()`, `channelDown()` and `keepWatching()`. Keys (digits, Enter (commits digits, else toggles the guide unless a button has focus), Escape, Backspace, arrows, Page Up/Down, M, F) are handled on the card host and ignored inside the picker and text fields. Number entry tunes after 2 s, on Enter, at 5 digits, or as soon as the channel list has an exact number with no longer one starting with it.

### Companion integration mapping (planned, Phase 3)
The per-screen `media_player` will call the screen's controller with `request()`, so it needs no new card code paths:

| media_player | Card request |
|---|---|
| `play_media` (`media_content_id`: channel name, number or UUID) | `{ action: play, channel }` |
| `media_stop` / `turn_off` | `{ action: stop }` |
| `media_next_track` / `media_previous_track` | `channel_up` / `channel_down` |
| `select_source` (source list = favourites + recents) | `{ action: play, channel }` |
| `volume_set` (0–1) / `volume_mute` | `{ action: volume, volume: v × 100 }` / `mute` or `unmute` |
| service `stream_card.sleep_timer` (`minutes`) | `{ action: sleep, sleep }` |
| service `stream_card.last_channel` | `last_channel` |

State reported back (title, channel number, volume, muted, sleep deadline) comes from the same card getters.

## Errors

Engines report `EngineError`s; the session decides retry or stop: network drops, stalls, the stream ending, media errors and HTTP 5xx/408/429 retry with backoff (up to `reconnect.max_attempts`); other HTTP errors (404, 403), CORS, codecs, unsupported devices and the start timeout stop with a message. Codecs are checked from mpegts.js's media info and from Chrome's `addSourceBuffer` error (which comes first). MPEG-2 video is skipped silently by mpegts.js, so a playing stream with no picture after 3 s shows a notice. The messages live in `errors.ts`; the README explains each.

## Build and packaging

Vite library build in `card/dist/`: `stream-card.js` (entry, budget 32 KB gzipped, enforced by `npm run check`), hashed lazy chunks for the mpegts engine, the video lock and the editor form, and `mpegts-<version>.js` copied unmodified from npm with its licence. Every file sits in one folder; chunks load relative to the entry, so `/local/…` and `/hacsfiles/…` both work. A `v*` tag runs `.github/workflows/release.yml`, which checks the tag matches `package.json` and attaches a zip (for HACS) and the loose files.

## Testing

| Layer | Where | What it proves |
|---|---|---|
| Unit (Vitest) | `card/test/unit` | Config, URL building, M3U parsing, `ChannelList`, controller, lifecycle, session logic |
| E2E (Playwright) | `card/test/e2e` | Real fetch, demux and teardown against a fake Dispatcharr (ffmpeg, per-test channel behaviour, fake `/output/m3u`), with an MSE shim because headless Chromium can't decode H.264/AAC. Every release path asserts the server's open-connection count. |
| Real decode | same tests tagged `@real`, Google Chrome in CI | Real H.264/AAC playback |
| Real HA | `card/test/ha` | Pinned Home Assistant + Bubble Card: buttons, pop-ups, view switching, edit mode, visual editor, picker |
| Live | `card/test/live` | A real Dispatcharr channel, from env vars only; never in CI |
