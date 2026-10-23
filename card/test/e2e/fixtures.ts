import { test as base, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export const STREAM = 'http://127.0.0.1:8930';
export const REAL = process.env.REAL_CODECS === '1';
const SHIM = fileURLToPath(new URL('./mse-shim.js', import.meta.url));

export interface CardInfo {
  ui: string;
  layout?: string;
  hold: string | null;
  lastRelease?: string;
  url?: string;
  state?: string;
  failures: number;
  mutedByPolicy: boolean;
  needsGesture: boolean;
  muted: boolean;
  mediaInfo?: { videoCodec?: string; audioCodec?: string; hasVideo?: boolean };
  notice?: string;
  error?: { kind: string; message: string };
}

export interface ChannelStats {
  open: number;
  total: number;
  queries: Record<string, string>[];
}

export class Harness {
  private n = 0;
  constructor(
    readonly page: Page,
    private readonly prefix: string,
  ) {}

  /** A channel ID unique to this test; `mode` picks the fake server's behaviour. */
  channel(mode = 'ok'): string {
    return `${mode}--${this.prefix}-${++this.n}`;
  }

  async load(opts: { fully?: boolean; path?: string } = {}): Promise<void> {
    if (opts.fully) await this.page.evaluate(() => window.harness.installFully());
    await this.page.evaluate((p) => window.harness.load(p), opts.path);
  }

  /**
   * Mounts a card. Tests that don't set channel_list or m3u_url get channel_list: false, so
   * their made-up channel IDs take the direct path that real Dispatcharr UUIDs take.
   */
  async mount(config: Record<string, unknown>, opts: { where?: string; id?: string } = {}) {
    const list = 'channel_list' in config || 'm3u_url' in config ? {} : { channel_list: false };
    await this.page.evaluate(
      ([c, o]) => {
        window.harness.mount(c, o);
      },
      [{ dispatcharr_url: STREAM, ...list, ...config }, opts] as const,
    );
  }

  async button(label: string, streamCard: Record<string, unknown>) {
    await this.page.evaluate(([l, s]) => void window.harness.button(l, s), [
      label,
      streamCard,
    ] as const);
    return this.page.locator('button.action', { hasText: label });
  }

  async stats(ch: string): Promise<ChannelStats> {
    const r = await this.page.request.get(`${STREAM}/__stats?channel=${encodeURIComponent(ch)}`);
    return r.json();
  }

  /** Open connections across these channels, from one snapshot of the server's counters. */
  async openSum(chs: string[]): Promise<number> {
    const r = await this.page.request.get(`${STREAM}/__stats`);
    const all = (await r.json()) as Record<string, ChannelStats>;
    return chs.reduce((n, ch) => n + (all[ch]?.open ?? 0), 0);
  }

  async expectOpen(ch: string, n: number, timeout = 5000): Promise<void> {
    await expect.poll(async () => (await this.stats(ch)).open, { timeout }).toBe(n);
  }

  info(sel = 'stream-card'): Promise<CardInfo> {
    return this.page.evaluate((s) => window.harness.info(s), sel) as Promise<CardInfo>;
  }

  async expectUi(ui: string, sel = 'stream-card', timeout = 10_000): Promise<void> {
    await expect.poll(async () => (await this.info(sel))?.ui, { timeout }).toBe(ui);
  }

  /** The picture with its ident and controls (`.stage`). */
  frame(sel = 'stream-card') {
    return this.page.locator(sel).locator('.stage');
  }
}

// Channel IDs must not repeat across runs: a fake server reused between runs keeps its counters.
const RUN = Date.now().toString(36);

export const test = base.extend<{ h: Harness }>({
  h: async ({ page }, use, testInfo) => {
    if (!REAL) await page.addInitScript({ path: SHIM });
    page.on('pageerror', (err) =>
      console.log(
        `[pageerror] ${test.info().title}: ${err.message} @ ${err.stack?.split('\n').slice(1, 4).join(' < ')}`,
      ),
    );
    await page.goto('/');
    await use(new Harness(page, `${testInfo.testId}-${RUN}-r${testInfo.retry}`));
  },
});

export { expect };

declare global {
  interface Window {
    harness: {
      load(path?: string): Promise<void>;
      mount(config: unknown, opts?: unknown): HTMLElement;
      button(label: string, streamCard: unknown): HTMLButtonElement;
      closePopup(): void;
      openHash(hash: string): void;
      setPageVisibility(state: 'hidden' | 'visible'): void;
      installFully(): void;
      fullyEmit(event: string): void;
      info(sel?: string): unknown;
      cardIn(sel: string): HTMLElement & { preview: boolean };
      counters(): { sessions: number; engines: number };
    };
    __mseShimCodecs?: string[];
    __mseShimBlockUnmuted?: boolean;
    __mseShimAppendMs?: number;
  }
}
