import { _sortBy } from './array/array.util.js'

declare const __brand: unique symbol

interface Brand<B> {
  [__brand]: B
}

/**
 * Helper to create "Branded" types.
 *
 * Example:
 * export type MyId = Branded<string, 'MyId'>
 *
 * MyId can be assigned to a string,
 * but string cannot be assigned to MyId without casting it (`as MyId`).
 */
export type Branded<T, B> = T & Brand<B>

/**
 * Map from String to String (or <T>).
 *
 * Alternative: Record<string, T | undefined>
 */
export interface StringMap<T = string> {
  [k: string | number]: T | undefined
}

/**
 * Convenience shorthand for `Record<string, any>`.
 * Because `object` type is not safe/recommended to be used (e.g discouraged by eslint-typescript due to: https://github.com/microsoft/TypeScript/issues/21732)
 */
export type AnyObject = Record<string, any>

export type AnyEnum = NumberEnum
export type NumberEnum = Record<string, number | string>
export type StringEnum = Record<string, string>

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CreatedUpdated = {
  created: UnixTimestamp
  updated: UnixTimestamp
}

export interface CreatedUpdatedId extends CreatedUpdated {
  id: string
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ObjectWithId = {
  id: string
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PartialObjectWithId = {
  id?: string
}

export interface AnyPartialObjectWithId extends AnyObject, PartialObjectWithId {}

export interface AnyObjectWithId extends AnyObject, ObjectWithId {}

/**
 * Base interface for any Entity that was saved to DB.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BaseDBEntity = {
  id: string

  /**
   * unixTimestamp of when the entity was first created (in the DB).
   */
  created: UnixTimestamp

  /**
   * unixTimestamp of when the entity was last updated (in the DB).
   */
  updated: UnixTimestamp
}

export type Saved<T> = T & {
  id: string
  created: UnixTimestamp
  updated: UnixTimestamp
}

export type SavedId<T> = T & {
  id: string
}

export type Unsaved<T> = Omit<T, 'id' | 'created' | 'updated'> & {
  id?: string
  created?: UnixTimestamp
  updated?: UnixTimestamp
}

export type UnsavedId<T> = Omit<T, 'id'> & {
  id?: string
}

/**
 * Convenience type shorthand.
 * Because `Function` type is discouraged by eslint.
 */
export type AnyFunction<T = any> = (...args: any[]) => T
export type AnyAsyncFunction<T = any> = (...args: any[]) => Promise<T>
export type AsyncFunction<T = any> = () => Promise<T>
export type AnyPromisableFunction<T = any> = (...args: any[]) => Promisable<T>
export type PromisableFunction<T = any> = () => Promisable<T>
/**
 * A function that lazily calculates something.
 */
export type Lazy<T> = () => T
/**
 * A function that lazily calculates something async (returns a Promise).
 */
export type LazyPromise<T> = () => Promise<T>
/**
 * A function that lazily calculates something async, that can return null.
 */
export type LazyNullablePromise<T> = () => Promise<T | null>
/**
 * Evaluates to the parameters if T is a function, otherwise never
 */
export type MaybeParameters<FN> = FN extends AnyFunction ? Parameters<FN> : never

/**
 * Symbol to indicate END of Sequence.
 */
export const END = Symbol('END')

/**
 * Symbol to indicate SKIP of item (e.g in AbortableMapper)
 */
export const SKIP = Symbol('SKIP')

/**
 * Symbol to indicate cache miss.
 * To distinguish from cache returning `undefined` or `null`.
 */
export const MISS = Symbol('MISS')

/**
 * Function which is called for every item in `input`. Expected to return a `Promise`.
 */
export type AsyncMapper<IN = any, OUT = any> = (input: IN) => PromiseLike<OUT>
export type AsyncIndexedMapper<IN = any, OUT = any> = (input: IN, index: number) => PromiseLike<OUT>
export type Mapper<IN = any, OUT = any> = (input: IN) => OUT
export type IndexedMapper<IN = any, OUT = any> = (input: IN, index: number) => OUT

export const _passthroughMapper: IndexedMapper = item => item
export const _passUndefinedMapper: IndexedMapper<any, void> = () => undefined

/**
 * Function that does nothings and returns `undefined`.
 */
export const _noop = (..._args: any[]): undefined => undefined

export type Predicate<T> = (item: T, index: number) => boolean
export type AsyncPredicate<T> = (item: T, index: number) => PromiseLike<boolean>

export type AbortablePredicate<T> = (item: T, i: number) => boolean | typeof END
export type AbortableAsyncPredicate<T> = (item: T, i: number) => PromiseLike<boolean | typeof END>
export type AbortableMapper<IN = any, OUT = any> = (
  input: IN,
  i: number,
) => OUT | typeof SKIP | typeof END
export type AbortableAsyncMapper<IN = any, OUT = any> = (
  input: IN,
  i: number,
) => PromiseLike<OUT | typeof SKIP | typeof END>

export const _passthroughPredicate: Predicate<any> = () => true
export const _passNothingPredicate: Predicate<any> = () => false

export interface BatchResult<RES = any, ERR = Error> {
  /**
   * Array of successful executions.
   */
  results: RES[]

