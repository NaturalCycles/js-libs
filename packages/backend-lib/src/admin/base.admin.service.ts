import { _Memo } from '@naturalcycles/js-lib/decorators'
import { _assert } from '@naturalcycles/js-lib/error'
import type { AnyObject } from '@naturalcycles/js-lib/types'
import { dimGrey, green, red } from '@naturalcycles/nodejs-lib/colors'
import type { Auth } from 'firebase-admin/auth'
import type { BackendRequest, BackendRequestHandler } from '../server/server.model.js'

/**
 * Base implementation based on Firebase Auth tokens passed as 'admin_token' cookie.
 *
 * @deprecated Use `AuthService`, with `FirebaseAuthService` for `authenticate`.
 */
export class BaseAdminService {
  constructor(
    private loadFirebaseAuth: () => Promise<Auth>,
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

  async isAdmin(req: BackendRequest | undefined): Promise<boolean> {
    if (!req) return false
    const { permissions } = await this.resolveAdmin(req)
    return !!permissions
  }

  async getAdminInfo(req: BackendRequest): Promise<AdminInfo | undefined> {
    return await this.hasPermissions(req)
  }

  // alias
  // async reqAdmin (req: Request): Promise<void> {
  //   await this.reqPermissions(req)
  // }

  // convenience method
  async hasPermission(
    req: BackendRequest,
    reqPermission: string,
    meta?: AnyObject,
  ): Promise<boolean> {
    const adminInfo = await this.hasPermissions(req, [reqPermission], meta)
    return !!adminInfo
  }

  async requirePermission(
    req: BackendRequest,
    reqPermission: string,
    meta?: AnyObject,
  ): Promise<AdminInfo> {
    return await this.requirePermissions(req, [reqPermission], meta)
  }

  /**
   * Returns AdminInfo if it has all required permissions.
   * Otherwise returns undefined
   */
  async hasPermissions(
    req: BackendRequest,
    reqPermissions: string[] = [],
    meta: AnyObject = {},
  ): Promise<AdminInfo | undefined> {
    if (!this.cfg.authEnabled) return adminInfoDisabled()

    const admin = await this.resolveAdmin(req)
    const { email, permissions } = admin
    if (!email || !permissions) return

    const result = this.checkPermissions(admin, reqPermissions)

    void this.onPermissionCheck(req, email, reqPermissions, false, result.granted, meta)

    if (!result.granted) return

    return {
      email,
      permissions: Array.from(permissions),
    }
  }

  async requirePermissions(
    req: BackendRequest,
    reqPermissions: string[] = [],
    meta: AnyObject = {},
    andComparison = true,
  ): Promise<AdminInfo> {
    if (!this.cfg.authEnabled) return adminInfoDisabled()

    const admin = await this.resolveAdmin(req)
    const result = this.checkPermissions(admin, reqPermissions, { andComparison })

    if (result.email) {
      // Log only the granted permissions (differs from reqPermissions only on OR-comparison)
      const checkedPermissions = result.granted ? result.grantedPermissions : reqPermissions
      void this.onPermissionCheck(req, result.email, checkedPermissions, true, result.granted, meta)
    }

    return this.requireGranted(result)
  }

  /**
   * Doesn't check permissions, nor `authEnabled`. See `checkPermissions`.
   */
  async resolveAdmin(req: BackendRequest): Promise<ResolvedAdmin> {
    const adminToken = this.getAdminToken(req)
    const email = await this.getEmailByToken(req, adminToken)
    if (!email) return {}

    const permissions = await this.getEmailPermissions(email)
    return { email, permissions }
  }

  /**
   * Doesn't log or throw. See `requireGranted`.
   */
  checkPermissions(
    admin: ResolvedAdmin,
    reqPermissions: string[] = [],
    opt: CheckPermissionsOptions = {},
  ): CheckPermissionsResult {
    const { andComparison = true } = opt
    const { email, permissions: hasPermissions } = admin
    const isAdmin = !!hasPermissions

    if (!this.cfg.authEnabled) {
      return {
        email,
        isAdmin,
        granted: true,
        reqPermissions,
        grantedPermissions: [],
        authDisabled: true,
      }
    }

    const grantedPermissions = hasPermissions
      ? reqPermissions.filter(p => hasPermissions.has(p))
      : []

    const granted = andComparison
      ? isAdmin && grantedPermissions.length === reqPermissions.length // All permissions granted
      : isAdmin && grantedPermissions.length > 0 // 1+ is required

    return {
      email,
      isAdmin,
      granted,
      reqPermissions,
      grantedPermissions,
      authDisabled: false,
    }
  }

  /**
   * Throws 401 if there's no email, 403 if not granted.
   */
  requireGranted(result: CheckPermissionsResult): AdminInfo {
    if (result.authDisabled) return adminInfoDisabled()

    const { email, granted, reqPermissions, grantedPermissions } = result

    _assert(email, 'adminToken required', {
      adminAuthRequired: true,
      backendResponseStatusCode: 401,
      userFriendly: true,
    })

    _assert(granted, `Admin permissions required: [${reqPermissions.join(', ')}]`, {
      adminPermissionsRequired: reqPermissions,
      email,
      backendResponseStatusCode: 403,
      userFriendly: true,
    })

    return {
      email,
      permissions: grantedPermissions.slice(),
    }
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

      req.error({ msg: `getEmailByToken error:`, err })
    }
  }

  @_Memo()
  private async getFirebaseAuth(): Promise<Auth> {
    return await this.loadFirebaseAuth()
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
    meta: AnyObject = {},
  ): Promise<void> {
    req.log({
      ...meta,
      msg: `${dimGrey(email)} ${required ? 'required' : 'optional'} permissions check [${dimGrey(
        reqPermissions.join(', '),
      )}]: ${granted ? green('GRANTED') : red('DENIED')}`,
    })
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

const adminInfoDisabled = (): AdminInfo => ({
  email: 'authDisabled',
  permissions: [],
})

/**
 * @deprecated Use `AuthServiceCfg` and `FirebaseAuthServiceCfg`.
 */
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

/**
 * @deprecated Use `PermissionInfo`.
 */
export interface AdminInfo {
  email: string
  permissions: string[]
}

/**
 * @deprecated Use `ResolvedAuth`.
 */
export interface ResolvedAdmin {
  /** undefined - no valid admin token */
  email?: string
  /** undefined - not an Admin */
  permissions?: Set<string>
}

/**
 * @deprecated Use `AuthCheckOptions`.
 */
export interface CheckPermissionsOptions {
  /**
   * false - one granted permission is enough.
   *
   * @default true
   */
  andComparison?: boolean
}

/**
 * @deprecated Use `AuthService.has` / `AuthService.require`.
 */
export interface CheckPermissionsResult {
  /** undefined - no valid admin token */
  email?: string
  isAdmin: boolean
  granted: boolean
  reqPermissions: string[]
  grantedPermissions: string[]
  authDisabled: boolean
}
