import type { KeysMatching, Primitive, UnionKeyOf } from '@naturalcycles/js-lib/types'

/**
 * Compiles a single `ExcludePathSpec` into the dotted/wildcard string form that the
 * underlying CommonDB layer expects (e.g. `'meta.author'`, `'config.*'`, `'tags[].*'`).
 */
export function compileExcludePath<T>(spec: ExcludePathSpec<T>): string {
  if (typeof spec === 'string') return spec
  return spec.path
}

type ArrayElem<T> = T extends readonly (infer U)[] ? U : never
type PrimitiveKeys<T> = KeysMatching<T, Primitive>
type ArrayKeys<T> = KeysMatching<T, readonly unknown[]>
type ObjectKeys<T> = Exclude<keyof T & string, PrimitiveKeys<T> | ArrayKeys<T>>
// String keys of T's non-nullable value, distributed over unions. `never` if T is primitive
// or array-typed, so call sites get a clean "not assignable to never" error instead of
// `keyof string`/`keyof Array` noise (`'toFixed'`, `'push'`, etc.).
type PropertyKeysOf<T> = [NonNullable<T>] extends [Primitive | readonly unknown[]]
  ? never
  : UnionKeyOf<NonNullable<T>> & string
// Append a path segment to a prefix, handling the root (empty-prefix) case.
type Join<P extends string, S extends string> = P extends '' ? S : `${P}.${S}`

/**
 * Path expression for a single entry in `CommonDaoCfg.excludeFromIndexes`.
 *
 * - A plain `string` key for top-level fields (e.g. `'title'`).
 * - A `PathSpec` produced by the `ExcludeFromIndexesBuilder` chain for nested,
 *   wildcard, and array-element paths.
 */
export type ExcludePathSpec<T> = (keyof T & string) | PathSpec

/**
 * Free-form compiled path (e.g. `'meta.author.name'`, `'tags[].*'`). Produced by the
 * `ExcludeFromIndexesBuilder` chain. Consumers don't construct this directly.
 */
export interface PathSpec {
  readonly type: 'path'
  readonly path: string
}

/**
 * Fluent builder for typed exclusion paths.
 *
 * Received as `ex` inside the function form of `CommonDaoCfg.excludeFromIndexes`.
 *
 * `.object(key)` and `.array(key)` return another builder anchored deeper in the path.
 * `.property(key)` and `.wildcard()` return a finished `PathSpec` — you can't keep
 * chaining past those.
 *
 * The class is not intended to be instantiated by consumers — `CommonDao` constructs the
 * root instance and passes it in.
 *
 * @example
 *   ex.object('meta').property('author')                  // 'meta.author'
 *   ex.object('meta').wildcard()                          // 'meta.*'
 *   ex.object('meta').object('author').property('name')   // 'meta.author.name'
 *   ex.array('tags').property('label')                    // 'tags[].label'
 *   ex.array('tags').wildcard()                           // 'tags[].*'
 *   ex.object('meta').array('tags').property('label')     // 'meta.tags[].label'
 */
export class ExcludeFromIndexesBuilder<Current, Prefix extends string = ''> {
  constructor(private readonly prefix: Prefix = '' as Prefix) {}

  /**
   * Descend into an object property. Returns a new builder anchored one level deeper.
   * Only accepts keys whose value is an object (not primitive, not array).
   */
  object<K extends ObjectKeys<NonNullable<Current>>>(
    key: K,
  ): ExcludeFromIndexesBuilder<NonNullable<Current>[K], Join<Prefix, K>> {
    const newPrefix = (this.prefix === '' ? key : `${this.prefix}.${key}`) as Join<Prefix, K>
    return new ExcludeFromIndexesBuilder(newPrefix)
  }

  /**
   * Descend into an array property and iterate its elements. Returns a new builder
   * anchored at the element type. Only accepts keys whose value is an array.
   */
  array<K extends ArrayKeys<NonNullable<Current>>>(
    key: K,
  ): ExcludeFromIndexesBuilder<
    ArrayElem<NonNullable<NonNullable<Current>[K]>>,
    Join<Prefix, `${K}[]`>
  > {
    const newPrefix = (this.prefix === '' ? `${key}[]` : `${this.prefix}.${key}[]`) as Join<
      Prefix,
      `${K}[]`
    >
    return new ExcludeFromIndexesBuilder(newPrefix)
  }

  /**
   * Returns a finished `PathSpec` for `${prefix}.${key}`. Not callable at the root
   * (you must descend with `.object(...)` or `.array(...)` first) or on primitive/array
   * scopes (which have no meaningful sub-keys).
   */
  property<K extends PropertyKeysOf<Current>>(
    this: Prefix extends '' ? never : ExcludeFromIndexesBuilder<Current, Prefix>,
    key: K,
  ): PathSpec {
    return { type: 'path', path: `${this.prefix}.${key}` }
  }

  /**
   * Returns a finished `PathSpec` for `${prefix}.*`. Not callable at the root or on
   * primitive/array scopes.
   */
  wildcard(
    this: Prefix extends ''
      ? never
      : [NonNullable<Current>] extends [Primitive | readonly unknown[]]
        ? never
        : ExcludeFromIndexesBuilder<Current, Prefix>,
  ): PathSpec {
    return { type: 'path', path: `${this.prefix}.*` }
  }
}
