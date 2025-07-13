import { red } from '@naturalcycles/nodejs-lib/colors'
import createMitm from 'mitm'

const LOCAL_HOSTS = ['localhost', '127.0.0.1']

const detectLeaks = process.argv.some(a => a.includes('detectLeaks'))

let mitm: createMitm.Mitm

/**
 * Based on: https://github.com/palmerj3/jest-offline/blob/master/index.js
 */
export function testOffline(): void {
  if (detectLeaks) {
    console.log('NOT applying testOffline() when --detectLeaks is on')
    return
  }

  console.log('test offline mode')

  mitm ||= createMitm()

  mitm.on('connect', (socket: any, opts: any) => {
    const { host } = opts

    if (!LOCAL_HOSTS.includes(host as string)) {
      process.stderr.write(red(`Network request forbidden by testOffline: ${host}\n`))
      throw new Error(`Network request forbidden by testOffline: ${host}`)
    }

    socket.bypass()
  })
}

/**
 * Undo/reset the testOffline() function by allowing network calls again.
 */
export function testOnline(): void {
  mitm?.disable()
}
