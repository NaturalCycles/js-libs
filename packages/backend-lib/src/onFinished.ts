import { AsyncResource } from 'node:async_hooks'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { finished } from 'node:stream'

/**
 * Invokes the listener once the request/response has finished (completed, closed or errored).
 * If it has already finished - the listener is invoked asynchronously (on the next tick).
 *
 * Listener runs in the async context (e.g AsyncLocalStorage) of the onFinished caller.
 *
 * Vendored (and modernized) from the `on-finished` package, built on top of `stream.finished`.
 * Stream listeners are attached once per msg (subsequent calls are queued), as `stream.finished`
 * is too expensive to call per listener (and would exceed the default MaxListeners).
 */
export function onFinished<T extends IncomingMessage | ServerResponse>(
  msg: T,
  listener: Listener<T>,
): T {
  const m = msg as T & { [kQueue]?: Listener<T>[] }
  const queue = m[kQueue]
  if (queue) {
    queue.push(bindAsyncContext(listener))
    return msg
  }

  const q = (m[kQueue] = [bindAsyncContext(listener)])
  finished(msg, err => {
    m[kQueue] = undefined
    for (const fn of q) fn(err ?? null, msg)
  })
  return msg
}

type Listener<T> = (err: Error | null, msg: T) => void

const kQueue = Symbol('onFinished')

/**
 * Faster alternative to `AsyncResource.bind` (which is ~0.8µs per call).
 */
function bindAsyncContext<T>(fn: Listener<T>): Listener<T> {
  const resource = new AsyncResource('onFinished')
  return (err, msg) => resource.runInAsyncScope(fn, null, err, msg)
}
