import { getRequestEndpoint } from './request.util.js'
import type { BackendRequestHandler } from './server.model.js'

export function notFoundMiddleware(): BackendRequestHandler {
  return (req, res) => {
    res
      .status(404)
      .type('text/plain')
      .send(`404 Not Found: ${getRequestEndpoint(req)}`)
  }
}
