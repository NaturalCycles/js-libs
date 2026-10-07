import { commonLoggerNoop } from '@naturalcycles/js-lib/log'
import type { BackendRequest } from '../server/server.model.js'

export function mockBackendRequest(opts: Partial<BackendRequest> = {}): BackendRequest {
  const headers = opts.headers || {}

  const req: Partial<BackendRequest> = {
    ...commonLoggerNoop,
    cookies: {},
    header: ((name: string) => headers[name.toLowerCase()]) as BackendRequest['header'],
    ...opts,
    headers,
  }

  // Express Request has too many members to mock fully, only the commonly used ones are provided
  return req as BackendRequest
}
