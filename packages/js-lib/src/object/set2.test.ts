import { inspect } from 'node:util'
import { expect, expectTypeOf, test } from 'vitest'
import { _stringify } from '../string/index.js'
import { Set2 } from './set2.js'

/* oxlint-disable @typescript-eslint/no-base-to-string */

test('set2', () => {
  const s = new Set([1, 2, 3])
  expect(JSON.stringify(s)).toBe('{}') // boring
  expect(s.toString()).toMatchInlineSnapshot(`"[object Set]"`) // sooo boring

  const s2 = new Set2([1, 2, 3])

  expectTypeOf(s2).toEqualTypeOf<Set2<number>>()
  expect(s2 instanceof Set2).toBe(true)
  expect(s2 instanceof Set).toBe(true)
  expect(s2.toArray()).toEqual([1, 2, 3])
  expect([...s2]).toEqual([1, 2, 3])
  // toString() is what will be used by the Browser/DevTools when console.logged.
  // possibly by Sentry, when you insert it into a string template
  expect(s2.toString()).toMatchInlineSnapshot(`"Set2(3) [1,2,3]"`)
  expect(`!${s2}!`).toMatchInlineSnapshot(`"!Set2(3) [1,2,3]!"`)
  expect(JSON.stringify(s2)).toMatchInlineSnapshot(`"[1,2,3]"`)
  expect(_stringify(s2)).toMatchInlineSnapshot(`
    "[
      1,
      2,
      3
    ]"
  `)

  s2.addMany([4, 5])
  expect(s2.toArray()).toEqual([1, 2, 3, 4, 5])
})

test('inspect', () => {
  const s2 = new Set2([1, 2, 3])
  // This specific output (Set2(3) [Set] ...) is built into Node's inspect
  // [Set] means we are a subclass of Set
  // We can override it, but it's messy, and better to keep the default predictable behavior
  expect(inspect(s2)).toMatchInlineSnapshot(`"Set2(3) [Set] { 1, 2, 3 }"`)
})
