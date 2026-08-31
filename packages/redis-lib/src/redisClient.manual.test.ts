import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import type { UnixTimestamp } from '@naturalcycles/js-lib/types'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { RedisClient } from './redisClient.js'

let client: RedisClient

beforeAll(() => {
  client = new RedisClient()
})

beforeEach(async () => {
  await client.dropTable('test')
})

afterAll(async () => {
  await client.dropTable('test')
  await client.disconnect()
})

describe('incr', () => {
  test('should create a non-existing key without expiry', async () => {
    const result = await client.incr('test:one')

    expect(result).toBe(1)
    expect(await client.ttl('test:one')).toBe(-1)
  })

  test('should preserve the expiry of an existing key', async () => {
    await client.setWithTTL('test:one', 1, localTime.now().plusSeconds(100).unix)

    const result = await client.incr('test:one')

    expect(result).toBe(2)
    expect(await client.ttl('test:one')).toBeGreaterThan(0)
  })
})

test('incrBatch should increase multiple keys', async () => {
  await client.set('test:one', 1)
  await client.set('test:two', 2)

  const result = await client.incrBatch([
    ['test:one', 1],
    ['test:two', 2],
  ])

  expect(result).toEqual([
    ['test:one', 2],
    ['test:two', 4],
  ])
})

describe('incrBatchWithTTL', () => {
  test('should increase multiple keys and give them an expiry', async () => {
    await client.set('test:one', 1)
    await client.set('test:two', 2)

    const result = await client.incrBatchWithTTL(
      [
        ['test:one', 1],
        ['test:two', 2],
      ],
      localTime.now().plusSeconds(100).unix,
    )

    expect(result).toEqual([
      ['test:one', 2],
      ['test:two', 4],
    ])
    expect(await client.ttl('test:one')).toBeGreaterThan(0)
    expect(await client.ttl('test:two')).toBeGreaterThan(0)
  })
})

describe('incrWithTTL', () => {
  test('should create a non-existing key with an expiry', async () => {
    const result = await client.incrWithTTL('test:one', localTime.now().plusSeconds(100).unix)

    expect(result).toBe(1)
    expect(await client.ttl('test:one')).toBeGreaterThan(0)
  })

  test('should NOT extend the expiry of an ongoing window', async () => {
    await client.incrWithTTL('test:one', localTime.now().plusSeconds(100).unix)

    const result = await client.incrWithTTL('test:one', localTime.now().plusSeconds(10_000).unix)

    expect(result).toBe(2)
    expect(await client.ttl('test:one')).toBeLessThanOrEqual(100)
  })

  test('should restore a missing expiry', async () => {
    // How a bare INCR on a missing key leaves it: a counter that never resets
    await client.set('test:one', 5)
    expect(await client.ttl('test:one')).toBe(-1)

    const result = await client.incrWithTTL('test:one', localTime.now().plusSeconds(100).unix)

    expect(result).toBe(6)
    expect(await client.ttl('test:one')).toBeGreaterThan(0)
  })
})

describe('hashmap functions', () => {
  test('hset should save a map', async () => {
    await client.hset('test:key', { foo: 'bar' })

    const result = await client.hgetall('test:key')

    expect(result).toEqual({ foo: 'bar' })
  })

  test('should store/fetch numbers as strings', async () => {
    await client.hset('test:key', { one: 1 })

    const result = await client.hgetall('test:key')

    expect(result).toEqual({ one: '1' })
  })

  test('hgetall should not fetch nested objects', async () => {
    await client.hset('test:key', { nested: { one: 1 } })

    const result = await client.hgetall('test:key')

    expect(result).toEqual({ nested: '[object Object]' })
  })

  test('hget should fetch map property', async () => {
    await client.hset('test:key', { foo: 'bar' })

    const result = await client.hget('test:key', 'foo')

    expect(result).toBe('bar')
  })

  test('hget should fetch value as string', async () => {
    await client.hset('test:key', { one: 1 })

    const result = await client.hget('test:key', 'one')

    expect(result).toBe('1')
  })

  test('hmgetBuffer should get the values of the fields as strings', async () => {
    await client.hset('test:key', { one: 1, two: 2, three: 3 })

    const result = await client.hmget('test:key', ['one', 'three'])

    expect(result).toEqual(['1', '3'])
  })

  test('hmgetBuffer should get the values of the fields as buffers', async () => {
    await client.hset('test:key', { one: 1, two: 2, three: 3 })

    const result = await client.hmgetBuffer('test:key', ['one', 'three'])

    expect(result).toEqual([Buffer.from('1'), Buffer.from('3')])
  })

  test('hincr should change the value and return with a numeric result', async () => {
    await client.hset('test:key', { one: 1 })

    const result = await client.hincr('test:key', 'one', -2)

    expect(result).toBe(-1)
  })

  test('hincr should increase the value by 1 by default', async () => {
    await client.hset('test:key', { one: 1 })

    const result = await client.hincr('test:key', 'one')

    expect(result).toBe(2)
  })

  test('hincr should set the value to 1 for a non-existing field', async () => {
    const result = await client.hincr('test:key', 'one')

    expect(result).toBe(1)
  })

  test('hincrBatch should increase multiple keys', async () => {
    await client.hset('test:key', { one: 1, two: 2 })

    const result = await client.hincrBatch('test:key', [
      ['one', 1],
      ['two', 2],
    ])

    expect(result).toEqual([
      ['one', 2],
      ['two', 4],
    ])
  })

  test('hscanCount should return the number of keys in the hash', async () => {
    await client.hset('test:key', { one: 1, two: 2, three: 3 })

    const result = await client.hscanCount('test:key', {})

    expect(result).toBe(3)
  })

  test('hscanCount with a match pattern should return the number of matching keys in the hash', async () => {
    await client.hset('test:key', { one: 1, two: 2, three: 3 })

    const result = await client.hscanCount('test:key', { match: 't*' })

    expect(result).toBe(2)
  })

  test('hdel should delete a fields from the hash', async () => {
    await client.hset('test:key', { one: 1, two: 2, three: 3 })

    await client.hdel('test:key', ['two', 'three'])

    const result = await client.hgetall('test:key')
    expect(result).toEqual({ one: '1' })
  })

  test.skip('hsetWithTTL should set the fields with expiry', async () => {
    const now = localTime.now().unix

    await client.hsetWithTTL('test:key', { foo1: 'bar' }, (now + 1000) as UnixTimestamp)
    await client.hsetWithTTL('test:key', { foo2: 'bar' }, (now - 1) as UnixTimestamp)

    const result = await client.hgetall('test:key')
    expect(result).toEqual({ foo1: 'bar' })
  })
})
