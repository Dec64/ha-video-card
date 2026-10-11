# Phase 0 test kit

> **History.** Phase 0 was dropped (see [docs/build-plan-v1.md](../docs/build-plan-v1.md)). Kept as an optional diagnostic tool; the card itself is in [`card/`](../card).

Four short tests that settle the risky parts of the plan before the real card is built. Everything here is throwaway test code.

| File | What it is |
|---|---|
| `www/stream-test/index.html` | Standalone playback test page: tries mpegts.js, native video and hls.js, shows what codecs the stream uses and what the device supports, plus a YouTube check |
| `www/stream-test/stream-probe-card.js` | Test Lovelace card: plays a channel and logs every lifecycle signal (pop-up open/close, screen off, page hidden, cast) |
| `test-dashboard.yaml` | Ready-made test dashboard: Bubble pop-up test view and an HA Cast view |
| `results.md` | Where results go (fill in, or paste the logs into the thread) |

## Setup (about 10 minutes)

1. **Copy the files into HA.** Put the `stream-test` folder at `/config/www/stream-test/` (File Editor, Samba or Studio Code Server add-on). HA serves it at `https://hayden-family.net/local/stream-test/`.
2. **Add the probe card as a resource.** Settings → Dashboards → ⋮ → Resources → Add resource → URL `/local/stream-test/stream-probe-card.js`, type *JavaScript module*. Hard-refresh the browser afterwards.
3. **Add the CORS header on Dispatcharr's hostname.** In Cloudflare: Rules → Transform Rules → Modify Response Header → for the Dispatcharr hostname, *Set static* `Access-Control-Allow-Origin` = `https://hayden-family.net`. If you also open HA by LAN IP, test from `hayden-family.net` for now. **Without this header, mpegts.js fails with a network/CORS error, which is the first thing test 1 will show.**
4. **Create the test dashboard** by pasting `test-dashboard.yaml` into a new dashboard's raw configuration editor and replacing `CHANNEL_URL_1` / `CHANNEL_URL_2` with two real channel URLs.
5. Keep **Dispatcharr's stats page** open on another screen during tests 2 and 3. That's where "the stream was released" is actually measured.

## Test 1: Playback on each device
Open `https://hayden-family.net/local/stream-test/index.html` on each device: **Fire HD 8 (Fully), Android phone (HA app or Chrome), iPhone (HA app *and* Safari), desktop Chrome, and the TV via test 3.** On iPhone in the HA app the page can be opened with a dashboard Webpage card pointing at that URL.

For each device:
1. Paste a channel URL and press **Play: mpegts.js**. Note whether you get picture **and sound** (press Unmute if it started muted).
2. If mpegts.js fails, try **Play: native**.
3. Press **Stop & release** and check Dispatcharr drops the client.
4. Press **Copy everything** and paste it into the thread, or fill in `results.md`.

Try 2–3 different channels on one device (including a sports channel), because the audio codec varies per channel. Section 2 of the page shows the codecs.

## Test 2: Bubble pop-up lifecycle
On the **Pop-up test** view (Fire tablet first, then iPhone):
1. Tap *Play channel 1 in pop-up*. The pop-up should open and play. The log shows whether the card picked up the request.
2. Close the pop-up (swipe, tap outside, back button). Watch Dispatcharr: the client should go within seconds. The log card on the page shows which signal fired (`disconnected`, `IntersectionObserver: hidden`, etc.).
3. Repeat with: switching channel inside the pop-up, turning the tablet screen off, letting Fully's screensaver start, switching to another HA view, and backgrounding the HA app on the iPhone.
4. Optional baseline: set `teardown: none` on the pop-up card, repeat step 2, and see that Dispatcharr keeps the connection. That shows what we're protecting against.

## Test 3: HA Cast to the TV
1. Go to https://cast.home-assistant.io, sign in to `https://hayden-family.net`, pick the TV, and cast the **Stream Test** dashboard, **Cast test** view.
2. Note: does it start on its own, with sound? The log on screen says whether `play() with sound` was refused.
3. Leave it running for 1 hour, then stop casting and check Dispatcharr releases the client.

## Test 4: YouTube with Premium
On each device, open the test page, sign in to YouTube in that browser/app first if possible, then load a normal video (not a Premium original) in section 4. Note: any pre-roll ad? Any errors?
- Fully Kiosk: sign in through Fully's own browser (not Silk). It may refuse Google sign-in; note that if so.
- iPhone: try both Safari and the HA app.

## What happens with the results
They decide: the engine per device (and whether iPhones need the HLS fallback), whether an AAC audio profile is needed in Dispatcharr, which teardown signals the real card relies on, whether HA Cast works as planned, and where ad-free YouTube is possible.
