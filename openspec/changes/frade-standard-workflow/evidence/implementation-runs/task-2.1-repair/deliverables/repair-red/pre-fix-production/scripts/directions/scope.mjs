import { pathMatches, safeRepoPath, validateManifest } from './contracts.mjs';
import { evaluateTransition } from './lifecycle.mjs';

const issue = (issues, code, path, detail) => issues.push({ code, path, detail });
const result = issues => ({ ok: issues.length === 0, issues });
const activeRoot = id => `openspec/changes/${id}`;
const archiveRoot = (date, id) => `openspec/changes/archive/${date}-${id}`;
const closurePath = path => path.startsWith('openspec/specs/') || path.startsWith('openspec/changes/archive/');
const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().startsWith(date);

export function checkScope(manifest, phase, paths = []) {
  const issues = [...validateManifest(manifest).issues];
  if (!['PLANNING', 'PRE_REVIEW', 'IMPLEMENTATION'].includes(phase)) issue(issues, 'SCOPE_PHASE', 'phase', 'Use a verified closure plan for closure');
  if (!Array.isArray(paths)) issue(issues, 'SCOPE_PATHS', 'paths', 'Path array required');
  if (!manifest?.scope || !Array.isArray(paths)) return result(issues);
  if (phase === 'IMPLEMENTATION' && manifest.scope.mode !== 'IMPLEMENTATION') issue(issues, 'SCOPE_MODE', 'scope.mode', 'Implementation scope is inactive');
  if (phase !== 'IMPLEMENTATION' && !['PLANNING', 'PRE_REVIEW'].includes(manifest.scope.mode)) issue(issues, 'SCOPE_MODE', 'scope.mode', 'Planning scope is inactive');
  const allowed = phase === 'IMPLEMENTATION' ? manifest.scope.allowed : manifest.scope.planningAllowed;
  for (const [i, path] of paths.entries()) {
    if (!safeRepoPath(path)) { issue(issues, 'UNSAFE_PATH', `paths[${i}]`, 'Unsafe relative path'); continue; }
    if (closurePath(path)) { issue(issues, 'CLOSURE_INACTIVE', `paths[${i}]`, 'Closure requires verified plan'); continue; }
    if (manifest.scope.frozen?.some(p => pathMatches(p, path)) || !allowed?.some(p => pathMatches(p, path))) issue(issues, 'SCOPE_DENIED', `paths[${i}]`, 'Path outside active scope');
  }
  return result(issues);
}

// Returns an immutable proposal. A later closure executor must recheck hashes, references,
// actual Git ownership and the absence of writes before applying it.
export async function planClosure({ manifest, stageId, date, operations, references, evidence, boundary, snapshot, reader } = {}) {
  const issues = [...validateManifest(manifest).issues];
  if (!validDate(date)) issue(issues, 'ARCHIVE_DATE', 'date', 'Canonical real UTC date required');
  const id = manifest?.id;
  const source = activeRoot(id);
  const archive = archiveRoot(date, id);
  const expectedSpecs = manifest?.scope?.closure?.specDestinations ?? [];
  if (!Array.isArray(operations)) issue(issues, 'CLOSURE_OPERATIONS', 'operations', 'Operations required');
  else {
    const sync = operations.filter(op => op?.type === 'sync');
    const archives = operations.filter(op => op?.type === 'archive');
    if (operations.length !== expectedSpecs.length + 1 || sync.length !== expectedSpecs.length || archives.length !== 1) issue(issues, 'CLOSURE_OPERATIONS', 'operations', 'Exactly declared syncs and one archive required');
    for (const [i, op] of operations.entries()) {
      if (!safeRepoPath(op?.from) || !safeRepoPath(op?.to)) { issue(issues, 'UNSAFE_PATH', `operations[${i}]`, 'Unsafe operation path'); continue; }
      if (op.type === 'sync') {
        if (!expectedSpecs.includes(op.to) || op.from !== `${source}/specs/${op.to.slice('openspec/specs/'.length)}`) issue(issues, 'CLOSURE_DESTINATION', `operations[${i}]`, 'Spec sync must use exact own delta and destination');
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
