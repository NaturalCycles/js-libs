import type { Options, OptionsJson, OptionsUrlencoded } from 'body-parser'
import type { CorsOptions } from 'cors'
import type { SentrySharedService } from '../sentry/sentry.shared.service.js'
import { asyncLocalStorageMiddleware } from '../server/asyncLocalStorageMiddleware.js'
import {
  genericErrorMiddleware,
  type GenericErrorMiddlewareCfg,
} from '../server/genericErrorMiddleware.js'
import { logMiddleware } from '../server/logMiddleware.js'
import { methodOverrideMiddleware } from '../server/methodOverrideMiddleware.js'
import { notFoundMiddleware } from '../server/notFoundMiddleware.js'
import { requestTimeoutMiddleware } from '../server/requestTimeoutMiddleware.js'
import type {
  BackendApplication,
  BackendRequest,
  BackendRequestHandler,
} from '../server/server.model.js'
import { simpleRequestLoggerMiddleware } from '../server/simpleRequestLoggerMiddleware.js'

const isTest = process.env['APP_ENV'] === 'test'
const isDev = process.env['APP_ENV'] === 'dev'

export async function createDefaultApp(cfg: DefaultAppCfg): Promise<BackendApplication> {
  const { sentryService } = cfg

  const { default: express } = await import('express')
  const { default: cors } = await import('cors')
  const { default: cookieParser } = await import('cookie-parser')

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
      verify(req: BackendRequest, _res, buf) {
        // Store the raw Buffer body
        req.rawBody = buf
      },
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
      verify(req: BackendRequest, _res, buf) {
        // Store the raw Buffer body
        req.rawBody = buf
      },
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

/**
 * Plain RequestHandler can be provided - then it's mounted to /
 * Otherwise `path` can be provided to specify mounting point.
 */
export type BackendRequestHandlerCfg = BackendRequestHandler | BackendRequestHandlerWithPath

export interface BackendRequestHandlerWithPath {
  path: string
  handler: BackendRequestHandler
}

/**
 * Handlers are used in this order:
 *
 * 1. preHandlers
 * 2. handlers
 * 3. resources
 * 4. postHandlers
 */
export interface DefaultAppCfg {
  preHandlers?: BackendRequestHandlerCfg[]
  handlers?: BackendRequestHandlerCfg[]
  resources?: BackendRequestHandlerCfg[]
  postHandlers?: BackendRequestHandlerCfg[]

  sentryService?: SentrySharedService

  bodyParserJsonOptions?: OptionsJson
  bodyParserUrlEncodedOptions?: OptionsUrlencoded
  bodyParserRawOptions?: Options

  corsOptions?: CorsOptions

  genericErrorMwCfg?: GenericErrorMiddlewareCfg
}
