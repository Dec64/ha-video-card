import { describe, expect, it } from 'vitest';
import { playerConfig } from '../../src/engines/mpegts-engine';

describe('playerConfig', () => {
  it('low chases the live edge; stable never jumps forward', () => {
    expect(playerConfig('low').liveBufferLatencyChasing).toBe(true);
    expect(playerConfig('stable').liveBufferLatencyChasing).toBe(false);
    expect(playerConfig('stable').isLive).toBe(true);
    // auto keeps its own reserve and catches up with the playback rate instead.
    expect(playerConfig('auto').liveBufferLatencyChasing).toBe(false);
    expect(playerConfig('auto').isLive).toBe(true);
  });
});
