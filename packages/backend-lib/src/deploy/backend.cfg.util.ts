import { _lazyValue } from '@naturalcycles/js-lib'
import type { StringMap } from '@naturalcycles/js-lib/types'
import { JSchema } from '@naturalcycles/nodejs-lib/ajv'
import type { JsonSchema } from '@naturalcycles/nodejs-lib/ajv'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { yaml2 } from '@naturalcycles/nodejs-lib/yaml2'
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

const getBackendCfgSchema = _lazyValue(() => {
  const schemaJson = fs2.readJson<JsonSchema<BackendCfg>>(`${resourcesDir}/backendCfg.schema.json`)
  return new JSchema<BackendCfg, false>(schemaJson, { inputName: 'backend.cfg.yaml' })
})

export function getBackendCfg(projectDir = '.'): BackendCfg {
  const backendCfgYamlPath = `${projectDir}/backend.cfg.yaml`

  fs2.requireFileToExist(backendCfgYamlPath)

  const backendCfg: BackendCfg = {
    ...yaml2.readYaml(backendCfgYamlPath),
  }

  getBackendCfgSchema().validate(backendCfg)
  return backendCfg
}
