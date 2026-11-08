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

## 3. Quality profiles (for the card's `qualities`)

The card's Quality menu and Auto quality need one Dispatcharr output profile per quality below Source. **Source** needs no profile: it's the channel exactly as Dispatcharr sends it. Make only the qualities you'll use; a sensible set for a mix of 4K TVs, phones and Fire tablets is Source, 1080p, 720p, 540p and 360p. The card hides any quality at or above a channel's own height once it has played that channel at Source, so a 1080p rung never shows on a 720p channel.

Add each one under **Settings → Output Profiles → Add** (Command **FFmpeg**, Is Active ticked), then find its ID the same way as the README's audio profile (the M3U URL popover). Every profile below converts video to H.264 and audio to AAC stereo, so every quality below Source is also "safe" for any browser.

Shared parameters (replace `<VF>`, `<RATE>`, `<BUF>` and `<LEVEL>` from the table):

```
-fflags +discardcorrupt+genpts -probesize 2M -analyzeduration 2M -i pipe:0 -map 0:v:0 -map 0:a:0? -sn -dn -vf "<VF>" -c:v libx264 -preset veryfast -tune zerolatency -profile:v high -level <LEVEL> -pix_fmt yuv420p -b:v <RATE> -maxrate <RATE> -bufsize <BUF> -g 50 -sc_threshold 0 -c:a aac -b:a 128k -ac 2 -ar 48000 -af aresample=async=1:min_hard_comp=0.03 -max_muxing_queue_size 4096 -flush_packets 1 -mpegts_flags +pat_pmt_at_frames+resend_headers+initial_discontinuity -f mpegts pipe:1
```

| Card `name` | `<VF>` (SDR channels) | `<RATE>` | `<BUF>` | `<LEVEL>` |
|---|---|---|---|---|
| 2160p | `yadif=mode=send_frame:deint=interlaced,scale=-2:'min(2160,ih)'` | 16M | 32M | 5.1 |
| 1440p | `yadif=mode=send_frame:deint=interlaced,scale=-2:'min(1440,ih)'` | 9M | 18M | 5.1 |
| 1080p | `yadif=mode=send_frame:deint=interlaced,scale=-2:'min(1080,ih)'` | 5M | 10M | 4.1 |
| 720p | `yadif=mode=send_frame:deint=interlaced,scale=-2:'min(720,ih)'` | 3M | 6M | 4.0 |
| 540p | `yadif=mode=send_frame:deint=interlaced,scale=-2:'min(540,ih)'` | 1800k | 3600k | 3.1 |
| 480p | `yadif=mode=send_frame:deint=interlaced,scale=-2:'min(480,ih)'` | 1200k | 2400k | 3.1 |
| 360p | `yadif=mode=send_frame:deint=interlaced,scale=-2:'min(360,ih)'` | 700k | 1400k | 3.0 |

Then on the card (IDs are examples):

```yaml
output_profile: 3            # the README's audio profile: now only Source's safe-audio fallback
qualities:
  - { name: 1080p, output_profile: 6 }
  - { name: 720p, output_profile: 7 }
  - { name: 540p, output_profile: 8 }
  - { name: 360p, output_profile: 9 }
```

**4K HDR channels.** Phones, Fire tablets and most browsers can't show HDR, and none of the profiles above changes the colours, so an HDR channel scaled with them looks grey and washed out. For HDR channels, put a tone-mapping step in front of the scale in `<VF>`:

```
zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,scale=-2:'min(1080,ih)'
```

- This needs an ffmpeg built with zimg. Check with `docker exec dispatcharr ffmpeg -hide_banner -filters | grep zscale`.
- Applied to an SDR channel, it dulls the picture, so keep separate HDR profiles. Because the card's qualities apply to every channel on that card, the simplest set-up is a card (or a pop-up) for your 4K HDR channels with HDR-profile `qualities`, and the normal profiles everywhere else.
- I haven't been able to test this chain against your HDR channels. Try it on one with `ffprobe` (as in README section 1) and by eye before relying on it.

**CPU.** Copying video (Source, and the audio profile) costs almost nothing. Each of these profiles decodes and re-encodes the video. Roughly, in software: 360p–540p about half a core, 720p about one core, 1080p two or three cores, and 4K HDR to 1080p four to six cores, per channel per quality in use. Dispatcharr runs one transcode per channel and profile, shared by everyone watching that combination, so two screens on the same channel at different qualities cost two transcodes. If the Dispatcharr host has an Intel or AMD GPU passed through, a VAAPI version (`-vaapi_device /dev/dri/renderD128 … -vf 'format=nv12,hwupload,scale_vaapi=w=-2:h=720' -c:v h264_vaapi`) cuts that to almost nothing, but it depends on the host, so it isn't covered here.

## 4. Reading the card's health log

Turn on **Stats overlay** in the card's settings panel on the device that has trouble. The `health` lines count the last 24 hours:

- many `reconnect` with `stall` details on one channel and not others: the source; add a backup stream.
- `reconnect` on every channel on one device: that device's network (Wi-Fi sleep on Fire tablets: Fully Kiosk → Power settings, keep Wi-Fi on).
- `buffering` (with `buffer: stable`): the reserve keeps running dry; raise New Client Buffer, or check the device's Wi-Fi.
- `frozen` / `black` followed by `switch`: the backup stream took over; if `switch-failed`, check the `rest_command` and the API key in HA's log.
- `quality` with `dropping frames`: the device can't decode the stream fast enough; Auto moved it to a lighter quality. With `running dry`: its link can't keep up even with a 12 s reserve. Many of these on one device: pin that device to a lower quality in its settings panel.
