import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

// Real Home Assistant integration tests. Run through test/ha/run.sh (npm run e2e:ha),
// which starts HA on :8123 first.
const localChromium =
  !process.env.CI && existsSync('/opt/pw-browsers/chromium')
    ? '/opt/pw-browsers/chromium'
    : undefined;

export default defineConfig({
  testDir: 'test/ha',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8123',
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
    launchOptions: localChromium ? { executablePath: localChromium } : {},
  },
  webServer: {
    command: 'node test/fake-dispatcharr/server.mjs --port 8930 --app-port 8931',
    url: 'http://127.0.0.1:8931/harness.js',
    reuseExistingServer: !process.env.CI,
  },
});
