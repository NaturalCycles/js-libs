import { FirebaseAuthError } from 'firebase-admin/auth'
import { describe, expect, test, vi } from 'vitest'
import { mockBackendRequest } from '../test/mocks.js'
import type { FirebaseTokenVerifier } from './firebaseAuth.service.js'
import { FirebaseAuthService } from './firebaseAuth.service.js'

describe('getToken', () => {
  test('should read the cookie if only tokenCookie is configured', () => {
    const service = new FirebaseAuthService(vi.fn<() => Promise<FirebaseTokenVerifier>>(), {
      tokenCookie: 'auth_token',
    })
    const req = mockBackendRequest({
      cookies: { auth_token: 'fromCookie' },
      headers: { 'x-auth-token': 'fromHeader' },
    })

    const token = service.getToken(req)

    expect(token).toBe('fromCookie')
  })

  test('should read the header if only tokenHeader is configured', () => {
    const service = new FirebaseAuthService(vi.fn<() => Promise<FirebaseTokenVerifier>>(), {
      tokenHeader: 'x-auth-token',
    })
    const req = mockBackendRequest({
      cookies: { auth_token: 'fromCookie' },
      headers: { 'x-auth-token': 'fromHeader' },
    })

    const token = service.getToken(req)

    expect(token).toBe('fromHeader')
  })

  test('should read the cookie first, then the header, if both are configured', () => {
    const service = new FirebaseAuthService(vi.fn<() => Promise<FirebaseTokenVerifier>>(), {
      tokenCookie: 'auth_token',
      tokenHeader: 'x-auth-token',
    })
    const reqWithBoth = mockBackendRequest({
      cookies: { auth_token: 'fromCookie' },
      headers: { 'x-auth-token': 'fromHeader' },
    })
    const reqWithHeader = mockBackendRequest({
      headers: { 'x-auth-token': 'fromHeader' },
    })

    const tokenWithBoth = service.getToken(reqWithBoth)
    const tokenWithHeader = service.getToken(reqWithHeader)

    expect(tokenWithBoth).toBe('fromCookie')
    expect(tokenWithHeader).toBe('fromHeader')
  })
})

describe('getEmailByToken', () => {
  test('should return undefined if the token is expired', async () => {
    const service = new FirebaseAuthService(
      async () => ({
        verifyIdToken: async () => {
          throw new FirebaseAuthError({ code: 'id-token-expired', message: 'expired' })
        },
      }),
      {},
    )

    const email = await service.getEmailByToken('expired')

    expect(email).toBeUndefined()
  })

  test('should reject on other verification failures', async () => {
    const service = new FirebaseAuthService(
      async () => ({
        verifyIdToken: async () => {
          throw new FirebaseAuthError({ code: 'argument-error', message: 'bad token' })
        },
      }),
      {},
    )

    await expect(service.getEmailByToken('bad')).rejects.toThrow('bad token')
  })
})
