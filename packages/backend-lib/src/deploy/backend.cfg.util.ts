import type { StringMap } from '@naturalcycles/js-lib'
import { AjvSchema } from '@naturalcycles/nodejs-lib/ajv'
import { fs2 } from '@naturalcycles/nodejs-lib/fs'
import { resourcesDir } from '../paths.cnst.js'

export interface BackendCfg {
  gaeProject: string
  gaeProjectByBranch?: StringMap

  /**
   * @example default
   */
  gaeService: string
  gaeServiceByBranch?: StringMap

  /**
   * List of file patterns to include in deployment.
   */
  files?: string[]

  appEnvDefault: string
  appEnvByBranch?: StringMap

  /**
   * List of branches to use timestamps in gae version names (to keep previous versions).
   */
  branchesWithTimestampVersions?: string[]

  /**
   * If true - branch names are not passed into deployed urls as is, but are hashed.
   */
  hashedBranches?: boolean

  /**
   * Comma-separated list of env variables that will be passed to app.yaml from process.env
   */
  appYamlPassEnv?: string
}

const backendCfgSchema = AjvSchema.readJsonSync<BackendCfg>(
  `${resourcesDir}/backendCfg.schema.json`,
  {
    objectName: 'backend.cfg.yaml',
  },
)

export function getBackendCfg(projectDir = '.'): BackendCfg {
  const backendCfgYamlPath = `${projectDir}/backend.cfg.yaml`

  fs2.requireFileToExist(backendCfgYamlPath)

  const backendCfg: BackendCfg = {
    ...fs2.readYaml(backendCfgYamlPath),
  }

  backendCfgSchema.validate(backendCfg)
  return backendCfg
}
