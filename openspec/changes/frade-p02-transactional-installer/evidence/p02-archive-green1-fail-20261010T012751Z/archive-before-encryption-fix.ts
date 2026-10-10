import { createHash } from 'node:crypto'
import { crc32 } from 'node:zlib'
import { fromBufferPromise } from 'yauzl'
import type { Entry, LocalFileHeader } from 'yauzl'
import { valid, validRange, satisfies } from 'semver'
import type { ExtensionDiagnostic, ExtensionManifest, ExtensionTheme } from '@frade/extension-contracts'
export interface ValidationOptions {
  readonly appVersion: string
  readonly apiVersion: string
  readonly themeRoles: readonly string[]
}
export type PackageValidation =
  | { readonly status: 'VALID'; readonly id: string; readonly sha256: string; readonly manifest: ExtensionManifest; readonly themes: readonly ExtensionTheme[]; readonly files: ReadonlyMap<string, Uint8Array>; readonly expandedBytes: number }
  | { readonly status: 'REJECTED'; readonly diagnostic: ExtensionDiagnostic }
export const ARCHIVE_LIMITS = Object.freeze({ compressed:50*1024*1024, expanded:200*1024*1024, entries:10000, ratio:100, depth:32, json:1024*1024 })
class PackageError extends Error {
  constructor(readonly code: string, message: string, readonly source?: string) { super(message) }
}
function fail(code: string, message: string, source?: string): never { throw new PackageError(code,message,source) }
const text = (value:unknown, max=160):value is string => typeof value==='string'&&value.length>0&&value.length<=max&&!/[\x00-\x1f\x7f]/.test(value)
const object = (value:unknown):value is Record<string,unknown> => !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype
const exact = (value:Record<string,unknown>, keys:readonly string[]) => Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key))
const kind = (value:unknown):value is ExtensionTheme['kind'] => ['light','dark','high-contrast'].includes(String(value))
function safePath(name:string, directory=false):string {
  const source=name, stripped=directory&&name.endsWith('/')?name.slice(0,-1):name
  if(!stripped||stripped.length>1024||stripped!==stripped.normalize('NFC')||/[\\:\x00-\x1f\x7f\ufffd]/.test(stripped)||stripped.startsWith('/')||stripped.endsWith('/'))fail('UNSAFE_PATH','Unsafe native archive path',source)
  const parts=stripped.split('/')
  if(parts.length>ARCHIVE_LIMITS.depth)fail('PATH_DEPTH','Archive path depth exceeds32',source)
  for(const part of parts)if(!part||part==='.'||part==='..'||/[. ]$/.test(part)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))fail('UNSAFE_PATH','Unsafe Windows-compatible path component',source)
  return stripped
}
function json(bytes:Uint8Array|undefined, source:string, code:string):unknown {
  if(!bytes||bytes.length>ARCHIVE_LIMITS.json)fail(code,'Missing or oversized bounded JSON',source)
  try { return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) } catch { return fail(code,'Malformed native UTF8 JSON',source) }
}
function manifest(value:unknown, options:ValidationOptions):ExtensionManifest {
  const code='INVALID_MANIFEST',source='package.json'
  if(!object(value)||!exact(value,['publisher','name','displayName','version','engines','kind','capabilities','contributes']))fail(code,'Native declaration fields must match v1 schema',source)
  for(const key of ['publisher','name'])if(!text(value[key],80)||!/^[a-z0-9][a-z0-9-]*$/.test(value[key] as string))fail(code,'Invalid stable publisher/name',source)
  if(!text(value.displayName)||!text(value.version,80)||!valid(value.version as string)||value.kind!=='declarative'||!Array.isArray(value.capabilities)||value.capabilities.length)fail(code,'Invalid native kind/version/name or unsupported capability',source)
  if(!object(value.engines)||!exact(value.engines,['frade','fradeApi'])||!text(value.engines.frade,256)||!text(value.engines.fradeApi,256)||!validRange(value.engines.frade as string)||!validRange(value.engines.fradeApi as string))fail(code,'Invalid semantic engine ranges',source)
  if(!object(value.contributes)||!exact(value.contributes,['themes'])||!Array.isArray(value.contributes.themes)||!value.contributes.themes.length||value.contributes.themes.length>256)fail(code,'Only bounded native color theme contributions are supported',source)
  const ids=new Set<string>(),paths=new Set<string>()
  for(const entry of value.contributes.themes){
    if(!object(entry)||!exact(entry,['id','label','kind','path'])||!text(entry.id,80)||!/^[a-z0-9][a-z0-9._-]*$/.test(entry.id as string)||!text(entry.label)||!kind(entry.kind)||!text(entry.path,1024))fail(code,'Invalid native theme contribution',source)
    const id=entry.id as string,themePath=safePath(entry.path as string).toLowerCase()
    if(ids.has(id)||paths.has(themePath))fail(code,'Duplicate theme identity/path',source)
    ids.add(id);paths.add(themePath)
  }
  if(!valid(options.appVersion)||!valid(options.apiVersion))fail('RUNTIME_INVALID','Invalid host API/application version')
  if(!satisfies(options.appVersion,value.engines.frade as string)||!satisfies(options.apiVersion,value.engines.fradeApi as string))fail('ENGINE_INCOMPATIBLE','Package engines are incompatible with this Frade/API version',source)
  return value as unknown as ExtensionManifest
}
function theme(value:unknown, source:string, expected:ExtensionTheme['kind'], allowed:ReadonlySet<string>):Readonly<Record<string,string>> {
  const code='INVALID_THEME'
  if(!object(value)||!exact(value,['kind','colors'])||value.kind!==expected||!object(value.colors)||Object.keys(value.colors).length>allowed.size)fail(code,'Invalid native theme fields/kind/colors',source)
  const colors:Record<string,string>={}
  for(const [role,color]of Object.entries(value.colors)){
    if(!allowed.has(role)||typeof color!=='string'||!/^#[\da-f]{6}$/i.test(color))fail(code,'Unknown role or non-HEX6 native color',source)
    colors[role]=color
  }
  return Object.freeze(colors)
}
/** Independent bounds witness; mature parser remains responsible for ZIP structure. */
function directoryBoundary(bytes:Buffer):number {
  for(let offset=bytes.length-22;offset>=Math.max(0,bytes.length-22-65535);offset--){
    if(bytes.readUInt32LE(offset)!==0x06054b50||offset+22+bytes.readUInt16LE(offset+20)!==bytes.length)continue
    if(bytes.readUInt16LE(offset+4)||bytes.readUInt16LE(offset+6))fail('UNSUPPORTED_ARCHIVE','Multi-volume archives are unsupported')
    const count=bytes.readUInt16LE(offset+10),perDisk=bytes.readUInt16LE(offset+8),central=bytes.readUInt32LE(offset+16)
    if(count!==perDisk)fail('UNSUPPORTED_ARCHIVE','Split central directory is unsupported')
    if(central!==0xffffffff&&count!==0xffff){if(central+bytes.readUInt32LE(offset+12)!==offset)fail('INVALID_ARCHIVE','Invalid directory bounds');return central}
    const locator=offset-20
    if(locator<0||bytes.readUInt32LE(locator)!==0x07064b50)fail('INVALID_ARCHIVE','Missing ZIP64 locator')
    if(bytes.readUInt32LE(locator+4)||bytes.readUInt32LE(locator+16)!==1)fail('UNSUPPORTED_ARCHIVE','Multi-volume ZIP64 archive')
    const position=bytes.readBigUInt64LE(locator+8)
    if(position>BigInt(bytes.length-56))fail('INVALID_ARCHIVE','Unbounded ZIP64 position')
    const record=Number(position)
    if(bytes.readUInt32LE(record)!==0x06064b50||bytes.readUInt32LE(record+16)||bytes.readUInt32LE(record+20))fail('INVALID_ARCHIVE','Invalid ZIP64 record')
    const start=bytes.readBigUInt64LE(record+48),size=bytes.readBigUInt64LE(record+40),diskEntries=bytes.readBigUInt64LE(record+24),totalEntries=bytes.readBigUInt64LE(record+32)
    if(diskEntries!==totalEntries)fail('UNSUPPORTED_ARCHIVE','Split ZIP64 entries')
    if(start+size!==position||start>BigInt(Number.MAX_SAFE_INTEGER))fail('INVALID_ARCHIVE','Unbounded ZIP64 directory')
    return Number(start)
  }
  return fail('INVALID_ARCHIVE','Missing complete ZIP end record')
}
function localSizes(header:LocalFileHeader):{compressed:number;expanded:number} {
  let compressed=header.compressedSize,expanded=header.uncompressedSize
  if(compressed!==0xffffffff&&expanded!==0xffffffff)return {compressed,expanded}
  let offset=0,found=false
  while(offset+4<=header.extraField.length){
    const id=header.extraField.readUInt16LE(offset),length=header.extraField.readUInt16LE(offset+2);offset+=4
    if(offset+length>header.extraField.length)fail('HEADER_MISMATCH','Malformed local extra field')
    if(id===1){if(found)fail('HEADER_MISMATCH','Repeated local ZIP64 field');found=true;let cursor=offset
      for(const field of ['expanded','compressed']as const){if((field==='expanded'?expanded:compressed)!==0xffffffff)continue;if(cursor+8>offset+length)fail('HEADER_MISMATCH','Missing local ZIP64 size');const value=header.extraField.readBigUInt64LE(cursor);cursor+=8;if(value>BigInt(Number.MAX_SAFE_INTEGER))fail('SIZE_MISMATCH','Unsafe integer ZIP64 size');if(field==='expanded')expanded=Number(value);else compressed=Number(value)}
    }offset+=length
  }
  if(!found||offset!==header.extraField.length)fail('HEADER_MISMATCH','Invalid local ZIP64 sizes')
  return {compressed,expanded}
}
function headerAgreement(bytes:Buffer,entry:Entry,header:LocalFileHeader,boundary:number):readonly[number,number] {
  if(header.compressionMethod!==entry.compressionMethod||header.generalPurposeBitFlag!==entry.generalPurposeBitFlag||header.versionNeededToExtract!==entry.versionNeededToExtract||!header.fileName.equals(entry.fileNameRaw))fail('HEADER_MISMATCH','Local and central entry metadata disagree',entry.fileName)
  const sizes=localSizes(header),descriptor=(entry.generalPurposeBitFlag&8)!==0
  if(descriptor){if((header.crc32&&header.crc32!==entry.crc32)||(sizes.compressed&&sizes.compressed!==entry.compressedSize)||(sizes.expanded&&sizes.expanded!==entry.uncompressedSize))fail('HEADER_MISMATCH','Local descriptor hints disagree',entry.fileName)}
  else if(header.crc32!==entry.crc32||sizes.compressed!==entry.compressedSize||sizes.expanded!==entry.uncompressedSize)fail('HEADER_MISMATCH','Local CRC or sizes disagree',entry.fileName)
  let end=header.fileDataStart+entry.compressedSize
  if(!Number.isSafeInteger(end)||entry.relativeOffsetOfLocalHeader<0||header.fileDataStart<entry.relativeOffsetOfLocalHeader+30||end>boundary)fail('HEADER_MISMATCH','Entry data overlaps directory or archive bounds',entry.fileName)
  if(descriptor){
    let cursor=end;if(cursor+4>boundary)fail('HEADER_MISMATCH','Missing data descriptor',entry.fileName)
    if(bytes.readUInt32LE(cursor)===0x08074b50)cursor+=4
    const wide=header.compressedSize===0xffffffff||header.uncompressedSize===0xffffffff,needed=wide?20:12
    if(cursor+needed>boundary||bytes.readUInt32LE(cursor)!==entry.crc32)fail('HEADER_MISMATCH','Invalid data descriptor CRC',entry.fileName)
    const compressed=wide?bytes.readBigUInt64LE(cursor+4):BigInt(bytes.readUInt32LE(cursor+4)),expanded=wide?bytes.readBigUInt64LE(cursor+12):BigInt(bytes.readUInt32LE(cursor+8))
    if(compressed!==BigInt(entry.compressedSize)||expanded!==BigInt(entry.uncompressedSize))fail('HEADER_MISMATCH','Invalid data descriptor sizes',entry.fileName)
    end=cursor+needed
  }
  return [entry.relativeOffsetOfLocalHeader,end]
}
function parserError(error:unknown):PackageError {
  if(error instanceof PackageError)return error
  const message=error instanceof Error?error.message:String(error)
  if(/fileName|relative path|absolute path|backslash|invalid characters/.test(message))return new PackageError('UNSAFE_PATH',message)
  if(/size mismatch|not enough bytes|too many bytes|uncompressed size/.test(message))return new PackageError('SIZE_MISMATCH',message)
  return new PackageError('INVALID_ARCHIVE',message.slice(0,480))
}
/** Validates an owned immutable archive snapshot; no filesystem or executable hooks. */
export async function validatePackage(bytes:Uint8Array,options:ValidationOptions):Promise<PackageValidation> {
  try {
    if(bytes.byteLength>ARCHIVE_LIMITS.compressed)fail('ARCHIVE_LIMIT','Compressed archive exceeds50MiB')
    const owned=Buffer.from(bytes),boundary=directoryBoundary(owned),hash=createHash('sha256').update(owned).digest('hex')
    const zip=await fromBufferPromise(owned,{lazyEntries:true,strictFileNames:true,validateEntrySizes:true,autoClose:false,decodeStrings:true})
    const files=new Map<string,Uint8Array>(),names=new Set<string>(),nodes=new Map<string,'directory'|'file'>(),ranges:(readonly[number,number])[]=[]
    let expanded=0,count=0,compressed=0
    try {
      if(!Number.isSafeInteger(zip.entryCount)||zip.entryCount>ARCHIVE_LIMITS.entries)fail('ENTRY_LIMIT','ZIP entry count exceeds10000')
      for await(const entry of zip.eachEntry()){
        if(++count>ARCHIVE_LIMITS.entries)fail('ENTRY_LIMIT','ZIP entry count exceeds10000')
        if(entry.isEncrypted()||![0,8].includes(entry.compressionMethod)||(entry.generalPurposeBitFlag&~0x080e))fail('UNSUPPORTED_ARCHIVE','Encryption/compression/flags unsupported',entry.fileName)
        for(const number of [entry.compressedSize,entry.uncompressedSize,entry.relativeOffsetOfLocalHeader])if(!Number.isSafeInteger(number)||number<0)fail('SIZE_MISMATCH','Unbounded ZIP numeric value',entry.fileName)
        const mode=(entry.externalFileAttributes>>>16)&0xf000,directory=mode===0x4000||(mode===0&&entry.fileName.endsWith('/'))
        if((mode&&mode!==0x8000&&mode!==0x4000)||(entry.externalFileAttributes&0x400))fail('UNSAFE_ENTRY','Links/device/reparse entries unsupported',entry.fileName)
        const name=safePath(entry.fileName,directory),key=name.toLowerCase()
        if(names.has(key))fail('DUPLICATE_PATH','Case-insensitive duplicate entry',name)
        names.add(key)
        if(nodes.get(key)==='file'||(nodes.get(key)==='directory'&&!directory))fail('PATH_CONFLICT','File/ancestor path conflict',name)
        const parts=key.split('/');for(let i=1;i<parts.length;i++){const parent=parts.slice(0,i).join('/');if(nodes.get(parent)==='file')fail('PATH_CONFLICT','File shadows directory',name);nodes.set(parent,'directory')}
        nodes.set(key,directory?'directory':'file')
        if(entry.uncompressedSize>ARCHIVE_LIMITS.expanded-expanded)fail('EXPANDED_LIMIT','Expanded archive exceeds200MiB',name)
        if(entry.uncompressedSize>entry.compressedSize*ARCHIVE_LIMITS.ratio)fail('EXPANSION_RATIO','Entry expansion exceeds100',name)
        const header=await zip.readLocalFileHeaderPromise(entry),range=headerAgreement(owned,entry,header,boundary)
        if(ranges.some(([start,end])=>range[0]<end&&range[1]>start))fail('HEADER_MISMATCH','Aliased or overlapping entry headers/data',name)
        ranges.push(range)
        if(directory){if(entry.compressedSize||entry.uncompressedSize||entry.crc32)fail('UNSAFE_ENTRY','Directory carries file data',name);continue}
        const stream=await zip.openReadStreamPromise(entry),chunks:Buffer[]=[];let size=0,crc=0
        try {for await(const chunk of stream){const data=Buffer.from(chunk);size+=data.length;if(size>entry.uncompressedSize)fail('SIZE_MISMATCH','Stream exceeds declared bytes',name);if(expanded+size>ARCHIVE_LIMITS.expanded)fail('EXPANDED_LIMIT','Actual expanded bytes exceed200MiB',name);if(size>entry.compressedSize*ARCHIVE_LIMITS.ratio)fail('EXPANSION_RATIO','Actual stream expansion exceeds100',name);crc=crc32(data,crc);chunks.push(data)}}finally{stream.destroy()}
        if(size!==entry.uncompressedSize)fail('SIZE_MISMATCH','Actual entry byte count differs',name)
        if(crc!==entry.crc32)fail('CRC_MISMATCH','Actual CRC32 differs from directory',name)
        expanded+=size;compressed+=entry.compressedSize
        if(expanded>compressed*ARCHIVE_LIMITS.ratio)fail('EXPANSION_RATIO','Aggregate actual expansion exceeds100',name)
        files.set(name,Buffer.concat(chunks,size))
      }
      if(count!==zip.entryCount)fail('INVALID_ARCHIVE','Directory entry count differs')
    }finally{zip.close()}
    const parsed=manifest(json(files.get('package.json'),'package.json','INVALID_MANIFEST'),options),id=parsed.publisher+'.'+parsed.name,allowed=new Set(options.themeRoles)
    if(!allowed.size||allowed.size>256)fail('RUNTIME_INVALID','Canonical native theme roles unavailable')
    const themes=parsed.contributes.themes.map(entry=>Object.freeze({id:id+'/'+entry.id,label:entry.label,kind:entry.kind,path:entry.path,colors:theme(json(files.get(entry.path),entry.path,'INVALID_THEME'),entry.path,entry.kind,allowed)}))
    return {status:'VALID',id,sha256:hash,manifest:parsed,themes:Object.freeze(themes),files,expandedBytes:expanded}
  }catch(error){const rejected=parserError(error);return {status:'REJECTED',diagnostic:{code:rejected.code,message:rejected.message.slice(0,480),...(rejected.source?{source:rejected.source}:{})}}}
}