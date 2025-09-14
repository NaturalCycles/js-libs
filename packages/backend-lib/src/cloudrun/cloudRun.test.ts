import { expect, test } from 'vitest'
import { cloudRunUtil } from './cloudRun.js'

test('stringifyObject', () => {
  expect(
    cloudRunUtil.stringifyObject(cloudRunUtil.defaultStartupProbeConfig),
  ).toMatchInlineSnapshot(
    `"httpGet.path=/,httpGet.port=8080,initialDelaySeconds=3,failureThreshold=50,timeoutSeconds=1,periodSeconds=2"`,
  )
})
