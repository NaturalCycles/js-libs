import type { AnySchema } from 'joi'
import { validate } from '../validation/joi/index.js'

export function testValidation(schema: AnySchema, valid: any[], invalid: any[]): void {
  valid.forEach(v => {
    try {
      validate(v, schema)
    } catch (err) {
      console.log('value', v)
      throw err
    }
  })

  invalid.forEach(v => {
    try {
      validate(v, schema)
      console.log('value', v)
      // fail('expected to fail on invalid value: ' + v)
      throw new Error(`expected to fail on invalid value: ${v}`)
    } catch {}
  })
}
