import AxeBuilder from '@axe-core/playwright';
import type { Locator } from '@playwright/test';
import { expect, STREAM, test, type Harness } from './fixtures';

/**
 * A playlist unique to this test from the fake server's /output/m3u. Channel n (1-based) is
 * "<mode>--<tag>-<n>", numbered 100 + n. Names: News One HD, Movies Plus, Sports Live HD,
 * News Two, Kids Time, Sport Extra, ...
 */
function playlist(h: Harness, params: Record<string, string | number> = {}) {
  const tag = h.channel('pl').split('--')[1];
  const q = new URLSearchParams({ prefix: tag, ...params } as Record<string, string>);
  const modes = String(params.modes ?? 'ok').split(',');
  return {
    m3u_url: `${STREAM}/output/m3u?${q}`,
    id: (n: number) => `${modes[(n - 1) % modes.length]}--${tag}-${n}`,
    statsKey: `m3u:${tag}`,
  };
}

const picker = (h: Harness, sel = 'stream-card') =>
  h.page.locator(sel).locator('stream-card-picker');
const tile = (h: Harness, label: string, sel = 'stream-card') =>
  picker(h, sel).getByRole('button', { name: label, exact: true });

/** Presses a control button, first tapping the picture if the controls have auto-hidden. */
async function ctl(h: Harness, cls: string) {
  const controls = h.frame().locator('.controls');
  if (await controls.evaluate((el) => el.classList.contains('hidden'))) {
    await h.frame().click({ position: { x: 50, y: 50 } });
  }
  await h.frame().locator(`button.${cls}`).click();
}

/** ctl() for a card other than the first. */
async function ctlIn(h: Harness, sel: string, cls: string) {
  const controls = h.frame(sel).locator('.controls');
  if (await controls.evaluate((el) => el.classList.contains('hidden'))) {
    await h.frame(sel).click({ position: { x: 50, y: 50 } });
  }
  await h.frame(sel).locator(`button.${cls}`).click();
}

async function shot(h: Harness, name: string) {
  await test.info().attach(name, {
    body: await h.page.locator('stream-card').screenshot(),
    contentType: 'image/png',
  });
}

test('an empty card lists every channel; picking one plays it', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, target: 'tv' });
  await h.expectUi('empty');
  await expect(h.frame()).toContainText('Choose a channel below');
  await expect(picker(h).locator('.tile')).toHaveCount(6);
  await expect(picker(h).locator('.chip')).toHaveText(['All', 'News', 'Entertainment', 'Sport']);
  // An empty card's picker can't be closed: there's nothing behind it.
  await expect(picker(h).locator('button.close')).toHaveCount(0);
  await shot(h, 'picker');
  const r = await new AxeBuilder({ page: h.page }).include('stream-card').analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

  await tile(h, '103 Sports Live HD').click();
  await h.expectOpen(pl.id(3), 1);
  await h.expectUi('playing');
  await expect(picker(h)).toHaveCount(0);
  await expect(h.frame().locator('.badge')).toContainText('103');
  await expect(h.frame().locator('.badge')).toContainText('Sports Live HD');
  expect((await h.stats(pl.statsKey)).total).toBe(1);
});

test('search, groups and favourites', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({
    m3u_url: pl.m3u_url,
    channel_groups: ['Sport', 'News'],
    favourites: ['Sport Extra', '101', 'Not A Channel'],
  });
  const p = picker(h);
  await expect(p.locator('.chip')).toHaveText(['All', '★ Favourites', 'Sport', 'News']);
  await expect(p.locator('.tile .name')).toHaveText([
    'News One HD',
    'Sports Live HD',
    'News Two',
    'Sport Extra',
  ]);
  await p.locator('.chip', { hasText: 'Favourites' }).click();
  await expect(p.locator('.tile .name')).toHaveText(['Sport Extra', 'News One HD']);
  await p.locator('.chip', { hasText: 'All' }).click();
  await p.getByRole('searchbox').fill('news');
  await expect(p.locator('.tile .name')).toHaveText(['News One HD', 'News Two']);
  await p.getByRole('searchbox').fill('zzz');
  await expect(p).toContainText('No channels match');
  // Enter plays the first match.
  await p.getByRole('searchbox').fill('104');
  await p.getByRole('searchbox').press('Enter');
  await h.expectOpen(pl.id(4), 1);
});

