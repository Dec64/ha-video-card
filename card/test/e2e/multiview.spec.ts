import AxeBuilder from '@axe-core/playwright';
import { expect, STREAM, test, type Harness } from './fixtures';

// Multiview: every tile is its own Dispatcharr connection, so every release path is asserted
// on the fake server's open-connection count across all tiles.

/** Per-test playlist (see picker.spec.ts): channel n is "<mode>--<tag>-<n>", number 100 + n. */
function playlist(h: Harness, params: Record<string, string | number> = {}) {
  const tag = h.channel('pl').split('--')[1];
  const q = new URLSearchParams({ prefix: tag, ...params } as Record<string, string>);
  const modes = String(params.modes ?? 'ok').split(',');
  const id = (n: number) => `${modes[(n - 1) % modes.length]}--${tag}-${n}`;
  return { m3u_url: `${STREAM}/output/m3u?${q}`, id, ids: [1, 2, 3, 4, 5, 6].map(id) };
}

const NAMES = ['101 News One HD', '102 Movies Plus', '103 Sports Live HD', '104 News Two'];

const grid = (h: Harness, sel = 'stream-card') =>
  h.page.locator(sel).locator('stream-card-multiview');
const tileEl = (h: Harness, i: number, sel = 'stream-card') =>
  grid(h, sel).locator(`.tile[data-i="${i}"]`);

interface MvInfo {
  allowed: boolean;
  slots: number;
  audio: number;
  soundOn: boolean;
  open: number;
  tiles: Array<{ url?: string; state?: string; muted?: boolean; error?: string }>;
}

async function mv(h: Harness, sel = 'stream-card'): Promise<MvInfo | undefined> {
  return ((await h.info(sel)) as unknown as { multiview?: MvInfo }).multiview;
}

/** Presses the control bar's multiview button, showing the controls first if hidden. */
async function enter(h: Harness, sel = 'stream-card') {
  const controls = h.frame(sel).locator('.controls');
  if (await controls.evaluate((el) => el.classList.contains('hidden'))) {
    await h.frame(sel).click({ position: { x: 50, y: 50 } });
  }
  await h.frame(sel).locator('button.ctl-multiview').click();
  await expect(grid(h, sel)).toBeVisible();
}

/** Fills tile i through its "Add a channel" button and the picker. */
async function add(h: Harness, i: number, name: string, sel = 'stream-card') {
  await tileEl(h, i, sel).click();
  await grid(h, sel)
    .locator('stream-card-picker')
    .getByRole('button', { name, exact: true })
    .click();
}

async function expectSum(h: Harness, ids: string[], n: number, timeout = 5000) {
  await expect.poll(() => h.openSum(ids), { timeout }).toBe(n);
}

/** A card playing channel 1 with multiview on, then channel 2 added: two tiles playing. */
async function twoTiles(h: Harness, extra: Record<string, unknown> = {}, opts = {}) {
  const pl = playlist(h);
  await h.mount(
    { m3u_url: pl.m3u_url, target: 'mv', channel: pl.id(1), multiview: true, ...extra },
    opts,
  );
  return pl;
}

async function startTwo(h: Harness, pl: ReturnType<typeof playlist>, sel = 'stream-card') {
  await h.expectUi('playing', sel);
  await h.expectOpen(pl.id(1), 1);
  await enter(h, sel);
  await add(h, 1, NAMES[1], sel);
  await h.expectOpen(pl.id(2), 1);
  await expectSum(h, pl.ids, 2);
}

test('multiview is off unless the card turns it on', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, channel: pl.id(1) });
  await h.expectUi('playing');
  await h.frame().click({ position: { x: 50, y: 50 } });
  await expect(h.frame().locator('.controls button')).not.toHaveCount(0);
  await expect(h.frame().locator('button.ctl-multiview')).toHaveCount(0);
});

