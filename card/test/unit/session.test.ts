import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Engine, EngineEvent } from '../../src/engines/types';
import type { StreamSource } from '../../src/types';
import type { HealthKind } from '../../src/health-log';
import {
  AUTO_FAST,
  AUTO_LEVELS,
  AUTO_SLOW,
  AUTO_STEP_DOWN_MS,
  KEEP_TRYING_MS,
  PlaybackSession,
  reserveAhead,
  skipGap,
  sessionCounters,
  STABLE_RESUME_S,
  STABLE_START_S,
  type SessionStatus,
} from '../../src/session';

class FakeEngine implements Engine {
  readonly kind = 'mpegts' as const;
  listeners = new Set<(e: EngineEvent) => void>();
  destroyed = false;
  static live = 0;
  static created: FakeEngine[] = [];
  constructor() {
    FakeEngine.created.push(this);
  }
  on(l: (e: EngineEvent) => void) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  emit(e: EngineEvent) {
    for (const l of this.listeners) l(e);
  }
  async load() {
    FakeEngine.live++;
  }
  async destroy() {
    if (!this.destroyed) FakeEngine.live--;
    this.destroyed = true;
  }
  getStats() {
    return { engine: 'mpegts' as const, bufferSeconds: 0 };
  }
}

function fakeVideo() {
  const v = {
    currentTime: 0,
    paused: true,
    muted: false,
    videoWidth: 1920,
    /** Decoded frames; tests freeze the picture by not advancing it. */
    frames: 0,
    getVideoPlaybackQuality: () => ({ totalVideoFrames: v.frames, droppedVideoFrames: 0 }),
    buffered: { length: 0, start: () => 0, end: () => 0 },
    async play() {
      v.paused = false;
    },
  };
  return v as unknown as HTMLVideoElement & { currentTime: number; frames: number };
}

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function setup(
  over: Partial<ConstructorParameters<typeof PlaybackSession>[2]> = {},
  source: StreamSource = { url: 'https://d.example/proxy/ts/stream/a', type: 'mpegts' },
) {
  const video = fakeVideo();
  const statuses: SessionStatus[] = [];
  const s = new PlaybackSession(video, source, {
    startTimeoutMs: 5000,
    maxAttempts: 3,
    muted: false,
    backoffMs: [100, 200],
    stallTimeoutMs: 2000,
    createEngine: async () => new FakeEngine(),
    diagnose: async () => 'unreachable',
    onStatus: (st) => statuses.push(st),
    ...over,
  });
  return { s, video, statuses, engine: () => FakeEngine.created.at(-1)! };
}

