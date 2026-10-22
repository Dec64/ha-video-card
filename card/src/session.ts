import { createEngine as defaultCreateEngine, type EngineFactory } from './engines/registry';
import { videoIdle } from './engines/video-lock';
import {
  EngineFailure,
  type Engine,
  type EngineError,
  type EngineEvent,
  type EngineStats,
  type MediaInfo,
} from './engines/types';
import {
  checkCodecs,
  diagnoseFetchFailure,
  format,
  isRetryable,
  toPlaybackError,
  type PlaybackError,
} from './errors';
import type { StreamSource } from './types';

export type SessionState = 'connecting' | 'reconnecting' | 'playing' | 'error' | 'stopped';

export interface SessionStatus {
  state: SessionState;
  /** Consecutive failed attempts so far (0 while healthy). */
  failures: number;
  error?: PlaybackError;
  mediaInfo?: MediaInfo;
  /** Started muted because the browser blocked sound; the UI offers "tap to unmute". */
  mutedByPolicy: boolean;
  /** Even muted playback was blocked; the UI needs a tap to start. */
  needsGesture: boolean;
  /** Non-fatal problem to show over the picture. */
  notice?: string;
  lastError?: string;
  /** While reconnecting: when the next attempt starts (epoch ms). */
  retryAt?: number;
}

export interface SessionOptions {
  startTimeoutMs: number;
  maxAttempts: number;
  muted: boolean;
  debug?: boolean;
  onStatus: (s: SessionStatus) => void;
  stallTimeoutMs?: number;
  /** Playing this long without trouble resets the failure count. */
  stableMs?: number;
  backoffMs?: number[];
  createEngine?: EngineFactory;
  diagnose?: (url: string) => Promise<'cors' | 'unreachable'>;
}

const DEFAULT_BACKOFF = [1000, 2000, 4000, 8000, 15000];

/** Counts live sessions/engines so tests can spot leaks. */
export const sessionCounters = { sessions: 0, engines: 0 };

/**
 * One play attempt chain for one source on one <video>. Owns the engine, the start timeout,
 * the stall watchdog and reconnects. Never holds two engines (= two connections) at once.
 */
export class PlaybackSession {
  status: SessionStatus = {
    state: 'connecting',
    failures: 0,
    mutedByPolicy: false,
    needsGesture: false,
  };
  private engine?: Engine;
  private attemptId = 0;
  private disposed = false;
  private gotData = false;
  private startTimer?: ReturnType<typeof setTimeout>;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private watchdog?: ReturnType<typeof setInterval>;
  private lastTime = -1;
  private lastProgressAt = 0;
  private playingSince = 0;
  private readonly createEngine: EngineFactory;
  private readonly diagnose: (url: string) => Promise<'cors' | 'unreachable'>;

  constructor(
    private readonly video: HTMLVideoElement,
    readonly source: StreamSource,
    private readonly opts: SessionOptions,
  ) {
    this.createEngine = opts.createEngine ?? defaultCreateEngine;
    this.diagnose = opts.diagnose ?? diagnoseFetchFailure;
    sessionCounters.sessions++;
  }

  get stallTimeoutMs(): number {
    return this.opts.stallTimeoutMs ?? 8000;
  }

  start(): void {
    void this.attempt();
  }

  private update(patch: Partial<SessionStatus>): void {
    this.status = { ...this.status, ...patch };
    if (!this.disposed) this.opts.onStatus(this.status);
  }

  private isCurrent(id: number): boolean {
    return !this.disposed && id === this.attemptId;
  }

  private async attempt(): Promise<void> {
    const id = ++this.attemptId;
    this.gotData = false;
    this.lastTime = -1;
    this.lastProgressAt = 0;
    this.playingSince = 0;
    this.update({
      state: this.status.failures > 0 ? 'reconnecting' : 'connecting',
      notice: undefined,
      retryAt: undefined,
    });

    let engine: Engine;
    try {
      engine = await this.createEngine(this.source.type, { debug: !!this.opts.debug });
    } catch (err) {
      this.fail(id, { kind: 'media', detail: `could not load player: ${String(err)}` }, false);
      return;
    }
    if (!this.isCurrent(id)) {
      await engine.destroy();
      return;
    }
    this.engine = engine;
    sessionCounters.engines++;
    engine.on((ev) => this.onEngineEvent(id, ev));
    this.startTimer = setTimeout(() => {
      if (this.isCurrent(id) && !this.gotData) {
        this.fail(id, { kind: 'timeout', detail: 'no data before start timeout' }, false);
      }
    }, this.opts.startTimeoutMs);

    // A previous engine may still be finishing with this <video>.
    await videoIdle(this.video);
    if (!this.isCurrent(id)) return;
    try {
      await engine.load(this.video, this.source);
    } catch (err) {
      const e: EngineError =
        err instanceof EngineFailure ? err.error : { kind: 'media', detail: String(err) };
      void this.handleFailure(id, e);
      return;
    }
    if (!this.isCurrent(id)) return;
    this.watchdog = setInterval(() => this.tick(id), 500);
    await this.play(id);
  }

  private async play(id: number): Promise<void> {
    const v = this.video;
    v.muted = this.opts.muted || this.status.mutedByPolicy;
    try {
      await v.play();
      if (this.isCurrent(id)) this.update({ needsGesture: false });
    } catch (err) {
      if (!this.isCurrent(id)) return;
      const name = (err as DOMException)?.name;
      if (name === 'NotAllowedError' && !v.muted) {
        v.muted = true;
        this.update({ mutedByPolicy: true });
        try {
          await v.play();
          return;
        } catch {
          /* fall through */
        }
      }
      if (name === 'NotAllowedError') this.update({ needsGesture: true });
      // AbortError: load() interrupted play(); the next attempt or tick takes over.
    }
  }

