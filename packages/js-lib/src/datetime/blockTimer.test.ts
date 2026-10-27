import { afterEach, expect, it, vi } from 'vitest'
import { _blockTimer } from './time.util.js'

afterEach(() => {
  vi.useRealTimers()
})

it.each([
  [undefined, 'took 125 ms'],
  ['fetch', 'fetch took 125 ms'],
])('should log the elapsed time when the block ends, with name %s', (name, expected) => {
  vi.useFakeTimers()
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

  {
    using _ = _blockTimer(name)
    vi.advanceTimersByTime(125)
    expect(logSpy).not.toHaveBeenCalled()
  }

  expect(logSpy).toHaveBeenCalledExactlyOnceWith(expected)
})
