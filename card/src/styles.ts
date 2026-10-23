import { css, unsafeCSS } from 'lit';
import { iconStyles } from './icons';
import { tokens } from './ui/theme';

/*
 * Layout: `.stage` is a size container holding the picture (`.frame`), the ident and the control
 * bar. On a wide card the ident and bar float over the picture; under 520 px (phones, Bubble
 * pop-ups) they sit below it in the card's own colours. Full screen and TV always float.
 */
const card = css`
  :host {
    display: block;
  }
  /* When the dashboard makes the card taller than its content (a sections row next to a taller
     column, a theme's min-height), the picture takes the extra height, letterboxed like full
     screen, instead of leaving a bar of card background under it. */
  ha-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
    font-family: var(--sc-font);
    color: var(--sc-text);
  }
  .mono {
    font-family: var(--sc-mono);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  button {
    font: inherit;
    color: inherit;
    border: none;
    cursor: pointer;
    background: none;
    padding: 0;
  }
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--sc-accent);
    outline-offset: 2px;
  }
  .stage[hidden] {
    display: none;
  }
  ha-card > * {
    flex: none;
  }
  .stage {
    position: relative;
    container: stage / inline-size;
    display: flex;
    flex-direction: column;
    flex: 1 0 auto;
  }
  .stage:fullscreen {
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: var(--sc-pic);
  }
  .stage:fullscreen .frame {
    aspect-ratio: auto !important;
    flex: 1;
  }
  .frame {
    position: relative;
    flex: 1 0 auto;
    width: 100%;
    background: var(--sc-pic);
    color: var(--sc-pic-text);
    overflow: hidden;
    isolation: isolate;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  .video-host,
  .video-host video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .video-host video {
    object-fit: contain;
    background: var(--sc-pic);
  }
  .sheen {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.6) 0%,
      rgba(0, 0, 0, 0) 32%,
      rgba(0, 0, 0, 0) 60%,
      rgba(0, 0, 0, 0.72) 100%
    );
    transition: opacity 0.3s;
  }
  .glass {
    background: var(--sc-glass);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    backdrop-filter: blur(18px) saturate(160%);
    border: 1px solid var(--sc-glass-line);
  }
  .hidden {
    opacity: 0;
    pointer-events: none;
  }

  /* ---- logo plate ---- */
  .logo {
    position: relative;
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    overflow: hidden;
    background: var(--sc-logo-bg);
    color: #f4f5f7;
    font-weight: 800;
    letter-spacing: -0.03em;
  }
  .logo img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 4px;
    object-fit: contain;
  }
  .logo img:not([hidden]) + .ini {
    visibility: hidden;
  }
  .logo img[hidden] {
    display: none;
  }

  /* ---- ident (top left) ---- */
  .ident {
    position: absolute;
    z-index: 2;
    top: 16px;
    left: 16px;
    right: 132px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    color: var(--sc-pic-text);
    text-shadow: 0 1px 12px rgba(0, 0, 0, 0.45);
    transition: opacity 0.3s;
    pointer-events: none;
  }
  .ident-logo {
    width: 52px;
    height: 52px;
    font-size: 18px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
    text-shadow: none;
  }
  .ident-text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .ident-line {
    display: flex;
    align-items: baseline;
    gap: 10px;
    font-size: 15px;
    font-weight: 600;
    min-width: 0;
  }
  .ident-line .title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ident-num {
    flex: none;
    font-weight: 700;
    color: var(--sc-pic-text-2);
  }
  .ident-now {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.12;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .ident-times {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
    font-size: 12px;
    color: var(--sc-pic-text-2);
  }
  .ident-times .bar {
    width: 160px;
  }
  .ident-next {
    display: none;
    font-size: 13px;
    color: var(--sc-text-2);
  }
  .bar {
    display: block;
    height: 3px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.22);
    overflow: hidden;
  }
  .bar > span {
    display: block;
    height: 100%;
    border-radius: 2px;
    background: currentColor;
  }
  .ident-times .bar > span {
    background: #fff;
  }

  /* The tuning layer shows the channel in the middle; no need for it in the corner too. */
  .stage[data-ui='connecting'] .ident {
    opacity: 0;
  }
  /* ---- chips (top right) ---- */
  .chips-top {
    position: absolute;
    z-index: 2;
    top: 16px;
    right: 16px;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    transition: opacity 0.3s;
    pointer-events: none;
  }
  .chip-top {
    height: 30px;
    padding: 0 12px;
    border-radius: 15px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }
  .chip-top svg.icon {
    width: 16px;
    height: 16px;
  }
  .chip-top.live {
    font-size: 12px;
    font-weight: 750;
    letter-spacing: 0.1em;
  }
  .live-dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--sc-live);
    box-shadow: 0 0 0 3px rgba(255, 91, 79, 0.25);
    animation: pulse 2.4s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.35;
    }
  }

  /* ---- channel number OSD ---- */
  .osd {
    position: absolute;
    z-index: 2;
    left: 20px;
    bottom: 92px;
    display: flex;
    align-items: flex-end;
    gap: 16px;
    pointer-events: none;
    animation: osd-in 0.5s var(--sc-ease) both;
    text-shadow: 0 6px 40px rgba(0, 0, 0, 0.5);
  }
  .osd-number {
    font-size: clamp(56px, 13cqw, 120px);
    font-weight: 800;
    line-height: 0.82;
    letter-spacing: -0.06em;
  }
  .osd-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-bottom: 4px;
  }
  .osd-label {
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--sc-pic-text-2);
  }
  .osd-name {
    font-size: clamp(16px, 3cqw, 22px);
    font-weight: 700;
  }
  .osd.typing {
    left: auto;
    right: 16px;
    top: 56px;
    bottom: auto;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    padding: 14px 20px;
    border-radius: 20px;
    background: var(--sc-glass);
    text-shadow: none;
  }
  .osd.typing .osd-number {
    letter-spacing: 0.04em;
    font-size: clamp(48px, 10cqw, 96px);
  }
  .osd .cursor {
    opacity: 0.35;
  }
  .osd-hint {
    font-size: 14px;
    color: var(--sc-pic-text-2);
  }
  @keyframes osd-in {
    from {
      opacity: 0;
      transform: translate3d(-24px, 0, 0);
    }
  }

  /* ---- state layers ---- */
  .layer {
    position: absolute;
    z-index: 1;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 20px;
    box-sizing: border-box;
    text-align: center;
    pointer-events: none;
  }
  .layer > * {
    pointer-events: auto;
  }
  .layer.dim {
    background: rgba(0, 0, 0, 0.55);
  }
  .layer.solid {
    background: #16181d;
  }
  .layer.edit {
    inset: 8px;
    border: 1.5px dashed rgba(255, 255, 255, 0.25);
    border-radius: calc(var(--sc-radius) - 4px);
    background: #16181d;
  }
  .edit-tags {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .tag {
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 8px;
    background: #24272e;
    color: #b2b7c1;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .message {
    max-width: 36em;
    font-size: 15px;
    line-height: 1.45;
    color: var(--sc-pic-text);
  }
  .message.big {
    font-size: 17px;
    font-weight: 650;
  }
  .message.sub {
    font-size: 13px;
    color: var(--sc-pic-text-2);
  }
  .message.detail {
    font-size: 12px;
    opacity: 0.75;
    font-family: var(--sc-mono);
    word-break: break-word;
  }
  .state-icon svg.icon {
    width: 34px;
    height: 34px;
  }
  .state-icon.warn {
    color: var(--sc-warn);
  }
  .state-icon.muted {
    color: #8f95a1;
  }
  .big-play {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--sc-glass);
    border: 1.5px solid rgba(255, 255, 255, 0.6);
    color: #fff;
  }
  .big-play svg.icon {
    width: 34px;
    height: 34px;
    margin-left: 4px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: var(--sc-target);
    padding: 0 18px;
    border-radius: calc(var(--sc-target) / 2);
    background: rgba(255, 255, 255, 0.12);
    color: var(--sc-pic-text);
    font-size: 14px;
    font-weight: 650;
  }
  .pill svg.icon {
    width: 18px;
    height: 18px;
  }
  /* Light on the always-dark picture, so it reads whatever the theme's primary colour is. */
  .pill.primary,
  .pill.light {
    background: #f4f5f7;
    color: #111318;
  }
  .pill.unmute {
    min-height: 52px;
    padding: 0 22px;
    font-size: 15px;
    background: rgba(14, 15, 18, 0.62);
    border: 1px solid rgba(255, 255, 255, 0.18);
  }
  .pill.unmute svg.icon {
    width: 22px;
    height: 22px;
  }
  .tuning-logo {
    width: 64px;
    height: 64px;
    border-radius: 14px;
    font-size: 22px;
  }
  .tuning-name {
    font-size: 17px;
    font-weight: 650;
  }
  .tuning-name .mono {
    opacity: 0.7;
  }
  .tuning-status {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .tuning-status .message {
    font-size: 13px;
    color: var(--sc-pic-text-2);
  }
  .spinner {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.22);
    border-top-color: #fff;
    animation: spin 0.9s linear infinite;
  }
  .spinner.small {
    width: 16px;
    height: 16px;
    border-width: 2px;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  /* Keep centred content clear of the control bar floating along the bottom. */
  .frame[data-state='ready'] .layer,
  .frame[data-state='connecting'] .layer,
  .frame[data-state='reconnecting'] .layer {
    padding-bottom: 76px;
  }
  .notice {
    position: absolute;
    z-index: 2;
    left: 16px;
    right: 16px;
    top: 84px;
    font-size: 13px;
    padding: 8px 12px;
    border-radius: 10px;
    background: var(--sc-glass);
    pointer-events: none;
  }

  /* ---- control bar ---- */
  .controls {
    position: absolute;
    z-index: 3;
    left: 12px;
    right: 12px;
    bottom: 12px;
    display: flex;
    /* A bar that doesn't fit wraps upwards over the picture rather than pushing buttons (full
       screen among them) off the card, which clips them. */
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    color: var(--sc-pic-text);
    transition: opacity 0.3s;
  }
  .group {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border-radius: 16px;
    background: var(--sc-glass);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    backdrop-filter: blur(18px) saturate(160%);
    border: 1px solid var(--sc-glass-line);
  }
  .group.transport {
    margin-right: auto;
  }
  .group.sound {
    position: relative;
  }
  .upnext {
    /* A zero basis, so a long title never wraps the bar; it shrinks and ellipsises instead. */
    flex: 1 1 0;
    min-width: 0;
    height: calc(var(--sc-target) + 8px);
    box-sizing: border-box;
    gap: 10px;
    padding: 0 16px;
    font-size: 13px;
    color: var(--sc-pic-text-2);
  }
  .upnext.empty {
    visibility: hidden;
  }
  .upnext-label {
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    opacity: 0.8;
  }
  .upnext-time {
    font-weight: 700;
    color: var(--sc-pic-text);
  }
  .upnext-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ctl {
    width: var(--sc-target);
    height: var(--sc-target);
    border-radius: 12px;
    display: grid;
    place-items: center;
    flex: none;
    transition:
      background 0.15s,
      transform 0.15s var(--sc-ease);
  }
  .ctl:hover,
  .ctl.on {
    background: var(--sc-glass-hover);
  }
  .ctl:active {
    transform: scale(0.94);
  }
  .sep {
    flex: none;
    width: 1px;
    height: 24px;
    margin: 0 4px;
    background: rgba(255, 255, 255, 0.14);
  }
  .row-break {
    display: none;
  }
  .vol-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 96px;
    height: 4px;
    margin: 0 10px 0 2px;
    border-radius: 2px;
    background: linear-gradient(
      90deg,
      currentColor var(--vol),
      rgba(127, 127, 127, 0.4) var(--vol)
    );
    cursor: pointer;
  }
  .vol-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  }
  .vol-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border: 0;
    border-radius: 50%;
    background: #fff;
  }
  .sleep-menu {
    position: absolute;
    right: 0;
    bottom: calc(100% + 10px);
    width: 260px;
    box-sizing: border-box;
    padding: 14px;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: var(--sc-pic-text);
    background: rgba(14, 15, 18, 0.82);
  }
  .menu-label {
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--sc-pic-text-2);
  }
  .sleep-options {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
  }
  .sleep-option {
    height: 40px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 650;
    background: rgba(255, 255, 255, 0.1);
  }
  .sleep-option[aria-pressed='true'] {
    background: #fff;
    color: #111318;
  }

  /* Narrow cards: hide the "Next" line, then the volume slider (mute stays), so the floating
     bar fits on one row down to the phone layout, settings button included. */
  @container stage (max-width: 760px) {
    .upnext {
      display: none;
    }
    .vol-slider {
      width: 72px;
    }
  }
  @container stage (max-width: 679px) {
    .vol-slider,
    .sep {
      display: none;
    }
    /* Wall panels' 56 px targets don't fit in a card this narrow; 44 px is still finger-sized. */
    .controls {
      --sc-target: 44px;
    }
  }

  /* ---- phone / pop-up layout: ident and controls below the picture ---- */
  @container stage (max-width: 519px) {
    .stage:not(.fs):not(.tv) .ident {
      position: static;
      padding: 14px 16px 0;
      gap: 12px;
      color: var(--sc-text);
      text-shadow: none;
      opacity: 1;
      pointer-events: auto;
    }
    .stage:not(.fs):not(.tv) .ident-num {
      color: var(--sc-text-2);
    }
    .stage:not(.fs):not(.tv) .ident-now {
      font-size: 19px;
    }
    .stage:not(.fs):not(.tv) .ident-times {
      color: var(--sc-text-2);
    }
    .stage:not(.fs):not(.tv) .ident-times .bar {
      flex: 1;
      background: var(--sc-line);
    }
    .stage:not(.fs):not(.tv) .ident-times .bar > span {
      background: var(--sc-accent);
    }
    .stage:not(.fs):not(.tv) .ident-next {
      display: block;
    }
    .stage:not(.fs):not(.tv) .controls {
      position: relative;
      left: auto;
      right: auto;
      bottom: auto;
      flex-wrap: wrap;
      justify-content: space-between;
      row-gap: 12px;
      padding: 14px 16px 4px;
      color: var(--sc-text);
      opacity: 1;
      pointer-events: auto;
    }
    .stage:not(.fs):not(.tv) .group {
      display: contents;
    }
    /* The ident shows what's next instead. */
    .stage:not(.fs):not(.tv) .group.upnext {
      display: none;
    }
    .stage:not(.fs):not(.tv) .sep {
      display: none;
    }
    .stage:not(.fs):not(.tv) .ctl {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--sc-surface);
    }
    .stage:not(.fs):not(.tv) .ctl.on {
      background: color-mix(in srgb, var(--sc-accent) 20%, transparent);
      color: var(--sc-accent);
    }
    .stage:not(.fs):not(.tv) .ctl-stop {
      width: 64px;
      height: 64px;
      background: var(--sc-accent);
      color: var(--sc-on-accent);
    }
    /* Row 1: last, down, stop, up, sleep. Row 2: mute, volume, channels, multiview, full screen.
       Orders on row 2 are spaced so another button can slot in. */
    .stage:not(.fs):not(.tv) .ctl-last {
      order: 1;
    }
    .stage:not(.fs):not(.tv) .ctl-down {
      order: 2;
    }
    .stage:not(.fs):not(.tv) .ctl-stop {
      order: 3;
    }
    .stage:not(.fs):not(.tv) .ctl-up {
      order: 4;
    }
    .stage:not(.fs):not(.tv) .ctl-sleep {
      order: 5;
    }
    .stage:not(.fs):not(.tv) .row-break {
      display: block;
      order: 6;
      flex-basis: 100%;
      height: 0;
    }
    .stage:not(.fs):not(.tv) .ctl-mute {
      order: 7;
    }
    .stage:not(.fs):not(.tv) .vol-slider {
      order: 8;
    }
    .stage:not(.fs):not(.tv) .ctl-channels {
      order: 10;
    }
    .stage:not(.fs):not(.tv) .ctl-multiview {
      order: 12;
    }
    .stage:not(.fs):not(.tv) .ctl-fullscreen {
      order: 14;
    }
    .stage:not(.fs):not(.tv) .ctl-mute,
    .stage:not(.fs):not(.tv) .ctl-channels,
    .stage:not(.fs):not(.tv) .ctl-multiview,
    .stage:not(.fs):not(.tv) .ctl-fullscreen {
      width: 44px;
      height: 44px;
      background: none;
    }
    .stage:not(.fs):not(.tv) .vol-slider {
      display: block;
      flex: 1;
      width: auto;
      min-width: 60px;
    }
    .stage:not(.fs):not(.tv) .sleep-menu {
      right: 16px;
      bottom: calc(100% - 4px);
    }
    .stage:not(.fs):not(.tv) .frame[data-state] .layer {
      padding-bottom: 20px;
    }
    .stage:not(.fs):not(.tv) .osd {
      bottom: 16px;
    }
    .stage:not(.fs):not(.tv) .chips-top {
      top: 10px;
      right: 10px;
    }
  }
  /* Full screen on a phone: the bar can take two rows, so the channel number sits above them. */
  @container stage (max-width: 519px) {
    .stage.fs .osd {
      bottom: 156px;
    }
    .stage.fs .frame[data-state] .layer {
      padding-bottom: 140px;
    }
  }
  /* Small phones: smaller buttons and no slider, so each row stays one row. */
  @container stage (max-width: 359px) {
    .stage:not(.fs):not(.tv) .controls {
      column-gap: 6px;
      padding: 12px 12px 4px;
    }
    .stage:not(.fs):not(.tv) .ctl {
      width: 44px;
      height: 44px;
    }
    .stage:not(.fs):not(.tv) .ctl-stop {
      width: 56px;
      height: 56px;
    }
    .stage:not(.fs):not(.tv) .vol-slider {
      display: none;
    }
  }

  /* ---- TV (HA Cast): nothing to tap, larger type, inside the 5% TV-safe area ---- */
  .stage.tv .ident {
    top: 5%;
    left: 5%;
    right: 30%;
    gap: 20px;
  }
  .stage.tv .ident-logo {
    width: 72px;
    height: 72px;
    border-radius: 14px;
    font-size: 26px;
  }
  .stage.tv .ident-line {
    font-size: 20px;
  }
  .stage.tv .ident-now {
    font-size: 36px;
  }
  .stage.tv .chips-top {
    top: 5%;
    right: 5%;
  }
  .stage.tv .osd {
    left: 5%;
    bottom: 16%;
  }
  .stage.tv .osd.typing {
    left: auto;
    right: 5%;
    top: 5%;
    bottom: auto;
  }
  .stage.tv .osd-hint {
    font-size: 16px;
  }
  .tv-hints {
    position: absolute;
    z-index: 2;
    left: 5%;
    right: 5%;
    bottom: 5%;
    display: flex;
    align-items: center;
    gap: 28px;
    font-size: 15px;
    color: var(--sc-pic-text-2);
    pointer-events: none;
  }
  .tv-hints > span {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .tv-hints .key {
    min-width: 34px;
    height: 34px;
    padding: 0 8px;
    box-sizing: border-box;
    border-radius: 8px;
    border: 1.5px solid rgba(255, 255, 255, 0.5);
    display: inline-grid;
    place-items: center;
    font-size: 14px;
    font-weight: 700;
  }
  .tv-clock {
    margin-left: auto;
    font-size: 22px;
    font-weight: 700;
    color: var(--sc-pic-text);
  }

  .debug {
    position: absolute;
    z-index: 4;
    top: 56px;
    right: 8px;
    max-width: 60%;
    max-height: 45%;
    overflow: hidden;
    padding: 6px 8px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.7);
    color: #b9f6ca;
    font:
      11px/1.35 ui-monospace,
      Menlo,
      Consolas,
      monospace;
    white-space: pre-wrap;
    word-break: break-all;
    pointer-events: none;
    text-align: left;
  }
  stream-card-picker.panel {
    border-top: 1px solid var(--sc-line);
  }
  @media (prefers-reduced-motion: reduce) {
    .osd,
    .live-dot {
      animation: none;
    }
    .ctl {
      transition: none;
    }
  }
`;

export const styles = [
  tokens,
  css`
    ${unsafeCSS(iconStyles)}
  `,
  card,
];
