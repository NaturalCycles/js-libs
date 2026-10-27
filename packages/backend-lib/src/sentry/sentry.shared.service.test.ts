import * as sentry from '@sentry/node-core/light'
import { it } from 'vitest'
import { SentrySharedService } from './sentry.shared.service.js'

it('should create the service from the sentry module', async () => {
  const _ = new SentrySharedService({ sentry })
})
