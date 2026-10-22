import { DEFAULT_TARGET, DEFAULT_URL_TEMPLATE } from './const';
import type {
  GuideMode,
  ResolvedConfig,
  SourceType,
  StreamCardConfig,
  StreamRequest,
  StreamSource,
} from './types';

export class ConfigError extends Error {
  override name = 'ConfigError';
}

const MINUTE = 60_000;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function optionalString(raw: Record<string, unknown>, key: string): string | undefined {
  const v = raw[key];
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string' && typeof v !== 'number') {
    throw new ConfigError(`"${key}" must be text`);
  }
  return String(v).trim();
}

function optionalBool(raw: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = raw[key];
  if (v === undefined || v === null) return fallback;
  if (typeof v !== 'boolean') throw new ConfigError(`"${key}" must be true or false`);
  return v;
}

function optionalNumber(
  raw: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
): number {
  const v = raw[key];
  if (v === undefined || v === null || v === '') return fallback;
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < min) {
    throw new ConfigError(`"${key}" must be a number of at least ${min}`);
  }
  return n;
}

function optionalStringList(raw: Record<string, unknown>, key: string): string[] {
  const v = raw[key];
  if (v === undefined || v === null || v === '') return [];
  const list = Array.isArray(v) ? v : [v];
  return list
    .map((item) => {
      if (typeof item !== 'string' && typeof item !== 'number') {
        throw new ConfigError(`"${key}" must be a list of text`);
      }
      return String(item).trim();
    })
    .filter(Boolean);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A Dispatcharr channel UUID, used as-is. */
export function isUuid(ref: string): boolean {
  return UUID_RE.test(ref.trim());
}

/**
 * Whether a channel reference must be looked up in the channel list first: a name ("BBC One HD")
 * or a channel number ("101"). Anything else is used directly as the stream ID.
 */
export function needsLookup(ref: string): boolean {
  const v = ref.trim();
  return !isUuid(v) && (/\s/.test(v) || /^\d+$/.test(v));
}

function normalizeBaseUrl(v: string): string {
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    throw new ConfigError(`"dispatcharr_url" must be a full URL, e.g. https://dispatcharr.example`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ConfigError('"dispatcharr_url" must start with http:// or https://');
  }
  return v.replace(/\/+$/, '');
}

/** Turns "16:9", "4/3" or "1.78" into a CSS aspect-ratio value. */
export function parseAspectRatio(v: string | undefined): string {
  if (!v) return '16 / 9';
  const m = /^\s*(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)\s*$/.exec(v);
  if (m && Number(m[1]) > 0 && Number(m[2]) > 0) return `${m[1]} / ${m[2]}`;
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return String(n);
  throw new ConfigError('"aspect_ratio" must look like "16:9"');
}

export function normalizeConfig(input: unknown): ResolvedConfig {
  if (!isPlainObject(input)) throw new ConfigError('Card config must be an object');
  const raw = input as Record<string, unknown> & Partial<StreamCardConfig>;

  const base = optionalString(raw, 'dispatcharr_url');
  const outputProfile = optionalString(raw, 'output_profile');
  if (outputProfile !== undefined && !/^\d+$/.test(outputProfile)) {
    throw new ConfigError(
      '"output_profile" must be the numeric ID of a Dispatcharr output profile',
    );
  }
  const urlTemplate = optionalString(raw, 'url_template') ?? DEFAULT_URL_TEMPLATE;
  if (!urlTemplate.includes('{channel}')) {
    throw new ConfigError('"url_template" must contain {channel}');
  }
  const reconnect = raw.reconnect;
  if (reconnect !== undefined && !isPlainObject(reconnect)) {
    throw new ConfigError('"reconnect" must be an object, e.g. { max_attempts: 5 }');
  }

  const m3uUrl = optionalString(raw, 'm3u_url');
  if (m3uUrl) {
    try {
      new URL(m3uUrl);
    } catch {
      throw new ConfigError('"m3u_url" must be a full URL');
    }
  }

  const guide = optionalString(raw, 'guide') ?? 'open';
  if (guide !== 'open' && guide !== 'closed' && guide !== 'off') {
    throw new ConfigError('"guide" must be open, closed or off');
  }

  const channel = optionalString(raw, 'channel');
  const url = optionalString(raw, 'url');
  const title = optionalString(raw, 'title');
  const defaultRequest: StreamRequest | undefined =
    channel || url ? { channel, url, title } : undefined;

  const resolved: ResolvedConfig = {
    target: optionalString(raw, 'target') ?? DEFAULT_TARGET,
    dispatcharrUrl: base ? normalizeBaseUrl(base) : undefined,
    outputProfile,
    urlTemplate,
    defaultRequest,
    autoplay: optionalBool(raw, 'autoplay', true),
    muted: optionalBool(raw, 'muted', false),
    aspectRatio: parseAspectRatio(optionalString(raw, 'aspect_ratio')),
    idleTimeoutMs: optionalNumber(raw, 'idle_timeout', 0, 0) * MINUTE,
    startTimeoutMs: optionalNumber(raw, 'start_timeout', 20, 1) * 1000,
    maxReconnectAttempts: reconnect
      ? optionalNumber(reconnect as Record<string, unknown>, 'max_attempts', 5, 0)
      : 5,
    debug: optionalBool(raw, 'debug', false),
    channelList: optionalBool(raw, 'channel_list', !!(base || m3uUrl)),
    m3uUrl: m3uUrl ?? (base ? `${normalizeBaseUrl(base)}/output/m3u` : undefined),
    channelGroups: optionalStringList(raw, 'channel_groups'),
    favourites: optionalStringList(raw, 'favourites'),
    rememberChannel: optionalBool(raw, 'remember_channel', true),
    guide: guide as GuideMode,
  };
  if (resolved.channelList && !resolved.m3uUrl) {
    throw new ConfigError('"channel_list" needs "dispatcharr_url" or "m3u_url"');
  }
  // Names and numbers are looked up in the channel list later; IDs are checked now.
  const ch = defaultRequest?.channel;
  if (defaultRequest && ch && !(resolved.channelList && !isUuid(ch))) {
    resolveSource(defaultRequest, resolved);
  }
  return resolved;
}

/** Guesses the engine from a full URL. Dispatcharr's TS URLs have no extension, so TS is the default. */
export function guessSourceType(url: string): SourceType {
  const path = url.split(/[?#]/)[0].toLowerCase();
  if (path.endsWith('.m3u8') || path.endsWith('.mp4') || path.endsWith('.webm')) return 'native';
  return 'mpegts';
}

/** Turns a request into a playable URL. Throws ConfigError with a message meant for the user. */
export function resolveSource(req: StreamRequest, cfg: ResolvedConfig): StreamSource {
  if (req.url) {
    let parsed: URL;
    try {
      parsed = new URL(req.url, document.baseURI);
    } catch {
      throw new ConfigError(`"${req.url}" is not a valid URL`);
    }
    return {
      url: parsed.href,
      type: req.type ?? guessSourceType(parsed.href),
      title: req.title,
    };
  }
  if (!req.channel) throw new ConfigError('Nothing to play: set "channel" or "url"');
  const channel = String(req.channel).trim();
  if (!channel || /[/?#\s]/.test(channel)) {
    throw new ConfigError(`"${channel}" is not a valid channel ID`);
  }
  if (cfg.urlTemplate.includes('{base}') && !cfg.dispatcharrUrl) {
    throw new ConfigError('Set "dispatcharr_url" on the card to play channels');
  }
  const built = cfg.urlTemplate
    .replaceAll('{base}', cfg.dispatcharrUrl ?? '')
    .replaceAll('{channel}', encodeURIComponent(channel));
  let url: URL;
  try {
    url = new URL(built);
  } catch {
    throw new ConfigError(`"url_template" produced an invalid URL: ${built}`);
  }
  if (cfg.outputProfile && !url.searchParams.has('output_profile')) {
    url.searchParams.set('output_profile', cfg.outputProfile);
  }
  return { url: url.href, type: req.type ?? 'mpegts', title: req.title, channel };
}

/**
 * Validates a button's `stream_card:` block. Returns undefined (and the caller logs) when the
 * payload is unusable, so one bad button can't break the page.
 */
export function parseRequest(input: unknown): StreamRequest | undefined {
  if (!isPlainObject(input)) return undefined;
  const pick = (k: string): string | undefined => {
    const v = input[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
    return undefined;
  };
  const action = pick('action');
  if (action !== undefined && action !== 'play' && action !== 'stop') return undefined;
  const type = pick('type');
  if (type !== undefined && type !== 'mpegts' && type !== 'native') return undefined;
  const req: StreamRequest = {
    target: pick('target'),
    action: (action as StreamRequest['action']) ?? 'play',
    channel: pick('channel'),
    url: pick('url'),
    type: type as SourceType | undefined,
    title: pick('title'),
    open: pick('open'),
  };
  if (req.action === 'play' && !req.channel && !req.url) return undefined;
  return req;
}
