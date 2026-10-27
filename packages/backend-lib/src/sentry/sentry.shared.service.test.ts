import * as sentry from '@sentry/node-core/light'
import { it } from 'vitest'
import { SentrySharedService } from './sentry.shared.service.js'

it('import sentry', async () => {
  const _ = new SentrySharedService({ sentry })
})
