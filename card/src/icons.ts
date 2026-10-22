import { svg, type SVGTemplateResult } from 'lit';

// Stroke icons drawn for the 2.0 design (24 × 24, round caps). `fill` icons are solid shapes.
const P = {
  play: {
    d: 'M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z',
    fill: true,
  },
  stop: {
    d: 'M8.5 6h7A2.5 2.5 0 0 1 18 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 15.5v-7A2.5 2.5 0 0 1 8.5 6z',
    fill: true,
  },
  last: { d: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5' },
  chevronUp: { d: 'M6 15l6-6 6 6' },
  chevronDown: { d: 'M6 9l6 6 6-6' },
  volumeHigh: { d: 'M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13' },
  volumeLow: { d: 'M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7' },
  volumeOff: { d: 'M11 5L6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6' },
  sleep: { d: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z' },
  fullscreen: { d: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5' },
  fullscreenExit: { d: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' },
  guide: { d: 'M4 6h16M4 12h16M4 18h10' },
  grid: { d: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
  multiview: { d: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
  list: { d: 'M4 6h16M4 12h16M4 18h10' },
  search: { d: 'M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM20 20l-3.5-3.5' },
  keypad: {
    d: 'M6 5h.01M12 5h.01M18 5h.01M6 11h.01M12 11h.01M18 11h.01M6 17h.01M12 17h.01M18 17h.01M12 22h.01',
    heavy: true,
  },
  backspace: { d: 'M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zM17 9l-5 5M12 9l5 5' },
  close: { d: 'M6 6l12 12M18 6L6 18' },
  alert: { d: 'M12 3l9.5 17h-19zM12 10v4M12 17h.01' },
  refresh: { d: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5' },
  tv: { d: 'M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM8 3l4 3 4-3' },
  clock: { d: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7v5l3 2' },
  star: { d: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z', fill: true },
} as const satisfies Record<string, { d: string; fill?: boolean; heavy?: boolean }>;

export type IconName = keyof typeof P;

export const icon = (name: IconName): SVGTemplateResult => {
  const p: { d: string; fill?: boolean; heavy?: boolean } = P[name];
  const cls = p.fill ? 'icon fill' : p.heavy ? 'icon heavy' : 'icon';
  return svg`<svg class=${cls} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d=${p.d}></path></svg>`;
};

/** Shared icon styles; every shadow root that uses icon() includes these. */
export const iconStyles = `
  svg.icon {
    width: 22px;
    height: 22px;
    flex: none;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.9;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  svg.icon.fill {
    fill: currentColor;
    stroke: none;
  }
  svg.icon.heavy {
    stroke-width: 3.2;
  }
`;
