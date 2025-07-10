import { _memoFn } from '@naturalcycles/js-lib/decorators'
import { AppError } from '@naturalcycles/js-lib/error'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { srcDir } from '../paths.cnst.js'
import type { BackendRequestHandler } from '../server/server.model.js'
import type { BaseAdminService } from './base.admin.service.js'
import type { FirebaseSharedServiceCfg } from './firebase.shared.service.js'

export interface RequireAdminCfg {
  /**
   * @default '/login.html'
   */
  loginHtmlPath?: string

  /**
   * If you host login.html outside of this server - you'll need to pass apiHost.
   * login.html will call PUT ${apiHost}/sessions/adminToken with body={admin_token='...'}
   */
  apiHost?: string

  urlStartsWith?: string

  /**
   * Defaults to `true`.
   * Set to `false` to debug login issues.
   */
  autoLogin?: boolean
}

export type AdminMiddleware = (
  reqPermissions?: string[],
  cfg?: RequireAdminCfg,
) => BackendRequestHandler

export function createAdminMiddleware(
  adminService: BaseAdminService,
  cfgDefaults: RequireAdminCfg = {},
): AdminMiddleware {
  return (reqPermissions, cfg) =>
    requireAdminPermissions(adminService, reqPermissions, {
      ...cfgDefaults,
      ...cfg,
    })
}

/**
 * Require Admin permission.
 * If not authenticated - will redirect to `loginHtmlPath` (default to /login.html).
 * If authenticated, but not authorized - will throw 403.
 * Otherwise will just pass.
 */
export function requireAdminPermissions(
  adminService: BaseAdminService,
  reqPermissions: string[] = [],
  cfg: RequireAdminCfg = {},
): BackendRequestHandler {
  const { loginHtmlPath = '/login.html', urlStartsWith, apiHost, autoLogin = true } = cfg

  return async function requireAdminPermissionsFn(req, res, next) {
    if (urlStartsWith && !req.url.startsWith(urlStartsWith)) return next()

    try {
      await adminService.requirePermissions(req, reqPermissions)
      return next()
    } catch (err) {
      if (err instanceof AppError && err.data.adminAuthRequired) {
        // Redirect to login.html
        const href = `${loginHtmlPath}?${
          autoLogin ? 'autoLogin=1&' : ''
        }returnUrl=\${encodeURIComponent(location.href)}${apiHost ? '&apiHost=' + apiHost : ''}`
        res.status(401).send(getLoginHtmlRedirect(href))
      } else {
        return next(err)
      }
    }
  }
}

interface LoginHtmlCfg {
  firebaseApiKey: string
  firebaseAuthDomain: string
  firebaseAuthProvider: string
}

export function loginHtml(firebaseServiceCfg: FirebaseSharedServiceCfg): BackendRequestHandler {
  const {
    apiKey: firebaseApiKey,
    authDomain: firebaseAuthDomain,
    adminAuthProvider: firebaseAuthProvider = 'GoogleAuthProvider',
  } = firebaseServiceCfg

  return async (_req, res) => {
    res.send(
      await getLoginHtml({
        firebaseApiKey,
        firebaseAuthDomain,
        firebaseAuthProvider,
      }),
    )
  }
}

const getLoginHtml = _memoFn(async (cfg: LoginHtmlCfg) => {
  console.log(`reading login.html`)
  const tmpl = fs2.readText(`${srcDir}/admin/login.html`)
  const { default: ejs } = await import('ejs')
  return ejs.render(tmpl, cfg)
})

export function getLoginHtmlRedirect(href: string): string {
  return `
<html>
<body>401 Admin Authentication Required
<script>
  document.write(\`: <a href="${href}" id="loginLink">Login</a>\`)
  document.getElementById('loginLink').click()
</script>
</body>
</html>
`
}
