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
import type { BufferMode, StreamSource } from './types';

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
  /** buffer: stable is holding the picture while it builds up its reserve. */
  buffering?: boolean;
  lastError?: string;
  /** While reconnecting: when the next attempt starts (epoch ms). */
  retryAt?: number;
}

export interface SessionOptions {
  startTimeoutMs: number;
  maxAttempts: number;
  muted: boolean;
  debug?: boolean;
  /** `stable` builds a reserve before playing and refills it instead of stuttering. */
  buffer?: BufferMode;
  onStatus: (s: SessionStatus) => void;
  stallTimeoutMs?: number;
  /** Playing this long without trouble resets the failure count. */
  stableMs?: number;
  backoffMs?: number[];
  createEngine?: EngineFactory;
  diagnose?: (url: string) => Promise<'cors' | 'unreachable'>;
}

const DEFAULT_BACKOFF = [1000, 2000, 4000, 8000, 15000];

/** buffer: stable. Seconds of reserve before the picture starts, and before it resumes. */
export const STABLE_START_S = 8;
export const STABLE_RESUME_S = 5;
/** Below this much reserve while playing, pause and refill instead of stuttering. */
const UNDERRUN_S = 0.3;
/** If the reserve grows but never reaches the target (a slow link), start anyway after this. */
const MAX_HOLD_MS = 20_000;

/** Seconds buffered ahead of the playhead (from the next range if the playhead sits in a gap). */
export function reserveAhead(video: HTMLVideoElement): number {
  const b = video.buffered;
  const t = video.currentTime;
  for (let i = 0; i < b.length; i++) {
    if (b.end(i) > t) return b.end(i) - Math.max(t, b.start(i));
  }
  return 0;
}

function bufferedEnd(video: HTMLVideoElement): number {
  const b = video.buffered;
  return b.length ? b.end(b.length - 1) : 0;
}

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
  /** buffer: stable is holding the picture until the reserve is built. */
  private holding = false;
  private holdIsStart = false;
  private holdStartedAt = 0;
  private holdBufferedEnd = 0;
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
    this.holding = false;
    this.update({
      state: this.status.failures > 0 ? 'reconnecting' : 'connecting',
      notice: undefined,
      retryAt: undefined,
    });

    let engine: Engine;
    try {
      engine = await this.createEngine(this.source.type, {
        debug: !!this.opts.debug,
        buffer: this.opts.buffer,
      });
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
    if (this.stable) {
      this.startHold(true);
      return;
    }
    await this.play(id);
  }

  private get stable(): boolean {
    return this.opts.buffer === 'stable';
  }

  /** Pause the picture until the reserve is built (start) or refilled (after running dry). */
  private startHold(atStart: boolean): void {
    this.holding = true;
    this.holdIsStart = atStart;
    this.holdStartedAt = Date.now();
    this.holdBufferedEnd = bufferedEnd(this.video);
    this.lastProgressAt = Date.now();
    if (!atStart) this.video.pause();
    this.update({ buffering: true });
  }

  private tickHolding(id: number): void {
    const v = this.video;
    const now = Date.now();
    const end = bufferedEnd(v);
    if (end > this.holdBufferedEnd + 0.01) {
      this.holdBufferedEnd = end;
      this.lastProgressAt = now;
    } else if (this.gotData && now - this.lastProgressAt > this.stallTimeoutMs) {
      // Nothing arriving while we wait: same as a stall while playing.
      void this.handleFailure(id, {
        kind: 'stall',
        detail: `no data for ${this.stallTimeoutMs} ms while buffering`,
      });
      return;
    }
    const ahead = reserveAhead(v);
    const target = this.holdIsStart ? STABLE_START_S : STABLE_RESUME_S;
    if (ahead >= target || (ahead > 1 && now - this.holdStartedAt > MAX_HOLD_MS)) {
      this.holding = false;
      this.lastTime = -1;
      this.lastProgressAt = now;
      this.update({ buffering: false });
      void this.play(id);
    }
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
    if (this.holding) {
      this.tickHolding(id);
      return;
    }
    const v = this.video;
    const now = Date.now();
    if (
      this.stable &&
      this.status.state === 'playing' &&
      !v.paused &&
      reserveAhead(v) < UNDERRUN_S
    ) {
      this.startHold(false);
      return;
    }
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
