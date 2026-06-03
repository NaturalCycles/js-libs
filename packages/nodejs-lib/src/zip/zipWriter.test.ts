import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Readable, Writable } from 'node:stream'
import type { UnixTimestamp } from '@naturalcycles/js-lib/types'
import { expect, test } from 'vitest'
import { zip2 } from './zip2.js'
import { openZipBuffer } from './zipReader.js'
import { createZipBuffer, zipPaths, ZipWriter } from './zipWriter.js'

test('round-trips stored, deflated, empty and directory entries through the reader', async () => {
  const text = 'The quick brown fox '.repeat(100)
  const buf = await createZipBuffer([
    { name: 'hello.txt', content: Buffer.from('Hello, world!'), compress: false },
    { name: 'data.txt', content: Buffer.from(text) },
    { name: 'empty.txt', content: Buffer.alloc(0) },
    { name: 'sub' }, // directory (no content)
  ])

  const zip = await openZipBuffer(buf)
  expect(zip.entries.map(e => e.fileName)).toEqual(['hello.txt', 'data.txt', 'empty.txt', 'sub/'])

  const [hello, data, empty, dir] = zip.entries
  expect(hello!.compressionMethod).toBe(0) // stored
  expect(data!.compressionMethod).toBe(8) // deflated
  expect(data!.compressedSize).toBeLessThan(data!.uncompressedSize)
  expect(dir!.isDirectory).toBe(true)

  expect((await zip.readEntry(hello!)).toString()).toBe('Hello, world!')
  expect((await zip.readEntry(data!)).toString()).toBe(text)
  expect(await zip.readEntry(empty!)).toHaveLength(0)

  await zip.close()
})

test('addStream writes a streamed entry with a data descriptor', async () => {
  const text = 'streaming '.repeat(1000)
  const chunks = [Buffer.from('streaming '.repeat(400)), Buffer.from('streaming '.repeat(600))]

  const { writer, result } = memoryWriter()
  await writer.addStream(Readable.from(chunks), 'big.txt')
  await writer.finalize()

  const zip = await openZipBuffer(await result())
  const entry = zip.entries[0]!
  expect(entry.fileName).toBe('big.txt')
  // bit 3 set => sizes/crc came from a trailing data descriptor
  // oxlint-disable-next-line no-bitwise -- checking a single general-purpose bit flag
  expect(entry.generalPurposeBitFlag & 0x8).toBe(0x8)
  expect(entry.compressionMethod).toBe(8)
  expect(entry.uncompressedSize).toBe(text.length)

  const stream = await zip.openReadStream(entry)
  expect((await streamToBuffer(stream)).toString()).toBe(text)
  // readEntry also validates the CRC-32 and uncompressed size.
  expect((await zip.readEntry(entry)).toString()).toBe(text)

  await zip.close()
})

