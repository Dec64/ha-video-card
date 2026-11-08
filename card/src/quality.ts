import type { QualityRung } from './types';

/**
 * Stream quality: the ladder of Dispatcharr output profiles a card offers (`qualities`), the
 * choice made in the settings panel, and Auto's step-down memory for this device.
 *
 * Auto starts at Source. When a session reports that the device can't keep up (frames dropping,
 * or the reserve running dry while data still arrives), it goes one rung down and stays there
 * for a hold time that grows with each step-down in a day. Once the hold is over, the next start
 * (a channel change, the card coming back on screen, the screen waking) tries one rung higher.
 * Quality is never raised mid-programme: that would cost a visible restart.
 *
 * The memory is one per device, like buffer: auto's level: it's about this device and its link,
 * not about a card. It counts steps down from Source, so cards with different ladders share it.
 */

const KEY = 'stream-card:quality-auto';
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
/** How long a step-down holds, by step-downs in the last day: 30 min, then 2 h, then 8 h. */
export const QUALITY_HOLDS_MS = [HOUR / 2, 2 * HOUR, 8 * HOUR];

export interface AutoQuality {
  /** Steps below Source, counted in each channel's own options. */
  step: number;
  /** Don't try a higher rung before this (epoch ms). */
  until: number;
  /** Step-downs in the day since `since`. */
  strikes: number;
  since: number;
}

const FRESH: AutoQuality = { step: 0, until: 0, strikes: 0, since: 0 };

export function readAutoQuality(): AutoQuality {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...FRESH };
    const r = JSON.parse(raw) as Partial<AutoQuality>;
    const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : 0);
    return {
      step: Math.max(0, Math.round(num(r.step))),
      until: num(r.until),
      strikes: Math.max(0, num(r.strikes)),
      since: num(r.since),
    };
  } catch {
    return { ...FRESH };
  }
}

export function writeAutoQuality(q: AutoQuality): void {
  try {
    if (q.step === 0 && q.strikes === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    /* storage unavailable: Auto still works for this page */
  }
}

/** One step lighter than `from` (an index into the channel's options), at most `lowest`. */
export function stepDown(q: AutoQuality, from: number, lowest: number, now: number): AutoQuality {
  const fresh = now - q.since > DAY;
  const strikes = fresh ? 1 : q.strikes + 1;
  const hold = QUALITY_HOLDS_MS[Math.min(strikes, QUALITY_HOLDS_MS.length) - 1];
  return {
    step: Math.max(0, Math.min(lowest, from + 1)),
    until: now + hold,
    strikes,
    since: fresh ? now : q.since,
  };
}

/** At a fresh start: one step up if the hold is over (strikes stay, so a relapse holds longer). */
export function maybeStepUp(q: AutoQuality, now: number): AutoQuality {
  if (q.step === 0 || now < q.until) return q;
  const strikes = now - q.since > DAY ? 0 : q.strikes;
  return { ...q, step: q.step - 1, until: now + QUALITY_HOLDS_MS[0], strikes };
}

/**
 * What the card has learned about a channel on this device: the height of its own picture, and
 * whether Source needs the format profile (audio this device can't play) or can't be played at
 * all here (e.g. HEVC video), so later starts go straight to something that works.
 */
export interface ChannelInfo {
  h?: number;
  fmt?: boolean;
  noSource?: boolean;
}

const CHANNELS_KEY = 'stream-card:channel-info';
/** Channels remembered; the least recently changed are forgotten first. */
export const CHANNEL_INFO_MAX = 300;

function readAllChannels(): Record<string, ChannelInfo> {
  try {
    const r = JSON.parse(localStorage.getItem(CHANNELS_KEY) ?? '{}') as unknown;
    return r && typeof r === 'object' && !Array.isArray(r)
      ? (r as Record<string, ChannelInfo>)
      : {};
  } catch {
    return {};
  }
}

export function readChannelInfo(key: string): ChannelInfo {
  const r = readAllChannels()[key];
  if (!r || typeof r !== 'object') return {};
  const info: ChannelInfo = {};
  if (typeof r.h === 'number' && r.h > 0) info.h = r.h;
  if (r.fmt === true) info.fmt = true;
  if (r.noSource === true) info.noSource = true;
  return info;
}

export function writeChannelInfo(key: string, patch: ChannelInfo): ChannelInfo {
  const all = readAllChannels();
  const next = { ...readChannelInfo(key), ...patch };
  delete all[key];
  all[key] = next;
  const keys = Object.keys(all);
  for (const k of keys.slice(0, Math.max(0, keys.length - CHANNEL_INFO_MAX))) delete all[k];
  try {
    localStorage.setItem(CHANNELS_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
  return next;
}

/** A rung as offered for one channel: its index in the ladder and the profile it plays. */
export interface QualityOption {
  name: string;
  rung: number;
  outputProfile?: string;
  height?: number;
}

/**
 * The qualities worth offering for a channel: Source, then the rungs below the channel's own
 * height (all of them until that height is known). A rung within 10% of the source's height is
 * the same picture re-encoded, so it's left out too.
 */
export function channelOptions(
  ladder: QualityRung[],
  info: ChannelInfo,
  formatProfile: string | undefined,
): QualityOption[] {
  const h = info.h;
  const opts = ladder
    .map((r, rung) => ({ name: r.name, rung, outputProfile: r.outputProfile, height: r.height }))
    .filter((o) => o.rung === 0 || !h || !o.height || o.height <= h * 0.9);
  if (info.fmt && formatProfile && opts[0]) opts[0] = { ...opts[0], outputProfile: formatProfile };
  return opts;
}

/**
 * Which option plays: a pinned choice if this channel offers it (Source if not), else Auto's
 * step; never Source when this device can't play it, and never past the lightest option.
 */
export function pickOption(
  opts: QualityOption[],
  choice: string | undefined,
  auto: AutoQuality,
  info: ChannelInfo,
): number {
  let i: number;
  if (choice && choice !== 'auto')
    i = Math.max(
      0,
      opts.findIndex((o) => o.name === choice),
    );
  else i = auto.step;
  const floor = info.noSource && opts.length > 1 ? 1 : 0;
  return Math.max(floor, Math.min(i, opts.length - 1));
}

/** Struggle detection thresholds, used by the session. */
export const STRUGGLE_SAMPLE_MS = 2000;
/** Samples looked at together (10 s). */
export const STRUGGLE_SAMPLES = 5;
/** Over those samples: at least this many frames, and this share of them dropped. */
export const STRUGGLE_MIN_FRAMES = 100;
export const STRUGGLE_DROP_RATIO = 0.2;
/** Running dry this often in STRUGGLE_DRY_WINDOW_MS (with data still arriving) is a struggle. */
export const STRUGGLE_DRY_RUNS = 3;
export const STRUGGLE_DRY_WINDOW_MS = 10 * 60_000;

export interface FrameSample {
  /** Frames in the sample (totalVideoFrames counts dropped frames too). */
  decoded: number;
  dropped: number;
}

/** Whether these samples show the device dropping too many frames. */
export function droppingFrames(samples: FrameSample[]): boolean {
  if (samples.length < STRUGGLE_SAMPLES) return false;
  let decoded = 0;
  let dropped = 0;
  for (const s of samples.slice(-STRUGGLE_SAMPLES)) {
    decoded += s.decoded;
    dropped += s.dropped;
  }
  const total = Math.max(decoded, dropped);
  return total >= STRUGGLE_MIN_FRAMES && dropped / total > STRUGGLE_DROP_RATIO;
}