test('switching from the picker and channel up/down never holds two connections', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url });
  await tile(h, '101 News One HD').click();
  await h.expectOpen(pl.id(1), 1);
  await h.expectUi('playing');

  const ids = [1, 2, 3, 6].map(pl.id);
  const samples: number[] = [];
  let sampling = true;
  const sampler = (async () => {
    while (sampling) {
      samples.push(await h.openSum(ids));
      await h.page.waitForTimeout(50);
    }
  })();

  // Picker over a playing card: it has a close button and marks the current channel.
  await ctl(h, 'ctl-channels');
  await expect(tile(h, '101 News One HD')).toHaveAttribute('aria-current', 'true');
  await expect(picker(h).locator('button.close')).toBeVisible();
  await tile(h, '103 Sports Live HD').click();
  await h.expectOpen(pl.id(3), 1);
  await h.expectOpen(pl.id(1), 0, 2000);

  await ctl(h, 'ctl-down');
  await h.expectOpen(pl.id(2), 1);
  await h.expectOpen(pl.id(3), 0, 2000);

  // Down from the first channel wraps to the last.
  await ctl(h, 'ctl-down');
  await h.expectOpen(pl.id(1), 1);
  await ctl(h, 'ctl-down');
  await h.expectOpen(pl.id(6), 1);
  await ctl(h, 'ctl-up');
  await h.expectOpen(pl.id(1), 1);
  await h.expectOpen(pl.id(6), 0, 2000);

  sampling = false;
  await sampler;
  expect(Math.max(...samples)).toBeLessThanOrEqual(1);
});

test('buttons play channels by name or number; unknown names say so', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, target: 'tv' });
  await (await h.button('By name', { target: 'tv', channel: 'sports live hd' })).click();
  await h.expectOpen(pl.id(3), 1);
  await expect(h.frame().locator('.badge')).toContainText('Sports Live HD');
  await (await h.button('By number', { target: 'tv', channel: '105' })).click();
  await h.expectOpen(pl.id(5), 1);
  await h.expectOpen(pl.id(3), 0, 2000);
  await (await h.button('Unknown', { target: 'tv', channel: 'No Such Channel' })).click();
  await h.expectUi('error');
  await expect(h.frame().locator('[role=alert]')).toContainText(
    'No channel called "No Such Channel" in the channel list.',
  );
  await h.expectOpen(pl.id(5), 0, 2000);
});

test('a default channel by name plays when the card appears', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, channel: 'Kids Time' });
  await h.expectOpen(pl.id(5), 1);
});

test('remembers the last channel per target across reloads', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  const cfg = { m3u_url: pl.m3u_url, target: 'den', channel: 'News One HD' };
  await h.mount(cfg);
  await h.expectOpen(pl.id(1), 1);
  await ctl(h, 'ctl-up');
  await h.expectOpen(pl.id(2), 1);

  await h.page.reload();
  await h.expectOpen(pl.id(2), 0, 3000);
  await h.load();
  await h.mount(cfg);
  await h.expectOpen(pl.id(2), 1);
  expect((await h.stats(pl.id(1))).total).toBe(1);

  // Stopped, it comes back stopped on the same channel.
  await ctl(h, 'ctl-stop');
  await h.expectOpen(pl.id(2), 0, 2000);
  await h.page.reload();
  await h.load();
  await h.mount(cfg);
  await h.expectUi('ready');
  await expect(h.frame().locator('.badge')).toContainText('Movies Plus');
  await h.page.waitForTimeout(1000);
  expect((await h.stats(pl.id(2))).open).toBe(0);
  await h.frame().locator('button.big-play').click();
  await h.expectOpen(pl.id(2), 1);

  // remember_channel: false starts on the configured channel.
  await h.page.reload();
  await h.load();
  await h.mount({ ...cfg, remember_channel: false });
  await h.expectOpen(pl.id(1), 1);
});

test('a failed channel list says why and can be retried', async ({ h }) => {
  await h.load();
  const pl = playlist(h, { fail: 500, failfirst: 1 });
  await h.mount({ m3u_url: pl.m3u_url });
  const p = picker(h);
  await expect(p.locator('[role=alert]')).toContainText(
    "Couldn't load the channel list from Dispatcharr (HTTP 500).",
  );
  await shot(h, 'picker-error');
  await p.getByRole('button', { name: 'Try again' }).click();
  await expect(p.locator('.tile')).toHaveCount(6);
});

