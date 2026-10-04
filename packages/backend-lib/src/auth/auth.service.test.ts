import { _expectedError, AssertionError } from '@naturalcycles/js-lib/error'
import type { AnyObject } from '@naturalcycles/js-lib/types'
import { afterAll, describe, expect, test, vi } from 'vitest'
import { getDefaultRouter } from '../express/getDefaultRouter.js'
import { mockBackendRequest } from '../test/mocks.js'
import { expressTestService } from '../testing/index.js'
import type { AuthCheck, ResolvedAuth } from './auth.service.js'
import { AuthService } from './auth.service.js'

const middlewareAuthService = new AuthService({
  authenticate: async req => req.header('x-subject'),
  getPermissions: async subject => (subject === 'p1@mail.com' ? ['p1'] : undefined),
})

const storedAuthService = new AuthService<{ requestId: string }>({
  authenticate: async () => undefined,
  getPermissions: async () => undefined,
  onCheck: vi.fn<(check: AuthCheck, ctx: { requestId: string } | undefined) => void>(),
})
const storedResolved: ResolvedAuth = { subject: 'stored@mail.com', permissions: ['p1'] }

const resource = getDefaultRouter()
resource.get('/json', middlewareAuthService.getMiddleware()(['p1']), (_req, res) => {
  res.json({ ok: true })
})
resource.get(
  '/login',
  middlewareAuthService.getLoginRedirectMiddleware({ loginHtmlPath: '/login.html' })(['p1']),
  (_req, res) => {
    res.json({ ok: true })
  },
)
resource.get(
  '/secure',
  middlewareAuthService.getMiddleware({
    secureHeader: { name: 'x-secure-header', value: 'secret1' },
  })(['p1']),
  (_req, res) => {
    res.json({ ok: true })
  },
)
resource.get(
  '/stored',
  storedAuthService.getMiddleware({
    getResolved: () => storedResolved,
    getCtx: () => ({ requestId: 'r1' }),
  })(['p1']),
  (_req, res) => {
    res.json({ ok: true })
  },
)

const app = await expressTestService.createAppFromResource(resource)

afterAll(async () => {
  await app.close()
})

describe('resolve', () => {
  test('should resolve to empty object if there is no subject', async () => {
    const authService = new AuthService({
      authenticate: async () => undefined,
      getPermissions: vi.fn<() => Promise<undefined>>(),
    })

    const resolved = await authService.resolve(mockBackendRequest())

    expect(resolved).toEqual({})
    expect(authService.cfg.getPermissions).not.toHaveBeenCalled()
  })

  test('should resolve the subject and its permissions', async () => {
    const authService = new AuthService({
      authenticate: async () => 'p1@mail.com',
      getPermissions: async () => ['p1'],
    })

    const resolved = await authService.resolve(mockBackendRequest())

    expect(resolved).toEqual({
      subject: 'p1@mail.com',
      permissions: ['p1'],
      alwaysAuthorized: false,
    })
  })

  test('should store the result of isAlwaysAuthorized', async () => {
    const authService = new AuthService({
      authenticate: async () => 'p1@mail.com',
      getPermissions: async () => ['p1'],
      isAlwaysAuthorized: async subject => subject === 'p1@mail.com',
    })

    const resolved = await authService.resolve(mockBackendRequest())

    expect(resolved.alwaysAuthorized).toBe(true)
  })
})

describe('require', () => {
  test('should return the granted permissions on AND-comparison', () => {
    const authService = new AuthService({
      authenticate: async () => undefined,
      getPermissions: async () => undefined,
    })
    const resolved = { subject: 'p1p2@mail.com', permissions: ['p1', 'p2'] }

    const permissionInfo = authService.require(resolved, ['p1'])

    expect(permissionInfo).toEqual({ subject: 'p1p2@mail.com', permissions: ['p1'] })
  })

  test('should return only the granted permissions on OR-comparison', () => {
    const authService = new AuthService({
      authenticate: async () => undefined,
      getPermissions: async () => undefined,
    })
    const resolved = { subject: 'p1@mail.com', permissions: ['p1'] }

    const permissionInfo = authService.require(resolved, ['p1', 'p2'], { andComparison: false })

    expect(permissionInfo).toEqual({ subject: 'p1@mail.com', permissions: ['p1'] })
  })

  test('should throw 401 if there is no subject', () => {
    const authService = new AuthService({
      authenticate: async () => undefined,
      getPermissions: async () => undefined,
    })

    const err = _expectedError(() => authService.require({}, ['p1']), AssertionError)

    expect(err.data).toMatchObject({ authRequired: true, backendResponseStatusCode: 401 })
  })

  test('should throw 403 with the subject if not granted', () => {
    const authService = new AuthService({
      authenticate: async () => undefined,
      getPermissions: async () => undefined,
    })
    const resolved = { subject: 'p1@mail.com', permissions: ['p1'] }

    const err = _expectedError(() => authService.require(resolved, ['p1', 'p2']), AssertionError)

    expect(err.data).toMatchObject({
      permissionsRequired: ['p1', 'p2'],
      subject: 'p1@mail.com',
      backendResponseStatusCode: 403,
    })
  })

  test('should grant and return all real permissions if alwaysAuthorized', () => {
    const authService = new AuthService({
      authenticate: async () => undefined,
      getPermissions: async () => undefined,
    })
    const resolved = {
      subject: 'p1@mail.com',
      permissions: ['p1'],
      alwaysAuthorized: true,
    }

    const permissionInfo = authService.require(resolved, ['p2'])

    expect(permissionInfo).toEqual({ subject: 'p1@mail.com', permissions: ['p1'] })
  })

  test('should grant if auth is disabled at runtime', () => {
    const authService = new AuthService({
      authenticate: async () => undefined,
      getPermissions: async () => undefined,
    })

    authService.cfg.authEnabled = false
    const permissionInfo = authService.require({}, ['p1'])
    authService.cfg.authEnabled = true
    const err = _expectedError(() => authService.require({}, ['p1']), AssertionError)

    expect(permissionInfo).toEqual({ subject: 'authDisabled', permissions: [] })
    expect(err.data['backendResponseStatusCode']).toBe(401)
  })
})

