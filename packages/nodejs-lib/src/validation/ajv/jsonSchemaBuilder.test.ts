/* eslint-disable id-denylist */

import type { Set2 } from '@naturalcycles/js-lib/object'
import type {
  AnyObject,
  BaseDBEntity,
  Branded,
  IANATimezone,
  IsoDate,
  StringMap,
  UnixTimestamp,
} from '@naturalcycles/js-lib/types'
import { describe, expect, expectTypeOf, test } from 'vitest'
import { AjvSchema, j } from './ajvSchema.js'

describe('any', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.any()
    expectTypeOf(schema1).not.toBeNever()

    expectTypeOf(schema1.out).toEqualTypeOf<any>()
  })

  test('should produce an empty schema', () => {
    const schema = j.any().build()
    expect(schema).toEqual({})
  })
})

describe('string', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.string()
    expectTypeOf(schema1.out).toEqualTypeOf<string>()

    const schema2 = j.string().nullable()
    expectTypeOf(schema2.out).toEqualTypeOf<string | null>()

    const schema3 = j.string().nullable().optional()
    expectTypeOf(schema3.out).toEqualTypeOf<string | null | undefined>()
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

  describe('ianaTimezone', () => {
    test('should correctly infer the type', () => {
      const schema1 = j.string().ianaTimezone()
      expectTypeOf(schema1.out).toEqualTypeOf<IANATimezone>()
    })
  })

  describe('optional(values)', () => {
    test('should correctly infer the type', () => {
      const schema1 = j.string().optional([''])
      expectTypeOf(schema1.out).toEqualTypeOf<string | undefined>()

      const schema2 = j.object<{ foo?: string }>({ foo: j.string().optional(['']) })
      expectTypeOf(schema2.out).toEqualTypeOf<{ foo?: string }>()
    })
  })

  describe('isoDate', () => {
    test('should correctly infer the type', () => {
      const schema1 = j.string().isoDate()
      expectTypeOf(schema1.out).toEqualTypeOf<IsoDate>()
    })

    describe('optional(null)', () => {
      test('should correctly infer the type', () => {
        const schema1 = j.string().isoDate().optional(null)
        expectTypeOf(schema1.out).toEqualTypeOf<IsoDate | undefined>()

        const schema2 = j.object<{ date?: IsoDate }>({
          date: j.string().isoDate().optional(null),
        })
        expectTypeOf(schema2.out).toEqualTypeOf<{ date?: IsoDate }>()
      })
    })
  })
})

describe('number', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.number()
    expectTypeOf(schema1.out).toEqualTypeOf<number>()

    const schema2 = j.number().nullable()
    expectTypeOf(schema2.out).toEqualTypeOf<number | null>()

    const schema3 = j.number().nullable().optional()
    expectTypeOf(schema3.out).toEqualTypeOf<number | null | undefined>()
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

  describe('optional(values)', () => {
    test('should correctly infer the type', () => {
      const schema1 = j.number().optional([0])
      expectTypeOf(schema1.out).toEqualTypeOf<number | undefined>()
    })
  })
})

