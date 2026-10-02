import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, symlink, rm, mkdir, copyFile, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadCore } from './load-core.mjs';
import { manifest } from './fixtures.mjs';

const { createArtifactReader, createEvidenceBoundary, verifyArtifactHash } = await loadCore('evidence');
const { evaluateTransition, legacyClosureState } = await loadCore('lifecycle');
const { checkScope, planClosure } = await loadCore('scope');
const { scopeFingerprint } = await loadCore('contracts');

const H = 'a'.repeat(64);
const S = 'b'.repeat(64);
const P = 'c'.repeat(64);
const SCOPE = scopeFingerprint(manifest());
const issue = (result, code) => result.issues.some(entry => entry.code === code);
const snapshot = { planSha256: P, scopeSha256: SCOPE, sourceSha256: S, configSha256: H };
const proof = (kind, bindings = {}) => ({ kind, status: 'PASS', bindings, artifact: { path: `evidence/${kind}.json`, sha256: H }, complete: true, scope: 'full' });
const evidence = {
  policyDecision: proof('policyDecision', { planSha256: P, scopeSha256: SCOPE }),
  checkpoint: proof('checkpoint', { planSha256: P, scopeSha256: SCOPE }),
  pre: proof('pre', { planSha256: P, scopeSha256: SCOPE }),
  red: proof('red', { planSha256: P, scopeSha256: SCOPE }),
  green: proof('green', { sourceSha256: S, configSha256: H }),
  checks: proof('checks', { sourceSha256: S, configSha256: H }),
  verify: proof('verify', { sourceSha256: S, configSha256: H }),
  post: proof('post', { sourceSha256: S, configSha256: H, planSha256: P, scopeSha256: SCOPE })
};
const trustedRefs = new WeakSet(Object.values(evidence));
const boundary = createEvidenceBoundary({ verify: async (kind, ref, expected) => trustedRefs.has(ref) && ref?.kind === kind && ref.status === 'PASS' && Object.entries(expected).every(([key, value]) => ref.bindings?.[key] === value) });

test('FWE-005-S01 PRE plus checkpoint admits normal implementation source changes', async () => {
  const m = manifest(); m.stages[0].phase = 'BDD_TDD';
  const result = await evaluateTransition({ manifest: m, stageId: 'W01', target: 'IMPLEMENTATION', evidence, boundary, snapshot });
  assert.equal(result.ok, true);
  const newerSource = { ...snapshot, sourceSha256: 'd'.repeat(64) };
  assert.equal((await evaluateTransition({ manifest: m, stageId: 'W01', target: 'IMPLEMENTATION', evidence, boundary, snapshot: newerSource })).ok, true);
});

test('FWE-005-S01 forged JSON PASS/boolean and absent proof cannot admit implementation', async () => {
  const m = manifest();
  assert.ok(issue(await evaluateTransition({ manifest: m, stageId: 'W01', target: 'IMPLEMENTATION', evidence: { ...evidence, pre: { status: 'PASS', candidateUnchanged: true } }, boundary, snapshot }), 'PRE_PROOF'));
  assert.ok(issue(await evaluateTransition({ manifest: m, stageId: 'W01', target: 'IMPLEMENTATION', evidence: { ...evidence, pre: structuredClone(evidence.pre) }, boundary, snapshot }), 'PRE_PROOF'));
  assert.ok(issue(await evaluateTransition({ manifest: m, stageId: 'W01', target: 'IMPLEMENTATION', evidence, boundary: { verify: async () => true }, snapshot }), 'EVIDENCE_BOUNDARY'));
});

test('FWE-005-S02 skipped phase and stale PRE plan/scope are barriers', async () => {
  const m = manifest(); m.stages[0].phase = 'PLANNING';
  assert.ok(issue(await evaluateTransition({ manifest: m, stageId: 'W01', target: 'IMPLEMENTATION', evidence, boundary, snapshot }), 'PHASE_ORDER'));
  m.stages[0].phase = 'BDD_TDD';
  const drift = { ...snapshot, planSha256: 'd'.repeat(64) };
  assert.ok(issue(await evaluateTransition({ manifest: m, stageId: 'W01', target: 'IMPLEMENTATION', evidence, boundary, snapshot: drift }), 'PRE_PROOF'));
  const changedScope = manifest(); changedScope.scope.allowed.push('docs/engineering/new/**');
  assert.ok(issue(await evaluateTransition({ manifest: changedScope, stageId: 'W01', target: 'IMPLEMENTATION', evidence, boundary, snapshot }), 'SCOPE_DRIFT'));
});

