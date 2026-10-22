import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Engine, EngineEvent } from '../../src/engines/types';
import { PlaybackSession, sessionCounters, type SessionStatus } from '../../src/session';

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
    async play() {
      v.paused = false;
    },
  };
  return v as unknown as HTMLVideoElement & { currentTime: number };
}

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function setup(over: Partial<ConstructorParameters<typeof PlaybackSession>[2]> = {}) {
  const video = fakeVideo();
  const statuses: SessionStatus[] = [];
  const s = new PlaybackSession(
    video,
    { url: 'https://d.example/proxy/ts/stream/a', type: 'mpegts' },
    {
      startTimeoutMs: 5000,
      maxAttempts: 3,
      muted: false,
      backoffMs: [100, 200],
      stallTimeoutMs: 2000,
      createEngine: async () => new FakeEngine(),
      diagnose: async () => 'unreachable',
      onStatus: (st) => statuses.push(st),
      ...over,
    },
  );
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
