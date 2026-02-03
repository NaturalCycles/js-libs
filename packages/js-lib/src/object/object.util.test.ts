import { expect, test } from 'vitest'
import type { StringMap } from '../types.js'
import {
  _deepCopy,
  _deepFreeze,
  _deepTrim,
  _filterEmptyArrays,
  _filterEmptyValues,
  _filterFalsyValues,
  _filterNullishValues,
  _filterObject,
  _filterUndefinedValues,
  _findKeyByValue,
  _get,
  _has,
  _hasProp,
  _invert,
  _invertMap,
  _mapKeys,
  _mapObject,
  _mapValues,
  _mask,
  _merge,
  _mergeObjects,
  _objectAssignExact,
  _objectNullValuesToUndefined,
  _omit,
  _omitWithUndefined,
  _pick,
  _pickWithUndefined,
  _set,
  _unset,
} from './object.util.js'

test('_pick', () => {
  const f = _pick

  const obj = {
    a: 1,
    b: 2,
    c: 3,
    d: false,
  }

  // empty fields
  expect(f(obj, [])).toEqual({})

  const fields = ['a', 'c', 'd', 'e'] as const
  const r = f(obj, fields as any)
  expect(r).toEqual({ a: 1, c: 3, d: false })
  expect('e' in r).toBe(false) // should not add more fields with 'undefined' value
  // should not mutate
  expect(obj.c).toBe(3)
  expect(r).not.toBe(obj)

  // should mutate
  const obj2 = f(obj, ['a'], { mutate: true })
  expect(obj2).toEqual({
    a: 1,
  })
  expect(obj2).toBe(obj)
})

test('_pickWithUndefined', () => {
  const f = _pickWithUndefined

  const obj = {
    a: 1,
    b: 2,
    c: 3,
    d: false,
  }

  // empty fields
  expect(f(obj, [])).toEqual({
    a: undefined,
    b: undefined,
    c: undefined,
    d: undefined,
  })

  const fields = ['a', 'c', 'd', 'e'] as const
  const r = f(obj, fields as any)
  expect(r).toEqual({ a: 1, b: undefined, c: 3, d: false })
  expect('e' in r).toBe(false) // should not add more fields with 'undefined' value
  // should not mutate
  expect(obj.c).toBe(3)
  expect(r).not.toBe(obj)

  // should mutate
  const obj2 = f(obj, ['a'], { mutate: true })
  expect(obj2).toEqual({
    a: 1,
    b: undefined,
    c: undefined,
    d: undefined,
  })
  expect(obj2).toBe(obj)
})

test('_omit', () => {
  const obj = {
    a: 1,
    b: 2,
    c: 3,
    d: false,
    e: undefined,
  }

  _deepFreeze(obj)

  // empty props
  expect(_omit(obj, [])).toEqual(obj)

  expect(_omit(obj, ['b', 'c'])).toEqual({
    a: 1,
    d: false,
    e: undefined,
  })

  expect(_omit(obj, ['a', 'd', 'e'])).toEqual({
    b: 2,
    c: 3,
  })
})

test('_omitWithUndefined', () => {
  const obj = {
    a: 1,
    b: 2,
    c: 3,
    d: false,
    e: undefined,
  }

  _deepFreeze(obj)

  // empty props
  expect(_omitWithUndefined(obj, [])).toEqual(obj)

  expect(_omitWithUndefined(obj, ['b', 'c'])).toEqual({
    a: 1,
    b: undefined,
    c: undefined,
    d: false,
    e: undefined,
  })

  expect(_omit(obj, ['a', 'd', 'e'])).toEqual({
    a: undefined,
    b: 2,
    c: 3,
    d: undefined,
    e: undefined,
  })
})

test('_omit mutate', () => {
  const obj = {
    a: 1,
    b: 2,
    c: 3,
    d: false,
    e: undefined,
  }

  const obj2 = _omit(obj, ['b', 'c'], { mutate: true })
  expect(obj2).toEqual({
    a: 1,
    d: false,
    e: undefined,
  })
  expect(obj2).toBe(obj)
})

test('_omitWithUndefined mutating', () => {
  const obj = {
    a: 1,
    b: 2,
    c: 3,
    d: false,
    e: undefined,
  }

  const obj2 = _omitWithUndefined(obj, ['b', 'c'], { mutate: true })
  expect(obj2).toEqual({
    a: 1,
    b: undefined,
    c: undefined,
    d: false,
    e: undefined,
  })
  expect(obj2).toBe(obj)
})

