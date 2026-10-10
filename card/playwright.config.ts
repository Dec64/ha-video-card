import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

/** REAL_CODECS=1 runs the @real tests in Google Chrome, which can decode H.264/AAC. */
const real = process.env.REAL_CODECS === '1';
// Cloud dev containers ship a Chromium build outside Playwright's registry.
const localChromium =
  !process.env.CI && existsSync('/opt/pw-browsers/chromium')
    ? '/opt/pw-browsers/chromium'
    : undefined;

export default defineConfig({
  testDir: 'test/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8931',
    trace: 'retain-on-failure',
    viewport: { width: 900, height: 700 },
  },
  projects: [
    real
      ? { name: 'chrome', use: { channel: 'chrome' }, grep: /@real/ }
      : {
          name: 'chromium',
          use: { launchOptions: localChromium ? { executablePath: localChromium } : {} },
          grepInvert: /@real-only/,
        },
  ],
  webServer: {
    command: 'node test/fake-dispatcharr/server.mjs --port 8930 --app-port 8931',
    url: 'http://127.0.0.1:8931/harness.js',
    reuseExistingServer: !process.env.CI,
  },
});
