import { describe, expect, expectTypeOf, test } from 'vitest'
import {
  _enum,
  _numberEnumAsMap,
  _numberEnumAsMapReversed,
  _numberEnumEntries,
  _numberEnumEntriesReversed,
  _numberEnumKey,
  _numberEnumKeyOrUndefined,
  _numberEnumKeys,
  _numberEnumNormalize,
  _numberEnumNormalizeOrUndefined,
  _numberEnumValue,
  _numberEnumValueOrUndefined,
  _numberEnumValues,
  _stringEnumAsMap,
  _stringEnumAsMapReversed,
  _stringEnumEntries,
  _stringEnumEntriesReversed,
  _stringEnumKey,
  _stringEnumKeyOrUndefined,
  _stringEnumKeys,
  _stringEnumValues,
  getEnumType,
} from './enum.util.js'
import type { Enum } from './types.js'

enum MyNumberEnum {
  K1 = 1,
  K2 = 2,
  K3 = 3,
}

enum MyStringEnum {
  K1_KEY = 'K1_VALUE',
  K2_KEY = 'K2_VALUE',
  K3_KEY = 'K3_VALUE',
}

// Object.keys(MyNumberEnum)
// [ '1', '2', '3', 'K1', 'K2', 'K3' ]
// Object.values(MyNumberEnum)
// [ 'K1', 'K2', 'K3', 1, 2, 3 ]
// Object.keys(MyStringEnum)
// [ 'K1_KEY', 'K2_KEY', 'K3_KEY' ]
// Object.values(MyStringEnum)
// [ 'K1_VALUE', 'K2_VALUE', 'K3_VALUE' ]

test('_numberEnumKeys', () => {
  expect(_numberEnumKeys(MyNumberEnum)).toEqual(['K1', 'K2', 'K3'])
  expectTypeOf(_numberEnumKeys(MyNumberEnum)).toEqualTypeOf<(keyof typeof MyNumberEnum)[]>()
  const keys = _numberEnumKeys(MyNumberEnum)
  expect(keys).not.toContain('some')
})

test('_numberEnumValues', () => {
  expect(_numberEnumValues(MyNumberEnum)).toEqual([1, 2, 3])
  expectTypeOf(_numberEnumValues(MyNumberEnum)).toMatchTypeOf<MyNumberEnum[]>()
  expectTypeOf(_numberEnumValues(MyNumberEnum)).toMatchTypeOf<number[]>()
  const values = _numberEnumValues(MyNumberEnum)
  expect(values).toContain(MyNumberEnum.K1)
})

test('_stringEnumKeys', () => {
  expect(_stringEnumKeys(MyStringEnum)).toMatchInlineSnapshot(`
    [
      "K1_KEY",
      "K2_KEY",
      "K3_KEY",
    ]
  `)
  expectTypeOf(_stringEnumKeys(MyStringEnum)).toEqualTypeOf<(keyof typeof MyStringEnum)[]>()
})

test('_stringEnumValues', () => {
  expect(_stringEnumValues(MyStringEnum)).toMatchInlineSnapshot(`
    [
      "K1_VALUE",
      "K2_VALUE",
      "K3_VALUE",
    ]
  `)

  expectTypeOf(_stringEnumValues(MyStringEnum)).toMatchTypeOf<MyStringEnum[]>()
})

test('_numberEnumEntries', () => {
  expect(Object.fromEntries(_numberEnumEntries(MyNumberEnum))).toMatchInlineSnapshot(`
    {
      "K1": 1,
      "K2": 2,
      "K3": 3,
    }
  `)
  expectTypeOf(_numberEnumEntries(MyNumberEnum)).toMatchTypeOf<
    [keyof typeof MyNumberEnum, MyNumberEnum][]
  >()

  expect(_numberEnumAsMap(MyNumberEnum)).toMatchInlineSnapshot(`
    Map {
      "K1" => 1,
      "K2" => 2,
      "K3" => 3,
    }
  `)

  expect(new Map(_numberEnumEntriesReversed(MyNumberEnum))).toMatchInlineSnapshot(`
    Map {
      1 => "K1",
      2 => "K2",
      3 => "K3",
    }
  `)

  expect(_numberEnumAsMapReversed(MyNumberEnum)).toMatchInlineSnapshot(`
    Map {
      1 => "K1",
      2 => "K2",
      3 => "K3",
    }
  `)
})