describe('PlaybackSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeEngine.live = 0;
    FakeEngine.created = [];
  });
  afterEach(() => vi.useRealTimers());

  it('goes connecting → playing when time advances', async () => {
    const { s, video, statuses, engine } = setup();
    s.start();
    await flush();
    engine().emit({ type: 'data' });
    video.currentTime = 0.5;
    vi.advanceTimersByTime(500);
    video.currentTime = 1;
    vi.advanceTimersByTime(500);
    expect(statuses.at(-1)?.state).toBe('playing');
    await s.destroy();
  });

  it('times out when no data arrives', async () => {
    const { s, statuses } = setup();
    s.start();
    await flush();
    vi.advanceTimersByTime(5001);
    expect(statuses.at(-1)).toMatchObject({ state: 'error', error: { kind: 'timeout' } });
    expect(FakeEngine.live).toBe(0);
  });

  it('keeps a changed mute setting across reconnects (multiview sound focus)', async () => {
    const { s, video, engine } = setup({ muted: true });
    s.start();
    await flush();
    expect(video.muted).toBe(true);
    s.setMuted(false);
    expect(video.muted).toBe(false);
    engine().emit({ type: 'data' });
    engine().emit({ type: 'error', error: { kind: 'ended', detail: 'eof' } });
    vi.advanceTimersByTime(100);
    await flush();
    expect(FakeEngine.created).toHaveLength(2);
    expect(video.muted).toBe(false);
    s.setMuted(true);
    expect(video.muted).toBe(true);
    await s.destroy();
  });

  it('reconnects on retryable errors and never holds two engines', async () => {
    const { s, statuses, engine } = setup();
    s.start();
    await flush();
    engine().emit({ type: 'data' });
    engine().emit({ type: 'error', error: { kind: 'ended', detail: 'eof' } });
    expect(FakeEngine.live).toBe(0);
    expect(statuses.at(-1)).toMatchObject({ state: 'reconnecting', failures: 1 });
    vi.advanceTimersByTime(100);
    await flush();
    expect(FakeEngine.created).toHaveLength(2);
    expect(FakeEngine.live).toBe(1);
    await s.destroy();
    expect(FakeEngine.live).toBe(0);
  });

  it('gives up after maxAttempts', async () => {
    const { s, statuses, engine } = setup({ maxAttempts: 2 });
    s.start();
    for (let i = 0; i < 3; i++) {
      await flush();
      engine().emit({ type: 'data' });
      engine().emit({ type: 'error', error: { kind: 'http', status: 503, detail: '' } });
      vi.advanceTimersByTime(1000);
    }
    expect(statuses.at(-1)).toMatchObject({ state: 'error', error: { kind: 'http' } });
    expect(FakeEngine.created).toHaveLength(3);
  });

  it('detects a stall', async () => {
    const { s, video, statuses, engine } = setup();
    s.start();
    await flush();
    engine().emit({ type: 'data' });
    video.currentTime = 1;
    vi.advanceTimersByTime(500);
    video.currentTime = 2;
    vi.advanceTimersByTime(500);
    vi.advanceTimersByTime(2600); // no progress
    expect(statuses.at(-1)).toMatchObject({ state: 'reconnecting' });
    expect(statuses.at(-1)?.lastError).toContain('stall');
    await s.destroy();
  });

  it('turns an early network failure into a CORS error when the server answers no-cors', async () => {
    const { s, statuses, engine } = setup({ diagnose: async () => 'cors' });
    s.start();
    await flush();
    engine().emit({ type: 'error', error: { kind: 'network', detail: 'Failed to fetch' } });
    await flush();
    expect(statuses.at(-1)).toMatchObject({ state: 'error', error: { kind: 'cors' } });
  });

  it('stops on unsupported codecs from media info', async () => {
    const { s, statuses, engine } = setup();
    s.start();
    await flush();
    vi.stubGlobal('MediaSource', { isTypeSupported: (m: string) => !m.includes('ac-3') });
    engine().emit({ type: 'media-info', videoCodec: 'avc1.640028', audioCodec: 'ac-3' });
    expect(statuses.at(-1)?.error?.message).toContain('AC-3');
    vi.unstubAllGlobals();
  });

  it('falls back to muted autoplay when sound is blocked', async () => {
    const { s, video } = setup();
    let calls = 0;
    video.play = async () => {
      calls++;
      if (!video.muted) throw new DOMException('no', 'NotAllowedError');
    };
    s.start();
    await flush();
    await flush();
    expect(calls).toBe(2);
    expect(video.muted).toBe(true);
    expect(s.status.mutedByPolicy).toBe(true);
    await s.destroy();
  });

  it('counts sessions for leak checks', async () => {
    const before = sessionCounters.sessions;
    const { s } = setup();
    expect(sessionCounters.sessions).toBe(before + 1);
    await s.destroy();
    await s.destroy();
    expect(sessionCounters.sessions).toBe(before);
  });
});

