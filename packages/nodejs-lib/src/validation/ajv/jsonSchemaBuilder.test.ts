/* eslint-disable id-denylist */

import type { Set2 } from '@naturalcycles/js-lib/object'
import { describe, expectTypeOf, test } from 'vitest'
import { j } from './jsonSchemaBuilder.js'

describe('string', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.string()
    expectTypeOf(schema1.in).toEqualTypeOf<string>()

    const schema2 = j.string().nullable()
    expectTypeOf(schema2.in).toEqualTypeOf<string | null>()

    const schema3 = j.string().nullable().optional()
    expectTypeOf(schema3.in).toEqualTypeOf<string | null | undefined>()
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
    expectTypeOf(schema1.in).toEqualTypeOf<number>()

    const schema2 = j.number().nullable()
    expectTypeOf(schema2.in).toEqualTypeOf<number | null>()

    const schema3 = j.number().nullable().optional()
    expectTypeOf(schema3.in).toEqualTypeOf<number | null | undefined>()
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

describe('boolean', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.boolean()
    expectTypeOf(schema1.in).toEqualTypeOf<boolean>()

    const schema2 = j.boolean().nullable()
    expectTypeOf(schema2.in).toEqualTypeOf<boolean | null>()

    const schema3 = j.boolean().nullable().optional()
    expectTypeOf(schema3.in).toEqualTypeOf<boolean | null | undefined>()
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

    expectTypeOf(schema1.in).toEqualTypeOf<Schema1In>()
    expectTypeOf(schema1.out).toEqualTypeOf<Schema1Out>()
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

  describe('extend', () => {
    test('should correctly infer the type', () => {
      const schema1 = j.object({ a: j.string().nullable() })

      const schema2 = schema1.extend({ b: j.number().optional() })

      expectTypeOf(schema2.in).toEqualTypeOf<{ a: string | null; b?: number }>()
      expectTypeOf(schema2.out).toEqualTypeOf<{ a: string | null; b?: number }>()
    })
  })
})

describe('array', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.array(j.string())
    expectTypeOf(schema1.in).toEqualTypeOf<string[]>()
    expectTypeOf(schema1.out).toEqualTypeOf<string[]>()

    const schema2 = j.array(j.string().optional())
    expectTypeOf(schema2.in).toEqualTypeOf<(string | undefined)[]>()
    expectTypeOf(schema2.out).toEqualTypeOf<(string | undefined)[]>()
  })
})

describe('set', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.set(j.string())
    expectTypeOf(schema1.in).toEqualTypeOf<Iterable<string>>()
    expectTypeOf(schema1.out).toEqualTypeOf<Set2<string>>()
  })
})

describe('buffer', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.buffer()
    expectTypeOf(schema1.in).toEqualTypeOf<string | any[] | ArrayBuffer | Buffer>()
    expectTypeOf(schema1.out).toEqualTypeOf<Buffer>()
  })
})

describe('oneOf', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.oneOf([j.string().nullable(), j.number()])
    expectTypeOf(schema1.in).toEqualTypeOf<string | number | null>()
    expectTypeOf(schema1.out).toEqualTypeOf<string | number | null>()
  })
})
