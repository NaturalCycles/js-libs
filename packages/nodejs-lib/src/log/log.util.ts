import { commonLoggerCreate } from '@naturalcycles/js-lib/log'
import { _inspect } from '../string/inspect.js'

/**
 * CommonLogger that logs to process.stdout directly (bypassing console.log)!
 */
export const stdoutLogger = commonLoggerCreate((_level, args) => {
  process.stdout.write(args.map(a => _inspect(a)).join(' ') + '\n')
})
