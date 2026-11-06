import type { Channel, ChannelList } from '../channels';
import type { GuideFeed, Programme } from '../epg';

/**
 * Data helpers for the app layout (`chrome: app`): programmes per channel, the rails on the
 * Lineup, groups without their provider prefix, device favourites and logo colours.
 */

export const MIN = 60_000;

/** "Sky: Entertainment" → "Entertainment". */
export function groupLabel(g: string | undefined): string {
  if (!g) return '';
  const i = g.indexOf(': ');
  return i > 0 && i < g.length - 2 ? g.slice(i + 2) : g;
}

/** "Sky Sports Main Event UHD" → "Sky Sports Main Event". */
export function shortName(ch: Channel): string {
  return ch.name.replace(/\s+(HD|UHD|FHD|SD|4K)$/i, '').trim() || ch.name;
}

export function programmes(guide: GuideFeed | undefined, ch: Channel): Programme[] {
  return guide?.programmes(ch) ?? [];
}

export function onAt(list: Programme[], at: number): Programme | undefined {
  return list.find((p) => (p.start ?? 0) <= at && (p.end === undefined || p.end > at));
}

export function after(list: Programme[], at: number): Programme | undefined {
  return list.find((p) => (p.start ?? 0) > at);
}

export function pct(p: Programme | undefined, at: number): number {
  if (p?.start === undefined || p.end === undefined || p.end <= p.start) return 0;
  return Math.max(0, Math.min(100, ((at - p.start) / (p.end - p.start)) * 100));
}

/** "8 min", "1 h 05 m", "1 h" */
export function left(ms: number): string {
  const m = Math.max(0, Math.ceil(ms / MIN));
  if (m < 60) return `${m} min`;
  const r = m % 60;
  return `${Math.floor(m / 60)} h${r ? ` ${r} m` : ''}`;
}

