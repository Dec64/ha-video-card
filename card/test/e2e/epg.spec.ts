import { expect, STREAM, test, type Harness } from './fixtures';

/** A playlist and guide unique to this test (see /output/epg in the fake server). */
function sources(h: Harness, params: Record<string, string | number> = {}) {
  const tag = h.channel('pl').split('--')[1];
  const q = new URLSearchParams({ prefix: tag, ...params } as Record<string, string>);
  return {
    m3u_url: `${STREAM}/output/m3u?prefix=${tag}`,
    epg_url: `${STREAM}/output/epg?${q}`,
    id: (n: number) => `ok--${tag}-${n}`,
    epgKey: `epg:${tag}`,
  };
}

type NowNextCard = HTMLElement & { nowNext(ch: unknown): unknown };

/** Asks the card for now/next on the guide's channel `tvgId`. */
function nowNext(h: Harness, tvgId: string, sel = 'stream-card') {
  return h.page.evaluate(
    ([s, id]) =>
      (document.querySelector(s) as NowNextCard | null)?.nowNext({
        id: 'x',
        url: 'x',
        name: 'x',
        tvgId: id,
      }) ?? null,
    [sel, tvgId] as const,
  ) as Promise<{
    now?: { title: string; start: number; end: number };
    next?: { title: string };
  } | null>;
}

test('epg on: now and next for each channel from one shared download', async ({ h }) => {
  await h.load();
  const s = sources(h);
  await h.mount({ m3u_url: s.m3u_url, epg_url: s.epg_url, epg: true, channel: '101' }, { id: 'a' });
  await h.mount({ m3u_url: s.m3u_url, epg_url: s.epg_url, epg: true, target: 'b' }, { id: 'b' });
  await h.expectOpen(s.id(1), 1);
  await h.expectUi('playing', '#a');

  await expect.poll(async () => (await nowNext(h, '1'))?.now?.title).toBe('News & Weather');
  const n1 = await nowNext(h, '1');
  expect(n1?.next?.title).toBe('Q&A – Live');
  expect(n1!.now!.start).toBeLessThan(Date.now());
  expect(n1!.now!.end).toBeGreaterThan(Date.now());
  expect((await nowNext(h, '2', '#b'))?.now?.title).toBe('Now 2');
  // Channel 4 has no guide data; an unknown channel neither.
  expect(await nowNext(h, '4')).toBeNull();
  expect(await nowNext(h, '99')).toBeNull();
  expect((await h.stats(s.epgKey)).total).toBe(1);
});

test('epg: false never downloads the guide', async ({ h }) => {
  await h.load();
  const s = sources(h);
  await h.mount({ m3u_url: s.m3u_url, epg_url: s.epg_url, epg: false, channel: '101' });
  await h.expectUi('playing');
  await h.page.waitForTimeout(500);
  expect(await nowNext(h, '1')).toBeNull();
  expect((await h.stats(s.epgKey)).total).toBe(0);
});

test('edit mode never downloads the guide; leaving it does', async ({ h }) => {
  await h.load();
  const s = sources(h);
  await h.page.evaluate(
    ([m3u, epg]) => {
      const card = document.createElement('stream-card') as HTMLElement & {
        editMode: boolean;
        setConfig(c: unknown): void;
      };
      card.editMode = true;
      card.setConfig({ type: 'custom:stream-card', m3u_url: m3u, epg_url: epg, epg: true });
      document.getElementById('view')!.appendChild(card);
    },
    [s.m3u_url, s.epg_url] as const,
  );
  await h.expectUi('preview');
  await h.page.waitForTimeout(800);
  expect((await h.stats(s.epgKey)).total).toBe(0);
  expect(await nowNext(h, '1')).toBeNull();

  await h.page.evaluate(() => {
    (document.querySelector('stream-card') as HTMLElement & { editMode: boolean }).editMode = false;
  });
  await expect.poll(async () => (await nowNext(h, '1'))?.now?.title).toBe('News & Weather');
  expect((await h.stats(s.epgKey)).total).toBe(1);
});

test('on by default with dispatcharr_url', async ({ h }) => {
  await h.load();
  const s = sources(h);
  await h.mount({ m3u_url: s.m3u_url, epg_url: s.epg_url, channel: '101' });
  await expect.poll(async () => (await nowNext(h, '1'))?.now?.title).toBe('News & Weather');
  expect((await h.stats(s.epgKey)).total).toBe(1);
});

test('a failing guide shows nothing and leaves playback alone', async ({ h }) => {
  await h.load();
  const s = sources(h, { fail: 403 });
  await h.mount({ m3u_url: s.m3u_url, epg_url: s.epg_url, epg: true, channel: '102' });
  await h.expectOpen(s.id(2), 1);
  await h.expectUi('playing');
  await expect.poll(async () => (await h.stats(s.epgKey)).total).toBe(1);
  expect(await nowNext(h, '2')).toBeNull();
  await expect(h.frame()).not.toContainText(/guide|epg/i);
});
