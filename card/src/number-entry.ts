/** How long the card waits for another digit before tuning to the number typed so far. */
export const NUMBER_ENTRY_MS = 2000;
/** Longest channel number accepted; reaching it tunes at once. */
export const NUMBER_MAX_DIGITS = 5;

/**
 * Remote-style channel number entry: digits collect, then tune after a pause, on Enter, at the
 * maximum length, or as soon as `isComplete` says no longer number can match.
 */
export class NumberEntry {
  digits = '';
  private timer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly onCommit: (digits: string) => void,
    private readonly onChange: () => void,
    private readonly isComplete: (digits: string) => boolean = () => false,
    private readonly delayMs = NUMBER_ENTRY_MS,
  ) {}

  press(d: string): void {
    if (!/^\d$/.test(d)) return;
    this.digits += d;
    if (this.digits.length >= NUMBER_MAX_DIGITS || this.isComplete(this.digits)) {
      this.commit();
      return;
    }
    this.restart();
    this.onChange();
  }

  /** Removes the last digit. */
  delete(): void {
    if (!this.digits) return;
    this.digits = this.digits.slice(0, -1);
    if (this.digits) this.restart();
    else clearTimeout(this.timer);
    this.onChange();
  }

  commit(): void {
    const d = this.digits;
    this.clear();
    if (d) this.onCommit(d);
  }

  clear(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    const had = !!this.digits;
    this.digits = '';
    if (had) this.onChange();
  }

  private restart(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.commit(), this.delayMs);
  }
}