describe('onCheck', () => {
  test('should be called with ctx', () => {
    const authService = new AuthService<{ requestId: string }>({
      authenticate: async () => undefined,
      getPermissions: async () => undefined,
      onCheck: vi.fn<(check: AuthCheck, ctx: { requestId: string } | undefined) => void>(),
    })
    const resolved = { subject: 'p1@mail.com', permissions: ['p1'] }

    authService.require(resolved, ['p1', 'p2'], {
      andComparison: false,
      ctx: { requestId: 'r1', recordId: 'rec1' },
    })

    expect(authService.cfg.onCheck).toHaveBeenCalledExactlyOnceWith(
      {
        subject: 'p1@mail.com',
        granted: true,
        alwaysAuthorized: false,
        reqPermissions: ['p1', 'p2'],
        checkedPermissions: ['p1'],
      },
      { requestId: 'r1', recordId: 'rec1' },
    )
  })

  test('should be called with reqPermissions as checked if denied', () => {
    const authService = new AuthService({
      authenticate: async () => undefined,
      getPermissions: async () => undefined,
      onCheck: vi.fn<(check: AuthCheck, ctx: AnyObject | undefined) => void>(),
    })
    const resolved = {
      subject: 'p1@mail.com',
      permissions: ['p1'],
      alwaysAuthorized: false,
    }

    _expectedError(() => authService.require(resolved, ['p1', 'p2']), AssertionError)

    expect(authService.cfg.onCheck).toHaveBeenCalledExactlyOnceWith(
      {
        subject: 'p1@mail.com',
        granted: false,
        alwaysAuthorized: false,
        reqPermissions: ['p1', 'p2'],
        checkedPermissions: ['p1', 'p2'],
      },
      undefined,
    )
  })

  test('should not be called without a subject or when auth is disabled', () => {
    const authService = new AuthService({
      authenticate: async () => undefined,
      getPermissions: async () => undefined,
      onCheck: vi.fn<(check: AuthCheck, ctx: AnyObject | undefined) => void>(),
    })
    const resolved = { subject: 'p1@mail.com', permissions: ['p1'] }

    _expectedError(() => authService.require({}, ['p1']), AssertionError)
    authService.cfg.authEnabled = false
    authService.require(resolved, ['p1'])

    expect(authService.cfg.onCheck).not.toHaveBeenCalled()
  })
})

describe('middlewares', () => {
  test('should respond JSON 401 if not authenticated', async () => {
    const err = await app.expectError({ url: 'json' })

    expect(err.data.responseStatusCode).toBe(401)
    expect(err.cause.data).toMatchObject({ authRequired: true })
  })

  test('should respond 401 with the login redirect if not authenticated', async () => {
    const { statusCode, body } = await app.doFetch<string>({ url: 'login', responseType: 'text' })

    expect(statusCode).toBe(401)
    expect(body).toContain('/login.html?autoLogin=1&returnUrl=')
  })

  test('should respond 403 with the subject if not granted', async () => {
    const err = await app.expectError({
      url: 'json',
      headers: { 'x-subject': 'nobody@mail.com' },
    })

    expect(err.data.responseStatusCode).toBe(403)
    expect(err.cause.data).toMatchObject({ subject: 'nobody@mail.com' })
  })

  test('should pass if granted', async () => {
    const body = await app.get('json', { headers: { 'x-subject': 'p1@mail.com' } })

    expect(body).toEqual({ ok: true })
  })

  test('should pass if the secure header matches', async () => {
    const body = await app.get('secure', { headers: { 'x-secure-header': 'secret1' } })

    expect(body).toEqual({ ok: true })
  })

  test('should respond 401 if the secure header is wrong', async () => {
    const err = await app.expectError({
      url: 'secure',
      headers: { 'x-secure-header': 'wrong', 'x-subject': 'p1@mail.com' },
    })

    expect(err.data.responseStatusCode).toBe(401)
    expect(err.cause.data).toMatchObject({ authRequired: true })
  })

  test('should fall back to the auth check if the secure header is missing', async () => {
    const body = await app.get('secure', { headers: { 'x-subject': 'p1@mail.com' } })
    const err = await app.expectError({ url: 'secure' })

    expect(body).toEqual({ ok: true })
    expect(err.data.responseStatusCode).toBe(401)
  })

  test('should use getResolved and getCtx', async () => {
    const body = await app.get('stored')

    expect(body).toEqual({ ok: true })
    expect(storedAuthService.cfg.onCheck).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'stored@mail.com', granted: true }),
      { requestId: 'r1' },
    )
  })

  test('should pass if auth is disabled, before looking at the secure header', async () => {
    middlewareAuthService.cfg.authEnabled = false
    try {
      const body = await app.get('json')
      const secureBody = await app.get('secure', { headers: { 'x-secure-header': 'wrong' } })

      expect(body).toEqual({ ok: true })
      expect(secureBody).toEqual({ ok: true })
    } finally {
      middlewareAuthService.cfg.authEnabled = true
    }
  })
})
