import { MOCK_TS_2018_06_21 } from '@naturalcycles/dev-lib/testing/time'
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { getDefaultRouter } from '../express/getDefaultRouter.js'
import { expressTestService } from '../testing/index.js'
import { createAdminMiddleware } from './adminMiddleware.js'
import { BaseAdminService } from './base.admin.service.js'
import { FirebaseSharedService } from './firebase.shared.service.js'

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

const adminService = new AdminService(await firebaseService.auth(), {
  // authEnabled: false,
})

const adminResource = getDefaultRouter()
const requireAdmin = createAdminMiddleware(adminService)

adminResource.get('/admin/info', async (req, res) => {
  res.json((await adminService.getAdminInfo(req)) || null)
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
  await deleteApp(await firebaseService.admin())
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
})
