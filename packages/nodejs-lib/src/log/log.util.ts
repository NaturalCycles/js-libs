import { commonLoggerCreate } from '@naturalcycles/js-lib/log'
import type { LogEntry } from '@naturalcycles/js-lib/log'
import { _inspect } from '../string/inspect.js'
import type { InspectAnyOptions } from '../string/inspect.js'

/**
 * CommonLogger that logs to process.stdout directly (bypassing console.log)!
 */
export const stdoutLogger = commonLoggerCreate(entry => {
  process.stdout.write(logEntryToString(entry) + '\n')
})

/**
 * Renders a LogEntry as one line: the msg, the inspected err and the inspected remaining fields,
 * separated by a space.
 */
export function logEntryToString(
  { level: _level, msg, err, ...fields }: LogEntry,
  opt: InspectAnyOptions = {},
): string {
  const parts: string[] = []
  if (msg !== undefined) parts.push(msg)
  if (err !== undefined) parts.push(_inspect(err, { includeErrorStack: true, ...opt }))
  if (Object.keys(fields).length) parts.push(_inspect(fields, opt))
  return parts.join(' ')
}
