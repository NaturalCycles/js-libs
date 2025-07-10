import { Router } from 'express'
import type { BackendRequestHandler, BackendRouter } from '../server/server.model.js'

/**
 * Convenience method.
 */
export function getDefaultRouter(defaultHandlers: BackendRequestHandler[] = []): BackendRouter {
  const router = Router()

  // Use default handlers
  defaultHandlers.forEach(h => router.use(h))

  return router
}
