import { expect, STREAM, test, type Harness } from './fixtures';

/** A per-test playlist; channel n is "<mode>--<tag>-<n>", numbered 100 + n (see picker.spec.ts). */
function playlist(h: Harness) {
  const tag = h.channel('pl').split('--')[1];
  return {
    m3u_url: `${STREAM}/output/m3u?prefix=${tag}`,
    id: (n: number) => `ok--${tag}-${n}`,
  };
}

interface NavCard extends HTMLElement {
  channelUp(): void;
  lastChannel(): void;
  setVolume(v: number): void;
  setSleep(minutes: number): void;
  readonly volume: number;
  readonly recents: { number?: string }[];
  readonly previousChannel?: { number?: string };
  readonly numberEntry?: { digits: string; candidates: { number?: string }[] };
  readonly sleep?: { remainingMs: number; warning: boolean };
}

/** Runs `fn` on the card element (in the page or a pop-up). */
function onCard<T>(h: Harness, fn: (card: NavCard) => T, sel = 'stream-card'): Promise<T> {
  return h.page.evaluate(
    ([s, f]) => {
      const card = window.harness.cardIn(s) as unknown as NavCard;
      return new Function('card', `return (${f})(card)`)(card) as T;
    },
    [sel, fn.toString()] as const,
  );
}

const tile = (h: Harness, label: string) =>
  h.page
    .locator('stream-card')
    .locator('stream-card-picker')
    .getByRole('button', { name: label, exact: true });

/** Keys go to whatever in the card has focus; a control button is the simplest thing to focus. */
async function focusCard(h: Harness) {
  await h.frame().locator('button.ctl-mute').focus();
}

test('last channel flips between the two latest channels, from the card, keys and buttons', async ({
  h,
}) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, target: 'tv' });
  await tile(h, '101 News One HD').click();
  await h.expectOpen(pl.id(1), 1);
  await onCard(h, (c) => c.channelUp());
  await h.expectOpen(pl.id(2), 1);
  await h.expectOpen(pl.id(1), 0, 2000);
  expect(await onCard(h, (c) => c.previousChannel?.number)).toBe('101');
  expect(await onCard(h, (c) => c.recents.map((r) => r.number))).toEqual(['102', '101']);

  await onCard(h, (c) => c.lastChannel());
  await h.expectOpen(pl.id(1), 1);
  await h.expectOpen(pl.id(2), 0, 2000);

  await focusCard(h);
  await h.page.keyboard.press('Backspace');
  await h.expectOpen(pl.id(2), 1);
  await h.expectOpen(pl.id(1), 0, 2000);

  await (await h.button('Last', { target: 'tv', action: 'last_channel' })).click();
  await h.expectOpen(pl.id(1), 1);
  await h.expectOpen(pl.id(2), 0, 2000);

  // Recents and last channel are per device: they survive a reload.
  await h.page.reload();
  await h.load();
  await h.mount({ m3u_url: pl.m3u_url, target: 'tv' });
  await h.expectOpen(pl.id(1), 1);
  await expect.poll(() => onCard(h, (c) => c.recents.map((r) => r.number))).toEqual(['101', '102']);
});

test('typing a channel number tunes it; partial numbers wait, Escape cancels', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, target: 'tv', channel: 'News One HD' });
  await h.expectOpen(pl.id(1), 1);
  await focusCard(h);

  // "10" could still become 101..106, so it waits and shows the candidates.
  await h.page.keyboard.press('1');
  await h.page.keyboard.press('0');
  const typed = await onCard(h, (c) => c.numberEntry);
  expect(typed?.digits).toBe('10');
  expect(typed?.candidates.map((c) => c.number)).toEqual(['101', '102', '103', '104', '105']);
  // "105" is a whole number with nothing longer, so it tunes at once.
  await h.page.keyboard.press('5');
  await h.expectOpen(pl.id(5), 1);
  await h.expectOpen(pl.id(1), 0, 2000);
  expect(await onCard(h, (c) => c.numberEntry)).toBeUndefined();

  await h.page.keyboard.press('1');
  await h.page.keyboard.press('Escape');
  expect(await onCard(h, (c) => c.numberEntry)).toBeUndefined();

  // A number that doesn't exist does nothing after the pause.
  await h.page.keyboard.press('9');
  await h.page.waitForTimeout(2500);
  expect(await onCard(h, (c) => c.numberEntry)).toBeUndefined();
  expect((await h.stats(pl.id(5))).open).toBe(1);

  await h.page.keyboard.press('ArrowUp');
  await h.expectOpen(pl.id(6), 1);
  await h.expectOpen(pl.id(5), 0, 2000);
});

