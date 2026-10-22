import { expect, STREAM, test, type Harness } from './fixtures';

/**
 * The 2.0 features together, with no stand-ins: now/next from the fake guide in the ident and
 * the guide tiles, the navigation controls and keys, and multiview from the redesigned control
 * bar. Each step checks the fake server's open connections.
 */

function sources(h: Harness) {
  const tag = h.channel('pl').split('--')[1];
  return {
    m3u_url: `${STREAM}/output/m3u?prefix=${tag}`,
    epg_url: `${STREAM}/output/epg?prefix=${tag}`,
    id: (n: number) => `ok--${tag}-${n}`,
    ids: [1, 2, 3, 4, 5, 6].map((n) => `ok--${tag}-${n}`),
  };
}

async function showControls(h: Harness) {
  const controls = h.frame().locator('.controls');
  if (await controls.evaluate((el) => el.classList.contains('hidden'))) {
    await h.frame().click({ position: { x: 50, y: 50 } });
  }
}

test('now/next, navigation and multiview work together on the redesigned card', async ({ h }) => {
  await h.load();
  const s = sources(h);
  await h.mount({
    m3u_url: s.m3u_url,
    epg_url: s.epg_url,
    epg: true,
    multiview: true,
    target: 'tv',
    channel: '101',
  });
  await h.expectOpen(s.id(1), 1);
  await h.expectUi('playing');
  const f = h.frame();

  // Now/next from the guide feed, in the ident and on the guide's tiles.
  await showControls(h);
  await expect(f.locator('.ident-now')).toHaveText('News & Weather');
  await expect(f.locator('.ident-next')).toContainText('Q&A – Live');
  await expect(h.page.locator('stream-card stream-card-picker')).toContainText('News & Weather');

  // Channel up, then Last channel back: one connection at a time.
  await showControls(h);
  await f.locator('button.ctl-up').click();
  await h.expectOpen(s.id(2), 1);
  await h.expectOpen(s.id(1), 0, 2000);
  await showControls(h);
  await expect(f.locator('button.ctl-last')).toHaveAttribute('aria-label', /101/);
  await f.locator('button.ctl-last').click();
  await h.expectOpen(s.id(1), 1);
  await h.expectOpen(s.id(2), 0, 2000);

  // A typed number tunes, like a remote.
  await f.focus();
  await h.page.keyboard.type('103');
  await h.expectOpen(s.id(3), 1);
  await h.expectOpen(s.id(1), 0, 2000);
  await expect.poll(() => h.openSum(s.ids)).toBe(1);

  // Multiview from the same control bar: the grid replaces the stage and the guide.
  const guide = h.page.locator('stream-card stream-card-picker.panel');
  await expect(guide).toBeVisible();
  await showControls(h);
  await f.locator('button.ctl-multiview').click();
  const grid = h.page.locator('stream-card stream-card-multiview');
  await expect(grid).toBeVisible();
  await expect(h.page.locator('stream-card .stage')).toBeHidden();
  await expect(guide).toHaveCount(0);
  await expect(grid.locator('.count')).toHaveText('1 Dispatcharr connection open');
  await expect.poll(() => h.openSum(s.ids)).toBe(1);
  await h.expectOpen(s.id(3), 1);

  // Exit goes back to one picture on the tile with sound, still one connection.
  await grid.locator('button.exit').click();
  await expect(grid).toBeHidden();
  await h.expectUi('playing');
  await h.expectOpen(s.id(3), 1);
  await expect.poll(() => h.openSum(s.ids)).toBe(1);

  // Stop releases everything.
  await showControls(h);
  await f.locator('button.ctl-stop').click();
  await expect.poll(() => h.openSum(s.ids), { timeout: 5000 }).toBe(0);
});
