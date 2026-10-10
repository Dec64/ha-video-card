import type { StreamSource } from '../types';
import { Emitter } from './emitter';
import {
  bufferAhead,
  EngineFailure,
  resetVideo,
  type Engine,
  type EngineEvent,
  type EngineStats,
} from './types';

/** Plain <video src>: MP4, and HLS on browsers that play it natively (Safari, iOS). */
export class NativeEngine implements Engine {
  readonly kind = 'native' as const;
  private emitter = new Emitter();
  private video?: HTMLVideoElement;
  private destroyed = false;
  private gotData = false;
  private cleanup: Array<() => void> = [];

  on(listener: (e: EngineEvent) => void): () => void {
    return this.emitter.on(listener);
  }

  async load(video: HTMLVideoElement, src: StreamSource): Promise<void> {
    if (this.destroyed) return;
    const path = src.url.split(/[?#]/)[0].toLowerCase();
    if (path.endsWith('.m3u8') && !video.canPlayType('application/vnd.apple.mpegurl')) {
      throw new EngineFailure({
        kind: 'unsupported-device',
        detail: 'native HLS not available in this browser',
      });
    }
    this.video = video;
    const listen = (name: string, fn: () => void) => {
      video.addEventListener(name, fn);
      this.cleanup.push(() => video.removeEventListener(name, fn));
    };
    const data = () => {
      if (this.gotData) return;
      this.gotData = true;
      this.emitter.emit({ type: 'data' });
    };
    listen('loadeddata', data);
    listen('progress', data);
    listen('loadedmetadata', () => {
      data();
      this.emitter.emit({
        type: 'media-info',
        hasVideo: video.videoWidth > 0,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    });
    listen('ended', () =>
      this.emitter.emit({ type: 'error', error: { kind: 'ended', detail: 'Stream ended' } }),
    );
    listen('error', () => {
      const err = video.error;
      if (!err || err.code === MediaError.MEDIA_ERR_ABORTED) return;
      const detail = `MediaError ${err.code}${err.message ? `: ${err.message}` : ''}`;
      const kind =
        err.code === MediaError.MEDIA_ERR_NETWORK
          ? 'network'
          : err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
            ? 'codec'
            : 'media';
      this.emitter.emit({ type: 'error', error: { kind, detail } });
    });
    video.src = src.url;
    video.load();
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emitter.clear();
    for (const fn of this.cleanup.splice(0)) fn();
    if (this.video) resetVideo(this.video);
    this.video = undefined;
  }

  getStats(video: HTMLVideoElement): EngineStats {
    const q = video.getVideoPlaybackQuality?.();
    return {
      engine: 'native',
      bufferSeconds: bufferAhead(video),
      decodedFrames: q?.totalVideoFrames,
      droppedFrames: q?.droppedVideoFrames,
    };
  }
}
