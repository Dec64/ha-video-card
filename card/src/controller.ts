import { CONTROLLER_KEY, DEFAULT_TARGET, POWER_EVENT, VERSION } from './const';
import { parseRequest } from './config';
import { readRemembered, rememberStopped } from './memory';
import { previousRecent } from './recents';
import { SleepTimers, type SleepState } from './sleep-timer';
import type { StreamRequest } from './types';
import { writeVolume } from './volume';

/** What the controller needs from a card instance. */
export interface ControllerCard {
  readonly target: string;
  /** True while the card is in the page and not an editor preview. */
  readonly isLive: boolean;
  deliver(req: StreamRequest): void;
  stopFromController(): void;
  /** channel_up/down, last_channel, volume, mute, unmute: steer what's playing. */
  command(req: StreamRequest): void;
  /** The target's sleep timer started, changed, entered its last minute or was cancelled. */
  sleepChanged(): void;
}

export interface PowerState {
  screenOn: boolean;
  screensaver: boolean;
}

interface Pending {
  req: StreamRequest;
  at: number;
}

/** How long a request waits for its card to appear (e.g. a pop-up opening). */
export const PENDING_TTL_MS = 30_000;

interface FullyApi {
  bind(event: string, code: string): void;
}

/**
 * One per page. Catches `fire-dom-event` button presses, keeps a mailbox per target so a card
 * that mounts later (a Bubble pop-up opening) still gets its request, and relays Fully Kiosk
 * screen events to cards.
 */
export class StreamController {
  readonly version = VERSION;
  readonly power: PowerState = { screenOn: true, screensaver: false };
  private pending = new Map<string, Pending>();
  private stops = new Map<string, number>();
  private last = new Map<string, StreamRequest>();
  private cards = new Set<ControllerCard>();
  private installed = false;
  private readonly sleep = new SleepTimers(
    (target) => this.stop(target),
    (target) => {
      for (const card of this.cards) if (card.target === target) card.sleepChanged();
    },
  );

  constructor(private readonly win: Window = window) {}

  install(): void {
    if (this.installed) return;
    this.installed = true;
    this.win.addEventListener('ll-custom', this.onLlCustom);
    this.bindFully();
  }

  uninstall(): void {
    if (!this.installed) return;
    this.installed = false;
    this.win.removeEventListener('ll-custom', this.onLlCustom);
  }

  private onLlCustom = (ev: Event): void => {
    const detail = (ev as CustomEvent).detail as Record<string, unknown> | undefined;
    if (!detail || !('stream_card' in detail)) return;
    const req = parseRequest(detail.stream_card);
    if (!req) {
      console.warn('[stream-card] Ignoring a button with an invalid stream_card block:', detail);
      return;
    }
    this.request(req);
  };

  register(card: ControllerCard): void {
    this.cards.add(card);
  }

  unregister(card: ControllerCard): void {
    this.cards.delete(card);
  }

  request(req: StreamRequest): void {
    const target = req.target ?? DEFAULT_TARGET;
    const action = req.action ?? 'play';
    if (action === 'stop') {
      this.stop(target);
      return;
    }
    if (action !== 'play') {
      this.command({ ...req, target, action });
      if (req.open) this.navigate(req.open);
      return;
    }
    const full = { ...req, target };
    this.last.set(target, full);
    const live = [...this.cards].filter((c) => c.target === target && c.isLive);
    if (live.length) {
      this.pending.delete(target);
      for (const card of live) card.deliver(full);
    } else {
      this.pending.set(target, { req: full, at: Date.now() });
    }
    if (req.open) this.navigate(req.open);
  }

