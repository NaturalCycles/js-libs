import { inspect } from 'node:util'
import { _anyToErrorObject } from '@naturalcycles/js-lib/error'
import { commonLoggerCreate } from '@naturalcycles/js-lib/log'
import type { CommonLogger, CommonLogLevel, LogEntry } from '@naturalcycles/js-lib/log'
import { _safeJsonStringify } from '@naturalcycles/js-lib/string/safeJsonStringify.js'
import { _objectAssign } from '@naturalcycles/js-lib/types'
import type { AnyObject } from '@naturalcycles/js-lib/types'
import { _inspect } from '@naturalcycles/nodejs-lib'
import { dimGrey } from '@naturalcycles/nodejs-lib/colors'
import type { BackendRequestHandler } from './server.model.js'

const { GOOGLE_CLOUD_PROJECT, GAE_INSTANCE, K_SERVICE, APP_ENV } = process.env
const isGAE = !!GAE_INSTANCE
const isCloudRun = !!K_SERVICE
// const isTest = APP_ENV === 'test'
const isDev = APP_ENV === 'dev'

// Simple "request counter" (poor man's "correlation id") counter, to use on dev machine (not in the cloud)
let reqCounter = 0

/**
 * Logger that logs in "GCP structured log" format.
 * To be used in outside-of-request situations (otherwise req.log should be used).
 */
export const gcpStructuredLogger: CommonLogger = commonLoggerCreate(entry =>
  writeGCPStructuredLog({}, entry),
)

/**
 * Fancy development logger, to be used in outside-of-request situations
 * (otherwise req.log should be used).
 */
export const devLogger: CommonLogger = commonLoggerCreate(entry => logToDev(null, entry))

/**
 * Same as devLogger, but without colors (e.g to not confuse Sentry).
 */
export const ciLogger: CommonLogger = commonLoggerCreate(logToCI)

const gcpSeverityByLevel: Record<CommonLogLevel, string> = {
  debug: 'DEBUG',
  log: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
}

// Documented here: https://cloud.google.com/logging/docs/structured-logging
// Cloud Run logging: https://cloud.google.com/run/docs/logging
function writeGCPStructuredLog(meta: AnyObject, entry: LogEntry): void {
  const { level, msg, err, ...fields } = entry
  if (err instanceof Error) {
    fields['err'] = _anyToErrorObject(err)
    fields['message'] = msg ? `${msg}\n${inspect(err)}` : inspect(err)
  } else {
    if (err !== undefined) fields['err'] = err
    if (msg !== undefined) fields['message'] = msg
  }
  console.log(_safeJsonStringify({ ...fields, ...meta, severity: gcpSeverityByLevel[level] }))
}

function logToDev(
  requestId: string | null,
  { level: _level, msg, err, ...fields }: LogEntry,
): void {
  // Run on local machine
  const parts: string[] = []
  if (requestId) parts.push(dimGrey(`[${requestId}]`))
  if (msg !== undefined) parts.push(msg)
  if (err !== undefined) parts.push(_inspect(err, { includeErrorStack: true, colors: true }))
  if (Object.keys(fields).length) parts.push(dimGrey(_inspect(fields, { colors: false })))
  console.log(parts.join(' '))
}

/**
 * Same as logToDev, but without request and without colors.
 * This is to not confuse e.g Sentry when it picks up messages with colors
 */
function logToCI({ level: _level, msg, err, ...fields }: LogEntry): void {
  const parts: string[] = []
  if (msg !== undefined) parts.push(msg)
  if (err !== undefined) parts.push(_inspect(err, { includeErrorStack: true, colors: false }))
  if (Object.keys(fields).length) parts.push(_inspect(fields, { colors: false }))
  console.log(parts.join(' '))
}

export function logMiddleware(): BackendRequestHandler {
  if (isGAE || isCloudRun) {
    return function gcpStructuredLogHandler(req, _res, next) {
      const meta: AnyObject = {
        // Experimental!
        // Testing to include userId in metadata (not message payload) to see if it's searchable
        labels: {
          userId: req.userId,
        },
      }

      // CloudRun does NOT have this env variable set,
      // so you have to set it manually on deployment, like this:
      // gcloud run deploy my-service \
      //   --update-env-vars=GOOGLE_CLOUD_PROJECT=$(gcloud config get-value project)
      if (GOOGLE_CLOUD_PROJECT) {
        const traceHeader = req.header('x-cloud-trace-context')
        if (traceHeader) {
          const [trace] = traceHeader.split('/')
          meta['logging.googleapis.com/trace'] = `projects/${GOOGLE_CLOUD_PROJECT}/traces/${trace}`
          req.requestId = trace
        }
      }
      if (isGAE) {
        meta['appengine.googleapis.com/request_id'] = req.header('x-appengine-request-log-id')
      }

      _objectAssign(
        req,
        commonLoggerCreate(entry => writeGCPStructuredLog(meta, entry)),
      )

      next()
    }
  }

  if (isDev) {
    // Local machine, return "simple" logToDev middleware with request numbering
    return function devLogHandler(req, _res, next) {
      // Local machine
      req.requestId = String(++reqCounter)
      _objectAssign(
        req,
        commonLoggerCreate(entry => logToDev(req.requestId!, entry)),
      )
      next()
    }
  }

  // Otherwise, return "simple" logger
  // This includes: unit tests, CI environments
  return function simpleLogHandler(req, _res, next) {
    _objectAssign(req, ciLogger)
    next()
  }
}
