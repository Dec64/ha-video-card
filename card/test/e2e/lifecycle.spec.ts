import { expect, test } from './fixtures';

// Every path that should release the Dispatcharr connection, asserted on the server's count.

test('closing a Bubble-style pop-up releases the stream, reopening resumes it', async ({ h }) => {
  await h.load();
  const ch = h.channel();
  await h.mount({ target: 'popup' }, { where: '#tv', id: 'pop' });
  await (await h.button('Play', { target: 'popup', channel: ch, open: '#tv' })).click();
  await h.expectUi('playing', '#pop');
  await h.expectOpen(ch, 1);

  await h.page.evaluate(() => window.harness.closePopup());
  await h.expectOpen(ch, 0, 2000);
  expect((await h.info('#pop')).lastRelease).toBe('disconnected');

  await h.page.evaluate(() => window.harness.openHash('#tv'));
  await h.expectUi('playing', '#pop');
  await h.expectOpen(ch, 1);
  expect((await h.stats(ch)).total).toBe(2);
});

test('a request made before the pop-up exists is picked up when it opens', async ({ h }) => {
  await h.load();
  const ch = h.channel();
  // The card lives in a closed pop-up, so it is not in the DOM yet.
  await h.mount({ target: 'late' }, { where: '#late', id: 'late' });
  await h.page.evaluate((c) => {
    window.dispatchEvent(
      new CustomEvent('ll-custom', { detail: { stream_card: { target: 'late', channel: c } } }),
    );
  }, ch);
  expect((await h.stats(ch)).total).toBe(0);
  await h.page.evaluate(() => window.harness.openHash('#late'));
  await h.expectOpen(ch, 1);
});

test('page hidden releases, visible again resumes', async ({ h }) => {
  await h.load();
  const ch = h.channel();
  await h.mount({ channel: ch });
  await h.expectOpen(ch, 1);
  await h.page.evaluate(() => window.harness.setPageVisibility('hidden'));
  await h.expectOpen(ch, 0, 2000);
  expect((await h.info()).hold).toBe('page-hidden');
  await h.page.evaluate(() => window.harness.setPageVisibility('visible'));
  await h.expectOpen(ch, 1);
});

test('pagehide releases the stream', async ({ h }) => {
  await h.load();
  const ch = h.channel();
  await h.mount({ channel: ch });
  await h.expectOpen(ch, 1);
  await h.page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await h.expectOpen(ch, 0, 2000);
});

test('display:none (IntersectionObserver) releases, showing again resumes', async ({ h }) => {
  await h.load();
  const ch = h.channel();
  await h.mount({ channel: ch });
  await h.expectOpen(ch, 1);
  await h.page
    .locator('stream-card')
    .evaluate((el) => ((el as HTMLElement).style.display = 'none'));
  await h.expectOpen(ch, 0, 2000);
  expect((await h.info()).hold).toBe('hidden');
  await h.page.locator('stream-card').evaluate((el) => ((el as HTMLElement).style.display = ''));
  await h.expectOpen(ch, 1);
});

test('a card scrolled off screen does not start until it is visible', async ({ h }) => {
  await h.load();
  const ch = h.channel();
  await h.page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.style.height = '3000px';
    document.getElementById('view')!.appendChild(spacer);
  });
  await h.mount({ channel: ch });
  await h.page.waitForTimeout(1000);
  expect((await h.stats(ch)).total).toBe(0);
  await h.page.locator('stream-card').scrollIntoViewIfNeeded();
  await h.expectOpen(ch, 1);
});

test('Fully Kiosk screen off and screensaver release the stream', async ({ h }) => {
  await h.load({ fully: true });
  const ch = h.channel();
  await h.mount({ channel: ch });
  await h.expectOpen(ch, 1);
  await h.page.evaluate(() => window.harness.fullyEmit('screenOff'));
  await h.expectOpen(ch, 0, 2000);
  expect((await h.info()).hold).toBe('screen-off');
  await h.page.evaluate(() => window.harness.fullyEmit('screenOn'));
  await h.expectOpen(ch, 1);
  await h.page.evaluate(() => window.harness.fullyEmit('onScreensaverStart'));
  await h.expectOpen(ch, 0, 2000);
  await h.page.evaluate(() => window.harness.fullyEmit('onScreensaverStop'));
  await h.expectOpen(ch, 1);
});

