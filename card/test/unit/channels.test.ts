import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ChannelList,
  ChannelListError,
  clearChannelCache,
  FAVOURITES,
  loadChannels,
  parseM3u,
  type Channel,
} from '../../src/channels';

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const U3 = '33333333-3333-4333-8333-333333333333';

const PLAYLIST = [
  '﻿#EXTM3U x-tvg-url="https://dispatcharr.example/output/epg"',
  `#EXTINF:-1 tvg-id="2" tvg-name="Beta" tvg-logo="https://dispatcharr.example/api/channels/logos/2/cache/" tvg-chno="20" group-title="Films",Beta`,
  `https://dispatcharr.example/proxy/ts/stream/${U2}`,
  '',
  `#EXTINF:-1 tvg-id="1" tvg-name="Alpha, the first" tvg-chno="10" group-title="News, UK",Alpha, the first`,
  `https://dispatcharr.example/proxy/ts/stream/${U1}?foo=1`,
  `#EXTINF:-1 group-title="Films" tvg-chno="5",Gamma`,
  '#EXTVLCOPT:network-caching=1000',
  `https://dispatcharr.example/proxy/ts/stream/${U3}`,
  '#EXTINF:-1,No URL follows',
  '#EXTINF:-1 group-title="Other",Elsewhere',
  'http://other.example/live/stream.m3u8',
].join('\r\n');

describe('parseM3u', () => {
  const list = parseM3u(PLAYLIST);

  it('reads every entry with a URL', () => {
    expect(list.map((c) => c.name)).toEqual(['Beta', 'Alpha, the first', 'Gamma', 'Elsewhere']);
  });

  it('reads attributes, stream IDs and quoted commas', () => {
    expect(list[0]).toEqual({
      id: U2,
      streamId: U2,
      url: `https://dispatcharr.example/proxy/ts/stream/${U2}`,
      name: 'Beta',
      number: '20',
      group: 'Films',
      logo: 'https://dispatcharr.example/api/channels/logos/2/cache/',
    });
    expect(list[1]).toMatchObject({ id: U1, streamId: U1, group: 'News, UK', number: '10' });
  });

  it('keys non-Dispatcharr URLs by URL', () => {
    expect(list[3]).toMatchObject({
      id: 'http://other.example/live/stream.m3u8',
      streamId: undefined,
      group: 'Other',
      number: undefined,
    });
  });

  it('falls back to tvg-name for the name', () => {
    const [c] = parseM3u('#EXTM3U\n#EXTINF:-1 tvg-name="Named",\nhttp://x.example/a');
    expect(c.name).toBe('Named');
  });

  it('ignores junk', () => {
    expect(parseM3u('')).toEqual([]);
    expect(parseM3u('<html>nope</html>')).toEqual([]);
  });
});

describe('ChannelList', () => {
  const all = parseM3u(PLAYLIST);

  it('orders by channel number, then name', () => {
    const l = new ChannelList(all);
    expect(l.channels.map((c) => c.name)).toEqual([
      'Gamma',
      'Alpha, the first',
      'Beta',
      'Elsewhere',
    ]);
    expect(l.groups).toEqual(['Films', 'News, UK', 'Other']);
    expect(l.size).toBe(4);
  });

  it('filters and orders groups as configured, case-insensitively', () => {
    const l = new ChannelList(all, { groups: ['news, uk', 'Films'] });
    expect(l.groups).toEqual(['News, UK', 'Films']);
    expect(l.channels.map((c) => c.name)).toEqual(['Gamma', 'Alpha, the first', 'Beta']);
  });

  it('finds by ID, number and name across all groups', () => {
    const l = new ChannelList(all, { groups: ['Films'] });
    expect(l.find(U1)?.name).toBe('Alpha, the first');
    expect(l.find('20')?.name).toBe('Beta');
    expect(l.find('  alpha, THE first ')?.id).toBe(U1);
    expect(l.find('http://other.example/live/stream.m3u8')?.name).toBe('Elsewhere');
    expect(l.find('nope')).toBeUndefined();
    expect(l.find(undefined)).toBeUndefined();
  });

  it('builds favourites in the configured order, skipping unknown ones', () => {
    const l = new ChannelList(all, { favourites: ['Beta', 'missing', '10'] });
    expect(l.favourites.map((c) => c.name)).toEqual(['Beta', 'Alpha, the first']);
    expect(l.filter('', FAVOURITES).map((c) => c.name)).toEqual(['Beta', 'Alpha, the first']);
  });

  it('steps channels with wrap-round', () => {
    const l = new ChannelList(all);
    expect(l.neighbour(U3, 1)?.id).toBe(U1);
    expect(l.neighbour(U3, -1)?.name).toBe('Elsewhere');
    expect(l.neighbour('http://other.example/live/stream.m3u8', 1)?.id).toBe(U3);
    expect(l.neighbour('not-in-list', 1)?.id).toBe(U3);
    expect(l.neighbour(undefined, 1)?.id).toBe(U3);
    expect(l.neighbour(undefined, -1)?.name).toBe('Elsewhere');
    expect(new ChannelList([]).neighbour(U1, 1)).toBeUndefined();
  });

  it('knows the unfiltered size and every group', () => {
    const l = new ChannelList(all, { groups: ['Nope'] });
    expect(l.size).toBe(0);
    expect(l.total).toBe(4);
    expect(l.allGroups).toEqual(['Films', 'News, UK', 'Other']);
  });

  it('searches by name or number within a group', () => {
    const l = new ChannelList(all);
    expect(l.filter('ALP', '').map((c) => c.name)).toEqual(['Alpha, the first']);
    expect(l.filter('2', '').map((c) => c.name)).toEqual(['Beta']);
    expect(l.filter('', 'Films').map((c) => c.name)).toEqual(['Gamma', 'Beta']);
    expect(l.filter('zzz', '')).toEqual([]);
  });
});

describe('loadChannels', () => {
  afterEach(() => {
    clearChannelCache();
    vi.unstubAllGlobals();
  });

  const ok = (body: string) => Promise.resolve(new Response(body, { status: 200 }));

  it('fetches once and shares the result', async () => {
    const fetchMock = vi.fn(() => ok(PLAYLIST));
    vi.stubGlobal('fetch', fetchMock);
    const [a, b] = await Promise.all([
      loadChannels('https://d.example/output/m3u'),
      loadChannels('https://d.example/output/m3u'),
    ]);
    expect(a).toBe(b);
    expect((a as Channel[]).length).toBe(4);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await loadChannels('https://d.example/output/m3u', { force: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up on a playlist that never answers', async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          (_url: string, init: RequestInit) =>
            new Promise((_resolve, reject) =>
              init.signal?.addEventListener('abort', () =>
                reject(new DOMException('aborted', 'AbortError')),
              ),
            ),
        ),
      );
      const p = loadChannels('https://d.example/slow');
      const check = expect(p).rejects.toThrow('no answer in 15 s');
      await vi.advanceTimersByTimeAsync(15_000);
      await check;
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports HTTP and network errors and does not cache them', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('no', { status: 403 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockImplementation(() => ok(PLAYLIST));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadChannels('https://d.example/m')).rejects.toThrow(ChannelListError);
    await expect(loadChannels('https://d.example/m')).rejects.toThrow(
      'network error: Failed to fetch',
    );
    await expect(loadChannels('https://d.example/m')).resolves.toHaveLength(4);
  });
});
