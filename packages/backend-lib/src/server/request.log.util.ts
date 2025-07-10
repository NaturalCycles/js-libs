import type { CommonLogLevel } from '@naturalcycles/js-lib'
import { boldGrey, green, red, yellow } from '@naturalcycles/nodejs-lib/colors'
import type { BackendRequest } from './server.model.js'

export function logRequestWithColors(
  req: BackendRequest,
  statusCode: number,
  ...tokens: any[]
): void {
  req[logLevel(statusCode)](
    [coloredHttpCode(statusCode), req.method, boldGrey(req.url), ...tokens].join(' '),
  )
}

export function coloredHttpCode(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 400) return green(statusCode)
  if (statusCode >= 400 && statusCode < 500) return yellow(statusCode)
  return red(statusCode)
}

function logLevel(statusCode?: number): CommonLogLevel {
  if (!statusCode || statusCode < 400) return 'log'
  if (statusCode < 500) return 'warn'
  return 'error'
}
