import { join } from 'node:path'

export const projectDir = join(import.meta.dirname, '..')
// export const srcDir = projectDir + '/src'
export const cacheDir = projectDir + '/src/test/cache'
export const tmpDir = projectDir + '/tmp'