test('entering keeps one connection for the current channel; each tile adds one; sound follows the tap', async ({
  h,
}) => {
  await h.load();
  const pl = await twoTiles(h);
  await h.expectUi('playing');
  await enter(h);
  await expect(h.frame()).toBeHidden();
  // The single picture's connection is released and the first tile opens its own.
  await h.expectOpen(pl.id(1), 1);
  await expect.poll(async () => (await h.stats(pl.id(1))).total).toBe(2);
  await expect(grid(h).locator('.count')).toHaveText('1 Dispatcharr connection open');
  await expect(tileEl(h, 1)).toContainText('Add a channel');

  await add(h, 1, NAMES[1]);
  await h.expectOpen(pl.id(2), 1);
  await expectSum(h, pl.ids, 2);
  await expect(grid(h).locator('.count')).toHaveText('2 Dispatcharr connections open');
  await expect
    .poll(async () => (await mv(h))?.tiles.map((t) => t.state))
    .toEqual(['playing', 'playing']);

  // Sound is on the first tile only; tapping the second tile's speaker moves it.
  expect((await mv(h))?.tiles.map((t) => t.muted)).toEqual([false, true]);
  await tileEl(h, 1).getByRole('button', { name: 'Move sound to this tile' }).click();
  expect((await mv(h))?.tiles.map((t) => t.muted)).toEqual([true, false]);
  await tileEl(h, 1).getByRole('button', { name: 'Mute' }).click();
  expect((await mv(h))?.tiles.map((t) => t.muted)).toEqual([true, true]);
  await tileEl(h, 1).getByRole('button', { name: 'Unmute' }).click();

  const r = await new AxeBuilder({ page: h.page }).include('stream-card').analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  await test.info().attach('multiview', {
    body: await h.page.locator('stream-card').screenshot(),
    contentType: 'image/png',
  });

  // Exit: every tile closes and the tile with sound plays full size.
  await grid(h).getByRole('button', { name: 'Exit' }).click();
  await h.expectOpen(pl.id(1), 0, 2000);
  await h.expectOpen(pl.id(2), 1);
  await expectSum(h, pl.ids, 1);
  await h.expectUi('playing');
  expect((await h.info()).url).toContain(pl.id(2));
  await expect(grid(h)).toHaveCount(0);
});

test('page hidden releases every tile, visible again resumes them', async ({ h }) => {
  await h.load();
  const pl = await twoTiles(h);
  await startTwo(h, pl);
  await h.page.evaluate(() => window.harness.setPageVisibility('hidden'));
  await expectSum(h, pl.ids, 0, 2000);
  expect((await h.info()).hold).toBe('page-hidden');
  await h.page.evaluate(() => window.harness.setPageVisibility('visible'));
  await expectSum(h, pl.ids, 2);
});

test('closing the pop-up releases every tile, reopening resumes them', async ({ h }) => {
  await h.load();
  const pl = await twoTiles(h, {}, { where: '#mv', id: 'pop' });
  await h.page.evaluate(() => window.harness.openHash('#mv'));
  await startTwo(h, pl, '#pop');
  await h.page.evaluate(() => window.harness.closePopup());
  await expectSum(h, pl.ids, 0, 2000);
  await h.page.evaluate(() => window.harness.openHash('#mv'));
  await expectSum(h, pl.ids, 2);
});

test('display: none releases every tile', async ({ h }) => {
  await h.load();
  const pl = await twoTiles(h);
  await startTwo(h, pl);
  await h.page
    .locator('stream-card')
    .evaluate((el) => ((el as HTMLElement).style.display = 'none'));
  await expectSum(h, pl.ids, 0, 2000);
  await h.page.locator('stream-card').evaluate((el) => ((el as HTMLElement).style.display = ''));
  await expectSum(h, pl.ids, 2);
});

test('Fully screen off releases every tile', async ({ h }) => {
  await h.load({ fully: true });
  const pl = await twoTiles(h);
  await startTwo(h, pl);
  await h.page.evaluate(() => window.harness.fullyEmit('screenOff'));
  await expectSum(h, pl.ids, 0, 2000);
  await h.page.evaluate(() => window.harness.fullyEmit('screenOn'));
  await expectSum(h, pl.ids, 2);
});

test('edit mode releases every tile and shows the editing placeholder', async ({ h }) => {
  await h.load();
  const pl = await twoTiles(h);
  await startTwo(h, pl);
  await h.page
    .locator('stream-card')
    .evaluate((el) => ((el as HTMLElement & { editMode: boolean }).editMode = true));
  await expectSum(h, pl.ids, 0, 2000);
  await h.expectUi('preview');
  await expect(grid(h)).toHaveCount(0);
  await h.page
    .locator('stream-card')
    .evaluate((el) => ((el as HTMLElement & { editMode: boolean }).editMode = false));
  await expectSum(h, pl.ids, 2);
});

