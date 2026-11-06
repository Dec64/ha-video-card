import { expect, STREAM, test, type Harness } from './fixtures';

/** A playlist and guide unique to this test (see /output/m3u and /output/epg in the fake server). */
function sources(h: Harness) {
  const tag = h.channel('pl').split('--')[1];
  return {
    m3u_url: `${STREAM}/output/m3u?prefix=${tag}`,
    epg_url: `${STREAM}/output/epg?prefix=${tag}`,
    id: (n: number) => `ok--${tag}-${n}`,
  };
}

test('chrome: app moves the one picture between views without reconnecting', async ({ h }) => {
  await h.load();
  const s = sources(h);
  await h.mount({ m3u_url: s.m3u_url, epg_url: s.epg_url, chrome: 'app', channel: '101' });
  await h.expectOpen(s.id(1), 1);
  await h.expectUi('playing');
  const card = h.page.locator('stream-card');
  await expect(card.locator('ha-card.app')).toBeVisible();
  const video = () =>
    card.evaluate((el) => el.shadowRoot!.querySelector('.app-stage .video-host video') !== null);
  expect(await video()).toBe(true);

  for (const tab of ['Guide', 'Channels', 'On now']) {
    await card.locator('.cdock .tab', { hasText: tab }).click();
    await expect(card.locator('ha-card.app')).toHaveAttribute(
      'data-view',
      { Guide: 'guide', Channels: 'channels', 'On now': 'now' }[tab]!,
    );
  }
  await card.locator('.over').getByRole('button', { name: 'Full screen' }).click();
  await expect(card.locator('ha-card.app')).toHaveAttribute('data-view', 'full');
  expect(await video()).toBe(true);
  // Same connection the whole way through.
  await h.expectOpen(s.id(1), 1);
  expect((await h.stats(s.id(1))).total).toBe(1);

  await card.locator('.t-ctl').getByRole('button', { name: 'Stop' }).click();
  await h.expectOpen(s.id(1), 0, 3000);
});

test('chrome: app channels from the Channels view play one at a time', async ({ h }) => {
  await h.load();
  const s = sources(h);
  await h.mount({ m3u_url: s.m3u_url, epg_url: s.epg_url, chrome: 'app', channel: '101' });
  await h.expectOpen(s.id(1), 1);
  const card = h.page.locator('stream-card');
  await card.locator('.cdock .tab', { hasText: 'Channels' }).click();
  await card.locator('.cols .row').nth(1).click();
  await expect(card.locator('ha-card.app')).toHaveAttribute('data-view', 'full');
  await h.expectOpen(s.id(2), 1);
  await h.expectOpen(s.id(1), 0);
  await h.page.keyboard.press('Escape');
  await expect(card.locator('ha-card.app')).toHaveAttribute('data-view', 'channels');
  await h.expectOpen(s.id(2), 1);
});

test('chrome: app in the editor stays the standard preview and opens nothing', async ({ h }) => {
  await h.load();
  const s = sources(h);
  await h.page.evaluate(
    (c) => {
      const card = document.createElement('stream-card') as HTMLElement & {
        preview: boolean;
        setConfig(c: unknown): void;
      };
      card.preview = true;
      card.setConfig({ type: 'custom:stream-card', ...c });
      document.getElementById('view')!.appendChild(card);
    },
    { dispatcharr_url: STREAM, m3u_url: s.m3u_url, chrome: 'app', channel: '101' },
  );
  await h.page.waitForTimeout(1500);
  await h.expectUi('preview');
  expect(await h.page.locator('stream-card ha-card.app').count()).toBe(0);
  expect((await h.stats(s.id(1))).total).toBe(0);
});