test('_stringEnumEntries', () => {
  expect(Object.fromEntries(_stringEnumEntries(MyStringEnum))).toMatchInlineSnapshot(`
    {
      "K1_KEY": "K1_VALUE",
      "K2_KEY": "K2_VALUE",
      "K3_KEY": "K3_VALUE",
    }
  `)

  expect(Object.fromEntries(_stringEnumEntriesReversed(MyStringEnum))).toMatchInlineSnapshot(`
    {
      "K1_VALUE": "K1_KEY",
      "K2_VALUE": "K2_KEY",
      "K3_VALUE": "K3_KEY",
    }
  `)

  expect(_stringEnumAsMap(MyStringEnum)).toMatchInlineSnapshot(`
    Map {
      "K1_KEY" => "K1_VALUE",
      "K2_KEY" => "K2_VALUE",
      "K3_KEY" => "K3_VALUE",
    }
  `)
  expect(_stringEnumAsMapReversed(MyStringEnum)).toMatchInlineSnapshot(`
    Map {
      "K1_VALUE" => "K1_KEY",
      "K2_VALUE" => "K2_KEY",
      "K3_VALUE" => "K3_KEY",
    }
  `)
})

test('_numberEnumValue', () => {
  expect(_numberEnumValue(MyNumberEnum, 'K2')).toBe(2)
  expect(() => _numberEnumValue(MyNumberEnum, 'K4' as any)).toThrowErrorMatchingInlineSnapshot(
    `[Error: _numberEnumValue not found for: K4]`,
  )

  expect(_numberEnumValueOrUndefined(MyNumberEnum, 'K2')).toBe(2)
  expect(_numberEnumValueOrUndefined(MyNumberEnum, 'K4' as any)).toBeUndefined()
  expect(_numberEnumValueOrUndefined(MyNumberEnum, null as any)).toBeUndefined()
  expect(_numberEnumValueOrUndefined(MyNumberEnum, undefined)).toBeUndefined()
  expect(_numberEnumValueOrUndefined(MyNumberEnum, '' as any)).toBeUndefined()
  expect(_numberEnumValueOrUndefined(MyNumberEnum, 0 as any)).toBeUndefined()
})

test('_numberEnumNormalize', () => {
  expect(_numberEnumNormalize(MyNumberEnum, 'K2')).toBe(2)
  expect(_numberEnumNormalize(MyNumberEnum, MyNumberEnum.K2)).toBe(2)

  expect(() => _numberEnumNormalize(MyNumberEnum, 4)).toThrowErrorMatchingInlineSnapshot(
    `[Error: _numberEnumNormalize value not found for: 4]`,
  )
  expect(() => _numberEnumNormalize(MyNumberEnum, 'K4')).toThrowErrorMatchingInlineSnapshot(
    `[Error: _numberEnumNormalize value not found for: K4]`,
  )

  expect(_numberEnumNormalizeOrUndefined(MyNumberEnum, 'K2')).toBe(2)
  expect(_numberEnumNormalizeOrUndefined(MyNumberEnum, MyNumberEnum.K2)).toBe(2)

  // Pass-through case, even if 4 is an invalid value!
  expect(_numberEnumNormalizeOrUndefined(MyNumberEnum, 4)).toBe(4)

  // String types are attempted to be converted and return undefined
  expect(_numberEnumNormalizeOrUndefined(MyNumberEnum, 'K4')).toBeUndefined()
})

test('_numberEnumKey, _numberEnumKeyOrUndefined', () => {
  expect(_numberEnumKeyOrUndefined(MyNumberEnum, 'non-existing' as any)).toBeUndefined()
  expect(_numberEnumKeyOrUndefined(MyNumberEnum, MyNumberEnum.K1)).toBe('K1')
  expect(_numberEnumKeyOrUndefined(MyNumberEnum, 1)).toBe('K1')
  expect(_numberEnumKeyOrUndefined(MyNumberEnum, 'K1' as any)).toBeUndefined()

  expect(() =>
    _numberEnumKey(MyNumberEnum, 'non-existing' as any),
  ).toThrowErrorMatchingInlineSnapshot(`[Error: _numberEnumKey not found for: non-existing]`)
  expect(() => _numberEnumKey(MyNumberEnum, 'K1' as any)).toThrowErrorMatchingInlineSnapshot(
    `[Error: _numberEnumKey not found for: K1]`,
  )

  expect(_numberEnumKey(MyNumberEnum, MyNumberEnum.K1)).toBe('K1')
  expect(_numberEnumKey(MyNumberEnum, 1)).toBe('K1')
})

