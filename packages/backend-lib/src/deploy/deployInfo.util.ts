import { localTime } from '@naturalcycles/js-lib/datetime'
import { _memoFn } from '@naturalcycles/js-lib/decorators'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import type { DeployInfo } from './deploy.model.js'

export const getDeployInfo = _memoFn((projectDir: string): DeployInfo => {
  const deployInfoPath = `${projectDir}/deployInfo.json`
  try {
    return fs2.readJson(deployInfoPath)
  } catch {
    // console.error(`cannot read ${deployInfoPath}, returning empty version`)
    return getDeployInfoStub()
  }
})

function getDeployInfoStub(stub = ''): DeployInfo {
  return {
    gaeProject: stub,
    gaeService: stub,
    gaeVersion: stub,
    serviceUrl: stub,
    versionUrl: stub,
    gitBranch: stub,
    gitRev: stub,
    ts: localTime.nowUnix(),
  }
}
