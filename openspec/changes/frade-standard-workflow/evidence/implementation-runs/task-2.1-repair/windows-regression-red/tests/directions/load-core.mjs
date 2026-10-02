import { access } from 'node:fs/promises';

const missing = () => ({ ok: false, issues: [{ code: 'NOT_IMPLEMENTED', path: '$', detail: 'Direction core module absent' }] });
const absent = {
  contracts: {
    validateManifest: missing, validateTraceability: missing, verifyTraceability: async () => missing(),
    validateApplicability: missing, verifyApplicability: async () => missing(),
    scopeFingerprint: () => '0'.repeat(64)
  },
  evidence: {
    createArtifactReader: () => ({ read: async () => ({}) }),
    createEvidenceBoundary: () => ({ verify: async () => false }),
    verifyArtifactHash: async () => false
  },
  lifecycle: { evaluateTransition: async () => missing(), legacyClosureState: () => 'IN_PROGRESS' },
  scope: { checkScope: missing, planClosure: async () => ({ ...missing(), operations: [], originMap: [] }) }
};

export async function loadCore(name) {
  if (!Object.hasOwn(absent, name)) throw new TypeError(`Unknown core module: ${name}`);
  const url = new URL(`../../scripts/directions/${name}.mjs`, import.meta.url);
  try { await access(url); } catch (error) {
    if (error?.code === 'ENOENT') return absent[name];
    throw error;
  }
  return import(url);
}
