import { _Memo } from '@naturalcycles/js-lib/decorators'
import { _assert, AppError } from '@naturalcycles/js-lib/error'
import { dimGrey, green, red } from '@naturalcycles/nodejs-lib/colors'
import type FirebaseAdmin from 'firebase-admin'
import type { BackendRequest, BackendRequestHandler } from '../server/server.model.js'

export interface AdminServiceCfg {
  /**
   * @default 'admin_token'
   */
  adminTokenKey?: string

  /**
   * If false - disables auth completely (useful for debugging locally, but never in production).
   *
   * @default true
   */
  authEnabled?: boolean
}

export interface AdminInfo {
  email: string
  permissions: string[]
}

const adminInfoDisabled = (): AdminInfo => ({
  email: 'authDisabled',
  permissions: [],
})

/**
 * Base implementation based on Firebase Auth tokens passed as 'admin_token' cookie.
 */
export class BaseAdminService {
  constructor(
    private loadFirebaseAuth: () => Promise<FirebaseAdmin.auth.Auth>,
    cfg: AdminServiceCfg,
  ) {
    this.cfg = {
      adminTokenKey: 'admin_token',
      authEnabled: true,
      ...cfg,
    }
  }

  cfg!: Required<AdminServiceCfg>

  adminInfoDisabled(): AdminInfo {
    return {
      email: 'authDisabled',
      permissions: [],
    }
  }

  /**
   * To be extended.
   *
   * Returns undefined if it's not an Admin.
   * Otherwise returns Set of permissions.
   * Empty array means it IS and Admin, but has no permissions (except being an Admin).
   */
  async getEmailPermissions(email?: string): Promise<Set<string> | undefined> {
    if (!email) return
    console.log(
      `getEmailPermissions (${dimGrey(
        email,
      )}) returning undefined (please override the implementation)`,
    )
  }

  /**
   * To be extended.
   */
  // oxlint-disable-next-line max-params
  protected async onPermissionCheck(
    req: BackendRequest,
    email: string,
    reqPermissions: string[],
    required: boolean,
    granted: boolean,
    meta: Record<string, any> = {},
  ): Promise<void> {
    req.log(
      `${dimGrey(email)} ${required ? 'required' : 'optional'} permissions check [${dimGrey(
        reqPermissions.join(', '),
      )}]: ${granted ? green('GRANTED') : red('DENIED')}`,
      meta,
    )
  }

  async getEmailByToken(req: BackendRequest, adminToken?: string): Promise<string | undefined> {
    if (!adminToken) return

    try {
      const auth = await this.getFirebaseAuth()
      const decodedToken = await auth.verifyIdToken(adminToken)
      const email = decodedToken?.email
      req.log(`admin email: ${dimGrey(email)}`)
      return email
    } catch (err) {
      // example:
      // FirebaseAuthError: Firebase ID token has expired. Get a fresh ID token from your client app and try again (auth/id-token-expired).
      if (
        // err instanceof FirebaseAuthError && err.hasCode('id-token-expired')
        (err as any)?.code?.includes('id-token-expired')
      ) {
        return // skip logging, expected error
      }

      req.error(`getEmailByToken error:`, err)
    }
  }

  @_Memo()
  private async getFirebaseAuth(): Promise<FirebaseAdmin.auth.Auth> {
    return await this.loadFirebaseAuth()
  }

  /**
   * Current implementation is based on req=Request (from Express).
   * Override if needed.
   */
  getAdminToken(req: BackendRequest): string | undefined {
    return (
      req.cookies?.[this.cfg.adminTokenKey] ||
      req.header(this.cfg.adminTokenKey) ||
      req.header('x-admin-token')
    )
  }

  async isAdmin(req: BackendRequest | undefined): Promise<boolean> {
    if (!req) return false
    const adminToken = this.getAdminToken(req)
    const email = await this.getEmailByToken(req, adminToken)
    return !!(await this.getEmailPermissions(email))
  }

  async getAdminInfo(req: BackendRequest): Promise<AdminInfo | undefined> {
    return await this.hasPermissions(req)
  }

  // alias
  // async reqAdmin (req: Request): Promise<void> {
  //   await this.reqPermissions(req)
  // }

