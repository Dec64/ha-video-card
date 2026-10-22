import { describe, expect, it } from 'vitest';
import { isStruggling } from '../../src/multiview';

describe('isStruggling', () => {
  it('needs two bad samples in a row', () => {
    expect(isStruggling([{ decoded: 60, dropped: 40 }])).toBe(false);
    expect(
      isStruggling([
        { decoded: 60, dropped: 40 },
        { decoded: 100, dropped: 0 },
      ]),
    ).toBe(false);
    expect(
      isStruggling([
        { decoded: 100, dropped: 0 },
        { decoded: 60, dropped: 40 },
        { decoded: 50, dropped: 30 },
      ]),
    ).toBe(true);
  });

  it('ignores a few dropped frames and samples with too few frames', () => {
    expect(
      isStruggling([
        { decoded: 95, dropped: 5 },
        { decoded: 90, dropped: 10 },
      ]),
    ).toBe(false);
    expect(
      isStruggling([
        { decoded: 5, dropped: 10 },
        { decoded: 5, dropped: 10 },
      ]),
    ).toBe(false);
  });
});
