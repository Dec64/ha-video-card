import { expect, STREAM, test, type Harness } from './fixtures';

type Info = { buffer?: string };

async function buffer(h: Harness, sel = 'stream-card'): Promise<string | undefined> {
  return ((await h.info(sel)) as Info).buffer;
}

/** Highest open-connection count for `ch` seen while `ms` pass. */
async function maxOpenWhile(h: Harness, ch: string, ms: number): Promise<number> {
  let max = 0;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    max = Math.max(max, (await h.stats(ch)).open);
    await h.page.waitForTimeout(100);
  }
  return max;
}

test('switching buffering while playing reconnects once, never with two connections, and is remembered per device', async ({
  h,
}) => {
  test.setTimeout(60_000);
  await h.load();
  const ch = h.channel();
  await h.mount({ channel: ch });
  await h.expectUi('playing');
  expect(await buffer(h)).toBe('low');
  const f = h.frame();

  await f.locator('button.ctl-settings').click();
  const panel = f.locator('.settings-panel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.buffer-low')).toHaveAttribute('aria-checked', 'true');
  // Nothing differs from the YAML yet.
  await expect(panel.locator('.reset-settings')).toHaveCount(0);

  const sampling = maxOpenWhile(h, ch, 4000);
  await panel.locator('.buffer-stable').click();
  await expect(panel.locator('.buffer-stable')).toHaveAttribute('aria-checked', 'true');
  expect(await sampling).toBeLessThanOrEqual(1);
  expect(await buffer(h)).toBe('stable');
  expect((await h.info()).lastRelease).toBe('settings');
  await h.expectUi('playing', 'stream-card', 20_000);
  await h.expectOpen(ch, 1);
  expect((await h.stats(ch)).total).toBe(2);
  // The panel stays open for more changes; a tap on the picture closes it.
  await expect(panel).toBeVisible();
  await f.locator('.frame').click();
  await expect(panel).toHaveCount(0);

  // The choice is this device's: it survives a reload and overrides the YAML.
  expect(await h.page.evaluate(() => localStorage.getItem('stream-card:settings:default'))).toBe(
    '{"buffer":"stable"}',
  );
  await h.page.reload();
  await h.load();
  await h.mount({ channel: ch });
  await h.expectUi('playing', 'stream-card', 20_000);
  expect(await buffer(h)).toBe('stable');

  // "Use the dashboard's settings" forgets it.
  await h.frame().locator('button.ctl-settings').click();
  await h.frame().locator('.reset-settings').click();
  await expect.poll(() => buffer(h)).toBe('low');
  expect(
    await h.page.evaluate(() => localStorage.getItem('stream-card:settings:default')),
  ).toBeNull();
  await h.expectUi('playing', 'stream-card', 20_000);
  await h.expectOpen(ch, 1);
});

test('a buffering change reaches every card for the target, and only that target', async ({
  h,
}) => {
  await h.load();
  const a = h.channel();
  const b = h.channel();
  await h.mount({ channel: a, target: 'tv' }, { id: 'a' });
  await h.mount({ channel: b, target: 'kitchen' }, { id: 'b' });
  await h.expectUi('playing', '#a');
  await h.expectUi('playing', '#b');
  await h.mount({ channel: a, target: 'tv', autoplay: false }, { id: 'c' });

  await h.frame('#a').locator('button.ctl-settings').click();
  await h.frame('#a').locator('.buffer-stable').click();
  await expect.poll(() => buffer(h, '#c')).toBe('stable');
  expect(await buffer(h, '#b')).toBe('low');
  expect((await h.stats(b)).total).toBe(1);
});

test('programme info and stats toggles; settings: false hides the button', async ({ h }) => {
  await h.load();
  const tag = h.channel('pl').split('--')[1];
  const src = {
    m3u_url: `${STREAM}/output/m3u?prefix=${tag}`,
    epg_url: `${STREAM}/output/epg?prefix=${tag}`,
    epg: true,
  };
  await h.mount({ ...src, channel: '101' });
  await h.expectUi('playing');
  const f = h.frame();
  await expect(f.locator('.ident-now')).toHaveText('News & Weather');
  await expect(f.locator('.debug')).toHaveCount(0);

  await f.locator('button.ctl-settings').click();
  const info = f.locator('.settings-panel .set-nownext');
  await expect(info).toHaveAttribute('aria-checked', 'true');
  await info.click();
  await expect(info).toHaveAttribute('aria-checked', 'false');
  await expect(f.locator('.ident-now')).toHaveCount(0);

  await f.locator('.settings-panel .set-stats').click();
  await expect(f.locator('.debug')).toContainText('buffer');
  await f.locator('.settings-panel .set-stats').click();
  await expect(f.locator('.debug')).toHaveCount(0);

  await f.locator('.settings-panel .set-nownext').click();
  await expect(f.locator('.ident-now')).toHaveText('News & Weather');
  // Back to the YAML everywhere: nothing is stored.
  expect(
    await h.page.evaluate(() => localStorage.getItem('stream-card:settings:default')),
  ).toBeNull();

  await h.mount({ ...src, channel: '101', settings: false, target: 'bare' }, { id: 'bare' });
  await h.expectUi('playing', '#bare');
  await expect(h.frame('#bare').locator('button.ctl-settings')).toHaveCount(0);
});

test('without a guide the panel has no programme info row', async ({ h }) => {
  await h.load();
  await h.mount({ channel: h.channel() });
  await h.expectUi('playing');
  await h.frame().locator('button.ctl-settings').click();
  await expect(h.frame().locator('.settings-panel .setting')).toHaveCount(2); // buffering and stats
  await expect(h.frame().locator('.settings-panel .set-nownext')).toHaveCount(0);
});
