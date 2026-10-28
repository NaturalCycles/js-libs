import { expect, expectTypeOf, it } from 'vitest'
import { _stringMapValuesSorted } from './array/index.js'
import { localTime } from './datetime/index.js'
import { asUnixTimestamp, asUnixTimestamp2000 } from './error/index.js'
import type { AppError } from './error/index.js'
import { _expectedError } from './error/try.js'
import {
  _noop,
  _objectAssign,
  _objectEntries,
  _objectKeys,
  _passNothingPredicate,
  _passthroughMapper,
  _passthroughPredicate,
  _passUndefinedMapper,
  _stringMapEntries,
  _stringMapValues,
  _typeCast,
} from './types.js'
import type {
  AnyObject,
  AnySyncFunction,
  BaseDBEntity,
  Branded,
  IsoDate,
  IsoMonth,
  NotPromise,
  Reviver,
  Saved,
  StringMap,
  SyncFunction,
  UnixTimestamp,
  Unsaved,
  UnsavedId,
} from './types.js'

interface Item extends BaseDBEntity {
  a?: number
}

interface ItemDBM extends Item {}

const _ = '2021-01' as IsoMonth

it('should type the BaseDBEntity fields of Saved, Unsaved and UnsavedId entities', () => {
  const a = 1
  expectTypeOf(a).toEqualTypeOf<number>()

  const o = {
    a: 1,
  }
  expectTypeOf(o).toEqualTypeOf<{
    a: number
  }>()

  expectTypeOf<Item>().toEqualTypeOf<{
    a?: number
    id: string
    created: UnixTimestamp
    updated: UnixTimestamp
  }>()

  const item = {
    a: undefined,
    id: undefined,
    created: undefined,
    updated: undefined,
  } as Unsaved<Item>

  expectTypeOf(item).toMatchTypeOf<{
    a?: number
    id?: string
    created?: number
    updated?: number
  }>()

  const itemDBM: ItemDBM = {
    id: '5', // should only allow string, but not number
    created: 1 as UnixTimestamp,
    updated: 1 as UnixTimestamp,
    a: undefined,
  }

  expectTypeOf(itemDBM).toEqualTypeOf<{
    id: string
    created: UnixTimestamp
    updated: UnixTimestamp
    a?: number
  }>()

  const savedItemDBM = itemDBM as Saved<ItemDBM>
  expectTypeOf(savedItemDBM).toMatchTypeOf<{
    id: string
    created: number
    updated: number
    a?: number
  }>()

  const unsavedItem: Unsaved<Item> = {
    id: undefined,
    created: undefined,
    updated: undefined,
    a: undefined,
  }

  expectTypeOf(unsavedItem).toMatchTypeOf<{
    id?: string
    created?: number
    updated?: number
    a?: number
  }>()

  // setting to undefined verifies that these props exist and are optional
  const unsavedItemDBM: Unsaved<ItemDBM> = {
    id: undefined,
    created: undefined,
    updated: undefined,
    a: undefined,
  }

  expectTypeOf(unsavedItemDBM).toMatchTypeOf<{
    a?: number
    id?: string
    created?: number
    updated?: number
  }>()

  const unsavedItemId: UnsavedId<ItemDBM> = itemDBM
  unsavedItemId.id = undefined

  expectTypeOf(unsavedItemId).toMatchTypeOf<{
    id?: string
    created: number
    updated: number
    a?: number
  }>()
})

it('should return fixed results from the passthrough and noop helpers', () => {
  const _: Reviver = (_k, _v) => {}

  expect(_passthroughMapper('a', 1)).toBe('a')
  expect(_passUndefinedMapper('a', 1)).toBeUndefined()
  expect(_passthroughPredicate('a', 1)).toBe(true)
  expect(_passNothingPredicate('a', 1)).toBe(false)

  expect(_noop()).toBeUndefined()
  expect(_noop('hey', 'jude')).toBeUndefined()

  const map: StringMap = { a: 'a', b: 'b', c: undefined }
  const a = map['a']
  expectTypeOf(a).toEqualTypeOf<string | undefined>()
  expectTypeOf(map['b']).toEqualTypeOf<string | undefined>()
  expectTypeOf(map['c']).toEqualTypeOf<string | undefined>()
  expectTypeOf(map['d']).toEqualTypeOf<string | undefined>()
})

