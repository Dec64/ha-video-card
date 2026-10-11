import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

/** REAL_CODECS=1 runs the @real tests in Google Chrome, which can decode H.264/AAC. */
const real = process.env.REAL_CODECS === '1';
/** LIVE=1 runs test/live against a real Dispatcharr (see test/live/live.spec.ts). */
const live = process.env.LIVE === '1';
// Cloud dev containers ship a Chromium build outside Playwright's registry.
const localChromium =
  !process.env.CI && existsSync('/opt/pw-browsers/chromium')
    ? '/opt/pw-browsers/chromium'
    : undefined;

export default defineConfig({
  testDir: live ? 'test/live' : 'test/e2e',
  timeout: live ? 150_000 : 60_000,
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
          use: {
            launchOptions: localChromium ? { executablePath: localChromium } : {},
            // Live tests from a sandbox may need the outbound proxy.
            proxy:
              live && process.env.HTTPS_PROXY
                ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' }
                : undefined,
          },
          grepInvert: /@real-only/,
        },
  ],
  webServer: {
    command: 'node test/fake-dispatcharr/server.mjs --port 8930 --app-port 8931',
    url: 'http://127.0.0.1:8931/harness.js',
    reuseExistingServer: !process.env.CI,
  },
});
