import fs from 'node:fs';import assert from 'node:assert/strict';assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade');const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json'));const source=String.raw`import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
const service = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repository = path.resolve(service, '..', '..')
const input = path.join(service, 'dist', 'native')
const output = path.join(repository, 'apps', 'desktop', 'out', 'extension-filesystem')
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
if (process.platform !== 'win32') {
  console.log(JSON.stringify({ status: 'NOT_APPLICABLE_HOST', native: 'NOT_RUN' }))
} else {
  if (process.arch !== 'x64') throw Error('BACKEND_UNAVAILABLE_ARCHITECTURE')
  // These fixed trusted distribution paths never come from an extension/renderer or PATH.
  const metadataBytes = fs.readFileSync(path.join(input, 'integrity.json'))
  if (metadataBytes.length > 16384) throw Error('NATIVE_METADATA_LIMIT')
  const metadata = JSON.parse(metadataBytes.toString('utf8'))
  const source = fs.readFileSync(path.join(service, 'native', 'windows-filesystem.cs'))
  const executable = fs.readFileSync(path.join(input, 'frade-filesystem.exe'))
  if (!metadata || metadata.schemaVersion !== 1 || metadata.protocol !== 1 ||
      metadata.platform !== 'windows-x64' || metadata.source !== 'native/windows-filesystem.cs' ||
      metadata.executable !== 'frade-filesystem.exe' || metadata.sourceSha256 !== sha(source) ||
      metadata.executableSha256 !== sha(executable) || metadata.executableBytes !== executable.length ||
      metadata.publisherTrust !== 'NOT_ASSERTED' || metadata.runtimeCapabilities !== 'NOT_VERIFIED') throw Error('NATIVE_BUILD_DRIFT')
  if (executable.length < 256 || executable.readUInt16LE(0) !== 0x5a4d) throw Error('INVALID_PE')
  const offset = executable.readUInt32LE(0x3c)
  if (offset + 24 > executable.length || executable.readUInt32LE(offset) !== 0x4550 ||
      executable.readUInt16LE(offset + 4) !== 0x8664) throw Error('INVALID_PE_ARCHITECTURE')
  // Validate all inputs before creating/replacing output. This is build integrity, not runtime proof.
  fs.mkdirSync(output, { recursive: true })
  if (!fs.lstatSync(output).isDirectory() || fs.lstatSync(output).isSymbolicLink()) throw Error('UNSAFE_OUTPUT_DIRECTORY')
  const id = crypto.randomUUID(), pendingExe = path.join(output, '.frade-filesystem-' + id), pendingMetadata = path.join(output, '.integrity-' + id)
  let failure
  try {
    fs.writeFileSync(pendingExe, executable, { flag: 'wx' })
    fs.writeFileSync(pendingMetadata, metadataBytes, { flag: 'wx' })
    if (!fs.readFileSync(pendingExe).equals(executable) || !fs.readFileSync(pendingMetadata).equals(metadataBytes)) throw Error('COPY_READBACK_MISMATCH')
    fs.renameSync(pendingExe, path.join(output, 'frade-filesystem.exe'))
    fs.renameSync(pendingMetadata, path.join(output, 'integrity.json'))
    if (!fs.readFileSync(path.join(output, 'frade-filesystem.exe')).equals(executable) ||
        !fs.readFileSync(path.join(output, 'integrity.json')).equals(metadataBytes)) throw Error('COPY_FINAL_READBACK_MISMATCH')
  } catch (error) { failure = error }
  for (const owned of [pendingExe, pendingMetadata]) {
    if (path.dirname(owned) !== output || !path.basename(owned).endsWith(id)) throw Error('UNSAFE_COPY_TEMP')
    try { fs.unlinkSync(owned) } catch (error) { if (error.code !== 'ENOENT') failure ??= error }
  }
  if (failure) throw failure
  console.log(JSON.stringify({ status: 'COPIED_INTEGRITY_ONLY', output, sourceSha256: metadata.sourceSha256,
    executableSha256: metadata.executableSha256, runtimeCapabilities: 'NOT_VERIFIED', publisherTrust: 'NOT_ASSERTED' }))
}
`;fs.writeFileSync('packages/extension-service/scripts/copy-windows-filesystem.mjs',source,{flag:'wx'});const test='packages/extension-service/tests/filesystem.deployment.test.ts';let t=fs.readFileSync(test,'utf8');const marker='async function deploymentFixture';t=t.replace(marker,`async function removeDeploymentFixture(root: string, temp: string) {
  if (path.dirname(root).toLowerCase() !== temp.toLowerCase() || !path.basename(root).startsWith('frade-p02-deployment-')) throw Error('UNSAFE_DEPLOYMENT_CLEANUP')
  await fs.rm(root, { recursive: true })
}
`+marker);const old=`    if (path.dirname(root).toLowerCase() !== temp.toLowerCase() || !path.basename(root).startsWith('frade-p02-deployment-')) throw Error('UNSAFE_DEPLOYMENT_CLEANUP')
    await fs.rm(root, { recursive: true })`;assert.equal(t.split(old).length,2);t=t.replace(old,'    await removeDeploymentFixture(root, temp)');fs.writeFileSync(test,t);const d=m.base+'/evidence/p02-native-copy-implementation-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(d);fs.writeFileSync(d+'/scope.json',JSON.stringify({atUtc:new Date().toISOString(),authority:'P02-WINDOWS-FILESYSTEM-BACKEND-01 + current approved PRE70604f86',RED:m.base+'/evidence/p02-check-deployment-copy7-red-current-20261010T093230352Z',implementation:'Fixed source/output paths, source/artifact/metadata/PE validation before output, exact-byte copy/readback, same-directory owned temps, fail-closed input drift; integrity only.',limitations:'No runtime adapter/Main/native capability/dev/build/start/journal/UI integration yet. Two build-output files not claimed atomic journal commit.',testCleanup:'Extract containment guard into helper retaining checks before recursive owned deletion; no test assertions removed'},null,2)+'\n',{flag:'wx'});fs.copyFileSync(process.argv[1],d+'/implementation.mjs',fs.constants.COPYFILE_EXCL);console.log(d);
