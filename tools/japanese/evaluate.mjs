// Measures the Japanese engine against MeCab and UniDic (reference.py) on the same runs: how many
// it reads at all, how many it reads exactly as MeCab, how its cuts between words agree, and how
// long it takes. Writes the runs it reads otherwise to a file, for a look.
//
// Usage: node tools/japanese/evaluate.mjs REFERENCE.json MISMATCHES.txt
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const [referencePath, mismatchesPath] = process.argv.slice(2);
if (!referencePath || !mismatchesPath) {
  console.error('Usage: node tools/japanese/evaluate.mjs REFERENCE.json MISMATCHES.txt');
  process.exit(2);
}

const bundle = await build({
  stdin: {
    contents:
      "export { tokenize } from './src/engines/japanese/lattice';" +
      "export { romanizeTokens } from './src/engines/japanese/words';",
    // The repository's root, wherever the script is run from.
    resolveDir: fileURLToPath(new URL('../..', import.meta.url)),
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
});
const engine = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);

/** The positions a list of surfaces is cut at, between its first and last character. */
function cuts(surfaces) {
  const out = new Set();
  let at = 0;
  for (const s of surfaces.slice(0, -1)) out.add((at += s.length));
  return out;
}

const reference = JSON.parse(readFileSync(referencePath, 'utf8'));
let read = 0;
let same = 0;
let comparable = 0;
let agreedCuts = 0;
let ourCuts = 0;
let theirCuts = 0;
const mismatches = [];
const started = performance.now();
for (const { run, tokens } of reference) {
  const ours = engine.tokenize(run);
  // A kanji the engine has no reading for is kept as it is written, its reading empty.
  if (ours.some((t) => t.reading === '')) {
    mismatches.push(`UNREAD\t${run}`);
    continue;
  }
  read++;
  const mine = cuts(ours.map((t) => t.surface));
  const theirs = cuts(tokens.map(([surface]) => surface));
  for (const c of mine) if (theirs.has(c)) agreedCuts++;
  ourCuts += mine.size;
  theirCuts += theirs.size;
  if (tokens.some(([, reading]) => reading === null)) continue;
  comparable++;
  const expected = tokens.map(([, reading]) => reading).join('');
  const actual = ours.map((t) => t.reading).join('');
  if (expected === actual) same++;
  else
    mismatches.push(
      `${run}\n  MeCab: ${tokens.map(([s, r]) => `${s}/${r}`).join(' ')}\n  ours:  ${ours.map((t) => `${t.surface}/${t.reading}`).join(' ')}`,
    );
}
const ms = performance.now() - started;

const pct = (a, b) => `${((100 * a) / Math.max(1, b)).toFixed(2)} %`;
console.log(`runs: ${reference.length}, read: ${pct(read, reference.length)}`);
console.log(`same reading as MeCab: ${pct(same, comparable)} of ${comparable} comparable runs`);
console.log(`cuts: precision ${pct(agreedCuts, ourCuts)}, recall ${pct(agreedCuts, theirCuts)}`);
console.log(`time: ${ms.toFixed(0)} ms in Node (${((1000 * ms) / reference.length).toFixed(0)} µs a run)`);
writeFileSync(mismatchesPath, mismatches.join('\n') + '\n');
console.log(`${mismatches.length} runs written to ${mismatchesPath}`);