describe('PlaybackSession with buffer: stable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeEngine.live = 0;
    FakeEngine.created = [];
  });
  afterEach(() => vi.useRealTimers());

  /** A video whose buffered range is [0, bufEnd]. */
  function stableSetup() {
    const env = setup({ buffer: 'stable' });
    const v = env.video as unknown as Record<string, unknown> & { bufEnd: number };
    v.bufEnd = 0;
    v.buffered = {
      get length() {
        return v.bufEnd > 0 ? 1 : 0;
      },
      start: () => 0,
      end: () => v.bufEnd,
    };
    v.pause = () => {
      v.paused = true;
    };
    return { ...env, v };
  }

  it('waits for the reserve before playing', async () => {
    const { s, video, statuses, engine, v } = stableSetup();
    s.start();
    await flush();
    engine().emit({ type: 'data' });
    v.bufEnd = 4;
    await vi.advanceTimersByTimeAsync(1000);
    expect(video.paused).toBe(true);
    expect(statuses.at(-1)?.buffering).toBe(true);
    v.bufEnd = STABLE_START_S + 0.5;
    await vi.advanceTimersByTimeAsync(600);
    expect(video.paused).toBe(false);
    expect(statuses.at(-1)?.buffering).toBe(false);
    void s.destroy();
  });

  it('refills the reserve after running dry instead of stuttering', async () => {
    const { s, video, statuses, engine, v } = stableSetup();
    s.start();
    await flush();
    engine().emit({ type: 'data' });
    v.bufEnd = 9;
    await vi.advanceTimersByTimeAsync(600);
    video.currentTime = 1;
    await vi.advanceTimersByTimeAsync(500);
    video.currentTime = 2;
    await vi.advanceTimersByTimeAsync(500);
    expect(statuses.at(-1)?.state).toBe('playing');
    video.currentTime = 8.9; // reserve 0.1 s
    await vi.advanceTimersByTimeAsync(500);
    expect(video.paused).toBe(true);
    expect(statuses.at(-1)?.buffering).toBe(true);
    v.bufEnd = 8.9 + STABLE_RESUME_S + 0.2;
    await vi.advanceTimersByTimeAsync(500);
    expect(video.paused).toBe(false);
    expect(statuses.at(-1)?.buffering).toBe(false);
    expect(FakeEngine.created).toHaveLength(1);
    void s.destroy();
  });

  it('starts across a small hole at the start of the buffer instead of holding for ever', async () => {
    const { s, video, statuses, engine, v } = stableSetup();
    s.start();
    await flush();
    engine().emit({ type: 'data' });
    // [0, 0.5] then [0.6, bufEnd]: the browser would stop at 0.5.
    (v as Record<string, unknown>).buffered = {
      length: 2,
      start: (i: number) => (i ? 0.6 : 0),
      end: (i: number) => (i ? v.bufEnd : 0.5),
    };
    v.bufEnd = STABLE_START_S + 1;
    await vi.advanceTimersByTimeAsync(600);
    expect(video.paused).toBe(false);
    expect(statuses.at(-1)?.buffering).toBe(false);
    void s.destroy();
  });

  it('starts from the newest data if a big hole keeps the reserve from building', async () => {
    const { s, video, statuses, engine, v } = stableSetup();
    s.start();
    await flush();
    engine().emit({ type: 'data' });
    // [0, 0.5], then data from 10 s on that keeps growing.
    (v as Record<string, unknown>).buffered = {
      length: 2,
      start: (i: number) => (i ? 10 : 0),
      end: (i: number) => (i ? v.bufEnd : 0.5),
    };
    for (let t = 0; t < 21_000; t += 500) {
      v.bufEnd = 10.5 + t / 1000;
      await vi.advanceTimersByTimeAsync(500);
    }
    await vi.advanceTimersByTimeAsync(1000);
    expect(video.currentTime).toBeGreaterThan(10);
    expect(video.paused).toBe(false);
    expect(statuses.at(-1)?.buffering).toBe(false);
    expect(FakeEngine.created).toHaveLength(1);
    void s.destroy();
  });

  it('plays a native source at once: with preload none it would never build a reserve', async () => {
    const { s, video, statuses, engine } = setup(
      { buffer: 'stable' },
      { url: 'https://d.example/live.m3u8', type: 'native' },
    );
    s.start();
    await flush();
    engine().emit({ type: 'data' });
    await vi.advanceTimersByTimeAsync(600);
    expect(video.paused).toBe(false);
    expect(statuses.some((st) => st.buffering)).toBe(false);
    void s.destroy();
  });

  it('treats no data while buffering as a stall and reconnects with one engine at a time', async () => {
    const { s, engine, v } = stableSetup();
    s.start();
    await flush();
    engine().emit({ type: 'data' });
    v.bufEnd = 2;
    await vi.advanceTimersByTimeAsync(3000); // stallTimeoutMs is 2000
    expect(FakeEngine.created[0].destroyed).toBe(true);
    await vi.advanceTimersByTimeAsync(200);
    await flush();
    expect(FakeEngine.created).toHaveLength(2);
    expect(FakeEngine.live).toBeLessThanOrEqual(1);
    void s.destroy();
  });
});

