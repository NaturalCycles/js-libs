/**
 * Minimal vendored implementation of the `mitm` package.
 * Only supports the "connect" event with bypass() and disable() - that's all testOffline needs.
 *
 * Based on: https://github.com/moll/node-mitm
 */
import type * as HttpType from 'node:http'
import type * as HttpsType from 'node:https'
import { createRequire } from 'node:module'
import type * as NetType from 'node:net'
import type * as TlsType from 'node:tls'

// Use require() to get mutable module objects (ESM namespace objects are frozen)
const require = createRequire(import.meta.url)
/* eslint-disable @typescript-eslint/naming-convention -- vendored code uses PascalCase for modules */
const Net = require('node:net') as typeof NetType & Record<string, unknown>
const Tls = require('node:tls') as typeof TlsType & Record<string, unknown>
const Http = require('node:http') as typeof HttpType & Record<string, unknown>
const Https = require('node:https') as typeof HttpsType & Record<string, unknown>
/* eslint-enable @typescript-eslint/naming-convention */

export interface SocketOptions {
  port: number
  host?: string
  localAddress?: string
  localPort?: string
  family?: number
  allowHalfOpen?: boolean
}

export interface BypassableSocket extends NetType.Socket {
  bypass: () => void
  bypassed?: boolean
}

export type ConnectCallback = (socket: BypassableSocket, opts: SocketOptions) => void

export interface Mitm {
  on: (event: 'connect', callback: ConnectCallback) => void
  disable: () => void
}

type Stub = [obj: Record<string, unknown>, prop: string, original: unknown]

export function createMitm(): Mitm {
  const stubs: Stub[] = []
  const listeners: ConnectCallback[] = []

  function stub(obj: Record<string, unknown>, prop: string, value: unknown): void {
    stubs.push([obj, prop, obj[prop]])
    obj[prop] = value
  }

  function restore(): void {
    let s: Stub | undefined
    while ((s = stubs.pop())) {
      s[0][s[1]] = s[2]
    }
  }

  function connect(
    orig: (...args: unknown[]) => NetType.Socket,
    opts: SocketOptions,
    done?: () => void,
  ): NetType.Socket {
    // Create a bypassable socket that we'll pass to listeners
    const socket = new Net.Socket() as BypassableSocket
    socket.bypassed = false
    socket.bypass = function () {
      this.bypassed = true
    }

    // Emit connect event to all listeners
    for (const listener of listeners) {
      listener(socket, opts)
    }

    // If bypassed, call the original connect function
    if (socket.bypassed) {
      return orig.call(Net, opts, done)
    }

    // Not bypassed - return the socket that will never actually connect.
    // testOffline throws an error before we get here, so this is just a fallback.
    return socket
  }

  function normalizeArgs(
    args: unknown[],
  ): [opts: SocketOptions, callback: (() => void) | undefined] {
    // Handle the various signatures of Net.connect:
    // connect(port, host?, callback?)
    // connect(options, callback?)
    // connect(path, callback?) - Unix socket
    if (typeof args[0] === 'number') {
      const opts: SocketOptions = { port: args[0] }
      if (typeof args[1] === 'string') {
        opts.host = args[1]
        return [opts, args[2] as (() => void) | undefined]
      }
      return [opts, args[1] as (() => void) | undefined]
    }
    if (typeof args[0] === 'object' && args[0] !== null) {
      return [args[0] as SocketOptions, args[1] as (() => void) | undefined]
    }
    // Fallback for other cases (e.g., Unix socket path)
    return [{ port: 0 }, args[1] as (() => void) | undefined]
  }

  function createNetConnect(orig: typeof Net.connect): typeof Net.connect {
    return function (...args: Parameters<typeof Net.connect>): NetType.Socket {
      const [opts, done] = normalizeArgs(args)
      return connect(orig as (...a: unknown[]) => NetType.Socket, opts, done)
    } as typeof Net.connect
  }

  function createTlsConnect(orig: typeof Tls.connect): typeof Tls.connect {
    return function (...args: Parameters<typeof Tls.connect>): TlsType.TLSSocket {
      const [opts, done] = normalizeArgs(args)
      return connect(
        orig as unknown as (...a: unknown[]) => NetType.Socket,
        opts,
        done,
      ) as TlsType.TLSSocket
    } as typeof Tls.connect
  }

  // Stub network functions
  const netConnect = createNetConnect(Net.connect)
  const tlsConnect = createTlsConnect(Tls.connect)

  stub(Net, 'connect', netConnect)
  stub(Net, 'createConnection', netConnect)
  stub(Http.Agent.prototype as unknown as Record<string, unknown>, 'createConnection', netConnect)
  stub(Tls, 'connect', tlsConnect)

  // Disable keep-alive on global agents to force new connections
  const httpAgent = Http.globalAgent as unknown as Record<string, unknown>
  const httpsAgent = Https.globalAgent as unknown as Record<string, unknown>
  if (httpAgent['keepAlive']) {
    stub(httpAgent, 'keepAlive', false)
  }
  if (httpsAgent['keepAlive']) {
    stub(httpsAgent, 'keepAlive', false)
  }

  return {
    on(event: 'connect', callback: ConnectCallback): void {
      if (event === 'connect') {
        listeners.push(callback)
      }
    },
    disable(): void {
      restore()
    },
  }
}
