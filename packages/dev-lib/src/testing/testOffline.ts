import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import { red } from '@naturalcycles/nodejs-lib/colors'
import { createMitm, type Mitm } from '../vendor/mitm.js'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

const detectLeaks = process.argv.some(a => a.includes('detectLeaks'))

let mitm: Mitm | undefined

/**
 * Based on: https://github.com/palmerj3/jest-offline/blob/master/index.js
 */
export function testOffline(opt?: TestOfflineOptions): void {
  if (mitm) return // already applied

  if (detectLeaks) {
    console.log('NOT applying testOffline() when --detectLeaks is on')
    return
  }

  mitm = createMitm()

  mitm.on('connect', (socket, socketOptions) => {
    const { host } = socketOptions

    if (!LOCAL_HOSTS.has(host!)) {
      process.stderr.write(red(`Network request forbidden by testOffline: ${host}\n`))
      opt?.onForbiddenRequest?.(host!)
      throw new AppError(`Network request forbidden by testOffline: ${host}`, {
        backendResponseStatusCode: 410,
      })
    }

    socket.bypass()
  })
}

/**
 * Undo/reset the testOffline() function by allowing network calls again.
 */
export function testOnline(): void {
  mitm?.disable()
  mitm = undefined
}

interface TestOfflineOptions {
  /**
   * Called when a forbidden network request is detected.
   */
  onForbiddenRequest?: (host: string) => void
}
