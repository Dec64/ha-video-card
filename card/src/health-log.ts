/**
 * Per-device, per-target log of playback trouble (stalls, reconnects, frozen or black picture,
 * source switches, network returns), in localStorage. Shown in the stats overlay so thresholds
 * can be tuned from what really happens on each screen.
 */

const PREFIX = 'stream-card:health:';
/** Most events kept per target. */
export const HEALTH_MAX = 100;
const DAY = 24 * 60 * 60 * 1000;

export type HealthKind =
  | 'reconnect'
  | 'buffering'
  | 'buffer-level'
  | 'frozen'
  | 'black'
  | 'switch'
  | 'switch-failed'
  | 'check-paused'
  | 'network'
  | 'keep-trying'
  | 'gave-up';

export interface HealthEvent {
  /** Epoch ms. */
  t: number;
  kind: HealthKind;
  /** Channel title (or URL) playing at the time. */
  ch?: string;
  detail?: string;
}

export function readHealth(target: string): HealthEvent[] {
  try {
    const raw = localStorage.getItem(PREFIX + target);
    if (!raw) return [];
    const r = JSON.parse(raw) as unknown;
    return Array.isArray(r)
      ? r.filter(
          (e): e is HealthEvent =>
            !!e && typeof e === 'object' && typeof e.t === 'number' && typeof e.kind === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

export function appendHealth(target: string, ev: HealthEvent): HealthEvent[] {
  const list = [...readHealth(target), ev].slice(-HEALTH_MAX);
  try {
    localStorage.setItem(PREFIX + target, JSON.stringify(list));
  } catch {
    /* storage unavailable (private mode, quota) */
  }
  return list;
}

export function clearHealth(target: string): void {
  try {
    localStorage.removeItem(PREFIX + target);
  } catch {
    /* storage unavailable */
  }
}

/** "24 h: 3 reconnect · 1 frozen" (or "24 h: no trouble"). */
export function summarizeHealth(events: HealthEvent[], now: number): string {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (now - e.t <= DAY) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  }
  if (!counts.size) return '24 h: no trouble';
  return '24 h: ' + [...counts].map(([k, n]) => `${n} ${k}`).join(' · ');
}

function hhmm(t: number): string {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** One line per event, newest first. */
export function recentHealthLines(events: HealthEvent[], n: number): string[] {
  return events
    .slice(-n)
    .reverse()
    .map(
      (e) => `${hhmm(e.t)} ${e.kind}${e.ch ? ` · ${e.ch}` : ''}${e.detail ? ` · ${e.detail}` : ''}`,
    );
}
