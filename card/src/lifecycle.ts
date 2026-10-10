import { POWER_EVENT } from './const';
import type { PowerState } from './controller';

/** Everything that decides whether a card may hold a stream open right now. */
export interface PlayConditions {
  connected: boolean;
  preview: boolean;
  hasSource: boolean;
  wantPlaying: boolean;
  intersecting: boolean;
  pageVisible: boolean;
  screenAwake: boolean;
}

export type HoldReason =
  'disconnected' | 'preview' | 'no-source' | 'stopped' | 'hidden' | 'page-hidden' | 'screen-off';

/** Why the card must not play, or null if it should. Order = most specific reason first. */
export function holdReason(c: PlayConditions): HoldReason | null {
  if (!c.connected) return 'disconnected';
  if (c.preview) return 'preview';
  if (!c.hasSource) return 'no-source';
  if (!c.wantPlaying) return 'stopped';
  if (!c.pageVisible) return 'page-hidden';
  if (!c.screenAwake) return 'screen-off';
  if (!c.intersecting) return 'hidden';
  return null;
}

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/**
 * Watches the signals that mean "nobody can see this card": IntersectionObserver, page
 * visibility, pagehide/pageshow, and Fully Kiosk screen events. Also runs the idle timer.
 * It only reports; the card decides.
 */
export class LifecycleWatcher {
  intersecting: boolean;
  pageVisible = true;
  screenAwake = true;
  private io?: IntersectionObserver;
  private idleTimer?: ReturnType<typeof setTimeout>;
  private idleMs = 0;
  private idleArmed = false;
  private attached = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly power: PowerState,
    private readonly onChange: () => void,
    private readonly onIdle: () => void,
  ) {
    // Without IntersectionObserver we can't know, so assume visible.
    this.intersecting = typeof IntersectionObserver === 'undefined';
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    this.pageVisible = document.visibilityState !== 'hidden';
    this.screenAwake = this.power.screenOn && !this.power.screensaver;
    if (typeof IntersectionObserver !== 'undefined') {
      this.intersecting = false;
      this.io = new IntersectionObserver(
        (entries) => {
          const last = entries[entries.length - 1];
          if (!last) return;
          const vis = last.isIntersecting && last.intersectionRatio > 0;
          if (vis !== this.intersecting) {
            this.intersecting = vis;
            this.onChange();
          }
        },
        { threshold: [0, 0.01] },
      );
      this.io.observe(this.host);
    }
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.onPageHide);
    window.addEventListener('pageshow', this.onVisibility);
    window.addEventListener(POWER_EVENT, this.onPower);
    for (const e of ACTIVITY_EVENTS) {
      document.addEventListener(e, this.onActivity, { capture: true, passive: true });
    }
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    this.io?.disconnect();
    this.io = undefined;
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('pagehide', this.onPageHide);
    window.removeEventListener('pageshow', this.onVisibility);
    window.removeEventListener(POWER_EVENT, this.onPower);
    for (const e of ACTIVITY_EVENTS) {
      document.removeEventListener(e, this.onActivity, { capture: true });
    }
    this.disarmIdle();
  }

  private onVisibility = (): void => {
    const vis = document.visibilityState !== 'hidden';
    if (vis !== this.pageVisible) {
      this.pageVisible = vis;
      this.onChange();
    }
  };

  private onPageHide = (): void => {
    this.pageVisible = false;
    this.onChange();
  };

  private onPower = (): void => {
    const awake = this.power.screenOn && !this.power.screensaver;
    if (awake !== this.screenAwake) {
      this.screenAwake = awake;
      this.onChange();
    }
  };

  private onActivity = (): void => {
    if (this.idleArmed) this.restartIdle();
  };

  /** Starts (or stops, with 0) the "stop after N ms without interaction" timer. */
  armIdle(ms: number): void {
    this.idleMs = ms;
    this.idleArmed = ms > 0;
    this.restartIdle();
  }

  disarmIdle(): void {
    this.idleArmed = false;
    clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
  }

  private restartIdle(): void {
    clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
    if (!this.idleArmed) return;
    this.idleTimer = setTimeout(() => {
      this.idleArmed = false;
      this.onIdle();
    }, this.idleMs);
  }
}
