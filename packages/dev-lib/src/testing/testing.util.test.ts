import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { expectTypeOf, test } from 'vitest'
import { silentConsole, testLog, testLogger } from './testing.util.js'

test('testLogger', () => {
  testLog('hello')
  testLog({ a: 'a' })
  testLogger.log('hej')
  testLogger.warn('hej warn')
  testLogger.error('hej error')

  expectTypeOf(testLogger).toEqualTypeOf<CommonLogger>()
})

test('silentConsole', () => {
  silentConsole()
  console.log()
  console.debug()
  console.info()
  console.warn()
  console.error()
})
