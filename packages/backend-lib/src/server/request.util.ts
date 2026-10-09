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
 *
 * The result is injection-safe: `req.baseUrl` and `req.path` come from the request as-is
 * (not even url-decoded), so every character outside of a conservative allowlist is replaced with `_`.
 * `req.route.path` is the server-defined route pattern, so it's used as-is.
 *
 * Use `getRequestEndpointUnsafe` if the exact path is needed.
 */
export function getRequestEndpoint(req: BackendRequest, stripPrefix?: string): string {
  return buildRequestEndpoint(req, stripPrefix, sanitizePath)
}

/**
 * Same as `getRequestEndpoint`, but without sanitization:
 * for requests that didn't match a route (e.g 404s) the path is returned exactly as the client sent it.
 *
 * Use at your own risk: the result must be escaped before it's embedded in html
 * (or any other context where it could be interpreted).
 */
export function getRequestEndpointUnsafe(req: BackendRequest, stripPrefix?: string): string {
  return buildRequestEndpoint(req, stripPrefix, identity)
}

function buildRequestEndpoint(
  req: BackendRequest,
  stripPrefix: string | undefined,
  sanitize: (path: string) => string,
): string {
  let path = (sanitize(req.baseUrl) + (req.route?.path || sanitize(req.path))).toLowerCase()
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, path.length - 1)
  }

  if (stripPrefix && path.startsWith(stripPrefix)) {
    path = path.slice(stripPrefix.length)
  }

  return [req.method, path].join(' ')
}

// Letters, digits and the url punctuation that is inert in html, js, json and logs.
// Everything else (< > & " ' ( ) ` \ control chars, etc) is replaced, not encoded:
// the exact bytes are not worth preserving here, `req.url` still has them.
const UNSAFE_PATH_CHAR = /[^\w\-./:@%!$*+,;=~]/gu

function sanitizePath(path: string): string {
  return path.replace(UNSAFE_PATH_CHAR, '_')
}

const identity = (path: string): string => path
