import { expect, it } from 'vitest'
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
  _firstEntry,
  _firstEntryOrUndefined,
  _firstKey,
  _firstKeyOrUndefined,
  _firstValue,
  _firstValueOrUndefined,
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

it('should pick only the existing given props with _pick, mutating only when asked', () => {
  const f = _pick

  const obj = {
    a: 1,
    b: 2,
    c: 3,
    d: false,
  }

  // empty fields
  expect(f(obj, [])).toStrictEqual({})

  const fields = ['a', 'c', 'd', 'e'] as const
  const r = f(obj, fields as any)
  expect(r).toStrictEqual({ a: 1, c: 3, d: false })
  expect('e' in r).toBe(false) // should not add more fields with 'undefined' value
  // should not mutate
  expect(obj.c).toBe(3)
  expect(r).not.toBe(obj)

  // should mutate
  const obj2 = f(obj, ['a'], { mutate: true })
  expect(obj2).toStrictEqual({
    a: 1,
  })
  expect(obj2).toBe(obj)
})

it('should keep the given props with _pickWithUndefined, mutating only when asked', () => {
  const f = _pickWithUndefined

  const obj = {
    a: 1,
    b: 2,
    c: 3,
    d: false,
  }

  // empty fields
  expect(f(obj, [])).toStrictEqual({
    a: undefined,
    b: undefined,
    c: undefined,
    d: undefined,
  })

  const fields = ['a', 'c', 'd', 'e'] as const
  const r = f(obj, fields as any)
  expect(r).toStrictEqual({ a: 1, b: undefined, c: 3, d: false })
  expect('e' in r).toBe(false) // should not add more fields with 'undefined' value
  // should not mutate
  expect(obj.c).toBe(3)
  expect(r).not.toBe(obj)

  // should mutate
  const obj2 = f(obj, ['a'], { mutate: true })
  expect(obj2).toStrictEqual({
    a: 1,
    b: undefined,
    c: undefined,
    d: undefined,
  })
  expect(obj2).toBe(obj)
})

it('should omit the given props from a frozen object with _omit', () => {
  const obj = {
    a: 1,
    b: 2,
    c: 3,
    d: false,
    e: undefined,
  }

  _deepFreeze(obj)

  // empty props
  expect(_omit(obj, [])).toStrictEqual(obj)

  expect(_omit(obj, ['b', 'c'])).toStrictEqual({
    a: 1,
    d: false,
    e: undefined,
  })

  expect(_omit(obj, ['a', 'd', 'e'])).toStrictEqual({
    b: 2,
    c: 3,
  })
})

it('should clear the given props of a frozen object with _omitWithUndefined', () => {
  const obj = {
    a: 1,
    b: 2,
    c: 3,
    d: false,
    e: undefined,
  }

  _deepFreeze(obj)

  // empty props
  expect(_omitWithUndefined(obj, [])).toStrictEqual(obj)

  expect(_omitWithUndefined(obj, ['b', 'c'])).toStrictEqual({
    a: 1,
    b: undefined,
    c: undefined,
    d: false,
    e: undefined,
  })

  expect(_omitWithUndefined(obj, ['a', 'd', 'e'])).toStrictEqual({
    a: undefined,
    b: 2,
    c: 3,
    d: undefined,
    e: undefined,
  })
})

it('should omit the given props in place with _omit and mutate', () => {
  const obj = {
    a: 1,
    b: 2,
    c: 3,
    d: false,
    e: undefined,
  }

  const obj2 = _omit(obj, ['b', 'c'], { mutate: true })
  expect(obj2).toStrictEqual({
    a: 1,
    d: false,
    e: undefined,
  })
  expect(obj2).toBe(obj)
})

it('should clear the given props in place with _omitWithUndefined and mutate', () => {
  const obj = {
    a: 1,
    b: 2,
    c: 3,
    d: false,
    e: undefined,
  }

  const obj2 = _omitWithUndefined(obj, ['b', 'c'], { mutate: true })
  expect(obj2).toStrictEqual({
    a: 1,
    b: undefined,
    c: undefined,
    d: false,
    e: undefined,
  })
  expect(obj2).toBe(obj)
})

