import path from 'node:path'

export const srcDir = path.join(import.meta.dirname, '/..')
export const projectDir = path.join(srcDir, '/..')
export const tmpDir = projectDir + '/tmp'
export const testDir = srcDir + '/test'
