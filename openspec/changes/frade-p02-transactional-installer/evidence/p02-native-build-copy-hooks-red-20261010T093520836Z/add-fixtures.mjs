import fs from 'node:fs';import assert from 'node:assert/strict';assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade');const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json')),p='packages/extension-service/tests/filesystem.deployment.test.ts';let s=fs.readFileSync(p,'utf8');const a="    await fs.copyFile(path.join(packageRoot, 'scripts', 'copy-windows-filesystem.mjs'), path.join(service, 'scripts', 'copy-windows-filesystem.mjs'))";assert.equal(s.split(a).length,2);s=s.replace(a,a+"\n    await fs.copyFile(path.join(packageRoot, 'scripts', 'build-windows-filesystem.mjs'), path.join(service, 'scripts', 'build-windows-filesystem.mjs'))\n    await fs.copyFile(path.join(packageRoot, 'package.json'), path.join(service, 'package.json'))");s+=String.raw`

function namedHook(service: string, name: string) {
  if (!process.env.npm_execpath) throw Error('PNPM_TEST_RUNTIME_MISSING')
  return spawnSync(process.execPath, [process.env.npm_execpath, 'run', name], { cwd: service, encoding: 'utf8', windowsHide: true, timeout: 20000 })
}
describe('P02FS005: actual named package hooks in isolated layout', () => {
  it('build:filesystem compiles current source and records fresh source/compiler/artifact integrity', () => deploymentFixture(async f => {
    const before = Date.now(), result = namedHook(f.service, 'build:filesystem')
    expect(result.error).toBeUndefined(); expect(result.status, String(result.stdout) + String(result.stderr)).toBe(0)
    const meta = JSON.parse(await fs.readFile(path.join(f.service, 'dist', 'native', 'integrity.json'), 'utf8'))
    expect(Date.parse(meta.compiledAtUtc)).toBeGreaterThanOrEqual(before)
    expect(meta.sourceSha256).toBe(sha(await fs.readFile(path.join(f.service, 'native', 'windows-filesystem.cs'))))
    expect(meta.executableSha256).toBe(sha(await fs.readFile(path.join(f.service, 'dist', 'native', 'frade-filesystem.exe'))))
    expect(meta.compilerSha256).toBe(sha(await fs.readFile(meta.compiler)))
    expect(meta.platform).toBe('windows-x64'); expect(meta.runtimeCapabilities).toBe('NOT_VERIFIED')
  }))
  it('copy:filesystem runs the fail-closed copy using exact built bytes', () => deploymentFixture(async f => {
    const result = namedHook(f.service, 'copy:filesystem')
    expect(result.error).toBeUndefined(); expect(result.status, String(result.stdout) + String(result.stderr)).toBe(0)
    expect(await fs.readFile(path.join(f.output, 'frade-filesystem.exe'))).toEqual(await fs.readFile(path.join(f.service, 'dist', 'native', 'frade-filesystem.exe')))
    expect(await fs.readFile(path.join(f.output, 'integrity.json'))).toEqual(await fs.readFile(path.join(f.service, 'dist', 'native', 'integrity.json')))
  }))
})
`;fs.writeFileSync(p,s);const d=m.base+'/evidence/p02-native-build-copy-hooks-red-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(d);fs.copyFileSync(process.argv[1],d+'/add-fixtures.mjs',fs.constants.COPYFILE_EXCL);console.log(d);