test('cards on one page share one playlist download', async ({ h }) => {
  await h.load();
  const pl = playlist(h, { delay: 300 });
  await h.mount({ m3u_url: pl.m3u_url, target: 'a' }, { id: 'a' });
  await h.mount({ m3u_url: pl.m3u_url, target: 'b' }, { id: 'b' });
  await expect(picker(h, '#a').locator('.tile')).toHaveCount(6);
  await expect(picker(h, '#b').locator('.tile')).toHaveCount(6);
  expect((await h.stats(pl.statsKey)).total).toBe(1);
});

test('channel_list: false shows no picker and never downloads the playlist', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, channel_list: false, channel: h.channel() });
  await h.expectUi('playing');
  await expect(h.frame().locator('button.ctl-mute')).toBeVisible();
  await expect(h.frame().locator('button.ctl-channels')).toHaveCount(0);
  await expect(h.frame().locator('button.ctl-up')).toHaveCount(0);
  await expect(picker(h)).toHaveCount(0);
  expect((await h.stats(pl.statsKey)).total).toBe(0);
});

test('editor preview never downloads the playlist', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.page.evaluate((url) => {
    const card = document.createElement('stream-card') as HTMLElement & {
      preview: boolean;
      setConfig(c: unknown): void;
    };
    card.preview = true;
    card.setConfig({ type: 'custom:stream-card', m3u_url: url, channel: 'News One HD' });
    document.getElementById('view')!.appendChild(card);
  }, pl.m3u_url);
  await h.expectUi('preview');
  await h.page.waitForTimeout(1000);
  expect((await h.stats(pl.statsKey)).total).toBe(0);
  await expect(picker(h)).toHaveCount(0);
});

test('in full screen the picker opens over the picture', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, channel: '101' });
  await h.expectUi('playing');
  await ctl(h, 'ctl-fullscreen');
  await expect(h.frame().locator('button.ctl-fullscreen')).toHaveAttribute(
    'aria-label',
    'Exit full screen',
  );
  await ctl(h, 'ctl-channels');
  const overlay = h.frame().locator('stream-card-picker.overlay');
  await expect(overlay).toBeVisible();
  await overlay.getByRole('button', { name: '102 Movies Plus', exact: true }).click();
  await h.expectOpen(pl.id(2), 1);
  await expect(overlay).toHaveCount(0);
});

test('a name or number set while in edit mode is looked up when edit mode ends', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  for (const [id, channel] of [
    ['num', '102'],
    ['name', 'Kids Time'],
  ]) {
    await h.page.evaluate(
      ([url, base, cid, ch]) => {
        const card = document.createElement('stream-card') as HTMLElement & {
          editMode: boolean;
          setConfig(c: unknown): void;
        };
        card.id = cid;
        card.editMode = true;
        card.setConfig({
          type: 'custom:stream-card',
          dispatcharr_url: base,
          m3u_url: url,
          channel: ch,
        });
        document.getElementById('view')!.appendChild(card);
      },
      [pl.m3u_url, STREAM, id, channel] as const,
    );
    await h.expectUi('preview', `#${id}`);
  }
  await h.page.waitForTimeout(500);
  expect((await h.stats(pl.statsKey)).total).toBe(0);
  await h.page.evaluate(() =>
    document
      .querySelectorAll('stream-card')
      .forEach((c) => ((c as HTMLElement & { editMode: boolean }).editMode = false)),
  );
  await h.expectOpen(pl.id(2), 1);
  await h.expectOpen(pl.id(5), 1);
  // Never the raw reference as a stream ID.
  expect((await h.stats('102')).total).toBe(0);
  expect((await h.stats('Kids Time')).total).toBe(0);
});

