import { _isEmpty, _isObject } from '../is.util.js'
import type {
  AnyObject,
  KeyValueTuple,
  MutateOptions,
  ObjectMapper,
  ObjectPredicate,
  RequiredProp,
  Reviver,
  StringMap,
  ValueOf,
} from '../types.js'
import { _objectEntries, SKIP } from '../types.js'

/**
 * Returns clone of `obj` with only `props` preserved.
 * Opposite of Omit.
 */
export function _pick<T extends AnyObject, K extends keyof T>(
  obj: T,
  props: readonly K[],
  opt: MutateOptions = {},
): T {
  if (opt.mutate) {
    // Start as original object (mutable), DELETE properties that are not whitelisted
    for (const k of Object.keys(obj)) {
      if (!props.includes(k as K)) delete obj[k]
    }
    return obj
  }
  // Start as empty object, pick/add needed properties
  const r = {} as T
  for (const k of props) {
    if (k in obj) r[k] = obj[k]
  }
  return r
}

/**
 * Sets all properties of an object except passed ones to `undefined`.
 * This is a more performant alternative to `_pick` that does picking/deleting.
 */
export function _pickWithUndefined<T extends AnyObject, K extends keyof T>(
  obj: T,
  props: readonly K[],
  opt: MutateOptions = {},
): T {
  const r: T = opt.mutate ? obj : { ...obj }
  for (const k of Object.keys(r)) {
    if (!props.includes(k as K)) {
      r[k as K] = undefined as any
    }
  }
  return r
}

/**
 * Returns clone of `obj` with `props` omitted.
 * Opposite of Pick.
 */
export function _omit<T extends AnyObject, K extends keyof T>(
  obj: T,
  props: readonly K[],
  opt: MutateOptions = {},
): T {
  if (opt.mutate) {
    for (const k of props) {
      delete obj[k]
    }
    return obj
  }

  const r = {} as T
  for (const k of Object.keys(obj)) {
    if (!props.includes(k as K)) r[k as K] = obj[k]
  }
  return r
}

/**
 * Sets all passed properties of an object to `undefined`.
 * This is a more performant alternative to `_omit` that does picking/deleting.
 */
export function _omitWithUndefined<T extends AnyObject, K extends keyof T>(
  obj: T,
  props: readonly K[],
  opt: MutateOptions = {},
): T {
  const r: T = opt.mutate ? obj : { ...obj }
  for (const k of props) {
    r[k] = undefined as any
  }
  return r
}

/**
 * Returns object with filtered keys from `props` array.
 * E.g:
 * _mask({...}, [
 *  'account.id',
 *  'account.updated',
 * ])
 */
export function _mask<T extends AnyObject>(obj: T, props: string[], opt: MutateOptions = {}): T {
  const r = opt.mutate ? obj : _deepCopy(obj)
  for (const k of props) {
    _unset(r, k)
  }
  return r
}

/**
 * Removes "falsy" values from the object.
 */
export function _filterFalsyValues<T extends AnyObject>(obj: T, opt: MutateOptions = {}): T {
  return _filterObject(obj, (_k, v) => !!v, opt)
}

/**
 * Removes values from the object that are `null` or `undefined`.
 */
export function _filterNullishValues<T extends AnyObject>(obj: T, opt: MutateOptions = {}): T {
  return _filterObject(obj, (_k, v) => v !== undefined && v !== null, opt)
}

/**
 * Removes values from the object that are `undefined`.
 * Only `undefined` values are removed. `null` values are kept!
 */
export function _filterUndefinedValues<T extends AnyObject>(obj: T, opt: MutateOptions = {}): T {
  return _filterObject(obj, (_k, v) => v !== undefined, opt)
}

export function _filterEmptyArrays<T extends AnyObject>(obj: T, opt: MutateOptions = {}): T {
  return _filterObject(obj, (_k, v) => !Array.isArray(v) || v.length > 0, opt)
}

/**
 * Returns clone of `obj` without properties that does not pass `predicate`.
 * Allows filtering by both key and value.
 */
