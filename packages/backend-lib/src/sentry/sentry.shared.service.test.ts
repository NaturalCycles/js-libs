import * as sentry from '@sentry/node-core/light'
import { test } from 'vitest'
import { SentrySharedService } from './sentry.shared.service.js'

test('import sentry', async () => {
  const _ = new SentrySharedService({ sentry })
})
