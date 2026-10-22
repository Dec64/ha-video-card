import AxeBuilder from '@axe-core/playwright';
import { expect, STREAM, test, type Harness } from './fixtures';

/**
 * The 2.0 card shell: guide modes, the ident and channel-number OSD, the states, the layouts,
 * and the seams the navigation and now/next features plug into (navView/navActions/nowNext).
 */

function playlist(h: Harness, n = 6) {
  const tag = h.channel('pl').split('--')[1];
  return {
    m3u_url: `${STREAM}/output/m3u?prefix=${tag}&n=${n}`,
    id: (k: number) => `ok--${tag}-${k}`,
  };
}

const picker = (h: Harness, sel = 'stream-card') =>
  h.page.locator(sel).locator('stream-card-picker');
const tile = (h: Harness, label: string) =>
  picker(h).getByRole('button', { name: label, exact: true });

async function shot(h: Harness, name: string) {
  await test.info().attach(name, {
    body: await h.page.locator('stream-card').screenshot(),
    contentType: 'image/png',
  });
}

async function axe(h: Harness) {
  const r = await new AxeBuilder({ page: h.page }).include('stream-card').analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

interface FakeNav {
  sleepMs?: number;
  warning?: boolean;
  digits?: string;
}

/**
 * Stands in for the navigation and now/next features by overriding the card's hooks, and
 * records every action the templates call in window.__calls.
 */
async function fakeFeatures(h: Harness, o: FakeNav = {}) {
  await h.page.evaluate((o) => {
    const w = window as unknown as { __calls: string[] };
    w.__calls = [];
    const C = customElements.get('stream-card') as unknown as {
      prototype: Record<string, unknown>;
    };
    const t0 = Date.now() - 30 * 60_000;
    C.prototype.nowNext = (ch: { number?: string }) => ({
      now: { title: `Now on ${ch.number}`, start: t0, end: t0 + 60 * 60_000 },
      next: { title: `Next on ${ch.number}`, start: t0 + 60 * 60_000, end: t0 + 90 * 60_000 },
    });
    C.prototype.navView = function (this: {
      channels?: { filter(q: string, g: string): unknown[] };
    }) {
      const all = this.channels?.filter('', '') ?? [];
      return {
        recents: [all[3], all[0]].filter(Boolean),
        previousChannel: all[0],
        volume: 0.4,
        sleep: o.sleepMs
          ? { endsAt: Date.now() + o.sleepMs, remainingMs: o.sleepMs, warning: !!o.warning }
          : undefined,
        numberEntry: o.digits ? { digits: o.digits, candidates: all.slice(1, 2) } : undefined,
      };
    };
    const call =
      (name: string) =>
      (...args: unknown[]) =>
        w.__calls.push([name, ...args].join(':'));
    C.prototype.navActions = () => ({
      lastChannel: call('last'),
      pressDigit: call('digit'),
      clearDigits: call('clear'),
      setVolume: call('volume'),
      setSleep: call('sleep'),
      extendSleep: call('extend'),
    });
  }, o);
}

const calls = (h: Harness) =>
  h.page.evaluate(() => (window as unknown as { __calls: string[] }).__calls);

test('guide: open shows the guide under the picture and keeps it open after a pick', async ({
  h,
}) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, channel: '101' });
  await h.expectUi('playing');
  await expect(picker(h)).toHaveClass(/panel/);
  await tile(h, '102 Movies Plus').click();
  await h.expectOpen(pl.id(2), 1);
  await h.expectOpen(pl.id(1), 0, 2000);
  await expect(picker(h)).toBeVisible();
  await expect(tile(h, '102 Movies Plus')).toHaveAttribute('aria-current', 'true');
  // Channels collapses it, and brings it back.
  await h.frame().locator('button.ctl-channels').click();
  await expect(picker(h)).toHaveCount(0);
  await h.frame().locator('button.ctl-channels').click();
  await expect(picker(h)).toBeVisible();
  await shot(h, 'guide-open');
  await axe(h);
});

