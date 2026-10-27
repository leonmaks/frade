import fs from 'node:fs'
import path from 'node:path'
import { createRequire, stripTypeScriptTypes, registerHooks } from 'node:module'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
const root = fs.realpathSync(process.argv[2] ?? 'E:/dev/codex/frade')
const mode = process.argv[3] ?? 'normal'
const output = process.argv[4]
if (!output || fs.existsSync(output)) throw Error('IMMUTABLE_PREFLIGHT_OUTPUT')
const req = createRequire(path.join(root, 'apps/desktop/package.json'))
const ts = req('typescript'), { expect } = req('@playwright/test')
const originUrl = pathToFileURL(path.join(root, 'packages/ui-workspace/tests/ui-contract/drawing-pages-origin.ts')).href
const nativeLoader = registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL === originUrl && specifier === './drawing-pages-adoption-pin')
    return next(new URL('./drawing-pages-adoption-pin.ts', context.parentURL).href, context)
  return next(specifier, context)
} })
const sha = raw => createHash('sha256').update(raw).digest('hex')
try {
  const module = await import(originUrl)
  const sourceFile = 'packages/ui-workspace/tests/ui-contract/light-diagram-editor.bdd.test.tsx'
  const raw = fs.readFileSync(path.join(root, sourceFile)), source = raw.toString()
  const ast = ts.createSourceFile(sourceFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const remove = ast.statements.filter(statement => ts.isImportDeclaration(statement) || (ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration => declaration.name.getText(ast) === 'root'))).map(node => [node.getStart(ast), node.end]).sort((a,b) => b[0]-a[0])
  let body = source
  for (const [start, end] of remove) body = body.slice(0, start) + body.slice(end)
  const js = stripTypeScriptTypes(body, { mode: 'strip' })
  let read = module.readDrawingPagesOrigin, lockEvidence
  if (mode === 'historical-lock') {
    const profile = root.endsWith('multipage-publication-clean-4') ? 'clean' : 'working'
    const prefix = 'docs/engineering/evidence/frade-draw-multipage-publication-20261027/pre-bridge-adoption/' + profile
    const manifestRaw = fs.readFileSync(path.join(root, prefix, 'source-adoption-manifest.json'))
    const oldBootstrap = fs.readFileSync(path.join(root, 'openspec/changes/frade-draw-multipage-publication-binding/evidence/pre-bridge-bootstrap.ts.txt'), 'utf8')
    const field = profile === 'clean' ? 'Clean' : 'Working'
    const pin = oldBootstrap.match(new RegExp('drawingPages' + field + "PublicationManifestSha256\\s*=\\s*'([a-f0-9]{64})'"))?.[1]
    if (!pin || sha(manifestRaw) !== pin) throw Error('PRIOR_DATA_MANIFEST_PIN')
    const lock = JSON.parse(manifestRaw).currentInputs.find(input => input.file === 'pnpm-lock.yaml')
    const owner = module.locateDrawingPagesOriginOwner(root)
    const originRaw = fs.readFileSync(path.join(root, owner, 'evidence/source-adoption-manifest.json'))
    const reader = module.createDrawingPagesOriginReader({ root, owner, manifest: originRaw, expectedSha256: 'c9c06d7b1a13da36a282d24bf2ed465dfdab91f0711970ec8dc3052673c4b309', publicationInput: lock })
    read = (base, file, bytes) => file === 'pnpm-lock.yaml' ? reader(file, bytes) : module.readDrawingPagesOrigin(base, file, bytes)
    lockEvidence = { profile, manifestSha256: pin, unchangedLockInput: lock, currentProfileProofClaim: false }
  } else if (mode !== 'normal') throw Error('PREFLIGHT_MODE')
  const cases = []
  const factory = new Function('expect', 'it', 'createHash', 'existsSync', 'lstatSync', 'readFileSync', 'readdirSync', 'realpathSync', 'resolve', 'relative', 'fileURLToPath', 'readDrawingPagesOrigin', 'root', js + '\nreturn { verify };')
  const frozen = factory(expect, (title, run) => cases.push({ title, run }), createHash, fs.existsSync, fs.lstatSync, fs.readFileSync, fs.readdirSync, fs.realpathSync, path.resolve, path.relative, fileURLToPath, read, root)
  let inputReplay;try{const checked=frozen.verify();inputReplay={status:'PASS',inputs:checked.manifest.inputs.length,reports:checked.reports.size}}catch(error){inputReplay={status:'FAIL',error:String(error)}}
  const results = []
  for (const item of cases) { try { await item.run(); results.push({ title: item.title, status: 'PASS' }) } catch(error) { results.push({ title: item.title, status: 'FAIL', error: String(error) }) } }
  const report = { at: new Date().toISOString(), root, mode, frozenBddSource: { file: sourceFile, sha256: sha(raw) }, originalAssertionsChanged: 0, nodeFactoryRemovedOnlyImportsAndRootConstant: true, assertionLibrary: '@playwright/test standard synchronous Jest matchers', syntheticHistoricalCompatibilityOnly: true, currentGeneralGateClaim: false, lockEvidence, inputReplay, results, passed: results.filter(item => item.status === 'PASS').length, failed: results.filter(item => item.status === 'FAIL').length }
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ output, passed: report.passed, failed: report.failed }))
  if (report.failed) process.exitCode = 1
} finally { nativeLoader.deregister() }
