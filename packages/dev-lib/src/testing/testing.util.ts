import { commonLoggerCreate } from '@naturalcycles/js-lib/log'
import { _inspect } from '@naturalcycles/nodejs-lib'

export function silentConsole(): void {
  console.log = () => {}
  console.debug = () => {}
  console.info = () => {}
  console.warn = () => {}
  console.error = () => {}
  console.time = () => {}
  console.table = () => {}
}

export const testLogger = commonLoggerCreate((_level, args) => {
  if (process.env['TEST_SILENT']) return // no-op
  process.stdout.write(
    args
      .map(a =>
        _inspect(a, {
          includeErrorStack: true,
        }),
      )
      .join(' ') + '\n',
  )
})

export const testLog = testLogger.log.bind(testLogger)
