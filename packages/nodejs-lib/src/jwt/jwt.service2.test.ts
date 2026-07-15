import { generateKeyPairSync } from 'node:crypto'
import { localTime } from '@naturalcycles/js-lib/datetime'
import type { AppError } from '@naturalcycles/js-lib/error'
import { _expectedError, pExpectedError } from '@naturalcycles/js-lib/error'
import { _omit } from '@naturalcycles/js-lib/object'
import { expect, test } from 'vitest'
import { fs2 } from '../fs/fs2.js'
import { testDir } from '../test/paths.cnst.js'
import { j } from '../validation/ajv/index.js'
import { JWTService } from './jwt.service.js'
import { JWTError, JWTService2, jwtDecode } from './jwt.service2.js'

const privateKey = fs2.readText(`${testDir}/demoPrivateKey.pem`)

interface Data {
  accountId: string
  num: number
}

const dataSchema = j.object<Data>({
  accountId: j.string(),
  num: j.number(),
})

const data1: Data = {
  accountId: 'abc123',
  num: 3,
}

const jwtService2 = new JWTService2({
  privateKey,
  publicKey: privateKey,
  algorithm: 'ES256',
  schema: dataSchema,
})

// Without cfg.schema - for asserting standard claims in payloads,
// which the strict dataSchema would strip (removeAdditional)
const noSchemaService = new JWTService2({
  privateKey,
  publicKey: privateKey,
  algorithm: 'ES256',
})

test('jwtService2 all operations', async () => {
  const token1 = await jwtService2.sign(data1, { expiresAt: null })
  // Byte-identical to what legacy JWTService (jsonwebtoken) produces
  expect(
    token1.startsWith(
      'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50SWQiOiJhYmMxMjMiLCJudW0iOjN9.',
    ),
  ).toBe(true)

  const decoded1 = jwtService2.decode(token1)
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

  const verified1 = await jwtService2.verify(token1)
  expect(verified1).toStrictEqual(data1)

  // verify with explicit publicKey override
  const verified2 = await jwtService2.verify(token1, { publicKey: privateKey })
  expect(verified2).toStrictEqual(data1)
})

test('cross-compatibility with legacy JWTService', async () => {
  const legacyService = new JWTService({
    privateKey,
    publicKey: privateKey,
    algorithm: 'ES256',
  })

  // legacy-signed token verifies with jose
  const legacyToken = legacyService.sign(data1, dataSchema)
  expect(await jwtService2.verify(legacyToken)).toStrictEqual(data1)

  // jose-signed token verifies with legacy
  const token2 = await jwtService2.sign(data1, { expiresAt: null })
  expect(legacyService.verify<Data>(token2, dataSchema)).toStrictEqual(data1)
})

test('expiresAt', async () => {
  const expiresAt = localTime.now().plus(1, 'hour').unix
  const token1 = await noSchemaService.sign(data1, { expiresAt })
  const { exp } = await noSchemaService.verify<Data & { exp: number }>(token1)
  expect(exp).toBe(expiresAt)
})

test('expired token throws JWT_EXPIRED', async () => {
  const expiredToken = await jwtService2.sign(data1, {
    expiresAt: localTime.now().minus(2, 'minute').unix,
  })

  const err = await pExpectedError(jwtService2.verify(expiredToken), JWTError)
  expect(err.data.code).toBe('JWT_EXPIRED')
  expect(err.cause).toBeDefined()
})

test('not-yet-valid token throws JWT_NOT_YET_VALID', async () => {
  const token1 = await jwtService2.sign(data1, {
    expiresAt: null,
    notBefore: localTime.now().plus(1, 'hour').unix,
  })

  const err = await pExpectedError(jwtService2.verify(token1), JWTError)
  expect(err.data.code).toBe('JWT_NOT_YET_VALID')
})

