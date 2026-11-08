import { expect, test, type Harness } from './fixtures';

/**
 * Quality ladder. The fake server's source is 320x180 (any ?output_profile= converts to plain
 * H.264 + AAC), so these rungs sit below the source (1080p is above it and gets hidden).
 */
const QUALITIES = [
  { name: '1080p', output_profile: 9 },
  { name: 'Medium', output_profile: 7, height: 120 },
  { name: 'Low', output_profile: 8, height: 90 },
];

type QualityInfo = {
  quality?: { choice: string; playing: string; profile?: string; options: string[] };
};

async function quality(h: Harness) {
  return ((await h.info()) as unknown as QualityInfo).quality;
}

/** Highest open-connection count for `ch` seen until `until` resolves. */
async function maxOpenUntil(h: Harness, ch: string, until: () => Promise<boolean>, ms = 40_000) {
  let max = 0;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    max = Math.max(max, (await h.stats(ch)).open);
    if (await until()) break;
    await h.page.waitForTimeout(100);
  }
  return max;
}

const profiles = async (h: Harness, ch: string) =>
  (await h.stats(ch)).queries.map((q) => q.output_profile ?? 'source');

test('Auto steps down a device that keeps dropping frames, one connection at a time, and remembers it', async ({
  h,
}) => {
  test.setTimeout(90_000);
  await h.load();
  const ch = h.channel();
  await h.mount({ channel: ch, qualities: QUALITIES });
  await h.expectUi('playing');
  expect(await profiles(h, ch)).toEqual(['source']);
  // Source plays at 180 lines: 1080p isn't offered for this channel.
  await expect.poll(async () => (await quality(h))?.options).toEqual(['Source', 'Medium', 'Low']);

  await h.page.evaluate(() => (window.__mseShimDropRatio = 0.5));
  const max = await maxOpenUntil(h, ch, async () => (await h.stats(ch)).total >= 2);
  await h.page.evaluate(() => (window.__mseShimDropRatio = 0));
  expect(max).toBe(1);
  await h.expectUi('playing', 'stream-card', 20_000);
  expect(await profiles(h, ch)).toEqual(['source', '7']);
  await h.expectOpen(ch, 1);
  expect(await quality(h)).toMatchObject({ choice: 'auto', playing: 'Medium' });
  const saved = await h.page.evaluate(() => localStorage.getItem('stream-card:quality-auto'));
  expect(JSON.parse(saved!)).toMatchObject({ step: 1, strikes: 1 });
  const health = ((await h.info()) as unknown as { health: { kind: string; detail?: string }[] })
    .health;
  expect(
    health.some((e) => e.kind === 'quality' && /Medium \(dropping frames\)/.test(e.detail ?? '')),
  ).toBe(true);

  // A fresh start on this device stays on the lighter quality while the hold lasts.
  await (await h.button('Stop', { action: 'stop' })).click();
  await h.expectOpen(ch, 0);
  await (await h.button('Again', { channel: ch })).click();
  await h.expectUi('playing');
  expect(await profiles(h, ch)).toEqual(['source', '7', '7']);
  await h.expectOpen(ch, 1);
});

test('a quality picked in the settings panel reconnects once with that profile', async ({ h }) => {
  test.setTimeout(60_000);
  await h.load();
  const ch = h.channel();
  await h.mount({ channel: ch, qualities: QUALITIES });
  await h.expectUi('playing');
  const f = h.frame();
  await f.locator('button.ctl-settings').click();
  const panel = f.locator('.settings-panel');
  await expect(panel.locator('[data-quality="auto"]')).toHaveAttribute('aria-checked', 'true');
  await expect(panel.locator('[data-quality="1080p"]')).toHaveCount(0);

  const switching = maxOpenUntil(h, ch, async () => (await h.stats(ch)).total >= 2);
  await panel.locator('[data-quality="Low"]').click();
  expect(await switching).toBe(1);
  await h.expectUi('playing');
  expect(await profiles(h, ch)).toEqual(['source', '8']);
  await h.expectOpen(ch, 1);
  expect(await quality(h)).toMatchObject({ choice: 'Low', playing: 'Low' });
  expect(await h.page.evaluate(() => localStorage.getItem('stream-card:settings:default'))).toBe(
    '{"quality":"Low"}',
  );

  // Back to Auto: Source again.
  await panel.locator('[data-quality="auto"]').click();
  await h.expectUi('playing');
  await expect.poll(() => profiles(h, ch)).toEqual(['source', '8', 'source']);
  await h.expectOpen(ch, 1);
});

test('audio this device cannot play falls back to the safe profile instead of an error, and is remembered', async ({
  h,
}) => {
  test.setTimeout(60_000);
  await h.load();
  const ch = h.channel('ac3');
  await h.mount({ channel: ch, output_profile: 5, qualities: QUALITIES });
  await h.expectUi('playing', 'stream-card', 20_000);
  expect(await profiles(h, ch)).toEqual(['source', '5']);
  await h.expectOpen(ch, 1);
  expect((await quality(h))?.playing).toBe('Source');

  await (await h.button('Stop', { action: 'stop' })).click();
  await h.expectOpen(ch, 0);
  await (await h.button('Again', { channel: ch })).click();
  await h.expectUi('playing');
  // Straight to the safe profile this time.
  expect(await profiles(h, ch)).toEqual(['source', '5', '5']);
});

test('Safe audio in the settings panel plays Source through the format profile', async ({ h }) => {
  test.setTimeout(60_000);
  await h.load();
  const ch = h.channel();
  await h.mount({ channel: ch, output_profile: 5, qualities: QUALITIES });
  await h.expectUi('playing');
  const f = h.frame();
  await f.locator('button.ctl-settings').click();
  const panel = f.locator('.settings-panel');
  await expect(panel.locator('.audio-original')).toHaveAttribute('aria-checked', 'true');
  const switching = maxOpenUntil(h, ch, async () => (await h.stats(ch)).total >= 2);
  await panel.locator('.audio-safe').click();
  expect(await switching).toBe(1);
  await h.expectUi('playing');
  expect(await profiles(h, ch)).toEqual(['source', '5']);
  await h.expectOpen(ch, 1);
});

test('without qualities there is no Quality or Audio row and output_profile applies as before', async ({
  h,
}) => {
  await h.load();
  const ch = h.channel();
  await h.mount({ channel: ch, output_profile: 5 });
  await h.expectUi('playing');
  expect(await profiles(h, ch)).toEqual(['5']);
  await h.frame().locator('button.ctl-settings').click();
  await expect(h.frame().locator('.settings-panel')).toBeVisible();
  await expect(h.frame().locator('[data-quality]')).toHaveCount(0);
  await expect(h.frame().locator('.audio-safe')).toHaveCount(0);
});