describe('reserveAhead', () => {
  const vid = (t: number, ranges: Array<[number, number]>) =>
    ({
      currentTime: t,
      buffered: {
        length: ranges.length,
        start: (i: number) => ranges[i][0],
        end: (i: number) => ranges[i][1],
      },
    }) as unknown as HTMLVideoElement;
  it('measures from the playhead, or from the next range across a gap', () => {
    expect(reserveAhead(vid(2, [[0, 10]]))).toBe(8);
    expect(reserveAhead(vid(0, [[0.5, 6]]))).toBe(5.5);
    expect(reserveAhead(vid(12, [[0, 10]]))).toBe(0);
    expect(reserveAhead(vid(0, []))).toBe(0);
  });
  it('counts small holes as reserve, not big ones', () => {
    expect(
      reserveAhead(
        vid(0, [
          [0, 0.5],
          [0.6, 9],
        ]),
      ),
    ).toBe(9);
    expect(
      reserveAhead(
        vid(0, [
          [0, 0.5],
          [5, 9],
        ]),
      ),
    ).toBe(0.5);
  });
});

describe('skipGap', () => {
  const vid = (t: number, ranges: Array<[number, number]>) =>
    ({
      currentTime: t,
      buffered: {
        length: ranges.length,
        start: (i: number) => ranges[i][0],
        end: (i: number) => ranges[i][1],
      },
    }) as unknown as HTMLVideoElement & { currentTime: number };
  it('jumps a hole at or just ahead of the playhead', () => {
    const atEnd = vid(0.45, [
      [0, 0.5],
      [0.6, 9],
    ]);
    expect(skipGap(atEnd)).toBe(true);
    expect(atEnd.currentTime).toBeCloseTo(0.61);
    const inHole = vid(0, [[1.2, 9]]);
    expect(skipGap(inHole)).toBe(true);
    expect(inHole.currentTime).toBeCloseTo(1.21);
  });
  it('leaves the playhead alone mid-range, at the live edge, or before a big hole', () => {
    for (const v of [
      vid(2, [
        [0, 0.5],
        [0.6, 9],
      ]),
      vid(8.95, [[0, 9]]),
      vid(0.45, [
        [0, 0.5],
        [10, 19],
      ]),
    ]) {
      const t = v.currentTime;
      expect(skipGap(v)).toBe(false);
      expect(v.currentTime).toBe(t);
    }
  });
});

