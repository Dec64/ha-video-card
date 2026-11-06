import type { Channel } from './channels';

/** One programme from Dispatcharr's XMLTV guide. Times are epoch ms. */
export interface Programme {
  title: string;
  start?: number;
  end?: number;
  /** First sentences of the description (app layout's guide detail). */
  desc?: string;
  /** XMLTV categories, at most two ("Sports", "Football"). */
  cats?: string[];
  /** Broadcast live: the guide's title started with "Live:"/"Live " (removed from the title). */
  live?: boolean;
}

/** What's on a channel now, and what's on after it. */
export interface NowNext {
  now?: Programme;
  next?: Programme;
}

/** Programmes kept per channel: enough for now/next to stay right until the next refresh. */
const MAX_PER_CHANNEL = 48;
/** Programmes starting further ahead than this are dropped while parsing. */
const LOOKAHEAD_MS = 14 * 3_600_000;
/** Reload the guide when it is older than this (and the page is visible). */
const REFRESH_MS = 2 * 3_600_000;
/** After a failed load, try again this much later. */
const RETRY_MS = 5 * 60_000;
/** The guide is several MB on a real server, so it gets longer than the playlist. */
const TIMEOUT_MS = 60_000;

const TIME_RE = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*(?:([+-])(\d{2}):?(\d{2}))?/;

/** Parses an XMLTV time ("20261022180000 +0100"). No offset means UTC. */
export function parseXmltvTime(v: string | undefined): number | undefined {
  const m = v ? TIME_RE.exec(v.trim()) : null;
  if (!m) return undefined;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
  const offset = m[7] ? (m[7] === '-' ? -1 : 1) * (+m[8] * 60 + +m[9]) * 60_000 : 0;
  return utc - offset;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : all;
    }
    return ENTITIES[e.toLowerCase()] ?? all;
  });
}

const ATTR_RE = /([\w-]+)\s*=\s*"([^"]*)"/g;
const TITLE_RE = /<title\b[^>]*>([\s\S]*?)<\/title>/;
const DESC_RE = /<desc\b[^>]*>([\s\S]*?)<\/desc>/;
const CAT_RE = /<category\b[^>]*>([\s\S]*?)<\/category>/g;
/** Description length kept per programme: enough for two lines in the guide's detail panel. */
const DESC_MAX = 180;

