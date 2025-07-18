import { _since } from '@naturalcycles/js-lib/datetime/time.util.js'
import type { UnixTimestampMillis } from '@naturalcycles/js-lib/types'

/* eslint-disable import-x/no-anonymous-default-export, unicorn/no-anonymous-default-export */
// biome-ignore lint/style/noDefaultExport: ok
export default async (): Promise<void> => {
  const started = Date.now() as UnixTimestampMillis
  // @ts-expect-error
  await new Promise(resolve => global['__EXPRESS_SERVER__'].close(resolve as any))
  console.log(`\nglobalTeardown.ts done in ${_since(started)}`)
}
