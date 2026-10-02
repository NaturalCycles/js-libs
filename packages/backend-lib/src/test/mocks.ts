import { _noop } from '@naturalcycles/js-lib/types'
import type { BackendRequest } from '../server/server.model.js'

export function mockBackendRequest(opts: Partial<BackendRequest> = {}): BackendRequest {
  const headers = opts.headers || {}

  const req: Partial<BackendRequest> = {
    debug: _noop,
    log: _noop,
    warn: _noop,
    error: _noop,
    cookies: {},
    header: ((name: string) => headers[name.toLowerCase()]) as BackendRequest['header'],
    ...opts,
    headers,
  }

  // Express Request has too many members to mock fully, only the commonly used ones are provided
  return req as BackendRequest
}
