import os from 'node:os'
import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import { _filterNullishValues } from '@naturalcycles/js-lib/object/object.util.js'
import { memoryUsageFull, processSharedUtil } from '@naturalcycles/nodejs-lib'
import { getDeployInfo } from '../deploy/deployInfo.util.js'
import type { BackendRequestHandler } from './server.model.js'

const { versions, arch, platform } = process
const availableParallelismAtStart = os.availableParallelism()
const {
  GAE_APPLICATION,
  GAE_SERVICE,
  GAE_VERSION,
  GOOGLE_CLOUD_PROJECT,
  K_SERVICE,
  K_REVISION,
  APP_ENV,
  NODE_ENV,
  NODE_OPTIONS,
  UV_THREADPOOL_SIZE,
  MALLOC_ARENA_MAX,
  DEPLOY_BUILD_TIME,
  BUILD_VERSION,
} = process.env

export function serverStatusMiddleware(projectDir?: string, extra?: any): BackendRequestHandler {
  return async (_req, res) => {
    res.json(getServerStatusData(projectDir, extra))
  }
}

export function getServerStatusData(
  projectDir: string = process.cwd(),
  extra?: any,
): Record<string, any> {
  let deployBuildTime = DEPLOY_BUILD_TIME
  if (!deployBuildTime) {
    const { ts } = getDeployInfo(projectDir)
    deployBuildTime = localTime(ts).toPretty()
  }

  const availableParallelism = os.availableParallelism()

  return _filterNullishValues({
    nodeProcessStarted: getStartedStr(),
    deployBuildTime,
    BUILD_VERSION,
    APP_ENV,
    GOOGLE_CLOUD_PROJECT,
    GAE_APPLICATION,
    GAE_SERVICE,
    GAE_VERSION,
    K_SERVICE,
    K_REVISION,
    processInfo: {
      arch,
      platform,
    },
    mem: memoryUsageFull(),
    cpuAvg: processSharedUtil.cpuAvg(),
    cpuInfo: processSharedUtil.cpuInfo(),
    availableParallelismAtStart,
    availableParallelism,
    versions,
    NODE_OPTIONS,
    NODE_ENV,
    UV_THREADPOOL_SIZE,
    MALLOC_ARENA_MAX,
    ...extra,
  })
}

function getStartedStr(): string {
  const started = localTime.now().minus(process.uptime(), 'second')
  return `${started.toPretty()} (${started.toFromNowString()})`
}
