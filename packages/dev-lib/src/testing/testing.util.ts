import { commonLoggerCreate } from '@naturalcycles/js-lib/log'
import { logEntryToString } from '@naturalcycles/nodejs-lib'

export function silentConsole(): void {
  console.log = () => {}
  console.debug = () => {}
  console.info = () => {}
  console.warn = () => {}
  console.error = () => {}
  console.time = () => {}
  console.table = () => {}
}

export const testLogger = commonLoggerCreate(entry => {
  if (process.env['TEST_SILENT']) return // no-op
  process.stdout.write(logEntryToString(entry) + '\n')
})

export const testLog = testLogger.log.bind(testLogger)
