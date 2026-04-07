import { describe, expect, test } from 'vitest'
import {
  abortSignalAny,
  abortSignalAnyOrUndefined,
  abortSignalTimeout,
  abortSignalTimeoutOrUndefined,
  createAbortableSignal,
  polyfilledAbortSignalAny,
  polyfilledAbortSignalTimeout,
} from './abort.js'

test('abortableSignal', () => {
  class A {
    constructor(public signal: AbortSignal) {}
  }

  const as = createAbortableSignal()

  const a = new A(as)
  expect(a.signal.aborted).toBe(false)

  as.abort()
  expect(a.signal.aborted).toBe(true)
})

describe('abortSignalTimeout', () => {
  test('returns an AbortSignal', () => {
    const signal = abortSignalTimeout(1000)
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal.aborted).toBe(false)
  })

  test('aborts after the given time', async () => {
    const signal = abortSignalTimeout(50)
    expect(signal.aborted).toBe(false)

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(signal.aborted).toBe(true)
    expect(signal.reason).toBeInstanceOf(DOMException)
    expect(signal.reason.name).toBe('TimeoutError')
  })

  test('abort reason is DOMException with name TimeoutError', async () => {
    const signal = abortSignalTimeout(50)
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(signal.reason).toBeInstanceOf(DOMException)
    expect(signal.reason.name).toBe('TimeoutError')
  })
})

describe('abortSignalTimeoutOrUndefined', () => {
  test('returns AbortSignal when ms is defined', () => {
    const signal = abortSignalTimeoutOrUndefined(1000)
    expect(signal).toBeInstanceOf(AbortSignal)
  })

  test('returns undefined when ms is undefined', () => {
    expect(abortSignalTimeoutOrUndefined(undefined)).toBeUndefined()
  })

  test('returns undefined when ms is 0', () => {
    expect(abortSignalTimeoutOrUndefined(0)).toBeUndefined()
  })
})

describe('polyfilledAbortSignalTimeout', () => {
  test('returns an AbortSignal', () => {
    const signal = polyfilledAbortSignalTimeout(1000)
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal.aborted).toBe(false)
  })

  test('aborts after the given time', async () => {
    const signal = polyfilledAbortSignalTimeout(50)
    expect(signal.aborted).toBe(false)

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(signal.aborted).toBe(true)
    expect(signal.reason).toBeInstanceOf(DOMException)
    expect(signal.reason.name).toBe('TimeoutError')
  })

  test('rejects fetch-like promise on abort', async () => {
    const signal = polyfilledAbortSignalTimeout(50)

    const fetchPromise = new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        // oxlint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(signal.reason)
      })
    })

    const err = (await fetchPromise.catch(err => err)) as DOMException
    expect(err).toBeInstanceOf(DOMException)
    expect(err.name).toBe('TimeoutError')
  })
})

describe('abortSignalAny', () => {
  test('aborts when any signal aborts', () => {
    const c1 = new AbortController()
    const c2 = new AbortController()
    const combined = abortSignalAny([c1.signal, c2.signal])

    expect(combined.aborted).toBe(false)

    const reason = new DOMException('cancelled', 'AbortError')
    c2.abort(reason)

    expect(combined.aborted).toBe(true)
    expect(combined.reason).toBeInstanceOf(DOMException)
    expect(combined.reason.name).toBe('AbortError')
  })

  test('returns the signal as-is when only 1 signal is passed', () => {
    const controller = new AbortController()
    const combined = abortSignalAny([controller.signal])
    expect(combined).toBe(controller.signal)
  })

  test('returns already-aborted signal if input is aborted', () => {
    const controller = new AbortController()
    const reason = new DOMException('already done', 'AbortError')
    controller.abort(reason)

    const combined = abortSignalAny([controller.signal, new AbortController().signal])
    expect(combined.aborted).toBe(true)
    expect(combined.reason).toBeInstanceOf(DOMException)
    expect(combined.reason.name).toBe('AbortError')
  })

  test('caller abort wins over long timeout', () => {
    const controller = new AbortController()
    const combined = abortSignalAny([abortSignalTimeout(10_000), controller.signal])

    controller.abort(new DOMException('user cancelled', 'AbortError'))

    expect(combined.aborted).toBe(true)
    expect(combined.reason.name).toBe('AbortError')
  })
})

describe('abortSignalAnyOrUndefined', () => {
  test('returns AbortSignal when signals are provided', () => {
    const controller = new AbortController()
    const signal = abortSignalAnyOrUndefined([controller.signal])
    expect(signal).toBeInstanceOf(AbortSignal)
  })

  test('returns undefined when all signals are undefined', () => {
    expect(abortSignalAnyOrUndefined([undefined, undefined])).toBeUndefined()
  })

  test('returns undefined for empty array', () => {
    expect(abortSignalAnyOrUndefined([])).toBeUndefined()
  })

  test('filters out undefined signals', () => {
    const controller = new AbortController()
    const signal = abortSignalAnyOrUndefined([undefined, controller.signal, undefined])
    expect(signal).toBeInstanceOf(AbortSignal)
  })
})

describe('polyfilledAbortSignalAny', () => {
  test('aborts when any signal aborts', () => {
    const c1 = new AbortController()
    const c2 = new AbortController()
    const combined = polyfilledAbortSignalAny([c1.signal, c2.signal])

    expect(combined.aborted).toBe(false)

    const reason = new DOMException('cancelled', 'AbortError')
    c2.abort(reason)

    expect(combined.aborted).toBe(true)
    expect(combined.reason).toBeInstanceOf(DOMException)
    expect(combined.reason.name).toBe('AbortError')
  })

  test('returns already-aborted signal if input is aborted', () => {
    const controller = new AbortController()
    const reason = new DOMException('already done', 'AbortError')
    controller.abort(reason)

    const combined = polyfilledAbortSignalAny([controller.signal])
    expect(combined.aborted).toBe(true)
    expect(combined.reason).toBeInstanceOf(DOMException)
    expect(combined.reason.name).toBe('AbortError')
  })

  test('first abort reason wins', () => {
    const c1 = new AbortController()
    const c2 = new AbortController()
    const combined = polyfilledAbortSignalAny([c1.signal, c2.signal])

    c1.abort(new DOMException('first', 'AbortError'))
    c2.abort(new DOMException('second', 'AbortError'))

    expect(combined.reason.message).toContain('first')
  })

  test('works with timeout signal', async () => {
    const controller = new AbortController()
    const combined = polyfilledAbortSignalAny([polyfilledAbortSignalTimeout(50), controller.signal])

    expect(combined.aborted).toBe(false)

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(combined.aborted).toBe(true)
    expect(combined.reason).toBeInstanceOf(DOMException)
    expect(combined.reason.name).toBe('TimeoutError')
  })
})
