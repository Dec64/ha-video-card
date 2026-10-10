import { expect, REAL, test } from './fixtures';

test('a button plays a channel in a card on the page @real', async ({ h, page }) => {
  await h.load();
  const ch = h.channel();
  await h.mount({ target: 'tv', output_profile: 2 });
  await (await h.button('Play', { target: 'tv', channel: ch, title: 'Test Channel' })).click();
  await h.expectUi('playing');
  await h.expectOpen(ch, 1);
  const stats = await h.stats(ch);
  expect(stats.total).toBe(1);
  expect(stats.queries[0]).toEqual({ output_profile: '2' });
  const info = await h.info();
  expect(info.mediaInfo?.videoCodec).toMatch(/^avc1/);
  expect(info.mediaInfo?.audioCodec).toMatch(/^mp4a/);
  if (REAL) {
    // Real decode: frames are rendered and time moves.
    await expect
      .poll(() =>
        page
          .locator('stream-card')
          .evaluate((el) => el.shadowRoot!.querySelector('video')!.videoWidth),
      )
      .toBe(320);
  }
  await expect(h.frame().locator('.badge')).toContainText('Test Channel');
});
