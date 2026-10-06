import { commonLoggerCreate } from '@naturalcycles/js-lib/log'
import { _inspect } from '../string/inspect.js'

/**
 * CommonLogger that logs to process.stdout directly (bypassing console.log)!
 */
export const stdoutLogger = commonLoggerCreate(({ level: _level, msg, err, ...fields }) => {
  const parts: string[] = []
  if (msg !== undefined) parts.push(msg)
  if (err !== undefined) parts.push(_inspect(err))
  if (Object.keys(fields).length) parts.push(_inspect(fields))
  process.stdout.write(parts.join(' ') + '\n')
})