test('a stop button closes multiview and every tile', async ({ h }) => {
  await h.load();
  const pl = await twoTiles(h);
  const stop = await h.button('Stop', { target: 'mv', action: 'stop' });
  await startTwo(h, pl);
  await stop.click();
  await expectSum(h, pl.ids, 0, 2000);
  await expect(grid(h)).toHaveCount(0);
  await h.expectUi('ready');
});

test('a button for the target leaves multiview and plays its channel', async ({ h }) => {
  await h.load();
  const pl = await twoTiles(h);
  const play = await h.button('Play 3', { target: 'mv', channel: pl.id(3) });
  await startTwo(h, pl);
  await play.click();
  await h.expectOpen(pl.id(3), 1);
  await expectSum(h, pl.ids, 1);
  await expect(grid(h)).toHaveCount(0);
});

test('the idle timeout releases every tile', async ({ h }) => {
  await h.load();
  const pl = await twoTiles(h, { idle_timeout: 0.05 }); // 3 s
  await startTwo(h, pl);
  await expectSum(h, pl.ids, 0, 8000);
  await expect(grid(h)).toHaveCount(0);
});

test('removing a tile or changing its channel closes its connection first', async ({ h }) => {
  await h.load();
  const pl = await twoTiles(h);
  await startTwo(h, pl);
  await tileEl(h, 1).click({ position: { x: 100, y: 40 } });
  await tileEl(h, 1).getByRole('button', { name: 'Channel' }).click();
  await grid(h)
    .locator('stream-card-picker')
    .getByRole('button', { name: NAMES[2], exact: true })
    .click();
  await h.expectOpen(pl.id(2), 0, 2000);
  await h.expectOpen(pl.id(3), 1);
  await expectSum(h, pl.ids, 2);

  await tileEl(h, 1).click({ position: { x: 100, y: 40 } });
  await tileEl(h, 1).getByRole('button', { name: 'Remove' }).click();
  await h.expectOpen(pl.id(3), 0, 2000);
  await expectSum(h, pl.ids, 1);
  await expect(tileEl(h, 1)).toContainText('Add a channel');
});

test('max_tiles 4 gives a 2 × 2 grid; going back to 2 × 1 closes the extra tiles', async ({
  h,
}) => {
  await h.load();
  const pl = await twoTiles(h, { multiview: { enabled: true, max_tiles: 4 } });
  await startTwo(h, pl);
  await grid(h).getByRole('button', { name: '2 × 2' }).click();
  await add(h, 2, NAMES[2]);
  await add(h, 3, NAMES[3]);
  await expectSum(h, pl.ids, 4);
  await expect(grid(h).locator('.count')).toHaveText('4 Dispatcharr connections open');
  // Give the sound to tile 4, then shrink: it's kept, moved into the last remaining slot.
  await tileEl(h, 3).getByRole('button', { name: 'Move sound to this tile' }).click();
  await grid(h).getByRole('button', { name: '2 × 1' }).click();
  await expectSum(h, pl.ids, 2);
  await h.expectOpen(pl.id(1), 1);
  await h.expectOpen(pl.id(4), 1);
  expect((await mv(h))?.audio).toBe(1);
});

test('one failing tile shows its error; the others keep playing', async ({ h }) => {
  await h.load();
  const pl = playlist(h, { modes: 'ok,status-404' });
  await h.mount({ m3u_url: pl.m3u_url, channel: pl.id(1), multiview: true });
  await h.expectUi('playing');
  await enter(h);
  await add(h, 1, NAMES[1]);
  await expect(tileEl(h, 1)).toContainText("doesn't know this channel");
  await h.expectOpen(pl.id(1), 1);
  await expectSum(h, pl.ids, 1);
});

test('tiles use multiview.output_profile', async ({ h }) => {
  await h.load();
  const pl = await twoTiles(h, {
    output_profile: 3,
    multiview: { enabled: true, output_profile: 7 },
  });
  await startTwo(h, pl);
  const q = (await h.stats(pl.id(2))).queries;
  expect(q.at(-1)?.output_profile).toBe('7');
  expect((await h.stats(pl.id(1))).queries.map((x) => x.output_profile)).toEqual(['3', '7']);
});
