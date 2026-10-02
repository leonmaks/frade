const H = 'a'.repeat(64)
const SHA = 'b'.repeat(40)

export function manifest() {
  return {
    schemaVersion: 2,
    id: 'frade-standard-workflow',
    title: 'Standard workflow',
    owner: {
      branch: 'codex/frade-standard-workflow',
      worktree: 'E:/dev/codex/frade-worktrees/frade-standard-workflow',
      gitCommon: 'E:/dev/codex/frade/.git',
    },
    originalBaseline: SHA,
    policy: {
      version: '1.1',
      release: H,
      sha256: H,
      artifact: 'openspec/changes/frade-standard-workflow/evidence/shared-policy.md',
    },
    scope: {
      mode: 'IMPLEMENTATION',
      planningAllowed: [
        'openspec/changes/frade-standard-workflow/**',
        'docs/engineering/BRANCH-STATUS.md',
      ],
      allowed: [
        'docs/engineering/**',
        'scripts/directions/**',
        'tests/directions/**',
        'openspec/changes/frade-standard-workflow/**',
      ],
      frozen: ['packages/**', 'apps/**', 'pnpm-lock.yaml'],
      closure: {
        enabled: false,
        requires: [
          'humanPolicyDecision',
          'requiredChecksPASS',
          'formalVerifyPASS',
          'currentIndependentPOSTPASS',
        ],
        specDestinations: [
          'openspec/specs/engineering-direction-lifecycle/spec.md',
          'openspec/specs/engineering-role-dispatch/spec.md',
          'openspec/specs/engineering-progress-publication/spec.md',
        ],
        archiveDestination:
          'openspec/changes/archive/<actual-archive-date>-frade-standard-workflow/**',
        archiveOwner: 'frade-standard-workflow',
      },
    },
    statusPath: 'docs/engineering/BRANCH-STATUS.md',
    stages: [
      {
        id: 'W01',
        change: 'frade-standard-workflow',
        phase: 'BDD_TDD',
        health: 'RUNNING',
        dependencies: [],
        admission: { formalPRE: 'PASS' },
      },
    ],
  }
}
