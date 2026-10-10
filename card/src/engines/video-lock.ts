/**
 * An engine may finish tearing down a <video> one tick after it released the network. The next
 * engine on the same element waits for that, so the old teardown can't clear the new source.
 */
const busy = new WeakMap<HTMLVideoElement, Promise<void>>();

export function markVideoBusy(video: HTMLVideoElement, done: Promise<void>): void {
  const prev = busy.get(video) ?? Promise.resolve();
  const next = Promise.all([prev, done]).then(() => undefined);
  busy.set(video, next);
  void next.then(() => {
    if (busy.get(video) === next) busy.delete(video);
  });
}

export function videoIdle(video: HTMLVideoElement): Promise<void> {
  return busy.get(video) ?? Promise.resolve();
}