test('FWE-005-S02 POST requires current GREEN and Verify; POST source binding is current', async () => {
  const m = manifest(); m.stages[0].phase = 'VERIFICATION';
  assert.equal((await evaluateTransition({ manifest: m, stageId: 'W01', target: 'POST_REVIEW', evidence, boundary, snapshot })).ok, true);
  const stale = { ...snapshot, sourceSha256: 'e'.repeat(64) };
  assert.ok(issue(await evaluateTransition({ manifest: m, stageId: 'W01', target: 'POST_REVIEW', evidence, boundary, snapshot: stale }), 'GREEN_PROOF'));
  assert.ok(issue(await evaluateTransition({ manifest: m, stageId: 'W01', target: 'POST_REVIEW', evidence: { ...evidence, verify: null }, boundary, snapshot }), 'VERIFY_PROOF'));
});

test('FWE-005-S03 diagnostic PASS does not substitute for full review', async () => {
  const m = manifest(); m.stages[0].phase = 'POST_REVIEW';
  const diagnostic = { ...evidence, post: { ...evidence.post, scope: 'focused' } };
  assert.ok(issue(await evaluateTransition({ manifest: m, stageId: 'W01', target: 'ARCHIVE', evidence: diagnostic, boundary, snapshot }), 'POST_PROOF'));
});

test('FWE-008-S03 completed legacy tasks without POST/archive are pending closure', () => {
  assert.equal(legacyClosureState({ tasksComplete: true, verify: 'PASS', post: 'NOT_RUN', archive: 'NOT_RUN' }), 'IMPLEMENTED_PENDING_CLOSURE');
  assert.equal(legacyClosureState({ tasksComplete: true, verify: 'PASS', post: 'PASS', archive: 'PASS' }), 'IMPLEMENTED_PENDING_CLOSURE');
});

test('FWE-001-S04 scope rejects frozen writes, traversal and planning/closure confusion', () => {
  const m = manifest();
  assert.equal(checkScope(m, 'IMPLEMENTATION', ['scripts/directions/contracts.mjs']).ok, true);
  assert.ok(issue(checkScope(m, 'IMPLEMENTATION', ['packages/core/x.ts']), 'SCOPE_DENIED'));
  assert.ok(issue(checkScope(m, 'PLANNING', ['scripts/directions/x.mjs']), 'SCOPE_DENIED'));
  assert.ok(issue(checkScope(m, 'IMPLEMENTATION', ['scripts/directions/../packages/x.ts']), 'UNSAFE_PATH'));
  assert.ok(issue(checkScope(m, 'IMPLEMENTATION', ['openspec/specs/engineering-direction-lifecycle/spec.md']), 'CLOSURE_INACTIVE'));
  m.scope.mode = 'PLANNING';
  assert.equal(checkScope(m, 'PLANNING', ['openspec/changes/frade-standard-workflow/design.md']).ok, true);
  assert.ok(issue(checkScope(m, 'IMPLEMENTATION', ['scripts/directions/contracts.mjs']), 'SCOPE_MODE'));
});

const operations = [
  { type: 'sync', from: 'openspec/changes/frade-standard-workflow/specs/engineering-direction-lifecycle/spec.md', to: 'openspec/specs/engineering-direction-lifecycle/spec.md' },
  { type: 'sync', from: 'openspec/changes/frade-standard-workflow/specs/engineering-role-dispatch/spec.md', to: 'openspec/specs/engineering-role-dispatch/spec.md' },
  { type: 'sync', from: 'openspec/changes/frade-standard-workflow/specs/engineering-progress-publication/spec.md', to: 'openspec/specs/engineering-progress-publication/spec.md' },
  { type: 'archive', from: 'openspec/changes/frade-standard-workflow', to: 'openspec/changes/archive/2026-10-02-frade-standard-workflow' }
];
const references = [{ origin: 'openspec/changes/frade-standard-workflow/design.md', relocated: 'openspec/changes/archive/2026-10-02-frade-standard-workflow/design.md', sha256: H, kind: 'owned' }, { origin: 'openspec/changes/frade-standard-workflow/evidence/reviews/r1/receipt.json', relocated: 'openspec/changes/archive/2026-10-02-frade-standard-workflow/evidence/reviews/r1/receipt.json', sha256: H, kind: 'immutable-origin' }];

test('FWE-001-S03 plans exact owner sync/archive with reference-origin relocation after verified barriers', async () => {
  const m = manifest(); m.stages[0].phase = 'POST_REVIEW';
  const result = await planClosure({ manifest: m, stageId: 'W01', date: '2026-10-02', operations, references, evidence, boundary, snapshot });
  assert.equal(result.ok, true);
  assert.equal(result.operations.length, 4);
  assert.equal(result.originMap.length, 2);
});

