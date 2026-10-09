import fs from 'node:fs'

function serializeError(error) {
  if (error && typeof error === 'object') {
    return {
      type: error.type ?? error.name ?? 'Error',
      name: error.name ?? null,
      message: error.message ?? String(error),
      stack: error.stack ?? null,
    }
  }
  return { type: 'Error', name: null, message: String(error), stack: null }
}

export default class MutationAuditReporter {
  onTestRunEnd(testModules, unhandledErrors, reason) {
    const output = process.env.FRADE_VITEST_AUDIT_FILE
    if (!output) throw new Error('FRADE_VITEST_AUDIT_FILE is required for mutation child runs')
    const report = {
      schemaVersion: 2,
      reason,
      unhandledErrors: unhandledErrors.map(serializeError),
      modules: testModules.map((module) => ({
        moduleId: module.moduleId,
        state: module.state(),
        ok: module.ok(),
        errors: module.errors().map(serializeError),
        suites: [...module.children.allSuites()].map((suite) => ({
          id: suite.id,
          name: suite.fullName,
          errors: suite.errors().map(serializeError),
        })),
        tests: [...module.children.allTests()].map((test) => {
          const result = test.result()
          return {
            id: test.id,
            name: test.fullName,
            state: result.state,
            errors: (result.errors ?? []).map(serializeError),
          }
        }),
      })),
    }
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n')
  }
}
