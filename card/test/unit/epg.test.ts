import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Channel } from '../../src/channels';
import {
  clearGuideFeeds,
  guideFeed,
  guideKey,
  nowNextAt,
  parseXmltvTime,
  XmltvParser,
  type Programme,
} from '../../src/epg';

const T0 = Date.UTC(2026, 9, 22, 18, 0, 0);
const MIN = 60_000;
const t = (min: number) => {
  const d = new Date(T0 + min * MIN);
  return d.toISOString().replace(/[-:T]/g, '').slice(0, 14) + ' +0000';
};
const prog = (ch: string, from: number, to: number | undefined, title: string, extra = '') =>
  `<programme start="${t(from)}"${to === undefined ? '' : ` stop="${t(to)}"`} channel="${ch}">` +
  `<title lang="en">${title}</title>${extra}<desc>Ignored &amp; long</desc></programme>\n`;

const channel = (over: Partial<Channel>): Channel => ({ id: 'x', url: 'x', name: 'x', ...over });

describe('parseXmltvTime', () => {
  it('reads XMLTV times with and without an offset', () => {
    expect(parseXmltvTime('20261022180000 +0000')).toBe(T0);
    expect(parseXmltvTime('20261022190000 +0100')).toBe(T0);
    expect(parseXmltvTime('20261022123000 -0530')).toBe(T0);
    expect(parseXmltvTime('20261022180000')).toBe(T0);
    expect(parseXmltvTime('202610221800')).toBe(T0);
  });

  it('gives up on rubbish', () => {
    expect(parseXmltvTime(undefined)).toBeUndefined();
    expect(parseXmltvTime('tonight')).toBeUndefined();
  });
});

describe('XmltvParser', () => {
  const XML =
    '<?xml version="1.0"?><tv><channel id="1"><display-name>One</display-name></channel>' +
    prog('1', 20, 50, 'Second') +
    prog('1', -10, 20, 'News &amp; Weather &#8211; Live') +
    prog('1', -70, -10, 'Already over') +
    prog('1', 50, 80, '<![CDATA[Third & last]]>') +
    prog('1', 60 * 13, 60 * 14, 'Too far ahead') +
    prog('2', 0, 30, '') +
    prog('3', -5, undefined, 'No stop') +
    prog('3', 25, 55, 'After no stop') +
    prog('a&amp;b', 0, 30, 'Escaped ID') +
    '</tv>';

  function parse(chunk: number): Map<string, Programme[]> {
    const p = new XmltvParser(T0);
    for (let i = 0; i < XML.length; i += chunk) p.push(XML.slice(i, i + chunk));
    return p.finish();
  }

  it('keeps current and upcoming programmes, sorted, with decoded titles', () => {
    const g = parse(XML.length);
    expect(g.get('1')!.map((p) => p.title)).toEqual([
      'News & Weather – Live',
      'Second',
      'Third & last',
    ]);
    expect(g.get('1')![0]).toEqual({
      title: 'News & Weather – Live',
      start: T0 - 10 * MIN,
      end: T0 + 20 * MIN,
    });
    expect(g.get('a&b')!.map((p) => p.title)).toEqual(['Escaped ID']);
  });

  it('skips programmes without a title and fills a missing stop from the next start', () => {
    const g = parse(XML.length);
    expect(g.has('2')).toBe(false);
    expect(g.get('3')![0]).toMatchObject({ title: 'No stop', end: T0 + 25 * MIN });
  });

  it('gives the same result however the text is split', () => {
    const whole = parse(XML.length);
    for (const n of [1, 7, 11, 64, 333]) expect(parse(n)).toEqual(whole);
  });

  it('keeps at most 8 programmes per channel', () => {
    const p = new XmltvParser(T0);
    for (let i = 0; i < 20; i++) p.push(prog('9', i * 10, i * 10 + 10, `P${i}`));
    expect(
      p
        .finish()
        .get('9')!
        .map((x) => x.title),
    ).toEqual([0, 1, 2, 3, 4, 5, 6, 7].map((i) => `P${i}`));
  });
});