test('FWE-001-S04 closure rejects early, foreign, unsafe, stale and broken reference requests', async () => {
  const m = manifest(); m.stages[0].phase = 'POST_REVIEW';
  const args = { manifest: m, stageId: 'W01', date: '2026-10-02', operations, references, evidence, boundary, snapshot };
  assert.ok(issue(await planClosure({ ...args, evidence: { ...evidence, post: null } }), 'POST_PROOF'));
  assert.ok(issue(await planClosure({ ...args, operations: [...operations, { type: 'sync', from: operations[0].from, to: 'openspec/specs/foreign/spec.md' }] }), 'CLOSURE_DESTINATION'));
  assert.ok(issue(await planClosure({ ...args, date: '2026-2-2' }), 'ARCHIVE_DATE'));
  assert.ok(issue(await planClosure({ ...args, operations: [...operations.slice(0, 3), { ...operations[3], to: 'openspec/changes/archive/2026-10-02-foreign' }] }), 'ARCHIVE_DESTINATION'));
  assert.ok(issue(await planClosure({ ...args, references: [{ ...references[0], relocated: 'openspec/changes/archive/2026-10-02-frade-standard-workflow/missing.md' }] }), 'REFERENCE_RELOCATION'));
  assert.ok(issue(await planClosure({ ...args, snapshot: { ...snapshot, sourceSha256: 'e'.repeat(64) } }), 'POST_PROOF'));
  const malformed = await planClosure({ ...args, operations: [null], references: [null], reader: createArtifactReader(process.cwd()) });
  assert.equal(malformed.ok, false);
  assert.ok(issue(malformed, 'CLOSURE_OPERATIONS'));
});

test('FWE-001-S04 artifact reader hashes bytes and rejects symlink escape', async () => {
  const root = await mkdtemp(join(process.cwd(), 'evidence', 'reader-'));
  try {
    await writeFile(join(root, 'safe.txt'), 'actual bytes');
    await symlink('/etc/passwd', join(root, 'escape'));
    const reader = createArtifactReader(root);
    const read = await reader.read('safe.txt');
    assert.equal(read.sha256, createHash('sha256').update('actual bytes').digest('hex'));
    assert.equal(await verifyArtifactHash(reader, { path: 'safe.txt', sha256: read.sha256 }), true);
    assert.equal(await verifyArtifactHash(reader, { path: 'safe.txt', sha256: H }), false);
    await assert.rejects(() => reader.read('escape'), /UNSAFE_ARTIFACT/);
    await assert.rejects(() => reader.read('../outside'), /UNSAFE_ARTIFACT/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('FWE-001-S03 disposable Git owner sync/archive preserves foreign file and raw receipt origin', async () => {
  const root = await mkdtemp(join(process.cwd(), 'evidence', 'closure-git-'));
  const git = (...args) => {
    const run = spawnSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' } });
    assert.equal(run.status, 0, `${args.join(' ')}: ${run.stderr}`);
    return run.stdout;
  };
  try {
    git('init', '-q');
    const source = 'openspec/changes/frade-standard-workflow';
    const design = `${source}/design.md`;
    const receipt = `${source}/evidence/reviews/r1/receipt.json`;
    for (const op of operations.filter(x => x.type === 'sync')) {
      await mkdir(join(root, op.from, '..'), { recursive: true });
      await writeFile(join(root, op.from), `delta:${op.to}`);
    }
    await mkdir(join(root, source, 'evidence/reviews/r1'), { recursive: true });
    await writeFile(join(root, design), 'owned plan source');
    await writeFile(join(root, receipt), '{"raw":"immutable"}');
    await writeFile(join(root, 'foreign.txt'), 'foreign untouched');
    git('add', '--', 'openspec/changes/frade-standard-workflow', 'foreign.txt');
    git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture');
    const digest = bytes => createHash('sha256').update(bytes).digest('hex');
    const actualRefs = [
      { ...references[0], sha256: digest(await readFile(join(root, design))) },
      { ...references[1], sha256: digest(await readFile(join(root, receipt))) }
    ];
    const boundOps = await Promise.all(operations.map(async op => op.type === 'sync' ? { ...op, sourceSha256: digest(await readFile(join(root, op.from))) } : op));
    const m = manifest(); m.stages[0].phase = 'POST_REVIEW';
    const args = { manifest: m, stageId: 'W01', date: '2026-10-02', operations: boundOps, references: actualRefs, evidence, boundary, snapshot, reader: createArtifactReader(root) };
    assert.equal((await planClosure(args)).ok, true);
    await writeFile(join(root, receipt), '{"raw":"tampered"}');
    assert.ok(issue(await planClosure(args), 'REFERENCE_HASH'));
    await writeFile(join(root, receipt), '{"raw":"immutable"}');
    for (const op of operations.filter(x => x.type === 'sync')) {
      await mkdir(join(root, op.to, '..'), { recursive: true });
      await copyFile(join(root, op.from), join(root, op.to));
    }
    await mkdir(join(root, 'openspec/changes/archive'), { recursive: true });
    git('mv', source, operations.at(-1).to);
    assert.equal((await stat(join(root, operations.at(-1).to, 'design.md'))).isFile(), true);
    assert.equal(digest(await readFile(join(root, actualRefs[1].relocated))), actualRefs[1].sha256);
    assert.equal(await readFile(join(root, 'foreign.txt'), 'utf8'), 'foreign untouched');
    assert.equal(git('status', '--short').includes('foreign.txt'), false);
  } finally { await rm(root, { recursive: true, force: true }); }
});