test('a stop while a channel name is still being looked up wins', async ({ h }) => {
  await h.load();
  const pl = playlist(h, { delay: 1500 });
  await h.mount({ m3u_url: pl.m3u_url, target: 'tv', remember_channel: true });
  await (await h.button('Kids', { target: 'tv', channel: 'Kids Time' })).click();
  // While the list loads the card says it's connecting, not "choose a channel".
  await h.expectUi('connecting');
  await expect(picker(h)).toHaveCount(0);
  await (await h.button('Stop', { target: 'tv', action: 'stop' })).click();
  await expect.poll(async () => (await h.info()).ui).toBe('ready');
  await expect(picker(h).locator('.tile')).toHaveCount(0);
  await h.page.waitForTimeout(2500);
  expect((await h.stats(pl.id(5))).total).toBe(0);
  const saved = await h.page.evaluate(() => localStorage.getItem('stream-card:last:tv'));
  expect(JSON.parse(saved ?? '{}').playing).toBe(false);
});

test('HA re-sending the config during a lookup keeps autoplay', async ({ h }) => {
  await h.load();
  const pl = playlist(h, { delay: 1200 });
  const cfg = {
    type: 'custom:stream-card',
    dispatcharr_url: STREAM,
    m3u_url: pl.m3u_url,
    channel: 'Kids Time',
  };
  await h.mount(cfg);
  await h.expectUi('connecting');
  await h.page.evaluate(
    (c) =>
      (
        document.querySelector('stream-card') as HTMLElement & { setConfig(c: unknown): void }
      ).setConfig(c),
    cfg,
  );
  await h.expectOpen(pl.id(5), 1);
});

test('a recreated card resumes the picked channel, and stays stopped after Stop', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  const cfg = { m3u_url: pl.m3u_url, target: 'tv' };
  await h.mount(cfg, { id: 'one' });
  await (await h.button('Button 1', { target: 'tv', channel: pl.id(1) })).click();
  await h.expectOpen(pl.id(1), 1);
  await ctlIn(h, '#one', 'ctl-channels');
  await tile(h, '103 Sports Live HD', '#one').click();
  await h.expectOpen(pl.id(3), 1);
  await h.page.evaluate(() => document.getElementById('one')!.remove());
  await h.expectOpen(pl.id(3), 0, 2000);
  await h.mount(cfg, { id: 'two' });
  await h.expectOpen(pl.id(3), 1);
  expect((await h.stats(pl.id(1))).open).toBe(0);

  await ctlIn(h, '#two', 'ctl-stop');
  await h.expectOpen(pl.id(3), 0, 2000);
  const before = (await h.stats(pl.id(3))).total;
  await h.page.evaluate(() => document.getElementById('two')!.remove());
  await h.mount(cfg, { id: 'three' });
  await h.expectUi('ready', '#three');
  await h.page.waitForTimeout(1000);
  expect((await h.stats(pl.id(3))).total).toBe(before);
});

test('a stop button pressed while the pop-up is closed still applies when it reopens', async ({
  h,
}) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, target: 'pop' }, { where: '#pop', id: 'pop' });
  await (await h.button('Play', { target: 'pop', channel: 'News Two', open: '#pop' })).click();
  await h.expectOpen(pl.id(4), 1);
  await h.page.evaluate(() => window.harness.closePopup());
  await h.expectOpen(pl.id(4), 0, 2000);
  await (await h.button('Stop', { target: 'pop', action: 'stop' })).click();
  const before = (await h.stats(pl.id(4))).total;
  await h.page.evaluate(() => window.harness.openHash('#pop'));
  await expect(h.page.locator('#pop')).toBeAttached();
  await h.expectUi('ready', '#pop');
  await h.page.waitForTimeout(1500);
  expect((await h.stats(pl.id(4))).total).toBe(before);
});

test('unknown names say so, even one-word names', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, target: 'tv' });
  await expect(picker(h).locator('.tile')).toHaveCount(6);
  await (await h.button('Typo', { target: 'tv', channel: 'Kidz' })).click();
  await h.expectUi('error');
  await expect(h.frame().locator('[role=alert]')).toContainText('No channel called "Kidz"');
  expect((await h.stats('Kidz')).total).toBe(0);
  // The error offers the channel list.
  await h.frame().locator('button.channels').click();
  await tile(h, '101 News One HD').click();
  await h.expectOpen(pl.id(1), 1);
});

