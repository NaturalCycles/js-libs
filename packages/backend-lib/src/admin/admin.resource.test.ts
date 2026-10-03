import { MOCK_TS_2018_06_21 } from '@naturalcycles/dev-lib/testing/time'
import { _expectedError, AssertionError } from '@naturalcycles/js-lib/error'
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { getDefaultRouter } from '../express/getDefaultRouter.js'
import type { BackendRequest } from '../server/server.model.js'
import { mockBackendRequest } from '../test/mocks.js'
import { expressTestService } from '../testing/index.js'
import { createAdminMiddleware } from './adminMiddleware.js'
import { BaseAdminService } from './base.admin.service.js'
import { FirebaseSharedService } from './firebase.shared.service.js'
import { createSecureHeaderMiddleware } from './secureHeaderMiddleware.js'

const firebaseService = new FirebaseSharedService({
  authDomain: 'FIREBASE_AUTH_DOMAIN',
  apiKey: 'FIREBASE_API_KEY',
  appName: 'admin-resource-test', // Unique name to avoid conflicts
  // serviceAccount: 'FIREBASE_SERVICE_ACCOUNT_PATH',
})

class AdminService extends BaseAdminService {
  override async getEmailPermissions(email?: string): Promise<Set<string> | undefined> {
    if (email === 'good@mail.com') {
      return new Set(['p1', 'p2'])
    }
    if (email === 'second@mail.com') {
      return new Set(['s1', 's2'])
    }
    if (email === 'p1@mail.com') {
      return new Set(['p1'])
    }
    if (email === 'p2@mail.com') {
      return new Set(['p2'])
    }
    if (email === 'p1p2@mail.com') {
      return new Set(['p1', 'p2'])
    }
  }
}

const adminService = new AdminService(() => firebaseService.auth(), {
  // authEnabled: false,
})

const adminServiceAuthDisabled = new AdminService(() => firebaseService.auth(), {
  authEnabled: false,
})

const adminResource = getDefaultRouter()
const requireAdmin = createAdminMiddleware(adminService)

adminResource.get('/admin/info', async (req, res) => {
  const adminInfo = await adminService.getAdminInfo(req)
  res.json(adminInfo || null)
})
adminResource.post('/admin/login', adminService.getFirebaseAuthLoginHandler())
adminResource.get(
  '/admin/test-permission-and',
  requireAdmin(['p1', 'p2'], { andComparison: true }),
  async (_req, res) => {
    res.json({ success: true })
  },
)
adminResource.get(
  '/admin/test-permission-or',
  requireAdmin(['p1', 'p2'], { andComparison: false }),
  async (_req, res) => {
    res.json({ success: true })
  },
)

const flagProbeGuard = requireAdmin(['p1', 'p2'])
adminResource.get(
  '/admin/set-isAuthenticatedAdminRequest-flag',
  (req, res, next) => flagProbeGuard(req, res, () => next()),
  async (req: BackendRequest, res) => {
    const success = req.isAuthenticatedAdminRequest === true
    res.json({ success })
  },
)

const secureHeaderGuard = createSecureHeaderMiddleware({
  adminService,
  secureHeaderKey: 'x-secure-header',
  secureHeaderValue: 'secret1',
})(['p1', 'p2'])
adminResource.get(
  '/admin/secure-header-flag',
  (req, res, next) => secureHeaderGuard(req, res, () => next()),
  async (req: BackendRequest, res) => {
    res.json({ success: req.isAuthenticatedAdminRequest === true })
  },
)

beforeEach(() => {
  vi.setSystemTime(MOCK_TS_2018_06_21 * 1000)
})

afterEach(() => {
  vi.useRealTimers()
})

const app = await expressTestService.createAppFromResource(adminResource)

afterAll(async () => {
  await app.close()
  // Clean up Firebase app to avoid polluting other tests
  const { deleteApp } = await import('firebase-admin/app')
  const firebaseApp = await firebaseService.admin()
  await deleteApp(firebaseApp)
})

describe('login', () => {
  test('should return 401 if no auth header', async () => {
    const err = await app.expectError({
      url: 'admin/login',
      method: 'POST',
    })
    expect(err.data.responseStatusCode).toBe(401)
  })

  test('login should set cookie', async () => {
    const TOKEN = 'abcdef1'

    const { statusCode, fetchResponse } = await app.doFetch({
      url: 'admin/login',
      method: 'POST',
      headers: {
        Authentication: TOKEN,
      },
    })
    expect(statusCode).toBe(204)

    const c = fetchResponse!.headers.get('set-cookie')!
    expect(c).toMatchInlineSnapshot(
      `"admin_token=abcdef1; Max-Age=2592000; Path=/; Expires=Sat, 21 Jul 2018 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax"`,
    )
  })

  test('logout should clear cookie', async () => {
    const { statusCode, fetchResponse } = await app.doFetch({
      url: 'admin/login',
      method: 'POST',
      headers: {
        Authentication: 'logout', // magic string
      },
    })
    expect(statusCode).toBe(204)

    const c = fetchResponse!.headers.get('set-cookie')!
    expect(c).toMatchInlineSnapshot(
      `"admin_token=logout; Max-Age=0; Path=/; Expires=Thu, 21 Jun 2018 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax"`,
    )
  })
})

