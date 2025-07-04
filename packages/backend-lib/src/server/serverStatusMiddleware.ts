import { _filterNullishValues, localTime } from '@naturalcycles/js-lib'
import { memoryUsageFull, processSharedUtil } from '@naturalcycles/nodejs-lib'
import type { BackendRequestHandler } from './server.model.js'

const { versions, arch, platform } = process
const { GOOGLE_CLOUD_PROJECT, K_SERVICE, K_REVISION, APP_ENV, NODE_OPTIONS, DEPLOY_BUILD_TIME } =
  process.env

export function serverStatusMiddleware(extra?: any): BackendRequestHandler {
  return async (_req, res) => {
    res.json(getServerStatusData(extra))
  }
}

export function getServerStatusData(extra?: any): Record<string, any> {
  return _filterNullishValues({
    nodeProcessStarted: getStartedStr(),
    DEPLOY_BUILD_TIME,
    APP_ENV,
    GOOGLE_CLOUD_PROJECT,
    K_SERVICE,
    K_REVISION,
    processInfo: {
      arch,
      platform,
    },
    mem: memoryUsageFull(),
    cpuAvg: processSharedUtil.cpuAvg(),
    cpuInfo: processSharedUtil.cpuInfo(),
    versions,
    NODE_OPTIONS,
    ...extra,
  })
}

function getStartedStr(): string {
  const started = localTime.now().minus(process.uptime(), 'second')
  return `${started.toPretty()} (${started.toFromNowString()})`
}
