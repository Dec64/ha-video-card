# RFC-001 review: is this the right architecture for ha-stream-card?

**Date:** 2026-10-06 · **Scope:** architecture only. The roadmap, repo layout and stated outputs were ignored as asked.

## Verdict

The core idea holds up: a client-side Lit card that acts as a "video sink", with pluggable engines and aggressive teardown, is the correct shape. **The parts that hold it together don't.** Three of the RFC's central mechanisms are wrong or fragile for the exact setup it targets:

1. **The Bubble Card pop-up flow won't work as written.** Bubble Card v3.2.4 changed pop-ups so that "pop-up hosts are now fully removed from the DOM when closed" ([release notes](https://newreleases.io/project/github/Clooos/Bubble-Card/release/v3.2.4)). A card inside a closed pop-up doesn't exist, so the "dispatch event, then open pop-up" sequence in §4.3 fires an event at nothing. It also means IntersectionObserver is the wrong teardown signal. The signal that matters is `disconnectedCallback`.
2. **The engine choice probably doesn't match Dispatcharr's output.** As far as I know, Dispatcharr's standard channel URLs are continuous **MPEG-TS over HTTP** (`/proxy/ts/stream/<uuid>`), not `.m3u8` playlists. hls.js can't play a raw TS stream. That needs **mpegts.js** (or a server-side remux). The RFC's example URL (`/channels/sky-sports-me.m3u8`) doesn't look like a Dispatcharr URL. *This is inferred from my knowledge of Dispatcharr and needs one real URL from your M3U to confirm.*
3. **Browser codec support is the real stability risk, and a "zero-backend" card can't fix it.** Broadcast IPTV often carries AC-3/E-AC-3 or MP2 audio and interlaced video. Chromium MSE on Android/Fire usually can't decode AC-3, so you get silence or a hard error. The fix is a Dispatcharr **ffmpeg stream profile** that remuxes or transcodes audio to AAC. The RFC's non-goal of "no server-side involvement" should become "no server component *of ours*, but we rely on a Dispatcharr profile".

Everything else is tuning. The details follow.

---

## 1. Triggering playback (§4)

### What the RFC proposes
`browser_mod.sequence` → `browser_mod.javascript` (an eval'd string that dispatches a window event) → `browser_mod.navigate` to the pop-up hash.

### Problems
- **Race and lost events.** Covered above: the card isn't in the DOM until the pop-up opens. Even with older Bubble versions, the order "dispatch, then navigate" assumes the card is already mounted and listening.
- **Unnecessary dependency.** browser_mod is powerful but heavy. Its `javascript` service is string-eval in YAML, so it's brittle to quote and painful to debug. Some users also avoid it on kiosk accounts.
- **Simpler built-in path exists.** HA's own `tap_action: action: fire-dom-event` dispatches an `ll-custom` DOM event carrying the whole action config. Any custom card (or a page-level module the card registers) can listen for it. browser_mod itself is built on this mechanism.

### Recommendation: a page-level controller plus a mailbox
- The bundle registers one **singleton controller** on `window` when it loads (Lovelace resources load before any card renders).
- Buttons use plain HA config:
  ```yaml
  tap_action:
    action: fire-dom-event
    stream_card:
      target: sports_popup_player
      url: http://dispatcharr.lan/proxy/ts/stream/<uuid>
      title: Arsenal vs Man City
      open: "#sports-modal"      # optional: controller opens the Bubble pop-up itself
  ```
- The controller stores the request as **pending** keyed by `target`, then navigates to the pop-up hash (`history.pushState` + `location-changed`, the same way HA navigates).
- When the card connects (pop-up opened), it **pulls** its pending request. Order no longer matters, and one tap does everything with no browser_mod.
- The controller also enforces **one active stream per device** (configurable). That's a direct tuner-protection win: two card instances can never both pull.

### "No card_id → all instances respond" (§4.1)
Make this the opposite. With no target, only the single most recently visible instance plays. Broadcasting to every instance is how you accidentally open two upstream connections.

### Entity-driven mode (§4.2)
Fine as an optional "remote control" path, but:
- `input_text` writes to the recorder, which contradicts the "no transient state in HA" goal. Exclude it from the recorder, or use a channel *ID* rather than a URL.
- It's global, not per device. For "play on the kitchen tablet" you need per-device targeting (a helper per tablet, or browser_mod's browser ID if you already use it).
- Don't swap it for custom HA events: non-admin users (typical for kiosk logins) can only subscribe to an allowlist of event types over the websocket, so `subscribeEvents('my_custom_event')` fails for them. Entity state works for every user.

