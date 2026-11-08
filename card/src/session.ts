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
import type { HealthKind } from './health-log';
import {
  FROZEN_MS,
  BLACK_MS,
  PictureSampler,
  PictureWatch,
  SAMPLE_MS,
  frameCount,
  type PictureProblem,
} from './picture';
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
  /** Watch for a frozen or black picture and recover (reconnect, then switchSource). */
  pictureCheck?: boolean;
  /**
   * Asks Dispatcharr to move the channel to its next source (through an HA action). Resolves
   * true if the request went out. Called while the connection is still open, so the channel
   * keeps running on Dispatcharr and switches in place.
   */
  switchSource?: (problem: PictureProblem) => Promise<boolean>;
  /** After max attempts (or a start timeout / HTTP error), retry every KEEP_TRYING_MS for ever. */
  keepTrying?: boolean;
  /** Something worth putting in the device's health log. */
  onHealth?: (kind: HealthKind, detail?: string) => void;
  /** Just before a reconnect tears down a picture that was playing (to keep the last frame up). */
  onBeforeReconnect?: () => void;
  createEngine?: EngineFactory;
  diagnose?: (url: string) => Promise<'cors' | 'unreachable'>;
}

const DEFAULT_BACKOFF = [1000, 2000, 4000, 8000, 15000];
/** keep_trying: the wait between attempts once the normal ones are used up. */
export const KEEP_TRYING_MS = 60_000;
/** Picture problems within this window climb the recovery ladder together. */
export const PICTURE_WINDOW_MS = 10 * 60_000;
/** At most one source switch per channel in this long. */
export const SWITCH_COOLDOWN_MS = 2 * 60_000;
/** Errors keep_trying retries slowly. Codec, CORS, device and config errors never fix themselves. */
const KEEP_TRYING_KINDS = new Set(['network', 'stall', 'ended', 'media', 'http', 'timeout']);

/** buffer: stable. Seconds of reserve before the picture starts, and before it resumes. */
export const STABLE_START_S = 8;
export const STABLE_RESUME_S = 5;
/** Below this much reserve while playing, pause and refill instead of stuttering. */
const UNDERRUN_S = 0.3;
/** If the reserve grows but never reaches the target (a slow link), start anyway after this. */
const MAX_HOLD_MS = 20_000;

/**
 * Largest hole in the buffer that counts as reserve and that the session jumps over. A live TS
 * stream often buffers in pieces (audio and video don't start or line up exactly), and the
 * browser stops at any hole. In `buffer: low` mpegts.js's catch-up jump gets past them; stable
 * mode has no catch-up, so without this the picture could sit on Buffering for ever.
 */
export const MAX_GAP_S = 3;

/**
 * Seconds buffered ahead of the playhead, from the next range if the playhead sits in a gap, and
 * across holes up to MAX_GAP_S (which skipGap() jumps).
 */
export function reserveAhead(video: HTMLVideoElement): number {
  const b = video.buffered;
  const t = video.currentTime;
  for (let i = 0; i < b.length; i++) {
    if (b.end(i) <= t) continue;
    const from = Math.max(t, b.start(i));
    let end = b.end(i);
    for (let j = i + 1; j < b.length && b.start(j) - end <= MAX_GAP_S; j++) end = b.end(j);
    return end - from;
  }
  return 0;
}

/**
 * Moves the playhead over a hole in the buffer: when it sits in one, or is at the end of a range
 * with more data a little later. Returns true if it moved.
 */
