import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SHIM = fileURLToPath(new URL('../e2e/mse-shim.js', import.meta.url));
const FAKE = 'http://127.0.0.1:8930';

interface Tokens {
  access_token: string;
  refresh_token: string;
  hassUrl: string;
  clientId: string;
}

export const tokens = (): Tokens =>
  JSON.parse(readFileSync(process.env.HA_TOKENS ?? '.ha-test/tokens.json', 'utf8')) as Tokens;

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript({ path: SHIM });
    // Log in by handing the frontend its tokens, as it stores them after a normal login.
    await page.addInitScript((t) => {
      if (location.port === '8123') {
        localStorage.setItem(
          'hassTokens',
          JSON.stringify({
            ...t,
            token_type: 'Bearer',
            expires_in: 1800,
            expires: Date.now() + 1_800_000,
          }),
        );
      }
    }, tokens());
    await use(page);
  },
});

export { expect };

export async function stats(
  page: Page,
  ch: string,
): Promise<{ open: number; total: number; queries: Record<string, string>[] }> {
  const r = await page.request.get(`${FAKE}/__stats?channel=${encodeURIComponent(ch)}`);
  return r.json();
}

export async function expectOpen(page: Page, ch: string, n: number, timeout = 6000): Promise<void> {
  await expect
    .poll(async () => (await stats(page, ch)).open, { timeout, message: `${ch} open connections` })
    .toBe(n);
}

export const cardInfo = (loc: Locator) =>
  loc.evaluate((el) =>
    JSON.parse(JSON.stringify((el as HTMLElement & { debugInfo: unknown }).debugInfo)),
  );
