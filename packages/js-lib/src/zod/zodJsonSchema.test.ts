import { AjvSchema } from '@naturalcycles/nodejs-lib/ajv'
import { expect, test } from 'vitest'
import { _stringify } from '../string/stringify.js'
import type { UnixTimestamp } from '../types.js'
import { z, type zInfer } from './index.js'
import { zValidate } from './zod.util.js'

enum Goal {
  A = 'A',
  B = 'B',
  C = 'C',
}

// interface ExpectedAccountType {
//   id: string
//   // created?: UnixTimestamp // doesn't work, as `.transform` breaks toJsonSchema ;(
//   created: number | undefined // not `created?: number`
//   email: string
//   age: number | undefined
//   completed: boolean | undefined
//   onboardingData: ExpectedAccountOnboardingDataType | undefined
// }
//
// interface ExpectedAccountOnboardingDataType {
//   regGoal: Goal
// }

const zOnboardingData = z.object({
  regGoal: z.enum(Goal),
})

// type AccountOnboardingData = z.infer<typeof zOnboardingData>

const zAccount = z.object({
  id: z.base64Url(),
  created: z.unixTimestamp2000().optional(),
  email: z.email(),
  age: z.number().min(18).max(150).optional(),
  completed: z.boolean().optional(),
  onboardingData: zOnboardingData.optional(),
})

const accountJsonSchema = z.toJSONSchema(zAccount, {
  // target: 'draft-2020-12',
  target: 'draft-7',
})

const accountAjvSchema = AjvSchema.create<Account>(accountJsonSchema as any)

type Account = zInfer<typeof zAccount>
// interface Account extends z.infer<typeof zAccount> {}

function getMockAccount(patch?: Partial<Account>): Account {
  return {
    id: '12345678',
    created: 1609459200 as UnixTimestamp, // 2021-01-01
    email: 'abc@gmail.com',
    age: 30,
    completed: true,
    onboardingData: {
      regGoal: Goal.B,
    },
    ...patch,
  }
}

// test.todo('inferred Account type should match expected type', () => {
//   const account = getMockAccount()
//   expectTypeOf(account).toEqualTypeOf<ExpectedAccountType>()
// })

test('happy case (just zod)', () => {
  const account = getMockAccount()

  const accountResult = zValidate(account, zAccount)
  expect(accountResult).toStrictEqual(account)
  expect(accountResult !== account, 'should not mutate the original object').toBe(true)
})

test('account json schema', () => {
  expect(accountJsonSchema).toMatchInlineSnapshot(`
    {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "additionalProperties": false,
      "properties": {
        "age": {
          "maximum": 150,
          "minimum": 18,
          "type": "number",
        },
        "completed": {
          "type": "boolean",
        },
        "created": {
          "description": "UnixTimestamp2000",
          "maximum": 16725225600,
          "minimum": 946684800,
          "type": "integer",
        },
        "email": {
          "description": "Email",
          "format": "email",
          "pattern": "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$",
          "type": "string",
        },
        "id": {
          "description": "Base64UrlString",
          "pattern": "^[\\w\\-/]+$",
          "type": "string",
        },
        "onboardingData": {
          "additionalProperties": false,
          "properties": {
            "regGoal": {
              "enum": [
                "A",
                "B",
                "C",
              ],
              "type": "string",
            },
          },
          "required": [
            "regGoal",
          ],
          "type": "object",
        },
      },
      "required": [
        "id",
        "email",
      ],
      "type": "object",
    }
  `)
})

test('happy case', () => {
  const account = getMockAccount()

  const accountResult = accountAjvSchema.validate(account)
  expect(accountResult).toStrictEqual(account)
  // expect(accountResult !== account, 'should not mutate the original object').toBe(true)
  // it actually mutates the original object
  expect(accountResult === account, 'should return the reference to the same object').toBe(true)
})

test('email invalid', () => {
  const account = getMockAccount({ email: 'invalid-email' })

  const [err] = accountAjvSchema.getValidationResult(account)
  expect(_stringify(err)).toMatchInlineSnapshot(`
    "AjvValidationError: Object.12345678/email must match pattern "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
    Object.12345678/email must match format "email"
    Input: {
      id: '12345678',
      created: 1609459200,
      email: 'invalid-email',
      age: 30,
      completed: true,
      onboardingData: { regGoal: 'B' }
    }"
  `)
})