export function skipGap(video: HTMLVideoElement): boolean {
  const b = video.buffered;
  const t = video.currentTime;
  for (let i = 0; i < b.length; i++) {
    let next: number | undefined;
    if (t < b.start(i)) next = b.start(i);
    else if (t <= b.end(i)) {
      if (b.end(i) - t >= 0.15 || i + 1 >= b.length) return false;
      next = b.start(i + 1);
    } else continue;
    if (next - t > MAX_GAP_S + 0.15) return false;
    video.currentTime = next + 0.01;
    return true;
  }
  return false;
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
  private readonly sampler = new PictureSampler();
  private readonly watch = new PictureWatch();
  private lastSampleAt = 0;
  /** When each recent picture problem was seen (survives reconnects: same channel). */
  private pictureEvents: number[] = [];
  private lastSwitchAt = 0;
  /** A source switch is in flight; don't sample or climb the ladder meanwhile. */
  private switching = false;
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

  get buffer(): BufferMode {
    return this.opts.buffer ?? 'low';
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
    this.watch.reset();
    this.lastSampleAt = 0;
    this.update({
      state: this.status.failures > 0 ? 'reconnecting' : 'connecting',
      notice: undefined,
      retryAt: undefined,
      buffering: false,
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

  /**
   * The reserve logic is for mpegts.js, which buffers into MSE whatever the video is doing. A
   * native source with `preload="none"` wouldn't buffer before play(), so it never holds.
   */
  private get stable(): boolean {
    return this.opts.buffer === 'stable' && this.source.type === 'mpegts';
  }

  /** Pause the picture until the reserve is built (start) or refilled (after running dry). */
  private startHold(atStart: boolean): void {
    this.holding = true;
    this.holdIsStart = atStart;
    this.holdStartedAt = Date.now();
    this.holdBufferedEnd = bufferedEnd(this.video);
    this.lastProgressAt = Date.now();
    this.watch.reset();
    if (!atStart) {
      this.video.pause();
      this.opts.onHealth?.('buffering', 'reserve ran dry');
    }
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
    const overdue = now - this.holdStartedAt > MAX_HOLD_MS;
    if (overdue && ahead <= 1 && end - v.currentTime > STABLE_RESUME_S) {
      // Data keeps coming but never lines up into a reserve where the playhead is (a big hole
      // in the buffer): start from the newest data instead of holding for ever.
      v.currentTime = end - STABLE_RESUME_S;
      return;
    }
    if (ahead >= target || (ahead > 1 && overdue)) {
      skipGap(v);
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
      // The stall clock starts with the first data. Waiting for it is the start timeout's job:
      // a cold Dispatcharr channel can take longer than the stall timeout to send anything, and
      // counting that wait as a stall dropped the connection the moment the stream arrived.
      this.gotData = true;
      this.lastProgressAt = Date.now();
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
    // Playing into a hole in the buffer: jump it (the browser waits there for ever otherwise).
    if (this.source.type === 'mpegts' && !v.paused && skipGap(v)) return;
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
        if (this.status.state === 'playing') this.pictureTick(id, now);
      }
      this.lastTime = t;
      if (!this.lastProgressAt) this.lastProgressAt = now;
      return;
    }
    // Time isn't moving (paused, or stalling): that's the stall watchdog's business.
    this.watch.reset();
    if (v.paused || !this.gotData) return;
    if (!this.lastProgressAt) this.lastProgressAt = now;
    if (now - this.lastProgressAt > this.stallTimeoutMs) {
      void this.handleFailure(id, {
        kind: 'stall',
        detail: `no progress for ${this.stallTimeoutMs} ms`,
      });
    }
  }

  private pictureTick(id: number, now: number): void {
    if (!this.opts.pictureCheck || this.switching || this.video.videoWidth === 0) return;
    if (now - this.lastSampleAt < SAMPLE_MS) return;
    this.lastSampleAt = now;
    const problem = this.watch.check(this.sampler.sample(this.video), frameCount(this.video), now);
    if (problem) void this.onPictureProblem(id, problem);
  }

  /**
   * The recovery ladder for a bad picture on this channel: reconnect; then ask Dispatcharr for
   * the next source (if switchSource is set); then reconnect again; after that the picture is
   * taken to be what the channel really shows, and the check stops for this session.
   */
  private async onPictureProblem(id: number, problem: PictureProblem): Promise<void> {
    const now = Date.now();
    const secs = Math.round((problem === 'black' ? BLACK_MS : FROZEN_MS) / 1000);
    this.pictureEvents = this.pictureEvents.filter((t) => now - t < PICTURE_WINDOW_MS);
    this.pictureEvents.push(now);
    const n = this.pictureEvents.length;
    this.watch.reset();
    this.opts.onHealth?.(problem, `${secs} s, step ${Math.min(n, 4)}`);
    if (n >= 4) {
      this.watch.off.add(problem);
      this.pictureEvents = [];
      this.opts.onHealth?.('check-paused', `${problem} picture keeps coming back`);
      if (problem === 'black') this.update({ notice: format('pictureBlack') });
      return;
    }
    if (n === 2 && this.opts.switchSource && now - this.lastSwitchAt > SWITCH_COOLDOWN_MS) {
      this.lastSwitchAt = now;
      this.switching = true;
      let ok: boolean;
      try {
        ok = await this.opts.switchSource(problem);
      } catch {
        ok = false;
      }
      this.switching = false;
      if (!this.isCurrent(id)) return;
      this.opts.onHealth?.(ok ? 'switch' : 'switch-failed');
      if (ok) {
        // Dispatcharr switches the running channel in place: keep this connection (reconnecting
        // could let the channel stop and restart on its first source) and watch again.
        this.watch.reset();
        this.lastSampleAt = Date.now();
        return;
      }
    }
    this.fail(id, { kind: 'stall', detail: `picture ${problem} for ${secs} s` }, true);
  }

  /**
   * The network is back (browser online event, Fully Kiosk networkReconnect): skip the backoff
   * wait, or give up on a stalled picture now instead of at the stall timeout.
   */
  networkBack(): void {
    if (this.disposed) return;
    const id = this.attemptId;
    if (this.status.state === 'reconnecting' && this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
      this.opts.onHealth?.('network', 'retrying now');
      void this.attempt();
      return;
    }
    const v = this.video;
    if (
      this.status.state === 'playing' &&
      !v.paused &&
      this.lastProgressAt &&
      Date.now() - this.lastProgressAt > 2000
    ) {
      this.opts.onHealth?.('network', 'stalled picture, reconnecting');
      void this.handleFailure(id, { kind: 'stall', detail: 'network came back while stalled' });
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
    if (this.status.state === 'playing') this.opts.onBeforeReconnect?.();
    this.teardownEngine();
    const giveUp = !retryable || failures > this.opts.maxAttempts;
    const slow = giveUp && !!this.opts.keepTrying && KEEP_TRYING_KINDS.has(e.kind);
    if (giveUp && !slow) {
      this.opts.onHealth?.('gave-up', `${e.kind}: ${e.detail}`);
      this.terminal(
        retryable
          ? toPlaybackError(e, { attempts: failures })
          : toPlaybackError(e, { startTimeoutMs: this.opts.startTimeoutMs }),
      );
      return;
    }
    const backoff = this.opts.backoffMs ?? DEFAULT_BACKOFF;
    const delay = slow ? KEEP_TRYING_MS : backoff[Math.min(failures - 1, backoff.length - 1)];
    this.opts.onHealth?.(slow ? 'keep-trying' : 'reconnect', `${e.kind}: ${e.detail}`);
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
