/* eslint-disable id-denylist */
// oxlint-disable no-unused-expressions

import type { Set2 } from '@naturalcycles/js-lib/object'
import { describe, expectTypeOf, test } from 'vitest'
import { j } from './jsonSchemaBuilder.js'

describe('string', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.string()
    schema1.in satisfies string

    const schema2 = j.string().nullable()
    schema2.in satisfies string | null

    const schema3 = j.string().nullable().optional()
    schema3.in satisfies string | null | undefined
  })

  test('should check the passed in type', () => {
    // Ok
    const schema = j.string().isOfType<string>()
    expectTypeOf(schema).not.toBeNever()

    // string vs string | undefined
    const schema1 = j.string().isOfType<string | undefined>()
    expectTypeOf(schema1).toBeNever()

    // string | undefined vs string
    const schema2 = j.string().optional().isOfType<string>()
    expectTypeOf(schema2).toBeNever()
  })
})

describe('number', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.number()
    schema1.in satisfies number

    const schema2 = j.number().nullable()
    schema2.in satisfies number | null

    const schema3 = j.number().nullable().optional()
    schema3.in satisfies number | null | undefined
  })

  test('should check the passed in type', () => {
    // Ok
    const schema = j.number().isOfType<number>()
    expectTypeOf(schema).not.toBeNever()

    // number vs number | undefined
    const schema1 = j.number().isOfType<number | undefined>()
    expectTypeOf(schema1).toBeNever()

    // number | undefined vs number
    const schema2 = j.number().optional().isOfType<number>()
    expectTypeOf(schema2).toBeNever()
  })
})

describe('object', () => {
  test('should correctly infer the type', () => {
    interface Schema1In {
      string: string
      array: string[]
      set: Iterable<string>
      optional?: string
      nullable: string | null
      object: {
        string: string
        array: string[]
        set: Iterable<string>
        optional?: string
        nullable: string | null
      }
    }

    interface Schema1Out {
      string: string
      array: string[]
      set: Set2<string>
      optional?: string
      nullable: string | null
      object: {
        string: string
        array: string[]
        set: Set2<string>
        optional?: string
        nullable: string | null
      }
    }

    const schema1 = j.object({
      string: j.string(),
      array: j.array(j.string()),
      set: j.set(j.string()),
      optional: j.string().optional(),
      nullable: j.string().nullable(),
      object: j.object({
        string: j.string(),
        array: j.array(j.string()),
        set: j.set(j.string()),
        optional: j.string().optional(),
        nullable: j.string().nullable(),
      }),
    })

    schema1.in satisfies Schema1In
    schema1.out satisfies Schema1Out
  })

  test('should check the passed-in type', () => {
    const schema = j
      .object({
        foo: j.string().optional(),
      })
      .isOfType<{ foo?: string }>()
    expectTypeOf(schema).not.toBeNever()

    // Different base type: string vs number
    const schema1 = j
      .object({
        foo: j.string().optional(),
      })
      .isOfType<{ foo?: number }>()
    expectTypeOf(schema1).toBeNever()

    // Type expects optional, schema expects non-optional
    const schema2 = j
      .object({
        foo: j.string().optional(),
      })
      .isOfType<{ foo: string }>()
    expectTypeOf(schema2).toBeNever()

    // Type expects optional, schema expects non-optional with undefined
    const schema3 = j
      .object({
        foo: j.string().optional(),
      })
      .isOfType<{ foo: string | undefined }>()
    expectTypeOf(schema3).toBeNever()
  })
})

describe('array', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.array(j.string())
    schema1.in satisfies string[]
    schema1.out satisfies string[]

    const schema2 = j.array(j.string().optional())
    schema2.in satisfies (string | undefined)[]
    schema2.out satisfies (string | undefined)[]
  })
})

describe('set', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.set(j.string())
    schema1.in satisfies Iterable<string>
    schema1.out satisfies Set2<string>
  })
})