test('_mask', () => {
  const o = {
    a: '1',
    b: {
      c: '2',
      d: '1',
    },
  }
  _deepFreeze(o)
  const r = _mask(o, ['b.c'])
  expect(r).toMatchInlineSnapshot(`
    {
      "a": "1",
      "b": {
        "d": "1",
      },
    }
  `)

  // should not fail
  expect(_mask(o, ['c.0.0'])).toEqual(o)
})

test('_mask with mutation', () => {
  const o = {
    a: '1',
    b: {
      c: '2',
      d: '1',
      e: {
        f: 7,
      },
    },
  }
  const r = _mask(o, ['b.c'], { mutate: true })
  expect(r).toMatchInlineSnapshot(`
    {
      "a": "1",
      "b": {
        "d": "1",
        "e": {
          "f": 7,
        },
      },
    }
  `)
  expect(r.b).toEqual(o.b) // cause it will mutate r.b
  expect(r).toBe(o)
})

test('_deepTrim', () => {
  const f = _deepTrim
  const o = {
    a: 'abc ',
    b: 'c',
    d: 12,
    e: {
      f: '  sd a ',
    },
  }
  f(o)

  expect(o).toEqual({
    a: 'abc',
    b: 'c',
    d: 12,
    e: {
      f: 'sd a',
    },
  })

  // expect(f(undefined)).toBe(undefined)

  expect(
    _deepTrim({
      a: ' b',
      c: 'd ',
      e: ' f ',
      g: 'hh',
    }),
  ).toEqual({
    a: 'b',
    c: 'd',
    e: 'f',
    g: 'hh',
  })
})

test('_filterFalsyValues', () => {
  const f = _filterFalsyValues
  const o = Object.freeze({
    a: 1,
    b: 0,
    c: undefined,
    d: null,
    e: '',
    f: 'wer',
  })
  expect(f(o)).toEqual({
    a: 1,
    f: 'wer',
  })
  // should NOT mutate
  expect(o.b).toBe(0)

  // should mutate if needed
  const o2 = { ...o }
  f(o2, { mutate: true })
  expect(o2.b).toBeUndefined()
})

test('_filterNullishValues', () => {
  const o = {
    a: 1,
    b: 0,
    c: undefined,
    d: null,
    e: '',
    f: 'wer',
  }
  _deepFreeze(o)

  expect(_filterNullishValues(o)).toEqual({
    a: 1,
    b: 0,
    e: '',
    f: 'wer',
  })

  const _ = _filterNullishValues(o)
})

test('_filterUndefinedValues', () => {
  const o = {
    a: 1,
    b: 0,
    c: undefined,
    d: null,
    e: '',
    f: 'wer',
  }
  _deepFreeze(o)

  expect(_filterUndefinedValues(o)).toEqual({
    a: 1,
    b: 0,
    d: null,
    e: '',
    f: 'wer',
  })
})

test('_filterEmptyArrays', () => {
  expect(_filterEmptyArrays({})).toEqual({})
  expect(_filterEmptyArrays({ a: 'a' })).toEqual({ a: 'a' })
  expect(_filterEmptyArrays({ a: 'a', b: [], c: 'c' })).toEqual({ a: 'a', c: 'c' })
})

test('_filterEmptyValues', () => {
  expect(
    _filterEmptyValues({
      a: 0,
      b: '',
      c: [],
      d: {},
      e: {
        f: [],
      },
      g: new Set(),
      h: 'h',
    }),
  ).toEqual({
    a: 0,
    e: {
      f: [],
    },
    h: 'h',
  })
})

test('_filterObject', () => {
  // expect(_filterObject(1 as any, () => false)).toBe(1)

  const f = _filterObject
  const br = {
    a: 'b',
    c: null,
  }

  // should mutate
  f(br, (_k: any, v: any) => v !== null, { mutate: true })
  expect(br.c).toBeUndefined()
})

test('_objectNullValuesToUndefined', () => {
  const o = {
    a: undefined,
    b: null,
    c: 1,
  }
  const o2 = {
    a: undefined,
    b: undefined,
    c: 1,
  }

  expect(_objectNullValuesToUndefined(o)).toEqual(o2)

  // mutate
  _objectNullValuesToUndefined(o, { mutate: true })
  expect(o).toEqual(o2)
})

test('_unset', () => {
  expect(_unset(1 as any, 'a')).toBeUndefined()

  const o = {
    a: 1,
    b: {
      c: 3,
      d: 4,
    },
    m: 5,
  }
  _unset(o, 'b.c')
  _unset(o, 'm')
  expect(o).toEqual({
    a: 1,
    b: {
      d: 4,
    },
  })
  expect(o.m).toBeUndefined()
  expect(o.b.c).toBeUndefined()
})

