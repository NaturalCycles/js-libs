// oxlint-disable no-unused-expressions

import { describe, expect, test } from 'vitest'
import { j2 } from '../json-schema/jsonSchemaBuilder2.js'
import { AjvSchema } from './ajvSchema.js'

describe('string', () => {
  test('should work correctly', () => {
    const schema = j2.string()

    const [err, result] = AjvSchema.create(schema).getValidationResult('foo')

    expect(err).toBeNull()
    expect(result).toBe('foo')
    result satisfies string
  })
})

describe('array', () => {
  test('should work correctly with type inference', () => {
    const schema = j2.array(j2.string().nullable())

    const [err, result] = AjvSchema.create(schema).getValidationResult(['foo', null])

    expect(err).toBeNull()
    expect(result).toEqual(['foo', null])
    result satisfies (string | null)[]
  })

  const testCases: any[] = [
    [j2.string(), ['foo', 'bar']],
    [j2.string().nullable(), ['foo', null]],
  ]
  test.each(testCases)('should work correctly - %s', (itemSchema, input) => {
    const schema = j2.array(itemSchema)

    const [err, result] = AjvSchema.create(schema).getValidationResult(input)

    expect(err).toBeNull()
    expect(result).toEqual(input)
  })
})
