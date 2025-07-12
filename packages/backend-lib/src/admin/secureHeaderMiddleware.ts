import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import { timingSafeStringEqual } from '@naturalcycles/nodejs-lib'
import type { BackendRequestHandler } from '../server/server.model.js'
import type { AdminMiddleware, RequireAdminCfg } from './adminMiddleware.js'
import { requireAdminPermissions } from './adminMiddleware.js'
import type { BaseAdminService } from './base.admin.service.js'

export interface SecureHeaderMiddlewareCfg extends RequireAdminCfg {
  adminService: BaseAdminService

  /**
   * Defaults to `Authorization`
   */
  secureHeaderKey?: string

  /**
   * If undefined - any value will be accepted, but the header still need to be present.
   */
  secureHeaderValue?: string
}

/**
 * Secures the endpoint by requiring a secret header to be present.
 * Throws Error401Admin otherwise.
 */
export function createSecureHeaderMiddleware(cfg: SecureHeaderMiddlewareCfg): AdminMiddleware {
  return reqPermissions => requireSecureHeaderOrAdmin(cfg, reqPermissions)
}

function requireSecureHeaderOrAdmin(
  cfg: SecureHeaderMiddlewareCfg,
  reqPermissions?: string[],
): BackendRequestHandler {
  const { secureHeaderKey = 'Authorization', secureHeaderValue } = cfg

  const requireAdmin = requireAdminPermissions(cfg.adminService, reqPermissions, cfg)

  return async (req, res, next) => {
    const providedHeader = req.get(secureHeaderKey)

    // pass
    if (!cfg.adminService.cfg.authEnabled) return next()

    // Header provided - don't check for Admin
    if (providedHeader) {
      if (!secureHeaderValue || timingSafeStringEqual(providedHeader, secureHeaderValue)) {
        return next()
      }

      return next(
        new AppError('secureHeader or adminToken is required', {
          backendResponseStatusCode: 401,
          adminAuthRequired: true,
        }),
      )
    }

    // Forward to AdminMiddleware (try Admin)
    await requireAdmin(req, res, next)
  }
}
