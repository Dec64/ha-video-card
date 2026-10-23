import type { Page } from '@playwright/test';
import { expect, STREAM, test, type Harness } from './fixtures';

/**
 * Card layout across sizes: every control stays on the card (none clipped off its edge) at
 * any card width, with mouse-size and wall-panel-size touch targets, and full screen works
 * and can be left at phone sizes.
 */

async function playTwo(h: Harness, extra: Record<string, unknown> = {}) {
  const tag = h.channel('pl').split('--')[1];
  await h.load();
  await h.page.addStyleTag({ content: '#view { max-width: none; display: block; }' });
  await h.mount({
    m3u_url: `${STREAM}/output/m3u?prefix=${tag}&n=6`,
    multiview: true,
    guide: 'closed',
    ...extra,
  });
  const picker = h.page.locator('stream-card stream-card-picker');
  await picker
    .getByRole('button', { name: /Movies Plus/ })
    .first()
    .click();
  await h.expectUi('playing');
  // A second channel, so Last channel shows too: the bar at its fullest.
  await h.frame().locator('.ctl-channels').click();
  await picker.getByRole('button', { name: 'All', exact: true }).click();
  await picker
    .getByRole('button', { name: /News Two/ })
    .first()
    .click();
  await h.expectUi('playing');
  await expect(h.frame().locator('.ctl-last')).toBeVisible();
  // Keep the bar up for the whole test: it hides itself after 4 s of playing.
  await h.page.evaluate(() => {
    const card = document.querySelector('stream-card') as unknown as {
      controlsTimer: number;
      scheduleHideControls(): void;
      showControls(): void;
    };
    card.scheduleHideControls = () => clearTimeout(card.controlsTimer);
    card.showControls();
  });
}

/** Stands in for one more button in the sound group (the settings panel adds one). */
async function addSpareButton(page: Page) {
  await page.evaluate(() => {
    const root = document.querySelector('stream-card')!.shadowRoot!;
    const b = document.createElement('button');
    b.className = 'ctl ctl-spare';
    b.setAttribute('aria-label', 'Spare');
    root.querySelector('.group.sound')!.insertBefore(b, root.querySelector('.ctl-fullscreen'));
  });
}

/** Controls that are displayed but stick out of the card, or are covered by something else. */
function clipped(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('stream-card')!.shadowRoot!;
    // The hit test needs the bar on screen (opening the guide scrolls the page smoothly).
    root.querySelector('.controls')!.scrollIntoView({ block: 'center', behavior: 'instant' });
    const card = root.querySelector('ha-card')!.getBoundingClientRect();
    const bad: string[] = [];
    for (const el of root.querySelectorAll<HTMLElement>('.controls button, .controls input')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || getComputedStyle(el).display === 'none') continue;
      const name = el.getAttribute('aria-label') ?? el.className;
      if (r.left < card.left - 0.5 || r.right > card.right + 0.5 || r.top < card.top - 0.5) {
        bad.push(`${name} outside the card`);
        continue;
      }
      const hit = root.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!hit || !(el === hit || el.contains(hit)))
        bad.push(`${name} covered by ${hit?.className || hit?.tagName}`);
    }
    return bad;
  });
}

async function sweep(h: Harness) {
  const problems: string[] = [];
  for (let w = 280; w <= 1000; w += 20) {
    await h.page.evaluate((w) => {
      document.querySelector<HTMLElement>('stream-card')!.style.width = `${w}px`;
    }, w);
    await h.page.evaluate(() => new Promise(requestAnimationFrame));
    for (const p of await clipped(h.page)) problems.push(`${w}px: ${p}`);
  }
  return problems;
}

test.describe('mouse and small touch targets', () => {
  test.use({ viewport: { width: 1100, height: 900 } });

  test('no control is ever cut off the card, from 280 to 1000 px wide', async ({ h }) => {
    await playTwo(h);
    await addSpareButton(h.page);
    expect(await sweep(h)).toEqual([]);
  });
});

