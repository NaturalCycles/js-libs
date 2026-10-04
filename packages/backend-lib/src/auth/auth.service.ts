import { _assert, AppError } from '@naturalcycles/js-lib/error'
import type { ErrorData } from '@naturalcycles/js-lib/error'
import type { AnyObject, Promisable } from '@naturalcycles/js-lib/types'
import { timingSafeStringEqual } from '@naturalcycles/nodejs-lib'
import type { BackendRequest, BackendRequestHandler } from '../server/server.model.js'

/**
 * Authenticates requests and checks permissions.
 */
export class AuthService<CTX = undefined> {
  constructor(cfg: AuthServiceCfg<CTX>) {
    this.cfg = {
      authEnabled: true,
      ...cfg,
    }
  }

  cfg: AuthServiceCfg<CTX> & { authEnabled: boolean }

  /**
   * Responds JSON 401 / 403.
   */
  getMiddleware(cfg: AuthMiddlewareCfg<CTX> = {}): AuthMiddleware {
    return reqPermissions => this.createHandler(cfg, reqPermissions)
  }

  /**
   * Like `getMiddleware`, but 401 redirects to the login page.
   */
  getLoginRedirectMiddleware(cfg: AuthLoginRedirectMiddlewareCfg<CTX>): AuthMiddleware {
    const loginHref = this.getLoginHref(cfg)
    return reqPermissions => this.createHandler(cfg, reqPermissions, loginHref)
  }

  private createHandler(
    cfg: AuthMiddlewareCfg<CTX>,
    reqPermissions: string[] = [],
    loginHref?: string,
  ): BackendRequestHandler {
    const {
      getResolved = req => this.resolve(req),
      getCtx,
      andComparison = true,
      secureHeader,
    } = cfg

    return async (req, res, next) => {
      if (!this.cfg.authEnabled) return next()

      if (secureHeader) {
        const providedHeader = req.get(secureHeader.name)
        if (providedHeader) {
          if (timingSafeStringEqual(providedHeader, secureHeader.value)) {
            return next()
          }

          return next(
            new AppError('secureHeader or authentication required', this.authRequiredData()),
          )
        }
      }

      try {
        const resolved = await getResolved(req)
        if (!resolved?.subject && loginHref) {
          res.status(401).send(this.getLoginHtmlRedirect(loginHref))
          return
        }

        this.require(resolved, reqPermissions, { andComparison, ctx: getCtx?.(req) })
        return next()
      } catch (err) {
        return next(err)
      }
    }
  }

  /**
   * Runs `authenticate`, then `getPermissions` and `isAlwaysAuthorized` if there's a subject.
   * Ignores `authEnabled`.
   */
  async resolve(req: BackendRequest): Promise<ResolvedAuth> {
    const { authenticate, getPermissions, isAlwaysAuthorized } = this.cfg

    const subject = await authenticate(req)
    if (!subject) return {}

    const permissions = await getPermissions(subject, req)
    const alwaysAuthorized = isAlwaysAuthorized
      ? await isAlwaysAuthorized(subject, permissions, req)
      : false

    return { subject, permissions, alwaysAuthorized }
  }

  /**
   * Throws 401 if there's no subject, 403 if not granted.
   * Returns the granted permissions (all of the subject's if alwaysAuthorized),
   * or `{ subject: 'authDisabled', permissions: [] }` if auth is disabled.
   */
  require(
    resolved: ResolvedAuth | undefined,
    reqPermissions: string[] = [],
    opt: AuthCheckOptions<CTX> = {},
  ): PermissionInfo {
    if (!this.cfg.authEnabled) return { subject: 'authDisabled', permissions: [] }

    this.assertAuthenticated(resolved)
    const { subject, permissions, alwaysAuthorized } = resolved

    const grantedPermissions = this.checkSubject(resolved, reqPermissions, opt)
    this.assertGranted(subject, grantedPermissions, reqPermissions)

    if (alwaysAuthorized) {
      return { subject, permissions: permissions?.slice() || [] }
    }

    return { subject, permissions: grantedPermissions.slice() }
  }

  private checkSubject(
    resolved: AuthenticatedAuth,
    reqPermissions: string[],
    opt: AuthCheckOptions<CTX>,
  ): string[] | undefined {
    const { subject, permissions, alwaysAuthorized = false } = resolved
    const { andComparison = true, ctx, meta = {} } = opt

    const grantedPermissions = alwaysAuthorized
      ? reqPermissions
      : this.getGrantedPermissions(permissions, reqPermissions, andComparison)

    this.cfg.onCheck?.(
      {
        subject,
        granted: !!grantedPermissions,
        alwaysAuthorized,
        reqPermissions,
        checkedPermissions: grantedPermissions || reqPermissions,
        meta,
      },
      ctx,
    )

    return grantedPermissions
  }

