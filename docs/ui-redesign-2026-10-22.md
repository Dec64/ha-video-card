# UI redesign proposal (2026-10-22)

A mockup, not a build. Nothing here is implemented or agreed yet.
Mockup canvas (private to Declan): https://claude.ai/artifact/Yc11oyZHocXjME3MaRfpBj

Numbers in brackets refer to the 2026-10-16 suggestions (#4 last channel, #5 recents, and so on; the list lives in the project files as `suggestions/2026-10-16-improvements.md`).

## Screens on the canvas
| Screen | What it shows |
|---|---|
| Desktop · Live TV dashboard (interactive) | The card in a sections view with the guide under it, a Screens card and quick-play buttons. Channels, recents, keypad, last channel, volume and sleep timer all work. Dark and light theme as a tweak |
| Phone · Bubble pop-up | Controls in the thumb zone, ident under the picture, recents list |
| Fire HD 8 wall panel | 56–64 px targets, favourites zap strip, the tuning state mid-zap |
| TV · HA Cast | 10-foot layout inside the TV-safe area, remote-key hints, number entry |
| Every state | Tuning, reconnecting, codec error, started muted, sleep timer ending, edit mode |
| Multiview | 2×2 sport grid with one tile holding the sound |

## What changes on the card
- **Channel ident** top-left: logo, number, name, programme now and a progress bar. Needs now/next data (#11).
- **Broadcast-style channel number** flashes on every change, and the new channel's logo shows while tuning (#9).
- **Control bar**: Stop, Last channel (#4), Ch−/Ch+, "Next" line, mute plus a volume slider (#7), sleep timer (#6), cast, full screen.
- **Guide under the card**: Recent as the first tab (#5), favourites and groups as in 1.0, search, and a number keypad (#8). Tiles show what's on now.
- **Errors** keep the 1.0 wording from `src/errors.ts`, but a failed zap offers "Back to <last channel>" first.
- **Edit mode** still never connects, and shows target, profile and favourites count.

## Open decisions it raises
- Now/next needs a small slice of Dispatcharr's EPG; 1.0 left the guide out on purpose.
- Multiview opens one Dispatcharr connection per tile.
- Picture-in-picture is left out because it would keep playing while nobody can see the dashboard.
- The Screens card assumes the companion integration (Phase 3).

## Look
Inherits HA's theme (card colour, `--primary-color`, radius) so it sits in any dashboard; the picture area is always dark. Type: Roboto Flex for UI, JetBrains Mono for channel numbers and times. Channel names and logos in the mockup are made up.