test('_deepCopy', () => {
  const o = {
    a: 1,
    b: {
      c: 3,
      d: 4,
    },
  }
  expect(_deepCopy(o)).toEqual(o)
})

test('_mergeObjects', () => {
  const obj1 = {
    a: 'a1',
    b: 'b1',
  }
  const obj2 = {
    b: 'b2',
    c: 'c2',
  }
  expect(_mergeObjects(obj1, obj2)).toEqual({
    a: 'a1',
    b: 'b2',
    c: 'c2',
  })
})

test('_merge', () => {
  expect(_merge(1 as any, 2)).toBe(1)
  expect(_merge({}, 2)).toEqual({})

  const a1 = {
    b: {
      c: 'c1',
    },
    e: 'e1',
  }
  const a2 = {
    b: {
      c2: 'c2',
    },
    d: 'd2',
  }

  expect(_merge(a1, a2)).toMatchInlineSnapshot(`
    {
      "b": {
        "c": "c1",
        "c2": "c2",
      },
      "d": "d2",
      "e": "e1",
    }
  `)

  const b1 = {}
  expect(_merge(b1, a2)).toMatchInlineSnapshot(`
    {
      "b": {
        "c2": "c2",
      },
      "d": "d2",
    }
  `)

  expect(_merge({ a: 'a1', o: { oo: 'oo1' } }, { b: 'b1' }, { o: { z: 'z1' } }, { a: 'a2' }))
    .toMatchInlineSnapshot(`
      {
        "a": "a2",
        "b": "b1",
        "o": {
          "oo": "oo1",
          "z": "z1",
        },
      }
    `)
})

test('_invert', () => {
  const o = {
    a: 'ak',
    b: 'bk',
  }
  const inv = _invert(o)
  const _ = inv['ak'] // typeof _v1 should be `a` | `b` | undefined

  expect(inv).toEqual({
    ak: 'a',
    bk: 'b',
  })
})

test('_invertMap', () => {
  const o = new Map([
    ['a', 'ak'],
    ['b', 'bk'],
  ])
  const inv = new Map([
    ['ak', 'a'],
    ['bk', 'b'],
  ])

  expect(_invertMap(o)).toEqual(inv)
})

test('_get, _has', () => {
  const o = {
    a: 'a',
    b: 'b',
    c: {
      d: '11',
      e: 3,
      f: [null, undefined, 1, '5', 'd'],
    },
  }

  expect(_get(undefined, '')).toBeUndefined()
  expect(_get(undefined, undefined as any)).toBeUndefined()
  expect(_get(o, '')).toBeUndefined()
  expect(_get(o, 'a')).toBe('a')
  expect(_get(o, 'b')).toBe('b')
  expect(_get(o, 'c')).toEqual(o.c)
  expect(_get(o, 'c.d')).toBe('11')
  expect(_get(o, 'c.e')).toBe(3)
  expect(_get(o, 'c.f')).toEqual(o.c.f)
  expect(_get(o, 'c.f[0]')).toBeNull()
  expect(_get(o, 'c.f.0')).toBeNull()
  expect(_get(o, 'c.f[1]')).toBeUndefined()
  expect(_get(o, 'c.f[2]')).toBe(1)
  expect(_get(o, 'c.f[3]')).toBe('5')
  expect(_get(o, 'c.f[4]')).toBe('d')
  expect(_get(o, 'not.existing.path')).toBeUndefined()
  expect(_get(o, 'not')).toBeUndefined()

  // expect(_has(undefined)).toBe(false)
  expect(_has(o, undefined as any)).toBe(false)
  expect(_has(o, 'a')).toBe(true)
  expect(_has(o, 'a.b')).toBe(false)
  expect(_has(o, 'c.d')).toBe(true)
  expect(_has(o, 'c.f')).toBe(true)
  expect(_has(o, 'c.f[0]')).toBe(false)
  expect(_has(o, 'c.f[1]')).toBe(false)
  expect(_has(o, 'c.f[2]')).toBe(true)
  expect(_has(o, 'c.f[6]')).toBe(false)
  expect(_has(o, 'not.existing.path')).toBe(false)
  expect(_has(o, 'not')).toBe(false)
})