it('should remove a nested path with _mask and ignore a missing one', () => {
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

it('should remove a nested path in place with _mask and mutate', () => {
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

it('should trim nested string values in place with _deepTrim', () => {
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

it('should drop falsy values with _filterFalsyValues, mutating only when asked', () => {
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

it('should drop null and undefined values from a frozen object with _filterNullishValues', () => {
  const o = {
    a: 1,
    b: 0,
    c: undefined,
    d: null,
    e: '',
    f: 'wer',
  }
  _deepFreeze(o)

  expect(_filterNullishValues(o)).toStrictEqual({
    a: 1,
    b: 0,
    e: '',
    f: 'wer',
  })
})

it('should keep the defined values of a frozen object with _filterUndefinedValues', () => {
  const o = {
    a: 1,
    b: 0,
    c: undefined,
    d: null,
    e: '',
    f: 'wer',
  }
  _deepFreeze(o)

  expect(_filterUndefinedValues(o)).toStrictEqual({
    a: 1,
    b: 0,
    d: null,
    e: '',
    f: 'wer',
  })
})

it('should drop empty arrays with _filterEmptyArrays', () => {
  expect(_filterEmptyArrays({})).toEqual({})
  expect(_filterEmptyArrays({ a: 'a' })).toEqual({ a: 'a' })
  expect(_filterEmptyArrays({ a: 'a', b: [], c: 'c' })).toEqual({ a: 'a', c: 'c' })
})

it('should drop empty strings, arrays, objects and sets with _filterEmptyValues', () => {
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

it('should drop entries failing the predicate in place with _filterObject and mutate', () => {
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

it('should turn null values into undefined with _objectNullValuesToUndefined', () => {
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

it('should remove a nested path and a top-level key with _unset', () => {
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

it('should return an equal object with new nested references from _deepCopy', () => {
  const o = {
    a: 1,
    b: {
      c: 3,
      d: 4,
    },
  }

  const copy = _deepCopy(o)

  expect(copy).toStrictEqual(o)
  expect(copy).not.toBe(o)
  expect(copy.b).not.toBe(o.b)
})

it('should merge objects with later values winning in _mergeObjects', () => {
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

it('should deep merge objects with _merge', () => {
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

it('should not pollute the prototype with _merge', () => {
  const malicious = JSON.parse('{"__proto__":{"polluted":"yes"}}')
  _merge({}, malicious)
  expect(({} as any).polluted).toBeUndefined()

  const malicious2 = JSON.parse('{"constructor":{"prototype":{"polluted2":"yes"}}}')
  _merge({}, malicious2)
  expect(({} as any).polluted2).toBeUndefined()
})

it('should swap keys and values with _invert', () => {
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

it('should swap keys and values of a Map with _invertMap', () => {
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

it('should read and check nested paths with _get and _has', () => {
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

it.each([
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
])('should set %s at path %s to %s, resulting in %s', (obj, path, value, expected) => {
  expect(_set(obj, path, value)).toEqual(expected)
  expect(obj).toEqual(expected)
})

it('should not pollute the prototype with _set', () => {
  _set({}, '__proto__.polluted', 'yes')
  expect(({} as any).polluted).toBeUndefined()

  _set({}, ['__proto__', 'polluted2'], 'yes')
  expect(({} as any).polluted2).toBeUndefined()

  _set({}, 'constructor.prototype.polluted3', 'yes')
  expect(({} as any).polluted3).toBeUndefined()
})

it('should not pollute the prototype with _unset', () => {
  const origToString = Object.prototype.toString
  _unset({}, '__proto__.toString')
  expect(Object.prototype.toString).toBe(origToString)
})

it('should map keys with _mapKeys', () => {
  const o = { a: 1, b: 2 }
  _deepFreeze(o)
  expect(_mapKeys(o, (k, v) => k + v)).toEqual({ a1: 1, b2: 2 })
})

it('should map the values of a frozen object with _mapValues', () => {
  const users = {
    fred: { user: 'fred', age: 40 },
    pebbles: { user: 'pebbles', age: 1 },
  }
  _deepFreeze(users)
  expect(_mapValues(users, (_k, v) => v)).toEqual(users)
  expect(_mapValues(users, (_k, v) => v.age)).toEqual({ fred: 40, pebbles: 1 })
})

it('should map the values of a StringMap with _mapValues', () => {
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

it('should map keys and values with _mapObject', () => {
  const o = { b: 2, c: 3, d: 4 }
  _deepFreeze(o)

  // Example that inverts keys/values in the object
  const mapped = _mapObject(o, (k, v) => [String(v), k])
  expect(mapped).toEqual({ 2: 'b', 3: 'c', 4: 'd' })
})

it('should find the key of a value with _findKeyByValue, or return undefined', () => {
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

it('should return the first key, integer keys first, with _firstKey and _firstKeyOrUndefined', () => {
  expect(_firstKeyOrUndefined({ a: 1, b: 2 })).toBe('a')
  expect(_firstKeyOrUndefined({ x: 1 })).toBe('x')
  expect(_firstKeyOrUndefined({})).toBeUndefined()
  // V8 sorts integer-like keys ascending first, then string keys in insertion order
  expect(_firstKeyOrUndefined({ 2: 'b', 1: 'a' })).toBe('1')
  expect(_firstKeyOrUndefined({ b: 1, 1: 'a' })).toBe('1')

  expect(() => _firstKey({})).toThrowErrorMatchingInlineSnapshot(
    `[Error: _firstKey called on empty object]`,
  )
  expect(_firstKey({ a: 1, b: 2 })).toBe('a')
  expect(_firstKey({ 2: 'b', 1: 'a' })).toBe('1')
})

it('should return the first value with _firstValue and _firstValueOrUndefined', () => {
  expect(_firstValueOrUndefined({ a: 1, b: 2 })).toBe(1)
  expect(_firstValueOrUndefined({ x: 'only' })).toBe('only')
  expect(_firstValueOrUndefined({})).toBeUndefined()
  expect(_firstValueOrUndefined({ 2: 'b', 1: 'a' })).toBe('a')

  expect(() => _firstValue({})).toThrowErrorMatchingInlineSnapshot(
    `[Error: _firstValue called on empty object]`,
  )
  expect(_firstValue({ a: 1, b: 2 })).toBe(1)
})

it('should return the first entry with _firstEntry and _firstEntryOrUndefined', () => {
  expect(_firstEntryOrUndefined({ a: 1, b: 2 })).toEqual(['a', 1])
  expect(_firstEntryOrUndefined({ x: 'only' })).toEqual(['x', 'only'])
  expect(_firstEntryOrUndefined({})).toBeUndefined()
  expect(_firstEntryOrUndefined({ 2: 'b', 1: 'a' })).toEqual(['1', 'a'])

  expect(() => _firstEntry({})).toThrowErrorMatchingInlineSnapshot(
    `[Error: _firstEntry called on empty object]`,
  )
  expect(_firstEntry({ a: 1, b: 2 })).toEqual(['a', 1])
})

it('should freeze nested objects with _deepFreeze', () => {
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

it('should remove target keys missing from the source with _objectAssignExact', () => {
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

it('should keep the objects that have the prop with _hasProp', () => {
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