describe('PlaybackSession recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeEngine.live = 0;
    FakeEngine.created = [];
  });
  afterEach(() => vi.useRealTimers());

  /** Plays for `ms`: time advances; frames advance unless `frozen`. */
  function playFor(video: ReturnType<typeof setup>['video'], ms: number, frozen = false) {
    for (let t = 0; t < ms; t += 500) {
      video.currentTime += 0.5;
      if (!frozen) video.frames += 12;
      vi.advanceTimersByTime(500);
    }
  }

  async function connect(r: ReturnType<typeof setup>) {
    await flush();
    r.engine().emit({ type: 'data' });
    playFor(r.video, 1500);
  }

  it('climbs the ladder for a frozen picture: reconnect, switch source, reconnect, stop checking', async () => {
    const health: HealthKind[] = [];
    const switchSource = vi.fn(async () => true);
    const r = setup({
      pictureCheck: true,
      maxAttempts: 10,
      switchSource,
      onHealth: (k) => health.push(k),
    });
    r.s.start();
    await connect(r);
    expect(r.statuses.at(-1)?.state).toBe('playing');

    playFor(r.video, 14_000, true);
    expect(health).toEqual(['frozen', 'reconnect']);
    expect(FakeEngine.live).toBe(0);
    vi.advanceTimersByTime(100);
    await connect(r);
    expect(FakeEngine.created).toHaveLength(2);

    playFor(r.video, 14_000, true);
    await flush();
    expect(switchSource).toHaveBeenCalledWith('frozen');
    expect(health.slice(2)).toEqual(['frozen', 'switch']);
    // The switch happens in place on Dispatcharr: the connection stays open.
    expect(FakeEngine.created).toHaveLength(2);
    expect(FakeEngine.live).toBe(1);

    playFor(r.video, 14_000, true);
    expect(health.slice(4)).toEqual(['frozen', 'reconnect']);
    vi.advanceTimersByTime(200);
    await connect(r);

    playFor(r.video, 14_000, true);
    expect(health.slice(6)).toEqual(['frozen', 'check-paused']);
    playFor(r.video, 60_000, true);
    expect(health).toHaveLength(8);
    expect(r.statuses.at(-1)?.state).toBe('playing');
    expect(FakeEngine.live).toBe(1);
    await r.s.destroy();
  });

  it('reconnects instead of switching when switch_source is not set', async () => {
    const health: HealthKind[] = [];
    const r = setup({ pictureCheck: true, maxAttempts: 10, onHealth: (k) => health.push(k) });
    r.s.start();
    await connect(r);
    playFor(r.video, 14_000, true);
    vi.advanceTimersByTime(100);
    await connect(r);
    playFor(r.video, 14_000, true);
    expect(health).toEqual(['frozen', 'reconnect', 'frozen', 'reconnect']);
    await r.s.destroy();
  });

  it('reconnects when the switch request fails', async () => {
    const health: HealthKind[] = [];
    const r = setup({
      pictureCheck: true,
      maxAttempts: 10,
      switchSource: async () => {
        throw new Error('HA said no');
      },
      onHealth: (k) => health.push(k),
    });
    r.s.start();
    await connect(r);
    playFor(r.video, 14_000, true);
    vi.advanceTimersByTime(100);
    await connect(r);
    playFor(r.video, 14_000, true);
    await flush();
    expect(health).toEqual(['frozen', 'reconnect', 'frozen', 'switch-failed', 'reconnect']);
    expect(FakeEngine.live).toBe(0);
    await r.s.destroy();
  });

  it('does not check the picture unless asked', async () => {
    const health: HealthKind[] = [];
    const r = setup({ onHealth: (k) => health.push(k) });
    r.s.start();
    await connect(r);
    playFor(r.video, 30_000, true);
    expect(health).toEqual([]);
    expect(r.statuses.at(-1)?.state).toBe('playing');
    await r.s.destroy();
  });

  it('keeps the last frame: onBeforeReconnect runs while the picture is still there', async () => {
    const before = vi.fn(() => expect(FakeEngine.live).toBe(1));
    const r = setup({ onBeforeReconnect: before });
    r.s.start();
    await connect(r);
    r.engine().emit({ type: 'error', error: { kind: 'ended', detail: 'eof' } });
    expect(before).toHaveBeenCalledTimes(1);
    expect(FakeEngine.live).toBe(0);
    await r.s.destroy();
  });

  it('keep_trying: retries every minute after the normal attempts instead of stopping', async () => {
    const health: HealthKind[] = [];
    const r = setup({ maxAttempts: 1, keepTrying: true, onHealth: (k) => health.push(k) });
    r.s.start();
    for (let i = 0; i < 2; i++) {
      await flush();
      r.engine().emit({ type: 'data' });
      r.engine().emit({ type: 'error', error: { kind: 'http', status: 503, detail: '' } });
      vi.advanceTimersByTime(100);
    }
    const st = r.statuses.at(-1)!;
    expect(st.state).toBe('reconnecting');
    expect(st.retryAt! - Date.now()).toBeGreaterThan(KEEP_TRYING_MS - 1000);
    expect(health).toEqual(['reconnect', 'keep-trying']);
    expect(FakeEngine.live).toBe(0);
    vi.advanceTimersByTime(KEEP_TRYING_MS);
    await flush();
    expect(FakeEngine.live).toBe(1);
    await r.s.destroy();
  });

  it('keep_trying: a start timeout retries slowly too, but a codec error still stops', async () => {
    const r = setup({ keepTrying: true });
    r.s.start();
    await flush();
    vi.advanceTimersByTime(5001);
    expect(r.statuses.at(-1)?.state).toBe('reconnecting');
    vi.advanceTimersByTime(KEEP_TRYING_MS);
    await flush();
    r.engine().emit({ type: 'data' });
    r.engine().emit({
      type: 'error',
      error: { kind: 'codec', detail: 'x', track: 'audio', codec: 'ac-3' },
    });
    await flush();
    expect(r.statuses.at(-1)?.state).toBe('error');
    expect(FakeEngine.live).toBe(0);
  });

  it('retries at once when the network comes back', async () => {
    const health: HealthKind[] = [];
    const r = setup({ backoffMs: [10_000], onHealth: (k) => health.push(k) });
    r.s.start();
    await connect(r);
    r.engine().emit({ type: 'error', error: { kind: 'network', detail: 'offline' } });
    await flush();
    expect(r.statuses.at(-1)?.state).toBe('reconnecting');
    expect(FakeEngine.live).toBe(0);
    r.s.networkBack();
    await flush();
    expect(FakeEngine.created).toHaveLength(2);
    expect(FakeEngine.live).toBe(1);
    expect(health).toContain('network');
    // The cancelled backoff timer doesn't start a second engine later.
    vi.advanceTimersByTime(10_000);
    await flush();
    expect(FakeEngine.created).toHaveLength(2);
    await r.s.destroy();
  });

  it('ignores the network coming back once the retry is already running', async () => {
    const r = setup({ backoffMs: [100] });
    r.s.start();
    await connect(r);
    r.engine().emit({ type: 'error', error: { kind: 'network', detail: 'offline' } });
    vi.advanceTimersByTime(100); // the retry fires and starts connecting
    expect(r.statuses.at(-1)?.state).toBe('reconnecting');
    r.s.networkBack();
    await flush();
    expect(FakeEngine.created).toHaveLength(2);
    expect(FakeEngine.live).toBe(1);
    await r.s.destroy();
    expect(FakeEngine.live).toBe(0);
  });

  it('gives up on a stalled picture at once when the network comes back', async () => {
    const r = setup({ stallTimeoutMs: 20_000 });
    r.s.start();
    await connect(r);
    vi.advanceTimersByTime(3000); // time stops moving
    r.s.networkBack();
    await flush();
    expect(r.statuses.at(-1)?.state).toBe('reconnecting');
    expect(FakeEngine.live).toBe(0);
    await r.s.destroy();
  });
});

