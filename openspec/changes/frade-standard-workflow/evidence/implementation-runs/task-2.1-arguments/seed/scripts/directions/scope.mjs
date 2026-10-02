import { pathMatches, safeRepoPath, validateManifest } from './contracts.mjs';
import { evaluateTransition } from './lifecycle.mjs';
import { createArtifactReader } from './evidence.mjs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstat, readFile, readdir, realpath, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname, sep, posix, basename } from 'node:path';
import { tmpdir } from 'node:os';

const issue = (issues, code, path, detail) => issues.push({ code, path, detail });
const result = issues => ({ ok: issues.length === 0, issues });
const activeRoot = id => `openspec/changes/${id}`;
const archiveRoot = (date, id) => `openspec/changes/archive/${date}-${id}`;
const closurePath = path => path.toLowerCase().startsWith('openspec/specs/') || path.toLowerCase().startsWith('openspec/changes/archive/');
const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().startsWith(date);

export function checkScope(manifest, phase, paths = []) {
  const issues = [...validateManifest(manifest).issues];
  if (!['PLANNING', 'PRE_REVIEW', 'IMPLEMENTATION'].includes(phase)) issue(issues, 'SCOPE_PHASE', 'phase', 'Use a verified closure plan for closure');
  if (!Array.isArray(paths)) issue(issues, 'SCOPE_PATHS', 'paths', 'Path array required');
  if (!manifest?.scope || !Array.isArray(paths)) return result(issues);
  if (phase === 'IMPLEMENTATION' && manifest.scope.mode !== 'IMPLEMENTATION') issue(issues, 'SCOPE_MODE', 'scope.mode', 'Implementation scope is inactive');
  if (phase !== 'IMPLEMENTATION' && !['PLANNING', 'PRE_REVIEW'].includes(manifest.scope.mode)) issue(issues, 'SCOPE_MODE', 'scope.mode', 'Planning scope is inactive');
  const allowed = phase === 'IMPLEMENTATION' ? manifest.scope.allowed : manifest.scope.planningAllowed;
  const frozen = Array.isArray(manifest.scope.frozen) ? manifest.scope.frozen : [];
  const allowedList = Array.isArray(allowed) ? allowed : [];
  for (const [i, path] of paths.entries()) {
    if (!safeRepoPath(path)) { issue(issues, 'UNSAFE_PATH', `paths[${i}]`, 'Unsafe relative path'); continue; }
    if (closurePath(path)) { issue(issues, 'CLOSURE_INACTIVE', `paths[${i}]`, 'Closure requires verified plan'); continue; }
    if (frozen.some(p => pathMatches(p, path)) || !allowedList.some(p => pathMatches(p, path))) issue(issues, 'SCOPE_DENIED', `paths[${i}]`, 'Path outside active scope');
  }
  return result(issues);
}

