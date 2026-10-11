/** Per-device memory of each target's last channel, in localStorage. */

const PREFIX = 'stream-card:last:';

/** A target's last channel on this device, and whether it was left playing or stopped. */
export interface Remembered {
  channel?: string;
  url?: string;
  title?: string;
  playing?: boolean;
}

export function readRemembered(target: string): Remembered | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + target);
    if (!raw) return undefined;
    const r = JSON.parse(raw) as Remembered;
    return typeof r === 'object' && r && (r.channel || r.url) ? r : undefined;
  } catch {
    return undefined;
  }
}

export function writeRemembered(target: string, r: Remembered): void {
  try {
    localStorage.setItem(PREFIX + target, JSON.stringify(r));
  } catch {
    /* storage unavailable (private mode, quota) */
  }
}

/** A stop button for a target whose card isn't on screen: it should come back stopped. */
export function rememberStopped(target: string): void {
  const r = readRemembered(target);
  if (r?.playing) writeRemembered(target, { ...r, playing: false });
}
