import { kpySync } from '@naturalcycles/nodejs-lib/kpy'
import { cfgOverwriteDir } from './paths.js'

export function initFromDevLibCommand(): void {
  kpySync({
    baseDir: cfgOverwriteDir,
    outputDir: './',
    dotfiles: true,
    verbose: true,
  })
}
