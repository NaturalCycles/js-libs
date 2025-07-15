import { MOCK_TS_2018_06_21 } from '@naturalcycles/dev-lib/testing/time'
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { getDefaultRouter } from '../express/getDefaultRouter.js'
import { expressTestService } from '../testing/index.js'
import { BaseAdminService } from './base.admin.service.js'
import { FirebaseSharedService } from './firebase.shared.service.js'

const firebaseService = new FirebaseSharedService({
  authDomain: 'FIREBASE_AUTH_DOMAIN',
  apiKey: 'FIREBASE_API_KEY',
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
  }
}

const adminService = new AdminService(await firebaseService.auth(), {
  // authEnabled: false,
})

const adminResource = getDefaultRouter()
adminResource.get('/admin/info', async (req, res) => {
  res.json((await adminService.getAdminInfo(req)) || null)
})
adminResource.post('/admin/login', adminService.getFirebaseAuthLoginHandler())

beforeEach(() => {
  vi.setSystemTime(MOCK_TS_2018_06_21 * 1000)
})

const app = await expressTestService.createAppFromResource(adminResource)

afterAll(async () => {
  await app.close()
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
