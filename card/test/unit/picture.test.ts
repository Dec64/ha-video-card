import { describe, expect, it } from 'vitest';
import {
  BLACK_MS,
  FROZEN_MS,
  PictureWatch,
  SAMPLE_MS,
  type PictureSample,
} from '../../src/picture';

function sample(fill: (i: number) => number): PictureSample {
  const luma = new Uint8Array(32 * 18);
  let sum = 0;
  let max = 0;
  for (let i = 0; i < luma.length; i++) {
    luma[i] = fill(i);
    sum += luma[i];
    max = Math.max(max, luma[i]);
  }
  return { luma, mean: sum / luma.length, max };
}

const moving = (n: number) => sample((i) => (i * 7 + n * 31) % 256);
const still = sample((i) => (i * 7) % 256);
const black = sample(() => 3);

/** Feeds a sample every SAMPLE_MS for `ms`; returns the first problem reported, and when. */
function run(
  w: PictureWatch,
  ms: number,
  next: (n: number) => PictureSample | null,
  frames?: (n: number) => number | undefined,
  start = 0,
) {
  for (let t = start, n = 0; t <= start + ms; t += SAMPLE_MS, n++) {
    const p = w.check(next(n), frames?.(n), t);
    if (p) return { p, t: t - start };
  }
  return undefined;
}

describe('PictureWatch', () => {
  it('never reports a moving picture', () => {
    const w = new PictureWatch();
    expect(run(w, 120_000, moving, (n) => n * 50)).toBeUndefined();
  });

  it('reports a frozen picture after FROZEN_MS', () => {
    const w = new PictureWatch();
    const r = run(
      w,
      60_000,
      () => still,
      (n) => n * 50,
    );
    expect(r?.p).toBe('frozen');
    expect(r!.t).toBeGreaterThanOrEqual(FROZEN_MS);
    expect(r!.t).toBeLessThan(FROZEN_MS + 2 * SAMPLE_MS);
  });

  it("reports frozen when decoded frames stop, even if the picture can't be read", () => {
    const w = new PictureWatch();
    expect(
      run(
        w,
        60_000,
        () => null,
        () => 1234,
      )?.p,
    ).toBe('frozen');
  });

  it('reports black after BLACK_MS, not as frozen first', () => {
    const w = new PictureWatch();
    const r = run(
      w,
      60_000,
      () => black,
      (n) => n * 50,
    );
    expect(r?.p).toBe('black');
    expect(r!.t).toBeGreaterThanOrEqual(BLACK_MS);
  });

  it('lets a short fade to black pass', () => {
    const w = new PictureWatch();
    expect(
      run(
        w,
        60_000,
        (n) => (n % 6 < 4 ? black : moving(n)),
        (n) => n * 50,
      ),
    ).toBeUndefined();
  });

  it('starts counting again after reset()', () => {
    const w = new PictureWatch();
    expect(run(w, FROZEN_MS - SAMPLE_MS, () => still)).toBeUndefined();
    w.reset();
    const r = run(w, 60_000, () => still, undefined, FROZEN_MS);
    expect(r!.t).toBeGreaterThanOrEqual(FROZEN_MS);
  });

  it('stops checking a problem that is switched off', () => {
    const w = new PictureWatch();
    w.off.add('black');
    expect(
      run(
        w,
        60_000,
        () => black,
        (n) => n * 50,
      ),
    ).toBeUndefined();
  });
});