test('_stringEnumKey', () => {
  expect(_stringEnumKeyOrUndefined(MyStringEnum, 'non-existing' as any)).toBeUndefined()
  expect(() =>
    _stringEnumKey(MyStringEnum, 'non-existing' as any),
  ).toThrowErrorMatchingInlineSnapshot(`[Error: _stringEnumKey not found for: non-existing]`)
  expect(_stringEnumKeyOrUndefined(MyStringEnum, 'K1_VALUE')).toBe('K1_KEY')
  expect(_stringEnumKey(MyStringEnum, 'K2_VALUE')).toBe('K2_KEY')
})

describe('getEnumType', () => {
  test('should return "NumberEnum" for NumberEnum objects', () => {
    enum Foo {
      A = 1,
      B = 2,
      C = 3,
    }

    expect(getEnumType(Foo)).toBe('NumberEnum')
  })

  test('should return "NumberEnum" for objects with only numeric values', () => {
    expect(getEnumType({ a: 1, b: 2 })).toBe('NumberEnum')
  })

  test('should return "StringEnum" for StringEnum objects', () => {
    enum Foo {
      A = 'a',
      B = 'b',
      C = 'c',
    }

    expect(getEnumType(Foo)).toBe('StringEnum')
  })

  test('should return "StringEnum" for objects with only string values', () => {
    expect(getEnumType({ a: 'a', b: 'b' })).toBe('StringEnum')
  })

  test('should return "undefined" for empty enums', () => {
    enum Foo {}

    expect(getEnumType(Foo)).toBeUndefined()
  })

  const testCases = [{}, { a: [1] }, { a: 1, b: 'b' }]
  test.each(testCases)('should return "undefined" for other objects: %s', value => {
    expect(getEnumType(value)).toBeUndefined()
  })
})

