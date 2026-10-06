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

export const testLogger = commonLoggerCreate(({ level: _level, msg, err, ...fields }) => {
  if (process.env['TEST_SILENT']) return // no-op
  const parts: string[] = []
  if (msg !== undefined) parts.push(msg)
  if (err !== undefined) parts.push(_inspect(err, { includeErrorStack: true }))
  if (Object.keys(fields).length) parts.push(_inspect(fields))
  process.stdout.write(parts.join(' ') + '\n')
})

export const testLog = testLogger.log.bind(testLogger)
