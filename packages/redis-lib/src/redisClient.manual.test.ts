import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import type { UnixTimestamp } from '@naturalcycles/js-lib/types'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
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
  it('should create a non-existing key without expiry', async () => {
    const result = await client.incr('test:one')

    expect(result).toBe(1)
    expect(await client.ttl('test:one')).toBe(-1)
  })

  it('should preserve the expiry of an existing key', async () => {
    await client.setWithTTL('test:one', 1, localTime.now().plusSeconds(100).unix)

    const result = await client.incr('test:one')

    expect(result).toBe(2)
    expect(await client.ttl('test:one')).toBeGreaterThan(0)
  })
})

it('should increase several keys with incrBatch', async () => {
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
  it('should increase multiple keys and give them an expiry', async () => {
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

  it('should NOT extend the expiry of an ongoing window', async () => {
    const tuples: [string, number][] = [
      ['test:one', 1],
      ['test:two', 2],
    ]
    await client.incrBatchWithTTL(tuples, localTime.now().plusSeconds(100).unix)

    const result = await client.incrBatchWithTTL(tuples, localTime.now().plusSeconds(10_000).unix)

    expect(result).toEqual([
      ['test:one', 2],
      ['test:two', 4],
    ])
    expect(await client.ttl('test:one')).toBeLessThanOrEqual(100)
    expect(await client.ttl('test:two')).toBeLessThanOrEqual(100)
  })
})

describe('incrWithTTL', () => {
  it('should create a non-existing key with an expiry', async () => {
    const result = await client.incrWithTTL('test:one', localTime.now().plusSeconds(100).unix)

    expect(result).toBe(1)
    expect(await client.ttl('test:one')).toBeGreaterThan(0)
  })

  it('should NOT extend the expiry of an ongoing window', async () => {
    await client.incrWithTTL('test:one', localTime.now().plusSeconds(100).unix)

    const result = await client.incrWithTTL('test:one', localTime.now().plusSeconds(10_000).unix)

    expect(result).toBe(2)
    expect(await client.ttl('test:one')).toBeLessThanOrEqual(100)
  })

  it('should restore a missing expiry', async () => {
    // How a bare INCR on a missing key leaves it: a counter that never resets
    await client.set('test:one', 5)
    expect(await client.ttl('test:one')).toBe(-1)

    const result = await client.incrWithTTL('test:one', localTime.now().plusSeconds(100).unix)

    expect(result).toBe(6)
    expect(await client.ttl('test:one')).toBeGreaterThan(0)
  })

  it('should throw on an invalid expireAt, leaving a key that self-heals', async () => {
    await expect(client.incrWithTTL('test:one', 1.5 as UnixTimestamp)).rejects.toThrow(
      'value is not an integer or out of range',
    )

    // Redis does not roll back, so the increment stands and the key is left without an expiry
    expect(await client.get('test:one')).toBe('1')
    expect(await client.ttl('test:one')).toBe(-1)

    // ...until the next successful call, which gives it one back
    await client.incrWithTTL('test:one', localTime.now().plusSeconds(100).unix)
    expect(await client.ttl('test:one')).toBeGreaterThan(0)
  })
})

describe('hashmap functions', () => {
  it('should save a map with hset', async () => {
    await client.hset('test:key', { foo: 'bar' })

    const result = await client.hgetall('test:key')

    expect(result).toEqual({ foo: 'bar' })
  })

  it('should store/fetch numbers as strings', async () => {
    await client.hset('test:key', { one: 1 })

    const result = await client.hgetall('test:key')

    expect(result).toEqual({ one: '1' })
  })

  it('should store a nested object as "[object Object]"', async () => {
    await client.hset('test:key', { nested: { one: 1 } })

    const result = await client.hgetall('test:key')

    expect(result).toEqual({ nested: '[object Object]' })
  })

  it('should fetch one field with hget', async () => {
    await client.hset('test:key', { foo: 'bar' })

    const result = await client.hget('test:key', 'foo')

    expect(result).toBe('bar')
  })

  it('should fetch a numeric field as a string with hget', async () => {
    await client.hset('test:key', { one: 1 })

    const result = await client.hget('test:key', 'one')

    expect(result).toBe('1')
  })

  it('should get several fields as strings with hmget', async () => {
    await client.hset('test:key', { one: 1, two: 2, three: 3 })

    const result = await client.hmget('test:key', ['one', 'three'])

    expect(result).toEqual(['1', '3'])
  })

  it('should get several fields as buffers with hmgetBuffer', async () => {
    await client.hset('test:key', { one: 1, two: 2, three: 3 })

    const result = await client.hmgetBuffer('test:key', ['one', 'three'])

    expect(result).toEqual([Buffer.from('1'), Buffer.from('3')])
  })

  it('should apply a negative increment with hincr and return a number', async () => {
    await client.hset('test:key', { one: 1 })

    const result = await client.hincr('test:key', 'one', -2)

    expect(result).toBe(-1)
  })

  it('should increase the value by 1 by default with hincr', async () => {
    await client.hset('test:key', { one: 1 })

    const result = await client.hincr('test:key', 'one')

    expect(result).toBe(2)
  })

  it('should set a missing field to 1 with hincr', async () => {
    const result = await client.hincr('test:key', 'one')

    expect(result).toBe(1)
  })

  it('should increase several fields with hincrBatch', async () => {
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

  it('should count the fields of a hash with hscanCount', async () => {
    await client.hset('test:key', { one: 1, two: 2, three: 3 })

    const result = await client.hscanCount('test:key', {})

    expect(result).toBe(3)
  })

  it('should count only the fields matching a pattern with hscanCount', async () => {
    await client.hset('test:key', { one: 1, two: 2, three: 3 })

    const result = await client.hscanCount('test:key', { match: 't*' })

    expect(result).toBe(2)
  })

  it('should delete the given fields with hdel', async () => {
    await client.hset('test:key', { one: 1, two: 2, three: 3 })

    await client.hdel('test:key', ['two', 'three'])

    const result = await client.hgetall('test:key')
    expect(result).toEqual({ one: '1' })
  })

  it.skip('should keep only the fields whose expiry has not passed with hsetWithTTL', async () => {
    const now = localTime.now().unix

    await client.hsetWithTTL('test:key', { foo1: 'bar' }, (now + 1000) as UnixTimestamp)
    await client.hsetWithTTL('test:key', { foo2: 'bar' }, (now - 1) as UnixTimestamp)

    const result = await client.hgetall('test:key')
    expect(result).toEqual({ foo1: 'bar' })
  })
})
