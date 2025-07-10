import { _assert, _mapValues, _merge, _truncate, localTime } from '@naturalcycles/js-lib'
import { sha256 } from '@naturalcycles/nodejs-lib'
import { dimGrey, white } from '@naturalcycles/nodejs-lib/colors'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { yaml2 } from '@naturalcycles/nodejs-lib/yaml2'
import type { BackendCfg } from './backend.cfg.util.js'
import type { AppYaml, DeployInfo } from './deploy.model.js'

const APP_YAML_DEFAULT = (): AppYaml => ({
  runtime: 'nodejs22',
  service: 'default',
  inbound_services: ['warmup'],
  instance_class: 'F1',
  automatic_scaling: {
    min_instances: 0,
    max_instances: 1,
  },
  env_variables: {
    APP_ENV: 'prod',
    DEBUG: 'app*,nc:*',
    DEBUG_HIDE_DATE: 'true',
    // DEBUG_COLORS: 'true',
    TZ: 'UTC',
  },
})

export async function createAndSaveDeployInfo(
  backendCfg: BackendCfg,
  targetDir: string,
): Promise<DeployInfo> {
  const deployInfo = await createDeployInfo(backendCfg)
  const deployInfoPath = `${targetDir}/deployInfo.json`
  fs2.writeJson(deployInfoPath, deployInfo, { spaces: 2 })
  console.log(`saved ${dimGrey(deployInfoPath)}`)
  return deployInfo
}

export async function createDeployInfo(
  backendCfg: BackendCfg,
  overrideBranch?: string,
): Promise<DeployInfo> {
  const { simpleGit } = await import('simple-git') // lazy load
  const git = simpleGit('.')

  const now = localTime.now()
  const gitBranch = overrideBranch || (await git.status()).current!
  const gitRev = (await git.revparse(['HEAD'])).slice(0, 7)

  let {
    gaeProject,
    gaeProjectByBranch = {},
    gaeService,
    gaeServiceByBranch = {},
    branchesWithTimestampVersions = [],
  } = backendCfg

  gaeProject = gaeProjectByBranch[gitBranch] || gaeProject

  if (gaeServiceByBranch[gitBranch]) {
    gaeService = validateGAEServiceName(gaeServiceByBranch[gitBranch])
  } else {
    let branchName = gitBranch

    if (backendCfg.hashedBranches) {
      // Obfuscates the branch name by hashing it.
      // If there are Jira issue names in the branch name, the first one found will be used as a prefix.
      const jiraIssue = gitBranch.match(/([Dd][Ee][Vv]-\d+)/)?.[0]
      const branchHash = sha256(gitBranch).slice(0, 10)
      branchName = [jiraIssue, branchHash].filter(Boolean).join('-')
    }

    gaeService = validateGAEServiceName([branchName, gaeService].join('--'))
  }

  let gaeVersion = '1'

  if (branchesWithTimestampVersions.includes(gitBranch)) {
    // May only contain lowercase letters, digits, and hyphens. Must begin and end with a letter or digit. Must not exceed 63 characters.
    gaeVersion = [
      // now.format('YYYYMMDD-HHmm'), // 20190521-1721
      now.toStringCompact().replace('_', '-'),
      gitRev,
    ].join('-')
  }

  const versionUrl = `https://${[gaeVersion, gaeService, gaeProject].join('-dot-')}.appspot.com`

  // Check the 63-char limit
  const versionUrlString = [gaeVersion, gaeService, gaeProject].join('-dot-')
  _assert(
    versionUrlString.length <= 63,
    `versionUrl length should be <= 63 characters, but it's ${versionUrlString.length} instead: ${versionUrlString}`,
  )

  const serviceUrl = `https://${[gaeService, gaeProject].join('-dot-')}.appspot.com`

  const deployInfo: DeployInfo = {
    gaeProject,
    gaeService,
    gaeVersion,
    versionUrl,
    serviceUrl,
    gitBranch,
    gitRev,
    ts: now.unix,
  }

  console.log({ deployInfo })

  return deployInfo
}

export function createAndSaveAppYaml(
  backendCfg: BackendCfg,
  deployInfo: DeployInfo,
  projectDir: string,
  targetDir: string,
  appYamlPassEnv = '',
): AppYaml {
  const appYaml = createAppYaml(backendCfg, deployInfo, projectDir, appYamlPassEnv)
  const appYamlPath = `${targetDir}/app.yaml`
  yaml2.writeYaml(appYamlPath, appYaml)
  console.log(`saved ${dimGrey(appYamlPath)}`)
  return appYaml
}

export function createAppYaml(
  backendCfg: BackendCfg,
  deployInfo: DeployInfo,
  projectDir: string,
  appYamlPassEnv = '',
): AppYaml {
  const { appEnvDefault, appEnvByBranch = {} } = backendCfg
  const { gaeService: service, gitBranch } = deployInfo

  const { APP_ENV: processAppEnv } = process.env
  const APP_ENV = processAppEnv || appEnvByBranch[gitBranch] || appEnvDefault
  if (processAppEnv) {
    console.log(`using APP_ENV=${dimGrey(processAppEnv)} from process.env`)
  }

  const appYaml = APP_YAML_DEFAULT()

  // Check existing app.yaml
  const appYamlPath = `${projectDir}/app.yaml`
  if (fs2.pathExists(appYamlPath)) {
    console.log(`merging-in ${dimGrey(appYamlPath)}`)
    _merge(appYaml, yaml2.readYaml(appYamlPath))
  }

  const appEnvYamlPath = `${projectDir}/app.${APP_ENV}.yaml`
  if (fs2.pathExists(appEnvYamlPath)) {
    console.log(`merging-in ${dimGrey(appEnvYamlPath)}`)
    _merge(appYaml, yaml2.readYaml(appEnvYamlPath))
  }

  // appYamlPassEnv
  const passEnv = appYamlPassEnv
    .split(',')
    .filter(Boolean)
    // eslint-disable-next-line unicorn/no-array-reduce
    .reduce(
      (map, key) => {
        const v = process.env[key]
        if (!v) {
          throw new Error(
            `appYamlPassEnv.${key} is requested, but process.env.${key} is not defined!`,
          )
        }
        map[key] = v
        return map
      },
      {} as Record<string, string>,
    )

  if (Object.keys(passEnv).length) {
    console.log(
      `will merge ${white(
        String(Object.keys(passEnv).length),
      )} process.env keys to app.yaml: ${dimGrey(Object.keys(passEnv).join(', '))}`,
    )
  }

  _merge(appYaml, {
    service,
    env_variables: {
      APP_ENV,
      ...passEnv,
    },
  })

  // Redacted appYaml to not show up secrets
  console.log({
    appYaml: redactedAppYaml(appYaml),
  })

  return appYaml
}

function redactedAppYaml(appYaml: AppYaml): AppYaml {
  return {
    ...appYaml,
    env_variables: _mapValues(appYaml.env_variables || {}, (_k, v) => _truncate(String(v), 7)),
  }
}

export function validateGAEServiceName(serviceName: string): string {
  // May only contain lowercase letters, digits, and hyphens. Must begin and end with a letter or digit. Must not exceed 63 characters.
  return serviceName
    .replaceAll('_', '-')
    .toLowerCase()
    .replaceAll(/[^0-9a-z-]/gi, '')
    .slice(0, 40)
}
