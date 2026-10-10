import fs from 'node:fs';import assert from 'node:assert/strict';assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade');const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json')),p='packages/extension-service/tests/filesystem.deployment.test.ts';const source=String.raw`import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
const packageRoot = fileURLToPath(new URL('../', import.meta.url))
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
async function deploymentFixture(run: (f: { root: string; service: string; output: string; copy: () => ReturnType<typeof spawnSync> }) => Promise<void>) {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw Error('WINDOWS_DEPLOYMENT_NOT_RUN_UNSUPPORTED_HOST')
  const temp = await fs.realpath(os.tmpdir()), root = await fs.mkdtemp(path.join(temp, 'frade-p02-deployment-'))
  const service = path.join(root, 'packages', 'extension-service'), output = path.join(root, 'apps', 'desktop', 'out', 'extension-filesystem')
  try {
    await fs.mkdir(path.join(service, 'scripts'), { recursive: true })
    await fs.mkdir(path.join(service, 'native')); await fs.mkdir(path.join(service, 'dist', 'native'), { recursive: true })
    await fs.mkdir(path.join(root, 'apps', 'desktop', 'out'), { recursive: true })
    await fs.copyFile(path.join(packageRoot, 'scripts', 'copy-windows-filesystem.mjs'), path.join(service, 'scripts', 'copy-windows-filesystem.mjs'))
    for (const file of ['frade-filesystem.exe', 'integrity.json']) await fs.copyFile(path.join(packageRoot, 'dist', 'native', file), path.join(service, 'dist', 'native', file))
    await fs.copyFile(path.join(packageRoot, 'native', 'windows-filesystem.cs'), path.join(service, 'native', 'windows-filesystem.cs'))
    const copy = () => spawnSync(process.execPath, [path.join(service, 'scripts', 'copy-windows-filesystem.mjs')], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10000 })
    await run({ root, service, output, copy })
  } finally {
    if (path.dirname(root).toLowerCase() !== temp.toLowerCase() || !path.basename(root).startsWith('frade-p02-deployment-')) throw Error('UNSAFE_DEPLOYMENT_CLEANUP')
    await fs.rm(root, { recursive: true })
  }
}
describe('P02FS005: exact build-output integrity and fail-closed copy', () => {
  it('copies the exact built helper/metadata into a sibling of main and survives main-output cleanup', () => deploymentFixture(async f => {
    const result = f.copy(); expect(result.error).toBeUndefined(); expect(result.status, String(result.stdout) + String(result.stderr)).toBe(0)
    const actual = await fs.readFile(path.join(f.output, 'frade-filesystem.exe')), original = await fs.readFile(path.join(f.service, 'dist', 'native', 'frade-filesystem.exe'))
    expect(actual).toEqual(original)
    expect(await fs.readFile(path.join(f.output, 'integrity.json'))).toEqual(await fs.readFile(path.join(f.service, 'dist', 'native', 'integrity.json')))
    const meta = JSON.parse(await fs.readFile(path.join(f.output, 'integrity.json'), 'utf8'))
    expect(meta.executableSha256).toBe(sha(actual)); expect(meta.runtimeCapabilities).toBe('NOT_VERIFIED')
    const main = path.join(f.root, 'apps', 'desktop', 'out', 'main')
    await fs.mkdir(main); await fs.writeFile(path.join(main, 'old'), 'old')
    // Vite cleanup behavior is separate existing evidence; here only exact sibling lifetime is asserted.
    expect(path.dirname(main)).toBe(path.dirname(f.output))
    await fs.rm(main, { recursive: true })
    expect(await fs.readFile(path.join(f.output, 'frade-filesystem.exe'))).toEqual(original)
  }))
  for (const corruption of ['source', 'executable', 'protocol', 'platform', 'bytes', 'missing'] as const) it('refuses ' + corruption + ' drift before replacing prior output', () => deploymentFixture(async f => {
    expect(f.copy().status).toBe(0)
    const oldExe = await fs.readFile(path.join(f.output, 'frade-filesystem.exe')), oldMetadata = await fs.readFile(path.join(f.output, 'integrity.json'))
    const input = path.join(f.service, 'dist', 'native'), file = path.join(input, 'frade-filesystem.exe')
    if (corruption === 'source') await fs.appendFile(path.join(f.service, 'native', 'windows-filesystem.cs'), '\n// drift\n')
    else if (corruption === 'executable') await fs.appendFile(file, Buffer.from('drift'))
    else if (corruption === 'missing') await fs.unlink(file)
    else {
      const metadata = JSON.parse(await fs.readFile(path.join(input, 'integrity.json'), 'utf8'))
      if (corruption === 'protocol') metadata.protocol = 2
      if (corruption === 'platform') metadata.platform = 'windows-arm64'
      if (corruption === 'bytes') metadata.executableBytes += 1
      await fs.writeFile(path.join(input, 'integrity.json'), JSON.stringify(metadata))
    }
    const result = f.copy(); expect(result.error).toBeUndefined(); expect(result.status).not.toBe(0)
    expect(await fs.readFile(path.join(f.output, 'frade-filesystem.exe'))).toEqual(oldExe)
    expect(await fs.readFile(path.join(f.output, 'integrity.json'))).toEqual(oldMetadata)
    expect((await fs.readdir(f.output)).sort()).toEqual(['frade-filesystem.exe', 'integrity.json'])
  }))
})
`;fs.writeFileSync(p,source,{flag:'wx'});const d=m.base+'/evidence/p02-native-deployment-red-fixtures-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(d);fs.copyFileSync(process.argv[1],d+'/add-fixtures.mjs',fs.constants.COPYFILE_EXCL);console.log(d);
