// Tests against a real Dispatcharr channel. Not run in CI. Needs:
//   LIVE_STREAM_URL=https://<dispatcharr>/proxy/ts/stream/<uuid>   (no query string)
//   LIVE_OUTPUT_PROFILE=<id>     optional: the server-side output profile to check
// Run: LIVE=1 LIVE_STREAM_URL=... npx playwright test
import { expect, test } from '../e2e/fixtures';
import { startRelay } from './relay.mjs';

const RAW = process.env.LIVE_STREAM_URL ?? '';
const PROFILE = process.env.LIVE_OUTPUT_PROFILE;
const live = RAW ? new URL(RAW) : undefined;
const base = live?.origin;
const channel = live?.pathname.split('/').pop();

test.describe.configure({ mode: 'serial' });
test.skip(!RAW, 'LIVE_STREAM_URL not set');

function watchRequests(page: import('@playwright/test').Page, match: string) {
  const log: { url: string; failed?: string; finished?: boolean }[] = [];
  page.on('request', (r) => r.url().includes(match) && log.push({ url: r.url() }));
  page.on('requestfailed', (r) => {
    const e = log.find((x) => x.url === r.url() && !x.failed && !x.finished);
    if (e) e.failed = r.failure()?.errorText;
  });
  page.on('requestfinished', (r) => {
    const e = log.find((x) => x.url === r.url() && !x.failed && !x.finished);
    if (e) e.finished = true;
  });
  return log;
}

test('raw channel (no output profile) is rejected with a named audio codec @live', async ({
  h,
  page,
}) => {
  const reqs = watchRequests(page, channel!);
  await h.load();
  await h.mount({ dispatcharr_url: base, channel, start_timeout: 30, debug: true });
  await h.expectUi('error', undefined, 40_000);
  const info = await h.info();
  console.log('raw:', JSON.stringify(info.error));
  expect(info.error?.kind).toBe('codec');
  await expect.poll(() => reqs.every((r) => r.failed || r.finished)).toBe(true);
  console.log('raw requests:', JSON.stringify(reqs.map((r) => r.failed ?? 'finished')));
});

test('server-side output profile @live', async ({ h, page }) => {
  test.skip(!PROFILE, 'LIVE_OUTPUT_PROFILE not set');
  const reqs = watchRequests(page, channel!);
  await h.load();
  await h.mount({ dispatcharr_url: base, channel, output_profile: PROFILE, start_timeout: 20 });
  await expect.poll(async () => (await h.info()).ui, { timeout: 30_000 }).toMatch(/playing|error/);
  const info = await h.info();
  console.log(`profile ${PROFILE}:`, info.ui, JSON.stringify(info.error ?? info.mediaInfo));
  await page.locator('stream-card').evaluate((el) => el.remove());
  await expect.poll(() => reqs.every((r) => r.failed || r.finished)).toBe(true);
  expect(info.ui).toBe('playing');
});

test('recommended profile (local relay) plays steadily and releases @live', async ({ h, page }) => {
  test.setTimeout(150_000);
  const relay = await startRelay(RAW);
  try {
    await h.load();
    await h.mount({ target: 'live' }, { where: '#live', id: 'live' });
    await (
      await h.button('BBC', {
        target: 'live',
        url: `${relay.url}/proxy/ts/stream/relay`,
        title: 'Live test',
        open: '#live',
      })
    ).click();
    await h.expectUi('playing', '#live', 30_000);
    const first = await h.info('#live');
    console.log('relay media:', JSON.stringify(first.mediaInfo));
    expect(first.mediaInfo?.videoCodec).toMatch(/^avc1\.64/);
    expect(first.mediaInfo?.audioCodec).toBe('mp4a.40.2');
    // One minute of live playback without a reconnect.
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(5000);
      const s = await h.info('#live');
      expect(s.ui).toBe('playing');
      expect(s.failures).toBe(0);
    }
    expect(relay.stats().total).toBe(1);
    await page.evaluate(() => window.harness.closePopup());
    await expect.poll(() => relay.stats().open, { timeout: 3000 }).toBe(0);
    console.log('relay stats after close:', JSON.stringify(relay.stats()));
  } finally {
    await relay.close();
  }
});
