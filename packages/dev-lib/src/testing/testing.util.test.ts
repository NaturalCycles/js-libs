import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { expectTypeOf, it } from 'vitest'
import { silentConsole, testLog, testLogger } from './testing.util.js'

it('should type testLogger as a CommonLogger', () => {
  testLog('hello')
  testLog({ a: 'a' })
  testLogger.log('hej')
  testLogger.warn('hej warn')
  testLogger.error('hej error')

  expectTypeOf(testLogger).toEqualTypeOf<CommonLogger>()
})

it('should silence the console without throwing', () => {
  silentConsole()
  console.log()
  console.debug()
  console.info()
  console.warn()
  console.error()
})
