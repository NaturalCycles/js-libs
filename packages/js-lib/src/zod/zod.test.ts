import { expect, test } from 'vitest'
import { _expectedError } from '../error/try.js'
import { zBaseDBEntity, zEmail, zIsoDateString } from './zod.shared.schemas.js'
import { ZodValidationError, zSafeValidate, zValidate } from './zod.util.js'

test('basic', () => {
  const err = _expectedError(() => zValidate({} as any, zBaseDBEntity), ZodValidationError)
  expect(err).toBeInstanceOf(Error)
  expect(err).toBeInstanceOf(ZodValidationError)
  expect(err.name).toBe('ZodValidationError')
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  expect(err.toString()).toBe('ZodValidationError: ' + err.message)
  expect(err.stack!.split('\n')[0]).toMatchInlineSnapshot(
    `"ZodValidationError: Invalid BaseDBEntity"`,
  )
  expect(err.message).toMatchInlineSnapshot(`
    "Invalid BaseDBEntity

    Input:
    {}

    id: Invalid input: expected string, received undefined"
  `)

  expect(zSafeValidate(' a' as any, zBaseDBEntity).error!.message).toMatchInlineSnapshot(`
    "Invalid BaseDBEntity

    Input:
    a

    Invalid input: expected object, received string"
  `)
})

test('email should lowercase and trim', () => {
  expect(zValidate('Asd+3@sdf.so ', zEmail)).toBe('asd+3@sdf.so')
  expect(zSafeValidate('asd', zEmail).error!.message).toMatchInlineSnapshot(`
    "Invalid Email

    Input:
    asd

    Invalid email address"
  `)
})

test('isoDateString', () => {
  zValidate('2022-04-16', zIsoDateString)
  expect(zSafeValidate('2022-04-1', zIsoDateString).error!.message).toMatchInlineSnapshot(`
    "Invalid IsoDateString

    Input:
    2022-04-1

    Must be an IsoDateString"
  `)
})
