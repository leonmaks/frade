import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'native/windows-filesystem.cs')
const output = path.join(root, 'dist/native')
const sha = value => crypto.createHash('sha256').update(value).digest('hex')
if (process.platform !== 'win32') {
  console.log(JSON.stringify({ status: 'NOT_APPLICABLE_HOST', native: 'NOT_RUN' }))
} else {
  if (process.arch !== 'x64' || !process.env.WINDIR) throw new Error('BACKEND_UNAVAILABLE_ARCHITECTURE')
  const windows = fs.realpathSync(process.env.WINDIR)
  const compiler = path.join(windows, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe')
  const compilerHash = sha(fs.readFileSync(compiler)), sourceHash = sha(fs.readFileSync(source))
  const ps = path.join(windows, 'System32/WindowsPowerShell/v1.0/powershell.exe')
  const version = spawnSync(ps, ['-NoProfile', '-NonInteractive', '-Command',
    "(Get-Item -LiteralPath '" + compiler.replaceAll("'", "''") + "').VersionInfo.FileVersion"],
    { encoding: 'utf8', windowsHide: true, timeout: 10000 })
  if (version.error || version.status !== 0 || !version.stdout.trim()) throw new Error('BACKEND_UNAVAILABLE_COMPILER_METADATA')
  fs.mkdirSync(output, { recursive: true })
  const executable = path.join(output, 'frade-filesystem.exe')
  const args = ['/nologo', '/target:exe', '/platform:x64', '/optimize+', '/warnaserror+',
    '/reference:System.Web.Extensions.dll', '/out:' + executable, source]
  const result = spawnSync(compiler, args, { encoding: 'utf8', windowsHide: true, timeout: 60000, cwd: root })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  if (result.error || result.status !== 0) throw new Error('BACKEND_UNAVAILABLE_COMPILATION')
  if (sha(fs.readFileSync(source)) !== sourceHash || sha(fs.readFileSync(compiler)) !== compilerHash) throw new Error('BUILD_INPUT_CHANGED')
  const bytes = fs.readFileSync(executable)
  // PE machine field is x64; generated hash is integrity, never signing or publisher trust.
  if (bytes.length < 256 || bytes.readUInt16LE(0) !== 0x5a4d) throw new Error('INVALID_PE')
  const pe = bytes.readUInt32LE(0x3c)
  if (pe + 24 > bytes.length || bytes.readUInt32LE(pe) !== 0x4550 || bytes.readUInt16LE(pe + 4) !== 0x8664) throw new Error('INVALID_PE_ARCHITECTURE')
  const metadata = { schemaVersion: 1, protocol: 1, platform: 'windows-x64',
    source: 'native/windows-filesystem.cs', sourceSha256: sourceHash,
    executable: 'frade-filesystem.exe', executableSha256: sha(bytes), executableBytes: bytes.length,
    compiler, compilerSha256: compilerHash, compilerVersion: version.stdout.trim(),
    command: [compiler, ...args], compiledAtUtc: new Date().toISOString(),
    runtimeCapabilities: 'NOT_VERIFIED', publisherTrust: 'NOT_ASSERTED' }
  fs.writeFileSync(path.join(output, 'integrity.json'), JSON.stringify(metadata, null, 2) + '\n')
  console.log(JSON.stringify({ status: 'BUILT_INTEGRITY_ONLY', ...metadata }))
}
