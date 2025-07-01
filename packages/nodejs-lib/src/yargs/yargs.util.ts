import yargs from 'yargs'
// @ts-expect-error yargs types disagree with runtime
import { hideBin } from 'yargs/helpers'

/**
 * Quick yargs helper to make it work in esm.
 * It also allows to not have yargs and `@types/yargs` to be declared as dependencies.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function _yargs() {
  return yargs(hideBin(process.argv))
}
