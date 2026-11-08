import { afterEach, describe, expect, it } from 'vitest';
import { ChannelList, type Channel } from '../../src/channels';
import {
  favourites,
  genre,
  groupLabel,
  kindOf,
  left,
  pct,
  shortName,
  toggleFavourite,
} from '../../src/app/data';

const ch = (id: string, name: string, group?: string): Channel => ({
  id,
  url: `https://dispatcharr.example/proxy/ts/stream/${id}`,
  name,
  group,
  number: id,
});

describe('app data helpers', () => {
  it('shortens group and channel names', () => {
    expect(groupLabel('Sky: Entertainment')).toBe('Entertainment');
    expect(groupLabel('Films')).toBe('Films');
    expect(shortName(ch('1', 'Sky Sports Main Event UHD'))).toBe('Sky Sports Main Event');
  });

  it('formats time left and progress', () => {
    expect(left(8 * 60_000)).toBe('8 min');
    expect(left(65 * 60_000)).toBe('1 h 5 m');
    expect(left(60 * 60_000)).toBe('1 h');
    expect(pct({ title: 'x', start: 0, end: 100 }, 25)).toBe(25);
    expect(pct({ title: 'x' }, 25)).toBe(0);
  });

  it('sorts channels into kinds and programmes into genres', () => {
    expect(kindOf(ch('1', 'Sky Sports F1', 'Sky: Sports'))).toBe('sport');
    expect(kindOf(ch('2', 'Sky Cinema Comedy', 'Sky: Movies'))).toBe('film');
    expect(kindOf(ch('3', 'Sky News', 'Sky: News'))).toBe('news');
    expect(kindOf(ch('4', 'BBC One', 'Sky: Entertainment'))).toBe('other');
    expect(genre({ title: 'x', cats: ['Movies', 'Comedy'] })).toBe('Film · Comedy');
    expect(genre({ title: 'x', cats: ['Sports', 'Football'] })).toBe('Football');
  });
});

describe('device favourites', () => {
  afterEach(() => localStorage.clear());

  it('adds to and removes from the YAML favourites on this device only', () => {
    const all = [ch('1', 'One'), ch('2', 'Two'), ch('3', 'Three')];
    const list = new ChannelList(all, { favourites: ['1'] });
    expect(favourites(list, 'tv').map((c) => c.id)).toEqual(['1']);
    expect(toggleFavourite(list, 'tv', all[2])).toBe(true);
    expect(favourites(list, 'tv').map((c) => c.id)).toEqual(['1', '3']);
    expect(toggleFavourite(list, 'tv', all[0])).toBe(false);
    expect(favourites(list, 'tv').map((c) => c.id)).toEqual(['3']);
    expect(favourites(list, 'other').map((c) => c.id)).toEqual(['1']);
    toggleFavourite(list, 'tv', all[0]);
    toggleFavourite(list, 'tv', all[2]);
    expect(localStorage.getItem('stream-card:favourites:tv')).toBeNull();
  });
});