  /**
   * Returns empty array in case of 0 errors.
   */
  errors: ERR[]
}

/**
 * Like `keyof`, but for arrays.
 *
 * Based on: https://github.com/Microsoft/TypeScript/issues/20965#issuecomment-354858633
 *
 * @example
 *
 * const arr = ['a', 'b'] as const
 * type Foo = ValuesOf<typeof arr> // 'a' | 'b'
 */
export type ValuesOf<T extends readonly any[]> = T[number]

/**
 * Based on: https://stackoverflow.com/a/49286056/4919972
 *
 * @example
 *
 * type Foo = { a: string, b: number }
 * type ValueOfFoo = ValueOf<Foo> // string | number
 */
export type ValueOf<T> = T[keyof T]

export type KeyValueTuple<K, V> = [key: K, value: V]

// Exclude<something, undefined> is used here to support StringMap<OBJ> (because values of StringMap add `undefined`)
export type ObjectMapper<OBJ, OUT> = (
  key: keyof OBJ,
  value: Exclude<OBJ[keyof OBJ], undefined>,
  obj: OBJ,
) => OUT

export type ObjectPredicate<OBJ> = (
  key: keyof OBJ,
  value: Exclude<OBJ[keyof OBJ], undefined>,
  obj: OBJ,
) => boolean

/**
 * Allows to identify instance of Class by `instanceId`.
 */
export interface InstanceId {
  /**
   * Unique id of this instance of the Class.
   */
  instanceId: string
}

/**
 * ISO 8601 date (without time).
 * Branded type.
 *
 * @example '2019-06-21'
 */
export type IsoDate = Branded<string, 'IsoDate'>

/**
 * ISO 8601 date (date+time).
 * Branded type.
 *
 * @example '2019-06-21T05:21:73Z'
 */
export type IsoDateTime = Branded<string, 'IsoDateTime'>

/**
 * Identifies the Month.
 * Like IsoDate, but without the Day token.
 *
 * @example '2023-09'
 */
export type MonthId = string

/**
 * Identifies IANA timezone name.
 * Branded type.
 *
 * @example 'America/New_York'
 */
export type IANATimezone = Branded<string, 'IANATimezone'>

/**
 * Branded UnixTimestamp in seconds.
 * Extends (compatible with) `number`.
 *
 * @example 1628945450
 */
export type UnixTimestamp = Branded<number, 'UnixTimestamp'>

/**
 * Branded UnixTimestamp in milliseconds (not seconds).
 * Extends (compatible with) `number`.
 *
 * @example 1628945450000
 */
export type UnixTimestampMillis = Branded<number, 'UnixTimestampMillis'>

export type NumberOfHours = number
export type NumberOfMinutes = number
export type NumberOfSeconds = number
export type NumberOfMilliseconds = number
/**
 * Integer between 0 and 100 (inclusive).
 */
export type NumberOfPercent = number

/**
 * Same as `number`, but with semantic meaning that it's an Integer.
 */
export type Integer = number
export type PositiveInteger = number
export type NonNegativeInteger = number
export type PositiveNumber = number
export type NonNegativeNumber = number

/**
 * Same as `number`, but with semantic meaning that it's a Float.
 */
export type Float = number
export type PositiveFloat = number
export type NonNegativeFloat = number

/**
 * Convenience type alias, that allows to write this:
 *
 * data: NullableNumber[]
 *
 * instead of this:
 *
 * data: (number | null)[]
 */
export type NullableNumber = number | null
export type NullablePositiveNumber = number | null
export type NullableNonNegativeNumber = number | null

export type NullableInteger = number | null
export type NullablePositiveInteger = number | null
export type NullableNotNegativeInteger = number | null

export type NullableString = string | null
export type NullableBoolean = boolean | null
export type NullableBuffer = Buffer | null

/**
 * Used as a compact representation of truthy value.
 * undefined ('' or other short falsy value) should be used as falsy value.
 */
export type ShortBoolean = '1'

export type Base64String = string
export type Base64UrlString = string
export type JWTString = string
export const JWT_REGEX = /^[\w-]+\.[\w-]+\.[\w-]+$/

export type SemVerString = string

/**
 * Named type for JSON.parse / JSON.stringify second argument
 */
export type Reviver = (this: any, key: string, value: any) => any

/**
 * Like _stringMapValues, but values are sorted.
 */
export function _stringMapValuesSorted<T>(
  map: StringMap<T>,
  mapper: Mapper<T, any>,
  dir: SortDirection = 'asc',
): T[] {
  return _sortBy(_stringMapValues(map), mapper, { dir })
}

/**
 * Needed due to https://github.com/microsoft/TypeScript/issues/13778
 * Only affects typings, no runtime effect.
 */
export const _stringMapValues = Object.values as <T>(map: StringMap<T>) => T[]

/**
 * Needed due to https://github.com/microsoft/TypeScript/issues/13778
 * Only affects typings, no runtime effect.
 */
export const _stringMapEntries = Object.entries as <T>(map: StringMap<T>) => [k: string, v: T][]

/**
 * Resolves to a more specific type if `keyof T` is a specific string type.
 * Otherwise, because object keys are always strings, it resolves to `string`.
 */
export type ObjectKey<T> = keyof T extends string ? keyof T : string

/**
 * Alias of `Object.keys`, but returns keys typed as `keyof T`, not as just `string`.
 * This is how TypeScript should work, actually.
 */
export const _objectKeys = Object.keys as <T extends AnyObject>(obj: T) => ObjectKey<T>[]

/**
 * Alias of `Object.entries`, but returns better-typed output.
 *
 * So e.g you can use _objectEntries(obj).map([k, v] => {})
 * and `k` will be `keyof obj` instead of generic `string`.
 */
export const _objectEntries = Object.entries as <T extends AnyObject>(
  obj: T,
) => [k: ObjectKey<T>, v: T[ObjectKey<T>]][]

export type NullishValue = null | undefined
export type FalsyValue = false | '' | 0 | null | undefined

/**
 * Utility function that helps to cast *existing variable* to needed type T.
 *
 * @example
 * try {} catch (err) {
 *   // err is unknown here
 *   _typeCast<AppError>(err)
 *   // now err is of type AppError
 *   err.data = {} // can be done, because it was casted
 * }
 */
export function _typeCast<T>(_v: any): asserts _v is T {}

/**
 * Type-safe Object.assign that checks that part is indeed a Partial<T>
 */
export const _objectAssign = Object.assign as <T extends AnyObject>(
  target: T,
  part: Partial<T>,
) => T

/**
 * Defines a tuple of [err, data]
 * where only 1 of them exists.
 * Either error exists and data is null
 * Or error is null and data is defined.
 * This forces you to check `if (err)`, which lets
 * TypeScript infer the existence of `data`.
 *
 * Functions like pTry use that.
 */
export type ErrorDataTuple<T = unknown, ERR = Error> = [err: null, data: T] | [err: ERR, data: null]

export type SortDirection = 'asc' | 'desc'

export type Inclusiveness = '[]' | '[)'

/**
 * @experimental
 */
export interface CommonClient extends AsyncDisposable {
  connected: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  ping: () => Promise<void>
}

export type Primitive = null | undefined | string | number | boolean | symbol | bigint

export type Promisable<T> = T | PromiseLike<T>

/**
 Matches a [`class` constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes).
 */
export type Class<T = any> = new (...args: any[]) => T

/**
 Convert `object`s, `Map`s, `Set`s, and `Array`s and all of their keys/elements into immutable structures recursively.
 
 This is useful when a deeply nested structure needs to be exposed as completely immutable, for example, an imported JSON module or when receiving an API response that is passed around.
 
 Please upvote [this issue](https://github.com/microsoft/TypeScript/issues/13923) if you want to have this type as a built-in in TypeScript.
 
 @example
 ```
 // data.json
 {
 "foo": ["bar"]
 }
 
 // main.ts
 import {ReadonlyDeep} from 'type-fest';
 import dataJson = require('./data.json');
 
 const data: ReadonlyDeep<typeof dataJson> = dataJson;
 
 export default data;
 
 // test.ts
 import data from './main';
 
 data.foo.push('bar');
 //=> error TS2339: Property 'push' does not exist on type 'readonly string[]'
 ```
 */
/* eslint-disable @typescript-eslint/no-restricted-types */
export type ReadonlyDeep<T> = T extends Primitive | ((...args: any[]) => unknown)
  ? T
  : T extends ReadonlyMap<infer KeyType, infer ValueType>
    ? ReadonlyMapDeep<KeyType, ValueType>
    : T extends ReadonlySet<infer ItemType>
      ? ReadonlySetDeep<ItemType>
      : T extends object
        ? ReadonlyObjectDeep<T>
        : unknown

/**
 Same as `ReadonlyDeep`, but accepts only `ReadonlyMap`s as inputs. Internal helper for `ReadonlyDeep`.
 */
interface ReadonlyMapDeep<KeyType, ValueType>
  extends ReadonlyMap<ReadonlyDeep<KeyType>, ReadonlyDeep<ValueType>> {}

/**
 Same as `ReadonlyDeep`, but accepts only `ReadonlySet`s as inputs. Internal helper for `ReadonlyDeep`.
 */
interface ReadonlySetDeep<ItemType> extends ReadonlySet<ReadonlyDeep<ItemType>> {}

/**
 Same as `ReadonlyDeep`, but accepts only `object`s as inputs. Internal helper for `ReadonlyDeep`.
 */
type ReadonlyObjectDeep<ObjectType extends object> = {
  readonly [KeyType in keyof ObjectType]: ReadonlyDeep<ObjectType[KeyType]>
}

/* eslint-enable */