describe('PlaybackSession with buffer: auto', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeEngine.live = 0;
    FakeEngine.created = [];
  });
  afterEach(() => vi.useRealTimers());

  function autoSetup(over: Partial<ConstructorParameters<typeof PlaybackSession>[2]> = {}) {
    const levels: number[] = [];
    const health: HealthKind[] = [];
    const env = setup({
      buffer: 'auto',
      onAutoLevel: (l) => levels.push(l),
      onHealth: (k) => health.push(k),
      ...over,
    });
    const v = env.video as unknown as Record<string, unknown> & {
      bufEnd: number;
      playbackRate: number;
    };
    v.bufEnd = 0;
    v.playbackRate = 1;
    v.buffered = {
      get length() {
        return v.bufEnd > 0 ? 1 : 0;
      },
      start: () => 0,
      end: () => v.bufEnd,
    };
    v.pause = () => {
      v.paused = true;
    };
    return { ...env, v, levels, health };
  }

  /** Plays `secs` of video over `secs` of wall clock, with `ahead` seconds buffered beyond. */
  async function play(env: ReturnType<typeof autoSetup>, secs: number, ahead: number) {
    for (let i = 0; i < secs * 2; i++) {
      env.video.currentTime += 0.5;
      env.v.bufEnd = env.video.currentTime + ahead;
      await vi.advanceTimersByTimeAsync(500);
    }
  }

  it("starts once this device's level of reserve is built", async () => {
    const env = autoSetup({ autoLevel: 2 });
    env.s.start();
    await flush();
    env.engine().emit({ type: 'data' });
    env.v.bufEnd = AUTO_LEVELS[2] - 1;
    await vi.advanceTimersByTimeAsync(1000);
    expect(env.video.paused).toBe(true);
    env.v.bufEnd = AUTO_LEVELS[2] + 0.2;
    await vi.advanceTimersByTimeAsync(600);
    expect(env.video.paused).toBe(false);
    expect(env.s.autoInfo).toEqual({ level: 2, target: AUTO_LEVELS[2], rate: 1 });
    await env.s.destroy();
  });

  it('raises the level when the picture runs dry, and remembers it', async () => {
    const env = autoSetup();
    env.s.start();
    await flush();
    env.engine().emit({ type: 'data' });
    env.v.bufEnd = 2;
    await vi.advanceTimersByTimeAsync(600);
    await play(env, 3, 1.5);
    expect(env.statuses.at(-1)?.state).toBe('playing');
    env.v.bufEnd = env.video.currentTime + 0.1; // ran dry
    await vi.advanceTimersByTimeAsync(500);
    expect(env.video.paused).toBe(true);
    expect(env.s.autoInfo?.level).toBe(1);
    expect(env.levels).toEqual([]); // saved once the refill works
    // Refills to the new, larger target before playing again.
    env.v.bufEnd = env.video.currentTime + AUTO_LEVELS[1] - 0.5;
    await vi.advanceTimersByTimeAsync(600);
    expect(env.video.paused).toBe(true);
    env.v.bufEnd = env.video.currentTime + AUTO_LEVELS[1] + 0.2;
    await vi.advanceTimersByTimeAsync(600);
    expect(env.video.paused).toBe(false);
    expect(env.levels).toEqual([1]);
    expect(env.health).toEqual(['buffering', 'buffer-level']);
    await env.s.destroy();
  });

  it('a stall while refilling keeps the old level (not a buffer-size problem)', async () => {
    const env = autoSetup();
    env.s.start();
    await flush();
    env.engine().emit({ type: 'data' });
    env.v.bufEnd = 2;
    await vi.advanceTimersByTimeAsync(600);
    await play(env, 3, 1.5);
    env.v.bufEnd = env.video.currentTime + 0.1; // ran dry, and nothing more arrives
    await vi.advanceTimersByTimeAsync(3100);
    expect(env.statuses.at(-1)?.state).toBe('reconnecting');
    expect(env.levels).toEqual([]);
    expect(env.health).toEqual(['buffering', 'reconnect']);
    expect(env.s.autoInfo?.level).toBe(0);
    await env.s.destroy();
  });

  it('catches up a little faster when far ahead, slows a little when low', async () => {
    const env = autoSetup({ autoLevel: 2 });
    env.s.start();
    await flush();
    env.engine().emit({ type: 'data' });
    env.v.bufEnd = 6;
    await vi.advanceTimersByTimeAsync(600);
    const target = AUTO_LEVELS[2];
    await play(env, 2, target);
    expect(env.v.playbackRate).toBe(1);
    await play(env, 2, target + 4);
    expect(env.v.playbackRate).toBe(AUTO_FAST);
    await play(env, 1, target + 1); // hysteresis: keeps catching up
    expect(env.v.playbackRate).toBe(AUTO_FAST);
    await play(env, 1, target);
    expect(env.v.playbackRate).toBe(1);
    await play(env, 2, target * 0.4);
    expect(env.v.playbackRate).toBe(AUTO_SLOW);
    await play(env, 2, target);
    expect(env.v.playbackRate).toBe(1);
    await env.s.destroy();
    expect(env.v.playbackRate).toBe(1);
  });

  it('jumps forward instead of racing when very far behind live', async () => {
    const env = autoSetup();
    env.s.start();
    await flush();
    env.engine().emit({ type: 'data' });
    env.v.bufEnd = 2;
    await vi.advanceTimersByTimeAsync(600);
    await play(env, 1, 1.5);
    env.v.bufEnd = env.video.currentTime + 30;
    await vi.advanceTimersByTimeAsync(500);
    expect(env.v.bufEnd - env.video.currentTime).toBeCloseTo(AUTO_LEVELS[0], 0);
    await env.s.destroy();
  });

  it('steps the level down after a smooth spell', async () => {
    const env = autoSetup({ autoLevel: 3 });
    env.s.start();
    await flush();
    env.engine().emit({ type: 'data' });
    env.v.bufEnd = AUTO_LEVELS[3] + 0.5;
    await vi.advanceTimersByTimeAsync(600);
    await play(env, AUTO_STEP_DOWN_MS / 1000 + 2, AUTO_LEVELS[3]);
    expect(env.levels).toEqual([2]);
    expect(env.s.autoInfo?.level).toBe(2);
    await env.s.destroy();
  });

  it('low never touches the playback rate or the level', async () => {
    const env = autoSetup({ buffer: 'low' });
    env.s.start();
    await flush();
    env.engine().emit({ type: 'data' });
    await play(env, 3, 20);
    expect(env.v.playbackRate).toBe(1);
    expect(env.s.autoInfo).toBeUndefined();
    expect(env.levels).toEqual([]);
    await env.s.destroy();
  });
});
