import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { asyncLocalStorageMiddleware } from './asyncLocalStorageMiddleware.js'
import type {
  BackendRequestHandlerCfg,
  BackendRequestHandlerWithPath,
  DefaultAppCfg,
} from './createDefaultApp.model.js'
import { genericErrorMiddleware } from './genericErrorMiddleware.js'
import { logMiddleware } from './logMiddleware.js'
import { methodOverrideMiddleware } from './methodOverrideMiddleware.js'
import { notFoundMiddleware } from './notFoundMiddleware.js'
import { requestTimeoutMiddleware } from './requestTimeoutMiddleware.js'
import type { BackendApplication } from './server.model.js'
import { simpleRequestLoggerMiddleware } from './simpleRequestLoggerMiddleware.js'

const isTest = process.env['APP_ENV'] === 'test'
const isDev = process.env['APP_ENV'] === 'dev'

export async function createDefaultApp(cfg: DefaultAppCfg): Promise<BackendApplication> {
  const { sentryService } = cfg

  const app = express()

  app.disable('etag')
  app.disable('x-powered-by')
  app.set('trust proxy', true)

  // preHandlers
  useHandlers(app, cfg.preHandlers)

  app.use(logMiddleware())

  if (!isTest) {
    app.use(asyncLocalStorageMiddleware())
  }

  app.use(methodOverrideMiddleware())
  app.use(requestTimeoutMiddleware())
  // app.use(serverStatsMiddleware()) // disabled by default
  // app.use(bodyParserTimeout()) // removed by default

  if (isDev) {
    app.use(simpleRequestLoggerMiddleware())
  }

  // app.use(safeJsonMiddleware()) // optional

  // accepts application/json
  app.use(
    express.json({
      limit: '1mb',
      ...cfg.bodyParserJsonOptions,
    }),
  )

  app.use(
    express.urlencoded({
      limit: '1mb',
      extended: true,
      ...cfg.bodyParserUrlEncodedOptions,
    }),
  )

  // accepts application/octet-stream
  app.use(
    express.raw({
      // inflate: true, // default is `true`
      limit: '1mb',
      ...cfg.bodyParserRawOptions,
    }),
  )

  app.use(cookieParser())

  if (!isTest) {
    // leaks, load lazily
    const { default: helmet } = await import('helmet')
    app.use(
      helmet({
        contentSecurityPolicy: false, // to allow "admin 401 auto-redirect"
      }),
    )
  }

  app.use(
    cors({
      origin: true,
      credentials: true,
      // methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // default
      maxAge: 86400,
      ...cfg.corsOptions,
    }),
  )

  // app.use(clearBodyParserTimeout()) // removed by default

  // Static is now disabled by default due to performance
  // Without: 6500 rpsAvg
  // With: 5200 rpsAvg (-20%)
  // app.use(express.static('static'))

  // Handlers
  useHandlers(app, cfg.handlers)

  // Resources
  useHandlers(app, cfg.resources)

  // postHandlers
  useHandlers(app, cfg.postHandlers)

  // Generic 404 handler
  app.use(notFoundMiddleware())

  // currently disabled as not necessary (because genericErrorMiddleware already reports to sentry)
  // if (sentryService) {
  //   sentryService.sentry.setupExpressErrorHandler(app)
  // }

  // Generic error handler
  // It handles errors, returns proper status, does sentry.captureException(),
  // assigns err.data.errorId from sentry
  app.use(
    genericErrorMiddleware({ errorReportingService: sentryService, ...cfg.genericErrorMwCfg }),
  )

  return app
}

function useHandlers(app: BackendApplication, handlers: BackendRequestHandlerCfg[] = []): void {
  handlers
    .map<BackendRequestHandlerWithPath>(cfg => {
      if (typeof cfg === 'function') {
        return {
          path: '/',
          handler: cfg,
        }
      }
      return cfg
    })
    .forEach(cfg => {
      app.use(cfg.path, cfg.handler)
    })
}
