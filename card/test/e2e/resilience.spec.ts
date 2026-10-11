import { expect, test, type Harness } from './fixtures';

const FAST = { reconnect: { max_attempts: 3 }, start_timeout: 3 };

async function maxOpenWhile(h: Harness, ch: string, ms: number): Promise<number> {
  let max = 0;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    max = Math.max(max, (await h.stats(ch)).open);
    await h.page.waitForTimeout(150);
  }
  return max;
}

test('a stalled stream reconnects on its own, never with two connections @real', async ({ h }) => {
  await h.load();
  const ch = h.channel('stall-2');
  await h.mount({ channel: ch, ...FAST });
  await h.expectUi('playing');
  // Stalls after 2 s; watchdog fires after 8 s without progress, then reconnects.
  expect(await maxOpenWhile(h, ch, 18_000)).toBe(1);
  expect((await h.stats(ch)).total).toBeGreaterThanOrEqual(2);
  await h.expectUi('playing');
});

test('a dropped connection reconnects', async ({ h }) => {
  await h.load();
  const ch = h.channel('drop-2');
  await h.mount({ channel: ch, ...FAST });
  await h.expectUi('playing');
  await expect.poll(async () => (await h.stats(ch)).total, { timeout: 10_000 }).toBeGreaterThan(1);
  await h.expectUi('playing');
});

test('Dispatcharr never answering (broken output profile) shows a timeout error', async ({ h }) => {
  await h.load();
  const ch = h.channel('hang');
  await h.mount({ channel: ch, output_profile: 2, ...FAST });
  await h.expectUi('error', undefined, 8000);
  const info = await h.info();
  expect(info.error?.kind).toBe('timeout');
  await expect(h.frame().locator('.message')).toContainText('No data from Dispatcharr after 3 s');
  await expect(h.frame().locator('.message')).toContainText('output profile');
  await h.expectOpen(ch, 0, 2000);
  expect((await h.stats(ch)).total).toBe(1);
});

test('404 is reported once, without retrying', async ({ h }) => {
  await h.load();
  const ch = h.channel('status-404');
  await h.mount({ channel: ch, ...FAST });
  await h.expectUi('error');
  await expect(h.frame().locator('.message')).toContainText("doesn't know this channel (404)");
  await h.page.waitForTimeout(2000);
  expect((await h.stats(ch)).total).toBe(1);
});

test('403 says the stream was refused', async ({ h }) => {
  await h.load();
  const ch = h.channel('status-403');
  await h.mount({ channel: ch, ...FAST });
  await expect(h.frame().locator('.message')).toContainText('refused the stream (403)');
});

test('a busy server (503) is retried and recovers', async ({ h }) => {
  await h.load();
  const ch = h.channel('flaky-2');
  await h.mount({ channel: ch, ...FAST });
  await h.expectUi('playing', undefined, 15_000);
  expect((await h.stats(ch)).total).toBe(3);
});

test('retries give up after max_attempts with a clear message', async ({ h }) => {
  await h.load();
  const ch = h.channel('status-503');
  await h.mount({ channel: ch, reconnect: { max_attempts: 2 }, start_timeout: 3 });
  await h.expectUi('error', undefined, 15_000);
  expect((await h.stats(ch)).total).toBe(3);
  await expect(h.frame().locator('.message')).toContainText('(503)');
  await h.frame().locator('button.retry').click();
  await expect.poll(async () => (await h.stats(ch)).total).toBeGreaterThan(3);
});

test('a missing CORS header is reported as CORS, not as unreachable', async ({ h }) => {
  await h.load();
  const ch = h.channel('nocors');
  await h.mount({ channel: ch, ...FAST });
  await h.expectUi('error');
  expect((await h.info()).error?.kind).toBe('cors');
  await expect(h.frame().locator('.message')).toContainText('CORS');
  await h.expectOpen(ch, 0, 3000);
});

test('an unreachable host is reported as unreachable', async ({ h }) => {
  await h.load();
  await h.mount({
    dispatcharr_url: 'http://127.0.0.1:9',
    channel: 'abc',
    reconnect: { max_attempts: 1 },
    start_timeout: 3,
  });
  await h.expectUi('error', undefined, 15_000);
  expect((await h.info()).error?.kind).toBe('network');
  await expect(h.frame().locator('.message')).toContainText("Can't reach Dispatcharr");
});

test('AC-3 audio (no output profile) gets a codec error naming AC-3', async ({ h }) => {
  await h.load();
  const ch = h.channel('ac3');
  await h.mount({ channel: ch, ...FAST });
  await h.expectUi('error');
  await expect(h.frame().locator('.message')).toContainText('AC-3');
  await expect(h.frame().locator('.message')).toContainText('converts audio to AAC');
  await h.expectOpen(ch, 0, 2000);
  expect((await h.stats(ch)).total).toBe(1);
});

test('HEVC video on a device without HEVC gets a codec error', async ({ h }) => {
  await h.load();
  const ch = h.channel('hevc');
  await h.mount({ channel: ch, ...FAST });
  await expect(h.frame().locator('.message')).toContainText('HEVC');
});

test('HEVC plays on a device that supports it', async ({ h }) => {
  await h.page.evaluate(() => (window.__mseShimCodecs = ['avc1', 'hvc1', 'hev1', 'mp4a']));
  await h.load();
  const ch = h.channel('hevc');
  await h.mount({ channel: ch, ...FAST });
  await h.expectUi('playing');
});

test('MPEG-2 video plays sound and warns that there is no picture', async ({ h }) => {
  await h.load();
  const ch = h.channel('mpeg2');
  await h.mount({ channel: ch, ...FAST });
  await h.expectUi('playing');
  await expect(h.frame().locator('.notice')).toContainText('No picture');
});
