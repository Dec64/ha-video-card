import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeConfig } from '../../src/config';
import { readSettings, SETTINGS_EVENT, writeSettings } from '../../src/settings';

const KEY = 'stream-card:settings:tv';

describe('device settings', () => {
  afterEach(() => localStorage.clear());

  it('reads nothing when nothing was saved, and ignores junk', () => {
    expect(readSettings('tv')).toEqual({});
    localStorage.setItem(KEY, '{"buffer":"huge","nowNext":"yes","stats":true}');
    expect(readSettings('tv')).toEqual({ stats: true });
    localStorage.setItem(KEY, 'not json');
    expect(readSettings('tv')).toEqual({});
  });

  it('saves per target, drops unset fields and forgets an empty set', () => {
    writeSettings('tv', { buffer: 'stable', nowNext: undefined });
    expect(localStorage.getItem(KEY)).toBe('{"buffer":"stable"}');
    expect(readSettings('tv')).toEqual({ buffer: 'stable' });
    expect(readSettings('kitchen')).toEqual({});
    writeSettings('tv', {});
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('tells every card on the page, with the settings, even if storage fails', () => {
    const seen = vi.fn();
    window.addEventListener(SETTINGS_EVENT, seen);
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    writeSettings('tv', { stats: true });
    set.mockRestore();
    window.removeEventListener(SETTINGS_EVENT, seen);
    expect((seen.mock.calls[0][0] as CustomEvent).detail).toEqual({
      target: 'tv',
      settings: { stats: true },
    });
  });

  it('the settings button is on unless the card says settings: false', () => {
    const base = { type: 'custom:stream-card', dispatcharr_url: 'https://dispatcharr.example' };
    expect(normalizeConfig(base).settings).toBe(true);
    expect(normalizeConfig({ ...base, settings: false }).settings).toBe(false);
  });
});
