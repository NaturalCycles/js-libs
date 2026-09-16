import type { AnyObject, Enum, NumberEnum, StringEnum } from './types.js'

/**
 * Creates a frozen, runtime Enum object. A replacement for a native TypeScript enum,
 * which is not supported by type-stripping runtimes (e.g `node --experimental-strip-types`).
 *
 * Declare the type with the same name as the const, to mimic how native enums merge value and type.
 *
 * @example
 * export const Color = _enum({ RED: 'red', GREEN: 'green' })
 * export type Color = Enum<typeof Color> // 'red' | 'green'
 *
 * Color.RED // 'red'
 * Color.keys // ['RED', 'GREEN']
 * Color.values // ['red', 'green']
 * Color.entries // [['RED', 'red'], ['GREEN', 'green']]
 * Color.is(x) // type-guard for 'red' | 'green'
 * JSON.stringify(Color) // '{"RED":"red","GREEN":"green"}', no reverse-mapping, no helper leakage
 *
 * The result doesn't satisfy `StringEnum`/`NumberEnum`, so the `_stringEnum*`/`_numberEnum*`
 * functions don't accept it. Use `Color.keys`/`Color.values`/`Color.entries` instead.
 *
 * Throws if the input contains a `keys`, `values`, `entries` or `is` key.
 */
export function _enum<const T extends Record<string, string | number>>(obj: T): EnumObject<T> {
  if (RESERVED_KEYS.some(k => k in obj)) {
    throw new Error(
      `_enum keys must not be named ${RESERVED_KEYS.join(', ')}, as they collide with the helpers`,
    )
  }

  const keys = Object.freeze(Object.keys(obj)) as readonly (keyof T)[]
  const values = Object.freeze(Object.values(obj)) as readonly Enum<T>[]
  const entries = Object.freeze(Object.entries(obj)) as unknown as readonly (readonly [
    keyof T,
    Enum<T>,
  ])[]
  const valueSet = new Set<unknown>(values)

  return Object.freeze(
    Object.defineProperties(
      { ...obj },
      {
        keys: { value: keys },
        values: { value: values },
        entries: { value: entries },
        is: { value: (v: unknown): v is Enum<T> => valueSet.has(v) },
      },
    ),
  ) as EnumObject<T>
}

/**
 * Keys that `_enum()` reserves for its helpers, and therefore rejects as Enum member names.
 */
const RESERVED_KEYS = ['keys', 'values', 'entries', 'is'] as const

export function getEnumType(en: AnyObject): 'StringEnum' | 'NumberEnum' | undefined {
  /*
   * enum Foo { A = 1, B = 2 }
   * becomes
   * { "1": "A", "2": "B", "A": 1, "B": 2}
   *
   * enum Foo { A = "V1", B = "V2" }
   * becomes
   * { "V1": "A", "V2": "B", "A": "V1", "B": "V2"}
   */

  const entries = Object.entries(en)
  if (!entries.length) return

  const [, value] = entries.pop()!

  let isNumberEnum = typeof value === 'number'
  let isStringEnum = typeof value === 'string'

  for (const [key, value] of entries) {
    const isValueNumber = typeof value === 'number'
    const isValueString = typeof value === 'string'

    isStringEnum &&= isValueString
    isNumberEnum &&= isValueNumber || String(en[value]) === key
    if (!isStringEnum && !isNumberEnum) break
  }

  if (isNumberEnum) return 'NumberEnum'
  if (isStringEnum) return 'StringEnum'
}

/**
 * Returns all String keys of a number-enum.
 */
export function _numberEnumKeys<T extends NumberEnum>(en: T): (keyof T)[] {
  return Object.values(en).filter(k => typeof k === 'string')
}

/**
 * Returns all Number values of a number-enum.
 */
export function _numberEnumValues<T extends NumberEnum>(en: T): T[keyof T][] {
  return Object.values(en).filter(k => typeof k === 'number') as any[]
}

/**
 * Returns all String keys of a string-enum.
 */
export function _stringEnumKeys<T extends StringEnum>(en: T): (keyof T)[] {
  return Object.keys(en)
}

/**
 * Returns all String values of a string-enum.
 */
export function _stringEnumValues<T extends StringEnum>(en: T): T[keyof T][] {
  // filtering here is unnecessary, but works as a safety in case Number-enum is passed
  return Object.values(en).filter(k => typeof k === 'string') as any
}

/**
 * Returns all number-enum "entries", where entry is a tuple of [key, value],
 * where key is a String key, value is a Number value, typed as Enum itself.
 *
 * Doesn't work on String-enums!
 */
export function _numberEnumEntries<T extends NumberEnum>(en: T): [k: keyof T, v: T[keyof T]][] {
  return Object.values(en)
    .filter(k => typeof k === 'string')
    .map(k => [k, en[k]]) as any
}

/**
 * Like _numberEnumEntries, but reversed.
 * So, keys are Numbers, values are Strings.
 */
export function _numberEnumEntriesReversed<T extends NumberEnum>(
  en: T,
): [k: T[keyof T], v: keyof T][] {
  return Object.values(en)
    .filter(k => typeof k === 'string')
    .map(k => [en[k], k]) as any
}

/**
 * Like _numberEnumEntries, but as a Map.
 * Keys are Strings, values are Numbers.
 */
export function _numberEnumAsMap<T extends NumberEnum>(en: T): Map<keyof T, T[keyof T]> {
  return new Map(
    Object.values(en)
      .filter(k => typeof k === 'string')
      .map(k => [k, en[k]]) as any,
  )
}

