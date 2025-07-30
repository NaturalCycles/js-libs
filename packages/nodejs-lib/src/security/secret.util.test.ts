import { expect, test } from 'vitest'

// todo: mock properly
// const originalProcessEnv = process.env
process.env = {
  A: 'AAA',
  B: 'BBB',
  SECRET_A: 'VALUE A',
  SECRET_B: 'VALUE B',
  SECRET_J: {
    hello: 'secret world',
  } as any,
}

import {
  secrets2JsonPath,
  secretsJsonEncPath,
  secretsJsonPath,
  TEST_ENC_KEY,
} from '../test/test.cnst.js'
// order is important, secret.util should be loaded after the mocks
import {
  getSecretMap,
  loadSecretsFromEncryptedJsonFile,
  loadSecretsFromEncryptedJsonFileValues,
  loadSecretsFromEnv,
  secret,
  secretOptional,
  setSecretMap,
} from './secret.util.js'

test('secret', async () => {
  expect(() => secret('SECRET_A')).toThrow('not loaded')
  expect(() => getSecretMap()).toThrow('not loaded')

  loadSecretsFromEnv()

  expect(process.env['SECRET_A']).toBeUndefined() // should be erased

  expect(getSecretMap()).toMatchObject({
    SECRET_A: 'VALUE A',
    SECRET_B: 'VALUE B',
    SECRET_J: {
      hello: 'secret world',
    },
  })

  expect(secretOptional('N')).toBeUndefined()
  expect(() => secret('N')).toThrowErrorMatchingInlineSnapshot(`[Error: secret(N) not found!]`)
  expect(secret('SECRET_A')).toBe('VALUE A')
  expect(secret('secret_a')).toBe('VALUE A')
  expect(secret('seCrEt_a')).toBe('VALUE A')
  expect(secret('SECRET_B')).toBe('VALUE B')
  expect(secret('SECRET_B', true)).toBe('VALUE B')
  expect(secret('SECRET_J', true)).toEqual({
    hello: 'secret world',
  })

  setSecretMap({ a: 'b' }) // should clear all other secrets! should uppercase keys
  expect(secretOptional('SECRET_A')).toBeUndefined()
  expect(secret('A')).toBe('b')
  expect(secret('a')).toBe('b')
})

test('loadSecretsFromEncryptedJsonFile', async () => {
  setSecretMap({}) // reset

  loadSecretsFromEncryptedJsonFile(secretsJsonPath)
  expect(secret('very')).toBe('secretuous')

  setSecretMap({}) // reset

  loadSecretsFromEncryptedJsonFile(secretsJsonEncPath, TEST_ENC_KEY)
  expect(secret('very')).toBe('secretuous')
})

test('loadSecretsFromEncryptedJsonFileValues', async () => {
  setSecretMap({}) // reset

  loadSecretsFromEncryptedJsonFileValues(secrets2JsonPath, TEST_ENC_KEY)
  expect(secret('very')).toBe('secretuous')
})