test.describe('wall panel (coarse pointer, 56 px targets)', () => {
  test.use({ viewport: { width: 1280, height: 800 }, hasTouch: true });

  test('no control is ever cut off the card, and Channels toggles the guide at mid widths', async ({
    h,
  }) => {
    await playTwo(h);
    expect(
      await h
        .frame()
        .locator('.ctl-fullscreen')
        .evaluate((e) => e.getBoundingClientRect().width),
    ).toBe(56);
    await addSpareButton(h.page);
    expect(await sweep(h)).toEqual([]);
    // Where Channels used to fall off the edge.
    await h.page.evaluate(() => {
      document.querySelector<HTMLElement>('stream-card')!.style.width = '560px';
    });
    if (process.env.SHOTS)
      await h.page
        .locator('stream-card')
        .screenshot({ path: `${process.env.SHOTS}/coarse-560.png` });
    const guide = async () => ((await h.info()) as { guide?: string }).guide;
    expect(await guide()).toBe('below');
    await h.frame().locator('.ctl-channels').click();
    await expect.poll(guide).toBe('hidden');
    await h.frame().locator('.ctl-channels').click();
    await expect.poll(guide).toBe('below');
  });
});

for (const vp of [
  { width: 360, height: 740 },
  { width: 740, height: 360 },
]) {
  test.describe(`full screen on a ${vp.width}x${vp.height} phone`, () => {
    test.use({ viewport: vp, hasTouch: true });

    test('enters, keeps every control on screen, and exits with the same button', async ({ h }) => {
      await playTwo(h);
      await h.frame().locator('.ctl-channels').click();
      await h.frame().locator('.ctl-fullscreen').click();
      await expect.poll(() => h.page.evaluate(() => !!document.fullscreenElement)).toBe(true);
      await expect(h.frame()).toHaveClass(/\bfs\b/);
      const frame = (await h.frame().locator('.frame').boundingBox())!;
      expect(frame.width).toBeCloseTo(vp.width, 0);
      expect(await clipped(h.page)).toEqual([]);
      if (process.env.SHOTS)
        await h.page.screenshot({ path: `${process.env.SHOTS}/fs-${vp.width}.png` });
      await h.frame().locator('.ctl-fullscreen').click();
      await expect.poll(() => h.page.evaluate(() => !!document.fullscreenElement)).toBe(false);
    });
  });
}

for (const width of [900, 400]) {
  test.describe(`a card made taller than its content, ${width} px wide`, () => {
    test.use({ viewport: { width: width + 40, height: 1000 } });

    test('the picture takes the extra height; no bar of card background under it', async ({
      h,
    }) => {
      await playTwo(h);
      await h.frame().locator('.ctl-channels').click();
      await expect.poll(async () => ((await h.info()) as { guide?: string }).guide).toBe('hidden');
      // As a sections row does when the next column is taller (Declan's FPL wall panel).
      const natural = await h.page.evaluate(() => {
        const card = document.querySelector<HTMLElement>('stream-card')!;
        const h = card.getBoundingClientRect().height;
        card.style.height = `${Math.round(h + 160)}px`;
        return h;
      });
      await h.page.evaluate(() => new Promise(requestAnimationFrame));
      const m = await h.page.evaluate(() => {
        const root = document.querySelector('stream-card')!.shadowRoot!;
        const box = (s: string) => root.querySelector(s)!.getBoundingClientRect();
        const card = box('ha-card');
        const last = [...root.querySelector('ha-card')!.children]
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.height > 0)
          .reduce((a, b) => (b.bottom > a.bottom ? b : a));
        return {
          card: card.height,
          gap: card.bottom - last.bottom,
          frame: box('.frame').height,
          video: box('video').height,
          controlsBottom: box('.controls').bottom,
          cardBottom: card.bottom,
        };
      });
      expect(m.card).toBeCloseTo(natural + 160, 0);
      expect(m.gap).toBeLessThanOrEqual(2);
      expect(m.video).toBeCloseTo(m.frame, 0);
      expect(m.controlsBottom).toBeLessThanOrEqual(m.cardBottom);
      if (process.env.SHOTS)
        await h.page
          .locator('stream-card')
          .screenshot({ path: `${process.env.SHOTS}/tall-${width}.png` });
    });
  });
}
