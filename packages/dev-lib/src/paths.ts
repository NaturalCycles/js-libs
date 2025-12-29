import { join } from 'node:path'

export const projectDir = join(import.meta.dirname, '..')
export const repoDir = join(projectDir, '../..')
export const srcDir = `${projectDir}/src`
export const testDir = `${srcDir}/test`
export const cfgDir = `${projectDir}/cfg`
export const cfgOverwriteDir = `${projectDir}/cfg/overwrite`
export const scriptsDir = `${projectDir}/scripts`
