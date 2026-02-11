import { _since } from '@naturalcycles/js-lib/datetime/time.util.js'
import type { UnixTimestampMillis } from '@naturalcycles/js-lib/types'

/* oxlint-disable unicorn/no-anonymous-default-export */
export default async (): Promise<void> => {
  const started = Date.now() as UnixTimestampMillis
  // @ts-expect-error custom global property
  await new Promise(resolve => global['__EXPRESS_SERVER__'].close(resolve as any))
  console.log(`\nglobalTeardown.ts done in ${_since(started)}`)
}