describe('getAdminInfo', () => {
  beforeEach(() => {
    vi.spyOn(adminService, 'getEmailByToken').mockImplementation(async (_, token) => {
      if (token === 'good') return 'good@mail.com'
      if (token === 'second') return 'second@mail.com'
    })
  })

  test('should return null if not admin', async () => {
    const r = await app.get('admin/info')
    expect(r).toMatchInlineSnapshot(`null`)
  })

  test('admin1 should see its permissions', async () => {
    const r = await app.get('admin/info', {
      headers: {
        'x-admin-token': 'good',
      },
    })
    expect(r).toMatchInlineSnapshot(`
      {
        "email": "good@mail.com",
        "permissions": [
          "p1",
          "p2",
        ],
      }
    `)
  })

  test('second admin should see its permissions', async () => {
    const r = await app.get('admin/info', {
      headers: {
        'x-admin-token': 'second',
      },
    })
    expect(r).toMatchInlineSnapshot(`
      {
        "email": "second@mail.com",
        "permissions": [
          "s1",
          "s2",
        ],
      }
    `)
  })
})

describe('createAdminMiddleware', () => {
  beforeEach(() => {
    vi.spyOn(adminService, 'getEmailByToken').mockImplementation(async (_, token) => {
      if (token === 'p1') return 'p1@mail.com'
      if (token === 'p2') return 'p2@mail.com'
      if (token === 'p1p2') return 'p1p2@mail.com'
    })
  })

  test('AND-comparison requires that the user has ALL of the required permissions', async () => {
    await app.get('admin/test-permission-and', {
      headers: {
        'x-admin-token': 'p1p2',
      },
    })

    const err1 = await app.expectError({
      url: 'admin/test-permission-and',
      headers: {
        'x-admin-token': 'p1',
      },
    })

    const err2 = await app.expectError({
      url: 'admin/test-permission-and',
      headers: {
        'x-admin-token': 'p2',
      },
    })

    expect(err1.data.responseStatusCode).toBe(403)
    expect(err2.data.responseStatusCode).toBe(403)
  })

  test('OR-comparison requires that the user has ONE OF the required permissions', async () => {
    await app.get('admin/test-permission-or', {
      headers: {
        'x-admin-token': 'p1p2',
      },
    })

    await app.get('admin/test-permission-or', {
      headers: {
        'x-admin-token': 'p1',
      },
    })

    await app.get('admin/test-permission-or', {
      headers: {
        'x-admin-token': 'p2',
      },
    })
  })

  test('sets the isAuthenticatedAdminRequest when the admin user is successfully authenicated', async () => {
    const { success } = await app.get<{ success: boolean }>(
      'admin/set-isAuthenticatedAdminRequest-flag',
      {
        headers: {
          'x-admin-token': 'p1p2',
        },
      },
    )

    expect(success).toBe(true)
  })

  test('does not set the isAuthenticatedAdminRequest when the admin user is not successfully authenicated', async () => {
    const { success } = await app.get<{ success: boolean }>(
      'admin/set-isAuthenticatedAdminRequest-flag',
      {
        headers: {
          'x-admin-token': 'p1',
        },
      },
    )

    expect(success).toBe(false)
  })

  test('sets the flag when the secure header matches', async () => {
    const { success } = await app.get<{ success: boolean }>('admin/secure-header-flag', {
      headers: { 'x-secure-header': 'secret1' },
    })
    expect(success).toBe(true)
  })

  test('does not set the flag when the secure header is wrong', async () => {
    const { success } = await app.get<{ success: boolean }>('admin/secure-header-flag', {
      headers: { 'x-secure-header': 'wrong' },
    })
    expect(success).toBe(false)
  })

  test('sets the flag when there is no secure header but a valid admin token', async () => {
    const { success } = await app.get<{ success: boolean }>('admin/secure-header-flag', {
      headers: { 'x-admin-token': 'p1p2' },
    })
    expect(success).toBe(true)
  })
})

describe('isAdmin', () => {
  test('should resolve the admin even if auth is disabled', async () => {
    vi.spyOn(adminServiceAuthDisabled, 'getEmailByToken').mockResolvedValue('p1@mail.com')
    const req = mockBackendRequest({ headers: { 'x-admin-token': 'p1' } })

    const isAdmin = await adminServiceAuthDisabled.isAdmin(req)
    expect(isAdmin).toBe(true)
  })
})