it('should return typed values, entries and keys of a string map', () => {
  const o = { b: 2, c: 3, d: 4 }
  const b = o.b // number
  expectTypeOf(b).toEqualTypeOf<number>()

  const values = _stringMapValues(o) // number[]
  expectTypeOf(values).toEqualTypeOf<number[]>()
  expect(values).toEqual([2, 3, 4])

  const entries = _stringMapEntries(o) // [string, number][]
  expectTypeOf(entries).toEqualTypeOf<[string, number][]>()
  expect(entries).toEqual([
    ['b', 2],
    ['c', 3],
    ['d', 4],
  ])

  const entries2 = _objectEntries(o)
  expectTypeOf(entries2).toEqualTypeOf<[keyof typeof o, number][]>()
  expect(entries2).toEqual(entries)

  const keys = _objectKeys(o)
  expectTypeOf(keys).toMatchTypeOf<string[]>()
  expect(keys).toEqual(['b', 'c', 'd'])

  expect(_stringMapValuesSorted(o, v => v)).toEqual([2, 3, 4])
  expect(_stringMapValuesSorted(o, v => -v)).toEqual([4, 3, 2])
  expect(_stringMapValuesSorted(o, v => v, 'desc')).toEqual([4, 3, 2])
})

it('should type number enum keys as strings in _objectEntries', () => {
  enum A {
    k1 = 1,
    k2 = 2,
    k3 = 3,
  }

  const map: Partial<Record<A, string>> = {
    [A.k1]: 'v1',
    [A.k2]: 'v2',
  }

  const entries = _objectEntries(map)
  // Object.entries always returns string keys, so numeric enum keys become `${A}`
  expectTypeOf(entries).toEqualTypeOf<[`${A}`, string][]>()
  expect(entries).toMatchInlineSnapshot(`
    [
      [
        "1",
        "v1",
      ],
      [
        "2",
        "v2",
      ],
    ]
  `)
})

it('should keep string enum keys in _objectEntries', () => {
  enum B {
    k1 = 'v1',
    k2 = 'v2',
    k3 = 'v3',
  }

  const map: Partial<Record<B, number>> = {
    [B.k1]: 1,
    [B.k2]: 2,
  }

  const entries = _objectEntries(map)
  // String enum keys stay as-is
  expectTypeOf(entries).toEqualTypeOf<[B, number][]>()
  expect(entries).toMatchInlineSnapshot(`
    [
      [
        "v1",
        1,
      ],
      [
        "v2",
        2,
      ],
    ]
  `)
})

it('should type number enum keys as strings in _objectKeys', () => {
  enum A {
    k1 = 1,
    k2 = 2,
    k3 = 3,
  }

  const map: Partial<Record<A, string>> = {
    [A.k1]: 'v1',
    [A.k2]: 'v2',
  }

  const keys = _objectKeys(map)
  // Object.keys always returns strings, so numeric enum keys become `${A}`
  expectTypeOf(keys).toEqualTypeOf<`${A}`[]>()
  expect(keys).toMatchInlineSnapshot(`
    [
      "1",
      "2",
    ]
  `)
})

it('should keep string enum keys in _objectKeys', () => {
  enum B {
    k1 = 'v1',
    k2 = 'v2',
    k3 = 'v3',
  }

  const map: Partial<Record<B, number>> = {
    [B.k1]: 1,
    [B.k2]: 2,
  }

  const keys = _objectKeys(map)
  // String enum keys stay as-is
  expectTypeOf(keys).toEqualTypeOf<B[]>()
  expect(keys).toMatchInlineSnapshot(`
    [
      "v1",
      "v2",
    ]
  `)
})

it('should narrow the type in place with _typeCast', () => {
  const err = _expectedError(() => {
    throw new Error('yo')
  })
  expectTypeOf(err).toEqualTypeOf<Error>()

  _typeCast<AppError>(err)
  expectTypeOf(err).toEqualTypeOf<AppError>()

  err.data = { backendResponseStatusCode: 401 }
  expect(err).toMatchInlineSnapshot('[Error: yo]')
  expect(err.data).toMatchInlineSnapshot(`
    {
      "backendResponseStatusCode": 401,
    }
  `)
})

it('should assign props and reject unknown ones at the type level with _objectAssign', () => {
  const item = {} as Item

  // No TypeScript error here
  // oxlint-disable-next-line unicorn/no-immediate-mutation
  Object.assign(item, {
    whatever: 5,
  })

  _objectAssign(item, {
    // @ts-expect-error 'whatever' does not belong to Partial<Item>
    whatever: 5,
    a: 5,
  })

  expect(item).toMatchInlineSnapshot(`
    {
      "a": 5,
      "whatever": 5,
    }
  `)
})