  /**
   * Everything except play and stop. Volume and the sleep timer work with no card on the page;
   * channel up/down waits in the mailbox like a play request; last channel uses device memory.
   */
  private command(req: StreamRequest & { target: string }): void {
    const { target } = req;
    if (req.action === 'sleep') {
      this.setSleep(target, req.sleep ?? 0);
      return;
    }
    if (req.action === 'volume' && req.volume !== undefined) writeVolume(req.volume / 100);
    const live = [...this.cards].filter((c) => c.target === target && c.isLive);
    if (live.length) {
      for (const card of live) card.command(req);
      return;
    }
    if (req.action === 'last_channel') {
      const prev = previousRecent(target, readRemembered(target)?.channel);
      if (prev) this.request({ ...prev, target, action: 'play' });
    } else if (req.action === 'channel_up' || req.action === 'channel_down') {
      this.pending.set(target, { req, at: Date.now() });
    }
  }

  /** Stops the target `minutes` from now (0 cancels), like a stop button at that time. */
  setSleep(target: string, minutes: number): void {
    this.sleep.set(target, minutes);
  }

  extendSleep(target: string, minutes: number): void {
    this.sleep.extend(target, minutes);
  }

  sleepFor(target: string): SleepState | undefined {
    return this.sleep.get(target);
  }

  /** Called by a card when it connects: a request made in the last 30 s that no card took yet. */
  take(target: string): StreamRequest | undefined {
    const p = this.pending.get(target);
    if (!p) return undefined;
    this.pending.delete(target);
    if (Date.now() - p.at > PENDING_TTL_MS) return undefined;
    return p.req;
  }

  /** The last channel requested for a target, so a recreated card can resume it. */
  lastFor(target: string): StreamRequest | undefined {
    return this.last.get(target);
  }

  /** How many stops a target has had; a card that was off the page compares it on return. */
  stopCount(target: string): number {
    return this.stops.get(target) ?? 0;
  }

  stop(target: string): void {
    this.pending.delete(target);
    this.last.delete(target);
    this.stops.set(target, this.stopCount(target) + 1);
    rememberStopped(target);
    this.sleep.cancel(target);
    for (const card of this.cards) if (card.target === target) card.stopFromController();
  }

  /** Opens a Bubble pop-up hash or an HA path the way HA's own navigate() does. */
  private navigate(open: string): void {
    const loc = this.win.location;
    let next: string;
    if (open.startsWith('#')) {
      if (loc.hash === open) return; // already open; re-adding the hash would make Bubble close it
      next = loc.href.split('#')[0] + open;
    } else {
      next = open;
    }
    this.win.history.pushState(null, '', next);
    this.win.dispatchEvent(
      new CustomEvent('location-changed', {
        detail: { replace: false },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private bindFully(): void {
    const fully = (this.win as unknown as { fully?: FullyApi }).fully;
    if (!fully || typeof fully.bind !== 'function') return;
    const fire = (name: string) =>
      `window.${CONTROLLER_KEY} && window.${CONTROLLER_KEY}.onFullyEvent(${JSON.stringify(name)})`;
    for (const name of ['screenOn', 'screenOff', 'onScreensaverStart', 'onScreensaverStop']) {
      try {
        fully.bind(name, fire(name));
      } catch (err) {
        console.warn('[stream-card] Could not bind Fully Kiosk event', name, err);
      }
    }
  }

  /** Entry point for the code strings bound with fully.bind(). */
  onFullyEvent(name: string): void {
    if (name === 'screenOn') this.power.screenOn = true;
    else if (name === 'screenOff') this.power.screenOn = false;
    else if (name === 'onScreensaverStart') this.power.screensaver = true;
    else if (name === 'onScreensaverStop') this.power.screensaver = false;
    else return;
    this.win.dispatchEvent(new CustomEvent(POWER_EVENT, { detail: { ...this.power } }));
  }
}

/** Returns the page's controller, creating it on first use. Safe if the bundle loads twice. */
export function getController(win: Window = window): StreamController {
  const w = win as unknown as Record<string, StreamController | undefined>;
  let c = w[CONTROLLER_KEY];
  if (!c) {
    c = new StreamController(win);
    w[CONTROLLER_KEY] = c;
  }
  c.install();
  return c;
}
