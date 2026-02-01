import { expect, expectTypeOf, test } from 'vitest'
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
  BaseDBEntity,
  Branded,
  IsoDate,
  IsoMonth,
  Reviver,
  Saved,
  StringMap,
  UnixTimestamp,
  Unsaved,
  UnsavedId,
} from './types.js'

interface Item extends BaseDBEntity {
  a?: number
}

interface ItemDBM extends Item {}

const _ym = '2021-01' as IsoMonth

test('saved/unsaved', () => {
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

test('types', () => {
  const _reviver: Reviver = (_k, _v) => {}

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

test('_stringMapValues, _stringMapEntries', () => {
  const o = { b: 2, c: 3, d: 4 }
  const b = o['b'] // number
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

test('_objectEntries', () => {
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
  expectTypeOf(entries).toEqualTypeOf<[A, string][]>()
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

test('_objectKeys with Enum', () => {
  enum A {
    k1 = 1,
    k2 = 2,
    k3 = 3,
  }

  const map: Partial<Record<A, string>> = {
    [A.k1]: 'v1',
    [A.k2]: 'v2',
  }

  const entries = _objectKeys(map)
  expectTypeOf(entries).toEqualTypeOf<A[]>()
  expect(entries).toMatchInlineSnapshot(`
    [
      "1",
      "2",
    ]
  `)
})

test('_typeCast', () => {
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

test('_objectAssign', () => {
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

test('Unsaved type', () => {
  // expectTypeOf<Unsaved<any>>().toEqualTypeOf<any>()

  function _fn<BM extends AnyObject>(_a: Unsaved<BM>): void {}
})

test('branded', () => {
  type MyId = Branded<string, 'MyId'>
  const id = '123' as MyId
  const id2 = '124' as MyId
  expect(id2 > id).toBe(true) // string comparison still works
  expect(id).toBe('123')
  expect(id2).toBe('124')
  const s: string = id // MyId is assignable to string
  expect(s).toEqual(id)
})

test('UnixTimestamp branded type', () => {
  const ts = 123 as UnixTimestamp
  const ts2: number = ts // compatible
  const _ts3: UnixTimestamp = ts2 as UnixTimestamp // needs casting
  const _ts4 = asUnixTimestamp(ts2) // casting with a helper function
})

test('asUnixTimestamp2000', () => {
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
