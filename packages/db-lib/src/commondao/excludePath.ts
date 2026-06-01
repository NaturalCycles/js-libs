import type { KeysMatching, Primitive, UnionKeyOf } from '@naturalcycles/js-lib/types'

/**
 * Returns a builder for constructing type-safe `ExcludePathSpec` values for a given row type.
 * Pass the builder to `CommonDaoCfg.excludeFromIndexes` and use its methods to describe
 * nested, wildcard, and array-element paths. Top-level fields can be expressed as plain
 * string keys without going through the builder.
 *
 * @example
 *   excludeFromIndexes: ex => [
 *     'title',
 *     ex.nested('meta', 'author'),
 *     ex.wildcard('config'),
 *     ex.element('tags'),
 *   ]
 */
export function createExcludeBuilder<T>(): ExcludeBuilder<T> {
  return {
    nested: (field, subPath) => ({ type: 'nested', field, subPath }),
    wildcard: field => ({ type: 'wildcard', field }),
    element: (arrayName, matchProperty = '*') => ({ type: 'element', arrayName, matchProperty }),
  }
}

/**
 * Compiles a single `ExcludePathSpec` into the dotted/wildcard string form that the
 * underlying CommonDB layer expects (e.g. `'meta.author'`, `'config.*'`,
 * `'tags[].*'`).
 */
export function compileExcludePath<T>(spec: ExcludePathSpec<T>): string {
  if (typeof spec === 'string') return spec
  switch (spec.type) {
    case 'nested': {
      return `${spec.field}.${spec.subPath}`
    }
    case 'wildcard': {
      return `${spec.field}.*`
    }
    case 'element': {
      return `${spec.arrayName}[].${spec.matchProperty}`
    }
  }
}

type ObjectKeys<T> = Exclude<keyof T & string, PrimitiveKeys<T> | ArrayKeys<T>>
type PrimitiveKeys<T> = KeysMatching<T, Primitive>
type ArrayKeys<T> = KeysMatching<T, readonly unknown[]>
type ArrayElem<T> = T extends readonly (infer U)[] ? U : never

export interface ExcludeBuilder<T> {
  /** Build a path of the form `field.subPath`. */
  nested<K extends ObjectKeys<T>>(
    field: K,
    subPath: UnionKeyOf<NonNullable<T[K]>> & string,
  ): NestedSpec<T>

  /** Build a path of the form `field.*`. */
  wildcard<K extends ObjectKeys<T>>(field: K): WildcardSpec<T>

  /**
   * Build a path of the form `arrayName[].matchProperty`. `matchProperty` defaults
   * to `'*'` (all properties of every element).
   */
  element<K extends ArrayKeys<T>>(
    arrayName: K,
    matchProperty?: (UnionKeyOf<NonNullable<ArrayElem<NonNullable<T[K]>>>> & string) | '*',
  ): ElementSpec<T>
}

/**
 * Path expression for a single entry in `CommonDaoCfg.excludeFromIndexes`.
 *
 * - A plain `string` key for top-level fields (e.g. `'title'`).
 * - A `NestedSpec`, `WildcardSpec`, or `ElementSpec` built via `createExcludeBuilder<T>()`
 *   for nested, wildcard, and array-element paths.
 */
export type ExcludePathSpec<T> =
  | (keyof T & string)
  | NestedSpec<T>
  | WildcardSpec<T>
  | ElementSpec<T>

/** Path of the form `field.subPath` (e.g. `'meta.author'`). */
export interface NestedSpec<T> {
  readonly type: 'nested'
  readonly field: keyof T & string
  readonly subPath: string
}

/** Path of the form `field.*` (e.g. `'config.*'`). */
export interface WildcardSpec<T> {
  readonly type: 'wildcard'
  readonly field: keyof T & string
}

/**
 * Path of the form `arrayName[].matchProperty` (e.g. `'tags[].*'` or
 * `'tags[].label'`).
 */
export interface ElementSpec<T> {
  readonly type: 'element'
  readonly arrayName: keyof T & string
  readonly matchProperty: string
}