describe('boolean', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.boolean()
    expectTypeOf(schema1.out).toEqualTypeOf<boolean>()

    const schema2 = j.boolean().nullable()
    expectTypeOf(schema2.out).toEqualTypeOf<boolean | null>()

    const schema3 = j.boolean().nullable().optional()
    expectTypeOf(schema3.out).toEqualTypeOf<boolean | null | undefined>()
  })

  describe('optional(values)', () => {
    test('should correctly infer the type', () => {
      const schema1 = j.boolean().optional(false)
      expectTypeOf(schema1.out).toEqualTypeOf<boolean | undefined>()
    })
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
      object: j.object.infer({
        string: j.string(),
        array: j.array(j.string()),
        set: j.set(j.string()),
        optional: j.string().optional(),
        nullable: j.string().nullable(),
      }),
    })

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

  test('should produce a type error when an optional property is missing from the schema', () => {
    interface Schema1 {
      foo: string
      bar?: number
    }

    // @ts-expect-error
    const schema1 = j.object<Schema1>({
      foo: j.string(),
    })

    expectTypeOf(schema1).toBeNever()
  })

  test('should produce a type error when a there is an additional property in the schema', () => {
    interface Schema1 {
      foo: string
    }

    const schema1 = j.object<Schema1>({
      foo: j.string(),
      // @ts-expect-error There is already a warning here
      bar: j.number().optional(),
    })

    expectTypeOf(schema1).toBeNever()
  })

  test('should work with enums', () => {
    // Special test case due to how j.object.infer().isOfType<>() lead to errors
    // when the schema contained an enum property
    enum Bar {
      a = 'A',
    }
    interface Foo {
      e: Bar
    }

    const schema1 = j.object<Foo>({ e: j.enum(Bar) })

    expectTypeOf(schema1).not.toBeNever()
    expectTypeOf(schema1.out).toEqualTypeOf<Foo>()
  })

  describe('extend', () => {
    test('should correctly infer the type', () => {
      interface Foo {
        a: string | null
      }
      const schema1 = j.object<Foo>({ a: j.string().nullable() })

      interface Bar extends Foo {
        b?: number
      }
      const schema2 = schema1.extend({ b: j.number().optional() })

      expectTypeOf(schema2.out).toExtend<Bar>()

      interface Shu {
        a: string | null
        b?: number
      }
      const schema3 = schema2.isOfType<Shu>()
      expectTypeOf(schema3).not.toBeNever()

      const schema4 = schema2.isOfType<Bar & Foo>()
      expectTypeOf(schema4).not.toBeNever()

      const schema5 = schema2.isOfType<{ a: string | null; b: string }>()
      expectTypeOf(schema5).toBeNever()
    })
  })

  describe('concat', () => {
    test('should correctly infer the type', () => {
      interface Foo {
        foo: string
      }
      const fooSchema = j.object<Foo>({ foo: j.string() })

      interface Bar {
        bar: number
      }
      const barSchema = j.object<Bar>({ bar: j.number() })

      interface Shu {
        foo: string
        bar: number
      }
      const shuSchema = fooSchema.concat(barSchema)

      expectTypeOf(shuSchema).not.toBeNever()
      expectTypeOf(shuSchema.out).toExtend<Shu>()

      const ensuredShuSchema = shuSchema.isOfType<Shu>()
      expectTypeOf(ensuredShuSchema).not.toBeNever()
    })

    test('should notice via isOfType when the type mismatches', () => {
      interface Foo {
        foo: string
      }
      const fooSchema = j.object<Foo>({ foo: j.string() })

      interface Bar {
        bar: number
      }
      const barSchema = j.object<Bar>({ bar: j.number() })

      interface Shu {
        foo: string
        bar: string // Should be number
      }
      const shuSchema = fooSchema.concat(barSchema).isOfType<Shu>()

      expectTypeOf(shuSchema).toBeNever()
    })
  })

  describe('.dbEntity', () => {
    test('should correctly infer the type', () => {
      type Id = Branded<string, 'Id'>
      interface DB extends BaseDBEntity {
        id: Id
        foo: string
        shu?: number
      }

      const schema1 = j.object.dbEntity<DB>({
        id: j.string().branded<Id>(),
        foo: j.string(),
        shu: j.number().optional(),
      })

      expectTypeOf(schema1).not.toBeNever()
      expectTypeOf(schema1.out).toEqualTypeOf<DB>()
    })

    test('should collapse to never when no type is passed in', () => {
      const schema1 = j.object.dbEntity({ foo: j.string() })

      expectTypeOf(schema1).toBeNever()
    })

    test('should collapse to never when the passed in type does not match the schema', () => {
      interface DB {
        id: string
        created: UnixTimestamp
        updated: UnixTimestamp
        foo: string
      }

      // @ts-expect-error
      const schema1 = j.object.dbEntity<DB>({ foo: j.number() })

      expectTypeOf(schema1).toBeNever()
    })

    test('should collapse when a non-baseentity property does not get its schema definition', () => {
      type Id = Branded<string, 'Id'>
      interface DB extends BaseDBEntity {
        id: Id
        foo: string
        shu?: number
      }

      // @ts-expect-error
      const schema1 = j.object.dbEntity<DB>({
        id: j.string().branded<Id>(),
        foo: j.string(),
      })

      expectTypeOf(schema1).toBeNever()
    })

    test('should collapse when an overriden baseentity property does not get its schema definition', () => {
      type Id = Branded<string, 'Id'>
      interface DB extends BaseDBEntity {
        id: Id
        foo: string
      }

      // @ts-expect-error
      const schema1 = j.object.dbEntity<DB>({
        foo: j.string(),
      })

      expectTypeOf(schema1).toBeNever()
    })
  })

  describe('.infer', () => {
    test('should correctly infer the type', () => {
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

      const schema1 = j.object.infer({
        string: j.string(),
        array: j.array(j.string()),
        set: j.set(j.string()),
        optional: j.string().optional(),
        nullable: j.string().nullable(),
        object: j.object.infer({
          string: j.string(),
          array: j.array(j.string()),
          set: j.set(j.string()),
          optional: j.string().optional(),
          nullable: j.string().nullable(),
        }),
      })

      expectTypeOf(schema1.out).toEqualTypeOf<Schema1>()
    })

    test('should check the passed-in type', () => {
      const schema = j.object
        .infer({
          foo: j.string().optional(),
        })
        .isOfType<{ foo?: string }>()
      expectTypeOf(schema).not.toBeNever()

      // Different base type: string vs number
      const schema1 = j.object
        .infer({
          foo: j.string().optional(),
        })
        .isOfType<{ foo?: number }>()
      expectTypeOf(schema1).toBeNever()

      // Type expects optional, schema expects non-optional
      const schema2 = j.object
        .infer({
          foo: j.string().optional(),
        })
        .isOfType<{ foo: string }>()
      expectTypeOf(schema2).toBeNever()

      // Type expects optional, schema expects non-optional with undefined
      const schema3 = j.object
        .infer({
          foo: j.string().optional(),
        })
        .isOfType<{ foo: string | undefined }>()
      expectTypeOf(schema3).toBeNever()
    })

    test('should produce a type error when an optional property is missing', () => {
      interface Foo {
        foo: string
        bar?: number
      }

      const schema = j.object
        .infer({
          foo: j.string(),
        })
        .isOfType<Foo>()

      expectTypeOf(schema).toBeNever()
    })

    test('should produce a type error when an additional property is defined in the schema', () => {
      interface Foo {
        foo: string
      }

      const schema = j.object
        .infer({
          foo: j.string(),
          bar: j.number().optional(),
        })
        .isOfType<Foo>()

      expectTypeOf(schema).toBeNever()
    })

    describe('extend', () => {
      test('should correctly infer the type', () => {
        const schema1 = j.object.infer({ a: j.string().nullable() })

        const schema2 = schema1.extend({ b: j.number().optional() })

        expectTypeOf(schema2.out).toEqualTypeOf<{ a: string | null; b?: number }>()
      })
    })
  })

  describe('.any', () => {
    test('should correctly infer the type', () => {
      const schema1 = j.object.any()

      expectTypeOf(schema1).not.toBeNever()
      expectTypeOf(schema1.out).toEqualTypeOf<AnyObject>()
    })
  })

  describe('.withEnumKeys', () => {
    test('should correctly infer the type', () => {
      const schema1 = j.object.withEnumKeys(['a', 'b', 1], j.string())

      expectTypeOf(schema1).not.toBeNever()
      expectTypeOf(schema1.out).toEqualTypeOf<{ a: string; b: string; '1': string }>()
      expectTypeOf(schema1.isOfType<{ a: string; b: string; '1': string }>()).not.toBeNever()

      enum N {
        A = 1,
        B = 2,
        C = 3,
      }
      const schema2 = j.object.withEnumKeys(N, j.string())

      expectTypeOf(schema2).not.toBeNever()
      expectTypeOf(schema2.out).toEqualTypeOf<{ '1': string; '2': string; '3': string }>()
      expectTypeOf(schema2.isOfType<{ '1': string; '2': string; '3': string }>()).not.toBeNever()

      enum S {
        A = 'a',
        B = 'b',
        C = 'c',
      }
      const schema3 = j.object.withEnumKeys(S, j.string())

      expectTypeOf(schema3).not.toBeNever()
      expectTypeOf(schema3.out).toEqualTypeOf<{ a: string; b: string; c: string }>()
      expectTypeOf(schema3.isOfType<{ a: string; b: string; c: string }>()).not.toBeNever()

      const schema4 = j.object.withEnumKeys(S, j.string().optional())

      expectTypeOf(schema4).not.toBeNever()
      expectTypeOf(schema4.out).toEqualTypeOf<Partial<{ a: string; b: string; c: string }>>()
      expectTypeOf(schema4.isOfType<Partial<{ a: string; b: string; c: string }>>()).not.toBeNever()
    })
  })

  describe('.record', () => {
    test('should correctly infer the type', () => {
      type B = Branded<string, 'B'>
      const schema1 = j.object.record(
        j
          .string()
          .regex(/^\d{3,4}$/)
          .branded<B>(),
        j.number().nullable(),
      )

      expectTypeOf(schema1).not.toBeNever()
      expectTypeOf(schema1.out).toEqualTypeOf<Record<B, number | null>>()
      expectTypeOf(schema1.isOfType<Record<B, number | null>>).not.toBeNever()

      const schema2 = j.object.record(
        j
          .string()
          .regex(/^\d{3,4}$/)
          .branded<B>(),
        j.number().optional(),
      )

      expectTypeOf(schema2).not.toBeNever()
      expectTypeOf(schema2.out).toEqualTypeOf<Partial<Record<B, number>>>()
      expectTypeOf(schema2.isOfType<Partial<Record<B, number>>>).not.toBeNever()
    })
  })

  describe('.withRegexKeys', () => {
    test('should correctly infer the type', () => {
      const schema1 = j.object.withRegexKeys(/^\d{3,4}$/, j.number().nullable())

      expectTypeOf(schema1).not.toBeNever()
      expectTypeOf(schema1.out).toEqualTypeOf<StringMap<number | null>>()
      expectTypeOf(schema1.isOfType<StringMap<number | null>>).not.toBeNever()
    })
  })

  describe('.stringMap', () => {
    test('should correctly infer the type', () => {
      const schema1 = j.object.stringMap(j.number().nullable())

      expectTypeOf(schema1).not.toBeNever()
      expectTypeOf(schema1.out).toEqualTypeOf<StringMap<number | null>>()
      expectTypeOf(schema1.isOfType<StringMap<number | null>>).not.toBeNever()
    })
  })
})

