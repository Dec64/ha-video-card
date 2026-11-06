import { css } from 'lit';

/**
 * The Live TV app's look (household dash system): night ground, glass only over the picture,
 * Outfit / Figtree / JetBrains Mono when the page has them (the household dash loads them; the
 * card itself never fetches fonts), one accent (`--stream-card-accent`, Live TV blue), red only
 * for LIVE. Added to the card's shadow root when the app chunk loads.
 */
export const appStyles = css`
  :host([data-chrome='app']) {
    display: block;
    height: var(--sc-app-h, 100dvh);
  }
  ha-card.app {
    --ground: #0b0d12;
    --surface: rgba(255, 255, 255, 0.035);
    --surface-2: rgba(255, 255, 255, 0.06);
    --hair: rgba(255, 255, 255, 0.075);
    --text: #eef1f6;
    --muted: #9aa3b2;
    --faint: #848c9a;
    --tv: var(--stream-card-accent, #60a5fa);
    --tv-soft: color-mix(in srgb, var(--tv) 16%, transparent);
    --on-accent: #06101f;
    --live: #ff6b5e;
    --info: #7ee0d2;
    --glass: rgba(16, 18, 24, 0.62);
    --glass-solid: rgba(26, 29, 39, 0.95);
    --glass-muted: rgba(255, 255, 255, 0.76);
    --f-display: var(--stream-card-display-font, 'Outfit', var(--sc-font));
    --f-body: var(--stream-card-body-font, 'Figtree', var(--sc-font));
    --f-mono: var(--stream-card-mono-font, 'JetBrains Mono', var(--sc-mono));
    --ease: cubic-bezier(0.16, 1, 0.3, 1);
    --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    --exit: cubic-bezier(0.4, 0, 1, 1);
    position: relative;
    height: 100%;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: var(--ground);
    color: var(--text);
    font-family: var(--f-body);
    font-size: 15px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    container: app / inline-size;
    display: block;
  }
  .app .appdbg {
    position: absolute;
    left: 8px;
    bottom: 100px;
    z-index: 99;
    margin: 0;
    font: 11px/1.3 var(--f-mono);
    color: #7ee0d2;
    background: rgba(0, 0, 0, 0.8);
    padding: 6px;
    white-space: pre-wrap;
    max-width: 60%;
  }
  ha-card.app.embed {
    height: auto;
    border-radius: var(--sc-radius);
    background: #000;
  }
  .app button {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
  }
  .app button:focus-visible,
  .app [tabindex]:focus-visible {
    outline: 2px solid var(--info);
    outline-offset: 2px;
  }
  .app .mono {
    font-family: var(--f-mono);
  }
  .app .lab {
    font-family: var(--f-mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--faint);
    font-weight: 500;
  }
  .app b {
    font-weight: 600;
    color: var(--text);
  }
  .app svg.icon {
    width: 22px;
    height: 22px;
  }
  .app .press {
    transition: transform 0.09s var(--ease);
  }
  .app .press:active {
    transform: scale(0.96);
  }

  /* glass */
  .app .glass {
    position: relative;
    border: 0;
    background: var(--glass);
    -webkit-backdrop-filter: blur(22px) saturate(160%);
    backdrop-filter: blur(22px) saturate(160%);
    color: #fff;
    box-shadow:
      0 10px 40px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
  .app .glass::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.25px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.62),
      rgba(255, 255, 255, 0.1) 38%,
      rgba(255, 255, 255, 0.04) 62%,
      rgba(255, 255, 255, 0.3)
    );
    -webkit-mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
  .app.lite .glass {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    background: var(--glass-solid);
  }

  /* shared bits */
  .app .live {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--f-mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    font-weight: 500;
    color: #fff;
    padding: 4px 9px;
    border-radius: 99px;
    background: rgba(255, 107, 94, 0.18);
    box-shadow: inset 0 0 0 1px rgba(255, 107, 94, 0.45);
    line-height: 1.2;
  }
  .app .live::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--live);
    animation: sc-pulse 2.4s ease-in-out infinite;
  }
  @keyframes sc-pulse {
    50% {
      opacity: 0.35;
    }
  }
  .app .bar {
    display: block;
    height: 3px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.16);
    overflow: hidden;
  }
  .app .bar i {
    display: block;
    height: 100%;
    background: var(--tv);
    border-radius: inherit;
    transition: width 0.24s var(--ease);
  }
  .app .eq {
    display: inline-flex;
    gap: 2px;
    align-items: flex-end;
    height: 12px;
  }
  .app .eq i {
    width: 3px;
    background: var(--tv);
    border-radius: 1px;
    animation: sc-eq 1s ease-in-out infinite;
  }
  .app .eq i:nth-child(2) {
    animation-delay: -0.4s;
  }
  .app .eq i:nth-child(3) {
    animation-delay: -0.7s;
  }
  @keyframes sc-eq {
    0%,
    100% {
      height: 4px;
    }
    50% {
      height: 12px;
    }
  }
  .app.lite .eq i {
    animation: none;
    height: 8px;
  }

  /* logo plates */
  .app .lp {
    display: grid;
    place-items: center;
    min-width: 64px;
    max-width: 96px;
    height: 40px;
    border-radius: 10px;
    background: #15171d;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.07);
    padding: 6px 8px;
    flex: none;
    box-sizing: border-box;
  }
  .app .lp img {
    display: block;
    max-width: 100%;
    max-height: 28px;
    object-fit: contain;
  }
  .app .lp .ini {
    font-family: var(--f-display);
    font-weight: 500;
    font-size: 14px;
  }
  .app .lp.sm {
    min-width: 54px;
    max-width: 84px;
    height: 34px;
    padding: 5px 7px;
    border-radius: 9px;
  }
  .app .lp.sm img {
    max-height: 24px;
  }
  .app .lp.xl {
    min-width: 0;
    max-width: none;
    height: 34px;
    background: none;
    box-shadow: none;
    padding: 0;
    display: block;
  }
  .app .lp.xl img {
    height: 100%;
    width: auto;
    max-width: 150px;
    max-height: none;
    filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.45));
  }

  /* ---------- body and views ---------- */
  .app-body {
    position: absolute;
    inset: 0;
    overflow: auto;
    scrollbar-width: none;
    box-sizing: border-box;
  }
  .app-body::-webkit-scrollbar {
    display: none;
  }
  .app[data-view='now'] .app-body,
  .app[data-view='channels'] .app-body {
    padding: 30px 36px 200px;
    -webkit-mask: linear-gradient(#000 calc(100% - 248px), transparent calc(100% - 168px));
    mask: linear-gradient(#000 calc(100% - 248px), transparent calc(100% - 168px));
  }
  .app[data-view='now'] .app-body {
    display: grid;
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    grid-template-areas: 'band band' 'stage favs' 'rails rails';
    column-gap: 18px;
    align-content: start;
  }
  .app[data-view='guide'] .app-body {
    display: grid;
    grid-template-columns: minmax(0, 9fr) minmax(0, 8fr);
    grid-template-rows: auto auto minmax(0, 1fr);
    grid-template-areas: 'stage det' 'tool tool' 'grid grid';
    gap: 18px;
    padding: 28px 36px 0;
    overflow: hidden;
  }
  .app[data-view='channels'] .app-body {
    display: block;
  }
  .app[data-view='channels'] .app-stage {
    display: none;
  }
  .app[data-view='full'] .app-body {
    overflow: hidden;
  }

  /* the stage in each view */
  .app-stage {
    grid-area: stage;
    position: relative;
    display: block;
    z-index: 1;
  }
  .app-stage .frame {
    position: relative;
    width: 100%;
    background: #000;
    overflow: hidden;
    isolation: isolate;
    color: #fff;
    outline: none;
  }
  .app-stage .video-host,
  .app-stage video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .app-stage video {
    object-fit: contain;
    background: #000;
  }
  .app[data-view='now'] .app-stage .frame,
  .app[data-view='guide'] .app-stage .frame {
    aspect-ratio: 16 / 9;
    border-radius: 22px;
    cursor: zoom-in;
  }
  .app[data-view='guide'] .app-stage .frame {
    border-radius: 20px;
  }
  .app[data-view='full'] .app-stage {
    position: absolute;
    inset: 0;
    z-index: 5;
  }
  .app[data-view='full'] .app-stage .frame {
    height: 100%;
  }
  .app.embed .app-body {
    position: relative;
    inset: auto;
    overflow: visible;
    padding: 0;
  }
  .app.embed .app-stage {
    position: relative;
    inset: auto;
  }
  .app.embed .app-stage .frame {
    height: auto;
    aspect-ratio: var(--sc-ar, 16 / 9);
  }
  .app.embed .app-stage .frame:fullscreen {
    aspect-ratio: auto;
  }
  .app-stage[hidden] {
    display: none;
  }
  .app-stage:fullscreen {
    background: #000;
  }
  .app-stage:fullscreen .frame {
    height: 100%;
    aspect-ratio: auto;
    border-radius: 0;
  }
  .app .mvwrap {
    position: absolute;
    inset: 0;
    z-index: 6;
    background: #000;
    display: flex;
  }
  .app .mvwrap > * {
    flex: 1;
  }

  /* bias light: the picture's colours spill onto the wall behind it */
  .app[data-view='now'] .app-stage::before {
    content: '';
    position: absolute;
    left: -6%;
    top: -14%;
    width: 112%;
    height: 128%;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(55% 55% at 30% 40%, var(--a1, var(--t1, transparent)), transparent 70%),
      radial-gradient(50% 55% at 75% 72%, var(--a2, var(--t2, transparent)), transparent 70%);
    filter: blur(60px);
    opacity: 0.45;
    animation: sc-amb 10s ease-in-out infinite alternate;
    transition: background 0.8s;
  }
  @keyframes sc-amb {
    to {
      transform: translate(1.5%, 2%) scale(1.04);
      opacity: 0.55;
    }
  }
  .app.lite[data-view='now'] .app-stage::before {
    filter: none;
    opacity: 0.16;
    animation: none;
  }

  /* ---------- band ---------- */
  .band {
    grid-area: band;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    margin-bottom: 22px;
  }
  .band h2 {
    font-family: var(--f-display);
    font-weight: 300;
    font-size: 52px;
    letter-spacing: -0.035em;
    line-height: 1;
    margin: 8px 0 10px;
  }
  .band h2 em {
    font-style: normal;
    color: var(--tv);
  }
  .band p {
    margin: 0;
    color: var(--muted);
    font-size: 16px;
  }
  .band .clock {
    font-family: var(--f-display);
    font-weight: 300;
    font-size: 46px;
    letter-spacing: -0.03em;
    line-height: 1;
    text-align: right;
    font-variant-numeric: tabular-nums;
    flex: none;
  }
  .band .clock small {
    display: block;
    font-family: var(--f-mono);
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--faint);
    margin-top: 8px;
  }

  /* ---------- hero overlay ---------- */
  .app .over {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 20px 22px;
    background: linear-gradient(
      rgba(0, 0, 0, 0.35),
      transparent 30%,
      transparent 50%,
      rgba(0, 0, 0, 0.78)
    );
    pointer-events: none;
  }
  .app .over > *,
  .app .pover > * {
    pointer-events: auto;
  }
  .app .over .r {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
  }
  .app .idl {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .app .idl .lp.xl {
    height: 26px;
  }
  .app .idl .lab {
    color: rgba(255, 255, 255, 0.8);
  }
  .app .over h3 {
    font-family: var(--f-display);
    font-weight: 300;
    font-size: 38px;
    letter-spacing: -0.03em;
    margin: 6px 0 4px;
    line-height: 1;
  }
  .app .over .meta {
    color: rgba(255, 255, 255, 0.78);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }
  .app .over .bar {
    margin-top: 12px;
    max-width: 360px;
  }
  .app .hb {
    display: flex;
    gap: 6px;
  }
  .app .hb button {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: grid;
    place-items: center;
  }

  /* guide preview overlay */
  .app .tl {
    position: absolute;
    left: 16px;
    top: 16px;
    z-index: 2;
    display: flex;
    gap: 8px;
  }
  .app .pover {
    position: absolute;
    inset: auto 0 0 0;
    padding: 18px 20px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.72));
    z-index: 2;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    pointer-events: none;
  }
  .app .pover .pt {
    display: grid;
    gap: 8px;
    min-width: 0;
  }
  .app .pover .t {
    font-family: var(--f-display);
    font-weight: 500;
    font-size: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ---------- favourites and tiles ---------- */
  .favs {
    grid-area: favs;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto minmax(0, 1fr) minmax(0, 1fr);
    gap: 12px;
    contain: size;
    position: relative;
    z-index: 1;
  }
  .favs .h {
    grid-column: 1/-1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .favs .ttile {
    min-height: 0;
  }
  .favs .ttile .th {
    flex: 1 1 0;
    aspect-ratio: auto;
    min-height: 0;
  }
  .ttile {
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    -webkit-touch-callout: none;
    user-select: none;
  }
  .ttile .th {
    position: relative;
    aspect-ratio: 16 / 9;
    border-radius: 14px;
    overflow: hidden;
    background: #000;
    box-shadow: 0 0 0 1px var(--hair);
  }
  .ttile.on .th {
    box-shadow: 0 0 0 2px var(--tv);
  }
  .ttile .th .tbar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
    border-radius: 0;
    height: 3px;
  }
  .ttile .tt {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ttile .ts {
    font-size: 12px;
    color: var(--faint);
    font-family: var(--f-mono);
    margin-top: -6px;
    position: relative;
    overflow: hidden;
    height: 1.4em;
    line-height: 1.4em;
    font-variant-numeric: tabular-nums;
  }
  .ttile .ts span {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition:
      transform 0.24s var(--ease),
      opacity 0.24s;
  }
  .ttile .ts .b {
    position: absolute;
    inset: 0;
    opacity: 0;
    transform: translateY(100%);
    color: var(--muted);
  }
  @media (hover: hover) {
    .ttile:hover .ts .a {
      opacity: 0;
      transform: translateY(-100%);
    }
    .ttile:hover .ts .b {
      opacity: 1;
      transform: none;
    }
    .ttile:hover .th.lt img {
      transform: scale(1.04);
    }
  }
  .ttile:focus-visible .ts .a {
    opacity: 0;
    transform: translateY(-100%);
  }
  .ttile:focus-visible .ts .b {
    opacity: 1;
    transform: none;
  }
  .th.lt {
    display: grid;
    place-items: center;
    background:
      radial-gradient(
        110% 90% at 28% 18%,
        color-mix(in srgb, var(--c1) 34%, transparent),
        transparent 62%
      ),
      linear-gradient(160deg, #181b23, #0d0f14);
  }
  .th.lt img {
    max-width: 54%;
    max-height: 40%;
    object-fit: contain;
    filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.55));
    transition: transform 0.24s var(--ease);
  }
  .th .ini.big {
    font-family: var(--f-display);
    font-size: 30px;
    font-weight: 300;
  }
  .th.add {
    display: grid;
    place-items: center;
    background: var(--surface);
    color: var(--muted);
  }
  .th .wat {
    position: absolute;
    left: 8px;
    top: 8px;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--f-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    padding: 4px 9px;
    border-radius: 99px;
  }
  .th .when {
    position: absolute;
    right: 8px;
    top: 8px;
    z-index: 2;
    font-family: var(--f-mono);
    font-size: 11px;
    padding: 4px 9px;
    border-radius: 99px;
  }
  .lvc {
    position: absolute;
    right: 8px;
    top: 8px;
    z-index: 2;
    font-family: var(--f-mono);
    font-size: 10px;
    letter-spacing: 0.12em;
    padding: 3px 8px;
    border-radius: 99px;
    background: var(--live);
    color: #fff;
  }
  .lvc.left {
    right: auto;
    left: 8px;
  }

  /* rails */
  .rails {
    grid-area: rails;
  }
  .railh {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 30px 0 12px;
  }
  .railh h4 {
    margin: 0;
    font-family: var(--f-display);
    font-weight: 500;
    font-size: 20px;
    letter-spacing: -0.01em;
  }
  .railr {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: calc((100% - 3 * 14px) / 4);
    gap: 14px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    padding: 2px;
    margin: -2px;
  }
  .railr::-webkit-scrollbar {
    display: none;
  }
  .railr > * {
    scroll-snap-align: start;
  }

  /* ---------- guide ---------- */
  .det {
    grid-area: det;
    background: var(--surface);
    border: 1px solid var(--hair);
    border-radius: 20px;
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    font-variant-numeric: tabular-nums;
  }
  .det .dh {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .det h3 {
    font-family: var(--f-display);
    font-weight: 500;
    font-size: 28px;
    letter-spacing: -0.02em;
    margin: 10px 0 4px;
    line-height: 1.1;
  }
  .det .meta {
    color: var(--muted);
    font-size: 14px;
  }
  .det .bar {
    margin-top: 14px;
  }
  .det .desc {
    color: var(--muted);
    font-size: 14px;
    margin: 12px 0 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .det .then {
    display: grid;
    gap: 2px;
    margin-top: 12px;
  }
  .det .then div {
    display: grid;
    grid-template-columns: 52px 1fr;
    font-size: 13px;
    color: var(--muted);
    padding: 3px 0;
  }
  .det .then .mono {
    color: var(--faint);
  }
  .det .acts {
    display: flex;
    gap: 8px;
    margin-top: auto;
    padding-top: 16px;
    flex-wrap: wrap;
  }
  .app .btn {
    height: 44px;
    padding: 0 16px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    background: var(--surface-2);
    color: var(--text);
  }
  .app .btn svg.icon {
    width: 18px;
    height: 18px;
  }
  .app .btn.pri {
    background: var(--tv);
    color: var(--on-accent);
  }
  .app .btn.done {
    background: rgba(126, 224, 210, 0.14);
    color: var(--info);
    box-shadow: inset 0 0 0 1px rgba(126, 224, 210, 0.4);
  }
  .app .btn[aria-pressed='true'] svg {
    color: #f5b83d;
  }
  .app .btn[disabled] {
    cursor: default;
  }
  .tool {
    grid-area: tool;
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }
  .tool .jumps {
    display: flex;
    gap: 6px;
    flex: none;
  }
  .app .gchips {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    min-width: 0;
    flex: 1;
    -webkit-mask: linear-gradient(90deg, #000 calc(100% - 40px), transparent);
    mask: linear-gradient(90deg, #000 calc(100% - 40px), transparent);
  }
  .app .gchips::-webkit-scrollbar {
    display: none;
  }
  .app .gc {
    height: 34px;
    padding: 0 13px;
    border-radius: 99px;
    font-size: 13px;
    font-weight: 500;
    background: var(--surface-2);
    color: var(--muted);
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
  }
  .app .gc[aria-pressed='true'] {
    background: var(--tv);
    color: var(--on-accent);
  }
  .app .gc svg.icon {
    width: 14px;
    height: 14px;
  }
  .app .search {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 44px;
    border-radius: 14px;
    padding: 0 14px;
    background: var(--surface-2);
    color: var(--faint);
    font-size: 14px;
    flex: none;
    width: 260px;
    box-sizing: border-box;
  }
  .app .search svg.icon {
    width: 18px;
    height: 18px;
  }
  .app .search input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
    background: none;
    color: var(--text);
    font: inherit;
  }
  .app .search input::placeholder {
    color: var(--faint);
  }
  .app .search:focus-within {
    box-shadow: inset 0 0 0 2px var(--tv);
  }
  .grid {
    grid-area: grid;
    position: relative;
    border-radius: 18px 18px 0 0;
    border: 1px solid var(--hair);
    border-bottom: 0;
    background: var(--surface);
    overflow: hidden;
    -webkit-mask: linear-gradient(#000 calc(100% - 190px), transparent calc(100% - 110px));
    mask: linear-gradient(#000 calc(100% - 190px), transparent calc(100% - 110px));
  }
  .gscroll {
    position: absolute;
    inset: 0;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
  }
  .gin {
    position: relative;
  }
  .ruler {
    position: sticky;
    top: 0;
    z-index: 4;
    height: 32px;
    background: #12151c;
    border-bottom: 1px solid var(--hair);
  }
  .ruler .corner {
    position: sticky;
    left: 0;
    top: 0;
    display: block;
    width: var(--nw, 196px);
    height: 31px;
    background: #12151c;
    border-right: 1px solid var(--hair);
    z-index: 6;
  }
  .ruler span {
    position: absolute;
    top: 9px;
    font-family: var(--f-mono);
    font-size: 11px;
    color: var(--faint);
    transform: translateX(6px);
  }
  .ruler span::before {
    content: '';
    position: absolute;
    left: -6px;
    top: -9px;
    height: 32px;
    width: 1px;
    background: var(--hair);
  }
  .ruler span.gone {
    visibility: hidden;
  }
  .ruler .nowtag {
    top: 6px;
    z-index: 5;
    transform: translateX(-50%);
    color: #fff;
    background: var(--live);
    padding: 1px 6px;
    border-radius: 6px;
  }
  .ruler .nowtag::before {
    display: none;
  }
  .grow {
    position: absolute;
    left: 0;
    height: 52px;
    border-bottom: 1px solid var(--hair);
    box-sizing: border-box;
  }
  .app .gname {
    position: sticky;
    left: 0;
    z-index: 3;
    width: var(--nw, 196px);
    height: 51px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 12px;
    background: #12151c;
    border-right: 1px solid var(--hair);
    font-size: 13px;
    font-weight: 600;
    text-align: left;
    box-sizing: border-box;
  }
  .app .gname .gn {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .app .gname .mono {
    color: var(--faint);
    font-weight: 400;
    font-size: 11px;
    display: block;
  }
  .app .gname.on {
    box-shadow: inset 3px 0 0 var(--tv);
  }
  .cell {
    position: absolute;
    top: 5px;
    height: 41px;
    border-radius: 10px;
    padding: 5px 10px !important;
    background: var(--surface-2) !important;
    font-size: 13px;
    overflow: clip;
    white-space: nowrap;
    text-align: left;
    color: var(--text);
    box-sizing: border-box;
    display: block;
    line-height: 1.35;
  }
  .cell small {
    display: block;
    font-family: var(--f-mono);
    font-size: 10px;
    color: var(--faint);
    letter-spacing: 0.04em;
  }
  .cell .cx {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-left: var(--sh, 0px);
    transition: opacity 0.16s;
  }
  .cell.gone .cx {
    opacity: 0;
  }
  .cell.past {
    opacity: 0.45;
  }
  .cell.now {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--tv) 20%, transparent) var(--p),
      rgba(255, 255, 255, 0.075) var(--p)
    ) !important;
  }
  .cell.sel {
    box-shadow: inset 0 0 0 2px var(--tv);
  }
  .cell.empty {
    color: var(--faint);
    background: none !important;
  }
  .cell .lvd {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--live);
    margin-right: 6px;
    vertical-align: 1px;
  }
  .nowline {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--live);
    z-index: 2;
    pointer-events: none;
  }

  /* ---------- channels ---------- */
  .bar2 {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 16px;
  }
  .bar2 .search {
    width: 340px;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px 14px;
  }
  .app .row {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    padding: 9px 8px;
    border-radius: 14px;
    text-align: left;
    -webkit-touch-callout: none;
    user-select: none;
  }
  .cols .row {
    background: var(--surface);
    border: 1px solid var(--hair);
  }
  .app .row:hover {
    background: rgba(255, 255, 255, 0.06);
  }
  .app .row.on {
    background: var(--tv-soft);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tv) 45%, transparent);
  }
  .app .row .lp {
    width: 76px;
    min-width: 0;
    max-width: none;
  }
  .app .row .rm {
    display: grid;
    min-width: 0;
  }
  .app .row .nm {
    display: flex;
    gap: 8px;
    align-items: baseline;
    font-weight: 600;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
  }
  .app .row .nm .mono {
    font-size: 12px;
    color: var(--glass-muted);
    font-weight: 400;
  }
  .app .row .fav svg {
    width: 12px;
    height: 12px;
    color: #f5b83d;
  }
  .app .row .pg {
    font-size: 13px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 1px 0 6px;
  }
  .app .row .bar {
    height: 2px;
  }
  .app .row .nx {
    font-size: 12px;
    color: var(--faint);
    text-align: right;
    white-space: nowrap;
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .app .row .nx .mono {
    display: block;
    color: var(--glass-muted);
  }

  /* ---------- theatre ---------- */
  .app .scrim {
    position: absolute;
    left: 0;
    right: 0;
    pointer-events: none;
    transition: opacity 0.24s var(--ease);
    z-index: 2;
  }
  .app .scrim.t {
    top: 0;
    height: 300px;
    background: linear-gradient(rgba(5, 6, 10, 0.78), rgba(5, 6, 10, 0.35) 55%, transparent);
  }
  .app .scrim.b {
    bottom: 0;
    height: 220px;
    background: linear-gradient(transparent, rgba(5, 6, 10, 0.7));
  }
  .app .fade {
    transition:
      opacity 0.24s var(--ease),
      transform 0.24s var(--ease);
  }
  .app .frame.calm .fade,
  .app .frame.calm .scrim,
  .app .frame.calm .dockpill {
    opacity: 0;
    pointer-events: none;
  }
  .app .frame.calm .fade {
    transform: translateY(8px);
  }
  .app .frame.calm .t-ctl {
    transform: translate(-50%, 10px);
  }
  .app[data-view='full'] .frame.calm {
    cursor: none;
  }
  .app .t-ident {
    position: absolute;
    left: 48px;
    top: 40px;
    width: min(560px, calc(100% - 96px));
    z-index: 3;
  }
  .app .t-ident .row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0;
  }
  .app .t-ident .row:hover {
    background: none;
  }
  .app .t-ident .row .lab {
    color: var(--glass-muted);
  }
  .app .t-ident h3 {
    font-family: var(--f-display);
    font-weight: 300;
    font-size: 56px;
    line-height: 1;
    letter-spacing: -0.03em;
    margin: 18px 0 10px;
    text-wrap: balance;
  }
  .app .t-ident .meta {
    color: var(--glass-muted);
    font-size: 16px;
    font-variant-numeric: tabular-nums;
  }
  .app .t-ident .bar {
    margin: 16px 0 14px;
    width: 340px;
    max-width: 100%;
  }
  .app .t-ident .next {
    display: flex;
    gap: 12px;
    align-items: baseline;
    font-size: 16px;
    color: var(--glass-muted);
  }
  .app .t-ident .next .lab {
    color: var(--glass-muted);
  }
  .app .tr {
    position: absolute;
    right: 40px;
    top: 36px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
    z-index: 3;
  }
  .app .tr .clock {
    font-family: var(--f-display);
    font-weight: 300;
    font-size: 46px;
    letter-spacing: -0.03em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .app .tr .chips {
    display: flex;
    gap: 8px;
  }
  .app .chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 13px;
    border-radius: 99px;
    font-size: 13px;
    font-weight: 500;
  }
  .app .chip svg.icon {
    width: 16px;
    height: 16px;
  }
  .app .t-ctl {
    position: absolute;
    left: 50%;
    bottom: 28px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 4px;
    height: 68px;
    padding: 0 10px;
    border-radius: 24px;
    z-index: 4;
    max-width: calc(100% - 24px);
    box-sizing: border-box;
  }
  .app .cb {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    color: #fff;
    position: relative;
    flex: none;
  }
  .app .cb:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .app .cb[aria-pressed='true'] {
    background: var(--tv-soft);
    color: var(--tv);
  }
  .app .cb.wide {
    width: auto;
    padding: 0 14px;
    display: flex;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    align-items: center;
  }
  .app .cb.wide span {
    line-height: 1.2;
    text-align: left;
    white-space: nowrap;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .app .cb.wide small {
    color: var(--glass-muted);
    font-size: 12px;
    font-family: var(--f-mono);
  }
  .app .cb.main {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #fff;
    color: #0b0d12;
  }
  .app .sep {
    width: 1px;
    height: 30px;
    background: rgba(255, 255, 255, 0.14);
    margin: 0 6px;
    flex: none;
  }
  .app .vol {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 8px 0 0;
  }
  .app .vtrack {
    -webkit-appearance: none;
    appearance: none;
    width: 96px;
    height: 4px;
    border-radius: 4px;
    background: linear-gradient(90deg, #fff var(--vol), rgba(255, 255, 255, 0.2) var(--vol));
    margin: 0;
    cursor: pointer;
  }
  .app .vtrack::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  }
  .app .vtrack::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border: 0;
    border-radius: 50%;
    background: #fff;
  }
  @keyframes sc-in {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
  }
  .app .rail {
    position: absolute;
    right: 20px;
    top: 20px;
    bottom: 110px;
    width: 400px;
    max-width: calc(100% - 40px);
    border-radius: 26px;
    padding: 18px 14px 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: sc-in 0.42s var(--ease);
    z-index: 6;
    box-sizing: border-box;
  }
  .app .rail .hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 6px;
  }
  .app .rail .hd h4 {
    margin: 0;
    font-family: var(--f-display);
    font-weight: 500;
    font-size: 20px;
  }
  .app .rail .search {
    width: auto;
    background: rgba(255, 255, 255, 0.07);
  }
  .app .rail .gchips {
    flex: none;
  }
  .app .rail .gc:not([aria-pressed='true']) {
    background: rgba(255, 255, 255, 0.07);
    color: var(--glass-muted);
  }
  .app .rail .list {
    flex: 1;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0 -4px;
    padding: 0 4px;
    scrollbar-width: none;
  }
  .app .rail .row {
    grid-template-columns: 64px minmax(0, 1fr) auto;
  }
  .app .rail .row .lp {
    width: 64px;
  }
  .app .x {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: rgba(255, 255, 255, 0.08);
  }
  .app .t-osd {
    position: absolute;
    right: 48px;
    top: 130px;
    text-align: right;
    animation: sc-in 0.24s var(--ease);
    z-index: 4;
  }
  .app .t-osd .d {
    font-family: var(--f-display);
    font-weight: 200;
    font-size: 120px;
    line-height: 0.9;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
  }
  .app .t-osd .d span {
    opacity: 0.35;
  }
  .app .t-osd .m {
    color: var(--glass-muted);
    font-size: 15px;
    margin-top: 8px;
  }
  .app .kp {
    position: absolute;
    right: 20px;
    bottom: 110px;
    width: 252px;
    padding: 12px;
    border-radius: 24px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    animation: sc-in 0.24s var(--ease);
    z-index: 6;
    box-sizing: border-box;
  }
  .app .kp button {
    height: 56px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.07);
    font-family: var(--f-display);
    font-size: 24px;
    font-weight: 300;
  }
  .app .kp button:hover {
    background: rgba(255, 255, 255, 0.14);
  }
  .app .menu {
    position: absolute;
    bottom: 108px;
    left: 50%;
    padding: 14px;
    border-radius: 22px;
    width: 300px;
    transform: translateX(30px);
    animation: sc-in 0.24s var(--ease);
    z-index: 6;
    box-sizing: border-box;
  }
  .app .menu .lab {
    display: block;
    margin: 2px 4px 10px;
    color: var(--glass-muted);
  }
  .app .menu .opts {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
  .app .menu .opts button {
    min-height: 46px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.07);
    font-size: 14px;
    font-weight: 500;
    padding: 6px 10px;
  }
  .app .menu .opts button[aria-pressed='true'] {
    background: var(--tv);
    color: var(--on-accent);
  }
  .app .menu .opts button.full {
    grid-column: 1/-1;
  }
  .app .menu .opts small {
    display: block;
    font-size: 11px;
    font-family: var(--f-mono);
    opacity: 0.75;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .app .setwrap .settings-panel {
    position: absolute;
    right: 40px;
    top: 130px;
    bottom: auto;
    z-index: 6;
  }
  .app .dockpill {
    position: absolute;
    right: 18px;
    bottom: 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 58px;
    padding: 0 16px 0 7px;
    border-radius: 99px;
    z-index: 4;
    transition: opacity 0.24s var(--ease);
  }
  .app .orb {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: radial-gradient(
      circle at 35% 30%,
      color-mix(in srgb, var(--tv) 45%, #fff),
      var(--tv) 55%,
      color-mix(in srgb, var(--tv) 70%, #000)
    );
    color: var(--on-accent);
    box-shadow: 0 0 18px color-mix(in srgb, var(--tv) 50%, transparent);
    flex: none;
  }
  .app .dockpill .t,
  .app .cdock .orbw .t {
    font-family: var(--f-mono);
    font-size: 12px;
    letter-spacing: 0.06em;
  }

  /* zap ident and number entry */
  .app .zap {
    position: absolute;
    inset: 0;
    z-index: 3;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 10px;
    pointer-events: none;
    background: radial-gradient(40% 50% at 50% 50%, rgba(0, 0, 0, 0.45), transparent 70%);
    animation: sc-zap 0.9s var(--ease) both;
  }
  .app .zap img {
    height: 56px;
    width: auto;
    max-width: 46%;
    object-fit: contain;
    filter: drop-shadow(0 6px 24px rgba(0, 0, 0, 0.6));
  }
  .app .zap b {
    font-family: var(--f-display);
    font-weight: 300;
    font-size: 40px;
  }
  .app .zap span {
    font-family: var(--f-mono);
    font-size: 12px;
    letter-spacing: 0.12em;
    color: rgba(255, 255, 255, 0.8);
  }
  @keyframes sc-zap {
    0% {
      opacity: 0;
      transform: scale(0.94);
    }
    18% {
      opacity: 1;
      transform: none;
    }
    70% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: scale(1.02);
    }
  }
  .app .numosd {
    position: absolute;
    right: 18px;
    top: 18px;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 18px 12px 16px;
    border-radius: 18px;
    animation: sc-in 0.24s var(--spring);
  }
  .app .numosd .d {
    font-family: var(--f-mono);
    font-size: 26px;
    letter-spacing: 0.12em;
  }
  .app .numosd .nm {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.25;
  }
  .app .numosd .nm small {
    display: block;
    font-weight: 400;
    color: var(--muted);
    font-size: 12px;
  }
  .app .numosd .dim {
    color: var(--muted);
  }
  .app .toast {
    position: absolute;
    left: 50%;
    top: 28px;
    transform: translateX(-50%);
    padding: 10px 16px;
    border-radius: 99px;
    font-size: 14px;
    font-weight: 500;
    z-index: 40;
    animation: sc-in 0.24s var(--ease);
  }

  /* the card's state layers (tuning, errors) inside the app's frames */
  .app .frame .layer {
    z-index: 3;
  }
  /* The zap ident and the app's own ident name the channel; tuning keeps only its spinner. */
  .app .layer.tuning .tuning-logo,
  .app .layer.tuning .tuning-name {
    display: none;
  }
  .app .layer.tuning .tuning-status {
    transform: translateY(56px);
  }
  .app[data-view='full'] .layer.tuning .tuning-status {
    transform: translateY(84px);
  }

  /* ---------- dock ---------- */
  .app .cdock {
    position: absolute;
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
    height: 72px;
    padding: 0 10px 0 9px;
    border-radius: 99px;
    z-index: 30;
    animation: sc-dock 0.5s var(--spring);
  }
  @keyframes sc-dock {
    from {
      opacity: 0;
      translate: 0 16px;
      scale: 0.92;
    }
  }
  .app .cdock .orbw {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-right: 12px;
    margin-right: 4px;
    border-right: 1px solid rgba(255, 255, 255, 0.14) !important;
    height: 44px;
  }
  .app .cdock .tab {
    height: 52px;
    padding: 0 16px;
    border-radius: 99px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--glass-muted);
  }
  .app .cdock .tab.sel {
    color: #fff;
    background: color-mix(in srgb, var(--tv) 20%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--tv) 50%, transparent),
      0 6px 20px color-mix(in srgb, var(--tv) 25%, transparent);
  }

  /* ---------- embed (FPL Home) ---------- */
  .app.embed .t-ctl {
    bottom: 18px;
    height: 60px;
  }
  .app.embed .cb {
    width: 46px;
    height: 46px;
  }
  .app.embed .cb.main {
    width: 50px;
    height: 50px;
  }

  /* ---------- narrow screens (phones) ---------- */
  @container app (max-width: 760px) {
    .app[data-view='now'] .app-body,
    .app[data-view='channels'] .app-body {
      padding: 20px 16px 170px;
    }
    .app[data-view='now'] .app-body {
      display: block;
    }
    .band {
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .band h2 {
      font-size: 36px;
    }
    .band p {
      font-size: 14px;
    }
    .band .clock {
      font-size: 30px;
    }
    .app .over h3 {
      font-size: 24px;
    }
    .app .over {
      padding: 14px;
    }
    .app .over .meta {
      font-size: 12px;
    }
    .app .hb button {
      width: 40px;
      height: 40px;
    }
    .favs {
      contain: none;
      margin-top: 18px;
      grid-template-columns: none;
      grid-template-rows: none;
      grid-auto-flow: column;
      grid-auto-columns: 200px;
      gap: 14px;
      overflow-x: auto;
      scrollbar-width: none;
      scroll-snap-type: x mandatory;
      padding-top: 30px;
    }
    .favs .h {
      grid-column: auto;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
    }
    .favs .ttile {
      min-height: auto;
      scroll-snap-align: start;
    }
    .favs .ttile .th {
      flex: none;
      aspect-ratio: 16 / 9;
    }
    .railr {
      grid-auto-columns: 200px;
    }
    .app[data-view='guide'] .app-body {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto auto minmax(0, 1fr);
      grid-template-areas: 'stage' 'det' 'tool' 'grid';
      padding: 12px 12px 0;
      gap: 10px;
    }
    .det {
      padding: 12px 14px;
    }
    .det h3 {
      font-size: 20px;
      margin: 6px 0 2px;
    }
    .det .desc,
    .det .then {
      display: none;
    }
    .det .acts {
      padding-top: 10px;
    }
    .tool {
      flex-wrap: wrap;
      gap: 8px;
    }
    .tool .jumps {
      display: none;
    }
    .app .search,
    .bar2 .search {
      width: 100%;
    }
    .gin {
      --nw: 120px;
    }
    .gname .lp {
      display: none;
    }
    .bar2 {
      flex-direction: column;
      align-items: stretch;
    }
    .cols {
      grid-template-columns: minmax(0, 1fr);
    }
    .app .t-ident {
      left: 18px;
      top: 18px;
    }
    .app .t-ident h3 {
      font-size: 30px;
      margin: 10px 0 6px;
    }
    .app .t-ident .meta,
    .app .t-ident .next {
      font-size: 13px;
    }
    .app .tr {
      right: 16px;
      top: 16px;
    }
    .app .tr .clock {
      font-size: 28px;
    }
    .app .tr .chips {
      display: none;
    }
    .app .t-ctl {
      bottom: 86px;
      height: 58px;
      gap: 0;
      padding: 0 6px;
    }
    .app .cb {
      width: 42px;
      height: 42px;
    }
    .app .cb.main {
      width: 46px;
      height: 46px;
    }
    .app .cb.wide span,
    .app .t-ctl .cb.kpb,
    .app .t-ctl .cb.mvb,
    .app .vtrack,
    .app .t-ctl .sep {
      display: none;
    }
    .app .cb.wide {
      padding: 0 9px;
    }
    .app .dockpill {
      left: 16px;
      right: 16px;
      bottom: 16px;
      justify-content: center;
    }
    .app .cdock {
      left: 12px;
      right: 12px;
      bottom: 16px;
      transform: none;
      height: 64px;
      justify-content: space-around;
      padding: 0 8px;
    }
    .app .cdock .orbw {
      border: 0 !important;
      padding: 0;
      margin: 0;
    }
    .app .cdock .orbw .t,
    .app .cdock .tab span {
      display: none;
    }
    .app .cdock .tab {
      width: 48px;
      height: 48px;
      padding: 0;
      justify-content: center;
    }
    .app .rail,
    .app .kp {
      right: 10px;
      left: 10px;
      width: auto;
      bottom: 156px;
    }
    .app .menu {
      left: 10px;
      right: 10px;
      width: auto;
      transform: none;
      bottom: 156px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .app .zap {
      animation-duration: 0.01ms;
    }
    .app[data-view='now'] .app-stage::before,
    .app .live::before,
    .app .eq i {
      animation: none;
    }
  }
`;
