import { describe, expect, test } from 'vitest'
import { runCommonDaoTest, runCommonDBTest, TEST_TABLE } from '../testing/index.js'
import { InMemoryDB } from './inMemory.db.js'

const db = new InMemoryDB()

describe('runCommonDBTest', async () => {
  await runCommonDBTest(db)
})

describe('runCommonDaoTest', async () => {
  await runCommonDaoTest(db)
})

test('saveBatch clones and restores top-level Buffers, isolated from the caller', async () => {
  const buf = Buffer.from('zstd-compressed-data-here')
  const row = { id: 'id1', __compressed: buf, other: 'field' }

  await db.saveBatch(TEST_TABLE, [row])

  // The input row must not be mutated by saving
  expect(row.__compressed).toBe(buf)
  expect(row).toEqual({ id: 'id1', __compressed: buf, other: 'field' })

  const [loaded] = await db.getByIds<typeof row>(TEST_TABLE, ['id1'])
  expect(Buffer.isBuffer(loaded!.__compressed)).toBe(true)
  expect(loaded!.__compressed.equals(buf)).toBe(true)
  expect(loaded!.other).toBe('field')

  // Stored buffer must be a copy: mutating the caller's buffer must not affect stored data
  buf[0] = 0
  const [loaded2] = await db.getByIds<typeof row>(TEST_TABLE, ['id1'])
  expect(loaded2!.__compressed.toString()).toBe('zstd-compressed-data-here')
})

test('saveBatch stores nested Buffers and Buffer-shaped plain objects in their json form', async () => {
  // Known accepted limitation: only top-level Buffers are preserved as Buffers.
  // Nested Buffers, and plain objects shaped like a serialized Buffer,
  // are stored in Buffer's json form (no bufferReviver applied).
  const row = {
    id: 'id2',
    nested: { buf: Buffer.from('ab') },
    fakeBuf: { type: 'Buffer', data: [97, 98, 99] },
  }
  await db.saveBatch(TEST_TABLE, [row])

  const [loaded] = await db.getByIds<any>(TEST_TABLE, ['id2'])
  expect(loaded.nested.buf).toEqual({ type: 'Buffer', data: [97, 98] })
  expect(Buffer.isBuffer(loaded.nested.buf)).toBe(false)
  expect(loaded.fakeBuf).toEqual({ type: 'Buffer', data: [97, 98, 99] })
  expect(Buffer.isBuffer(loaded.fakeBuf)).toBe(false)
})

interface PatchTestRow {
  id: string
  a: number
  b: number
}

test('patchById patches existing row and throws on missing row', async () => {
  await db.saveBatch(TEST_TABLE, [{ id: 'id3', a: 1, b: 2 }])

  await db.patchById<PatchTestRow>(TEST_TABLE, 'id3', { b: 3 })
  const [loaded] = await db.getByIds<PatchTestRow>(TEST_TABLE, ['id3'])
  expect(loaded).toMatchObject({ id: 'id3', a: 1, b: 3 })

  await expect(db.patchById<PatchTestRow>(TEST_TABLE, 'nonExistingId', { b: 3 })).rejects.toThrow(
    `entity doesn't exist`,
  )
})

// test('persistence', async () => {
//   const testItems = createTestItemsDBM(50)
//
//   db.cfg.persistenceEnabled = true
//   // db.cfg.persistZip = false
//
//   await db.resetCache()
//   await db.saveBatch(TEST_TABLE, testItems)
//   const data1 = db.getDataSnapshot()
//
//   await db.flushToDisk()
//
//   await db.restoreFromDisk()
//   const data2 = db.getDataSnapshot()
//
//   expect(data2).toEqual(data1) // same data restored
//
//   // cleanup
//   await db.resetCache()
//   await db.flushToDisk()
// })