  private assertAuthenticated(
    resolved: ResolvedAuth | undefined,
  ): asserts resolved is AuthenticatedAuth {
    _assert(resolved?.subject, 'authentication required', this.authRequiredData())
  }

  private authRequiredData(): ErrorData {
    return {
      authRequired: true,
      backendResponseStatusCode: 401,
      userFriendly: true,
    }
  }

  private assertGranted(
    subject: string,
    grantedPermissions: string[] | undefined,
    reqPermissions: string[],
  ): asserts grantedPermissions is string[] {
    _assert(grantedPermissions, `Permissions required: [${reqPermissions.join(', ')}]`, {
      permissionsRequired: reqPermissions,
      subject,
      backendResponseStatusCode: 403,
      userFriendly: true,
    })
  }

  /**
   * undefined - not granted.
   */
  private getGrantedPermissions(
    permissions: string[] | undefined,
    reqPermissions: string[],
    andComparison: boolean,
  ): string[] | undefined {
    if (!permissions) return
    const grantedPermissions = reqPermissions.filter(p => permissions.includes(p))
    const granted = andComparison
      ? grantedPermissions.length === reqPermissions.length
      : grantedPermissions.length > 0
    return granted ? grantedPermissions : undefined
  }

  private getLoginHref(cfg: AuthLoginRedirectMiddlewareCfg<CTX>): string {
    return `${cfg.loginHtmlPath}?autoLogin=1&returnUrl=\${encodeURIComponent(location.href)}`
  }

  private getLoginHtmlRedirect(href: string): string {
    return `
<html>
<body>401 Authentication Required
<script>
  document.write(\`: <a href="${href}" id="loginLink">Login</a>\`)
  document.getElementById('loginLink').click()
</script>
</body>
</html>
`
  }
}

export interface AuthServiceCfg<CTX> {
  /**
   * Returns the subject, or undefined if not authenticated.
   */
  authenticate: (req: BackendRequest) => Promise<string | undefined>

  /**
   * undefined - no permission set (never granted).
   */
  getPermissions: (subject: string, req: BackendRequest) => Promise<string[] | undefined>

  /**
   * true - every check is granted for this subject.
   */
  isAlwaysAuthorized?: (
    subject: string,
    permissions: string[] | undefined,
    req: BackendRequest,
  ) => Promisable<boolean>

  /**
   * Called on every `require` check that has a subject, while auth is enabled. Must not throw.
   */
  onCheck?: (check: AuthCheck, ctx: CTX | undefined) => void

  /**
   * false - every check is granted. For tests / local debugging. Read on every check.
   *
   * @default true
   */
  authEnabled?: boolean
}

export interface AuthCheck {
  subject: string
  granted: boolean
  alwaysAuthorized: boolean
  reqPermissions: string[]
  /** The granted permissions, or reqPermissions if denied */
  checkedPermissions: string[]
  meta: AnyObject
}

export interface AuthLoginRedirectMiddlewareCfg<CTX> extends AuthMiddlewareCfg<CTX> {
  loginHtmlPath: string
}

export interface AuthMiddlewareCfg<CTX> {
  /**
   * Defaults to `resolve(req)`.
   */
  getResolved?: (req: BackendRequest) => Promisable<ResolvedAuth | undefined>
  getCtx?: (req: BackendRequest) => CTX | undefined
  /**
   * @default true
   */
  andComparison?: boolean
  /**
   * A request with this header passes without auth. A wrong value responds 401.
   */
  secureHeader?: SecureHeaderCfg
}

export interface SecureHeaderCfg {
  /** e.g. 'Authorization' */
  name: string
  value: string
}

export type AuthMiddleware = (reqPermissions?: string[]) => BackendRequestHandler

export interface AuthCheckOptions<CTX> {
  /**
   * false - one granted permission is enough.
   *
   * @default true
   */
  andComparison?: boolean
  /** Passed to onCheck */
  ctx?: CTX
  /** Passed to onCheck */
  meta?: AnyObject
}

export interface PermissionInfo {
  subject: string
  permissions: string[]
}

type AuthenticatedAuth = ResolvedAuth & { subject: string }

export interface ResolvedAuth {
  /** undefined - not authenticated */
  subject?: string
  /** undefined - no permission set */
  permissions?: string[]
  /** Result of `isAlwaysAuthorized` */
  alwaysAuthorized?: boolean
}