/** 24-hour clock in the device's time zone. */
export function hm(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function genre(p: Programme | undefined): string {
  if (!p?.cats?.length) return '';
  const [a, b] = p.cats;
  if (/^movies?$/i.test(a)) return b ? `Film · ${b}` : 'Film';
  return b && !/^(entertainment|sports?)$/i.test(b) ? b : b || a;
}

export type Kind = 'sport' | 'film' | 'news' | 'kids' | 'other';

export function kindOf(ch: Channel): Kind {
  const s = `${ch.group ?? ''} ${ch.name}`;
  if (/sport|football|golf|racing|tnt|dazn|eurosport/i.test(s)) return 'sport';
  if (/movie|cinema|film/i.test(s)) return 'film';
  if (/news|bloomberg|cnbc|parliament/i.test(s)) return 'news';
  if (/kid|child|cartoon|nick|disney|cbeebies|cbbc/i.test(s)) return 'kids';
  return 'other';
}

export const isFilm = (p: Programme, ch: Channel): boolean =>
  /^movies?$/i.test(p.cats?.[0] ?? '') ||
  (kindOf(ch) === 'film' && (p.end ?? 0) - (p.start ?? 0) >= 75 * MIN);

/** Titles that are fillers on sport channels, not events worth a tile. */
const SPORT_FILLER =
  /sports? news|stories|greatest|revisited|retro|classics?|highlights|magazine|show$/i;

export interface Slot {
  ch: Channel;
  p: Programme;
}

/** Programmes worth a tile, soonest first (live ones count as "now"), one per title. */
export function pick(
  list: ChannelList,
  guide: GuideFeed | undefined,
  at: number,
  test: (p: Programme, ch: Channel) => boolean,
  limit: number,
): Slot[] {
  const out: Slot[] = [];
  for (const ch of list.channels) {
    for (const p of programmes(guide, ch)) {
      if ((p.end ?? Infinity) <= at + 5 * MIN) continue;
      if (test(p, ch)) out.push({ ch, p });
    }
  }
  out.sort(
    (a, b) =>
      Math.max(a.p.start ?? 0, at) - Math.max(b.p.start ?? 0, at) ||
      Number(!!b.p.live) - Number(!!a.p.live) ||
      Number(a.ch.number ?? 1e9) - Number(b.ch.number ?? 1e9),
  );
  const seen = new Set<string>();
  return out
    .filter((s) => {
      const k = s.p.title.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, limit);
}

export function sportSlots(list: ChannelList, guide: GuideFeed | undefined, at: number): Slot[] {
  const horizon = at + 6 * 60 * MIN;
  return pick(
    list,
    guide,
    at,
    (p, ch) =>
      (p.start ?? 0) < horizon &&
      (kindOf(ch) === 'sport' || /^sports?$/i.test(p.cats?.[0] ?? '')) &&
      (!!p.live || !SPORT_FILLER.test(p.title)),
    8,
  );
}

export function filmSlots(list: ChannelList, guide: GuideFeed | undefined, at: number): Slot[] {
  const horizon = at + 7 * 60 * MIN;
  return pick(
    list,
    guide,
    at,
    (p, ch) => isFilm(p, ch) && (p.start ?? 0) >= at - 20 * MIN && (p.start ?? 0) < horizon,
    8,
  );
}

/** The headline for the fact sentence: the next live event on a sport channel, live first. */
export function headline(
  list: ChannelList,
  guide: GuideFeed | undefined,
  at: number,
): Slot | undefined {
  const day = at + 10 * 60 * MIN;
  return pick(
    list,
    guide,
    at,
    (p, ch) =>
      !!p.live &&
      kindOf(ch) === 'sport' &&
      (p.start ?? 0) < day &&
      (p.end ?? 0) - (p.start ?? 0) >= 90 * MIN,
    1,
  )[0];
}

// ---- device favourites ----

interface FavEdits {
  add: string[];
  remove: string[];
}

const favKey = (target: string) => `stream-card:favourites:${target}`;

function readFavEdits(target: string): FavEdits {
  try {
    const raw = JSON.parse(
      localStorage.getItem(favKey(target)) ?? 'null',
    ) as Partial<FavEdits> | null;
    return { add: raw?.add ?? [], remove: raw?.remove ?? [] };
  } catch {
    return { add: [], remove: [] };
  }
}

/** The card's YAML favourites plus the ones added on this device, minus the ones removed. */
export function favourites(list: ChannelList, target: string): Channel[] {
  const e = readFavEdits(target);
  const out = list.favourites.filter((c) => !e.remove.includes(c.id));
  for (const id of e.add) {
    const c = list.find(id);
    if (c && !out.includes(c)) out.push(c);
  }
  return out;
}

export function toggleFavourite(list: ChannelList, target: string, ch: Channel): boolean {
  const e = readFavEdits(target);
  const on = favourites(list, target).includes(ch);
  e.add = e.add.filter((id) => id !== ch.id);
  e.remove = e.remove.filter((id) => id !== ch.id);
  const yaml = list.favourites.includes(ch);
  if (on && yaml) e.remove.push(ch.id);
  if (!on && !yaml) e.add.push(ch.id);
  try {
    if (e.add.length || e.remove.length) localStorage.setItem(favKey(target), JSON.stringify(e));
    else localStorage.removeItem(favKey(target));
  } catch {
    // Private mode: the change lasts until the page reloads.
  }
  return !on;
}

// ---- colours ----

const tints = new Map<string, [string, string] | null | Promise<void>>();

/** A stand-in colour from the name, used until (or unless) the logo gives one. */
export function hashTint(name: string): [string, string] {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  return [`hsl(${hue} 70% 55%)`, `hsl(${(hue + 40) % 360} 60% 45%)`];
}

/**
 * The logo's main colour and a second one, sampled once on a 24 px canvas. Dispatcharr serves
 * logos with CORS, so the canvas stays readable; anything else falls back to the name's colour.
 */
export function tintOf(ch: Channel, onReady: () => void): [string, string] {
  const url = ch.logo;
  if (!url) return hashTint(ch.name);
  const hit = tints.get(url);
  if (Array.isArray(hit)) return hit;
  if (hit === undefined) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    tints.set(
      url,
      new Promise<void>((resolve) => {
        img.onload = () => {
          tints.set(url, sample(img));
          resolve();
          onReady();
        };
        img.onerror = () => {
          tints.set(url, null);
          resolve();
        };
      }),
    );
    img.src = url;
  }
  return hashTint(ch.name);
}

function sample(img: HTMLImageElement): [string, string] | null {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 24;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g) return null;
    g.drawImage(img, 0, 0, 24, 24);
    const d = g.getImageData(0, 0, 24, 24).data;
    const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < d.length; i += 4) {
      const [r, gg, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
      if (a < 128) continue;
      const max = Math.max(r, gg, b);
      const min = Math.min(r, gg, b);
      if (max < 40 || max - min < 40) continue; // greys, black and white say nothing
      const hue = rgbHue(r, gg, b);
      const k = Math.round(hue / 30) % 12;
      const s = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
      s.n++;
      s.r += r;
      s.g += gg;
      s.b += b;
      buckets.set(k, s);
    }
    const top = [...buckets.values()].sort((a, b) => b.n - a.n);
    if (!top.length) return null;
    const css = (s: { n: number; r: number; g: number; b: number }) =>
      `rgb(${Math.round(s.r / s.n)} ${Math.round(s.g / s.n)} ${Math.round(s.b / s.n)})`;
    return [css(top[0]), css(top[1] ?? top[0])];
  } catch {
    return null;
  }
}

function rgbHue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min || 1;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** Two colours from the left and right halves of the picture, for the bias light. */
export function frameTint(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): [string, string] | null {
  if (video.readyState < 2 || !video.videoWidth) return null;
  try {
    canvas.width = 8;
    canvas.height = 4;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    if (!g) return null;
    g.drawImage(video, 0, 0, 8, 4);
    const d = g.getImageData(0, 0, 8, 4).data;
    const half = (x0: number) => {
      let r = 0;
      let gg = 0;
      let b = 0;
      for (let y = 0; y < 4; y++)
        for (let x = x0; x < x0 + 4; x++) {
          const i = (y * 8 + x) * 4;
          r += d[i];
          gg += d[i + 1];
          b += d[i + 2];
        }
      // Lift dark frames a little so the light still reads on a dark wall.
      const k = Math.min(2.2, 220 / Math.max(40, Math.max(r, gg, b) / 16));
      return `rgb(${Math.round((r / 16) * k)} ${Math.round((gg / 16) * k)} ${Math.round((b / 16) * k)})`;
    };
    return [half(0), half(4)];
  } catch {
    return null;
  }
}

/** Fire tablets and other 2 GB devices: no backdrop blur, no glow drift (as the household dash). */
export const LITE =
  (typeof navigator !== 'undefined' &&
    (((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 2 ||
      /KF[A-Z]{2,6}\b|Silk|Kindle/.test(navigator.userAgent))) ||
  false;
