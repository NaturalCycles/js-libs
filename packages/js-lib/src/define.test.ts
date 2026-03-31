import { expect, expectTypeOf, test, vi } from 'vitest'
import {
  _defineLazyProperty,
  _defineLazyProps,
  _defineProperty,
  _defineProps,
  _lazyValue,
} from './define.js'
import type { AnyObject, Lazy } from './types.js'

test('_lazyValue', () => {
  const fn = vi.fn<() => number>(() => 42)

  const value = _lazyValue(fn)
  expectTypeOf(value).toEqualTypeOf<Lazy<number>>()
  expect(value()).toBe(42)
  expect(value()).toBe(42)
  expect(value()).toBe(42)

  expect(fn).toHaveBeenCalledTimes(1)
})

interface Obj {
  v: number
}

test('_defineLazyProperty', () => {
  const fn = vi.fn<() => number>(() => 42)

  const obj = {} as Obj

  _defineLazyProperty(obj, 'v', fn)

  expect(obj.v).toBe(42)
  expect(obj.v).toBe(42)
  expect(obj.v).toBe(42)

  expect(fn).toHaveBeenCalledTimes(1)

  // Another way to declare an object:

  const obj2 = _defineLazyProperty({} as Obj, 'v', fn)
  expect(obj2.v).toBe(42)
})

test('_defineLazyProps', () => {
  const fn1 = vi.fn<() => number>(() => 42)
  const fn2 = vi.fn<() => number>(() => 48)

  interface Obj2 {
    v1: number
    v2: number
  }

  const obj = {} as Obj2

  _defineLazyProps(obj, {
    v1: fn1,
    v2: fn2,
  })

  expect(obj.v1).toBe(42)
  expect(obj.v1).toBe(42)
  expect(obj.v1).toBe(42)
  expect(fn1).toHaveBeenCalledTimes(1)

  expect(obj.v2).toBe(48)
  expect(obj.v2).toBe(48)
  expect(obj.v2).toBe(48)
  expect(fn2).toHaveBeenCalledTimes(1)
})

test('_defineProperty', () => {
  const obj: AnyObject = { v: 42 }
  expect(Object.getOwnPropertyDescriptor(obj, 'v')).toMatchInlineSnapshot(`
    {
      "configurable": true,
      "enumerable": true,
      "value": 42,
      "writable": true,
    }
  `)

  // define over existing property - looks like it doesn't change anything
  Object.defineProperty(obj, 'v', {})

  expect(Object.getOwnPropertyDescriptor(obj, 'v')).toMatchInlineSnapshot(`
    {
      "configurable": true,
      "enumerable": true,
      "value": 42,
      "writable": true,
    }
  `)

  // New property defaults
  Object.defineProperty(obj, 'v2', {})
  expect(Object.getOwnPropertyDescriptor(obj, 'v2')).toMatchInlineSnapshot(`
    {
      "configurable": false,
      "enumerable": false,
      "value": undefined,
      "writable": false,
    }
  `)

  // Define with undefined value
  _defineProperty(obj, 'v3', {})
  expect(Object.getOwnPropertyDescriptor(obj, 'v3')).toMatchInlineSnapshot(`
    {
      "configurable": true,
      "enumerable": true,
      "value": undefined,
      "writable": true,
    }
  `)

  // Define with override
  _defineProperty(obj, 'v4', {
    enumerable: false,
    value: 43,
  })
  expect(Object.getOwnPropertyDescriptor(obj, 'v4')).toMatchInlineSnapshot(`
    {
      "configurable": true,
      "enumerable": false,
      "value": 43,
      "writable": true,
    }
  `)
})

test('_defineProps', () => {
  const obj: AnyObject = {}

  _defineProps(obj, {
    v: {},
    v2: { enumerable: false },
    v3: { enumerable: false, value: 42 },
    v4: { value: 43 },
  })
  expect(Object.getOwnPropertyDescriptors(obj)).toMatchInlineSnapshot(`
    {
      "v": {
        "configurable": true,
        "enumerable": true,
        "value": undefined,
        "writable": true,
      },
      "v2": {
        "configurable": true,
        "enumerable": false,
        "value": undefined,
        "writable": true,
      },
      "v3": {
        "configurable": true,
        "enumerable": false,
        "value": 42,
        "writable": true,
      },
      "v4": {
        "configurable": true,
        "enumerable": true,
        "value": 43,
        "writable": true,
      },
    }
  `)
})