export function _filterObject<T extends AnyObject>(
  obj: T,
  predicate: ObjectPredicate<T>,
  opt: MutateOptions = {},
): T {
  if (opt.mutate) {
    for (const [k, v] of _objectEntries(obj)) {
      if (!predicate(k, v, obj)) {
        delete obj[k]
      }
    }
    return obj
  }

  const r = {} as T
  for (const [k, v] of _objectEntries(obj)) {
    if (predicate(k, v, obj)) {
      r[k] = v
    }
  }
  return r
}

/**
 * var users = {
 *  'fred':    { 'user': 'fred',    'age': 40 },
 *  'pebbles': { 'user': 'pebbles', 'age': 1 }
 * }
 *
 * _mapValues(users, (_key, value) => value.age)
 * // => { 'fred': 40, 'pebbles': 1 } (iteration order is not guaranteed)
 *
 * To skip some key-value pairs - use _mapObject instead.
 */
export function _mapValues<OUT = unknown, IN extends AnyObject = AnyObject>(
  obj: IN,
  mapper: ObjectMapper<IN, any>,
  opt: MutateOptions = {},
): OUT {
  const map: any = opt.mutate ? obj : {}
  for (const [k, v] of Object.entries(obj)) {
    map[k] = mapper(k, v, obj)
  }
  return map
}

/**
 * _.mapKeys({ 'a': 1, 'b': 2 }, (key, value) => key + value)
 * // => { 'a1': 1, 'b2': 2 }
 *
 * Does not support `mutate` flag.
 *
 * To skip some key-value pairs - use _mapObject instead.
 */
export function _mapKeys<T extends AnyObject>(obj: T, mapper: ObjectMapper<T, string>): T {
  const map = {} as T
  for (const [k, v] of Object.entries(obj)) {
    map[mapper(k, v, obj) as keyof T] = v
  }
  return map
}

/**
 * Maps object through predicate - a function that receives (k, v, obj)
 * k - key
 * v - value
 * obj - whole object
 *
 * Order of arguments in the predicate is different form _mapValues / _mapKeys!
 *
 * Predicate should return a _tuple_ [0, 1], where:
 * 0 - key of returned object (string)
 * 1 - value of returned object (any)
 *
 * If predicate returns SKIP symbol - such key/value pair is ignored (filtered out).
 *
 * Non-string keys are passed via String(...)
 */
export function _mapObject<OUT = unknown, IN extends AnyObject = AnyObject>(
  obj: IN,
  mapper: ObjectMapper<IN, KeyValueTuple<string, any> | typeof SKIP>,
): OUT {
  const map: any = {}
  for (const [k, v] of Object.entries(obj)) {
    const r = mapper(k, v, obj)
    if (r === SKIP) continue
    map[r[0]] = r[1]
  }
  return map
}

export function _findKeyByValue<T extends AnyObject>(obj: T, v: ValueOf<T>): keyof T | undefined {
  return Object.entries(obj).find(([_, value]) => value === v)?.[0] as keyof T
}

export function _objectNullValuesToUndefined<T extends AnyObject>(
  obj: T,
  opt: MutateOptions = {},
): T {
  return _mapValues(obj, (_k, v) => (v === null ? undefined : v), opt)
}

/**
 * Deep copy object (by json parse/stringify, since it has unbeatable performance+simplicity combo).
 */
export function _deepCopy<T>(o: T, reviver?: Reviver): T {
  return JSON.parse(JSON.stringify(o), reviver)
}

/**
 * Performance-optimized implementation of merging two objects
 * without mutating any of them.
 * (if you are allowed to mutate - there can be a faster implementation).
 *
 * Gives ~40% speedup with map sizes between 10 and 100k items,
 * compared to {...obj1, ...obj2} or Object.assign({}, obj1, obj2).
 *
 * Only use it in hot paths that are known to be performance bottlenecks,
 * otherwise it's not worth it (use normal object spread then).
 */
export function _mergeObjects<T>(obj1: StringMap<T>, obj2: StringMap<T>): StringMap<T> {
  const map: StringMap<T> = {}
  for (const k of Object.keys(obj1)) map[k] = obj1[k]
  for (const k of Object.keys(obj2)) map[k] = obj2[k]
  return map
}

/**
 * Returns `undefined` if it's empty (according to `_isEmpty()` specification),
 * otherwise returns the original object.
 */
