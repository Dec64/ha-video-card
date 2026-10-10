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
  await expectOpen(page, 'ok--ha-a', 1, 15_000);
  expect((await stats(page, 'ok--ha-a')).queries.at(-1)).toEqual({ output_profile: '2' });
  await expect
    .poll(async () => (await cardInfo(page.locator('stream-card').last())).ui)
    .toBe('playing');
  await page.locator('.bubble-close-button').first().click();
  await expectOpen(page, 'ok--ha-a', 0);
});

test('back closes the pop-up and releases; forward reopens and resumes', async ({ page }) => {
  await page.goto(DASH);
  await page.getByText('HA button: play A in pop-up').click();
  await expectOpen(page, 'ok--ha-a', 1, 15_000);
  await page.goBack();
  await expectOpen(page, 'ok--ha-a', 0);
  await page.goForward();
  await expectOpen(page, 'ok--ha-a', 1, 15_000);
  await page.goBack();
  await expectOpen(page, 'ok--ha-a', 0);
});

test('a Bubble button (body and icon) plays a different channel in the pop-up', async ({
  page,
}) => {
  await page.goto(DASH);
  await page.getByText('HA button: play A in pop-up').click();
  await expectOpen(page, 'ok--ha-a', 1, 15_000);
  await page.locator('.bubble-close-button').first().click();
  await expectOpen(page, 'ok--ha-a', 0);
  const bubbleBtn = page
    .locator('bubble-card')
    .filter({ hasText: 'Bubble button: play B in pop-up' });
  await bubbleBtn.locator('.bubble-button-background').click();
  await expectOpen(page, 'ok--ha-b', 1, 15_000);
  expect((await stats(page, 'ok--ha-a')).open).toBe(0);
  await page.locator('.bubble-close-button').first().click();
  await expectOpen(page, 'ok--ha-b', 0);
  await bubbleBtn.locator('.bubble-icon-container').click();
  await expectOpen(page, 'ok--ha-b', 1, 15_000);
  await page.locator('.bubble-close-button').first().click();
  await expectOpen(page, 'ok--ha-b', 0);
});

test('a stop button clears the target, so reopening the pop-up stays stopped', async ({ page }) => {
  await page.goto(DASH);
  await page.getByText('HA button: play A in pop-up').click();
  await expectOpen(page, 'ok--ha-a', 1, 15_000);
  await page.locator('.bubble-close-button').first().click();
  await expectOpen(page, 'ok--ha-a', 0);
  await page.getByText('Stop pop-up').click();
  const before = (await stats(page, 'ok--ha-a')).total;
  await page.evaluate(() => {
    history.pushState(null, '', location.href.split('#')[0] + '#tv-test');
    window.dispatchEvent(new CustomEvent('location-changed'));
  });
  await page.waitForTimeout(3000);
  expect((await stats(page, 'ok--ha-a')).total).toBe(before);
});

test('switching dashboard view releases the page card; coming back resumes', async ({ page }) => {
  await page.goto(DASH);
  await page.getByText('Play C on page card').click();
  await expectOpen(page, 'ok--ha-c', 1, 15_000);
  await page.getByRole('tab', { name: 'Other' }).click();
  await expectOpen(page, 'ok--ha-c', 0);
  await page.getByRole('tab', { name: 'Main' }).click();
  await expectOpen(page, 'ok--ha-c', 1, 15_000);
});

test('dashboard edit mode stops playback and the card editor preview never connects', async ({
  page,
}) => {
  await page.goto(DASH);
  await page.getByText('Play C on page card').click();
  await expectOpen(page, 'ok--ha-c', 1, 15_000);
  const before = (await stats(page, 'ok--ha-c')).total;
  await page.getByRole('button', { name: /edit dashboard/i }).click();
  await expectOpen(page, 'ok--ha-c', 0, 8000);
  const options = page
    .locator('hui-card-options')
    .filter({ has: page.locator('stream-card') })
    .first();
  await options.getByRole('button', { name: /edit/i }).first().click();
  await expect(page.getByText('Stream card configuration')).toBeVisible();
  await expect(
    page.locator('hui-card-preview stream-card, ha-dialog stream-card').first(),
  ).toContainText('playback is off while editing');
  await page.waitForTimeout(3000);
  expect((await stats(page, 'ok--ha-c')).open).toBe(0);
  expect((await stats(page, 'ok--ha-c')).total).toBe(before);
});

test('constant HA state changes never restart playback', async ({ page }) => {
  await page.goto(DASH);
  await page.getByText('Play C on page card').click();
  await expectOpen(page, 'ok--ha-c', 1, 15_000);
  const before = (await stats(page, 'ok--ha-c')).total;
  for (let i = 0; i < 60; i++) {
    await page.request.post('http://127.0.0.1:8123/api/states/sensor.churn', {
      headers: { authorization: `Bearer ${tokens().access_token}` },
      data: { state: String(i) },
    });
  }
  await page.waitForTimeout(2000);
  expect((await stats(page, 'ok--ha-c')).total).toBe(before);
  expect((await stats(page, 'ok--ha-c')).open).toBe(1);
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