// Returns an immutable proposal. A later closure executor must recheck hashes, references,
// actual Git ownership and the absence of writes before applying it.
export async function planClosure(options = {}) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) return { ok: false, issues: [{ code: 'CLOSURE_SHAPE', path: '$', detail: 'Options object required' }], operations: [], originMap: [] };
  const { manifest, stageId, date, operations, references, evidence, boundary, snapshot, reader } = options;
  const issues = [...validateManifest(manifest).issues];
  if (!validDate(date)) issue(issues, 'ARCHIVE_DATE', 'date', 'Canonical real UTC date required');
  const id = manifest?.scope?.closure?.archiveOwner;
  if (!Array.isArray(manifest?.stages) || manifest.stages.find(s => s?.id === stageId)?.change !== id) issue(issues, 'STAGE_OWNER', 'stageId', 'Closure stage must own the selected change');
  const source = activeRoot(id);
  const archive = archiveRoot(date, id);
  const expectedSpecs = Array.isArray(manifest?.scope?.closure?.specDestinations) ? manifest.scope.closure.specDestinations : [];
  if (!Array.isArray(operations)) issue(issues, 'CLOSURE_OPERATIONS', 'operations', 'Operations required');
  else {
    const sync = operations.filter(op => op?.type === 'sync');
    const archives = operations.filter(op => op?.type === 'archive');
    if (operations.length !== expectedSpecs.length + 1 || sync.length !== expectedSpecs.length || archives.length !== 1) issue(issues, 'CLOSURE_OPERATIONS', 'operations', 'Exactly declared syncs and one archive required');
    for (const [i, op] of operations.entries()) {
      if (!safeRepoPath(op?.from) || !safeRepoPath(op?.to)) { issue(issues, 'UNSAFE_PATH', `operations[${i}]`, 'Unsafe operation path'); continue; }
      if (op.type === 'sync') {
        if (!expectedSpecs.includes(op.to) || op.from !== `${source}/specs/${op.to.slice('openspec/specs/'.length)}` || (Array.isArray(manifest?.scope?.frozen) && manifest.scope.frozen.some(p => pathMatches(p, op.to)))) issue(issues, 'CLOSURE_DESTINATION', `operations[${i}]`, 'Spec sync must use exact own delta and unfrozen destination');
      } else if (op.type === 'archive') {
        if (op.from !== source || op.to !== archive) issue(issues, 'ARCHIVE_DESTINATION', `operations[${i}]`, 'Archive must move exact owner change');
      } else issue(issues, 'CLOSURE_OPERATIONS', `operations[${i}]`, 'Unknown operation');
    }
    if (new Set(sync.map(op => op.to)).size !== expectedSpecs.length) issue(issues, 'CLOSURE_DESTINATION', 'operations', 'Duplicate or absent spec destination');
  }
  if (!Array.isArray(references) || !references.length) issue(issues, 'REFERENCE_RELOCATION', 'references', 'Owned reference inventory required');
  else for (const [i, ref] of references.entries()) {
    if (!safeRepoPath(ref?.origin) || !safeRepoPath(ref?.relocated) || !ref.origin.startsWith(`${source}/`) || ref.relocated !== `${archive}${ref.origin.slice(source.length)}` || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '') || !['owned', 'immutable-origin'].includes(ref.kind)) issue(issues, 'REFERENCE_RELOCATION', `references[${i}]`, 'Reference mapping must retain exact owner-relative path and hash');
  }
  if (reader !== undefined) {
    if (typeof reader?.read !== 'function') issue(issues, 'ARTIFACT_READER', 'reader', 'Safe artifact reader required');
    else {
      for (const [i, op] of (operations ?? []).entries()) if (op?.type === 'sync') {
        try {
          const artifact = await reader.read(op.from);
          if (artifact.sha256 !== op.sourceSha256 || !/^[a-f0-9]{64}$/.test(op.sourceSha256 ?? '')) issue(issues, 'SOURCE_HASH', `operations[${i}]`, 'Delta spec source bytes differ from bound hash');
        } catch { issue(issues, 'SOURCE_HASH', `operations[${i}]`, 'Delta spec source is unreadable'); }
      }
      for (const [i, ref] of (references ?? []).entries()) {
        try {
          const artifact = await reader.read(ref?.origin);
          if (artifact.sha256 !== ref?.sha256) issue(issues, 'REFERENCE_HASH', `references[${i}]`, 'Reference origin bytes differ from bound hash');
        } catch { issue(issues, 'REFERENCE_HASH', `references[${i}]`, 'Reference origin is unreadable'); }
      }
    }
  }
  const gate = await evaluateTransition({ manifest, stageId, target: 'ARCHIVE', evidence, boundary, snapshot });
  issues.push(...gate.issues);
  return { ok: issues.length === 0, issues, operations: issues.length ? [] : structuredClone(operations), originMap: issues.length ? [] : structuredClone(references) };
}

