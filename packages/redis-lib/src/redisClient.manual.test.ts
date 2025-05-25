import type { UnixTimestamp } from '@naturalcycles/js-lib'
import { localTime } from '@naturalcycles/js-lib'
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
