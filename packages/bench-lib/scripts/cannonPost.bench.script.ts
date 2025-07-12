/*

yarn tsx scripts/cannonPost.bench

 */

import http from 'node:http'
import { runScript } from '@naturalcycles/nodejs-lib/runScript'
import { runCannon } from '../src/index.js'

runScript(async () => {
  await runCannon(
    {
      '01-post': async () => {
        const { default: express } = await import('express')
        const app = express()
        app.disable('etag')
        app.disable('x-powered-by')
        app.post('/hello', (_req: any, res: any) => res.json({ ok: true }))
        return http.createServer(app)
      },
    },
    {
      runs: 1,
      duration: 2,
      cooldown: 1,
      path: '/hello',
      autocannonOptions: {
        method: 'POST',
        body: JSON.stringify({ hello: 'world' }),
        expectBody: JSON.stringify({ ok: true }),
      },
    },
  )
})
