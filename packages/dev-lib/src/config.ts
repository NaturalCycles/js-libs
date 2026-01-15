import { AjvSchema, j } from '@naturalcycles/nodejs-lib/ajv'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'

/**
 * Returns an empty config if the file is absent.
 */
export async function readDevLibConfigIfPresent(cwd = process.cwd()): Promise<DevLibConfig> {
  const devLibConfigPath = `${cwd}/dev-lib.config.js`

  let cfg: DevLibConfig = {}
  if (fs2.pathExists(devLibConfigPath)) {
    cfg = (await import(devLibConfigPath)).default
    console.log(`read ${devLibConfigPath}`)
  }

  return devLibConfigSchema.validate(cfg)
}

const devLibConfigSchema = AjvSchema.create(
  j.object<DevLibConfig>({
    commitlint: j.object
      .infer({
        requireScope: j.boolean().optional(),
        allowedScopes: j.array(j.string()).optional(),
      })
      .optional(),
  }),
  {
    inputName: 'dev-lib.config.js',
  },
)

export interface DevLibConfig {
  commitlint?: DevLibCommitlintConfig
}

export interface DevLibCommitlintConfig {
  /**
   * Defaults to false.
   * If set to true - commit scope becomes required.
   */
  requireScope?: boolean
  /**
   * If defined - commitlint (which is run on git precommit hook) will validate that
   * the scope is one of the allowedScopes.
   * Empty (not present) scope will pass this rule, as it depends on the `requireScope` option instead.
   */
  allowedScopes?: string[]
}
