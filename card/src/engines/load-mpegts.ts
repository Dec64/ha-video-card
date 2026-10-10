import type mpegtsNs from 'mpegts.js';

export type Mpegts = typeof mpegtsNs;

/** File name of the unmodified upstream build shipped next to the card (see vite.config.ts). */
export const MPEGTS_FILE = `mpegts-${__MPEGTS_VERSION__}.js`;

let loading: Promise<Mpegts> | undefined;

/**
 * Loads mpegts.js from the file next to this module. It is a UMD script that defines
 * window.mpegts, so it is loaded with a <script> tag rather than import().
 */
export function loadMpegts(): Promise<Mpegts> {
  const w = window as unknown as { mpegts?: Mpegts };
  if (w.mpegts) return Promise.resolve(w.mpegts);
  loading ??= new Promise<Mpegts>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(MPEGTS_FILE, import.meta.url).href;
    script.async = true;
    script.onload = () => {
      if (w.mpegts) resolve(w.mpegts);
      else reject(new Error(`${script.src} did not define window.mpegts`));
    };
    script.onerror = () => {
      loading = undefined;
      script.remove();
      reject(new Error(`Could not load ${script.src}`));
    };
    document.head.appendChild(script);
  });
  return loading;
}