  /**
   * Returns AdminInfo if it has all required permissions.
   * Otherwise returns undefined
   */
  async hasPermissions(
    req: BackendRequest,
    reqPermissions: string[] = [],
    meta: Record<string, any> = {},
  ): Promise<AdminInfo | undefined> {
    if (!this.cfg.authEnabled) return adminInfoDisabled()

    const adminToken = this.getAdminToken(req)
    const email = await this.getEmailByToken(req, adminToken)
    const hasPermissions = await this.getEmailPermissions(email)
    if (!hasPermissions) return

    const granted = reqPermissions.every(p => hasPermissions.has(p))

    void this.onPermissionCheck(req, email!, reqPermissions, false, granted, meta)

    if (!granted) return

    return {
      email: email!,
      permissions: [...hasPermissions],
    }
  }

  async requirePermissions(
    req: BackendRequest,
    reqPermissions: string[] = [],
    meta: Record<string, any> = {},
    andComparison = true,
  ): Promise<AdminInfo> {
    if (!this.cfg.authEnabled) return adminInfoDisabled()

    const adminToken = this.getAdminToken(req)
    const email = await this.getEmailByToken(req, adminToken)

    if (!email) {
      throw new AppError('adminToken required', {
        adminAuthRequired: true,
        backendResponseStatusCode: 401,
        userFriendly: true,
      })
    }

    const hasPermissions = await this.getEmailPermissions(email)
    const grantedPermissions = hasPermissions
      ? reqPermissions.filter(p => hasPermissions.has(p))
      : []

    let granted: boolean
    if (andComparison) {
      granted = !!hasPermissions && grantedPermissions.length === reqPermissions.length // All permissions granted
      void this.onPermissionCheck(req, email, reqPermissions, true, granted, meta)
    } else {
      granted = !!hasPermissions && grantedPermissions.length > 0
      if (granted) {
        // Require the permission(s), but only the ones the user was actually granted. 1+ is required
        void this.onPermissionCheck(req, email, grantedPermissions, true, granted, meta)
      } else {
        void this.onPermissionCheck(req, email, reqPermissions, true, granted, meta)
      }
    }

    if (!granted) {
      throw new AppError(`Admin permissions required: [${reqPermissions.join(', ')}]`, {
        adminPermissionsRequired: reqPermissions,
        email,
        backendResponseStatusCode: 403,
        userFriendly: true,
      })
    }

    return {
      email,
      permissions: [...grantedPermissions],
    }
  }

  // convenience method
  async hasPermission(
    req: BackendRequest,
    reqPermission: string,
    meta?: Record<string, any>,
  ): Promise<boolean> {
    return !!(await this.hasPermissions(req, [reqPermission], meta))
  }

  async requirePermission(
    req: BackendRequest,
    reqPermission: string,
    meta?: Record<string, any>,
  ): Promise<AdminInfo> {
    return await this.requirePermissions(req, [reqPermission], meta)
  }

  /**
   * Install it on POST /admin/login url
   *
   * It takes a POST request with `Authentication` header, that contains `accessToken` from Firebase Auth.
   * Backend doesn't validate the token, but only does `setCookie` (secure, httpOnly), returns http 204 (ok, empty response).
   * Frontend (login.html page) will then proceed with redirecting to `returnUrl`.
   *
   * Same endpoint is used to logout, but the `Authentication` header should contain `logout` magic string.
   */
  getFirebaseAuthLoginHandler(): BackendRequestHandler {
    return async (req, res) => {
      const token = req.header('authentication')
      _assert(token, `401 Unauthenticated`, {
        userFriendly: true,
        backendResponseStatusCode: 401,
      })

      let maxAge = 1000 * 60 * 60 * 24 * 30 // 30 days

      // Special case
      if (token === 'logout') {
        // delete the cookie
        maxAge = 0
      }

      res
        .cookie(this.cfg.adminTokenKey, token, {
          maxAge,
          sameSite: 'lax', // can be: none, lax, strict
          // comment these 2 lines to debug on localhost
          httpOnly: true,
          secure: true,
        })
        .status(204)
        .end()
    }
  }
}
