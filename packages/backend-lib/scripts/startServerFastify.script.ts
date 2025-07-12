/*

pn tsx scripts/startServerFastify

 */

import { runScript } from '@naturalcycles/nodejs-lib/runScript'
import fastifyLib from 'fastify'

runScript(async () => {
  const fastify = fastifyLib({
    logger: true,
  })

  // fastify.get('/', (_req, res) => {
  //   res.send({ hello: 'world' })
  // })

  fastify.get('/', async () => {
    return { hello: 'world' }
  })

  const address = await fastify.listen({ port: 3000 })
  console.log(address)

  // Hang in there
  await new Promise(() => {})
})
