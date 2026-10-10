import { deflateRawSync, inflateRawSync } from 'node:zlib'
export interface ZipFixtureEntry {
  name: string
  data: Uint8Array | string
  method?: number
  flags?: number
  mode?: number
  crc?: number
  localName?: string
  declaredSize?: number
}
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}
/** Independent malicious ZIP builder: writes intentional header disagreements. */
export function zipFixture(entries: readonly ZipFixtureEntry[]): Buffer {
  const local: Buffer[] = [], central: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const data = Buffer.from(entry.data), name = Buffer.from(entry.name), localName = Buffer.from(entry.localName ?? entry.name)
    const method = entry.method ?? 0, compressed = method === 8 ? deflateRawSync(data) : data
    const crc = entry.crc ?? crc32(data), flags = entry.flags ?? 0x800, size = entry.declaredSize ?? data.length
    const head = Buffer.alloc(30)
    head.writeUInt32LE(0x04034b50); head.writeUInt16LE(20,4); head.writeUInt16LE(flags,6); head.writeUInt16LE(method,8)
    head.writeUInt32LE(crc,14); head.writeUInt32LE(compressed.length,18); head.writeUInt32LE(size,22); head.writeUInt16LE(localName.length,26)
    local.push(head,localName,compressed)
    const dir = Buffer.alloc(46)
    dir.writeUInt32LE(0x02014b50); dir.writeUInt16LE(0x314,4); dir.writeUInt16LE(20,6); dir.writeUInt16LE(flags,8); dir.writeUInt16LE(method,10)
    dir.writeUInt32LE(crc,16); dir.writeUInt32LE(compressed.length,20); dir.writeUInt32LE(size,24); dir.writeUInt16LE(name.length,28)
    dir.writeUInt32LE(((entry.mode ?? 0o100644) << 16) >>> 0,38); dir.writeUInt32LE(offset,42)
    central.push(dir,name); offset += head.length + localName.length + compressed.length
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length,8); end.writeUInt16LE(entries.length,10)
  end.writeUInt32LE(directory.length,12); end.writeUInt32LE(offset,16)
  return Buffer.concat([...local,directory,end])
}
/** Read only the trusted original fixture after its known SHA is checked by generator. */
export function originalFixtureEntries(bytes: Buffer): ZipFixtureEntry[] {
  const end = bytes.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]))
  const count=bytes.readUInt16LE(end+10), result: ZipFixtureEntry[]=[]
  let cursor=bytes.readUInt32LE(end+16)
  for(let index=0;index<count;index++) {
    if(bytes.readUInt32LE(cursor)!==0x02014b50) throw Error('Invalid trusted fixture directory')
    const method=bytes.readUInt16LE(cursor+10), size=bytes.readUInt32LE(cursor+20), nameLength=bytes.readUInt16LE(cursor+28)
    const name=bytes.subarray(cursor+46,cursor+46+nameLength).toString(), offset=bytes.readUInt32LE(cursor+42)
    const start=offset+30+bytes.readUInt16LE(offset+26)+bytes.readUInt16LE(offset+28), compressed=bytes.subarray(start,start+size)
    const data=method===8?inflateRawSync(compressed):compressed
    if(data.length!==bytes.readUInt32LE(cursor+24)||crc32(data)!==bytes.readUInt32LE(cursor+16)) throw Error('Invalid trusted fixture CRC/size')
    result.push({name,data});cursor+=46+nameLength+bytes.readUInt16LE(cursor+30)+bytes.readUInt16LE(cursor+32)
  }
  return result
}
