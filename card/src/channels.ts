/** One channel from Dispatcharr's M3U playlist. */
export interface Channel {
  /** Stable key: the Dispatcharr channel UUID, or the stream URL for other playlists. */
  id: string;
  /** Set when the URL is a Dispatcharr /proxy/ts/stream/<id> URL. */
  streamId?: string;
  url: string;
  name: string;
  number?: string;
  group?: string;
  logo?: string;
}

const ATTR_RE = /([\w-]+)="([^"]*)"/g;
const STREAM_RE = /\/proxy\/ts\/stream\/([^/?#]+)/;

/** Splits an #EXTINF line into its attributes and display name (text after the first unquoted comma). */
function parseExtinf(line: string): { attrs: Record<string, string>; name: string } {
  const attrs: Record<string, string> = {};
  let inQuote = false;
  let comma = -1;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuote = !inQuote;
    else if (c === ',' && !inQuote) {
      comma = i;
      break;
    }
  }
  const head = comma >= 0 ? line.slice(0, comma) : line;
  for (const m of head.matchAll(ATTR_RE)) attrs[m[1].toLowerCase()] = m[2];
  const name = comma >= 0 ? line.slice(comma + 1).trim() : '';
  return { attrs, name };
}

/** Parses an M3U/M3U8 playlist. Entries without a URL are skipped. */
export function parseM3u(text: string): Channel[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const out: Channel[] = [];
  let pending: { attrs: Record<string, string>; name: string } | undefined;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF')) {
      pending = parseExtinf(line);
      continue;
    }
    if (line.startsWith('#')) continue;
    if (!pending) continue;
    const { attrs, name } = pending;
    pending = undefined;
    const streamId = STREAM_RE.exec(line)?.[1];
    out.push({
      id: streamId ? decodeURIComponent(streamId) : line,
      streamId: streamId ? decodeURIComponent(streamId) : undefined,
      url: line,
      name: name || attrs['tvg-name'] || streamId || line,
      number: attrs['tvg-chno'] || attrs['channel-number'] || undefined,
      group: attrs['group-title'] || undefined,
      logo: attrs['tvg-logo'] || undefined,
    });
  }
  return out;
}

const fold = (s: string) => s.trim().toLocaleLowerCase();

function byNumberThenName(a: Channel, b: Channel): number {
  const na = a.number !== undefined ? Number(a.number) : NaN;
  const nb = b.number !== undefined ? Number(b.number) : NaN;
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  if (!Number.isNaN(na) && Number.isNaN(nb)) return -1;
  if (Number.isNaN(na) && !Number.isNaN(nb)) return 1;
  return a.name.localeCompare(b.name);
}

export interface ChannelListOptions {
  /** Only these groups, in this order (default: every group, in playlist order). */
  groups?: string[];
  /** Channel names, numbers or IDs to pin in a Favourites group, in this order. */
  favourites?: string[];
}

/** The channels a card offers: filtered by group, ordered by channel number. */
export class ChannelList {
  readonly channels: Channel[];
  readonly groups: string[];
  readonly favourites: Channel[];
  private readonly all: Channel[];

  constructor(all: Channel[], opts: ChannelListOptions = {}) {
    this.all = all;
    const wanted = (opts.groups ?? []).map(fold);
    const inGroup = (c: Channel) => !wanted.length || wanted.includes(fold(c.group ?? ''));
    this.channels = all.filter(inGroup).sort(byNumberThenName);
    const seen = new Set<string>();
    const groups: string[] = [];
    for (const c of all) {
      if (c.group && inGroup(c) && !seen.has(c.group)) {
        seen.add(c.group);
        groups.push(c.group);
      }
    }
    if (wanted.length) groups.sort((a, b) => wanted.indexOf(fold(a)) - wanted.indexOf(fold(b)));
    this.groups = groups;
    this.favourites = (opts.favourites ?? [])
      .map((ref) => this.find(ref))
      .filter((c): c is Channel => !!c);
  }

  get size(): number {
    return this.channels.length;
  }

  /** Channels in the playlist before the group filter. */
  get total(): number {
    return this.all.length;
  }

  /** Every group in the playlist, in playlist order, ignoring the group filter. */
  get allGroups(): string[] {
    return [...new Set(this.all.map((c) => c.group).filter((g): g is string => !!g))];
  }

  /** Finds a channel by ID/UUID, channel number or name (case-insensitive), across all groups. */
  find(ref: string | undefined): Channel | undefined {
    if (!ref) return undefined;
    const r = ref.trim();
    const f = fold(r);
    return (
      this.all.find((c) => c.id === r || c.streamId === r) ??
      this.all.find((c) => c.number !== undefined && c.number === r) ??
      this.all.find((c) => fold(c.name) === f)
    );
  }

  /** Channel up/down within the card's list, wrapping round. */
  neighbour(currentId: string | undefined, delta: 1 | -1): Channel | undefined {
    const list = this.channels;
    if (!list.length) return undefined;
    const i = currentId
      ? list.findIndex((c) => c.id === currentId || c.streamId === currentId)
      : -1;
    if (i < 0) return delta > 0 ? list[0] : list[list.length - 1];
    return list[(i + delta + list.length) % list.length];
  }

  /** Channels in a group ('' = all, '★' = favourites) matching a search on name or number. */
  filter(query: string, group: string): Channel[] {
    const source =
      group === FAVOURITES
        ? this.favourites
        : group
          ? this.channels.filter((c) => c.group === group)
          : this.channels;
    const q = fold(query);
    if (!q) return source;
    return source.filter((c) => fold(c.name).includes(q) || (c.number ?? '').startsWith(q));
  }
}

export const FAVOURITES = '★';

interface CacheEntry {
  at: number;
  promise: Promise<Channel[]>;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 10 * 60_000;
/** A Dispatcharr that accepts the request but never answers must not leave the picker loading. */
const TIMEOUT_MS = 15_000;

export class ChannelListError extends Error {
  override name = 'ChannelListError';
}

/** Loads and parses a playlist, shared by every card on the page for 10 minutes. */
export function loadChannels(url: string, { force = false } = {}): Promise<Channel[]> {
  const hit = cache.get(url);
  if (hit && !force && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = (async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { cache: 'no-store', signal: ac.signal });
      if (!res.ok) throw new ChannelListError(`HTTP ${res.status}`);
      return parseM3u(await res.text());
    } catch (err) {
      if (err instanceof ChannelListError) throw err;
      if (ac.signal.aborted) throw new ChannelListError(`no answer in ${TIMEOUT_MS / 1000} s`);
      throw new ChannelListError(`network error: ${err instanceof Error ? err.message : err}`);
    } finally {
      clearTimeout(timer);
    }
  })();
  cache.set(url, { at: Date.now(), promise });
  promise.catch(() => {
    if (cache.get(url)?.promise === promise) cache.delete(url);
  });
  return promise;
}

/** For tests. */
export function clearChannelCache(): void {
  cache.clear();
}