export function _undefinedIfEmpty<T>(obj: T | undefined): T | undefined {
  return _isEmpty(obj) ? undefined : obj
}

/**
 * Filters the object by removing all key-value pairs where Value is Empty (according to _isEmpty() specification).
 */
export function _filterEmptyValues<T extends AnyObject>(obj: T, opt: MutateOptions = {}): T {
  return _filterObject(obj, (_k, v) => !_isEmpty(v), opt)
}

/**
 * Recursively merges own and inherited enumerable properties of source
 * objects into the destination object, skipping source properties that resolve
 * to `undefined`. Array and plain object properties are merged recursively.
 * Other objects and value types are overridden by assignment. Source objects
 * are applied from left to right. Subsequent sources overwrite property
 * assignments of previous sources.
 *
 * Works as "recursive Object.assign".
 *
 * **Note:** This method mutates `object`.
 *
 * @param target The destination object.
 * @param sources The source objects.
 * @returns Returns `object`.
 * @example
 *
 * var users = {
 *   'data': [{ 'user': 'barney' }, { 'user': 'fred' }]
 * };
 *
 * var ages = {
 *   'data': [{ 'age': 36 }, { 'age': 40 }]
 * };
 *
 * _.merge(users, ages);
 * // => { 'data': [{ 'user': 'barney', 'age': 36 }, { 'user': 'fred', 'age': 40 }] }
 *
 * Based on: https://gist.github.com/Salakar/1d7137de9cb8b704e48a
 */
export function _merge<T extends AnyObject>(target: T, ...sources: any[]): T {
  for (const source of sources) {
    if (!_isObject(source)) continue

    for (const key of Object.keys(source)) {
      if (_isObject(source[key])) {
        ;(target as any)[key] ||= {}
        _merge(target[key], source[key])
      } else {
        ;(target as any)[key] = source[key]
      }
    }
  }

  return target
}

/**
 * Trims all object VALUES deeply.
 * Doesn't touch object KEYS.
 * Mutates.
 */
export function _deepTrim<T extends AnyObject | string>(o: T): T {
  if (!o) return o

  if (typeof o === 'string') {
    return o.trim() as T
  }
  if (typeof o === 'object') {
    for (const k of Object.keys(o)) {
      o[k] = _deepTrim(o[k])
    }
  }

  return o
}

// from: https://github.com/jonschlinkert/unset-value
// mutates obj
export function _unset<T extends AnyObject>(obj: T, prop: string): void {
  if (!_isObject(obj)) {
    return
  }

  if (obj.hasOwnProperty(prop)) {
    delete obj[prop]
    return
  }

  const segs = prop.split('.')
  let last = segs.pop()
  while (segs.length && segs[segs.length - 1]!.endsWith('\\')) {
    last = segs.pop()!.slice(0, -1) + '.' + last
  }
  while (segs.length && _isObject(obj)) {
    const k = segs.shift()!
    obj = obj[k]
  }
  if (!_isObject(obj)) return
  delete obj[last!]
}

export function _invert<T extends AnyObject>(o: T): { [k in ValueOf<T>]: keyof T | undefined } {
  const inv = {} as { [k in ValueOf<T>]: keyof T }
  Object.keys(o).forEach(k => {
    inv[o[k] as ValueOf<T>] = k
  })
  return inv
}

export function _invertMap<K, V>(m: ReadonlyMap<K, V>): Map<V, K> {
  const inv = new Map<V, K>()
  m.forEach((v, k) => inv.set(v, k))
  return inv
}

/**
 * Gets the property value at path of object.
 *
 * @example
 * const obj = {a: 'a', b: 'b', c: { cc: 'cc' }}
 * _get(obj, 'a') // 'a'
 * _get(obj, 'c.cc') // 'cc'
 * _get(obj, 'c[cc]') // 'cc'
 * _get(obj, 'unknown.path') // undefined
 */
export function _get<T extends AnyObject>(obj = {} as T, path = ''): unknown {
  return (
    path
      .replaceAll(/\[([^\]]+)]/g, '.$1')
      .split('.')
      // oxlint-disable-next-line unicorn/no-array-reduce
      .reduce((o, p) => o?.[p], obj)
  )
}

type Many<T> = T | readonly T[]
type PropertyPath = Many<PropertyKey>

