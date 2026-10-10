# Stream Card: notes for coding agents

A Home Assistant Lovelace card (`custom:stream-card`) that plays Dispatcharr MPEG-TS IPTV and reliably releases the Dispatcharr connection when nobody can see it. Design and contracts: [docs/build-plan-v1.md](docs/build-plan-v1.md). Status and decisions: [HANDOVER.md](HANDOVER.md). Update HANDOVER.md (status, decisions, change log) whenever you finish a piece of work.

## Commands (run in `card/`)
- `npm ci`: install
- `npm run check`: lint + Prettier + typecheck + unit tests + build + size budget + README message check. Must pass before every push.
- `npm run e2e`: Playwright against the fake Dispatcharr. Needs `ffmpeg` with libx264/libx265 on PATH. Run `npm run build` first; the tests load `dist/`.
- `npm run e2e:ha`: the card in a real, disposable Home Assistant (pinned version, installed with uv into `card/.ha-test/`) with Bubble Card: HA and Bubble buttons, pop-up open/close, view switching, edit mode and the card editor. Needs `uv`. Starts and stops HA itself.
- `REAL_CODECS=1 npm run e2e`: the `@real` tests in Google Chrome (real H.264/AAC decode, used in CI).
- `LIVE=1 LIVE_STREAM_URL=https://<dispatcharr>/proxy/ts/stream/<uuid> [LIVE_OUTPUT_PROFILE=<id>] npm run e2e`: tests against a real channel (never in CI; never commit the URL).
- `node test/fake-dispatcharr/server.mjs`: fake Dispatcharr on :8930 and test pages on :8931 for manual poking.

## Layout
- `src/index.ts`: entry; installs the page controller, defines the element.
- `src/controller.ts`: one per page. `fire-dom-event` buttons (`ll-custom`), per-target mailbox, pop-up opening, Fully Kiosk events.
- `src/stream-card.ts`: the Lit element. `evaluate()` is the only place that starts or stops playback.
- `src/lifecycle.ts`: `holdReason()` (pure) and the watcher for IntersectionObserver, visibility, pagehide, Fully, idle.
- `src/session.ts`: one source on one `<video>`: start timeout, stall watchdog, reconnect/backoff, error classification.
- `src/engines/`: `mpegts-engine.ts` (lazy chunk), `native-engine.ts`, `fetch-loader.ts`.
- `src/errors.ts`: every user-facing message (`MESSAGES`). The README troubleshooting table must list each one; `scripts/check-messages.mjs` enforces it.

## Rules
- The `<video>` element is created once in the constructor and never goes in a Lit template. HA sets `hass` constantly; it must never restart playback.
- Never hold two connections: a session tears down its engine (synchronously aborting the fetch) before any retry, and the card stops a session before starting another.
- Keep `ImmediateAbortLoader` (`src/engines/fetch-loader.ts`). mpegts.js's own loader does not abort a stalled fetch on Chrome, which leaves the Dispatcharr connection open.
- Every release path has an e2e test asserting the fake server's open-connection count, not client state. Add one for any new path.
- Cards in `preview`/`editMode` (HA editor and dashboard edit mode) never open a connection.
- No real hostnames, channel UUIDs or tokens in the repo. Use `dispatcharr.example` and the fake server.
- No new runtime dependencies beyond Lit and mpegts.js without saying so in the PR.
- Contracts in docs/build-plan-v1.md §4 (card config, button payload, engine interface, controller) change only in their own PR, with that doc updated.
- New user-facing message → add it to `MESSAGES` and to the README troubleshooting table.

## Testing notes
- Playwright's Chromium (and cloud containers) can't decode H.264/AAC. `test/e2e/mse-shim.js` replaces MediaSource so mpegts.js still fetches, demuxes and remuxes real TS while playback time is simulated. Knobs: `window.__mseShimCodecs`, `window.__mseShimBlockUnmuted`.
- The fake server picks behaviour from the channel ID (`stall-3--x`, `hang--x`, `status-404--x`, `ac3--x`, ...); see the header of `test/fake-dispatcharr/server.mjs`. `Harness.channel(mode)` makes IDs unique per test.
- `test/ha/` runs against real HA 2026.10 + Bubble Card 3.4.1; prefer adding a case there when a behaviour depends on HA or Bubble internals. Bubble buttons: `tap_action` is the icon only, `button_action` the body.
- `test/e2e/pages/harness.js` fakes HA buttons (`ll-custom`) and Bubble Card ≥ 3.2.4 pop-ups (shell detached while closed, same element re-attached on open).
