// Prints gzip sizes of the build and fails if what a dashboard loads before the first picture
// (the entry plus every chunk it imports statically) exceeds its budget. Lazy chunks (engine,
// guide, editor) don't count.
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const INITIAL_BUDGET_KB = 38;
const dir = new URL('../dist/', import.meta.url);
const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
const gz = (f) => gzipSync(readFileSync(new URL(f, dir))).length / 1024;

for (const f of files.sort()) {
  const size = readFileSync(new URL(f, dir)).length / 1024;
  console.log(
    `${f.padEnd(44)} ${size.toFixed(1).padStart(7)} KB  ${gz(f).toFixed(1).padStart(6)} KB gz`,
  );
}

/** The entry and its static imports, recursively (`import … from "./x.js"`, not `import("./x.js")`). */
const initial = new Set();
const visit = (f) => {
  if (initial.has(f)) return;
  initial.add(f);
  const src = readFileSync(new URL(f, dir), 'utf8');
  for (const m of src.matchAll(
    /(?:^|[;\n])\s*import\s*(?:[^'"()]*?\bfrom\s*)?["']\.\/([^"']+\.js)["']/g,
  )) {
    visit(m[1]);
  }
};
visit('stream-card.js');
const total = [...initial].reduce((n, f) => n + gz(f), 0);
const line = `initial load (${[...initial].join(' + ')}): ${total.toFixed(1)} KB gz`;
if (total > INITIAL_BUDGET_KB) {
  console.error(`${line}  ← over the ${INITIAL_BUDGET_KB} KB gz budget`);
  process.exit(1);
}
console.log(line);
