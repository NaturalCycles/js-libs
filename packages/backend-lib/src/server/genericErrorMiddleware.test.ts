import type { BackendErrorResponseObject } from '@naturalcycles/js-lib/error'
import { afterAll, expect, test } from 'vitest'
import { debugResource } from '../test/debug.resource.js'
import { expressTestService } from '../testing/index.js'

const app = await expressTestService.createAppFromResource(debugResource)

afterAll(async () => {
  await app.close()
})

test('genericErrorFormatter', async () => {
  let res = await app.get<BackendErrorResponseObject>('asyncError', {
    throwHttpErrors: false,
  })

  expect(res.error.data['dirtySecret']).toBe('51')

  const overriddenSecret = 'Nothing to see'

  const appWExtraMw = await expressTestService.createAppFromResource(debugResource, undefined, {
    genericErrorMwCfg: {
      formatError: err => {
        err.data['dirtySecret'] = overriddenSecret
      },
    },
  })
  res = await appWExtraMw.get<BackendErrorResponseObject>('asyncError', {
    throwHttpErrors: false,
  })

  expect(res.error.data['dirtySecret']).toEqual(overriddenSecret)
  await appWExtraMw.close()
})