test('verifyOptions: now and clockTolerance', async () => {
  const expiresAt = localTime.now().minus(2, 'minute').unix
  const expiredToken = await jwtService2.sign(data1, { expiresAt })

  // verify "from the past", when the token was not expired yet
  const verified = await jwtService2.verify(expiredToken, {
    now: localTime.now().minus(3, 'minute').unix,
  })
  expect(verified).toMatchObject(data1)

  // clockTolerance covers the 2 minutes of expiration
  const verified2 = await jwtService2.verify(expiredToken, {
    clockTolerance: 180,
  })
  expect(verified2).toMatchObject(data1)

  // without tolerance it still fails
  const err = await pExpectedError(jwtService2.verify(expiredToken), JWTError)
  expect(err.data.code).toBe('JWT_EXPIRED')
})

test('malformed and tampered tokens throw JWT_INVALID', async () => {
  const token1 = await jwtService2.sign(data1, { expiresAt: null })
  const malformedToken = token1.slice(1)
  const tamperedToken = token1.slice(0, -3) + 'AAA'

  const err1 = await pExpectedError(jwtService2.verify(malformedToken), JWTError)
  expect(err1.data.code).toBe('JWT_INVALID')

  const err2 = await pExpectedError(jwtService2.verify(tamperedToken), JWTError)
  expect(err2.data.code).toBe('JWT_INVALID')

  expect(() => jwtService2.decode(malformedToken)).toThrowErrorMatchingInlineSnapshot(
    `[JWTError: invalid token, unable to decode]`,
  )

  // tamperedToken has corrupted signature, but Decode doesn't use it
  const decoded = jwtService2.decode(tamperedToken)
  expect(decoded.payload).toStrictEqual(data1)
})

test('cfg.errorData is merged into JWTError data', async () => {
  const service = new JWTService2({
    privateKey,
    publicKey: privateKey,
    algorithm: 'ES256',
    errorData: {
      backendResponseStatusCode: 401,
    },
  })

  const expiredToken = await service.sign(data1, {
    expiresAt: localTime.now().minus(2, 'minute').unix,
  })

  const err = await pExpectedError(service.verify(expiredToken), JWTError)
  expect(err.data).toMatchObject({
    code: 'JWT_EXPIRED',
    backendResponseStatusCode: 401,
  })
})

test('standard claim signOptions', async () => {
  const issuedAt = localTime.nowUnix()
  const token1 = await noSchemaService.sign(data1, {
    expiresAt: null,
    issuer: 'test-issuer',
    audience: 'test-audience',
    subject: 'test-subject',
    issuedAt,
  })

  const payload = await noSchemaService.verify<Data & Record<string, any>>(token1, {
    issuer: 'test-issuer',
    audience: 'test-audience',
  })
  expect(payload).toMatchObject({
    ...data1,
    iss: 'test-issuer',
    aud: 'test-audience',
    sub: 'test-subject',
  })
  expect(payload['iat']).toBe(issuedAt)

  // mismatched issuer should fail with JWT_INVALID
  const err = await pExpectedError(
    noSchemaService.verify(token1, { issuer: 'other-issuer' }),
    JWTError,
  )
  expect(err.data.code).toBe('JWT_INVALID')
})

test('cfg.signOptions are applied to every sign', async () => {
  const service = new JWTService2({
    privateKey,
    publicKey: privateKey,
    algorithm: 'ES256',
    signOptions: {
      issuer: 'cfg-issuer',
    },
  })

  const token1 = await service.sign(data1, { expiresAt: null })
  const payload = await service.verify<Data & { iss: string }>(token1, {
    issuer: 'cfg-issuer',
  })
  expect(payload.iss).toBe('cfg-issuer')
})

