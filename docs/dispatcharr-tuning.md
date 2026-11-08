# Dispatcharr settings for smooth playback

The card can only recover from what reaches it. Most freezes, black screens and long buffering start upstream, and Dispatcharr can fix many of them before the card ever sees them. These settings were checked against Dispatcharr's source (`apps/proxy/config.py`, `apps/proxy/live_proxy/`, `frontend/src/constants.js`) in November 2026; labels can move between versions.

## 1. Give important channels a backup stream

Dispatcharr's failover only works when a channel has more than one stream.

- **Channels → edit channel → Streams**: add the same channel from a second provider or M3U account, and drag the **most reliable stream to the top**. Dispatcharr starts with the first stream and moves down the list.
- Dispatcharr switches stream by itself when the upstream connection fails, and when the stream can't keep up (see _Buffering_ below). It does **not** look at the picture, so a source that sends a frozen or black picture with a healthy connection is left alone. That's the gap the card's `picture_check` and `switch_source` fill (README, section 1 _Backup sources_).
- The card's `switch_source` calls `POST /proxy/ts/next_stream/<channel uuid>`. It answers 404 when the channel has only one stream, or isn't running.

## 2. Proxy settings

**Settings → Proxy Settings.** Defaults in brackets.

| Setting                      | Suggested                         | Why                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Channel Shutdown Delay [0 s] | **5–10 s**                        | When the card reconnects (a stall, a frozen picture, a network blip) and it was the only viewer, a 0 s delay stops the channel on Dispatcharr and starts it again from scratch: slower, and back on the channel's _first_ stream, which undoes a source switch. A few seconds lets the reconnect rejoin the running channel. Costs a few seconds of provider connection after everyone stops watching. |
| Buffering Timeout [15 s]     | 10–15 s                           | How long a stream may run slower than real time before Dispatcharr moves to the next stream. Lower switches sooner on a struggling source; too low flips between sources on brief provider hiccups.                                                                                                                                                                                                    |
| Buffering Speed [1.0]        | 1.0                               | Below this speed (measured from FFmpeg's progress), Dispatcharr counts the stream as buffering. Leave at 1.0.                                                                                                                                                                                                                                                                                          |
| New Client Buffer [5 s]      | 5 s, or more for `buffer: stable` | A new viewer starts this far behind live, from data Dispatcharr already has. More gives the card an instant reserve when it joins a running channel (`buffer: stable` starts playing sooner), at the cost of running further behind live. It's receive time, not exact video time.                                                                                                                     |

## 3. Output profile

The README's output profile (section 1) copies video and converts audio, which is light on Dispatcharr. If a tablet drops frames (the stats overlay shows _dropped_ climbing) rather than buffering, the tablet can't decode the channel fast enough: a second profile that scales to 720p for that tablet's card (`output_profile`) helps more than any buffer setting.

## 4. Reading the card's health log

Turn on **Stats overlay** in the card's settings panel on the device that has trouble. The `health` lines count the last 24 hours:

- many `reconnect` with `stall` details on one channel and not others: the source; add a backup stream.
- `reconnect` on every channel on one device: that device's network (Wi-Fi sleep on Fire tablets: Fully Kiosk → Power settings, keep Wi-Fi on).
- `buffering` (with `buffer: stable`): the reserve keeps running dry; raise New Client Buffer, or check the device's Wi-Fi.
- `frozen` / `black` followed by `switch`: the backup stream took over; if `switch-failed`, check the `rest_command` and the API key in HA's log.
