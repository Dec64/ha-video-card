import { expect, test, type Harness } from './fixtures';

const FAST = { reconnect: { max_attempts: 5 }, start_timeout: 5 };

interface Health {
  kind: string;
}

async function healthKinds(h: Harness): Promise<string[]> {
  return h.page.evaluate(() =>
    (window.harness.info() as { health: Health[] }).health.map((e) => e.kind),
  );
}

async function setPicture(h: Harness, mode: 'moving' | 'frozen' | 'black') {
  await h.page.evaluate((m) => (window.__mseShimPicture = m), mode);
}

/** Largest open-connection count seen while `cond` is false, polling for up to `ms`. */
async function maxOpenUntil(h: Harness, ch: string, cond: () => Promise<boolean>, ms: number) {
  let max = 0;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    max = Math.max(max, (await h.stats(ch)).open);
    if (await cond()) return max;
    await h.page.waitForTimeout(150);
  }
  throw new Error('condition not reached');
}

test.describe('picture recovery (MSE shim picture)', () => {
  test.skip(!!process.env.REAL_CODECS, 'the shim paints the picture');

  test('a frozen picture reconnects with one connection, holding the last frame meanwhile', async ({
    h,
  }) => {
    test.setTimeout(60_000);
    await h.load();
    const ch = h.channel();
    await h.mount({ channel: ch, ...FAST });
    await h.expectUi('playing');
    await setPicture(h, 'frozen');
    let stillSeen = false;
    const max = await maxOpenUntil(
      h,
      ch,
      async () => {
        const i = (await h.info()) as unknown as { stillShown: boolean; ui: string };
        if (i.stillShown && i.ui !== 'playing') stillSeen = true;
        return (await h.stats(ch)).total >= 2;
      },
      25_000,
    );
    expect(max).toBe(1);
    await setPicture(h, 'moving');
    await h.expectUi('playing');
    expect(stillSeen).toBe(true);
    await expect
      .poll(async () => ((await h.info()) as unknown as { stillShown: boolean }).stillShown)
      .toBe(false);
    expect(await healthKinds(h)).toEqual(expect.arrayContaining(['frozen', 'reconnect']));
    await h.expectOpen(ch, 1);
  });

  test('a black picture: reconnect, then switch_source asks HA for the next source', async ({
    h,
  }) => {
    test.setTimeout(90_000);
    await h.load();
    const ch = h.channel();
    await h.mount({
      channel: ch,
      ...FAST,
      switch_source: 'rest_command.dispatcharr_next_stream',
    });
    await h.expectUi('playing');
    // The "new source" has a picture again.
    await h.page.evaluate(() => {
      window.__onService = () => {
        window.__mseShimPicture = 'moving';
      };
    });
    await setPicture(h, 'black');
    const switched = async () =>
      (await h.page.evaluate(() => window.__serviceCalls?.length ?? 0)) > 0;
    const max = await maxOpenUntil(h, ch, switched, 60_000);
    expect(max).toBe(1);
    const calls = await h.page.evaluate(() => window.__serviceCalls);
    expect(calls).toEqual([
      { domain: 'rest_command', service: 'dispatcharr_next_stream', data: { channel: ch } },
    ]);
    // One reconnect before the switch; the switch itself keeps the connection.
    expect((await h.stats(ch)).total).toBe(2);
    await h.page.waitForTimeout(3000);
    expect((await h.stats(ch)).total).toBe(2);
    await h.expectOpen(ch, 1);
    expect(await healthKinds(h)).toEqual(['black', 'reconnect', 'black', 'switch']);
  });

  test('picture_check: false leaves a frozen picture alone', async ({ h }) => {
    test.setTimeout(40_000);
    await h.load();
    const ch = h.channel();
    await h.mount({ channel: ch, ...FAST, picture_check: false });
    await h.expectUi('playing');
    await setPicture(h, 'frozen');
    await h.page.waitForTimeout(16_000);
    expect((await h.stats(ch)).total).toBe(1);
    await h.expectUi('playing');
  });
});

test('the network coming back (online, Fully networkReconnect) skips the reconnect wait', async ({
  h,
}) => {
  await h.load({ fully: true });
  const ch = h.channel('status-503');
  await h.mount({ channel: ch, reconnect: { max_attempts: 8 } });
  // Backoff 1, 2, 4, 8 s: wait until a long wait is pending.
  await expect.poll(async () => (await h.stats(ch)).total, { timeout: 15_000 }).toBe(4);
  for (const fire of [
    () => h.page.evaluate(() => window.dispatchEvent(new Event('online'))),
    () => h.page.evaluate(() => window.harness.fullyEmit('networkReconnect')),
  ]) {
    const before = (await h.stats(ch)).total;
    await h.page.waitForTimeout(300);
    await fire();
    await expect.poll(async () => (await h.stats(ch)).total, { timeout: 1500 }).toBe(before + 1);
  }
  expect(await healthKinds(h)).toContain('network');
});

test('reconnect.keep_trying: keeps retrying instead of showing an error', async ({ h }) => {
  await h.load();
  const ch = h.channel('status-503');
  await h.mount({ channel: ch, reconnect: { max_attempts: 1, keep_trying: true } });
  await expect.poll(async () => (await h.stats(ch)).total, { timeout: 10_000 }).toBe(2);
  await h.page.waitForTimeout(2500);
  const info = await h.info();
  expect(info.ui).toBe('reconnecting');
  expect(info.error).toBeUndefined();
  expect((await h.stats(ch)).total).toBe(2);
  await h.expectOpen(ch, 0);
  expect(await healthKinds(h)).toEqual(['reconnect', 'keep-trying']);
});
