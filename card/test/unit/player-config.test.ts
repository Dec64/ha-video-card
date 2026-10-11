import { describe, expect, it } from 'vitest';
import { playerConfig } from '../../src/engines/mpegts-engine';

describe('playerConfig', () => {
  it('low chases the live edge; stable never jumps forward', () => {
    expect(playerConfig('low').liveBufferLatencyChasing).toBe(true);
    expect(playerConfig('stable').liveBufferLatencyChasing).toBe(false);
    expect(playerConfig('stable').isLive).toBe(true);
  });
});
