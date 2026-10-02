import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { manifest } from './fixtures.mjs';
import { validateManifest, validateTraceability, pathMatches, scopeFingerprint } from '../../scripts/directions/contracts.mjs';
import { createArtifactReader, createEvidenceBoundary } from '../../scripts/directions/evidence.mjs';
import { evaluateTransition } from '../../scripts/directions/lifecycle.mjs';
import * as scope from '../../scripts/directions/scope.mjs';
const { checkScope } = scope;
const executeClosure = scope.executeClosure ?? (async () => ({ ok: false, issues: [{ code: 'NOT_IMPLEMENTED' }] }));

const H = 'a'.repeat(64);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const issue = (r, code) => r.issues.some(x => x.code === code);
const git = (root, ...args) => {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null' } });
  assert.equal(r.status, 0, `${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};

test('I21-01 two stages own unique independent changes and semantic map is frozen', () => {
  const m = manifest(); m.id = 'other-direction'; m.owner.branch = 'codex/other-direction';
  m.scope.planningAllowed = ['openspec/changes/alpha-change/**', 'openspec/changes/beta-change/**', 'docs/engineering/BRANCH-STATUS.md'];
  m.scope.allowed = ['openspec/changes/alpha-change/**', 'openspec/changes/beta-change/**', 'docs/engineering/**'];
  m.scope.closure.archiveOwner = 'alpha-change'; m.scope.closure.archiveDestination = 'openspec/changes/archive/<actual-archive-date>-alpha-change/**';
  m.scope.closure.specDestinations = ['openspec/specs/alpha-capability/spec.md'];
  m.stages = [{ ...m.stages[0], id: 'A01', change: 'alpha-change' }, { ...m.stages[0], id: 'B02', change: 'beta-change' }];
  assert.equal(validateManifest(m).ok, true);
  const before = scopeFingerprint(m); m.stages[1].change = 'gamma-change'; m.scope.planningAllowed.push('openspec/changes/gamma-change/**');
  assert.notEqual(scopeFingerprint(m), before);
  m.scope.planningAllowed.pop();
  assert.ok(issue(validateManifest(m), 'STAGE_OWNER'));
  m.stages[1].change = 'beta-change'; m.stages[0].dependencies = ['B02']; m.stages[1].dependencies = ['A01'];
  assert.ok(issue(validateManifest(m), 'DEPENDENCIES'));
});

test('I21-06 malformed lists, generic requirement IDs, and Windows-invalid paths fail closed', () => {
  for (const change of [m => { m.scope.allowed = {}; }, m => { m.scope.frozen = {}; }, m => { m.scope.frozen = [null]; }, m => { m.stages = [null]; }, m => { m.stages[0].dependencies = [null]; }]) {
    const m = manifest(); change(m); assert.equal(validateManifest(m).ok, false);
  }
  const trace = { requirements: [{ id: 'DRAW-CORE-12', scenarioIds: ['S1'] }], scenarios: [{ id: 'S1', requirementId: 'DRAW-CORE-12', taskIds: ['T1'], control: 'positive', assertionIds: ['A1'] }], tasks: [{ id: 'T1', scenarioIds: ['S1'] }], assertions: [{ id: 'A1', runId: 'R1' }], runs: [{ id: 'R1', sourceSha256: H, configSha256: H, environment: 'fixture', status: 'PASS' }] };
  assert.equal(validateTraceability(trace).ok, true);
  for (const bad of ['docs/a<bad>.md', 'docs/a|b.md', 'docs/a"b.md', 'docs/a\u007fb.md']) { const m = manifest(); m.statusPath = bad; assert.ok(issue(validateManifest(m), 'STATUS_PATH')); }
});

test('I21-07 case folding closes frozen Apps/packages and malformed scope gaps', () => {
  assert.equal(pathMatches('apps/**', 'Apps/site/page.tsx'), true);
  const m = manifest(); m.scope.allowed.push('Apps/**');
  assert.ok(issue(validateManifest(m), 'FROZEN_OVERLAP'));
  const bad = manifest(); bad.scope.allowed = null;
  assert.equal(checkScope(bad, 'IMPLEMENTATION', ['docs/engineering/x.md']).ok, false);
  const closureCase = manifest(); closureCase.scope.allowed.push('OpenSpec/**');
  assert.ok(issue(checkScope(closureCase, 'IMPLEMENTATION', ['OpenSpec/Specs/other/spec.md']), 'CLOSURE_INACTIVE'));
  const declaredProduct = manifest(); declaredProduct.id = 'other-direction'; declaredProduct.owner.branch = 'codex/other-direction';
  declaredProduct.scope.closure.specDestinations = ['apps/site/spec.md'];
  assert.ok(issue(validateManifest(declaredProduct), 'CLOSURE_DESTINATION'));
});

test('I21-05 repeated deterministic failures require classified RCA and trusted proof', async () => {
  const m = manifest(); m.stages[0].phase = 'BDD_TDD';
  m.stages[0].failedFixes = [{ defectId: 'D1', deterministic: true, status: 'FAIL' }, { defectId: 'D1', deterministic: true, status: 'FAIL' }];
  const snap = { planSha256: H, sourceSha256: H, configSha256: H, scopeSha256: scopeFingerprint(m) };
  const mk = kind => ({ kind, status: 'PASS', complete: true, scope: 'full', artifact: { path: `evidence/${kind}.json`, sha256: H }, bindings: { planSha256: H, scopeSha256: snap.scopeSha256 } });
  const refs = { policyDecision: mk('policyDecision'), checkpoint: mk('checkpoint'), pre: mk('pre'), red: mk('red') };
  const trusted = new WeakSet(Object.values(refs));
  const boundary = createEvidenceBoundary({ verify: async (_kind, ref) => trusted.has(ref) });
  const args = { manifest: m, stageId: 'W01', target: 'IMPLEMENTATION', evidence: refs, boundary, snapshot: snap };
  assert.ok(issue(await evaluateTransition(args), 'RCA_REQUIRED'));
  m.stages[0].rca = { defectId: 'D1', classification: 'ALGORITHM', root: 'wrong transition decision', layer: 'domain', artifact: { path: 'evidence/rca.json', sha256: H } };
  assert.ok(issue(await evaluateTransition(args), 'RCA_PROOF'));
  refs.rca = { ...mk('rca'), bindings: { ...mk('rca').bindings, defectId: 'D1', classification: 'ALGORITHM', root: m.stages[0].rca.root, layer: m.stages[0].rca.layer } };
  assert.ok(issue(await evaluateTransition(args), 'RCA_PROOF'));
  trusted.add(refs.rca);
  assert.equal((await evaluateTransition(args)).ok, true);
  m.stages[0].rca.root = 'a different incorrect transition decision';
  assert.ok(issue(await evaluateTransition(args), 'RCA_PROOF'));
});

test('I21-02/08 controlled temporary Git closure syncs only delta requirements and proves CLOSED', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-closure-'));
  try {
    git(root, 'init', '-q'); git(root, 'checkout', '-qb', 'codex/frade-standard-workflow');
    const source = 'openspec/changes/frade-standard-workflow';
    const cap = ['engineering-direction-lifecycle', 'engineering-role-dispatch', 'engineering-progress-publication'];
    const write = async (p, data) => { await mkdir(dirname(join(root, p)), { recursive: true }); await writeFile(join(root, p), data); };
    for (const c of cap) { await write(`${source}/specs/${c}/spec.md`, `## ADDED Requirements\n\n### Requirement: ${c.toUpperCase()}-01 New\nNew behavior.\n`); if (c !== 'engineering-progress-publication') await write(`openspec/specs/${c}/spec.md`, `# Existing\n\n## Requirements\n\n### Requirement: OLD-01 Keep\nKeep behavior.\n`); }
    await write(`${source}/design.md`, '[plan](tasks.md)\n[foreign](../../../foreign.txt)\n'); await write(`${source}/tasks.md`, 'owned tasks\n');
    await write(`${source}/role.json`, JSON.stringify({ source: `${source}/tasks.md` }));
    await write(`${source}/role-authority.json`, JSON.stringify({ roleAuthority: { path: 'design.md', sha256: sha(await readFile(join(root, `${source}/design.md`))) } }));
    await write(`${source}/evidence/receipt.json`, '{"raw":"immutable"}\n');
    await write('foreign.txt', 'unchanged');
    await write('apps/site/frozen.ts', 'frozen app'); await write('packages/core/frozen.ts', 'frozen package');
    git(root, 'add', '--', 'openspec', 'foreign.txt', 'apps/site/frozen.ts', 'packages/core/frozen.ts'); git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'baseline');
    const baseline = git(root, 'rev-parse', 'HEAD');
    const m = manifest(); m.originalBaseline = baseline; m.stages[0].phase = 'POST_REVIEW'; m.scope.closure.enabled = true;
    const snap = { planSha256: H, sourceSha256: H, configSha256: H, scopeSha256: scopeFingerprint(m) };
    const proof = kind => ({ kind, status: 'PASS', complete: true, scope: 'full', artifact: { path: `evidence/${kind}.json`, sha256: H }, bindings: { planSha256: H, scopeSha256: snap.scopeSha256, sourceSha256: H, configSha256: H } });
    const evidence = Object.fromEntries(['policyDecision', 'checkpoint', 'pre', 'red', 'green', 'checks', 'verify', 'post'].map(k => [k, proof(k)]));
    const trusted = new WeakSet(Object.values(evidence));
    const boundary = createEvidenceBoundary({ verify: async (_kind, ref) => trusted.has(ref) });
    const archive = 'openspec/changes/archive/2026-10-02-frade-standard-workflow';
    const operations = await Promise.all(cap.map(async c => { const from = `${source}/specs/${c}/spec.md`; return { type: 'sync', from, to: `openspec/specs/${c}/spec.md`, sourceSha256: sha(await readFile(join(root, from))) }; }));
    operations.push({ type: 'archive', from: source, to: archive });
    const files = [ ...cap.map(c => `${source}/specs/${c}/spec.md`), `${source}/design.md`, `${source}/tasks.md`, `${source}/role.json`, `${source}/role-authority.json`, `${source}/evidence/receipt.json` ];
    const references = await Promise.all(files.map(async origin => ({ origin, relocated: `${archive}${origin.slice(source.length)}`, sha256: sha(await readFile(join(root, origin))), kind: origin.endsWith('receipt.json') ? 'immutable-origin' : 'owned' })));
    const args = { root, manifest: m, stageId: 'W01', date: '2026-10-02', operations, references, evidence, boundary, snapshot: snap, reader: createArtifactReader(root), expectedHead: baseline };
    const statusBefore = git(root, 'status', '--porcelain');
    assert.ok(issue(await executeClosure({ ...args, evidence: { ...evidence, post: null } }), 'POST_PROOF'));
    assert.equal(git(root, 'status', '--porcelain'), statusBefore);
    assert.ok(issue(await executeClosure({ ...args, operations: [...operations.slice(0, 3), { ...operations[3], to: 'openspec/changes/archive/2026-10-02-foreign' }] }), 'ARCHIVE_DESTINATION'));
    assert.equal(git(root, 'status', '--porcelain'), statusBefore);
    assert.ok(issue(await executeClosure({ ...args, date: '2026-2-2' }), 'ARCHIVE_DATE'));
    assert.equal(git(root, 'status', '--porcelain'), statusBefore);
    const productDestination = structuredClone(m); productDestination.scope.closure.specDestinations = ['apps/site/spec.md'];
    assert.ok(issue(await executeClosure({ ...args, manifest: productDestination }), 'CLOSURE_DESTINATION'));
    assert.equal(git(root, 'status', '--porcelain'), statusBefore);
    assert.ok(issue(await executeClosure({ ...args, expectedHead: '0'.repeat(40) }), 'GIT_STALE'));
    assert.equal(git(root, 'status', '--porcelain'), statusBefore);
    let readerCalls = 0;
    await executeClosure({ ...args, expectedHead: '0'.repeat(40), reader: { read: async () => { readerCalls++; throw new Error('untrusted reader invoked'); } } });
    assert.equal(readerCalls, 0);
    assert.ok(issue(await executeClosure({ ...args, operations: [{ ...operations[0], sourceSha256: H }, ...operations.slice(1)] }), 'SOURCE_HASH'));
    assert.equal(git(root, 'status', '--porcelain'), statusBefore);
    const broken = references.map(x => ({ ...x })); broken.find(x => x.origin.endsWith('design.md')).sha256 = H;
    assert.ok(issue(await executeClosure({ ...args, references: broken }), 'REFERENCE_HASH'));
    assert.equal(git(root, 'status', '--porcelain'), statusBefore);
    await write(`${source}/design.md`, '[plan](missing.md)\n');
    await write(`${source}/role-authority.json`, JSON.stringify({ roleAuthority: { path: 'design.md', sha256: sha(await readFile(join(root, `${source}/design.md`))) } }));
    git(root, 'add', '--', `${source}/design.md`, `${source}/role-authority.json`); git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'broken reference');
    const brokenLinkRefs = references.map(x => ({ ...x })); brokenLinkRefs.find(x => x.origin.endsWith('design.md')).sha256 = sha(await readFile(join(root, `${source}/design.md`))); brokenLinkRefs.find(x => x.origin.endsWith('role-authority.json')).sha256 = sha(await readFile(join(root, `${source}/role-authority.json`)));
    assert.ok(issue(await executeClosure({ ...args, references: brokenLinkRefs, expectedHead: git(root, 'rev-parse', 'HEAD') }), 'REFERENCE_BROKEN'));
    await write(`${source}/design.md`, '[plan](tasks.md)\n[foreign](../../../foreign.txt)\n');
    await write(`${source}/role-authority.json`, JSON.stringify({ roleAuthority: { path: 'design.md', sha256: sha(await readFile(join(root, `${source}/design.md`))) } }));
    git(root, 'add', '--', `${source}/design.md`, `${source}/role-authority.json`); git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'repair reference');
    args.expectedHead = git(root, 'rev-parse', 'HEAD');
    const closed = await executeClosure(args);
    assert.equal(closed.ok, true, JSON.stringify(closed.issues));
    assert.match(await readFile(join(root, 'openspec/specs/engineering-role-dispatch/spec.md'), 'utf8'), /OLD-01 Keep/);
    assert.match(await readFile(join(root, 'openspec/specs/engineering-role-dispatch/spec.md'), 'utf8'), /ENGINEERING-ROLE-DISPATCH-01 New/);
    assert.match(await readFile(join(root, 'openspec/specs/engineering-progress-publication/spec.md'), 'utf8'), /ENGINEERING-PROGRESS-PUBLICATION-01 New/);
    assert.match(await readFile(join(root, 'openspec/specs/engineering-progress-publication/spec.md'), 'utf8'), /## Requirements/);
    assert.equal(await readFile(join(root, `${archive}/evidence/receipt.json`), 'utf8'), '{"raw":"immutable"}\n');
    assert.equal(closed.receipt.origins.find(x => x.origin.endsWith('receipt.json')).sha256, references.find(x => x.origin.endsWith('receipt.json')).sha256);
    assert.equal(await readFile(join(root, `${archive}/design.md`), 'utf8'), '[plan](tasks.md)\n[foreign](../../../../foreign.txt)\n');
    assert.deepEqual(JSON.parse(await readFile(join(root, `${archive}/role.json`), 'utf8')), { source: `${archive}/tasks.md` });
    assert.deepEqual(JSON.parse(await readFile(join(root, `${archive}/role-authority.json`), 'utf8')), { roleAuthority: { path: 'design.md', sha256: sha(await readFile(join(root, `${archive}/design.md`))) } });
    assert.equal(await readFile(join(root, 'foreign.txt'), 'utf8'), 'unchanged');
    assert.equal(await readFile(join(root, 'apps/site/frozen.ts'), 'utf8'), 'frozen app');
    assert.equal(await readFile(join(root, 'packages/core/frozen.ts'), 'utf8'), 'frozen package');
    m.stages[0].phase = 'ARCHIVE';
    assert.ok(issue(await evaluateTransition({ manifest: m, stageId: 'W01', target: 'CLOSED', evidence, boundary, snapshot: snap }), 'ARCHIVE_PROOF'));
    const archiveProof = { ...proof('archive'), bindings: { ...proof('archive').bindings, archiveHead: args.expectedHead, archive: closed.receipt.archive, operationSha256: closed.receipt.operationSha256, checkpointSha: 'c'.repeat(40), publishedSha: 'c'.repeat(40), publicationRef: 'refs/heads/codex/frade-standard-workflow' } };
    assert.ok(issue(await evaluateTransition({ manifest: m, stageId: 'W01', target: 'CLOSED', evidence: { ...evidence, closureReceipt: closed.receipt, archive: archiveProof }, boundary, snapshot: snap }), 'ARCHIVE_PROOF'));
    trusted.add(archiveProof);
    assert.ok(issue(await evaluateTransition({ manifest: m, stageId: 'W01', target: 'CLOSED', evidence: { ...evidence, closureReceipt: closed.receipt, archive: { ...archiveProof, bindings: { ...archiveProof.bindings, publishedSha: 'd'.repeat(40) } } }, boundary, snapshot: snap }), 'ARCHIVE_PUBLICATION'));
    assert.equal((await evaluateTransition({ manifest: m, stageId: 'W01', target: 'CLOSED', evidence: { ...evidence, closureReceipt: closed.receipt, archive: archiveProof }, boundary, snapshot: snap })).ok, true);
  } finally { await rm(root, { recursive: true, force: true }); }
});
