import { dimGrey } from '@naturalcycles/nodejs-lib/colors'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { kpySync } from '@naturalcycles/nodejs-lib/kpy'
import { srcDir } from '../paths.cnst.js'
import { getBackendCfg } from './backend.cfg.util.js'
import type { DeployInfo } from './deploy.model.js'
import { createAndSaveAppYaml, createAndSaveDeployInfo } from './deploy.util.js'

export interface DeployPrepareOptions {
  projectDir?: string
  targetDir?: string
  createNpmrc?: boolean

  /**
   * Comma-separated list of env variables that will be passed to app.yaml from process.env.
   * Use it to pass secrets.
   */
  appYamlPassEnv?: string
}

export const deployPrepareYargsOptions = {
  projectDir: {
    type: 'string',
    default: '.',
  },
  targetDir: {
    type: 'string',
    default: `./tmp/deploy`,
  },
  createNpmrc: {
    type: 'boolean',
    desc: 'Create .npmrc in targetDir if NPM_TOKEN env var is set',
    default: true,
  },
  appYamlPassEnv: {
    type: 'string',
    desc: 'Comma-separated list of env variables that will be passed to app.yaml from process.env',
  },
} as const

const DEFAULT_FILES = [
  'dist',
  // '!dist/test',
  // '!dist/**/*.test.*',
  // '!dist/**/*.mock.*',
  '!dist/**/*.script.*',
  'src', // For Sentry
  '!src/test',
  '!src/**/*.test.*',
  '!src/**/*.mock.*',
  '!src/**/*.script.*',
  '!**/__snapshots__',
  '!**/__exclude',
  'static',
  'secret/**/*.enc', // encrypted secrets
  'package.json',
  'yarn.lock',
  '.yarnrc',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  // 'tsconfig.json', // for path-mapping to work!
  // 'tsconfig.dist.json',
  '.gcloudignore',
  'app.yaml',
  'patches', // to allow patch-package
  'resources',
]

const defaultFilesDir = `${srcDir}/deploy/files-default`

export async function deployPrepare(opt: DeployPrepareOptions = {}): Promise<DeployInfo> {
  await import('dotenv/config') // ensure .env is loaded

  const { projectDir = '.', targetDir = './tmp/deploy', createNpmrc = true } = opt

  const backendCfg = getBackendCfg(projectDir)
  const inputPatterns = backendCfg.files || DEFAULT_FILES
  const appYamlPassEnv = opt.appYamlPassEnv || backendCfg.appYamlPassEnv

  console.log(`1. Copy files to ${dimGrey(targetDir)}`)

  // Clean targetDir
  fs2.emptyDir(targetDir)

  kpySync({
    baseDir: defaultFilesDir,
    outputDir: targetDir,
    dotfiles: true,
  })

  kpySync({
    baseDir: projectDir,
    inputPatterns,
    outputDir: targetDir,
    dotfiles: true,
  })

  const { NPM_TOKEN } = process.env
  if (NPM_TOKEN && createNpmrc) {
    const npmrcPath = `${targetDir}/.npmrc`
    const npmrc = `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`
    fs2.writeFile(npmrcPath, npmrc)
  }

  console.log(`2. Generate ${dimGrey('deployInfo.json')} and ${dimGrey('app.yaml')} in targetDir`)

  const deployInfo = await createAndSaveDeployInfo(backendCfg, targetDir)
  createAndSaveAppYaml(backendCfg, deployInfo, projectDir, targetDir, appYamlPassEnv)

  return deployInfo
}
