import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const mpegtsDir = new URL('./node_modules/mpegts.js/', import.meta.url);
const mpegtsVersion: string = JSON.parse(
  readFileSync(new URL('package.json', mpegtsDir), 'utf8'),
).version;

/**
 * Ships mpegts.js as its unmodified upstream build next to the card (mpegts-<version>.js), so
 * it can be audited, cached separately and fetched from the npm CDN by installers.
 */
const vendorMpegts = {
  name: 'vendor-mpegts',
  generateBundle(this: { emitFile(f: { type: 'asset'; fileName: string; source: string }): void }) {
    this.emitFile({
      type: 'asset',
      fileName: `mpegts-${mpegtsVersion}.js`,
      source: readFileSync(new URL('dist/mpegts.js', mpegtsDir), 'utf8'),
    });
    this.emitFile({
      type: 'asset',
      fileName: 'mpegts.js.LICENSE.txt',
      source: readFileSync(new URL('dist/mpegts.js.LICENSE.txt', mpegtsDir), 'utf8'),
    });
  },
};

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(pkg.version),
    __MPEGTS_VERSION__: JSON.stringify(mpegtsVersion),
  },
  plugins: [vendorMpegts],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'stream-card.js',
    },
    minify: true,
    sourcemap: true,
    target: 'es2020',
    rolldownOptions: {
      output: {
        chunkFileNames: 'stream-card-[name]-[hash].js',
      },
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['test/unit/**/*.test.ts'],
  },
});