---

## 2. Teardown and tuner safety (§5.2, §9)

### Does IntersectionObserver fire on pop-up close?
- With Bubble ≥ 3.2.4, the host is **removed**. Relying on IO for removal is fragile; `disconnectedCallback` is the guaranteed signal.
- With CSS-hidden pop-ups (older Bubble, other pop-up cards), IO fires for `display:none` and off-screen transforms, but **not** for `opacity:0` or `visibility:hidden`.
- IO **never** fires for screen-off, Fully Kiosk screensaver, app backgrounded, or HA view switches that keep the element mounted.

### Does pause + stopLoad release the Dispatcharr connection?
- **`pause()` alone releases nothing.** hls.js keeps loading to fill its buffer and keeps refreshing live playlists.
- **For HLS**, `stopLoad()` aborts in-flight requests, but HLS has no persistent connection. Dispatcharr can only notice you've gone by a **timeout** (no segment requests for N seconds), so "instant" release isn't really in the client's control.
- **For MPEG-TS** (the likely Dispatcharr case), release happens when the HTTP connection closes. That means mpegts.js `unload()`/`destroy()` (abort the fetch), which is actually *more* deterministic than HLS.
- **For native playback** (Safari/iOS, or any `<video src>`), you must `removeAttribute('src')` and call `video.load()`, or the browser keeps the socket.
- Dispatcharr appears to share one upstream across clients watching the same channel ([Channels community thread](https://community.getchannels.com/t/channels-reusing-stream-for-multiple-viewers/46603)), so two tablets on the same channel shouldn't cost two provider slots. Worth confirming on your instance.

### Recommendation
- **Destroy, don't pause.** On hide, fully `destroy()` the engine and drop the `<video>` src. On show, rebuild from the stored source. For live TV you *want* to rejoin at the live edge anyway, so a "resume" from a stale buffer is a bug, not a feature.
- **Release on any of:** `disconnectedCallback`, IO not-intersecting (kept as a secondary signal), `document.visibilitychange → hidden`, `pagehide`, Fully Kiosk JS events (`fully.bind('screenOff', …)`, screensaver start), pop-up hash change away, and an **idle watchdog** (for example, stop after N minutes with no interaction, configurable, off by default).
- Make `destroy()` **idempotent**, and guard against Lit re-renders. HA pushes a new `hass` object on every state change in the house, so the `<video>` element must live outside Lit's template diffing (create it imperatively once).
- **Edit mode:** the Lovelace editor preview creates extra card instances. These must never autoplay, or editing the dashboard opens connections.
- Verify with Dispatcharr's own stats page: "connection count drops to 0 within X seconds of closing the pop-up" should be an acceptance test.

---

## 3. Engines (§3)

| Source | RFC | Recommended |
|---|---|---|
| Dispatcharr TS (`/proxy/ts/...`) | not covered | **mpegts.js** (MSE, ~50 KB gz) |
| HLS `.m3u8` | hls.js | hls.js (light build), lazy-loaded |
| Native-HLS browsers (iOS/Safari) | hls.js "Native Safari" | `<video src>` directly; mpegts.js won't run on iOS Safari < 17.1 (no MSE) |
| YouTube | IFrame API | IFrame API, lazy-loaded (see §5) |
| MP4 | in type union | `<video src>` |

- **Source resolution by regex won't work for Dispatcharr URLs**, which have no extension. Use an explicit `type`, with `auto` falling back to the response `Content-Type` (`video/mp2t` vs `application/vnd.apple.mpegurl`).
- **Engine contract additions:** async `destroy()`; an event/state channel (`playing`, `stalled`, `error`, `ended`) so the UI and the watchdog can react; `getStats()` for a debug overlay (buffer length, dropped frames). That overlay is invaluable on a Fire tablet with no devtools.

---

## 4. Fire tablet / Fully Kiosk stability (§5.1)

### Buffer config critique
- **`lowLatencyMode: true` is meaningless for IPTV.** It applies to LL-HLS (`EXT-X-PART` partial segments), which IPTV providers don't serve. Leave it off.
- **The buffers are too small.** IPTV HLS segments are commonly 6–10 s. `maxBufferLength: 8` means roughly one segment ahead, which causes stalls on every hiccup. hls.js's default live sync point is 3 segments behind the edge for a reason.
- **`maxBufferSize: 12 MB`** at a 6–8 Mbps sports bitrate is only 12–16 s. Fine as a ceiling, but together with the above it's tight.
- **The real memory win is `backBufferLength`.** hls.js's default is `Infinity`, which is the actual leak-like growth on long live sessions. 5 s is more aggressive than needed and costs extra SourceBuffer remove operations; 10–30 s is fine.

**Suggested starting profile (to measure, not to trust):** forward buffer around 20–30 s, `maxBufferSize` around 30 MB, back buffer 10–15 s, worker on, low-latency off. mpegts.js has equivalent knobs (`enableStashBuffer`, `liveBufferLatencyChasing`, `autoCleanupSourceBuffer`).

### The OOM claim
"Silent crash after 15–30 minutes from unmanaged buffers" is plausible but unproven. On Fire tablets the more common causes are:
- **Repeated create/destroy cycles that leak** (listeners, object URLs, YouTube iframes not removed).
- **The YouTube iframe itself**, which is far heavier than hls.js.
- **An old WebView.** Fully Kiosk on Fire OS can run on Amazon's WebView, which lags upstream Chromium. Check its version.

Plan a soak test (a 2-hour stream plus 50 pop-up open/close cycles, watching memory via Fully's remote admin or `chrome://inspect`) rather than designing around an assumed number.

### Things the RFC doesn't mention that matter more on Fire
- **Codecs** (see the verdict): AC-3/MP2 audio, HEVC video, interlaced 1080i/576i. Fix these in a Dispatcharr ffmpeg profile (`-c:v copy -c:a aac` is cheap; deinterlacing costs CPU on the Dispatcharr host).
- **Fully Kiosk settings:** "Autoplay videos" (removes the user-gesture requirement, which makes §5.3 largely moot on kiosks), hardware acceleration, and third-party cookies (matters for YouTube).

---

## 5. YouTube (§6)

| RFC claim | Reality |
|---|---|
| `modestbranding: 1` removes branding | **Deprecated (2023), no effect.** |
| `rel: 0` removes related videos | Now only restricts them to the same channel. |
| `controls: 0` gives a "chromeless" player identical to native video | Hides the control bar only. Title/channel overlay, pause-screen suggestions and end screens remain. Covering the player with your own overlay to hide them conflicts with YouTube's API terms (required minimum functionality: no obscuring player elements). |
| Premium login on the tablet removes ads in the embed | **Shaky.** (a) The embed is a third-party iframe in HA's origin, and Android WebViews block third-party cookies by default, so the signed-in session may not be sent (Fully has a setting for this). (b) Google often blocks sign-in inside embedded WebViews entirely. (c) **Silk and Fully do not share cookies**, so logging in via Silk does nothing for Fully. |

**Recommendation:** treat YouTube as "official embed, minimally styled, ads possible", not "chromeless and ad-free". Prove the Premium/cookie path on your actual tablet with a 30-minute spike before committing to it as a goal. Make sure `origin`/`widget_referrer` match HA's URL; recent YouTube embed errors (152/153) are triggered by missing referrer/identity, which WebViews sometimes strip.

---

## 6. Mixed content, CORS and remote access (§9)

The RFC rates this "Medium, document it". It is a **design constraint that decides the architecture**:
- **Mixed content:** if HA is loaded over HTTPS (Nabu Casa, a reverse proxy, a local HTTPS domain), every `http://192.168.x.x:9191` fetch from hls.js/mpegts.js is **blocked outright**. No setting fixes that in modern Chromium.
- **CORS:** hls.js and mpegts.js use fetch/XHR, so Dispatcharr must send `Access-Control-Allow-Origin` (a plain `<video src>` doesn't need it). I don't know whether Dispatcharr does. Unverified.
- **Local Network Access:** recent Chrome versions prompt (or block) when a page from a public origin requests private IPs.
- **Remote access:** away from home, `192.168.x.x` isn't reachable at all.

**The clean answer** is to serve Dispatcharr's stream paths **same-origin as HA**: a reverse-proxy path on the same host/TLS cert as HA (for example `https://ha.example.com/dispatcharr/...`). That fixes mixed content, CORS and LNA in one move. If the tablets use `http://ha-ip:8123` only on the LAN, none of this bites, so your setup decides how much of this matters.

**Security note:** stream URLs in dashboard YAML are visible to every HA user and in the browser. Fine for a home LAN; worth knowing if Dispatcharr URLs carry tokens or are exposed beyond the LAN.

---

## 7. Bundle size (§8)

"45–55 KB gzipped including hls.js" is off by roughly 3×. The full hls.js build is in the ~120–160 KB gzipped range, and even the light build is around 90+ KB gzipped (my estimate from recent versions; measure at build time). Recommendations:
- Ship an ES-module build with **dynamic imports per engine**, so Dispatcharr-only users never download hls.js or YouTube code. HACS serves module resources from `/hacsfiles/`, and relative chunk loading works there. A single IIFE makes code-splitting impossible.
- Bundle your own Lit. Don't rely on HA's internal copy or its internal `ha-hls-player` element (HA does lazy-load hls.js for cameras, but that's private API and can change any release).

---

## 8. Alternative worth weighing: go2rtc

HA has shipped go2rtc built in since 2024.11. go2rtc can ingest an HTTP TS/HLS URL, transcode audio with ffmpeg if needed, and serve WebRTC/MSE to existing cards (Advanced Camera Card, WebRTC card). Crucially, **go2rtc closes the upstream when the last viewer leaves**, so tuner safety becomes server-side instead of depending on a sleepy tablet's JavaScript.

- **Pros:** codec problems solved centrally, no mixed-content issue (served via HA), proven players, teardown not reliant on the client.
- **Cons:** every channel needs to be a go2rtc stream (dynamic channel switching is awkward), extra CPU on the HA host if transcoding, YouTube still needs a separate path, and existing camera cards aren't built for "one sink, switchable channels".

My view is that the custom card stays the better primary design for dynamic channel switching plus YouTube. go2rtc is a useful fallback if the codec spike fails on Fire.

---

## 9. Smaller points
- **Name:** `ha-` is HA frontend's own element namespace. Avoid it to prevent collisions and confusion (also unify `ha-stream-card` with the `ha-video-card-play` event name).
- **Problem statement overreach:** "iframe cards leak memory on src swap" and "camera cards cause decoder lockups" are asserted, not shown. They don't change the design, so just don't build on them.
- **Autoplay (§5.3):** Chromium uses *sticky* user activation, so any prior tap on the dashboard usually satisfies unmuted autoplay. On Fully with "Autoplay videos" enabled it's a non-issue. Keep the muted fallback for phones and desktop.

## 10. What I'd do first, before a plan
Three short spikes, each answering a question that could change the architecture:
1. **Playback spike:** one real Dispatcharr URL on your Fire tablet in Fully, tried with mpegts.js, hls.js and `<video src>`. Answers the format, codec, CORS and mixed-content questions in one go.
2. **Pop-up lifecycle spike:** a 20-line test card inside a Bubble pop-up that logs connect, disconnect, IO and visibility events on open/close/screen-off, while watching Dispatcharr's connection count.
3. **YouTube spike:** an embed in Fully with a signed-in Premium account. Do ads show? Does sign-in even work?