describe('nowNextAt', () => {
  const list: Programme[] = [
    { title: 'A', start: T0, end: T0 + 30 * MIN },
    { title: 'B', start: T0 + 30 * MIN, end: T0 + 60 * MIN },
    { title: 'C', start: T0 + 90 * MIN, end: T0 + 120 * MIN },
  ];

  it('finds now and next', () => {
    expect(nowNextAt(list, T0 + MIN)).toEqual({ now: list[0], next: list[1] });
    expect(nowNextAt(list, T0 + 30 * MIN)).toEqual({ now: list[1], next: list[2] });
  });

  it('shows only next in a gap, and nothing once the data runs out', () => {
    expect(nowNextAt(list, T0 + 70 * MIN)).toEqual({ next: list[2] });
    expect(nowNextAt(list, T0 + 100 * MIN)).toEqual({ now: list[2], next: undefined });
    expect(nowNextAt(list, T0 + 120 * MIN)).toBeUndefined();
    expect(nowNextAt([], T0)).toBeUndefined();
    expect(nowNextAt(undefined, T0)).toBeUndefined();
  });
});

describe('guideKey', () => {
  it('uses tvg-id, then the channel number', () => {
    expect(guideKey(channel({ tvgId: '7', number: '101' }))).toBe('7');
    expect(guideKey(channel({ number: '101' }))).toBe('101');
    expect(guideKey(channel({}))).toBeUndefined();
  });
});

describe('GuideFeed', () => {
  afterEach(() => {
    clearGuideFeeds();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const body = () => prog('1', -10, 20, 'Now one') + prog('1', 20, 50, 'Next one');

  function stubFetch(answer: () => Response | Promise<Response>) {
    const fn = vi.fn(async (_url: string, init?: RequestInit) => {
      const res = await answer();
      if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError');
      return res;
    });
    vi.stubGlobal('fetch', fn);
    return fn;
  }

  it('is shared per URL and loads only while subscribed', async () => {
    vi.useFakeTimers({ now: T0 });
    const fetch = stubFetch(() => new Response(body()));
    const feed = guideFeed('https://dispatcharr.example/output/epg?days=1');
    expect(guideFeed('https://dispatcharr.example/output/epg?days=1')).toBe(feed);
    expect(fetch).not.toHaveBeenCalled();

    const seen = vi.fn();
    const off = feed.subscribe(seen);
    const off2 = feed.subscribe(() => {});
    await vi.waitFor(() => expect(feed.loaded).toBe(true));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(seen).toHaveBeenCalled();
    expect(feed.nowNext(channel({ tvgId: '1' }))).toMatchObject({
      now: { title: 'Now one' },
      next: { title: 'Next one' },
    });
    expect(feed.nowNext(channel({ tvgId: '2' }))).toBeUndefined();

    // A programme boundary wakes subscribers without downloading again.
    seen.mockClear();
    await vi.advanceTimersByTimeAsync(20 * MIN);
    expect(seen).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);

    // After two hours it reloads.
    await vi.advanceTimersByTimeAsync(100 * MIN);
    expect(fetch).toHaveBeenCalledTimes(2);

    off();
    off2();
    await vi.advanceTimersByTimeAsync(5 * 3_600_000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('keeps no data after a failure, and retries five minutes later', async () => {
    vi.useFakeTimers({ now: T0 });
    let ok = false;
    const fetch = stubFetch(() =>
      ok ? new Response(body()) : new Response('no', { status: 403 }),
    );
    const feed = guideFeed('https://dispatcharr.example/output/epg');
    const off = feed.subscribe(() => {});
    await vi.waitFor(() => expect(feed.lastError).toBe('HTTP 403'));
    expect(feed.nowNext(channel({ tvgId: '1' }))).toBeUndefined();
    ok = true;
    await vi.advanceTimersByTimeAsync(5 * MIN);
    await vi.waitFor(() => expect(feed.loaded).toBe(true));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(feed.lastError).toBeUndefined();
    off();
  });

  it('aborts a download when the last subscriber leaves', async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        signal = init?.signal ?? undefined;
        return new Promise<Response>(() => {});
      }),
    );
    const off = guideFeed('https://dispatcharr.example/output/epg').subscribe(() => {});
    await vi.waitFor(() => expect(signal).toBeDefined());
    expect(signal!.aborted).toBe(false);
    off();
    expect(signal!.aborted).toBe(true);
  });
});
