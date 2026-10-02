import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { safeRepoPath } from './contracts.mjs';

const boundaries = new WeakSet();

// The root is chosen by a trusted caller. Every component is checked before the file is read.
export function createArtifactReader(root) {
  if (typeof root !== 'string' || !root) throw new TypeError('Artifact root required');
  const base = resolve(root);
  return Object.freeze({
    async read(path) {
      if (!safeRepoPath(path)) throw new Error('UNSAFE_ARTIFACT: unsafe relative path');
      let cursor = base;
      for (const part of path.split('/')) {
        cursor = resolve(cursor, part);
        if (!cursor.startsWith(`${base}${sep}`)) throw new Error('UNSAFE_ARTIFACT: outside root');
        const stat = await lstat(cursor);
        if (stat.isSymbolicLink()) throw new Error('UNSAFE_ARTIFACT: symlink');
      }
      const canonical = await realpath(cursor);
      if (!canonical.startsWith(`${base}${sep}`)) throw new Error('UNSAFE_ARTIFACT: realpath escape');
      const bytes = await readFile(cursor);
      return Object.freeze({ path, bytes, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  });
}

// Only a trusted integration supplies verify: it must inspect actual raw artifacts, hashes,
// complete execution, independent receipt, scope and bindings. No JSON field is an authority.
export function createEvidenceBoundary({ verify } = {}) {
  if (typeof verify !== 'function') throw new TypeError('Trusted evidence verifier required');
  const boundary = Object.freeze({ verify: (kind, ref, expected) => verify(kind, ref, expected) });
  boundaries.add(boundary);
  return boundary;
}

export const isEvidenceBoundary = x => boundaries.has(x);

export async function verifyArtifactHash(reader, descriptor) {
  if (typeof reader?.read !== 'function' || !safeRepoPath(descriptor?.path) || !/^[a-f0-9]{64}$/.test(descriptor?.sha256 ?? '')) return false;
  try { return (await reader.read(descriptor.path)).sha256 === descriptor.sha256; } catch { return false; }
}

export async function verifyGate(boundary, kind, ref, expected) {
  if (!isEvidenceBoundary(boundary) || !ref || typeof ref !== 'object' || Array.isArray(ref) || ref.kind !== kind || ref.status !== 'PASS' || ref.complete !== true || ref.scope !== 'full' || !safeRepoPath(ref.artifact?.path) || !/^[a-f0-9]{64}$/.test(ref.artifact?.sha256 ?? '') || !ref.bindings || typeof ref.bindings !== 'object' || Object.entries(expected).some(([k, v]) => ref.bindings[k] !== v)) return false;
  try { return (await boundary.verify(kind, ref, expected)) === true; } catch { return false; }
}
