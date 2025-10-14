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