test('guide: off never takes space under the picture; Channels opens it over the picture', async ({
  h,
}) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, guide: 'off' });
  // Nothing selected: the guide shows over the picture so there's something to pick from.
  await h.expectUi('empty');
  await expect(picker(h)).toHaveClass(/overlay/);
  await tile(h, '103 Sports Live HD').click();
  await h.expectOpen(pl.id(3), 1);
  await expect(picker(h)).toHaveCount(0);
  await h.frame().locator('button.ctl-channels').click();
  await expect(h.frame().locator('stream-card-picker.overlay')).toBeVisible();
  await tile(h, '101 News One HD').click();
  await h.expectOpen(pl.id(1), 1);
  await h.expectOpen(pl.id(3), 0, 2000);
  await expect(picker(h)).toHaveCount(0);
});

test('ident and channel number: logo, number and name on a change, number fades', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, channel: '102', guide: 'closed' });
  await h.expectUi('playing');
  await expect(h.frame().locator('.ident')).toContainText('102');
  await expect(h.frame().locator('.ident')).toContainText('Movies Plus');
  await expect(h.frame().locator('.osd .osd-number')).toHaveText('102');
  await expect(h.frame().locator('.osd')).toHaveCount(0, { timeout: 5000 });
  await h.frame().locator('button.ctl-up').click();
  await h.expectOpen(pl.id(3), 1);
  await expect(h.frame().locator('.osd .osd-number')).toHaveText('103');
});

test('now/next and navigation seams: programme, last channel, volume, sleep, keypad', async ({
  h,
}) => {
  await h.load();
  await fakeFeatures(h, { sleepMs: 20 * 60_000 });
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, channel: '102' });
  await h.expectUi('playing');
  const f = h.frame();
  await expect(f.locator('.ident-now')).toHaveText('Now on 102');
  await expect(f.locator('.ident-times .bar')).toBeVisible();
  await expect(f.locator('.sleep-chip')).toContainText('Stops in 20m');
  await expect(f.locator('button.ctl-last')).toHaveAttribute(
    'aria-label',
    'Last channel: 101 News One HD',
  );
  await f.locator('button.ctl-last').click();
  await expect(f.locator('.vol-slider')).toHaveValue('40');
  await f.locator('.vol-slider').fill('70');
  await f.locator('button.ctl-sleep').click();
  await f.locator('.sleep-option', { hasText: '30m' }).click();
  await expect(f.locator('.sleep-menu')).toHaveCount(0);

  // The guide opens on Recent; tiles show what's on.
  const p = picker(h);
  await expect(p.locator('.chip').first()).toHaveText('Recent');
  await expect(p.locator('.chip').first()).toHaveAttribute('aria-pressed', 'true');
  await expect(p.locator('.tile .name')).toHaveText(['News Two', 'News One HD']);
  await expect(p.locator('.tile').first()).toContainText('Now on 104');
  // A search on Recent looks through every channel.
  await p.getByRole('searchbox').fill('movies');
  await expect(p.locator('.tile .name')).toHaveText(['Movies Plus']);
  await expect(p.locator('.tile').first()).toContainText('Watching · Now on 102');
  await p.getByRole('searchbox').fill('');
  await p.getByRole('button', { name: 'Number keypad' }).click();
  await p.getByRole('button', { name: 'Digit 3' }).click();
  await p.getByRole('button', { name: 'Digit 0' }).click();
  expect(await calls(h)).toEqual(['last', 'volume:0.7', 'sleep:30', 'digit:3', 'digit:0']);
  await shot(h, 'with-features');
  await axe(h);
});

test('number entry shows the digits big, with the channels they could mean', async ({ h }) => {
  await h.load();
  await fakeFeatures(h, { digits: '10' });
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, channel: '101', guide: 'closed' });
  await h.expectUi('playing');
  await expect(h.frame().locator('.osd.typing .osd-number')).toContainText('10');
  await expect(h.frame().locator('.osd.typing')).toContainText('102 Movies Plus');
});

test('sleep timer warning offers Keep watching and +30 min', async ({ h }) => {
  await h.load();
  await fakeFeatures(h, { sleepMs: 58_000, warning: true });
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, channel: '101', guide: 'closed' });
  await h.expectUi('playing');
  const layer = h.frame().locator('.sleep-warning');
  await expect(layer).toContainText('Stopping in 0:5');
  await layer.locator('button.keep-watching').click();
  await layer.locator('button.extend-sleep').click();
  expect(await calls(h)).toEqual(['sleep:0', 'extend:30']);
  await shot(h, 'sleep-warning');
});

