/* eslint-disable id-denylist */
// oxlint-disable no-unused-expressions

import type { Set2 } from 'object/set2.js'
import { describe, test } from 'vitest'
import { j2 } from './jsonSchemaBuilder2.js'

describe('string', () => {
  test('should correctly infer the type', () => {
    const schema1 = j2.string()
    schema1.in satisfies string

    const schema2 = j2.string().nullable()
    schema2.in satisfies string | null

    const schema3 = j2.string().nullable().optional()
    schema3.in satisfies string | null | undefined
  })
})

describe('object', () => {
  test('should correctly infer the type', () => {
    interface Schema1In {
      string: string
      array: string[]
      set: Set2<string> | string[]
      optional?: string
      nullable: string | null
      object: {
        string: string
        array: string[]
        set: Set2<string> | string[]
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

    const schema1 = j2.object({
      string: j2.string(),
      array: j2.array(j2.string()),
      set: j2.set(j2.string()),
      optional: j2.string().optional(),
      nullable: j2.string().nullable(),
      object: j2.object({
        string: j2.string(),
        array: j2.array(j2.string()),
        set: j2.set(j2.string()),
        optional: j2.string().optional(),
        nullable: j2.string().nullable(),
      }),
    })

    schema1.in satisfies Schema1In
    schema1.out satisfies Schema1Out
  })
})

describe('array', () => {
  test('should correctly infer the type', () => {
    const schema1 = j2.array(j2.string())
    schema1.in satisfies string[]
    schema1.out satisfies string[]

    const schema2 = j2.array(j2.string().optional())
    schema2.in satisfies (string | undefined)[]
    schema2.out satisfies (string | undefined)[]
  })
})

describe('set', () => {
  test('should correctly infer the type', () => {
    const schema1 = j2.set(j2.string())
    schema1.in satisfies Set2<string> | string[]
    schema1.out satisfies Set2<string>
  })
})
