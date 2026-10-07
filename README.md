# HA Video Card (working name: ha-stream-card)

A Home Assistant Lovelace card that plays Dispatcharr IPTV (and later YouTube) on wall tablets, phones, desktop, and on a TV via HA Cast, including inside Bubble Card pop-ups, and reliably releases the Dispatcharr stream when it's closed.

**Start here:** [HANDOVER.md](HANDOVER.md) has the current status, decisions and next steps.

## Folder layout

```
HA Video Card/
├── README.md                 ← this file
├── HANDOVER.md               ← status, decisions, next steps, change log (kept up to date)
├── docs/
│   ├── rfc-001-review.md     ← critique of the original RFC-001
│   └── development-plan.md   ← the agreed plan (requirements, architecture, phases)
└── phase0-test-kit/          ← throwaway tests to run before building the real card
    ├── README.md             ← setup + the four tests
    ├── results.md            ← fill in test results here
    ├── test-dashboard.yaml   ← paste into a new HA dashboard
    └── www/stream-test/      ← copy to HA's /config/www/stream-test/
        ├── index.html        ← playback test page
        └── stream-probe-card.js  ← lifecycle probe card (HA resource)
```

The real card's source code will get its own `card/` folder (and later an `integration/` folder for the companion integration) once Phase 0 results are in.

## Where the files live
- **Your PC:** `C:\Users\Declan\Projects\HA Video Card`
- **Project files** (what Claude works from): `ha-stream-card/` in this project's shared files.

Both copies use the same layout. Claude updates both when anything changes.
