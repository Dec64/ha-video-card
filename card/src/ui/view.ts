import type { Channel } from '../channels';

/**
 * What the templates in src/ui/ read. The card builds a CardView and CardActions on every
 * render; the templates never reach into the card. Fields and actions owned by other
 * features (navigation, now/next, multiview) are optional: an absent action hides its
 * button, an absent field hides its line.
 */

/** One programme from the guide data (epoch ms). */
export interface Programme {
  title: string;
  start?: number;
  end?: number;
}

export interface NowNext {
  now?: Programme;
  next?: Programme;
}

/** Filled by the navigation features (recents, last channel, keypad, volume, sleep timer). */
export interface NavView {
  /** Most recent first; may include the current channel. */
  recents?: Channel[];
  /** The channel before this one, for "Last channel" and "Back to …" after a failed zap. */
  previousChannel?: Channel;
  /** Digits typed so far on the keypad or a remote, and the channels they could still mean. */
  numberEntry?: { digits: string; candidates: Channel[] };
  /** 0..1 */
  volume?: number;
  sleep?: { endsAt: number; remainingMs: number; warning: boolean };
}

export interface NavActions {
  lastChannel?: () => void;
  pressDigit?: (digit: string) => void;
  clearDigits?: () => void;
  commitDigits?: () => void;
  setVolume?: (volume: number) => void;
  /** Minutes; 0 cancels. */
  setSleep?: (minutes: number) => void;
  extendSleep?: (minutes: number) => void;
}

export type UiState =
  'preview' | 'empty' | 'ready' | 'connecting' | 'reconnecting' | 'playing' | 'error';

/** Where the card is being shown; picked from the device and the card's width. */
export type Layout = 'standard' | 'tv';

export interface CardView extends NavView {
  ui: UiState;
  layout: Layout;
  /** The channel-list entry for the source, when the list has it. */
  channel?: Channel;
  title?: string;
  nowNext?: NowNext;
  /** Controls and ident are showing (they auto-hide while playing). */
  chrome: boolean;
  /** Big channel number in the corner after a change. */
  osd: boolean;
  muted: boolean;
  mutedByPolicy: boolean;
  needsGesture: boolean;
  /** `buffer: stable` is building or refilling its reserve. */
  buffering?: boolean;
  fullscreen: boolean;
  canStep: boolean;
  hasGuide: boolean;
  guideOpen: boolean;
  /** Reconnect progress. */
  failures: number;
  maxAttempts: number;
  retryAt?: number;
  /** There's a channel to retry after an error. */
  canRetry: boolean;
  errorMessage?: string;
  errorDetail?: string;
  /** Why playback stopped by itself, shown over the play button. */
  stoppedReason?: string;
  notice?: string;
  debugText?: string;
  sleepMenuOpen: boolean;
  /** For the edit-mode summary. */
  edit?: { target: string; profile?: string; favourites: number };
  /** Current time for progress bars and countdowns. */
  now: number;
}

export interface CardActions extends NavActions {
  play: (e?: Event) => void;
  stop: (e?: Event) => void;
  channelUp: (e?: Event) => void;
  channelDown: (e?: Event) => void;
  toggleMute: (e?: Event) => void;
  unmute: (e?: Event) => void;
  toggleFullscreen: (e?: Event) => void;
  toggleGuide: (e?: Event) => void;
  toggleSleepMenu: (e?: Event) => void;
  /** Multiview thread: shown only when set. */
  multiview?: () => void;
}

/** "Sports Live HD" → "SL": a stand-in for a missing logo. */
export function initials(name: string): string {
  const words = name
    .replace(/\b(hd|sd|fhd|uhd|4k)\b/gi, '')
    .trim()
    .split(/\s+/);
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();
}

/** 0..100 through a programme, or undefined without both times. */
export function progress(p: Programme | undefined, now: number): number | undefined {
  if (!p?.start || !p.end || p.end <= p.start) return undefined;
  return Math.max(0, Math.min(100, ((now - p.start) / (p.end - p.start)) * 100));
}

/** 18:42 in the device's locale (24 h where the locale uses it). */
export function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** 0:58, 12:05 */
export function countdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "20m", "1h 05m" */
export function minutesLeft(ms: number): string {
  const m = Math.max(0, Math.ceil(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
}

export function channelLabel(ch: Channel | undefined): string {
  if (!ch) return '';
  return ch.number ? `${ch.number} ${ch.name}` : ch.name;
}

/** Cast receivers (Chromecast, Google TV) get the 10-foot layout. */
export function detectLayout(ua: string = navigator.userAgent): Layout {
  return /CrKey|GoogleTV|Android TV|AFT[A-Z]|SMART-TV|Tizen|Web0S/i.test(ua) ? 'tv' : 'standard';
}