/**
 * Sets the value at path of object. If a portion of path doesn’t exist it’s created. Arrays are created for
 * missing index properties while objects are created for all other missing properties.
 *
 * @param obj The object to modify.
 * @param path The path of the property to set.
 * @param value The value to set.
 * @returns Returns object.
 *
 * Based on: https://stackoverflow.com/a/54733755/4919972
 */
export function _set<T extends AnyObject>(obj: T, path: PropertyPath, value: any): T {
  if (!obj || Object(obj) !== obj || !path) return obj as any // When obj is not an object

  // If not yet an array, get the keys from the string-path
  if (!Array.isArray(path)) {
    path = String(path).match(/[^.[\]]+/g) || []
  } else if (!path.length) {
    return obj as any
  }

  // oxlint-disable-next-line unicorn/no-array-reduce
  ;(path as any[]).slice(0, -1).reduce(
    (
      a,
      c,
      i, // Iterate all of them except the last one
    ) =>
      Object(a[c]) === a[c] // Does the key exist and is its value an object?
        ? // Yes: then follow that path
          a[c]
        : // No: create the key. Is the next key a potential array-index?
          (a[c] =
            // eslint-disable-next-line
            Math.abs(path[i + 1]) >> 0 === +path[i + 1]
              ? [] // Yes: assign a new array object
              : {}), // No: assign a new plain object
    obj,
  )[path[path.length - 1]!] = value // Finally assign the value to the last key

  return obj // allow chaining
}

/**
 * Checks if `path` is a direct property of `object` (not null, not undefined).
 *
 * @param obj The object to query.
 * @param path The path to check.
 * @returns Returns `true` if `path` exists, else `false`.
 * @example
 *
 * var object = { 'a': { 'b': { 'c': 3 } } };
 * var other = _.create({ 'a': _.create({ 'b': _.create({ 'c': 3 }) }) });
 *
 * _.has(object, 'a');
 * // => true
 *
 * _.has(object, 'a.b.c');
 * // => true
 *
 * _.has(object, ['a', 'b', 'c']);
 * // => true
 *
 * _.has(other, 'a');
 * // => false
 */
export function _has<T extends AnyObject>(obj: T, path: string): boolean {
  const v = _get(obj, path)
  return v !== undefined && v !== null
}

/**
 * Does Object.freeze recursively for given object.
 *
 * Based on: https://github.com/substack/deep-freeze/blob/master/index.js
 */
export function _deepFreeze(o: any): void {
  Object.freeze(o)

  Object.getOwnPropertyNames(o).forEach(prop => {
    if (
      o.hasOwnProperty(prop) &&
      o[prop] !== null &&
      (typeof o[prop] === 'object' || typeof o[prop] === 'function') &&
      !Object.isFrozen(o[prop])
    ) {
      _deepFreeze(o[prop])
    }
  })
}

/**
 * let target: T = { a: 'a', n: 1}
 * let source: T = { a: 'a2', b: 'b' }
 *
 * _objectAssignExact(target, source)
 *
 * Does the same as `target = source`,
 * except that it mutates the target to make it exactly the same as source,
 * while keeping the reference to the same object.
 *
 * This way it can "propagate deletions".
 * E.g source doesn't have the `n` property, so it'll be deleted from target.
 * With normal Object.assign - it'll override the keys that `source` has, but not the
 * "missing/deleted keys".
 *
 * To make mutation extra clear - function returns void (unlike Object.assign).
 */
export function _objectAssignExact<T extends AnyObject>(target: T, source: T): void {
  Object.assign(target, source)

  for (const k of Object.keys(target)) {
    if (!(k in source)) {
      // consider setting it to undefined maybe?
      delete target[k]
    }
  }
}

/**
 * type MyObj = { a?: string, b?: string }
 *
 * const collection: MyObj[] = [...]
 *
 * const collectionA = collection.filter(_hasProp('a'))
 * --> collectionA is now RequiredProp<MyObj, 'a'>[], i.e. { a: string, b?: string }[]
 */
export function _hasProp<T, Prop extends keyof T>(prop: Prop) {
  return function (object: T): object is RequiredProp<T, Prop> {
    return typeof object[prop] !== 'undefined'
  }
}
