import { cardInfo, expect, expectOpen, stats, test, tokens } from './fixtures';

// The dashboard comes from test/ha/setup-dashboard.mjs. Channel IDs are fixed there, so tests
// run serially and each one ends with its streams released.
test.describe.configure({ mode: 'serial' });

const DASH = '/stream-test/main';

test("an HA button opens the Bubble pop-up and plays; Bubble's close button releases", async ({
  page,
}) => {
  await page.goto(DASH);
  await page.getByText('HA button: play A in pop-up').click();
  await expect(page).toHaveURL(/#tv-test/);
  await expectOpen(page, 'ok--m3u-4', 1, 15_000);
  expect((await stats(page, 'ok--m3u-4')).queries.at(-1)).toEqual({ output_profile: '2' });
  await expect
    .poll(async () => (await cardInfo(page.locator('stream-card').last())).ui)
    .toBe('playing');
  await page.locator('.bubble-close-button').first().click();
  await expectOpen(page, 'ok--m3u-4', 0);
});

test('back closes the pop-up and releases; forward reopens and resumes', async ({ page }) => {
  await page.goto(DASH);
  await page.getByText('HA button: play A in pop-up').click();
  await expectOpen(page, 'ok--m3u-4', 1, 15_000);
  await page.goBack();
  await expectOpen(page, 'ok--m3u-4', 0);
  await page.goForward();
  await expectOpen(page, 'ok--m3u-4', 1, 15_000);
  await page.goBack();
  await expectOpen(page, 'ok--m3u-4', 0);
});

test('a Bubble button (body and icon) plays a different channel in the pop-up', async ({
  page,
}) => {
  await page.goto(DASH);
  await page.getByText('HA button: play A in pop-up').click();
  await expectOpen(page, 'ok--m3u-4', 1, 15_000);
  await page.locator('.bubble-close-button').first().click();
  await expectOpen(page, 'ok--m3u-4', 0);
  const bubbleBtn = page
    .locator('bubble-card')
    .filter({ hasText: 'Bubble button: play B in pop-up' });
  await bubbleBtn.locator('.bubble-button-background').click();
  await expectOpen(page, 'ok--m3u-5', 1, 15_000);
  expect((await stats(page, 'ok--m3u-4')).open).toBe(0);
  await page.locator('.bubble-close-button').first().click();
  await expectOpen(page, 'ok--m3u-5', 0);
  await bubbleBtn.locator('.bubble-icon-container').click();
  await expectOpen(page, 'ok--m3u-5', 1, 15_000);
  await page.locator('.bubble-close-button').first().click();
  await expectOpen(page, 'ok--m3u-5', 0);
});

test('a stop button clears the target, so reopening the pop-up stays stopped', async ({ page }) => {
  await page.goto(DASH);
  await page.getByText('HA button: play A in pop-up').click();
  await expectOpen(page, 'ok--m3u-4', 1, 15_000);
  await page.locator('.bubble-close-button').first().click();
  await expectOpen(page, 'ok--m3u-4', 0);
  await page.getByText('Stop pop-up').click();
  const before = (await stats(page, 'ok--m3u-4')).total;
  await page.evaluate(() => {
    history.pushState(null, '', location.href.split('#')[0] + '#tv-test');
    window.dispatchEvent(new CustomEvent('location-changed'));
  });
  // The pop-up really is open again, with the same card, and it stays stopped.
  const card = page.locator('stream-card').last();
  await expect.poll(async () => (await cardInfo(card))?.target).toBe('tv_test');
  await expect.poll(async () => (await cardInfo(card)).ui).toBe('ready');
  await page.waitForTimeout(3000);
  expect((await stats(page, 'ok--m3u-4')).total).toBe(before);
  await page.locator('.bubble-close-button').first().click();
});

test('switching dashboard view releases the page card; coming back resumes', async ({ page }) => {
  await page.goto(DASH);
  await page.getByText('Play C on page card').click();
  await expectOpen(page, 'ok--m3u-6', 1, 15_000);
  await page.getByRole('tab', { name: 'Other' }).click();
  await expectOpen(page, 'ok--m3u-6', 0);
  await page.getByRole('tab', { name: 'Main' }).click();
  await expectOpen(page, 'ok--m3u-6', 1, 15_000);
});

test('dashboard edit mode stops playback and the card editor preview never connects', async ({
  page,
}) => {
  await page.goto(DASH);
  await page.getByText('Play C on page card').click();
  await expectOpen(page, 'ok--m3u-6', 1, 15_000);
  const before = (await stats(page, 'ok--m3u-6')).total;
  await page.getByRole('button', { name: /edit dashboard/i }).click();
  await expectOpen(page, 'ok--m3u-6', 0, 8000);
  // Sections views wrap each card in hui-card-edit-mode: clicking the card opens its editor.
  await page
    .locator('hui-card-edit-mode')
    .filter({ has: page.locator('stream-card') })
    .first()
    .click();
  await expect(page.getByText('Stream card configuration')).toBeVisible();
  await expect(
    page.locator('hui-card-preview stream-card, ha-dialog stream-card').first(),
  ).toContainText('Playback is off while editing');
  await page.waitForTimeout(3000);
  expect((await stats(page, 'ok--m3u-6')).open).toBe(0);
  expect((await stats(page, 'ok--m3u-6')).total).toBe(before);
});

test('the visual editor shows the card options as a form', async ({ page }) => {
  await page.goto(DASH);
  await page.getByRole('button', { name: /edit dashboard/i }).click();
  await page
    .locator('hui-card-edit-mode')
    .filter({ has: page.locator('stream-card') })
    .first()
    .click();
  const form = page.locator('hui-form-editor ha-form').first();
  await expect(form.getByText(/^Dispatcharr URL\*?$/)).toBeVisible();
  await expect(form.getByText('Output profile ID', { exact: true })).toBeVisible();
  await form.getByText('Channels', { exact: true }).click();
  await expect(form.getByText('Add Group')).toBeVisible();
  // Unset options that default to on show as on.
  await expect(
    form.locator('ha-selector-boolean', { hasText: 'Channel list' }).locator('ha-switch'),
  ).toHaveJSProperty('checked', true);
  await expect(form.getByText('Remember last channel', { exact: true }).first()).toBeVisible();
  await test.info().attach('editor', { body: await page.screenshot(), contentType: 'image/png' });
});

test('the page card lists every channel; tapping one plays it, switching view releases', async ({
  page,
}) => {
  await page.goto(DASH);
  const card = page.locator('stream-card').first();
  const picker = card.locator('stream-card-picker');
  await expect(picker.locator('.tile')).toHaveCount(6, { timeout: 15_000 });
  await test.info().attach('picker', { body: await page.screenshot(), contentType: 'image/png' });
  await picker.getByRole('button', { name: '101 News One HD', exact: true }).click();
  await expectOpen(page, 'ok--m3u-1', 1, 15_000);
  expect((await stats(page, 'ok--m3u-1')).queries.at(-1)).toEqual({ output_profile: '2' });
  await page.getByRole('tab', { name: 'Other' }).click();
  await expectOpen(page, 'ok--m3u-1', 0);
});

test('a Bubble button plays a channel by name in the pop-up', async ({ page }) => {
  await page.goto(DASH);
  await page
    .locator('bubble-card')
    .filter({ hasText: 'Bubble button: Sports Live HD by name' })
    .locator('.bubble-button-background')
    .click();
  await expect(page).toHaveURL(/#tv-test/);
  await expectOpen(page, 'ok--m3u-3', 1, 15_000);
  await expect(page.locator('stream-card').last().locator('.ident')).toContainText(
    'Sports Live HD',
  );
  await page.locator('.bubble-close-button').first().click();
  await expectOpen(page, 'ok--m3u-3', 0);
});

test('constant HA state changes never restart playback', async ({ page }) => {
  await page.goto(DASH);
  await page.getByText('Play C on page card').click();
  await expectOpen(page, 'ok--m3u-6', 1, 15_000);
  const before = (await stats(page, 'ok--m3u-6')).total;
  for (let i = 0; i < 60; i++) {
    await page.request.post('http://127.0.0.1:8123/api/states/sensor.churn', {
      headers: { authorization: `Bearer ${tokens().access_token}` },
      data: { state: String(i) },
    });
  }
  await page.waitForTimeout(2000);
  expect((await stats(page, 'ok--m3u-6')).total).toBe(before);
  expect((await stats(page, 'ok--m3u-6')).open).toBe(1);
});

test('the card is offered in the card picker', async ({ page }) => {
  await page.goto(DASH);
  await page.waitForFunction(() => !!customElements.get('stream-card'));
  const entry = await page.evaluate(() =>
    (window as unknown as { customCards?: { type: string; name: string }[] }).customCards?.find(
      (c) => c.type === 'stream-card',
    ),
  );
  expect(entry?.name).toBe('Stream Card');
});
