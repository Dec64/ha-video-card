// Prints gzip sizes of the build and fails if the entry chunk exceeds its budget.
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const ENTRY_BUDGET_KB = 32;
const dir = new URL('../dist/', import.meta.url);
let failed = false;
for (const f of readdirSync(dir)
  .filter((n) => n.endsWith('.js'))
  .sort()) {
  const buf = readFileSync(new URL(f, dir));
  const gz = gzipSync(buf).length / 1024;
  const line = `${f.padEnd(44)} ${(buf.length / 1024).toFixed(1).padStart(7)} KB  ${gz.toFixed(1).padStart(6)} KB gz`;
  if (f === 'stream-card.js' && gz > ENTRY_BUDGET_KB) {
    console.error(`${line}  ← over the ${ENTRY_BUDGET_KB} KB gz budget`);
    failed = true;
  } else {
    console.log(line);
  }
}
if (failed) process.exit(1);
