import { TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { afterAll, describe, expect, test, vi } from 'vitest'
import { DatastoreDB, indexesToExcludeFromIndexes } from './datastore.db.js'

afterAll(() => {
  process.env['APP_ENV'] = 'test' // restore original value
})

test('should throw on missing id', async () => {
  vi.stubEnv('APP_ENV', 'abc') // to not throw on APP_ENV=test check

  const db = new DatastoreDB()
  // const ds = db.ds()

  // Should not throw here
  await db.saveBatch(TEST_TABLE, [])

  await expect(
    db.saveBatch(TEST_TABLE, [{ k: 'k' } as any]),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: Cannot save "TEST_TABLE" entity without "id"]`,
  )
})

test('can load datastore', async () => {
  vi.stubEnv('APP_ENV', 'abc') // to not throw on APP_ENV=test check

  const db = new DatastoreDB()
  const ds = db.ds()
  expect(ds.KEY.description).toBe('KEY')
})

describe('indexesToExcludeFromIndexes', () => {
  test('flat object, all properties indexed', () => {
    const data = { name: 'John', age: 30 }
    const result = indexesToExcludeFromIndexes(data, ['name', 'age'])
    expect(result).toEqual([])
  })

  test('flat object, some properties indexed', () => {
    const data = { name: 'John', age: 30, bio: 'long text' }
    const result = indexesToExcludeFromIndexes(data, ['name'])
    expect(result).toEqual(['age', 'bio'])
  })

  test('flat object, no properties indexed', () => {
    const data = { name: 'John', age: 30 }
    const result = indexesToExcludeFromIndexes(data, [])
    expect(result).toEqual(['name', 'age'])
  })

  test('nested object, entire nested prop indexed', () => {
    const data = { name: 'John', address: { city: 'NYC', zip: '10001' } }
    const result = indexesToExcludeFromIndexes(data, ['name', 'address'])
    expect(result).toEqual([])
  })

  test('nested object, no sub-property indexed', () => {
    const data = { name: 'John', address: { city: 'NYC', zip: '10001' } }
    const result = indexesToExcludeFromIndexes(data, ['name'])
    expect(result).toEqual(['address', 'address.*'])
  })

  test('nested object, partial sub-properties indexed', () => {
    const data = { name: 'John', address: { city: 'NYC', zip: '10001', street: '5th Ave' } }
    const result = indexesToExcludeFromIndexes(data, ['name', 'address.city'])
    expect(result).toEqual(['address.zip', 'address.street'])
  })

  test('deeply nested (3+ levels)', () => {
    const data = {
      a: {
        b: {
          c: 'deep',
          d: 'also deep',
        },
        e: 'shallow',
      },
    }
    const result = indexesToExcludeFromIndexes(data, ['a.b.c'])
    expect(result).toEqual(['a.b.d', 'a.e'])
  })

  test('array of primitives treated as primitive', () => {
    const data = { name: 'John', tags: ['a', 'b', 'c'] }
    const result = indexesToExcludeFromIndexes(data, ['name'])
    expect(result).toEqual(['tags'])
  })

  test('array of objects treated as object', () => {
    const data = { name: 'John', items: [{ sku: 'abc', qty: 1 }] }
    // No sub-property indexed → exclude whole subtree
    const result = indexesToExcludeFromIndexes(data, ['name'])
    expect(result).toEqual(['items', 'items.*'])
  })

  test('array of objects with partial sub-properties indexed', () => {
    const data = { items: [{ sku: 'abc', qty: 1, note: 'hi' }] }
    const result = indexesToExcludeFromIndexes(data, ['items.sku'])
    expect(result).toEqual(['items.qty', 'items.note'])
  })

  test('empty data object', () => {
    const result = indexesToExcludeFromIndexes({}, ['name'])
    expect(result).toEqual([])
  })

  test('null and undefined values treated as primitive', () => {
    const data = { a: null, b: undefined, c: 'indexed' }
    const result = indexesToExcludeFromIndexes(data, ['c'])
    expect(result).toEqual(['a', 'b'])
  })
})
