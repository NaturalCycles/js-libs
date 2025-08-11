import type { BackendRequest } from './server.model.js'

/**
 * Returns e.g:
 *
 * GET /some/endpoint
 *
 * Gets the correct full path when used from sub-router-resources.
 * Strips away the queryString.
 *
 * If stripPrefix (e.g `/api/v2`) is provided, and the path starts with it (like path.startsWith(stripPrefix)),
 * it will be stripped from the beginning of the path.
 */
export function getRequestEndpoint(req: BackendRequest, stripPrefix?: string): string {
  let path = (req.baseUrl + (req.route?.path || req.path)).toLowerCase()
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, path.length - 1)
  }

  if (stripPrefix && path.startsWith(stripPrefix)) {
    path = path.slice(stripPrefix.length)
  }

  return [req.method, path].join(' ')
}
