// Fails if any message the card can show (MESSAGES in src/errors.ts) is missing from the
// README's troubleshooting table, so the docs can't drift from the code.
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/errors.ts', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
const block = /export const MESSAGES = \{([\s\S]*?)\} as const;/.exec(src)?.[1] ?? '';
const messages = [...block.matchAll(/^\s*(\w+):\s*\n?\s*(['"`])([\s\S]*?)\2,\s*$/gm)].map((m) => ({
  key: m[1],
  text: m[3].replace(/\\'/g, "'"),
}));
if (messages.length < 10) {
  console.error(
    `Only found ${messages.length} messages in src/errors.ts; is the parser out of date?`,
  );
  process.exit(1);
}
const skip = new Set(['config']); // config errors pass the ConfigError text through
const missing = messages.filter((m) => !skip.has(m.key) && !readme.includes(m.text));
if (missing.length) {
  console.error('README.md troubleshooting is missing these card messages:');
  for (const m of missing) console.error(`  ${m.key}: ${m.text}`);
  process.exit(1);
}
console.log(`All ${messages.length - skip.size} card messages are documented in README.md`);
