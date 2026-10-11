import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Harness } from './fixtures';

async function shot(h: Harness, name: string) {
  await test.info().attach(name, { body: await h.frame().screenshot(), contentType: 'image/png' });
}

async function axe(h: Harness) {
  const r = await new AxeBuilder({ page: h.page }).include('stream-card').analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test('playing state: title badge, live dot, controls that auto-hide and come back on tap', async ({
  h,
}) => {
  await h.load();
  await h.mount({ channel: h.channel(), title: 'BBC One HD' });
  await h.expectUi('playing');
  await expect(h.frame().locator('.badge')).toContainText('BBC One HD');
  await expect(h.frame().locator('.live-dot')).toBeVisible();
  await shot(h, 'playing');
  await axe(h);
  await expect(h.frame().locator('.controls')).toHaveClass(/hidden/, { timeout: 7000 });
  await h.frame().click({ position: { x: 50, y: 50 } });
  await expect(h.frame().locator('.controls')).not.toHaveClass(/hidden/);
});

test('blocked autoplay starts muted and offers tap to unmute', async ({ h }) => {
  await h.page.evaluate(() => (window.__mseShimBlockUnmuted = true));
  await h.load();
  await h.mount({ channel: h.channel() });
  await h.expectUi('playing');
  const info = await h.info();
  expect(info.mutedByPolicy).toBe(true);
  expect(info.muted).toBe(true);
  const pill = h.frame().locator('button.unmute');
  await expect(pill).toContainText('Tap to unmute');
  await shot(h, 'tap-to-unmute');
  await pill.click();
  await expect.poll(async () => (await h.info()).muted).toBe(false);
  await expect(pill).toHaveCount(0);
});

test('stop and play buttons', async ({ h }) => {
  await h.load();
  const ch = h.channel();
  await h.mount({ channel: ch });
  await h.expectOpen(ch, 1);
  await h.frame().locator('button.ctl-stop').click();
  await h.expectOpen(ch, 0, 2000);
  await h.expectUi('ready');
  await shot(h, 'ready');
  await axe(h);
  await h.frame().locator('button.big-play').click();
  await h.expectOpen(ch, 1);
});

test('mute toggle', async ({ h }) => {
  await h.load();
  await h.mount({ channel: h.channel() });
  await h.expectUi('playing');
  const mute = h.frame().locator('button.ctl-mute');
  await expect(mute).toHaveAttribute('aria-label', 'Mute');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-label', 'Unmute');
  expect((await h.info()).muted).toBe(true);
});

test('error state has a message and a retry button', async ({ h }) => {
  await h.load();
  await h.mount({ channel: h.channel('status-404') });
  await h.expectUi('error');
  await expect(h.frame().locator('[role=alert]')).toBeVisible();
  await expect(h.frame().locator('button.retry')).toBeVisible();
  await shot(h, 'error');
  await axe(h);
});

test('connecting and empty states', async ({ h }) => {
  await h.load();
  await h.mount({ target: 'tv', channel_list: false }, { id: 'empty' });
  await h.expectUi('empty', '#empty');
  await expect(h.frame('#empty')).toContainText('Choose a channel');
  await shot(h, 'empty');
  await h.mount({ channel: h.channel('hang'), start_timeout: 30 }, { id: 'conn' });
  await h.expectUi('connecting', '#conn');
  await expect(h.frame('#conn')).toContainText('Connecting');
});

test('debug overlay shows engine, codecs and buffer', async ({ h }) => {
  await h.load();
  await h.mount({ channel: h.channel(), debug: true });
  await h.expectUi('playing');
  await expect(h.frame().locator('.debug')).toContainText('mpegts', { timeout: 5000 });
  await expect(h.frame().locator('.debug')).toContainText('avc1');
  await shot(h, 'debug');
});

test('a button for a card without dispatcharr_url shows a config error', async ({ h }) => {
  await h.load();
  await h.page.evaluate(() => {
    const card = document.createElement('stream-card') as HTMLElement & {
      setConfig(c: unknown): void;
    };
    card.setConfig({ type: 'custom:stream-card', target: 'nobase' });
    document.getElementById('view')!.appendChild(card);
  });
  await (await h.button('Play', { target: 'nobase', channel: 'abc' })).click();
  await h.expectUi('error');
  await expect(h.frame().locator('.message')).toContainText('dispatcharr_url');
});

test('HA hass updates never restart or replace the video', async ({ h }) => {
  await h.load();
  const ch = h.channel();
  await h.mount({ channel: ch });
  await h.expectUi('playing');
  const same = await h.page.locator('stream-card').evaluate(async (el) => {
    const card = el as HTMLElement & { hass: unknown };
    const before = el.shadowRoot!.querySelector('video');
    for (let i = 0; i < 100; i++) card.hass = { states: { i } };
    await new Promise((r) => setTimeout(r, 200));
    return before === el.shadowRoot!.querySelector('video');
  });
  expect(same).toBe(true);
  expect((await h.stats(ch)).total).toBe(1);
});

test('loads from a HACS path and lazy-loads the player chunk from there', async ({ h, page }) => {
  const chunks: string[] = [];
  page.on('request', (r) => r.url().includes('/hacsfiles/') && chunks.push(r.url()));
  await h.load({ path: '/hacsfiles/stream-card/stream-card.js' });
  await h.mount({ channel: h.channel() });
  await h.expectUi('playing');
  expect(chunks.some((u) => /stream-card-mpegts-engine-.*\.js$/.test(u))).toBe(true);
  expect(chunks.some((u) => /\/mpegts-\d+\.\d+\.\d+\.js$/.test(u))).toBe(true);
});

test('registers in the card picker', async ({ h, page }) => {
  await h.load();
  const entry = await page.evaluate(() =>
    (window as unknown as { customCards: { type: string }[] }).customCards.find(
      (c) => c.type === 'stream-card',
    ),
  );
  expect(entry).toBeTruthy();
});
