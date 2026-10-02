import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const cwd = process.cwd();
const base = 'deliverables/repair-red/logs/';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashes = Object.fromEntries((await readFile(base + 'final-source-hashes.sha256', 'utf8')).trim().split('\n').map(line => {
  const [, digest, path] = line.match(/^([a-f0-9]{64})  (.+)$/);
  return [path, digest];
}));
const sourcePaths = ['scripts/directions/contracts.mjs', 'scripts/directions/evidence.mjs', 'scripts/directions/lifecycle.mjs', 'scripts/directions/scope.mjs', 'tests/directions/contracts.test.mjs', 'tests/directions/lifecycle.test.mjs', 'tests/directions/repair.test.mjs'];
const bundle = paths => hash(paths.sort().map(path => `${path}:${hashes[path]}`).join('\n'));
const finalSource = bundle([...sourcePaths]);
const preFix = bundle(Object.keys(hashes).filter(path => path.startsWith('deliverables/repair-red/pre-fix-production/') || path.startsWith('deliverables/repair-red/tests/')));
const skeleton = bundle(Object.keys(hashes).filter(path => path.startsWith('deliverables/repair-red/baseline-skeleton/scripts/') || path.startsWith('deliverables/repair-red/tests/')));
const environment = { node: process.version, platform: process.platform, arch: process.arch, git: spawnSync('git', ['--version'], { encoding: 'utf8' }).stdout.trim(), cwd, testTmpdir: resolve('deliverables/repair-red/tmp'), actualBackend: 'NOT_CONFIRMED', actualEffort: 'NOT_CONFIRMED' };
const runs = [];
for (const name of ['contracts', 'lifecycle', 'repair']) runs.push({ name: `final-green-direct-${name}`, command: `TMPDIR="$PWD/deliverables/repair-red/tmp" node tests/directions/${name}.test.mjs`, exit: Number((await readFile(base + `final-green-direct-${name}.exit`, 'utf8')).trim()), log: base + `final-green-direct-${name}.tap`, sourceBundleSha256: finalSource, environment });
runs.push({ name: 'final-green-full', command: 'TMPDIR="$PWD/deliverables/repair-red/tmp" node --test', exit: Number((await readFile(base + 'final-green-full.exit', 'utf8')).trim()), log: base + 'final-green-full.tap', sourceBundleSha256: finalSource, environment });
for (const [variant, bundleHash] of [['pre-fix-production', preFix], ['baseline-skeleton', skeleton]]) runs.push({ name: `final-${variant}-red`, command: (await readFile(base + `final-${variant}-red.command`, 'utf8')).trim(), replaySource: `deliverables/repair-red/${variant}/scripts/directions`, replayTests: 'deliverables/repair-red/tests/*.snapshot (suffix removed in owned temporary replay)', exit: Number((await readFile(base + `final-${variant}-red.exit`, 'utf8')).trim()), log: base + `final-${variant}-red.tap`, sourceBundleSha256: bundleHash, environment, chronologicalOriginalRed: false });
for (const line of (await readFile(base + 'final-syntax-check-exits.txt', 'utf8')).trim().split('\n')) {
  const [, exit, file] = line.match(/^(\d+) (.+)$/);
  runs.push({ name: `syntax-${file}`, command: `node --check ${file}`, exit: Number(exit), log: base + 'final-syntax-check.log', sourceSha256: hashes[file], environment });
}
await writeFile('deliverables/repair-red/RUNS.json', JSON.stringify({ schemaVersion: 1, generatedAtUtc: new Date().toISOString(), environment, configSha256: hashes['package.json'], finalSourceBundleSha256: finalSource, preFixBundleSha256: preFix, skeletonBundleSha256: skeleton, sourceHashes: hashes, runs }, null, 2) + '\n');
