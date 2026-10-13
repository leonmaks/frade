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
  descriptor?: boolean
}
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (0xedb88320 & -(value & 1))
  return value >>> 0
})
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255]
  return (crc ^ 0xffffffff) >>> 0
}
/** Independent malicious ZIP builder: writes intentional header disagreements. */
export function zipFixture(entries: readonly ZipFixtureEntry[]): Buffer {
  const local: Buffer[] = [],
    central: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const data = Buffer.from(entry.data),
      name = Buffer.from(entry.name),
      localName = Buffer.from(entry.localName ?? entry.name)
    const method = entry.method ?? 0,
      compressed = method === 8 ? deflateRawSync(data) : data
    const crc = entry.crc ?? crc32(data),
      flags = (entry.flags ?? 0x800) | (entry.descriptor ? 8 : 0),
      size = entry.declaredSize ?? data.length
    const head = Buffer.alloc(30)
    head.writeUInt32LE(0x04034b50)
    head.writeUInt16LE(20, 4)
    head.writeUInt16LE(flags, 6)
    head.writeUInt16LE(method, 8)
    head.writeUInt32LE(entry.descriptor ? 0 : crc, 14)
    head.writeUInt32LE(entry.descriptor ? 0 : compressed.length, 18)
    head.writeUInt32LE(entry.descriptor ? 0 : size, 22)
    head.writeUInt16LE(localName.length, 26)
    local.push(head, localName, compressed)
    const descriptor = entry.descriptor ? Buffer.alloc(16) : Buffer.alloc(0)
    if (entry.descriptor) {
      descriptor.writeUInt32LE(0x08074b50)
      descriptor.writeUInt32LE(crc, 4)
      descriptor.writeUInt32LE(compressed.length, 8)
      descriptor.writeUInt32LE(size, 12)
      local.push(descriptor)
    }
    const dir = Buffer.alloc(46)
    dir.writeUInt32LE(0x02014b50)
    dir.writeUInt16LE(0x314, 4)
    dir.writeUInt16LE(20, 6)
    dir.writeUInt16LE(flags, 8)
    dir.writeUInt16LE(method, 10)
    dir.writeUInt32LE(crc, 16)
    dir.writeUInt32LE(compressed.length, 20)
    dir.writeUInt32LE(size, 24)
    dir.writeUInt16LE(name.length, 28)
    dir.writeUInt32LE(((entry.mode ?? 0o100644) << 16) >>> 0, 38)
    dir.writeUInt32LE(offset, 42)
    central.push(dir, name)
    offset += head.length + localName.length + compressed.length + descriptor.length
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, directory, end])
}
/** Read only the trusted original fixture after its known SHA is checked by generator. */
export function originalFixtureEntries(bytes: Buffer): ZipFixtureEntry[] {
  const end = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  const count = bytes.readUInt16LE(end + 10),
    result: ZipFixtureEntry[] = []
  let cursor = bytes.readUInt32LE(end + 16)
  for (let index = 0; index < count; index++) {
    if (bytes.readUInt32LE(cursor) !== 0x02014b50) throw Error('Invalid trusted fixture directory')
    const method = bytes.readUInt16LE(cursor + 10),
      size = bytes.readUInt32LE(cursor + 20),
      nameLength = bytes.readUInt16LE(cursor + 28)
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString(),
      offset = bytes.readUInt32LE(cursor + 42)
    const start = offset + 30 + bytes.readUInt16LE(offset + 26) + bytes.readUInt16LE(offset + 28),
      compressed = bytes.subarray(start, start + size)
    const data = method === 8 ? inflateRawSync(compressed) : compressed
    if (
      data.length !== bytes.readUInt32LE(cursor + 24) ||
      crc32(data) !== bytes.readUInt32LE(cursor + 16)
    )
      throw Error('Invalid trusted fixture CRC/size')
    result.push({ name, data })
    cursor += 46 + nameLength + bytes.readUInt16LE(cursor + 30) + bytes.readUInt16LE(cursor + 32)
  }
  return result
}

export function zip64End(bytes: Buffer): Buffer {
  const end = Buffer.from(bytes.subarray(bytes.length - 22)),
    position = bytes.length - 22,
    record = Buffer.alloc(56),
    locator = Buffer.alloc(20)
  record.writeUInt32LE(0x06064b50)
  record.writeBigUInt64LE(44n, 4)
  record.writeUInt16LE(45, 12)
  record.writeUInt16LE(45, 14)
  record.writeBigUInt64LE(BigInt(end.readUInt16LE(8)), 24)
  record.writeBigUInt64LE(BigInt(end.readUInt16LE(10)), 32)
  record.writeBigUInt64LE(BigInt(end.readUInt32LE(12)), 40)
  record.writeBigUInt64LE(BigInt(end.readUInt32LE(16)), 48)
  locator.writeUInt32LE(0x07064b50)
  locator.writeBigUInt64LE(BigInt(position), 8)
  locator.writeUInt32LE(1, 16)
  end.writeUInt16LE(0xffff, 8)
  end.writeUInt16LE(0xffff, 10)
  end.writeUInt32LE(0xffffffff, 12)
  end.writeUInt32LE(0xffffffff, 16)
  return Buffer.concat([bytes.subarray(0, position), record, locator, end])
}
