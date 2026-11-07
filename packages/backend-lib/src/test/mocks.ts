import { commonLoggerNoop } from '@naturalcycles/js-lib/log'
import type { BackendRequest } from '../server/server.model.js'

export function mockBackendRequest(opt: Partial<BackendRequest> = {}): BackendRequest {
  const headers = opt.headers || {}

  const req: Partial<BackendRequest> = {
    ...commonLoggerNoop,
    cookies: {},
    header: ((name: string) => headers[name.toLowerCase()]) as BackendRequest['header'],
    ...opt,
    headers,
  }

  // Express Request has too many members to mock fully, only the commonly used ones are provided
  return req as BackendRequest
}