test('keys typed in the picker search box are not taken as channel numbers', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, target: 'tv' });
  const search = h.page.locator('stream-card').locator('stream-card-picker').getByRole('searchbox');
  await search.fill('');
  await search.press('1');
  await search.press('0');
  await search.press('3');
  expect(await onCard(h, (c) => c.numberEntry)).toBeUndefined();
  await h.page.waitForTimeout(500);
  expect((await h.stats(pl.id(3))).total).toBe(0);
});

test('volume is remembered per device and set by buttons', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, target: 'tv', channel: 'News One HD' });
  await h.expectOpen(pl.id(1), 1);
  await onCard(h, (c) => c.setVolume(0.3));
  expect(await onCard(h, (c) => c.volume)).toBeCloseTo(0.3);
  await (await h.button('Vol 60', { target: 'tv', action: 'volume', volume: 60 })).click();
  expect(await onCard(h, (c) => c.volume)).toBeCloseTo(0.6);

  await h.page.reload();
  await h.load();
  await h.mount({ m3u_url: pl.m3u_url, target: 'tv' });
  expect(await onCard(h, (c) => c.volume)).toBeCloseTo(0.6);
});

test('the sleep timer releases the stream and the device remembers it was stopped', async ({
  h,
}) => {
  await h.load();
  const pl = playlist(h);
  const cfg = { m3u_url: pl.m3u_url, target: 'bed', channel: 'Kids Time' };
  await h.mount(cfg);
  await h.expectOpen(pl.id(5), 1);
  await h.expectUi('playing');

  // 3 seconds: already inside the last-minute warning.
  await onCard(h, (c) => c.setSleep(0.05));
  expect(await onCard(h, (c) => c.sleep?.warning)).toBe(true);
  await h.expectOpen(pl.id(5), 0, 6000);
  await h.expectUi('ready');
  expect((await h.info()).lastRelease).toBe('stopped');
  expect(await onCard(h, (c) => c.sleep)).toBeUndefined();

  await h.page.reload();
  await h.load();
  await h.mount(cfg);
  await h.expectUi('ready');
  await h.page.waitForTimeout(1000);
  expect((await h.stats(pl.id(5))).open).toBe(0);
});

test('a sleep timer set by a button stops a closed pop-up too', async ({ h }) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, target: 'pop' }, { where: '#pop', id: 'pop' });
  await (await h.button('Play', { target: 'pop', channel: 'News Two', open: '#pop' })).click();
  await h.expectOpen(pl.id(4), 1);
  await (await h.button('Sleep', { target: 'pop', action: 'sleep', sleep: 0.05 })).click();
  await h.page.evaluate(() => window.harness.closePopup());
  await h.expectOpen(pl.id(4), 0, 2000);
  await h.page.waitForTimeout(3500);
  const before = (await h.stats(pl.id(4))).total;
  await h.page.evaluate(() => window.harness.openHash('#pop'));
  await h.expectUi('ready', '#pop');
  await h.page.waitForTimeout(1500);
  expect((await h.stats(pl.id(4))).total).toBe(before);
});

test('channel up pressed while the pop-up is closed steps from its channel when it opens', async ({
  h,
}) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, target: 'pop' }, { where: '#pop', id: 'pop' });
  await (await h.button('Play', { target: 'pop', channel: 'News Two', open: '#pop' })).click();
  await h.expectOpen(pl.id(4), 1);
  await h.page.evaluate(() => window.harness.closePopup());
  await h.expectOpen(pl.id(4), 0, 2000);
  const before = (await h.stats(pl.id(4))).total;
  await (await h.button('Up', { target: 'pop', action: 'channel_up', open: '#pop' })).click();
  await h.expectOpen(pl.id(5), 1);
  // It went straight to the next channel without reconnecting to the old one first.
  expect((await h.stats(pl.id(4))).total).toBe(before);
});

test('Enter (OK on a remote) toggles the guide, but still presses a focused button', async ({
  h,
}) => {
  await h.load();
  const pl = playlist(h);
  await h.mount({ m3u_url: pl.m3u_url, target: 'tv', channel: 'News One HD', guide: 'closed' });
  await h.expectOpen(pl.id(1), 1);
  const pickerOpen = async () =>
    ((await h.info()) as unknown as { pickerOpen: boolean }).pickerOpen;
  expect(await pickerOpen()).toBe(false);
  const enterOnCard = () =>
    onCard(h, (c) =>
      c.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    );
  await enterOnCard();
  await expect.poll(pickerOpen).toBe(true);
  await enterOnCard();
  await expect.poll(pickerOpen).toBe(false);

  // On a focused Mute button, Enter mutes and leaves the guide alone.
  await focusCard(h);
  await h.page.keyboard.press('Enter');
  await expect.poll(async () => (await h.info()).muted).toBe(true);
  expect(await pickerOpen()).toBe(false);
});
