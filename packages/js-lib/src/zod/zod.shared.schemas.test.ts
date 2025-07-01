import { getAjv } from '@naturalcycles/nodejs-lib'
import { describe, expect, test } from 'vitest'
import { customZodSchemas, z } from './index.js'

describe('custom zod schemas', () => {
  test.each(Object.keys(customZodSchemas))(
    'like "z.%s" should properly convert to JSON schema and AJV schema',
    key => {
      const validator = customZodSchemas[key as keyof typeof customZodSchemas]
      const zodSchema = z.object({ value: validator })
      const jsonSchema = z.toJSONSchema(zodSchema, { target: 'draft-7' })
      const ajvSchema = getAjv().compile(jsonSchema)

      expect(ajvSchema).toBeDefined()
    },
  )
})
