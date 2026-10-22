/** Each target's recently watched channels on this device, newest first, in localStorage. */

const PREFIX = 'stream-card:recent:';
export const MAX_RECENTS = 8;

/** A channel as played: `channel` is the resolved stream ID, `url` a full URL instead. */
export interface RecentEntry {
  channel?: string;
  url?: string;
  title?: string;
}

const keyOf = (e: RecentEntry): string | undefined => e.channel ?? e.url;

export function readRecents(target: string): RecentEntry[] {
  try {
    const raw = localStorage.getItem(PREFIX + target);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(list)) return [];
    return list.filter(
      (e): e is RecentEntry => typeof e === 'object' && e !== null && !!keyOf(e as RecentEntry),
    );
  } catch {
    return [];
  }
}

/** Moves (or adds) a channel to the front. Returns the new list. */
export function pushRecent(target: string, entry: RecentEntry): RecentEntry[] {
  const key = keyOf(entry);
  const current = readRecents(target);
  if (!key) return current;
  if (current[0] && keyOf(current[0]) === key) return current;
  const next = [
    { channel: entry.channel, url: entry.url, title: entry.title },
    ...current.filter((e) => keyOf(e) !== key),
  ].slice(0, MAX_RECENTS);
  try {
    localStorage.setItem(PREFIX + target, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode, quota) */
  }
  return next;
}

/** The channel to flip back to: the newest recent that isn't `currentKey`. */
export function previousRecent(
  target: string,
  currentKey: string | undefined,
): RecentEntry | undefined {
  return readRecents(target).find((e) => keyOf(e) !== currentKey);
}
