import { expect, it } from 'vitest'
import type { IsoDateTime } from '../types.js'
import { localTime } from './localTime.js'

it('should expose the parts and formats of a wall time', () => {
  const t = localTime('1984-06-21T17:56:21' as IsoDateTime).toWallTime()
  expect(t).toMatchObject({
    year: 1984,
    month: 6,
    day: 21,
    hour: 17,
    minute: 56,
    second: 21,
  })
  expect(t.toISODateTime()).toBe('1984-06-21T17:56:21')
  expect(t.toISODate()).toBe('1984-06-21')
  expect(t.toISOTime()).toBe('17:56:21')
  expect(t.toJSON()).toBe('1984-06-21T17:56:21')
  expect(t.toString()).toBe('1984-06-21T17:56:21')
  expect(t.toPretty()).toBe('1984-06-21 17:56:21')
  expect(t.toPretty(false)).toBe('1984-06-21 17:56')
  expect(t.toLocalDate().toString()).toBe('1984-06-21')
  expect(t.toLocalTime().toString()).toBe('1984-06-21T17:56:21')
})
