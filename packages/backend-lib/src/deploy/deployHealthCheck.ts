import type { InspectOptions } from 'node:util'
import { inspect } from 'node:util'
import { _ms, _since } from '@naturalcycles/js-lib/datetime'
import { getFetcher } from '@naturalcycles/js-lib/http'
import { _filterFalsyValues } from '@naturalcycles/js-lib/object'
import { pDelay } from '@naturalcycles/js-lib/promise'
import type { UnixTimestampMillis } from '@naturalcycles/js-lib/types'
import { dimGrey, red } from '@naturalcycles/nodejs-lib/colors'
import { exec2 } from '@naturalcycles/nodejs-lib/exec2'
import { coloredHttpCode } from '../server/request.log.util.js'

export interface DeployHealthCheckOptions {
  thresholdHealthy?: number
  thresholdUnhealthy?: number
  maxTries?: number
  timeoutSec?: number
  intervalSec?: number
  logOnFailure?: boolean
  logOnSuccess?: boolean
  gaeProject?: string
  gaeService?: string
  gaeVersion?: string
}

export const deployHealthCheckYargsOptions = {
  thresholdHealthy: {
    type: 'number',
    default: 5,
  },
  thresholdUnhealthy: {
    type: 'number',
    default: 8,
  },
  maxTries: {
    type: 'number',
    default: 30,
  },
  timeoutSec: {
    type: 'number',
    default: 180,
  },
  intervalSec: {
    type: 'number',
    default: 1,
  },
  logOnFailure: {
    type: 'boolean',
    default: true,
    desc: 'Show server logs on health check failure (requires gaeProject, gaeService, gaeVersion)',
  },
  logOnSuccess: {
    type: 'boolean',
    default: false,
    desc: 'Show server logs on health check success (requires gaeProject, gaeService, gaeVersion)',
  },
  gaeProject: {
    type: 'string',
  },
  gaeService: {
    type: 'string',
  },
  gaeVersion: {
    type: 'string',
  },
} as const

const inspectOpt: InspectOptions = {
  colors: true,
  breakLength: 120,
}

/**
 * Requires up to `healthyThreshold` consecutive OK responses to succeed.
 * Fails on up to `unhealthyThreshold` consecutive FAIL responses.
 * Fails after maxTries.
 */
export async function deployHealthCheck(
  url: string,
  opt: DeployHealthCheckOptions = {},
): Promise<void> {
  const {
    thresholdHealthy = 5,
    thresholdUnhealthy = 8,
    maxTries = 30,
    timeoutSec = 30,
    intervalSec = 1,
    logOnFailure = true,
    logOnSuccess,
    gaeProject,
    gaeService,
    gaeVersion,
  } = opt

  let attempt = 0
  let countHealthy = 0
  let countUnhealthy = 0
  let done = false
  let doneReason: string | undefined
  let failed = false
  let currentInterval = intervalSec * 1000

  const fetcher = getFetcher()

  while (!done) {
    await makeAttempt()
  }

  if (failed) {
    console.log(red(`Health check failed!`))

    if (logOnFailure) {
      try {
        exec2.spawn(
          `gcloud app logs read --project ${gaeProject} --service ${gaeService} --version ${gaeVersion}`,
        )
      } catch {}
    }

    process.exit(1)
  }

  if (logOnSuccess) {
    try {
      exec2.spawn(
        `gcloud app logs read --project ${gaeProject} --service ${gaeService} --version ${gaeVersion}`,
      )
    } catch {}
  }

  async function makeAttempt(): Promise<void> {
    attempt++

    console.log([`>>`, dimGrey(url), inspect({ attempt }, inspectOpt)].join(' '))

    const started = Date.now() as UnixTimestampMillis

    const { err, statusCode = 0 } = await fetcher.doFetch({
      url,
      responseType: 'json',
      timeoutSeconds: timeoutSec,
      retry: {
        count: 0,
      },
      redirect: 'error',
    })

    if (err) {
      console.log(err)
    }

    if (statusCode === 200) {
      countHealthy++
      countUnhealthy = 0
      currentInterval = intervalSec * 1000 // reset
    } else {
      countUnhealthy++
      countHealthy = 0
      currentInterval = Math.round(currentInterval * 1.5) // exponential back-off
    }

    if (countHealthy >= thresholdHealthy) {
      doneReason = `reached thresholdHealthy of ${thresholdHealthy}`
      done = true
    } else if (countUnhealthy >= thresholdUnhealthy) {
      doneReason = `reached thresholdUnhealthy of ${thresholdUnhealthy}`
      done = true
      failed = true
    }

    console.log(
      [
        `<< HTTP`,
        coloredHttpCode(statusCode),
        dimGrey(_since(started)),
        inspect(_filterFalsyValues({ countHealthy, countUnhealthy }), inspectOpt),
      ].join(' '),
    )

    if (attempt >= maxTries) {
      doneReason = `reached maxTries of ${maxTries}`
      done = true
      failed = true
    }

    if (done) {
      console.log(doneReason)
    } else {
      console.log(dimGrey(`... waiting ${_ms(currentInterval)} ...`))
      await pDelay(currentInterval)
    }
  }
}
