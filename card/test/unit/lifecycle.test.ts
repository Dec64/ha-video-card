import { describe, expect, it } from 'vitest';
import { holdReason, type PlayConditions } from '../../src/lifecycle';

const ok: PlayConditions = {
  connected: true,
  preview: false,
  hasSource: true,
  wantPlaying: true,
  intersecting: true,
  pageVisible: true,
  screenAwake: true,
};

describe('holdReason', () => {
  it('plays only when every condition holds', () => {
    expect(holdReason(ok)).toBeNull();
  });

  it.each([
    ['connected', 'disconnected'],
    ['preview', 'preview'],
    ['hasSource', 'no-source'],
    ['wantPlaying', 'stopped'],
    ['pageVisible', 'page-hidden'],
    ['screenAwake', 'screen-off'],
    ['intersecting', 'hidden'],
  ] as const)('%s off → %s', (key, reason) => {
    const c = { ...ok, [key]: key === 'preview' };
    expect(holdReason(c)).toBe(reason);
  });

  it('reports the most specific reason first', () => {
    expect(holdReason({ ...ok, connected: false, preview: true })).toBe('disconnected');
    expect(holdReason({ ...ok, pageVisible: false, intersecting: false })).toBe('page-hidden');
  });
});
