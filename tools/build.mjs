// Builds each variant of the extension into dist/<variant>/ and its package dist/<zip>: its
// manifest, its license and the one script Myspoti's sandbox runs. Rhino 1.8.1 has no class,
// spread, for-of or per-iteration let: esbuild bundles the sources, SWC lowers them to ES5.
// The store variant's manifest is also written at the root, where Myspoti's store reads it.
import { transformSync } from '@swc/core';
import { build } from 'esbuild';
import { zipSync } from 'fflate';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esHangulWithoutUnicodeFlag } from './rhino-compat.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Myspoti refuses a package whose script is larger (docs/extensions/API.md, section 7).
const MAX_SCRIPT_BYTES = 1024 * 1024;
// hook: for Myspoti 2.4.0 or newer, which asks for romanizations through lyrics-romanize, the
// store's; compat: for an older Myspoti, through the lyrics hook.
const VARIANTS = [
  { name: 'hook', entry: 'src/main.hook.ts', manifest: 'manifests/hook.json', zip: 'extension.zip', store: true },
  { name: 'compat', entry: 'src/main.compat.ts', manifest: 'manifests/compat.json', zip: 'extension-compat.zip' },
];
// One date for every file of a package, so that the same sources give the same zip.
const PACKAGE_DATE = new Date('2026-01-01T00:00:00Z');

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
const versionCode = major * 10000 + minor * 100 + patch;
const license = readFileSync(join(ROOT, 'LICENSE'));

// The bundled dependencies' licenses travel in the script itself: of a package's other files,
// Myspoti keeps only LICENSE and README.md.
const notices = Object.keys(pkg.dependencies ?? {})
  .map((name) => {
    const text = readFileSync(join(ROOT, 'node_modules', name, 'LICENSE'), 'utf8').trim();
    if (text.includes('*/')) throw new Error(`${name}: its license cannot sit in a comment`);
    return `/*! ${name}, bundled in this script:\n\n${text}\n*/\n`;
  })
  .join('');

async function script(variant) {
  const bundle = await build({
    entryPoints: [join(ROOT, variant.entry)],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    charset: 'utf8',
    legalComments: 'inline',
    plugins: [esHangulWithoutUnicodeFlag],
  });
  const es5 = transformSync(bundle.outputFiles[0].text, {
    isModule: false,
    minify: false,
    sourceMaps: false,
    jsc: { target: 'es5', parser: { syntax: 'ecmascript' }, externalHelpers: false, output: { charset: 'utf8' } },
  }).code;
  return (
    `// ${pkg.name} ${pkg.version} (${variant.name}), ${pkg.license}. ` +
    'Built from the sources by tools/build.mjs: change those, not this file.\n' +
    notices +
    es5
  );
}

rmSync(join(ROOT, 'dist'), { recursive: true, force: true });

for (const variant of VARIANTS) {
  const main = await script(variant);
  const bytes = Buffer.byteLength(main);
  if (bytes > MAX_SCRIPT_BYTES) throw new Error(`${variant.name}: ${bytes} bytes, over Myspoti's ${MAX_SCRIPT_BYTES}`);
  const manifest =
    JSON.stringify(
      { ...JSON.parse(readFileSync(join(ROOT, variant.manifest), 'utf8')), version: pkg.version, versionCode },
      null,
      2,
    ) + '\n';

  const files = { 'manifest.json': Buffer.from(manifest), 'main.js': Buffer.from(main), LICENSE: license };
  const out = join(ROOT, 'dist', variant.name);
  mkdirSync(out, { recursive: true });
  for (const [name, content] of Object.entries(files)) writeFileSync(join(out, name), content);
  const entries = Object.fromEntries(
    Object.entries(files).map(([name, content]) => [name, [content, { mtime: PACKAGE_DATE }]]),
  );
  writeFileSync(join(ROOT, 'dist', variant.zip), zipSync(entries, { level: 9 }));
  if (variant.store) writeFileSync(join(ROOT, 'manifest.json'), manifest);
  console.log(`${variant.name}: dist/${variant.zip}, script ${(bytes / 1024).toFixed(1)} KB`);
}
