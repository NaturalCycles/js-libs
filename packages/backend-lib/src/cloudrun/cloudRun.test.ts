import { expect, test } from 'vitest'
import { cloudRunService } from './cloudRun.js'

test('stringifyObject', () => {
  expect(
    cloudRunService.stringifyObject(cloudRunService.defaultStartupProbeConfig),
  ).toMatchInlineSnapshot(
    `"httpGet.path=/,httpGet.port=8080,initialDelaySeconds=3,failureThreshold=50,timeoutSeconds=1,periodSeconds=2"`,
  )
})