describe('array', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.array(j.string())
    expectTypeOf(schema1.out).toEqualTypeOf<string[]>()

    const schema2 = j.array(j.string().optional())
    expectTypeOf(schema2.out).toEqualTypeOf<(string | undefined)[]>()
  })
})

describe('tuple', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.tuple([j.string(), j.number(), j.boolean()])
    expectTypeOf(schema1.out).toEqualTypeOf<[string, number, boolean]>()

    const schema2 = j.tuple([j.string().optional(), j.number(), j.boolean()])
    expectTypeOf(schema2.out).toEqualTypeOf<[string | undefined, number, boolean]>()
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
    expectTypeOf(schema1.out).toEqualTypeOf<Foo>()
  })

  test('should correctly infer the type - for StringEnums', () => {
    enum Foo {
      BAR = 'bar',
      SHU = 'shu',
    }
    const schema1 = j.enum(Foo)
    expectTypeOf(schema1).not.toBeNever()
    expectTypeOf(schema1.out).toEqualTypeOf<Foo>()
  })

  test('should correctly infer the type - for listed values', () => {
    type Foo = 1 | 2 | 'foo' | 'bar'
    const schema1 = j.enum([1, 2, 'foo', 'bar'])
    expectTypeOf(schema1).not.toBeNever()
    expectTypeOf(schema1.out).toEqualTypeOf<Foo>()
  })
})

