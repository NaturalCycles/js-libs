import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { Readable } from 'node:stream'
import zlib from 'node:zlib'
import { expect, test } from 'vitest'
import { zip2 } from './zip2.js'
import { openZip, openZipBuffer } from './zipReader.js'
import type { ZipReader } from './zipReader.js'

test('reads entries from a buffer', async () => {
  const zip = await openZipBuffer(
    makeZip([
      { name: 'hello.txt', content: Buffer.from('Hello, world!') },
      { name: 'data.json', content: Buffer.from('{"a":1}'.repeat(50)), deflate: true },
      { name: 'sub/' },
    ]),
  )

  expect(zip.entries.map(e => e.fileName)).toEqual(['hello.txt', 'data.json', 'sub/'])

  const [hello, data, dir] = zip.entries
  expect(hello!.compressionMethod).toBe(0)
  expect(hello!.uncompressedSize).toBe(13)
  expect(hello!.isDirectory).toBe(false)
  expect(hello!.lastModified).toBe(Math.floor(new Date(2020, 0, 1, 12, 0, 0).getTime() / 1000))
  expect(data!.compressionMethod).toBe(8)
  expect(dir!.isDirectory).toBe(true)

  await zip.close()
})

test('readEntry returns decompressed content and validates crc', async () => {
  const text = 'The quick brown fox '.repeat(100)
  const zip = await openZipBuffer(
    makeZip([
      { name: 'stored.txt', content: Buffer.from(text) },
      { name: 'deflated.txt', content: Buffer.from(text), deflate: true },
    ]),
  )

  for (const entry of zip.entries) {
    const buf = await zip.readEntry(entry)
    expect(buf.toString()).toBe(text)
  }

  await zip.close()
})

test('openReadStream streams decompressed content', async () => {
  const text = 'streaming '.repeat(1000)
  const zip = await openZipBuffer(
    makeZip([{ name: 'big.txt', content: Buffer.from(text), deflate: true }]),
  )

  const stream = await zip.openReadStream(zip.entries[0]!)
  expect((await streamToBuffer(stream)).toString()).toBe(text)

  await zip.close()
})

test('handles empty file entries', async () => {
  const zip = await openZipBuffer(makeZip([{ name: 'empty.txt', content: Buffer.alloc(0) }]))

  expect(await zip.readEntry(zip.entries[0]!)).toHaveLength(0)
  expect(await streamToBuffer(await zip.openReadStream(zip.entries[0]!))).toHaveLength(0)

  await zip.close()
})

test('opens from a file path and extracts to disk', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'zipReader-'))
  try {
    const zipPath = path.join(dir, 'test.zip')
    await writeFile(
      zipPath,
      makeZip([
        { name: 'a.txt', content: Buffer.from('AAA') },
        { name: 'nested/b.txt', content: Buffer.from('BBB'.repeat(100)), deflate: true },
        { name: 'emptydir/' },
      ]),
    )

    const zip = await openZip(zipPath)
    expect(zip.entries).toHaveLength(3)
    expect((await zip.readEntry(zip.entries[0]!)).toString()).toBe('AAA')
    await zip.close()

    const outDir = path.join(dir, 'out')
    const entries = await zip2.extractZipFileToDirectory(zipPath, outDir)

    expect(entries).toHaveLength(3)
    expect(await readFile(path.join(outDir, 'a.txt'), 'utf8')).toBe('AAA')
    expect(await readFile(path.join(outDir, 'nested/b.txt'), 'utf8')).toBe('BBB'.repeat(100))
    expect((await stat(path.join(outDir, 'emptydir'))).isDirectory()).toBe(true)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('decodes utf-8 file names', async () => {
  const zip = await openZipBuffer(
    makeZip([{ name: 'café/résumé.txt', content: Buffer.from('x'), gpFlag: 0x800 }]),
  )

  expect(zip.entries[0]!.fileName).toBe('café/résumé.txt')

  await zip.close()
})

test('decodes utf-8 file names even without the utf-8 flag set', async () => {
  // Info-ZIP and Linux `zip` often store UTF-8 names without setting bit 0x800.
  const zip = await openZipBuffer(makeZip([{ name: 'náïve.txt', content: Buffer.from('x') }]))

  expect(zip.entries[0]!.fileName).toBe('náïve.txt')

  await zip.close()
})

test('extracts multiple entries from a file, reusing the handle after a deflated entry', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'zipReader-'))
  try {
    const zipPath = path.join(dir, 'multi.zip')
    await writeFile(
      zipPath,
      makeZip([
        { name: 'first.txt', content: Buffer.from('Z'.repeat(500)), deflate: true },
        { name: 'second.txt', content: Buffer.from('second') },
        { name: 'third.txt', content: Buffer.from('W'.repeat(300)), deflate: true },
      ]),
    )

    const outDir = path.join(dir, 'out')
    await zip2.extractZipFileToDirectory(zipPath, outDir)

    expect(await readFile(path.join(outDir, 'first.txt'), 'utf8')).toBe('Z'.repeat(500))
    expect(await readFile(path.join(outDir, 'second.txt'), 'utf8')).toBe('second')
    expect(await readFile(path.join(outDir, 'third.txt'), 'utf8')).toBe('W'.repeat(300))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('rejects path traversal via .. segments', async () => {
  await expect(
    openZipBuffer(makeZip([{ name: '../evil.txt', content: Buffer.from('x') }])),
  ).rejects.toThrow(/invalid relative path/)
})

test('rejects absolute paths', async () => {
  await expect(
    openZipBuffer(makeZip([{ name: '/etc/passwd', content: Buffer.from('x') }])),
  ).rejects.toThrow(/absolute path/)
})

test('rejects reading encrypted entries', async () => {
  const zip = await openZipBuffer(
    makeZip([{ name: 'secret.txt', content: Buffer.from('x'), gpFlag: 0x1 }]),
  )

  expect(zip.entries[0]!.isEncrypted).toBe(true)
  await expect(zip.readEntry(zip.entries[0]!)).rejects.toThrow(/encrypted/)

  await zip.close()
})

test('rejects non-zip input', async () => {
  await expect(
    openZipBuffer(Buffer.from('this is definitely not a zip file at all')),
  ).rejects.toThrow(/end of central directory/)
})

test('detects crc mismatch in corrupted data', async () => {
  const buf = makeZip([{ name: 'x.txt', content: Buffer.from('hello') }])
  // Stored data starts after the 30-byte local header + 5-byte name "x.txt".
  buf[35] = 255 - buf[35]!
  const zip = await openZipBuffer(buf)

  await expect(zip.readEntry(zip.entries[0]!)).rejects.toThrow(/crc32 mismatch/)

  await zip.close()
})

test('closes automatically with `await using` (AsyncDisposable)', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'zipReader-'))
  try {
    const zipPath = path.join(dir, 'using.zip')
    await writeFile(zipPath, makeZip([{ name: 'a.txt', content: Buffer.from('hi') }]))

    let captured: ZipReader | undefined
    {
      await using zip = await openZip(zipPath)
      captured = zip
      expect((await zip.readEntry(zip.entries[0]!)).toString()).toBe('hi')
    }

    // The file handle was closed on scope exit, so further reads must fail.
    await expect(captured.readEntry(captured.entries[0]!)).rejects.toThrow(/closed/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks)
}

