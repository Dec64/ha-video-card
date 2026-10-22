import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChannelList, type Channel } from '../../src/channels';
import { parseRequest } from '../../src/config';
import { NUMBER_ENTRY_MS, NumberEntry } from '../../src/number-entry';
import { MAX_RECENTS, previousRecent, pushRecent, readRecents } from '../../src/recents';
import { clampVolume, readVolume, writeVolume } from '../../src/volume';

const ch = (number: string, name = `Ch ${number}`): Channel => ({
  id: `id-${number}`,
  streamId: `id-${number}`,
  url: `https://dispatcharr.example/proxy/ts/stream/id-${number}`,
  name,
  number,
});

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());

describe('recents', () => {
  it('keeps newest first, without duplicates, capped', () => {
    pushRecent('tv', { channel: 'a' });
    pushRecent('tv', { channel: 'b' });
    pushRecent('tv', { channel: 'a', title: 'A' });
    expect(readRecents('tv').map((e) => e.channel)).toEqual(['a', 'b']);
    for (let i = 0; i < 20; i++) pushRecent('tv', { channel: `x${i}` });
    expect(readRecents('tv')).toHaveLength(MAX_RECENTS);
    expect(readRecents('kitchen')).toEqual([]);
  });

  it('finds the channel to flip back to', () => {
    pushRecent('tv', { channel: 'a' });
    pushRecent('tv', { url: 'https://x.example/live.m3u8' });
    expect(previousRecent('tv', 'https://x.example/live.m3u8')?.channel).toBe('a');
    expect(previousRecent('tv', 'a')?.url).toBe('https://x.example/live.m3u8');
    expect(previousRecent('kitchen', 'a')).toBeUndefined();
  });

  it('ignores corrupt storage', () => {
    localStorage.setItem('stream-card:recent:tv', '{oops');
    expect(readRecents('tv')).toEqual([]);
    localStorage.setItem('stream-card:recent:tv', '[{"title":"no key"},{"channel":"a"}]');
    expect(readRecents('tv')).toEqual([{ channel: 'a' }]);
  });
});

describe('number entry', () => {
  it('tunes after a pause, on commit, or at once when the number is complete', () => {
    vi.useFakeTimers();
    const tuned: string[] = [];
    const n = new NumberEntry(
      (d) => tuned.push(d),
      () => {},
      (d) => d === '42',
    );
    n.press('3');
    n.press('0');
    expect(n.digits).toBe('30');
    vi.advanceTimersByTime(NUMBER_ENTRY_MS - 1);
    expect(tuned).toEqual([]);
    n.press('0');
    vi.advanceTimersByTime(NUMBER_ENTRY_MS);
    expect(tuned).toEqual(['300']);
    n.press('4');
    n.press('2');
    expect(tuned).toEqual(['300', '42']);
    n.press('1');
    n.commit();
    expect(tuned).toEqual(['300', '42', '1']);
  });

  it('deletes and clears without tuning', () => {
    vi.useFakeTimers();
    const tuned: string[] = [];
    const n = new NumberEntry(
      (d) => tuned.push(d),
      () => {},
    );
    n.press('1');
    n.press('2');
    n.delete();
    expect(n.digits).toBe('1');
    n.delete();
    n.press('x');
    vi.advanceTimersByTime(NUMBER_ENTRY_MS * 2);
    expect(tuned).toEqual([]);
    n.press('9');
    n.clear();
    vi.advanceTimersByTime(NUMBER_ENTRY_MS * 2);
    expect(tuned).toEqual([]);
  });

  it('matches channel numbers by prefix, exact match first', () => {
    const list = new ChannelList([ch('300'), ch('3'), ch('301'), ch('30'), ch('400')]);
    expect(list.numberMatches('30').map((c) => c.number)).toEqual(['30', '300', '301']);
    expect(list.numberMatches('3', 2).map((c) => c.number)).toEqual(['3', '30']);
    expect(list.numberMatches('9')).toEqual([]);
    expect(list.numberIsComplete('30')).toBe(false);
    expect(list.numberIsComplete('301')).toBe(true);
    expect(list.numberIsComplete('40')).toBe(false);
  });
});

describe('volume', () => {
  it('clamps and remembers per device', () => {
    expect(readVolume()).toBeUndefined();
    writeVolume(1.7);
    expect(readVolume()).toBe(1);
    writeVolume(0.3);
    expect(readVolume()).toBe(0.3);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(NaN)).toBe(1);
  });
});

describe('button payloads', () => {
  it('accepts navigation actions', () => {
    expect(parseRequest({ target: 'tv', action: 'channel_up' })?.action).toBe('channel_up');
    expect(parseRequest({ target: 'tv', action: 'last_channel' })?.action).toBe('last_channel');
    expect(parseRequest({ target: 'tv', action: 'sleep', sleep: 30 })?.sleep).toBe(30);
    expect(parseRequest({ target: 'tv', action: 'sleep', sleep: '0' })?.sleep).toBe(0);
    expect(parseRequest({ target: 'tv', action: 'volume', volume: 55 })?.volume).toBe(55);
    expect(parseRequest({ target: 'tv', action: 'sleep' })).toBeUndefined();
    expect(parseRequest({ target: 'tv', action: 'sleep', sleep: -5 })).toBeUndefined();
    expect(parseRequest({ target: 'tv', action: 'volume', volume: 'loud' })).toBeUndefined();
  });
});
