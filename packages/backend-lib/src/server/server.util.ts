import type { Server } from 'node:http'
import type { Socket } from 'node:net'
import type { StringMap } from '@naturalcycles/js-lib/types'

export interface DestroyableServer extends Server {
  destroy: () => Promise<void>
}

/**
 * Based on: https://github.com/isaacs/server-destroy/blob/master/index.js
 *
 * @experimental
 */
export function enableDestroy(server: Server): DestroyableServer {
  const connections: StringMap<Socket> = {}
  const srv = server as DestroyableServer

  srv.on('connection', conn => {
    const key = conn.remoteAddress + ':' + conn.remotePort
    connections[key] = conn
    conn.on('close', () => delete connections[key])
  })

  srv.destroy = async () => {
    // let started = Date.now()
    const p = new Promise(resolve => server.close(resolve))
    for (const key of Object.keys(connections)) {
      connections[key]!.destroy()
    }
    await p
    // console.log(`destroyed ${Object.keys(connections).length} con(s) in ${_since(started)}`)
  }

  return srv
}