const text = (raw: string): string =>
  decodeXml(raw.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')).trim();

/** "Live: X" / "New: X" → X, remembering whether it was live. */
export function cleanTitle(raw: string): { title: string; live: boolean } {
  let title = raw;
  let live = false;
  for (;;) {
    const m = /^(live|new|signed)\s*:\s*/i.exec(title) ?? /^(Live|LIVE)\s+(?=[A-Z])/.exec(title);
    if (!m) break;
    if (m[1].toLowerCase() === 'live') live = true;
    title = title.slice(m[0].length);
  }
  return { title: title || raw, live };
}

/** Drops "4/10. " episode counters and cuts at a sentence end near DESC_MAX. */
export function shortDesc(raw: string): string | undefined {
  const d = raw
    .replace(/^\(?\d+\/\d+\)?\.?\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!d) return undefined;
  if (d.length <= DESC_MAX) return d;
  const cut = d.slice(0, DESC_MAX);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return stop > 60 ? cut.slice(0, stop + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…';
}
const OPEN = '<programme';
const CLOSE = '</programme>';

/**
 * Parses XMLTV text fed in chunks, keeping only programmes that haven't ended by `from` and start
 * before `from + LOOKAHEAD_MS`. Channel, start, stop, title, the first two categories and a
 * short description are kept, so a multi-MB guide ends up as a few KB per channel.
 */
export class XmltvParser {
  private buf = '';
  private readonly byChannel = new Map<string, Programme[]>();

  constructor(private readonly from = Date.now()) {}

  push(text: string): void {
    this.buf += text;
    let pos = 0;
    for (;;) {
      const open = this.buf.indexOf(OPEN, pos);
      if (open < 0) {
        // Keep a tail that might be the start of "<programme".
        pos = Math.max(pos, this.buf.length - OPEN.length);
        break;
      }
      const close = this.buf.indexOf(CLOSE, open);
      if (close < 0) {
        pos = open;
        break;
      }
      this.programme(this.buf.slice(open, close));
      pos = close + CLOSE.length;
    }
    this.buf = this.buf.slice(pos);
  }

  private programme(block: string): void {
    const tagEnd = block.indexOf('>');
    if (tagEnd < 0) return;
    const attrs: Record<string, string> = {};
    for (const m of block.slice(OPEN.length, tagEnd).matchAll(ATTR_RE)) attrs[m[1]] = m[2];
    const channel = attrs.channel !== undefined ? decodeXml(attrs.channel) : undefined;
    const start = parseXmltvTime(attrs.start);
    const end = parseXmltvTime(attrs.stop);
    if (!channel || start === undefined) return;
    if (end !== undefined && end <= this.from) return;
    if (start >= this.from + LOOKAHEAD_MS) return;
    const body = block.slice(tagEnd + 1);
    const raw = text(TITLE_RE.exec(body)?.[1] ?? '');
    if (!raw) return;
    const { title, live } = cleanTitle(raw);
    const p: Programme = { title, start, end };
    if (live) p.live = true;
    const desc = DESC_RE.exec(body)?.[1];
    if (desc) p.desc = shortDesc(text(desc));
    const cats = [...body.matchAll(CAT_RE)]
      .slice(0, 2)
      .map((m) => text(m[1]))
      .filter(Boolean);
    if (cats.length) p.cats = cats;
    let list = this.byChannel.get(channel);
    if (!list) this.byChannel.set(channel, (list = []));
    list.push(p);
  }

  /** Programmes per XMLTV channel ID, sorted by start, gaps in `end` filled from the next start. */
  finish(): Map<string, Programme[]> {
    this.buf = '';
    for (const [id, list] of this.byChannel) {
      list.sort((a, b) => a.start! - b.start!);
      for (let i = 0; i < list.length; i++) list[i].end ??= list[i + 1]?.start;
      const kept = list.filter((p) => p.end === undefined || p.end > this.from);
      this.byChannel.set(id, kept.slice(0, MAX_PER_CHANNEL));
    }
    return this.byChannel;
  }
}

/** Now/next from one channel's sorted programmes at time `at`. */
export function nowNextAt(list: Programme[] | undefined, at: number): NowNext | undefined {
  if (!list?.length) return undefined;
  const i = list.findIndex((p) => p.end === undefined || p.end > at);
  if (i < 0) return undefined;
  const p = list[i];
  if (p.start !== undefined && p.start > at) return { next: p };
  return { now: p, next: list[i + 1] };
}

/** The XMLTV channel ID for a playlist channel. Dispatcharr uses the channel number by default. */
export function guideKey(ch: Channel): string | undefined {
  return ch.tvgId ?? ch.number;
}

export class GuideError extends Error {
  override name = 'GuideError';
}

/** Downloads and parses a guide, streaming the body so the whole file is never held at once. */
export async function fetchGuide(
  url: string,
  signal: AbortSignal,
): Promise<Map<string, Programme[]>> {
  const res = await fetch(url, { cache: 'no-store', signal });
  if (!res.ok) throw new GuideError(`HTTP ${res.status}`);
  const parser = new XmltvParser();
  if (!res.body) {
    parser.push(await res.text());
    return parser.finish();
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.push(decoder.decode(value, { stream: true }));
  }
  parser.push(decoder.decode());
  return parser.finish();
}

/**
 * One guide URL, shared by every card on the page. It loads while at least one card is
 * subscribed, reloads every REFRESH_MS while the page is visible, and tells subscribers when data
 * arrives or a programme starts or ends. Failures leave the last good data (or none) in place:
 * the card just shows no programme info.
 */
export class GuideFeed {
  private data?: Map<string, Programme[]>;
  private loadedAt = 0;
  private failedAt = 0;
  private abort?: AbortController;
  private timer?: ReturnType<typeof setTimeout>;
  private readonly listeners = new Set<() => void>();
  /** Why the latest load failed, if it did. */
  lastError?: string;

  constructor(readonly url: string) {}

  get loaded(): boolean {
    return !!this.data;
  }

  /** Every programme kept for a channel, sorted by start (the app layout's guide grid and rails). */
  programmes(ch: Channel): Programme[] | undefined {
    const key = guideKey(ch);
    return key === undefined ? undefined : this.data?.get(key);
  }

  nowNext(ch: Channel, at = Date.now()): NowNext | undefined {
    const key = guideKey(ch);
    return key === undefined ? undefined : nowNextAt(this.data?.get(key), at);
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    if (this.listeners.size === 1) document.addEventListener('visibilitychange', this.onVisible);
    this.tick();
    return () => {
      if (!this.listeners.delete(cb) || this.listeners.size) return;
      document.removeEventListener('visibilitychange', this.onVisible);
      clearTimeout(this.timer);
      this.timer = undefined;
      // Nobody is looking: don't keep downloading a guide for nobody.
      this.abort?.abort();
      this.abort = undefined;
    };
  }

  private readonly onVisible = () => {
    if (document.visibilityState === 'visible') this.tick();
  };

  private notify(): void {
    for (const cb of [...this.listeners]) cb();
  }

  /** Loads if due, then sleeps until the next programme boundary or refresh. */
  private tick = (): void => {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.listeners.size) return;
    const now = Date.now();
    const due = this.failedAt
      ? now - this.failedAt >= RETRY_MS
      : !this.data || now - this.loadedAt >= REFRESH_MS;
    if (due && !this.abort && document.visibilityState !== 'hidden') void this.load();
    // While loading, load() ticks again when it's done; while hidden, the visibility listener does.
    const reload = due
      ? Infinity
      : this.failedAt
        ? this.failedAt + RETRY_MS
        : this.loadedAt + REFRESH_MS;
    const wake = Math.min(this.nextBoundary(now) ?? Infinity, reload);
    if (wake === Infinity) return;
    this.timer = setTimeout(
      () => {
        this.notify();
        this.tick();
      },
      Math.max(1000, wake - now),
    );
  };

  private nextBoundary(now: number): number | undefined {
    let min: number | undefined;
    for (const list of this.data?.values() ?? []) {
      const { now: cur, next } = nowNextAt(list, now) ?? {};
      for (const t of [cur?.end, next?.start]) {
        if (t !== undefined && t > now && (min === undefined || t < min)) min = t;
      }
    }
    return min;
  }

  private async load(): Promise<void> {
    const ac = new AbortController();
    this.abort = ac;
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const data = await fetchGuide(this.url, ac.signal);
      if (this.abort !== ac) return;
      this.data = data;
      this.loadedAt = Date.now();
      this.failedAt = 0;
      this.lastError = undefined;
    } catch (err) {
      if (this.abort !== ac) return;
      this.failedAt = Date.now();
      this.lastError =
        err instanceof GuideError
          ? err.message
          : ac.signal.aborted
            ? `no answer in ${TIMEOUT_MS / 1000} s`
            : `network error: ${err instanceof Error ? err.message : err}`;
    } finally {
      clearTimeout(timer);
      if (this.abort === ac) this.abort = undefined;
    }
    this.notify();
    this.tick();
  }
}

const feeds = new Map<string, GuideFeed>();

/** The page-wide feed for a guide URL. */
export function guideFeed(url: string): GuideFeed {
  let feed = feeds.get(url);
  if (!feed) feeds.set(url, (feed = new GuideFeed(url)));
  return feed;
}

/** For tests. */
export function clearGuideFeeds(): void {
  feeds.clear();
}
