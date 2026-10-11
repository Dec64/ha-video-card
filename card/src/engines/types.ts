import type { SourceType, StreamSource } from '../types';

export type ErrorKind =
  | 'network'
  | 'cors'
  | 'http'
  | 'timeout'
  | 'codec'
  | 'unsupported-device'
  | 'media'
  | 'stall'
  | 'ended'
  | 'config';

/** A failure as the engine saw it; the session decides whether to retry and what to show. */
export interface EngineError {
  kind: ErrorKind;
  detail: string;
  status?: number;
  /** For codec errors: which track and codec string, e.g. audio / ac-3. */
  track?: 'audio' | 'video';
  codec?: string;
}

export interface MediaInfo {
  videoCodec?: string;
  audioCodec?: string;
  hasVideo?: boolean;
  hasAudio?: boolean;
  width?: number;
  height?: number;
  fps?: number;
}

export type EngineEvent =
  { type: 'data' } | ({ type: 'media-info' } & MediaInfo) | { type: 'error'; error: EngineError };

export interface EngineStats {
  engine: SourceType;
  bufferSeconds: number;
  decodedFrames?: number;
  droppedFrames?: number;
  speedKBps?: number;
}

export interface Engine {
  readonly kind: SourceType;
  load(video: HTMLVideoElement, src: StreamSource): Promise<void>;
  /** Idempotent. Must abort the network request synchronously, before the promise settles. */
  destroy(): Promise<void>;
  on(listener: (e: EngineEvent) => void): () => void;
  getStats(video: HTMLVideoElement): EngineStats;
}

export class EngineFailure extends Error {
  constructor(readonly error: EngineError) {
    super(error.detail);
  }
}

export function bufferAhead(video: HTMLVideoElement): number {
  const b = video.buffered;
  for (let i = 0; i < b.length; i++) {
    if (b.start(i) <= video.currentTime + 0.1 && b.end(i) >= video.currentTime) {
      return Math.max(0, b.end(i) - video.currentTime);
    }
  }
  return 0;
}

/** Fully releases a <video>: without this the browser can keep the socket open. */
export function resetVideo(video: HTMLVideoElement): void {
  try {
    video.pause();
  } catch {
    /* ignore */
  }
  video.removeAttribute('src');
  try {
    video.srcObject = null;
  } catch {
    /* ignore */
  }
  try {
    video.load();
  } catch {
    /* ignore */
  }
}