/**
 * Like _numberEnumEntriesReversed, but as a Map.
 * Keys are Numbers (actual Numbers, because it's a Map, not an Object), values are Strings.
 */
export function _numberEnumAsMapReversed<T extends NumberEnum>(en: T): Map<T[keyof T], keyof T> {
  return new Map(
    Object.values(en)
      .filter(k => typeof k === 'string')
      .map(k => [en[k], k]) as any,
  )
}

/**
 * Returns all string-enum "entries", where entry is a tuple of [key, value],
 * where key is a String key, value is a String value, typed as Enum itself.
 *
 * Doesn't work on Number-enums!
 */
export function _stringEnumEntries<T extends StringEnum>(en: T): [k: keyof T, v: T[keyof T]][] {
  return Object.entries(en) as any
}

/**
 * Like _stringEnumEntries, but keys and values are reversed.
 */
export function _stringEnumEntriesReversed<T extends StringEnum>(
  en: T,
): [k: T[keyof T], v: keyof T][] {
  return Object.entries(en).map(([k, v]) => [v, k]) as any
}

/**
 * Return String enum as Map (with the same keys and values).
 */
export function _stringEnumAsMap<T extends StringEnum>(en: T): Map<keyof T, T[keyof T]> {
  return new Map(Object.entries(en)) as any
}

/**
 * Return String enum as Map, with keys and values reversed.
 */
export function _stringEnumAsMapReversed<T extends StringEnum>(en: T): Map<T[keyof T], keyof T> {
  return new Map(Object.entries(en).map(([k, v]) => [v, k])) as any
}

/**
 * Allows to return a Number enum value (typed as Enum itself) based on it's String key.
 * e.g:
 * const v = SomeEnum['stringKey']
 * // v is of type SomeEnum, which is of type Number
 *
 * Throws if value is not found!
 */
export function _numberEnumValue<T extends NumberEnum>(en: T, k: keyof T): T[keyof T] {
  const r = en[k]
  if (!r) throw new Error(`_numberEnumValue not found for: ${k as string}`)
  return r
}

/**
 * _numberEnumKey, but allows to get/return undefined output.
 */
export function _numberEnumValueOrUndefined<T extends NumberEnum>(
  en: T,
  k: keyof T | undefined,
): T[keyof T] | undefined {
  return en[k!]
}

/**
 * Takes number or string enum input, returns normalized Enum output (Number).
 * Only works for number enums.
 *
 * Throws if value is not found!
 */
export function _numberEnumNormalize<T extends NumberEnum>(en: T, v: string | number): T[keyof T] {
  const r = _numberEnumNormalizeOrUndefined(en, v)
  if (!r || !en[r as keyof T]) throw new Error(`_numberEnumNormalize value not found for: ${v}`)
  return r
}

/**
 * Same as _numberEnumNormalize, but allows to return undefined values.
 */
export function _numberEnumNormalizeOrUndefined<T extends NumberEnum>(
  en: T,
  v: string | number | undefined,
): T[keyof T] | undefined {
  return typeof v === 'string' ? en[v as keyof T] : (v as any)
}

/**
 * Returns a String key for given NumberEnum value, or undefined if not found.
 */
export function _numberEnumKeyOrUndefined<T extends NumberEnum>(
  en: T,
  v: T[keyof T] | undefined | null,
): keyof T | undefined {
  const key = (en as any)[v]
  // This prevents passing a Key (not a Value) of enum here, which returns unexpected result (number, not string)
  return typeof key === 'string' ? key : undefined
}

/**
 * Returns a String key for given NumberEnum value, throws if not found.
 */
export function _numberEnumKey<T extends NumberEnum>(
  en: T,
  v: T[keyof T] | undefined | null,
): keyof T {
  const key = (en as any)[v]
  // This prevents passing a Key (not a Value) of enum here, which returns unexpected result (number, not string)
  if (typeof key !== 'string') throw new Error(`_numberEnumKey not found for: ${v}`)
  return key
}

export function _stringEnumKeyOrUndefined<T extends StringEnum>(
  en: T,
  // v: T[keyof T] | undefined | null, // cannot make it type-safe :(
  v: string | undefined | null,
): keyof T | undefined {
  return Object.entries(en).find(([_, v2]) => v2 === v)?.[0]
}

export function _stringEnumKey<T extends StringEnum>(en: T, v: string | undefined | null): keyof T {
  const r = _stringEnumKeyOrUndefined(en, v)
  if (!r) throw new Error(`_stringEnumKey not found for: ${v}`)
  return r
}

export type EnumObject<T> = Readonly<T> & EnumHelpers<T>

/**
 * Helpers that `_enum()` hangs off the returned object.
 * Defined as non-enumerable, so that `Object.keys/values/entries`, `JSON.stringify`
 * and `for..in` still only see the actual Enum members.
 *
 * `keys`/`values`/`entries` are precomputed and frozen, and keep the literal types
 * that the `Object.*` equivalents would widen to `string`.
 */
interface EnumHelpers<T> {
  readonly keys: readonly (keyof T)[]
  readonly values: readonly Enum<T>[]
  readonly entries: readonly (readonly [k: keyof T, v: Enum<T>])[]
  /**
   * Type-guard. O(1), backed by a Set.
   */
  is: (v: unknown) => v is Enum<T>
}