const receipts = new WeakSet();
export function isClosureReceipt(receipt, { manifest, stageId, snapshot } = {}) {
  return !!receipt && receipts.has(receipt) && receipt.owner === manifest?.scope?.closure?.archiveOwner && receipt.stageId === stageId && receipt.scopeSha256 === snapshot?.scopeSha256 && receipt.sourceSha256 === snapshot?.sourceSha256 && receipt.planSha256 === snapshot?.planSha256;
}

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (root, ...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null' } });
const contained = (base, path) => {
  const a = process.platform === 'win32' ? base.toLowerCase() : base;
  const b = process.platform === 'win32' ? path.toLowerCase() : path;
  return b === a || b.startsWith(`${a}${sep}`);
};

async function safeFile(root, path) {
  if (!safeRepoPath(path)) throw new Error('UNSAFE_PATH');
  const base = await realpath(root);
  let cursor = base;
  for (const part of path.split('/')) {
    cursor = resolve(cursor, part);
    if (!contained(base, cursor)) throw new Error('UNSAFE_PATH');
    const s = await lstat(cursor);
    if (s.isSymbolicLink()) throw new Error('UNSAFE_PATH');
  }
  if (!contained(base, await realpath(cursor))) throw new Error('UNSAFE_PATH');
  return readFile(cursor);
}

async function safeDestination(root, path) {
  if (!safeRepoPath(path)) throw new Error('UNSAFE_PATH');
  const base = await realpath(root);
  let cursor = base;
  for (const part of path.split('/')) {
    cursor = resolve(cursor, part);
    if (!contained(base, cursor)) throw new Error('UNSAFE_PATH');
    try {
      const stat = await lstat(cursor);
      if (stat.isSymbolicLink()) throw new Error('UNSAFE_PATH');
    } catch (error) {
      if (error?.code === 'ENOENT') return Buffer.alloc(0);
      throw error;
    }
  }
  return safeFile(root, path);
}

function requirementSections(bytes) {
  const text = bytes.toString('utf8');
  const groups = [...text.matchAll(/^## (ADDED|MODIFIED|REMOVED) Requirements\s*$/gm)];
  if (!groups.length) throw new Error('DELTA_REQUIREMENTS');
  const sections = [];
  for (const [i, group] of groups.entries()) {
    const body = text.slice(group.index + group[0].length, groups[i + 1]?.index ?? text.length);
    const matches = [...body.matchAll(/^### Requirement: ([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)\b.*$/gm)];
    if (!matches.length) throw new Error('DELTA_REQUIREMENTS');
    sections.push(...matches.map((m, j) => ({ id: m[1], mode: group[1], body: body.slice(m.index, matches[j + 1]?.index ?? body.length).trimEnd() })));
  }
  if (new Set(sections.map(s => s.id)).size !== sections.length) throw new Error('DELTA_REQUIREMENTS');
  return sections;
}

function syncDelta(existing, delta, capability) {
  const source = requirementSections(delta);
  const oldText = existing.toString('utf8');
  const oldMatches = [...oldText.matchAll(/^### Requirement: ([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)\b.*$/gm)];
  const head = oldText.trim() ? (oldMatches.length ? oldText.slice(0, oldMatches[0].index).trimEnd() : oldText.trimEnd()) : `# ${capability}\n\n## Requirements`;
  const prior = oldMatches.map((m, i) => ({ id: m[1], body: oldText.slice(m.index, oldMatches[i + 1]?.index ?? oldText.length).trimEnd() }));
  for (const section of source) {
    const at = prior.findIndex(x => x.id === section.id);
    if (section.mode === 'ADDED' && at >= 0 || section.mode !== 'ADDED' && at < 0) throw new Error('DELTA_REQUIREMENTS');
    if (section.mode === 'REMOVED') prior.splice(at, 1);
    else if (at >= 0) prior[at] = section;
    else prior.push(section);
  }
  return Buffer.from(`${head}\n\n${prior.map(s => s.body).join('\n\n')}\n`);
}

function relocateOwned(bytes, origin, relocated, map, allPaths) {
  let text = bytes.toString('utf8');
  for (const [from, to] of map) text = text.split(from).join(to);
  if (origin.endsWith('.md')) text = text.replace(/\]\(([^)#?]+)(#[^)]*)?\)/g, (whole, target, fragment = '') => {
    if (/^[a-z]+:/i.test(target) || target.startsWith('/')) return whole;
    const originalTarget = target.startsWith('openspec/') ? target : posix.normalize(posix.join(posix.dirname(origin), target));
    if (!safeRepoPath(originalTarget) || (!allPaths.has(originalTarget) && ![...map.values()].includes(originalTarget))) throw new Error('REFERENCE_BROKEN');
    const newTarget = map.get(originalTarget) ?? originalTarget;
    const next = posix.relative(posix.dirname(relocated), newTarget) || '.';
    return `](${next}${fragment})`;
  });
  return Buffer.from(text);
}

// This adapter is deliberately bounded to unconnected disposable Git fixtures.
// It preflights all inventory, bindings and content before the first mutation.
export async function executeClosure(args = {}) {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) return { ok: false, issues: [{ code: 'CLOSURE_SHAPE', path: '$', detail: 'Options object required' }] };
  const issues = [];
  const { root, manifest, stageId, snapshot, expectedHead } = args;
  if (!manifest?.scope?.closure?.enabled) issue(issues, 'CLOSURE_INACTIVE', 'manifest.scope.closure.enabled', 'Closure not activated');
  let base;
  try {
    base = await realpath(root);
    const temp = await realpath(tmpdir());
    if (!contained(temp, base) || !basename(base).startsWith('frade-closure-')) throw new Error('Not a disposable closure fixture');
  } catch { issue(issues, 'GIT_ROOT', 'root', 'Owned disposable root required'); }
  if (base) {
    try {
      const dotGit = resolve(base, '.git');
      const actualGit = await realpath(dotGit);
      if (!(await lstat(dotGit)).isDirectory() || (process.platform === 'win32' ? actualGit.toLowerCase() !== dotGit.toLowerCase() : actualGit !== dotGit)) throw new Error('External Git common directory');
    } catch { issue(issues, 'GIT_OWNER', 'root', 'Disposable repository must own its Git directory'); }
  }
  if (issues.length) return { ok: false, issues };
  const plan = await planClosure({ ...args, reader: createArtifactReader(base) });
  issues.push(...plan.issues);
  if (issues.length) return { ok: false, issues };
  if (base && !issues.some(x => x.code === 'GIT_OWNER')) {
    const top = git(base, 'rev-parse', '--show-toplevel');
    const branch = git(base, 'branch', '--show-current');
    const head = git(base, 'rev-parse', 'HEAD');
    const remotes = git(base, 'remote');
    const status = git(base, 'status', '--porcelain', '--untracked-files=all', '--ignored');
    const ancestor = git(base, 'merge-base', '--is-ancestor', manifest?.originalBaseline ?? '', 'HEAD');
    if (top.status !== 0 || (process.platform === 'win32' ? resolve(top.stdout.trim()).toLowerCase() !== base.toLowerCase() : resolve(top.stdout.trim()) !== base) || branch.stdout.trim() !== manifest?.owner?.branch || remotes.stdout.trim() || status.stdout.trim()) issue(issues, 'GIT_OWNER', 'root', 'Detached, dirty, connected or foreign repository');
    if (head.status !== 0 || head.stdout.trim() !== expectedHead || ancestor.status !== 0) issue(issues, 'GIT_STALE', 'expectedHead', 'Head or original baseline differs');
  }
  if (issues.length) return { ok: false, issues };
  const source = activeRoot(manifest.scope.closure.archiveOwner);
  const archive = archiveRoot(args.date, manifest.scope.closure.archiveOwner);
  const tracked = git(base, 'ls-files', '-z', '--', source).stdout.split('\0').filter(Boolean);
  const allTracked = git(base, 'ls-files', '-z').stdout.split('\0').filter(Boolean);
  if (new Set(allTracked.map(x => x.toLowerCase())).size !== allTracked.length) issue(issues, 'GIT_CASE_COLLISION', 'root', 'Case-colliding tracked paths');
  const refs = Array.isArray(args.references) ? args.references : [];
  if (tracked.length !== refs.length || tracked.some(p => !refs.some(r => r.origin === p))) issue(issues, 'REFERENCE_INVENTORY', 'references', 'Every owned tracked file must be mapped exactly once');
  const map = new Map(refs.map(r => [r.origin, r.relocated]));
  const allPaths = new Set(allTracked);
  const plannedWrites = [];
  try {
    for (const op of args.operations.filter(x => x.type === 'sync')) {
      const delta = await safeFile(base, op.from);
      if (sha(delta) !== op.sourceSha256) throw new Error('SOURCE_HASH');
      if (allTracked.some(p => p.toLowerCase() === op.to.toLowerCase() && p !== op.to)) throw new Error('GIT_CASE_COLLISION');
      const old = await safeDestination(base, op.to);
      plannedWrites.push([op.to, syncDelta(old, delta, op.to.split('/')[2])]);
    }
    const rawMap = new Map();
    for (const ref of refs) {
      const raw = await safeFile(base, ref.origin);
      if (sha(raw) !== ref.sha256) throw new Error('REFERENCE_HASH');
      rawMap.set(ref.origin, raw);
    }
    const resultMap = new Map(), visiting = new Set();
    const targetOf = (origin, value) => {
      if (typeof value !== 'string' || !value || /^[a-z]+:/i.test(value) || value.startsWith('/')) return null;
      const target = value.startsWith('openspec/') ? value : posix.normalize(posix.join(posix.dirname(origin), value));
      return safeRepoPath(target) && allPaths.has(target) ? target : null;
    };
    const transform = async origin => {
      if (resultMap.has(origin)) return resultMap.get(origin);
      if (visiting.has(origin)) throw new Error('REFERENCE_CYCLE');
      visiting.add(origin);
      const ref = refs.find(r => r.origin === origin);
      const raw = rawMap.get(origin);
      let bytes = raw;
      if (ref.kind !== 'immutable-origin' && origin.endsWith('.json')) {
        const walk = async value => {
          if (Array.isArray(value)) return Promise.all(value.map(walk));
          if (value && typeof value === 'object') {
            const result = {};
            for (const [key, item] of Object.entries(value)) result[key] = await walk(item);
            if (typeof value.path === 'string' && typeof value.sha256 === 'string') {
              const target = targetOf(origin, value.path);
              if (!target) throw new Error('REFERENCE_BROKEN');
              const before = rawMap.get(target) ?? await safeFile(base, target);
              if (sha(before) !== value.sha256) throw new Error('ROLE_SOURCE_HASH');
              result.sha256 = sha(rawMap.has(target) ? await transform(target) : before);
            }
            return result;
          }
          if (typeof value === 'string') {
            const target = targetOf(origin, value);
            if (!target) return value;
            const next = map.get(target) ?? target;
            return value.startsWith('openspec/') ? next : posix.relative(posix.dirname(ref.relocated), next) || '.';
          }
          return value;
        };
        bytes = Buffer.from(JSON.stringify(await walk(JSON.parse(raw.toString('utf8')))) + (raw.at(-1) === 10 ? '\n' : ''));
      } else if (ref.kind !== 'immutable-origin') bytes = relocateOwned(raw, origin, ref.relocated, map, allPaths);
      visiting.delete(origin);
      resultMap.set(origin, bytes);
      return bytes;
    };
    for (const ref of refs) plannedWrites.push([ref.relocated, await transform(ref.origin)]);
    for (const parent of ['openspec', 'openspec/changes', 'openspec/changes/archive']) {
      try { const s = await lstat(resolve(base, parent)); if (s.isSymbolicLink() || !s.isDirectory()) throw new Error('UNSAFE_PATH'); }
      catch (error) { if (error?.code !== 'ENOENT') throw error; }
    }
    try { await lstat(resolve(base, archive)); issue(issues, 'ARCHIVE_DESTINATION', 'archive', 'Archive already exists'); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  } catch (error) { issue(issues, ['REFERENCE_BROKEN', 'REFERENCE_HASH', 'SOURCE_HASH', 'ROLE_SOURCE_HASH', 'REFERENCE_CYCLE', 'GIT_CASE_COLLISION'].includes(error?.message) ? error.message : 'CLOSURE_PREFLIGHT', 'operations', String(error?.message ?? error)); }
  if (issues.length) return { ok: false, issues };
  try {
    await mkdir(resolve(base, dirname(archive)), { recursive: true });
    const move = git(base, 'mv', '--', source, archive);
    if (move.status !== 0) throw new Error(`git mv: ${move.stderr}`);
    for (const [path, bytes] of plannedWrites) { await mkdir(dirname(resolve(base, path)), { recursive: true }); await writeFile(resolve(base, path), bytes); }
    for (const [path, bytes] of plannedWrites) if (sha(await safeFile(base, path)) !== sha(bytes)) throw new Error(`Output hash mismatch: ${path}`);
    try { await lstat(resolve(base, source)); throw new Error('Active owner still exists'); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  } catch (error) { return { ok: false, issues: [{ code: 'CLOSURE_EXECUTION', path: archive, detail: String(error?.message ?? error) }] }; }
  const operationSha256 = sha(Buffer.from(JSON.stringify({ operations: plan.operations, origins: refs, outputs: plannedWrites.map(([path, bytes]) => ({ path, sha256: sha(bytes) })) })));
  const receipt = Object.freeze({ owner: manifest.scope.closure.archiveOwner, stageId, scopeSha256: snapshot.scopeSha256, sourceSha256: snapshot.sourceSha256, planSha256: snapshot.planSha256, baseline: manifest.originalBaseline, head: expectedHead, archive, operationSha256, origins: Object.freeze(refs.map(x => Object.freeze({ ...x }))) });
  receipts.add(receipt);
  return { ok: true, issues: [], receipt, operations: plan.operations, originMap: plan.originMap };
}
