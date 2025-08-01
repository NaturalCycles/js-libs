import { expect, test } from 'vitest'
import { _deepFreeze } from '../object/index.js'
import { z } from './customZod.js'
import { getZodValidationFunction } from './zod.util.js'

test('getZodValidationFunction', () => {
  interface Item {
    id: string
  }

  const zItemSchema = z.object({
    id: z.base64Url(),
  })
  const fn = getZodValidationFunction(zItemSchema)
  const input = { id: '12345678', extra: 'abc' } as Item
  _deepFreeze(input) // ensure non-mutation
  const [err, data] = fn(input)
  expect(err).toBeNull()
  expect(data).toEqual({ id: '12345678' }) // extra property is stripped
})
