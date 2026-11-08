import { beforeEach, describe, expect, it } from 'vitest';
import {
  appendHealth,
  clearHealth,
  HEALTH_MAX,
  readHealth,
  recentHealthLines,
  summarizeHealth,
} from '../../src/health-log';

describe('health log', () => {
  beforeEach(() => localStorage.clear());

  it('keeps events per target and caps the list', () => {
    for (let i = 0; i < HEALTH_MAX + 5; i++) appendHealth('tv', { t: i, kind: 'reconnect' });
    appendHealth('kitchen', { t: 1, kind: 'frozen' });
    const tv = readHealth('tv');
    expect(tv).toHaveLength(HEALTH_MAX);
    expect(tv[0].t).toBe(5);
    expect(readHealth('kitchen')).toEqual([{ t: 1, kind: 'frozen' }]);
    clearHealth('tv');
    expect(readHealth('tv')).toEqual([]);
  });

  it('ignores junk in storage', () => {
    localStorage.setItem('stream-card:health:tv', '{"not":"a list"}');
    expect(readHealth('tv')).toEqual([]);
    localStorage.setItem('stream-card:health:tv', '[1, {"t": 2, "kind": "black"}, null]');
    expect(readHealth('tv')).toEqual([{ t: 2, kind: 'black' }]);
  });

  it('summarizes the last 24 hours and lists recent events newest first', () => {
    const now = 3 * 24 * 3600_000;
    const events = [
      { t: 0, kind: 'frozen' as const },
      { t: now - 1000, kind: 'reconnect' as const, ch: 'News', detail: 'stall' },
      { t: now - 500, kind: 'reconnect' as const },
      { t: now - 100, kind: 'switch' as const },
    ];
    expect(summarizeHealth(events, now)).toBe('24 h: 2 reconnect · 1 switch');
    expect(summarizeHealth([], now)).toBe('24 h: no trouble');
    const lines = recentHealthLines(events, 2);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/switch$/);
    expect(lines[1]).toMatch(/reconnect$/);
  });
});