test('schema: cfg-level, opt-level override, claim stripping', async () => {
  // cfg.schema validates on sign: invalid payload rejects with a validation error, not JWTError
  const invalidData = { accountId: 'x' } as Data
  const err1 = await pExpectedError(jwtService2.sign(invalidData, { expiresAt: null }))
  expect(err1).not.toBeInstanceOf(JWTError)

  // opt.schema enables validation on a schema-less service
  const err2 = await pExpectedError(
    noSchemaService.sign(invalidData, { expiresAt: null, schema: dataSchema }),
  )
  expect(err2).not.toBeInstanceOf(JWTError)

  // opt.schema applies on decode too
  const fooToken = await noSchemaService.sign({ foo: 'bar' }, { expiresAt: null })
  expect(() => noSchemaService.decode(fooToken, { schema: dataSchema })).toThrow('accountId')

  // verify with cfg.schema rejects a signature-valid token with non-conforming payload
  const err3 = await pExpectedError(jwtService2.verify(fooToken))
  expect(err3).not.toBeInstanceOf(JWTError)

  // schema-validation errors on verify/decode are extended with cfg.errorData
  // (a non-conforming token is as unauthorized as an invalid one)
  const service401 = new JWTService2({
    privateKey,
    publicKey: privateKey,
    algorithm: 'ES256',
    schema: dataSchema,
    errorData: { backendResponseStatusCode: 401 },
  })
  const err4 = await pExpectedError<AppError>(service401.verify(fooToken))
  expect(err4).not.toBeInstanceOf(JWTError)
  expect(err4.data.backendResponseStatusCode).toBe(401)

  // Strict schema strips standard claims from the returned payload (removeAdditional):
  // exp was set on sign, but is absent after schema validation
  const token1 = await jwtService2.sign(data1, {
    expiresAt: localTime.now().plus(1, 'hour').unix,
  })
  const verified = await jwtService2.verify(token1)
  expect(verified).toStrictEqual(data1)
})

test('verifyAlgorithms: one verifier accepting multiple key types', async () => {
  const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const rsaPrivatePem = rsa.privateKey.export({ type: 'pkcs8', format: 'pem' })
  const rsaPublicPem = rsa.publicKey.export({ type: 'spki', format: 'pem' })

  const rsaSigner = new JWTService2({ privateKey: rsaPrivatePem, algorithm: 'RS256' })
  const ecToken = await noSchemaService.sign(data1, { expiresAt: null })
  const rsaToken = await rsaSigner.sign(data1, { expiresAt: null })

  // One verifier for keys of both types (like Samsung's per-kid key set), key passed per call
  const multiVerifier = new JWTService2({
    algorithm: 'ES256', // Sign (unused here) and the default Verify algorithm
    verifyAlgorithms: ['ES256', 'RS256'],
  })

  expect(await multiVerifier.verify<Data>(ecToken, { publicKey: privateKey })).toStrictEqual(data1)
  expect(await multiVerifier.verify<Data>(rsaToken, { publicKey: rsaPublicPem })).toStrictEqual(
    data1,
  )

  // Key/algorithm mismatch: the token's `alg` cannot steer verification
  // onto a key of the wrong type - allowed algorithms are narrowed to fit the key
  const err1 = await pExpectedError(
    multiVerifier.verify(ecToken, { publicKey: rsaPublicPem }),
    JWTError,
  )
  expect(err1.data.code).toBe('JWT_INVALID')

  // Single-algorithm service rejects tokens of any other algorithm
  const err2 = await pExpectedError(
    noSchemaService.verify(rsaToken, { publicKey: rsaPublicPem }),
    JWTError,
  )
  expect(err2.data.code).toBe('JWT_INVALID')
})

test('kid header option', async () => {
  const token1 = await noSchemaService.sign(data1, { expiresAt: null, kid: 'key-id-1' })
  expect(jwtDecode(token1).header).toEqual({ alg: 'ES256', typ: 'JWT', kid: 'key-id-1' })

  // without kid the header stays unchanged (kid: undefined is dropped by JSON serialization)
  const token2 = await noSchemaService.sign(data1, { expiresAt: null })
  expect(jwtDecode(token2).header).toEqual({ alg: 'ES256', typ: 'JWT' })
})

test('standalone jwtDecode', async () => {
  const token1 = await jwtService2.sign(data1, { expiresAt: null })

  const decoded = jwtDecode<Data>(token1)
  expect(decoded.payload).toStrictEqual(data1)
  expect(decoded.signature).toBeDefined()

  const err = _expectedError(() => jwtDecode(token1.slice(1)), JWTError)
  expect(err.data.code).toBe('JWT_INVALID')
})
