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

test('chrome: app chip rows scroll sideways with a mouse wheel and drag', async ({ h }) => {
  await h.load();
  const s = sources(h);
  await h.page.setViewportSize({ width: 1280, height: 800 });
  await h.mount({
    m3u_url: `${s.m3u_url}&longgroups=1`,
    epg_url: s.epg_url,
    chrome: 'app',
    channel: '101',
  });
  await h.expectOpen(s.id(1), 1);
  const card = h.page.locator('stream-card');
  await card.locator('.over').getByRole('button', { name: 'Full screen' }).click();
  await card.locator('.t-ctl').getByRole('button', { name: 'Channels' }).click();
  const row = card.locator('.rail .gchips');
  await expect(row).toBeVisible();
  const left = () => row.evaluate((el) => el.scrollLeft);
  expect(await row.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  expect(await left()).toBe(0);

  await row.hover();
  await h.page.mouse.wheel(0, 200);
  await expect.poll(left).toBeGreaterThan(0);

  // Drag back to the start; letting go over a chip doesn't pick it.
  const pressed = () => row.locator('[aria-pressed="true"]').innerText();
  const before = await pressed();
  const box = (await row.boundingBox())!;
  await h.page.mouse.move(box.x + 40, box.y + box.height / 2);
  await h.page.mouse.down();
  await h.page.mouse.move(box.x + 400, box.y + box.height / 2, { steps: 5 });
  await h.page.mouse.up();
  expect(await left()).toBe(0);
  expect(await pressed()).toBe(before);
  await h.expectOpen(s.id(1), 1);
});

test('chrome: app hands its tabs to the household dock and follows its taps', async ({ h }) => {
  await h.load();
  // A stand-in for the household dash's shared dock (window.HouseholdDock) on its Live TV page.
  await h.page.evaluate(() => {
    const w = window as unknown as { HouseholdDock: unknown; __dock: unknown[] };
    w.__dock = [];
    w.HouseholdDock = {
      set: (app: string, o: unknown) => w.__dock.push([app, o]),
      current: () => 'tv',
      open() {},
    };
    document.documentElement.classList.add('hd-appdock');
  });
  const s = sources(h);
  await h.mount({ m3u_url: s.m3u_url, epg_url: s.epg_url, chrome: 'app', channel: '101' });
  await h.expectOpen(s.id(1), 1);
  const card = h.page.locator('stream-card');
  const shell = card.locator('ha-card.app');
  const last = () =>
    h.page.evaluate(() => {
      const d = (
        window as unknown as {
          __dock: Array<[string, { on?: string; tabs?: Array<{ id: string }>; hide?: boolean }]>;
        }
      ).__dock;
      return d[d.length - 1];
    });
  await expect(shell).toHaveAttribute('data-hd-docked', '');
  await expect(card.locator('.cdock')).toHaveCSS('display', 'none');
  await expect.poll(async () => (await last())?.[1].on).toBe('now');
  expect((await last())[0]).toBe('tv');
  expect((await last())[1].tabs?.map((t) => t.id)).toEqual(['now', 'guide', 'channels']);

  // A tap on the shared dock's Guide tab switches the card's page.
  await h.page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('hd-dock-tab', { detail: { app: 'tv', id: 'guide' } })),
  );
  await expect(shell).toHaveAttribute('data-view', 'guide');
  await expect.poll(async () => (await last())?.[1].on).toBe('guide');
  // Taps meant for another app are ignored.
  await h.page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('hd-dock-tab', { detail: { app: 'map', id: 'now' } })),
  );
  await expect(shell).toHaveAttribute('data-view', 'guide');

  // Without the household dash the card keeps its own dock.
  await h.page.evaluate(() => document.documentElement.classList.remove('hd-appdock'));
  await h.page.evaluate(() => window.dispatchEvent(new Event('location-changed')));
  await expect(shell).not.toHaveAttribute('data-hd-docked');
  await expect(card.locator('.cdock')).not.toHaveCSS('display', 'none');
  await card.evaluate((el) => el.remove());
  await h.expectOpen(s.id(1), 0, 3000);
});

test('chrome: app on a phone scrolls up and down only', async ({ h }) => {
  await h.page.setViewportSize({ width: 390, height: 844 });
  await h.load();
  const s = sources(h);
  await h.mount({ m3u_url: `${s.m3u_url}&n=30`, epg_url: s.epg_url, chrome: 'app' });
  const card = h.page.locator('stream-card');
  const body = card.locator('.app-body');
  await expect(card.locator('.railr').first()).toBeVisible();
  await body.hover({ position: { x: 200, y: 700 } });
  await h.page.mouse.wheel(0, 400);
  await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  // Sideways over the heading (not over a rail, which scrolls on its own).
  await body.evaluate((el) => (el.scrollTop = 0));
  await card.locator('.band').hover();
  await h.page.mouse.wheel(300, 0);
  await h.page.waitForTimeout(300);
  expect(await body.evaluate((el) => el.scrollLeft)).toBe(0);
  expect(await h.page.evaluate(() => window.scrollX)).toBe(0);
  expect(await h.page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    390,
  );
});

test('chrome: app long-press favourites, but a swipe along the tiles never does', async ({ h }) => {
  await h.page.setViewportSize({ width: 390, height: 844 });
  await h.load();
  const s = sources(h);
  await h.mount({
    m3u_url: `${s.m3u_url}&n=30`,
    epg_url: s.epg_url,
    chrome: 'app',
    favourites: ['101', '102', '103', '104'],
  });
  const card = h.page.locator('stream-card');
  const tile = card.locator('.favs .ttile').first();
  await expect(tile).toBeVisible();
  const favs = () =>
    h.page.evaluate(
      () => Object.keys(localStorage).filter((k) => k.startsWith('stream-card:favourites:')).length,
    );
  const box = (await tile.boundingBox())!;
  const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  // A slow swipe: finger down, moves along, then rests past the long-press time.
  await h.page.mouse.move(at.x, at.y);
  await h.page.mouse.down();
  await h.page.mouse.move(at.x - 120, at.y, { steps: 8 });
  await h.page.waitForTimeout(800);
  await h.page.mouse.up();
  expect(await favs()).toBe(0);

  // Held still, it toggles.
  await h.page.mouse.move(at.x, at.y);
  await h.page.mouse.down();
  await h.page.waitForTimeout(800);
  await h.page.mouse.up();
  await expect.poll(favs).toBe(1);
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
