import type { StringMap } from '@naturalcycles/js-lib/types'
import { j } from '@naturalcycles/nodejs-lib/ajv'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { yaml2 } from '@naturalcycles/nodejs-lib/yaml2'

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

export const backendCfgSchema = j.object<BackendCfg>({
  gaeProject: j.string(),
  gaeProjectByBranch: j.object.stringMap(j.string()).optional(),
  gaeService: j.string(),
  gaeServiceByBranch: j.object.stringMap(j.string()).optional(),
  files: j.array(j.string()).optional(),
  appEnvDefault: j.string(),
  appEnvByBranch: j.object.stringMap(j.string()).optional(),
  branchesWithTimestampVersions: j.array(j.string()).optional(),
  hashedBranches: j.boolean().optional(),
  appYamlPassEnv: j.string().optional(),
})

export function getBackendCfg(projectDir = '.'): BackendCfg {
  const backendCfgYamlPath = `${projectDir}/backend.cfg.yaml`

  fs2.requireFileToExist(backendCfgYamlPath)

  const backendCfg: BackendCfg = {
    ...yaml2.readYaml(backendCfgYamlPath),
  }

  return backendCfgSchema.validate(backendCfg)
}
