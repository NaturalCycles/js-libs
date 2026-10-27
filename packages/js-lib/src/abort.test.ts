import { describe, expect, it, vi } from 'vitest'
import {
  abortSignalAny,
  abortSignalAnyOrUndefined,
  abortSignalTimeout,
  abortSignalTimeoutOrUndefined,
  createAbortableSignal,
  polyfilledAbortSignalAny,
  polyfilledAbortSignalTimeout,
} from './abort.js'

it('should create a signal that aborts itself via abort()', () => {
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
  it('should return a signal that is not aborted yet', () => {
    const signal = abortSignalTimeout(1000)
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal.aborted).toBe(false)
  })

  it('should abort with a TimeoutError after the given time', async () => {
    const signal = abortSignalTimeout(50)
    expect(signal.aborted).toBe(false)

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(signal.aborted).toBe(true)
    expect(signal.reason).toBeInstanceOf(DOMException)
    expect(signal.reason.name).toBe('TimeoutError')
  })
})

describe('abortSignalTimeoutOrUndefined', () => {
  it('should return an AbortSignal when ms is defined', () => {
    const signal = abortSignalTimeoutOrUndefined(1000)
    expect(signal).toBeInstanceOf(AbortSignal)
  })

  it('should return undefined when ms is undefined', () => {
    expect(abortSignalTimeoutOrUndefined(undefined)).toBeUndefined()
  })

  it('should return undefined when ms is 0', () => {
    expect(abortSignalTimeoutOrUndefined(0)).toBeUndefined()
  })
})

describe('polyfilledAbortSignalTimeout', () => {
  it('should return a signal that is not aborted yet', () => {
    const signal = polyfilledAbortSignalTimeout(1000)
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal.aborted).toBe(false)
  })

  it('should abort with a TimeoutError and fire the abort event after the given time', async () => {
    const signal = polyfilledAbortSignalTimeout(50)
    const onAbort = vi.fn<() => void>()
    signal.addEventListener('abort', onAbort)
    expect(signal.aborted).toBe(false)

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(signal.aborted).toBe(true)
    expect(signal.reason).toBeInstanceOf(DOMException)
    expect(signal.reason.name).toBe('TimeoutError')
    expect(onAbort).toHaveBeenCalledOnce()
  })
})

describe('abortSignalAny', () => {
  it('should abort when any of the signals aborts', () => {
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

  it('should return the signal as-is when only one signal is passed', () => {
    const controller = new AbortController()
    const combined = abortSignalAny([controller.signal])
    expect(combined).toBe(controller.signal)
  })

  it('should return an aborted signal when an input signal is already aborted', () => {
    const controller = new AbortController()
    const reason = new DOMException('already done', 'AbortError')
    controller.abort(reason)

    const combined = abortSignalAny([controller.signal, new AbortController().signal])
    expect(combined.aborted).toBe(true)
    expect(combined.reason).toBeInstanceOf(DOMException)
    expect(combined.reason.name).toBe('AbortError')
  })

  it('should abort on a caller abort before a long timeout fires', () => {
    const controller = new AbortController()
    const combined = abortSignalAny([abortSignalTimeout(10_000), controller.signal])

    controller.abort(new DOMException('user cancelled', 'AbortError'))

    expect(combined.aborted).toBe(true)
    expect(combined.reason.name).toBe('AbortError')
  })
})

describe('abortSignalAnyOrUndefined', () => {
  it('should return an AbortSignal when signals are provided', () => {
    const controller = new AbortController()
    const signal = abortSignalAnyOrUndefined([controller.signal])
    expect(signal).toBeInstanceOf(AbortSignal)
  })

  it('should return undefined when all signals are undefined', () => {
    expect(abortSignalAnyOrUndefined([undefined, undefined])).toBeUndefined()
  })

  it('should return undefined for an empty array', () => {
    expect(abortSignalAnyOrUndefined([])).toBeUndefined()
  })

  it('should return an AbortSignal when undefined signals are mixed in', () => {
    const controller = new AbortController()
    const signal = abortSignalAnyOrUndefined([undefined, controller.signal, undefined])
    expect(signal).toBeInstanceOf(AbortSignal)
  })
})

describe('polyfilledAbortSignalAny', () => {
  it('should abort when any of the signals aborts', () => {
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

  it('should return an aborted signal when an input signal is already aborted', () => {
    const controller = new AbortController()
    const reason = new DOMException('already done', 'AbortError')
    controller.abort(reason)

    const combined = polyfilledAbortSignalAny([controller.signal])
    expect(combined.aborted).toBe(true)
    expect(combined.reason).toBeInstanceOf(DOMException)
    expect(combined.reason.name).toBe('AbortError')
  })

  it('should keep the reason of the first signal that aborts', () => {
    const c1 = new AbortController()
    const c2 = new AbortController()
    const combined = polyfilledAbortSignalAny([c1.signal, c2.signal])

    c1.abort(new DOMException('first', 'AbortError'))
    c2.abort(new DOMException('second', 'AbortError'))

    expect(combined.reason.message).toContain('first')
  })

  it('should abort with a TimeoutError when combined with a timeout signal', async () => {
    const controller = new AbortController()
    const combined = polyfilledAbortSignalAny([polyfilledAbortSignalTimeout(50), controller.signal])

    expect(combined.aborted).toBe(false)

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(combined.aborted).toBe(true)
    expect(combined.reason).toBeInstanceOf(DOMException)
    expect(combined.reason.name).toBe('TimeoutError')
  })
})