describe('set', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.set(j.string())
    expectTypeOf(schema1.out).toEqualTypeOf<Set2<string>>()
  })
})

describe('buffer', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.buffer()
    expectTypeOf(schema1.out).toEqualTypeOf<Buffer>()
  })
})

describe('oneOf', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.oneOf([j.string().nullable(), j.number()])
    expectTypeOf(schema1.out).toEqualTypeOf<string | number | null>()
  })
})

describe('anyOf', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.anyOf([j.string().nullable(), j.number()])
    expectTypeOf(schema1.out).toEqualTypeOf<string | number | null>()
  })
})

describe('anyOfBy', () => {
  test('should correctly infer the type', () => {
    enum Foo {
      A = 1,
      B = 2,
      C = 3,
    }
    interface FooA {
      type: Foo.A
      foo: string
    }
    interface FooB {
      type: Foo.B
      bar: number
    }
    interface FooC {
      type: Foo.C
      foo: boolean
    }

    const schema1 = j.anyOfBy('type', {
      [Foo.A]: j.object<FooA>({ type: j.literal(Foo.A), foo: j.string() }),
      [Foo.B]: j.object<FooB>({ type: j.literal(Foo.B), bar: j.number() }),
      [Foo.C]: j.object<FooC>({
        type: j.literal(Foo.C),
        foo: j.boolean(),
      }),
    })

    expectTypeOf(schema1.out).toEqualTypeOf<FooA | FooB | FooC>()
  })
})

