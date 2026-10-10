import mpegts from 'mpegts.js';
import type { StreamSource } from '../types';
import { ImmediateAbortLoader } from './fetch-loader';
import { Emitter } from './emitter';
import {
  bufferAhead,
  EngineFailure,
  resetVideo,
  type Engine,
  type EngineError,
  type EngineEvent,
  type EngineStats,
} from './types';

/**
 * Starting profile for live Dispatcharr TS. Tuned for low-RAM tablets: keep ~15-30 s of back
 * buffer and jump forward if we fall more than 6 s behind live.
 */
const PLAYER_CONFIG: mpegts.Config = {
  enableWorker: false,
  isLive: true,
  enableStashBuffer: true,
  stashInitialSize: 256 * 1024,
  liveBufferLatencyChasing: true,
  liveBufferLatencyMaxLatency: 6,
  liveBufferLatencyMinRemain: 1.5,
  autoCleanupSourceBuffer: true,
  autoCleanupMaxBackwardDuration: 30,
  autoCleanupMinBackwardDuration: 15,
  lazyLoad: false,
  statisticsInfoReportInterval: 1000,
  // Aborts the fetch immediately on Chrome too; see fetch-loader.ts.
  customLoader: ImmediateAbortLoader as unknown as mpegts.CustomLoaderConstructor,
};

let loggingConfigured = false;

export function mpegtsSupported(): boolean {
  try {
    return mpegts.isSupported() && mpegts.getFeatureList().mseLivePlayback;
  } catch {
    return false;
  }
}

export function classifyMpegtsError(
  type: string,
  detail: string,
  info: { code?: number; msg?: string } | undefined,
): EngineError {
  const msg = `${type}/${detail}${info?.msg ? `: ${info.msg}` : ''}`;
  const E = mpegts.ErrorDetails;
  if (type === mpegts.ErrorTypes.NETWORK_ERROR) {
    if (detail === E.NETWORK_STATUS_CODE_INVALID) {
      return { kind: 'http', status: info?.code, detail: msg };
    }
    if (detail === E.NETWORK_UNRECOVERABLE_EARLY_EOF) return { kind: 'ended', detail: msg };
    return { kind: 'network', detail: msg };
  }
  if (type === mpegts.ErrorTypes.MEDIA_ERROR) {
    // e.g. "The type provided ('audio/mp4;codecs=ac-3') is unsupported." from addSourceBuffer
    const m = /(audio|video)\/mp4;\s*codecs="?([^"')\s]+)/i.exec(info?.msg ?? '');
    if (detail === E.MEDIA_MSE_ERROR && m && /unsupported|not supported/i.test(info?.msg ?? '')) {
      return {
        kind: 'codec',
        detail: msg,
        track: m[1].toLowerCase() as 'audio' | 'video',
        codec: m[2],
      };
    }
    if (detail === E.MEDIA_CODEC_UNSUPPORTED || detail === E.MEDIA_FORMAT_UNSUPPORTED) {
      return { kind: 'codec', detail: msg };
    }
    return { kind: 'media', detail: msg };
  }
  return { kind: 'media', detail: msg };
}

export class MpegtsEngine implements Engine {
  readonly kind = 'mpegts' as const;
  private player?: mpegts.Player;
  private video?: HTMLVideoElement;
  private emitter = new Emitter();
  private destroyed = false;
  private gotData = false;
  private speed = 0;

  constructor(private readonly debug = false) {}

  on(listener: (e: EngineEvent) => void): () => void {
    return this.emitter.on(listener);
  }

  async load(video: HTMLVideoElement, src: StreamSource): Promise<void> {
    if (this.destroyed) return;
    if (!mpegtsSupported()) {
      throw new EngineFailure({
        kind: 'unsupported-device',
        detail: 'mpegts.js: MediaSource / ManagedMediaSource live playback not available',
      });
    }
    if (!loggingConfigured || this.debug) {
      loggingConfigured = true;
      mpegts.LoggingControl.applyConfig({
        enableAll: false,
        enableError: true,
        enableWarn: this.debug,
        enableInfo: this.debug,
      });
    }
    const player = mpegts.createPlayer(
      { type: 'mpegts', isLive: true, url: src.url, cors: true },
      PLAYER_CONFIG,
    );
    this.player = player;
    this.video = video;
    const E = mpegts.Events;
    player.on(E.ERROR, (type: string, detail: string, info?: { code?: number; msg?: string }) => {
      this.emitter.emit({ type: 'error', error: classifyMpegtsError(type, detail, info) });
    });
    player.on(E.MEDIA_INFO, (mi: mpegts.MSEPlayerMediaInfo) => {
      this.markData();
      this.emitter.emit({
        type: 'media-info',
        videoCodec: mi.videoCodec,
        audioCodec: mi.audioCodec,
        hasVideo: mi.hasVideo,
        hasAudio: mi.hasAudio,
        width: mi.width,
        height: mi.height,
        fps: mi.fps,
      });
    });
    player.on(E.STATISTICS_INFO, (s: mpegts.MSEPlayerStatisticsInfo) => {
      this.speed = s.speed ?? 0;
      if (this.speed > 0) this.markData();
    });
    player.on(E.LOADING_COMPLETE, () => {
      this.emitter.emit({ type: 'error', error: { kind: 'ended', detail: 'Stream ended' } });
    });
    player.attachMediaElement(video);
    player.load();
  }

  private markData(): void {
    if (this.gotData) return;
    this.gotData = true;
    this.emitter.emit({ type: 'data' });
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emitter.clear();
    const player = this.player;
    this.player = undefined;
    if (player) {
      // unload() aborts the fetch; destroy() alone also does, but be explicit and defensive.
      for (const step of [
        () => player.pause(),
        () => player.unload(),
        () => player.detachMediaElement(),
        () => player.destroy(),
      ]) {
        try {
          step();
        } catch {
          /* already torn down */
        }
      }
    }
    if (this.video) resetVideo(this.video);
    this.video = undefined;
  }

  getStats(video: HTMLVideoElement): EngineStats {
    const q = video.getVideoPlaybackQuality?.();
    return {
      engine: 'mpegts',
      bufferSeconds: bufferAhead(video),
      decodedFrames: q?.totalVideoFrames,
      droppedFrames: q?.droppedVideoFrames,
      speedKBps: this.speed,
    };
  }
}
