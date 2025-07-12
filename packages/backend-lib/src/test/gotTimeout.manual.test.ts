import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { afterAll, test } from 'vitest'
import { getDefaultRouter } from '../express/getDefaultRouter.js'
import { expressTestService } from '../testing/index.js'

const res = getDefaultRouter()
res.get('/', async (_req, res) => {
  await pDelay(10_000)
  res.json('ok')
})

const app = await expressTestService.createAppFromResource(res, {
  debug: true,
})

afterAll(async () => {
  await app.close()
})

test('got timeout', async () => {
  // 10 retries by 2 seconds
  // So, we'll see how Got works, between 2 options:
  // A. It does 10 * 1 second (20 seconds)
  // B. It does 1 second max
  await app.get('', {
    timeoutSeconds: 0.5,
    retry: {
      count: 10,
      // calculateDelay: ({ attemptCount }) => (attemptCount === 10 ? 0 : 500),
    },
  })

  // Result: A
}, 60_000)