describe('castAs', () => {
  test('should correctly infer the new type', () => {
    const schema1 = j.string().castAs<number>()
    expectTypeOf(schema1.out).toEqualTypeOf<number>()

    const schema2 = j.object.infer({}).castAs<{ foo: string }>()
    expectTypeOf(schema2.out).toEqualTypeOf<{ foo: string }>()
  })
})

describe('final', () => {
  test('should correctly infer the type', () => {
    type B = Branded<string, 'B'>
    const schema = j.string().branded<B>().final()
    expectTypeOf(schema.out).toEqualTypeOf<B>()
  })

  test('should not allow to call other chain functions', () => {
    const schema = j.string().final()

    // @ts-expect-error
    expect(() => schema.optional()).toThrow('schema.optional is not a function')
    // @ts-expect-error
    expect(() => schema.nullable()).toThrow('schema.nullable is not a function')
  })
})

describe('literal', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.literal('magic')
    expectTypeOf(schema1.out).toEqualTypeOf<'magic'>()

    enum Foo {
      A = 1,
      B = 2,
    }
    const schema2 = j.literal(Foo.A)
    expectTypeOf(schema2.out).toEqualTypeOf<Foo.A>()
  })
})

describe('custom', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.number().custom(v => (Number.isInteger(v) ? undefined : 'Not an integer!'))
    expectTypeOf(schema1.out).toEqualTypeOf<number>()

    type Integer = Branded<number, 'Integer'>
    const schema2 = j
      .number()
      .custom<Integer>(v => (Number.isInteger(v) ? undefined : 'Not an integer!'))
    expectTypeOf(schema2.out).toEqualTypeOf<Integer>()
  })
})

describe('convert', () => {
  test('should correctly infer the type', () => {
    const schema1 = j.number().convert(v => Math.round(v))
    expectTypeOf(schema1.out).toEqualTypeOf<number>()

    type Integer = Branded<number, 'Integer'>
    const schema2 = j.number().convert(v => Math.round(v) as Integer)
    expectTypeOf(schema2.out).toEqualTypeOf<Integer>()
  })
})

describe('schema cloning with custom/convert', () => {
  test('nested custom and convert should work after schema cloning', () => {
    const schema = AjvSchema.create(
      j
        .object<{ name: string; count: number }>({
          name: j.string().custom(v => (v.length > 0 ? undefined : 'Name required')),
          count: j.number().convert(v => Math.round(v)),
        })
        .build(),
    )

    // Validate with nested custom validation
    expect(() => schema.validate({ name: '', count: 1.5 })).toThrow('Name required')
    expect(schema.validate({ name: 'test', count: 1.5 })).toEqual({ name: 'test', count: 2 })
  })

  test('deeply nested custom and convert should work', () => {
    const schema = AjvSchema.create(
      j
        .object<{ inner: { value: number } }>({
          inner: j.object({
            value: j.number().convert(v => v * 2),
          }),
        })
        .build(),
    )

    expect(schema.validate({ inner: { value: 10 } })).toEqual({ inner: { value: 20 } })
    expect(schema.validate({ inner: { value: 60 } })).toEqual({ inner: { value: 120 } })
  })

  test('chaining custom after custom should clone correctly', () => {
    const base = j.string().custom(v => (v.length > 0 ? undefined : 'Must not be empty'))
    const withExtra = base.custom(v => (v.length <= 5 ? undefined : 'Too long'))

    // base should not be affected by withExtra - only has the first validator
    const baseSchema = AjvSchema.create(j.object<{ value: string }>({ value: base }).build())
    const withExtraSchema = AjvSchema.create(
      j.object<{ value: string }>({ value: withExtra }).build(),
    )

    expect(baseSchema.validate({ value: 'hello world' })).toEqual({ value: 'hello world' }) // long string OK
    expect(() => withExtraSchema.validate({ value: 'hello world' })).toThrow('Too long')
    expect(withExtraSchema.validate({ value: 'hi' })).toEqual({ value: 'hi' })
  })

  test('chaining convert after convert should clone correctly', () => {
    const base = j.number().convert(v => Math.round(v))
    const withExtra = base.convert(v => v * 2)

    // base should not be affected by withExtra - only has the first converter
    const baseSchema = AjvSchema.create(j.object<{ value: number }>({ value: base }).build())
    const withExtraSchema = AjvSchema.create(
      j.object<{ value: number }>({ value: withExtra }).build(),
    )

    expect(baseSchema.validate({ value: 3.7 })).toEqual({ value: 4 }) // just rounded
    expect(withExtraSchema.validate({ value: 3.7 })).toEqual({ value: 8 }) // rounded then doubled
  })
})