test('a failed zap offers Back to the last channel first', async ({ h }) => {
  await h.load();
  await fakeFeatures(h);
  const tag = h.channel('pl').split('--')[1];
  await h.mount({
    m3u_url: `${STREAM}/output/m3u?prefix=${tag}&modes=ok,status-404`,
    channel: '102',
    guide: 'closed',
  });
  await h.expectUi('error');
  const back = h.frame().locator('button.back-to');
  await expect(back).toHaveText(/Back to\s+101/);
  await expect(h.frame().locator('.actions button').first()).toHaveClass(/back-to/);
  await expect(h.frame().locator('button.retry')).toBeVisible();
  await back.click();
  expect(await calls(h)).toEqual(['last']);
  await shot(h, 'error-back-to');
  await axe(h);
});

test('edit mode shows the settings that matter and never connects', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.page.evaluate(
    ([url, base]) => {
      const card = document.createElement('stream-card') as HTMLElement & {
        editMode: boolean;
        setConfig(c: unknown): void;
      };
      card.editMode = true;
      card.setConfig({
        type: 'custom:stream-card',
        dispatcharr_url: base,
        m3u_url: url,
        target: 'kitchen',
        output_profile: 3,
        favourites: ['101', '102'],
        channel: '101',
      });
      document.getElementById('view')!.appendChild(card);
    },
    [pl.m3u_url, STREAM] as const,
  );
  await h.expectUi('preview');
  const tags = h.frame().locator('.edit-tags .tag');
  await expect(tags).toHaveText(['target: kitchen', 'profile 3', '2 favourites']);
  await expect(picker(h)).toHaveCount(0);
  await h.page.waitForTimeout(500);
  expect((await h.stats(pl.id(1))).total).toBe(0);
});

test('HA light theme: the guide follows the theme, the picture stays dark', async ({ h }) => {
  await h.load();
  await h.page.evaluate(() => {
    const s = document.documentElement.style;
    s.setProperty('--primary-text-color', '#16181d');
    s.setProperty('--secondary-text-color', '#4a505b');
    s.setProperty('--card-background-color', '#fbfbfd');
    s.setProperty('--primary-color', '#03a9f4');
  });
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, channel: '101' });
  await h.expectUi('playing');
  const bg = await picker(h).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe('rgb(251, 251, 253)');
  const frameBg = await h
    .frame()
    .locator('.frame')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(frameBg).toBe('rgb(7, 8, 10)');
  await shot(h, 'light-theme');
  await axe(h);
});

test.describe('phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('ident and controls sit below the picture and stay visible', async ({ h }) => {
    await h.load();
    await fakeFeatures(h);
    const pl = playlist(h);
    await h.mount({ m3u_url: pl.m3u_url, channel: '101' });
    await h.expectUi('playing');
    const frame = await h.frame().locator('.frame').boundingBox();
    const ident = await h.frame().locator('.ident').boundingBox();
    const stop = await h.frame().locator('button.ctl-stop').boundingBox();
    expect(ident!.y).toBeGreaterThanOrEqual(frame!.y + frame!.height - 1);
    expect(stop!.y).toBeGreaterThan(ident!.y);
    expect(stop!.width).toBeGreaterThanOrEqual(56);
    // The bar never auto-hides when it isn't covering the picture.
    await h.page.waitForTimeout(4500);
    await expect(h.frame().locator('button.ctl-stop')).toBeVisible();
    await h.frame().locator('button.ctl-stop').click();
    await h.expectOpen(pl.id(1), 0, 2000);
    await shot(h, 'phone');
    await axe(h);
  });
});

test.describe('TV (HA Cast)', () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    userAgent:
      'Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 CrKey/1.56.500000',
  });

  test('the 10-foot layout: no tap controls, guide over the picture', async ({ h }) => {
    await h.load();
    const pl = playlist(h);
    await h.mount({ m3u_url: pl.m3u_url, channel: '101' });
    await h.expectUi('playing');
    expect((await h.info()).layout).toBe('tv');
    await expect(h.frame()).toHaveAttribute('data-layout', 'tv');
    await expect(h.frame().locator('.controls')).toHaveCount(0);
    await expect(picker(h)).toHaveCount(0);
    await expect(h.frame().locator('.tv-clock')).toBeVisible();
    await shot(h, 'tv');
  });
});
