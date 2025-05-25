import http from 'node:http'
import type { HttpServerFactory } from './cannon.model.js'

export const bareNodeServerFactory: HttpServerFactory = async () => {
  return http.createServer((_req, res) => {
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ hello: 'world' }))
  })
}

export const bareExpressServerFactory: HttpServerFactory = async () => {
  const { default: express } = await import('express')
  const app = express()
  app.disable('etag')
  app.disable('x-powered-by')
  app.get('/', (_req: any, res: any) => res.json({ hello: 'world' }))
  return http.createServer(app)
}

/**
 * Based on: https://github.com/fastify/benchmarks/blob/master/benchmarks/express-with-middlewares.js
 */
export const expressWithMiddlewaresServerFactory: HttpServerFactory = async () => {
  const { default: express } = await import('express')
  const { default: helmet } = await import('helmet')
  const { default: cors } = await import('cors')
  const app = express()
  app.disable('etag')
  app.disable('x-powered-by')

  app.use(cors())
  app.use(helmet.dnsPrefetchControl())
  app.use(helmet.frameguard())
  app.use(helmet.hidePoweredBy())
  app.use(helmet.hsts())
  app.use(helmet.ieNoOpen())
  app.use(helmet.xssFilter())

  app.get('/', (_req: any, res: any) => res.json({ hello: 'world' }))

  return http.createServer(app)
}

/**
 * It does await, because tests show no difference (even faster?!) in results between sync and async functions for express.
 */
export function expressFunctionFactory(fn: () => any): HttpServerFactory {
  return async () => {
    const { default: express } = await import('express')
    const app = express()
    app.disable('etag')
    app.disable('x-powered-by')
    app.get('/', async (_req: any, res: any) => res.json(await fn()))
    return http.createServer(app)
  }
}

export function expressSyncFunctionFactory(fn: () => any): HttpServerFactory {
  return async () => {
    const { default: express } = await import('express')
    const app = express()
    app.disable('etag')
    app.disable('x-powered-by')
    app.get('/', (_req: any, res: any) => res.json(fn()))
    return http.createServer(app)
  }
}
