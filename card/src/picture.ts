/**
 * Frozen-picture and black-screen detection. A frozen picture often keeps its sound and its
 * clock, so the stall watchdog (which watches currentTime) never notices; a dead upstream often
 * sends black frames. Every SAMPLE_MS the session draws the frame into a tiny canvas and feeds
 * the result here.
 */

export type PictureProblem = 'frozen' | 'black';

/** How often the picture is sampled while playing. */
export const SAMPLE_MS = 2000;
/** An unchanged picture (or no new decoded frames) for this long counts as frozen. */
export const FROZEN_MS = 12_000;
/** A black picture for this long counts as black (fades and night scenes are much shorter). */
export const BLACK_MS = 15_000;

const W = 32;
const H = 18;
/** Mean luma difference (0–255) below which two samples count as the same picture. */
const SAME_DIFF = 0.6;
/** Black: mean luma and brightest pixel (0–255). */
const BLACK_MEAN = 16;
const BLACK_MAX = 40;

export interface PictureSample {
  /** Luma of each of the W×H pixels. */
  luma: Uint8Array;
  mean: number;
  max: number;
}

/** Decoded frame count, if the browser reports it. */
export function frameCount(video: HTMLVideoElement): number | undefined {
  try {
    const q = video.getVideoPlaybackQuality?.();
    if (q) return q.totalVideoFrames;
  } catch {
    /* not supported */
  }
  const w = (video as HTMLVideoElement & { webkitDecodedFrameCount?: number })
    .webkitDecodedFrameCount;
  return typeof w === 'number' ? w : undefined;
}

/**
 * Draws the current frame small and reads it back. Returns null if the picture can't be read:
 * no canvas, or a cross-origin source without CORS (the canvas is tainted).
 */
export class PictureSampler {
  private ctx?: CanvasRenderingContext2D | null;
  unavailable = false;

  sample(video: HTMLVideoElement): PictureSample | null {
    if (this.unavailable) return null;
    try {
      if (this.ctx === undefined) {
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        this.ctx = c.getContext('2d', { willReadFrequently: true });
      }
      if (!this.ctx) {
        this.unavailable = true;
        return null;
      }
      this.ctx.drawImage(video, 0, 0, W, H);
      const px = this.ctx.getImageData(0, 0, W, H).data;
      const luma = new Uint8Array(W * H);
      let sum = 0;
      let max = 0;
      for (let i = 0; i < luma.length; i++) {
        const y = (px[i * 4] * 77 + px[i * 4 + 1] * 150 + px[i * 4 + 2] * 29) >> 8;
        luma[i] = y;
        sum += y;
        if (y > max) max = y;
      }
      return { luma, mean: sum / luma.length, max };
    } catch {
      // SecurityError (tainted canvas) or no 2D canvas: give up for this session.
      this.unavailable = true;
      return null;
    }
  }
}

function meanDiff(a: Uint8Array, b: Uint8Array): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
  return d / a.length;
}

/** Decides from successive samples whether the picture is frozen or black. Pure: no DOM. */
export class PictureWatch {
  private last?: Uint8Array;
  private sameSince?: number;
  private blackSince?: number;
  private frames?: number;
  private framesSince?: number;
  /** Problems no longer checked for (the channel's picture is just like that). */
  readonly off = new Set<PictureProblem>();

  /** Forget history: after a reconnect, a pause or a hold, start counting again. */
  reset(): void {
    this.last = undefined;
    this.sameSince = this.blackSince = this.framesSince = this.frames = undefined;
  }

  check(
    sample: PictureSample | null,
    frames: number | undefined,
    now: number,
  ): PictureProblem | null {
    if (frames !== undefined) {
      if (frames !== this.frames) {
        this.frames = frames;
        this.framesSince = now;
      }
    }
    if (sample) {
      const black = sample.mean < BLACK_MEAN && sample.max < BLACK_MAX;
      if (black) {
        this.blackSince ??= now;
        // A black picture is also an unchanging one: let the black rule decide.
        this.sameSince = undefined;
        this.last = undefined;
      } else {
        this.blackSince = undefined;
        if (this.last && meanDiff(this.last, sample.luma) < SAME_DIFF) {
          this.sameSince ??= now;
        } else this.sameSince = undefined;
        this.last = sample.luma;
      }
    }
    if (
      !this.off.has('black') &&
      this.blackSince !== undefined &&
      now - this.blackSince >= BLACK_MS
    ) {
      return 'black';
    }
    if (!this.off.has('frozen')) {
      if (this.sameSince !== undefined && now - this.sameSince >= FROZEN_MS) return 'frozen';
      if (
        this.framesSince !== undefined &&
        now - this.framesSince >= FROZEN_MS &&
        this.blackSince === undefined
      ) {
        return 'frozen';
      }
    }
    return null;
  }
}