  /** Mutes or unmutes now and on every reconnect (multiview moves the sound between tiles). */
  setMuted(muted: boolean): void {
    this.opts.muted = muted;
    this.video.muted = muted || this.status.mutedByPolicy;
  }

  /** Called from a user tap: retries play() inside the gesture, unmuting if asked. */
  async resumeFromGesture(unmute: boolean): Promise<void> {
    const v = this.video;
    if (unmute) {
      this.opts.muted = false;
      v.muted = false;
      this.update({ mutedByPolicy: false });
    }
    try {
      await v.play();
      this.update({ needsGesture: false });
    } catch {
      /* still blocked; leave the prompt up */
    }
  }

  private onEngineEvent(id: number, ev: EngineEvent): void {
    if (!this.isCurrent(id)) return;
    if (ev.type === 'data') {
      this.gotData = true;
      return;
    }
    if (ev.type === 'media-info') {
      const info: MediaInfo = { ...ev };
      delete (info as { type?: string }).type;
      this.update({ mediaInfo: info });
      const codecError = checkCodecs(info);
      if (codecError) {
        this.terminal(codecError);
        return;
      }
      return;
    }
    void this.handleFailure(id, ev.error);
  }

  private tick(id: number): void {
    if (!this.isCurrent(id)) return;
    const v = this.video;
    const now = Date.now();
    const t = v.currentTime;
    if (t !== this.lastTime) {
      if (this.lastTime >= 0 && t > this.lastTime) {
        this.lastProgressAt = now;
        if (this.status.state !== 'playing') {
          this.playingSince = now;
          this.update({ state: 'playing' });
        } else if (
          !this.status.notice &&
          this.source.type === 'mpegts' &&
          now - this.playingSince > 3000 &&
          this.video.videoWidth === 0
        ) {
          // mpegts.js skips video it can't handle (e.g. MPEG-2) and plays the audio alone.
          this.update({ notice: format('noVideo') });
        } else if (
          this.status.failures > 0 &&
          now - this.playingSince > (this.opts.stableMs ?? 30000)
        ) {
          this.update({ failures: 0 });
        }
      }
      this.lastTime = t;
      if (!this.lastProgressAt) this.lastProgressAt = now;
      return;
    }
    if (v.paused || !this.gotData) return;
    if (!this.lastProgressAt) this.lastProgressAt = now;
    if (now - this.lastProgressAt > this.stallTimeoutMs) {
      void this.handleFailure(id, {
        kind: 'stall',
        detail: `no progress for ${this.stallTimeoutMs} ms`,
      });
    }
  }

  private async handleFailure(id: number, e: EngineError): Promise<void> {
    if (!this.isCurrent(id)) return;
    if (e.kind === 'network' && !this.gotData) {
      // Free the connection before probing so we never hold two.
      this.teardownEngine();
      const verdict = await this.diagnose(this.source.url);
      if (!this.isCurrent(id)) return;
      if (verdict === 'cors') {
        this.terminal(toPlaybackError({ kind: 'cors', detail: e.detail }));
        return;
      }
    }
    if (e.kind === 'media' && this.status.mediaInfo) {
      const codecError = checkCodecs(this.status.mediaInfo);
      if (codecError) {
        this.terminal(codecError);
        return;
      }
    }
    this.fail(id, e, isRetryable(e));
  }

  private fail(id: number, e: EngineError, retryable: boolean): void {
    if (!this.isCurrent(id)) return;
    const failures = this.status.failures + 1;
    this.teardownEngine();
    if (!retryable) {
      this.terminal(toPlaybackError(e, { startTimeoutMs: this.opts.startTimeoutMs }));
      return;
    }
    if (failures > this.opts.maxAttempts) {
      this.terminal(toPlaybackError(e, { attempts: failures }));
      return;
    }
    const backoff = this.opts.backoffMs ?? DEFAULT_BACKOFF;
    const delay = backoff[Math.min(failures - 1, backoff.length - 1)];
    this.update({
      state: 'reconnecting',
      failures,
      retryAt: Date.now() + delay,
      lastError: `${e.kind}: ${e.detail}`,
    });
    this.retryTimer = setTimeout(() => {
      if (this.isCurrent(id)) void this.attempt();
    }, delay);
  }

  private terminal(error: PlaybackError): void {
    this.teardownEngine();
    this.attemptId++;
    this.update({ state: 'error', error, lastError: `${error.kind}: ${error.detail}` });
  }

  private clearTimers(): void {
    clearTimeout(this.startTimer);
    clearTimeout(this.retryTimer);
    clearInterval(this.watchdog);
    this.startTimer = this.retryTimer = this.watchdog = undefined;
  }

  /** Synchronously aborts the stream; the engine finishes cleaning up in the background. */
  private teardownEngine(): void {
    this.clearTimers();
    const engine = this.engine;
    this.engine = undefined;
    if (engine) {
      sessionCounters.engines--;
      void engine.destroy();
    }
  }

  async destroy(): Promise<void> {
    if (this.disposed) return;
    this.teardownEngine();
    this.disposed = true;
    this.attemptId++;
    this.status = { ...this.status, state: 'stopped' };
    sessionCounters.sessions--;
  }

  getStats(): EngineStats | undefined {
    return this.engine?.getStats(this.video);
  }
}
