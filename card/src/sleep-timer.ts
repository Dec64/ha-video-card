/** Sleep timers per target: stop playing at a set time, with a warning in the last minute. */

const PREFIX = 'stream-card:sleep:';
export const SLEEP_WARNING_MS = 60_000;
const MINUTE = 60_000;
/** setTimeout can't wait longer than this; longer timers re-arm. */
const MAX_DELAY = 2 ** 31 - 1;

export interface SleepState {
  endsAt: number;
  remainingMs: number;
  /** In the last minute: the card offers "Keep watching". */
  warning: boolean;
}

interface Timer {
  endsAt: number;
  handle?: ReturnType<typeof setTimeout>;
}

/**
 * Owned by the page controller so every card on a target shares one timer, and a closed pop-up
 * still stops on time. The deadline is saved per device, so a reload doesn't cancel it.
 */
export class SleepTimers {
  private timers = new Map<string, Timer>();
  private loaded = new Set<string>();

  constructor(
    private readonly onExpire: (target: string) => void,
    private readonly onChange: (target: string) => void,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** Starts a timer for `minutes` from now; 0 or less cancels it. */
  set(target: string, minutes: number): void {
    this.load(target);
    if (!(minutes > 0)) {
      this.cancel(target);
      return;
    }
    this.arm(target, this.now() + minutes * MINUTE);
  }

  /** Adds minutes to a running timer, or starts one. */
  extend(target: string, minutes: number): void {
    this.load(target);
    if (!(minutes > 0)) return;
    const t = this.timers.get(target);
    this.arm(target, Math.max(t?.endsAt ?? 0, this.now()) + minutes * MINUTE);
  }

  cancel(target: string): void {
    this.load(target);
    const t = this.timers.get(target);
    if (t) clearTimeout(t.handle);
    this.timers.delete(target);
    this.save(target, undefined);
    if (t) this.onChange(target);
  }

  get(target: string): SleepState | undefined {
    this.load(target);
    const t = this.timers.get(target);
    if (!t) return undefined;
    const remainingMs = Math.max(0, t.endsAt - this.now());
    return { endsAt: t.endsAt, remainingMs, warning: remainingMs <= SLEEP_WARNING_MS };
  }

  /** Picks up a deadline saved before a reload. One that passed meanwhile expires now. */
  private load(target: string): void {
    if (this.loaded.has(target)) return;
    this.loaded.add(target);
    let endsAt: number | undefined;
    try {
      const raw = localStorage.getItem(PREFIX + target);
      endsAt = raw === null ? undefined : Number(raw);
    } catch {
      endsAt = undefined;
    }
    if (endsAt === undefined || !Number.isFinite(endsAt)) return;
    if (endsAt <= this.now()) {
      this.save(target, undefined);
      this.onExpire(target);
      return;
    }
    this.arm(target, endsAt, false);
  }

  private arm(target: string, endsAt: number, notify = true): void {
    const old = this.timers.get(target);
    if (old) clearTimeout(old.handle);
    const t: Timer = { endsAt };
    this.timers.set(target, t);
    this.save(target, endsAt);
    this.schedule(target, t);
    if (notify) this.onChange(target);
  }

  /** Wakes once when the warning starts, then at the deadline. */
  private schedule(target: string, t: Timer): void {
    const left = t.endsAt - this.now();
    if (left <= 0) {
      this.timers.delete(target);
      this.save(target, undefined);
      this.onExpire(target);
      return;
    }
    const wake = left > SLEEP_WARNING_MS ? left - SLEEP_WARNING_MS : left;
    t.handle = setTimeout(
      () => {
        if (this.timers.get(target) !== t) return;
        if (t.endsAt - this.now() > 0) this.onChange(target);
        this.schedule(target, t);
      },
      Math.min(wake, MAX_DELAY),
    );
  }

  private save(target: string, endsAt: number | undefined): void {
    try {
      if (endsAt === undefined) localStorage.removeItem(PREFIX + target);
      else localStorage.setItem(PREFIX + target, String(endsAt));
    } catch {
      /* storage unavailable */
    }
  }
}
