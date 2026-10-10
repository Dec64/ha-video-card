import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  define: { __VERSION__: JSON.stringify(pkg.version) },
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
