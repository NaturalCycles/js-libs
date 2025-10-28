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
  test('should correctly use the passed-in type', () => {
    interface Schema1 {
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

    const schema1 = j.object<Schema1>({
      string: j.string(),
      array: j.array(j.string()),
      set: j.set(j.string()),
      optional: j.string().optional(),
      nullable: j.string().nullable(),
      object: j.objectInfer({
        string: j.string(),
        array: j.array(j.string()),
        set: j.set(j.string()),
        optional: j.string().optional(),
        nullable: j.string().nullable(),
      }),
    })

    expectTypeOf(schema1.in).toEqualTypeOf<Schema1>()
    expectTypeOf(schema1.out).toEqualTypeOf<Schema1>()
  })

  test('should produce a type error when the generic mismatches the schema', () => {
    interface Schema1 {
      foo: string
    }

    const schema1 = j.object<Schema1>({
      // @ts-expect-error There is already a warning here
      foo: j.number(),
    })

    // And  the schema is never
    expectTypeOf(schema1).toBeNever()
  })

  test('the schema should be never when the caller does not pass in the generic', () => {
    // That's only how I could make the generic required - open to better suggestions
    const schema1 = j.object({
      foo: j.number(),
    })

    expectTypeOf(schema1).toBeNever()
  })

  test('should work with enums', () => {
    // Special test case due to how j.objectInfer().isOfType<>() lead to errors
    // when the schema contained an enum property
    enum Bar {
      a = 'A',
    }
    interface Foo {
      e: Bar
    }

    const schema1 = j.object<Foo>({ e: j.enum(Bar) })

    expectTypeOf(schema1).not.toBeNever()
    expectTypeOf(schema1.in).toEqualTypeOf<Foo>()
    expectTypeOf(schema1.out).toEqualTypeOf<Foo>()
  })

  describe('extend', () => {
    test('should correctly infer the type', () => {
      interface Foo {
        a: string | null
      }
      const schema1 = j.object<Foo>({ a: j.string().nullable() })

      interface Bar {
        b?: number
      }
      const schema2 = schema1.extend<Bar>({ b: j.number().optional() })

      expectTypeOf(schema2.in).toEqualTypeOf<Foo & Bar>()
      expectTypeOf(schema2.out).toEqualTypeOf<Foo & Bar>()
    })
  })
})

describe('objectInfer', () => {
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

    const schema1 = j.objectInfer({
      string: j.string(),
      array: j.array(j.string()),
      set: j.set(j.string()),
      optional: j.string().optional(),
      nullable: j.string().nullable(),
      object: j.objectInfer({
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
      .objectInfer({
        foo: j.string().optional(),
      })
      .isOfType<{ foo?: string }>()
    expectTypeOf(schema).not.toBeNever()

    // Different base type: string vs number
    const schema1 = j
      .objectInfer({
        foo: j.string().optional(),
      })
      .isOfType<{ foo?: number }>()
    expectTypeOf(schema1).toBeNever()

    // Type expects optional, schema expects non-optional
    const schema2 = j
      .objectInfer({
        foo: j.string().optional(),
      })
      .isOfType<{ foo: string }>()
    expectTypeOf(schema2).toBeNever()

    // Type expects optional, schema expects non-optional with undefined
    const schema3 = j
      .objectInfer({
        foo: j.string().optional(),
      })
      .isOfType<{ foo: string | undefined }>()
    expectTypeOf(schema3).toBeNever()
  })

  describe('extend', () => {
    test('should correctly infer the type', () => {
      const schema1 = j.objectInfer({ a: j.string().nullable() })

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

describe('enum', () => {
  test('should correctly infer the type - for NumberEnums', () => {
    enum Foo {
      BAR = 1,
      SHU = 2,
    }
    const schema1 = j.enum(Foo)
    expectTypeOf(schema1).not.toBeNever()
    expectTypeOf(schema1.in).toEqualTypeOf<Foo>()
    expectTypeOf(schema1.out).toEqualTypeOf<Foo>()
  })

  test('should correctly infer the type - for StringEnums', () => {
    enum Foo {
      BAR = 'bar',
      SHU = 'shu',
    }
    const schema1 = j.enum(Foo)
    expectTypeOf(schema1).not.toBeNever()
    expectTypeOf(schema1.in).toEqualTypeOf<Foo>()
    expectTypeOf(schema1.out).toEqualTypeOf<Foo>()
  })

  test('should correctly infer the type - for listed values', () => {
    type Foo = 1 | 2 | 'foo' | 'bar'
    const schema1 = j.enum([1, 2, 'foo', 'bar'])
    expectTypeOf(schema1).not.toBeNever()
    expectTypeOf(schema1.in).toEqualTypeOf<Foo>()
    expectTypeOf(schema1.out).toEqualTypeOf<Foo>()
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

describe('castAs', () => {
  test('should correctly infer the new type', () => {
    const schema1 = j.string().castAs<number>()
    expectTypeOf(schema1.in).toEqualTypeOf<number>()
    expectTypeOf(schema1.out).toEqualTypeOf<number>()

    const schema2 = j.objectInfer({}).castAs<{ foo: string }>()
    expectTypeOf(schema2.in).toEqualTypeOf<{ foo: string }>()
    expectTypeOf(schema2.out).toEqualTypeOf<{ foo: string }>()
  })
})
