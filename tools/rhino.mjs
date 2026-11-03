// Runs each built package in Myspoti's desktop runner, on the Rhino the phone runs: a bundle must
// load and answer there, not only in Node. MYSPOTI_EXT is the myspoti-ext launcher of a Myspoti
// build that has the lyrics-romanize hook (base/extensions-cli/build/install/myspoti-ext/bin).
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VARIANTS = ['compat', 'hook'];

const cli = process.env.MYSPOTI_EXT;
if (!cli) {
  console.error('Set MYSPOTI_EXT to the myspoti-ext launcher of a Myspoti build with the lyrics-romanize hook.');
  process.exit(2);
}

for (const variant of VARIANTS) {
  const scenario = join(ROOT, 'test', 'rhino', `${variant}.scenario.json`);
  const run = spawnSync(cli, ['test', join(ROOT, 'dist', variant), '--scenario', scenario], { stdio: 'inherit' });
  if (run.status !== 0) process.exit(run.status ?? 1);
}