describe('resolveAdmin', () => {
  test('should resolve email and permissions of an admin', async () => {
    vi.spyOn(adminService, 'getEmailByToken').mockResolvedValue('p1@mail.com')
    const req = mockBackendRequest({ headers: { 'x-admin-token': 'p1' } })

    const admin = await adminService.resolveAdmin(req)
    expect(admin).toEqual({
      email: 'p1@mail.com',
      permissions: new Set(['p1']),
    })
    expect(adminService.getEmailByToken).toHaveBeenCalledWith(req, 'p1')
  })

  test('should resolve email without permissions if not an admin', async () => {
    vi.spyOn(adminService, 'getEmailByToken').mockResolvedValue('notAdmin@mail.com')
    const req = mockBackendRequest({ headers: { 'x-admin-token': 'notAdmin' } })

    const admin = await adminService.resolveAdmin(req)
    expect(admin).toEqual({
      email: 'notAdmin@mail.com',
      permissions: undefined,
    })
  })

  test('should resolve to empty object if token is invalid', async () => {
    vi.spyOn(adminService, 'getEmailByToken').mockResolvedValue(undefined)
    const req = mockBackendRequest({ headers: { 'x-admin-token': 'invalid' } })

    const admin = await adminService.resolveAdmin(req)
    expect(admin).toEqual({})
  })
})

describe('hasPermissions', () => {
  test('should return undefined if some required permission is missing', async () => {
    vi.spyOn(adminService, 'getEmailByToken').mockResolvedValue('p1@mail.com')
    const req = mockBackendRequest({ headers: { 'x-admin-token': 'p1' } })

    const adminInfo = await adminService.hasPermissions(req, ['p1', 'p2'])
    expect(adminInfo).toBeUndefined()
  })
})

describe('checkPermissions', () => {
  test('should grant if all required permissions are present on AND-comparison', () => {
    const admin = { email: 'p1p2@mail.com', permissions: new Set(['p1', 'p2']) }

    expect(adminService.checkPermissions(admin, ['p1', 'p2'])).toEqual({
      email: 'p1p2@mail.com',
      isAdmin: true,
      granted: true,
      reqPermissions: ['p1', 'p2'],
      grantedPermissions: ['p1', 'p2'],
      authDisabled: false,
    })
  })

  test('should deny if some required permission is missing on AND-comparison', () => {
    const admin = { email: 'p1@mail.com', permissions: new Set(['p1']) }

    expect(adminService.checkPermissions(admin, ['p1', 'p2'])).toEqual({
      email: 'p1@mail.com',
      isAdmin: true,
      granted: false,
      reqPermissions: ['p1', 'p2'],
      grantedPermissions: ['p1'],
      authDisabled: false,
    })
  })

  test('should grant if one required permission is present on OR-comparison', () => {
    const admin = { email: 'p1@mail.com', permissions: new Set(['p1']) }

    expect(adminService.checkPermissions(admin, ['p1', 'p2'], { andComparison: false })).toEqual({
      email: 'p1@mail.com',
      isAdmin: true,
      granted: true,
      reqPermissions: ['p1', 'p2'],
      grantedPermissions: ['p1'],
      authDisabled: false,
    })
  })

  test('should deny if the email is not an admin', () => {
    const admin = { email: 'notAdmin@mail.com' }

    expect(adminService.checkPermissions(admin, ['p1'])).toEqual({
      email: 'notAdmin@mail.com',
      isAdmin: false,
      granted: false,
      reqPermissions: ['p1'],
      grantedPermissions: [],
      authDisabled: false,
    })
  })

  test('should grant if auth is disabled', () => {
    expect(adminServiceAuthDisabled.checkPermissions({}, ['p1'])).toEqual({
      email: undefined,
      isAdmin: false,
      granted: true,
      reqPermissions: ['p1'],
      grantedPermissions: [],
      authDisabled: true,
    })
  })
})

describe('requireGranted', () => {
  test('should return AdminInfo with the granted permissions', () => {
    const result = {
      email: 'p1@mail.com',
      isAdmin: true,
      granted: true,
      reqPermissions: ['p1', 'p2'],
      grantedPermissions: ['p1'],
      authDisabled: false,
    }

    expect(adminService.requireGranted(result)).toEqual({
      email: 'p1@mail.com',
      permissions: ['p1'],
    })
  })

  test('should throw 401 if there is no email', () => {
    const result = {
      isAdmin: false,
      granted: false,
      reqPermissions: ['p1'],
      grantedPermissions: [],
      authDisabled: false,
    }

    const err = _expectedError(() => adminService.requireGranted(result), AssertionError)

    expect(err.data.backendResponseStatusCode).toBe(401)
  })

  test('should throw 403 if not granted', () => {
    const result = {
      email: 'p1@mail.com',
      isAdmin: true,
      granted: false,
      reqPermissions: ['p1', 'p2'],
      grantedPermissions: ['p1'],
      authDisabled: false,
    }

    const err = _expectedError(() => adminService.requireGranted(result), AssertionError)

    expect(err.data.backendResponseStatusCode).toBe(403)
    expect(err.data['adminPermissionsRequired']).toEqual(['p1', 'p2'])
  })
})