test('long group names scroll instead of widening the card', async ({ h }) => {
  await h.load();
  const pl = playlist(h, { longgroups: 1 });
  await h.mount({ m3u_url: pl.m3u_url });
  await expect(picker(h).locator('.chip')).toHaveCount(4);
  const sizes = await h.page.evaluate(() => {
    const view = document.getElementById('view')!.getBoundingClientRect();
    const frame = document
      .querySelector('stream-card')!
      .shadowRoot!.querySelector('.frame')!
      .getBoundingClientRect();
    return { view: view.width, frame: frame.width, ratio: frame.width / frame.height };
  });
  expect(sizes.frame).toBeLessThanOrEqual(sizes.view);
  expect(sizes.ratio).toBeCloseTo(16 / 9, 1);
});

test('channel_groups that match nothing name the real groups', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, channel_groups: ['Sports'] });
  await expect(picker(h)).toContainText(
    'None of the channel_groups match a Dispatcharr group. Groups in Dispatcharr: News, Entertainment, Sport.',
  );
});

test('logos stay visible as tiles are filtered; Escape clears the search, not the pop-up', async ({
  h,
}) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url });
  const p = picker(h);
  await p.locator('.chip', { hasText: 'Sport' }).click();
  await expect(p.locator('.tile .name').first()).toHaveText('Sports Live HD');
  await p.locator('.chip', { hasText: 'News' }).click();
  const logo = tile(h, '101 News One HD').locator('img.logo');
  await expect(logo).toBeVisible();
  await expect(logo).not.toHaveClass(/missing/);

  await h.page.evaluate(() => {
    (window as unknown as { escapes: number }).escapes = 0;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') (window as unknown as { escapes: number }).escapes++;
    });
  });
  const search = p.getByRole('searchbox');
  await search.fill('news');
  await search.press('Escape');
  await expect(search).toHaveValue('');
  await expect(p.locator('.tile')).toHaveCount(2); // the News group is still selected
  expect(await h.page.evaluate(() => (window as unknown as { escapes: number }).escapes)).toBe(0);
});

test('focus moves to the Channels button after picking from the keyboard', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url });
  await tile(h, '102 Movies Plus').focus();
  await h.page.keyboard.press('Enter');
  await h.expectOpen(pl.id(2), 1);
  await expect
    .poll(() =>
      h.page.evaluate(
        () => document.querySelector('stream-card')!.shadowRoot!.activeElement?.className,
      ),
    )
    .toContain('ctl-channels');
});

test('entering full screen closes an open channel panel', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, channel: '101' });
  await h.expectUi('playing');
  await ctl(h, 'ctl-channels');
  await expect(picker(h)).toBeVisible();
  await ctl(h, 'ctl-fullscreen');
  await expect(h.frame().locator('button.ctl-fullscreen')).toHaveAttribute(
    'aria-label',
    'Exit full screen',
  );
  await expect(picker(h)).toHaveCount(0);
});

test.describe('at phone width', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  /** Whether taps across the lower part of a button reach it, not something drawn over it. */
  function reachable(el: Locator): Promise<boolean> {
    return el.evaluate((node) => {
      const r = node.getBoundingClientRect();
      const root = node.getRootNode() as ShadowRoot;
      return [0.2, 0.5, 0.8].every((f) => {
        const hit = root.elementFromPoint(r.left + r.width * f, r.top + r.height * 0.75);
        return !!hit && (hit === node || node.contains(hit));
      });
    });
  }

  test('Retry and Tap to unmute are not covered by the control row', async ({ h }) => {
    await h.page.evaluate(() => (window.__mseShimBlockUnmuted = true));
    await h.load();
    const pl = playlist(h, { modes: 'status-404,ok' });
    await h.mount({ m3u_url: pl.m3u_url, channel: '101', target: 'a' }, { id: 'a' });
    await h.expectUi('error', '#a');
    await expect(h.frame('#a').locator('button.channels')).toBeVisible();
    expect(await reachable(h.frame('#a').locator('button.retry'))).toBe(true);
    await h.page.evaluate(() => document.getElementById('a')!.remove());

    await h.mount({ m3u_url: pl.m3u_url, channel: '102', target: 'b' }, { id: 'b' });
    await h.expectUi('playing', '#b');
    await expect(h.frame('#b').locator('.controls')).not.toHaveClass(/hidden/);
    await expect(h.frame('#b').locator('.controls button')).toHaveCount(6);
    expect(await reachable(h.frame('#b').locator('button.unmute'))).toBe(true);
  });
});