interface ZipInput {
  name: string
  content?: Buffer
  deflate?: boolean
  gpFlag?: number
}

const DOS_DATE = 0x5021 // 2020-01-01
const DOS_TIME = 0x6000 // 12:00:00

/**
 * Build a minimal, valid zip archive in memory (no zip64, no comments),
 * supporting stored (method 0) and deflate (method 8) entries.
 */
function makeZip(inputs: ZipInput[]): Buffer {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  for (const input of inputs) {
    const content = input.content ?? Buffer.alloc(0)
    const nameBuf = Buffer.from(input.name, 'utf8')
    const crc = zlib.crc32(content)
    const method = input.deflate ? 8 : 0
    const compressed = input.deflate ? zlib.deflateRawSync(content) : content
    const gpFlag = input.gpFlag ?? 0
    const localOffset = offset

    const lfh = Buffer.alloc(30)
    lfh.writeUInt32LE(0x04034b50, 0)
    lfh.writeUInt16LE(20, 4)
    lfh.writeUInt16LE(gpFlag, 6)
    lfh.writeUInt16LE(method, 8)
    lfh.writeUInt16LE(DOS_TIME, 10)
    lfh.writeUInt16LE(DOS_DATE, 12)
    lfh.writeUInt32LE(crc, 14)
    lfh.writeUInt32LE(compressed.length, 18)
    lfh.writeUInt32LE(content.length, 22)
    lfh.writeUInt16LE(nameBuf.length, 26)
    lfh.writeUInt16LE(0, 28)
    localParts.push(lfh, nameBuf, compressed)
    offset += 30 + nameBuf.length + compressed.length

    const cdh = Buffer.alloc(46)
    cdh.writeUInt32LE(0x02014b50, 0)
    cdh.writeUInt16LE(20, 4)
    cdh.writeUInt16LE(20, 6)
    cdh.writeUInt16LE(gpFlag, 8)
    cdh.writeUInt16LE(method, 10)
    cdh.writeUInt16LE(DOS_TIME, 12)
    cdh.writeUInt16LE(DOS_DATE, 14)
    cdh.writeUInt32LE(crc, 16)
    cdh.writeUInt32LE(compressed.length, 20)
    cdh.writeUInt32LE(content.length, 24)
    cdh.writeUInt16LE(nameBuf.length, 28)
    cdh.writeUInt16LE(0, 30)
    cdh.writeUInt16LE(0, 32)
    cdh.writeUInt16LE(0, 34)
    cdh.writeUInt16LE(0, 36)
    cdh.writeUInt32LE(0, 38)
    cdh.writeUInt32LE(localOffset, 42)
    centralParts.push(cdh, nameBuf)
  }

  const centralDirectory = Buffer.concat(centralParts)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(inputs.length, 8)
  eocd.writeUInt16LE(inputs.length, 10)
  eocd.writeUInt32LE(centralDirectory.length, 12)
  eocd.writeUInt32LE(offset, 16)

  return Buffer.concat([...localParts, centralDirectory, eocd])
}
