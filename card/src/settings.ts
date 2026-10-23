import type { BufferMode } from './types';

/**
 * Choices made in the card's settings panel, per target and per device, in localStorage.
 * Each one overrides the card's YAML on this device until it's reset; an absent field
 * follows the YAML. Every card for the target on the page hears a change through
 * SETTINGS_EVENT, so a pop-up and an inline card agree.
 */

const PREFIX = 'stream-card:settings:';
export const SETTINGS_EVENT = 'stream-card-settings';

export interface DeviceSettings {
  buffer?: BufferMode;
  /** Programme info (now/next) on screen. Display only: `epg` still decides the download. */
  nowNext?: boolean;
  /** The stats overlay (the picture part of `debug`). */
  stats?: boolean;
}

export function readSettings(target: string): DeviceSettings {
  try {
    const raw = localStorage.getItem(PREFIX + target);
    if (!raw) return {};
    const r = JSON.parse(raw) as Record<string, unknown>;
    if (typeof r !== 'object' || !r) return {};
    const s: DeviceSettings = {};
    if (r.buffer === 'low' || r.buffer === 'stable') s.buffer = r.buffer;
    if (typeof r.nowNext === 'boolean') s.nowNext = r.nowNext;
    if (typeof r.stats === 'boolean') s.stats = r.stats;
    return s;
  } catch {
    return {};
  }
}

/** Saves (or, when nothing is set, forgets) a target's settings and tells every card. */
export function writeSettings(target: string, s: DeviceSettings): void {
  const clean = Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined));
  try {
    if (Object.keys(clean).length) localStorage.setItem(PREFIX + target, JSON.stringify(clean));
    else localStorage.removeItem(PREFIX + target);
  } catch {
    /* storage unavailable (private mode, quota): the change still applies to this page */
  }
  window.dispatchEvent(
    new CustomEvent(SETTINGS_EVENT, { detail: { target, settings: clean as DeviceSettings } }),
  );
}
