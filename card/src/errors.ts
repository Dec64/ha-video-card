import type { EngineError, ErrorKind } from './engines/types';

/**
 * Every message the card can show. The README's troubleshooting table must list each one
 * (checked by scripts/check-messages.mjs), so keep the wording in sync.
 */
export const MESSAGES = {
  cors: "Dispatcharr blocked this page's request (CORS). Check that nothing in front of Dispatcharr removes its Access-Control-Allow-Origin header.",
  network: "Can't reach Dispatcharr. Check dispatcharr_url and that this device can reach it.",
  http404: "Dispatcharr doesn't know this channel (404). Check the channel ID.",
  httpDenied:
    "Dispatcharr refused the stream ({status}). Check Dispatcharr's network access settings for streams.",
  http: 'Dispatcharr returned an error ({status}).',
  timeout:
    'No data from Dispatcharr after {seconds} s. If an output profile is set, check its ffmpeg command works for this channel.',
  codecAudio:
    "This device can't play {codec} audio. Use a Dispatcharr output profile that converts audio to AAC.",
  codecVideo:
    "This device can't play {codec} video. Use a Dispatcharr output profile that converts video to H.264.",
  codec: "This device can't play this stream's format.",
  unsupportedDevice: "This browser can't play live MPEG-TS streams (no Media Source Extensions).",
  gaveUp: 'The stream kept dropping. Stopped after {attempts} attempts.',
  media: 'The player hit an error it could not recover from.',
  config: '{detail}',
  noVideo:
    'No picture in this stream: its video track is missing or uses a codec the player skips.',
  channelsFailed:
    "Couldn't load the channel list from Dispatcharr ({detail}). Check dispatcharr_url, or m3u_url if you set one.",
  channelNotFound: 'No channel called "{name}" in the channel list.',
  noChannels: 'The channel list is empty.',
  noGroupMatch:
    'None of the channel_groups match a Dispatcharr group. Groups in Dispatcharr: {groups}.',
} as const;

export type MessageKey = keyof typeof MESSAGES;

export function format(key: MessageKey, vars: Record<string, string | number> = {}): string {
  return MESSAGES[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

/** An error ready for the UI: `message` for people, `detail` for the debug overlay. */
export interface PlaybackError {
  kind: ErrorKind;
  message: string;
  detail: string;
  status?: number;
}

const CODEC_NAMES: Array<[RegExp, string]> = [
  [/^avc1|^avc3/i, 'H.264'],
  [/^hvc1|^hev1/i, 'HEVC (H.265)'],
  [/^av01/i, 'AV1'],
  [/^mp4a\.40/i, 'AAC'],
  [/^mp4a\.6b|^mp3/i, 'MPEG audio (MP2/MP3)'],
  [/^ac-3/i, 'AC-3 (Dolby Digital)'],
  [/^ec-3/i, 'E-AC-3 (Dolby Digital Plus)'],
  [/^opus/i, 'Opus'],
];

export function codecName(codec: string): string {
  for (const [re, name] of CODEC_NAMES) if (re.test(codec)) return name;
  return codec;
}

type IsTypeSupported = (mime: string) => boolean;

function mseTypeCheck(): IsTypeSupported | undefined {
  const g = globalThis as unknown as {
    MediaSource?: { isTypeSupported(m: string): boolean };
    ManagedMediaSource?: { isTypeSupported(m: string): boolean };
  };
  const ms = g.MediaSource ?? g.ManagedMediaSource;
  return ms ? (m) => ms.isTypeSupported(m) : undefined;
}

/** Returns a codec error if this device can't decode the stream's tracks, else undefined. */
export function checkCodecs(
  info: { videoCodec?: string; audioCodec?: string },
  isTypeSupported: IsTypeSupported | undefined = mseTypeCheck(),
): PlaybackError | undefined {
  if (!isTypeSupported) return undefined;
  if (info.videoCodec && !isTypeSupported(`video/mp4; codecs="${info.videoCodec}"`)) {
    const codec = codecName(info.videoCodec);
    return {
      kind: 'codec',
      message: format('codecVideo', { codec }),
      detail: `video ${info.videoCodec} not supported`,
    };
  }
  if (info.audioCodec && !isTypeSupported(`audio/mp4; codecs="${info.audioCodec}"`)) {
    const codec = codecName(info.audioCodec);
    return {
      kind: 'codec',
      message: format('codecAudio', { codec }),
      detail: `audio ${info.audioCodec} not supported`,
    };
  }
  return undefined;
}

export function isRetryable(e: EngineError): boolean {
  switch (e.kind) {
    case 'network':
    case 'stall':
    case 'ended':
    case 'media':
      return true;
    case 'http':
      return e.status === undefined || e.status >= 500 || e.status === 408 || e.status === 429;
    default:
      return false;
  }
}

export function toPlaybackError(
  e: EngineError,
  ctx: { startTimeoutMs?: number; attempts?: number } = {},
): PlaybackError {
  const base = { kind: e.kind, detail: e.detail, status: e.status };
  switch (e.kind) {
    case 'cors':
      return { ...base, message: format('cors') };
    case 'network':
      return { ...base, message: format('network') };
    case 'http':
      if (e.status === 404) return { ...base, message: format('http404') };
      if (e.status === 401 || e.status === 403) {
        return { ...base, message: format('httpDenied', { status: e.status }) };
      }
      return { ...base, message: format('http', { status: e.status ?? '?' }) };
    case 'timeout':
      return {
        ...base,
        message: format('timeout', { seconds: Math.round((ctx.startTimeoutMs ?? 0) / 1000) }),
      };
    case 'codec':
      if (e.codec && e.track) {
        return {
          ...base,
          message: format(e.track === 'audio' ? 'codecAudio' : 'codecVideo', {
            codec: codecName(e.codec),
          }),
        };
      }
      return { ...base, message: format('codec') };
    case 'unsupported-device':
      return { ...base, message: format('unsupportedDevice') };
    case 'config':
      return { ...base, message: format('config', { detail: e.detail }) };
    case 'stall':
    case 'ended':
    case 'media':
      return ctx.attempts
        ? { ...base, message: format('gaveUp', { attempts: ctx.attempts }) }
        : { ...base, message: format('media') };
  }
}

/**
 * A fetch() TypeError can mean CORS or "unreachable". A no-cors request tells them apart: it
 * succeeds (opaque) when the server answered but CORS blocked us. Aborted as soon as headers
 * arrive so it doesn't hold a stream connection open.
 */
export async function diagnoseFetchFailure(
  url: string,
  timeoutMs = 5000,
): Promise<'cors' | 'unreachable'> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await fetch(url, { mode: 'no-cors', signal: ctrl.signal, cache: 'no-store' });
    return 'cors';
  } catch {
    return 'unreachable';
  } finally {
    clearTimeout(timer);
    ctrl.abort();
  }
}