describe('_enum', () => {
  const Color = _enum({ RED: 'red', GREEN: 'green' })
  type Color = Enum<typeof Color>

  const Level = _enum({ LOW: 1, HIGH: 2 })
  type Level = Enum<typeof Level>

  test('should expose members with their literal types', () => {
    expect(Color.RED).toBe('red')
    expect(Level.HIGH).toBe(2)
    expectTypeOf(Color.RED).toEqualTypeOf<'red'>()
    expectTypeOf(Level.HIGH).toEqualTypeOf<2>()
    expectTypeOf<Color>().toEqualTypeOf<'red' | 'green'>()
    expectTypeOf<Level>().toEqualTypeOf<1 | 2>()
  })

  test('should expose keys, values and entries in declaration order', () => {
    expect(Color.keys).toEqual(['RED', 'GREEN'])
    expect(Color.values).toEqual(['red', 'green'])
    expect(Color.entries).toEqual([
      ['RED', 'red'],
      ['GREEN', 'green'],
    ])
    expect(Level.values).toEqual([1, 2])
  })

  test('should keep literal types on keys, values and entries', () => {
    expectTypeOf(Color.keys).toEqualTypeOf<readonly ('RED' | 'GREEN')[]>()
    expectTypeOf(Color.values).toEqualTypeOf<readonly Color[]>()
    // the entries tuples stay correlated: 'RED' pairs only with 'red', never with 'green'
    expectTypeOf(Color.entries).toEqualTypeOf<
      readonly (readonly ['RED', 'red'] | readonly ['GREEN', 'green'])[]
    >()

    // in contrast to the built-ins, which widen to string
    expectTypeOf(Object.keys(Color)).toEqualTypeOf<string[]>()
  })

  test('should provide `is` as a type-guard', () => {
    expect(Color.is('red')).toBe(true)
    expect(Color.is('green')).toBe(true)
    expect(Color.is('RED')).toBe(false)
    expect(Color.is('blue')).toBe(false)
    expect(Color.is(undefined)).toBe(false)
    expect(Level.is(1)).toBe(true)
    expect(Level.is('1')).toBe(false)
    expect(Level.is(3)).toBe(false)

    const v: unknown = 'red'
    if (Color.is(v)) {
      expectTypeOf(v).toEqualTypeOf<Color>()
    }
  })

  test('should look the key up by value', () => {
    expect(Color.keyOf('red')).toBe('RED')
    expect(Level.keyOf(2)).toBe('HIGH')
    expectTypeOf(Color.keyOf('red')).toEqualTypeOf<'RED' | 'GREEN'>()

    expect(() => Color.keyOf('blue' as Color)).toThrowErrorMatchingInlineSnapshot(
      `[Error: _enum keyOf not found for: blue]`,
    )

    expect(Color.keyOfOrUndefined('green')).toBe('GREEN')
    expect(Color.keyOfOrUndefined('blue')).toBeUndefined()
    expect(Color.keyOfOrUndefined('RED')).toBeUndefined()
    expect(Color.keyOfOrUndefined(undefined)).toBeUndefined()
    expectTypeOf(Color.keyOfOrUndefined('x')).toEqualTypeOf<'RED' | 'GREEN' | undefined>()
  })

  test('should let the last key win on duplicate values, like a native number enum', () => {
    const Dup = _enum({ A: 'x', B: 'x' })
    expect(Dup.keyOf('x')).toBe('B')
    expect(Dup.values).toEqual(['x', 'x'])
  })

  test('should keep helpers non-enumerable, so iteration/serialization only sees members', () => {
    expect(Object.keys(Color)).toEqual(['RED', 'GREEN'])
    expect(Object.values(Color)).toEqual(['red', 'green'])
    expect(Object.entries(Color)).toEqual([
      ['RED', 'red'],
      ['GREEN', 'green'],
    ])
    expect(JSON.stringify(Color)).toBe('{"RED":"red","GREEN":"green"}')

    const keys: string[] = []
    // oxlint-disable-next-line guard-for-in -- the point of the test is that nothing else is enumerable
    for (const k in Color) keys.push(k)
    expect(keys).toEqual(['RED', 'GREEN'])
  })

  test('should freeze the enum object and its helper arrays', () => {
    expect(Object.isFrozen(Color)).toBe(true)
    expect(Object.isFrozen(Color.keys)).toBe(true)
    expect(Object.isFrozen(Color.values)).toBe(true)
    expect(Object.isFrozen(Color.entries)).toBe(true)
    expect(() => {
      ;(Color as any).is = () => true
    }).toThrow(TypeError)
    expect(() => {
      ;(Color as any).RED = 'nope'
    }).toThrow(TypeError)
    expect(() => {
      ;(Color.values as any).push('blue')
    }).toThrow(TypeError)
  })

  test('should not mutate the input object', () => {
    const input = { RED: 'red' }
    const en = _enum(input)
    expect(en).not.toBe(input)
    expect(Object.isFrozen(input)).toBe(false)
    expect('values' in input).toBe(false)
  })

  test('should throw on keys colliding with the helpers', () => {
    const msg = `[Error: _enum keys must not be named keys, values, entries, is, keyOf, keyOfOrUndefined, as they collide with the helpers]`
    expect(() => _enum({ values: 'a' })).toThrowErrorMatchingInlineSnapshot(msg)
    expect(() => _enum({ keys: 'a', is: 'b' })).toThrowErrorMatchingInlineSnapshot(msg)
    expect(() => _enum({ entries: 'a' })).toThrowErrorMatchingInlineSnapshot(msg)
  })

  test('should be detected by getEnumType', () => {
    // getEnumType takes AnyObject, so it accepts an _enum() object as-is.
    // The _stringEnum*/_numberEnum* helpers do not: the helpers make the object
    // not satisfy StringEnum/NumberEnum. They're not needed, use Color.keys/values/entries.
    expect(getEnumType(Color)).toBe('StringEnum')
    expect(getEnumType(Level)).toBe('NumberEnum')
  })

  test('should support Enum<T> on native TS enums too', () => {
    expectTypeOf<Enum<typeof MyStringEnum>>().toEqualTypeOf<MyStringEnum>()
    expectTypeOf<Enum<typeof MyNumberEnum>>().toEqualTypeOf<MyNumberEnum>()
  })
})
