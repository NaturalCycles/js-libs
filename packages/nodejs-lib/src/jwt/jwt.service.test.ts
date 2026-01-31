import { _omit } from '@naturalcycles/js-lib/object'
import { expect, test } from 'vitest'
import { fs2 } from '../fs/fs2.js'
import { testDir } from '../test/paths.cnst.js'
import { AjvSchema, j } from '../validation/ajv/index.js'
import { JWTService } from './jwt.service.js'

const jwtService = new JWTService({
  privateKey: fs2.readText(`${testDir}/demoPrivateKey.pem`),
  publicKey: fs2.readText(`${testDir}/demoPrivateKey.pem`),
  algorithm: 'ES256',
})

interface Data {
  accountId: string
  num: number
}

const dataSchema = AjvSchema.create(
  j.object<Data>({
    accountId: j.string(),
    num: j.number(),
  }),
)

const data1: Data = {
  accountId: 'abc123',
  num: 3,
}

test('jwtService all operations', () => {
  const token1 = jwtService.sign(data1, dataSchema)
  expect(
    token1.startsWith(
      'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50SWQiOiJhYmMxMjMiLCJudW0iOjN9.',
    ),
  ).toBe(true)

  const decoded1 = jwtService.decode(token1, dataSchema)
  expect(decoded1.signature).toBeDefined()
  expect(_omit(decoded1, ['signature'])).toMatchInlineSnapshot(`
    {
      "header": {
        "alg": "ES256",
        "typ": "JWT",
      },
      "payload": {
        "accountId": "abc123",
        "num": 3,
      },
    }
  `)

  const verified1 = jwtService.verify<Data>(token1, dataSchema)
  expect(verified1).toStrictEqual(data1)
})

test('malformed token', () => {
  const token1 = jwtService.sign(data1, dataSchema)
  const token2 = token1.slice(1)
  const token3 = token1.slice(0, token1.length - 2)

  expect(() => jwtService.verify(token2)).toThrowErrorMatchingInlineSnapshot(
    `[JsonWebTokenError: invalid token]`,
  )
  expect(() => jwtService.verify(token3)).toThrowErrorMatchingInlineSnapshot(
    `[TypeError: "ES256" signatures must be "64" bytes, saw "63"]`,
  )

  expect(() => jwtService.decode(token2)).toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: invalid token, decoded value is empty]`,
  )

  // token3 has corrupted signature, but Decode doesn't use it
  const data2 = jwtService.decode(token3)
  expect(data2.payload).toStrictEqual(data1)
})