test.each([
  [undefined as any, undefined as any, undefined, undefined],
  [{}, '', 'a', {}],
  [{}, 'a', 'a1', { a: 'a1' }],
  [{}, 'a.b', 'a1', { a: { b: 'a1' } }],
  [{}, 'a.b[0]', 'a1', { a: { b: ['a1'] } }],
  [{}, 'a.b.0', 'a1', { a: { b: ['a1'] } }],
  [{ a: {} }, 'a.b.0', 'a1', { a: { b: ['a1'] } }],
  [{ a: { b: ['b1'] } }, 'a.b.0', 'a1', { a: { b: ['a1'] } }],
  [{ a: { b: ['b1', 'b2'] } }, 'a.b.0', 'a1', { a: { b: ['a1', 'b2'] } }],
  [{ a: { b: ['b1', 'b2'] } }, 'a.b.1', 'a2', { a: { b: ['b1', 'a2'] } }],
])('_set %s %s %s to be %s', (obj, path, value, expected) => {
  expect(_set(obj, path, value)).toEqual(expected)
  expect(obj).toEqual(expected)
})

test('_mapKeys', () => {
  const o = { a: 1, b: 2 }
  _deepFreeze(o)
  expect(_mapKeys(o, (k, v) => k + v)).toEqual({ a1: 1, b2: 2 })
})

test('_mapValues', () => {
  const users = {
    fred: { user: 'fred', age: 40 },
    pebbles: { user: 'pebbles', age: 1 },
  }
  _deepFreeze(users)
  expect(_mapValues(users, (_k, v) => v)).toEqual(users)
  expect(_mapValues(users, (_k, v) => v.age)).toEqual({ fred: 40, pebbles: 1 })
})

test('_mapValues StringMap', () => {
  const map: StringMap<number> = {
    a: 1,
    b: 2,
  }

  const _ = map['a'] // number | undefined

  const map2 = _mapValues(map, (_, v) => v * v)
  expect(map2).toEqual({
    a: 1,
    b: 4,
  })
})

test('_mapObject', () => {
  const o = { b: 2, c: 3, d: 4 }
  _deepFreeze(o)

  // Example that inverts keys/values in the object
  const mapped = _mapObject(o, (k, v) => [String(v), k])
  expect(mapped).toEqual({ 2: 'b', 3: 'c', 4: 'd' })
})

test('_findKeyByValue', () => {
  const o = { b: 2, c: 3, d: 4 }
  expect(_findKeyByValue(o, 2)).toBe('b')
  expect(_findKeyByValue(o, 3)).toBe('c')
  expect(_findKeyByValue(o, 4)).toBe('d')
  expect(_findKeyByValue(o, 5)).toBeUndefined()
  expect(_findKeyByValue(o, undefined as any)).toBeUndefined()

  enum CHAR {
    A = 'A',
    B = 'B',
  }

  const map: Record<CHAR, number> = {
    [CHAR.A]: 1,
    [CHAR.B]: 2,
  }

  const char = _findKeyByValue(map, 2)
  // typeof char should be `CHAR | undefined`, not `string | undefined`
  expect(char).toBe(CHAR.B)
})

test('_deepFreeze', () => {
  const o = {
    a: {
      b: 'bb',
    },
  }
  _deepFreeze(o)
  expect(() => (o.a = 'cc' as any)).toThrowErrorMatchingInlineSnapshot(
    `[TypeError: Cannot assign to read only property 'a' of object '#<Object>']`,
  )
  expect(() => (o.a.b = 'cc')).toThrowErrorMatchingInlineSnapshot(
    `[TypeError: Cannot assign to read only property 'b' of object '#<Object>']`,
  )
})

test('_objectAssignExact', () => {
  interface T {
    a?: string
    b?: string
    n?: number
  }

  const target: T = {
    a: 'a',
    n: 1,
  }

  const source: T = {
    a: 'a2',
    b: 'b',
  }
  _deepFreeze(source)

  // First, the behavior of stock Object.assign, to highlight the difference
  expect(Object.assign({}, target, source)).toMatchInlineSnapshot(`
    {
      "a": "a2",
      "b": "b",
      "n": 1,
    }
  `)

  _objectAssignExact(target, source)

  expect(target).toStrictEqual(source)
  expect(target).not.toBe(source)
})

test('_hasProp', () => {
  interface SubObj {
    c: string
  } // to get typescript to yell if not typed correctly
  interface MyObj {
    a?: SubObj
    b?: string
  }
  const collection: MyObj[] = [{ b: 'foo' }, { a: { c: 'bar' } }, { a: { c: 'baz' } }]

  const collectionA = collection.filter(_hasProp('a'))

  expect(collectionA[0]?.a.c).toBe('bar') // Not really testing the expectation, but that TS allows `.a.c` without ?
  expect(collectionA[1]?.a.c).toBe('baz') // ...to pass linting that suggests `find` instead of `filter`
})