test('addFile streams a file from disk, defaulting name/mtime from it', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'zipWriter-'))
  try {
    const srcPath = path.join(dir, 'source.txt')
    const content = 'X'.repeat(5000)
    await writeFile(srcPath, content)
    const mtime = (await stat(srcPath)).mtime

    const { writer, result } = memoryWriter()
    await writer.addFile(srcPath)
    await writer.finalize()

    const zip = await openZipBuffer(await result())
    const entry = zip.entries[0]!
    expect(entry.fileName).toBe('source.txt')
    expect((await zip.readEntry(entry)).toString()).toBe(content)
    expect(entry.lastModified).toBe(Math.floor(mtime.getTime() / 1000))
    await zip.close()
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('createZip writes to disk and extractZip round-trips files and directories', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'zipWriter-'))
  try {
    const zipPath = path.join(dir, 'archive.zip')
    const zip = zip2.createZip(zipPath)
    await zip.addBuffer(Buffer.from('AAA'), 'a.txt', { compress: false })
    await zip.addBuffer(Buffer.from('BBB'.repeat(100)), 'nested/b.txt')
    await zip.addDirectory('emptydir')
    await zip.finalize()

    const outDir = path.join(dir, 'out')
    const entries = await zip2.extractZipFileToDirectory(zipPath, outDir)
    expect(entries.map(e => e.fileName)).toEqual(['a.txt', 'nested/b.txt', 'emptydir/'])

    expect(await readFile(path.join(outDir, 'a.txt'), 'utf8')).toBe('AAA')
    expect(await readFile(path.join(outDir, 'nested/b.txt'), 'utf8')).toBe('BBB'.repeat(100))
    expect((await stat(path.join(outDir, 'emptydir'))).isDirectory()).toBe(true)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('preserves utf-8 file names', async () => {
  const buf = await createZipBuffer([{ name: 'café/résumé.txt', content: Buffer.from('x') }])
  const zip = await openZipBuffer(buf)
  expect(zip.entries.map(e => e.fileName)).toEqual(['café/résumé.txt'])
  await zip.close()
})

test('round-trips mtime via the Info-ZIP extended timestamp', async () => {
  const mtime = Math.floor(new Date('2021-06-15T10:30:45.000Z').getTime() / 1000) as UnixTimestamp
  const buf = await createZipBuffer([{ name: 'x.txt', content: Buffer.from('x'), mtime }])
  const zip = await openZipBuffer(buf)
  expect(zip.entries[0]!.lastModified).toBe(mtime)
  await zip.close()
})

test('round-trips archive and per-entry comments', async () => {
  const { writer, result } = memoryWriter()
  await writer.addBuffer(Buffer.from('x'), 'x.txt', { comment: 'entry comment' })
  await writer.finalize({ comment: 'archive comment' })

  const zip = await openZipBuffer(await result())
  expect(zip.comment).toBe('archive comment')
  expect(zip.entries[0]!.comment).toBe('entry comment')
  await zip.close()
})

test('round-trips a forced-ZIP64 entry', async () => {
  const content = 'hello zip64'
  const buf = await createZipBuffer([
    { name: 'z.txt', content: Buffer.from(content), compress: false, forceZip64: true },
  ])

  // The ZIP64 extended information extra field (id 0x0001, data size 24 = 0x18) must be present.
  const hasZip64ExtraField = buf.includes(ZIP64_EIEF_HEADER)
  expect(hasZip64ExtraField).toBe(true)

  const zip = await openZipBuffer(buf)
  const entry = zip.entries[0]!
  // The 32-bit size fields hold the 0xffffffff sentinel; the real size is read
  // from the ZIP64 extra field.
  expect(entry.uncompressedSize).toBe(content.length)
  expect((await zip.readEntry(entry)).toString()).toBe(content)
  await zip.close()
})

test('round-trips a forced-ZIP64 end-of-central-directory', async () => {
  const { writer, result } = memoryWriter()
  await writer.addBuffer(Buffer.from('a'), 'a.txt')
  await writer.addBuffer(Buffer.from('b'), 'b.txt')
  await writer.finalize({ forceZip64: true })

  const buf = await result()
  // ZIP64 end-of-central-directory record signature must be present.
  const hasZip64Eocd = buf.includes(ZIP64_EOCDR_SIGNATURE)
  expect(hasZip64Eocd).toBe(true)

  const zip = await openZipBuffer(buf)
  expect(zip.entries.map(e => e.fileName)).toEqual(['a.txt', 'b.txt'])
  expect((await zip.readEntry(zip.entries[1]!)).toString()).toBe('b')
  await zip.close()
})

test('does not emit ZIP64 records for a small archive', async () => {
  const buf = await createZipBuffer([{ name: 'a.txt', content: Buffer.from('a') }])
  const hasZip64Eocd = buf.includes(ZIP64_EOCDR_SIGNATURE)
  expect(hasZip64Eocd).toBe(false)
})

test('finalizes automatically with `await using` (AsyncDisposable)', async () => {
  const chunks: Buffer[] = []
  const sink = new Writable({
    write(chunk: Buffer, _enc, cb) {
      chunks.push(Buffer.from(chunk))
      cb()
    },
  })
  {
    await using zip = new ZipWriter(sink)
    await zip.addBuffer(Buffer.from('hi'), 'a.txt')
  }
  const zip = await openZipBuffer(Buffer.concat(chunks))
  expect((await zip.readEntry(zip.entries[0]!)).toString()).toBe('hi')
  await zip.close()
})

test('rejects path traversal and absolute names', async () => {
  await expect(
    createZipBuffer([{ name: '../evil.txt', content: Buffer.from('x') }]),
  ).rejects.toThrow(/invalid relative path/)
  await expect(
    createZipBuffer([{ name: '/etc/passwd', content: Buffer.from('x') }]),
  ).rejects.toThrow(/absolute path/)
})

test('rejects adding entries after finalize', async () => {
  const { writer } = memoryWriter()
  await writer.addBuffer(Buffer.from('x'), 'x.txt')
  await writer.finalize()
  await expect(writer.addBuffer(Buffer.from('y'), 'y.txt')).rejects.toThrow(/finalized/)
})

test('rejects an archive comment containing the EOCD signature', async () => {
  const { writer } = memoryWriter()
  await writer.addBuffer(Buffer.from('x'), 'x.txt')
  await expect(writer.finalize({ comment: 'PK\u0005\u0006' })).rejects.toThrow(
    /end-of-central-directory/,
  )
})

test('zipFiles zips a directory recursively, preserving the directory name', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'zipWriter-'))
  try {
    const srcDir = path.join(dir, 'photos')
    await mkdir(path.join(srcDir, 'nested'), { recursive: true })
    await writeFile(path.join(srcDir, 'a.txt'), 'AAA')
    await writeFile(path.join(srcDir, 'nested', 'b.txt'), 'BBB')

    const zipPath = path.join(dir, 'photos.zip')
    await zipPaths([srcDir], zipPath)

    const outDir = path.join(dir, 'out')
    const entries = await zip2.extractZipFileToDirectory(zipPath, outDir)
    expect(entries.map(e => e.fileName)).toEqual(['photos/a.txt', 'photos/nested/b.txt'])
    expect(await readFile(path.join(outDir, 'photos/a.txt'), 'utf8')).toBe('AAA')
    expect(await readFile(path.join(outDir, 'photos/nested/b.txt'), 'utf8')).toBe('BBB')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('zipFiles zips an explicit list of files using their basenames', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'zipWriter-'))
  try {
    await writeFile(path.join(dir, 'a.txt'), 'AAA')
    await writeFile(path.join(dir, 'b.txt'), 'BBB')

    const zipPath = path.join(dir, 'out.zip')
    await zipPaths([path.join(dir, 'a.txt'), path.join(dir, 'b.txt')], zipPath)

    const zip = await openZipBuffer(await readFile(zipPath))
    expect(zip.entries.map(e => e.fileName)).toEqual(['a.txt', 'b.txt'])
    await zip.close()
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('zipFiles baseDir places directory contents at the archive root', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'zipWriter-'))
  try {
    const srcDir = path.join(dir, 'photos')
    await mkdir(path.join(srcDir, 'nested'), { recursive: true })
    await writeFile(path.join(srcDir, 'a.txt'), 'AAA')
    await writeFile(path.join(srcDir, 'nested', 'b.txt'), 'BBB')

    const zipPath = path.join(dir, 'photos.zip')
    await zipPaths([srcDir], zipPath, { baseDir: srcDir })

    const zip = await openZipBuffer(await readFile(zipPath))
    expect(zip.entries.map(e => e.fileName)).toEqual(['a.txt', 'nested/b.txt'])
    await zip.close()
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('zipFiles removes the partial archive if an input does not exist', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'zipWriter-'))
  try {
    const zipPath = path.join(dir, 'out.zip')
    await expect(zipPaths([path.join(dir, 'does-not-exist')], zipPath)).rejects.toThrow(/ENOENT/)
    await expect(stat(zipPath)).rejects.toThrow(/ENOENT/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

// ZIP64 end-of-central-directory record signature ("PK\x06\x06").
const ZIP64_EOCDR_SIGNATURE = Buffer.from([0x50, 0x4b, 0x06, 0x06])
// ZIP64 extended information extra field header: id 0x0001, data size 24 (0x18).
const ZIP64_EIEF_HEADER = Buffer.from([0x01, 0x00, 0x18, 0x00])

function memoryWriter(): { writer: ZipWriter; result: () => Promise<Buffer> } {
  const chunks: Buffer[] = []
  const sink = new Writable({
    write(chunk: Buffer, _enc, cb) {
      chunks.push(Buffer.from(chunk))
      cb()
    },
  })
  const writer = new ZipWriter(sink)
  return { writer, result: async () => Buffer.concat(chunks) }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks)
}