test('idle timeout stops playback and says why', async ({ h }) => {
  await h.load();
  const ch = h.channel();
  await h.mount({ channel: ch, idle_timeout: 0.05 }); // 3 s
  await h.expectOpen(ch, 1);
  await h.expectOpen(ch, 0, 6000);
  await expect(h.frame().locator('.message')).toContainText('without interaction');
  await h.frame().locator('.big-play').click();
  await h.expectOpen(ch, 1);
});

test('a stop button releases the target', async ({ h }) => {
  await h.load();
  const ch = h.channel();
  await h.mount({ target: 'tv' });
  await (await h.button('Play', { target: 'tv', channel: ch })).click();
  await h.expectOpen(ch, 1);
  await (await h.button('Stop', { target: 'tv', action: 'stop' })).click();
  await h.expectOpen(ch, 0, 2000);
  await h.expectUi('ready');
});

test('switching channel never holds two connections', async ({ h }) => {
  await h.load();
  const a = h.channel();
  const b = h.channel();
  await h.mount({ target: 'tv' });
  await (await h.button('A', { target: 'tv', channel: a })).click();
  await h.expectOpen(a, 1);
  const samples: number[] = [];
  const sampling = (async () => {
    for (let i = 0; i < 20; i++) {
      samples.push((await h.stats(a)).open + (await h.stats(b)).open);
      await h.page.waitForTimeout(100);
    }
  })();
  await (await h.button('B', { target: 'tv', channel: b })).click();
  await sampling;
  await h.expectOpen(a, 0, 2000);
  await h.expectOpen(b, 1);
  expect(Math.max(...samples)).toBeLessThanOrEqual(1);
});

test('editor preview never opens a connection', async ({ h }) => {
  await h.load();
  const ch = h.channel();
  await h.page.evaluate((c) => {
    const card = document.createElement('stream-card') as HTMLElement & {
      preview: boolean;
      setConfig(c: unknown): void;
    };
    card.preview = true;
    card.setConfig({
      type: 'custom:stream-card',
      dispatcharr_url: 'http://127.0.0.1:8930',
      channel: c,
    });
    document.getElementById('view')!.appendChild(card);
  }, ch);
  await h.page.waitForTimeout(1500);
  expect((await h.stats(ch)).total).toBe(0);
  await h.expectUi('preview');
});

test('entering edit mode stops a playing card', async ({ h }) => {
  await h.load();
  const ch = h.channel();
  await h.mount({ channel: ch });
  await h.expectOpen(ch, 1);
  await h.page
    .locator('stream-card')
    .evaluate((el) => ((el as HTMLElement & { preview: boolean }).preview = true));
  await h.expectOpen(ch, 0, 2000);
});

test('50 pop-up open/close cycles end with no connection and no leaked sessions', async ({ h }) => {
  test.setTimeout(120_000);
  await h.load();
  const ch = h.channel();
  await h.mount({ target: 'cyc' }, { where: '#cyc', id: 'cyc' });
  await (await h.button('Play', { target: 'cyc', channel: ch, open: '#cyc' })).click();
  await h.expectOpen(ch, 1);
  for (let i = 0; i < 50; i++) {
    await h.page.evaluate(() => window.harness.closePopup());
    await h.page.waitForTimeout(60);
    await h.page.evaluate(() => window.harness.openHash('#cyc'));
    await h.page.waitForTimeout(60);
  }
  await h.page.evaluate(() => window.harness.closePopup());
  await h.expectOpen(ch, 0, 3000);
  await expect
    .poll(() => h.page.evaluate(() => window.harness.counters()))
    .toEqual({ sessions: 0, engines: 0 });
});
