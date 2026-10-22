/** This device's volume (0..1), shared by every card on it, in localStorage. */

const KEY = 'stream-card:volume';

export function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return 1;
  return Math.min(1, Math.max(0, v));
}

export function readVolume(): number | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return undefined;
    const v = Number(raw);
    return Number.isFinite(v) ? clampVolume(v) : undefined;
  } catch {
    return undefined;
  }
}

export function writeVolume(v: number): void {
  try {
    localStorage.setItem(KEY, String(clampVolume(v)));
  } catch {
    /* storage unavailable */
  }
}