it('should type the optional BaseDBEntity fields of Unsaved of a generic object type', () => {
  function getBaseFields<BM extends AnyObject>(bm: Unsaved<BM>): unknown[] {
    expectTypeOf(bm.id).toEqualTypeOf<string | undefined>()
    expectTypeOf(bm.created).toEqualTypeOf<UnixTimestamp | undefined>()
    expectTypeOf(bm.updated).toEqualTypeOf<UnixTimestamp | undefined>()
    return [bm.id, bm.created, bm.updated]
  }

  expect(getBaseFields<Item>({ a: 1 })).toEqual([undefined, undefined, undefined])
})

it('should keep a branded string comparable and assignable to string', () => {
  type MyId = Branded<string, 'MyId'>
  const id = '123' as MyId
  const id2 = '124' as MyId
  expect(id2 > id).toBe(true) // string comparison still works
  expect(id).toBe('123')
  expect(id2).toBe('124')
  const s: string = id // MyId is assignable to string
  expect(s).toEqual(id)
})

it('should allow a UnixTimestamp to be used as a number, but not a number as a UnixTimestamp', () => {
  const ts = 123 as UnixTimestamp
  const ts2: number = ts // compatible
  // @ts-expect-error needs casting
  const _: UnixTimestamp = ts2
  expectTypeOf(asUnixTimestamp(ts2)).toEqualTypeOf<UnixTimestamp>() // casting with a helper function
})

it('should resolve NotPromise to the type, or to never for promises', () => {
  // NotPromise resolves to T for non-promise types
  expectTypeOf<NotPromise<string>>().toEqualTypeOf<string>()
  expectTypeOf<NotPromise<number>>().toEqualTypeOf<number>()
  expectTypeOf<NotPromise<void>>().toEqualTypeOf<void>()
  expectTypeOf<NotPromise<boolean>>().toEqualTypeOf<boolean>()
  expectTypeOf<NotPromise<{ a: number }>>().toEqualTypeOf<{ a: number }>()
  expectTypeOf<NotPromise<undefined>>().toEqualTypeOf<undefined>()
  expectTypeOf<NotPromise<null>>().toEqualTypeOf<null>()

  // NotPromise resolves to never for promise types
  expectTypeOf<NotPromise<Promise<string>>>().toEqualTypeOf<never>()
  expectTypeOf<NotPromise<Promise<void>>>().toEqualTypeOf<never>()
  expectTypeOf<NotPromise<PromiseLike<number>>>().toEqualTypeOf<never>()
})

it('should accept sync functions and reject async ones as SyncFunction', () => {
  // Sync functions are assignable
  const syncFn: SyncFunction<string> = () => 'hello'
  expect(syncFn()).toBe('hello')

  const syncVoid: SyncFunction<void> = () => {}
  expect(syncVoid()).toBeUndefined()

  // Async functions are NOT assignable to SyncFunction
  const asyncFn = async (): Promise<string> => 'hello'
  // @ts-expect-error async function returns Promise, not assignable to SyncFunction
  const __rejectAsync: SyncFunction<string> = asyncFn
})

it('should accept sync functions and reject async ones as AnySyncFunction', () => {
  // Sync functions with args are assignable
  const syncFn: AnySyncFunction<number> = (a: number, b: number) => a + b
  expect(syncFn(1, 2)).toBe(3)

  // Async functions are NOT assignable to AnySyncFunction
  const asyncFn = async (x: number): Promise<number> => x * 2
  // @ts-expect-error async function returns Promise, not assignable to AnySyncFunction
  const __rejectAsync: AnySyncFunction<number> = asyncFn
})

it('should accept timestamps after 2000 and reject older ones and milliseconds', () => {
  const valid = localTime('2022-07-14' as IsoDate).unix
  const tooOld = localTime('1984-06-21' as IsoDate).unix
  const tsInMillis = localTime('2022-07-14' as IsoDate).unixMillis

  expect(asUnixTimestamp2000(valid)).toBe(valid)

  expect(() => asUnixTimestamp2000(tooOld)).toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: Number is not a valid UnixTimestamp2000: 456624000]`,
  )
  expect(() => asUnixTimestamp2000(tsInMillis)).toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: Number is not a valid UnixTimestamp2000: 1657756800000]`,
  )
})
