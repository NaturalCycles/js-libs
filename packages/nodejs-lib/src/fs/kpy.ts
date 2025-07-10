import path from 'node:path'
import { _since, localTime } from '@naturalcycles/js-lib/datetime'
import type { UnixTimestampMillis } from '@naturalcycles/js-lib/types'
import { glob, globSync } from 'tinyglobby'
import { boldWhite, dimGrey, grey, yellow } from '../colors/colors.js'
import { fs2 } from './fs2.js'

/**
 * Everything defaults to `undefined`.
 */
export interface KpyOptions {
  /**
   * @default . (cwd)
   */
  baseDir: string

  /**
   * @default to `**` (everything, including sub-dirs)
   */
  inputPatterns?: string[]

  /**
   * @default . (cwd)
   */
  outputDir: string

  silent?: boolean
  verbose?: boolean

  /**
   * Safety setting
   *
   * @default false
   */
  noOverwrite?: boolean

  dotfiles?: boolean
  flat?: boolean
  dry?: boolean

  /**
   * Will Move instead of Copy
   */
  move?: boolean
}

export async function kpy(opt: KpyOptions): Promise<void> {
  const started = localTime.nowUnixMillis()

  kpyPrepare(opt)

  const filenames = await glob(opt.inputPatterns!, {
    cwd: opt.baseDir,
    dot: opt.dotfiles,
  })

  kpyLogFilenames(opt, filenames)

  const overwrite = !opt.noOverwrite

  await Promise.all(
    filenames.map(async filename => {
      const basename = path.basename(filename)
      const srcFilename = path.resolve(opt.baseDir, filename)
      const destFilename = path.resolve(opt.outputDir, opt.flat ? basename : filename)

      if (!opt.dry) {
        if (opt.move) {
          await fs2.movePathAsync(srcFilename, destFilename, {
            force: overwrite,
          })
        } else {
          await fs2.copyPathAsync(srcFilename, destFilename, { force: overwrite })
        }
      }

      if (opt.verbose) {
        console.log(grey(`  ${filename}`))
      }
    }),
  )

  kpyLogResult(opt, filenames, started)
}

export function kpySync(opt: KpyOptions): void {
  const started = localTime.nowUnixMillis()

  kpyPrepare(opt)

  const filenames = globSync(opt.inputPatterns!, {
    cwd: opt.baseDir,
    dot: opt.dotfiles,
  })

  kpyLogFilenames(opt, filenames)

  const overwrite = !opt.noOverwrite

  filenames.forEach(filename => {
    const basename = path.basename(filename)
    const srcFilename = path.resolve(opt.baseDir, filename)
    const destFilename = path.resolve(opt.outputDir, opt.flat ? basename : filename)

    if (!opt.dry) {
      if (opt.move) {
        fs2.movePath(srcFilename, destFilename, { force: overwrite })
      } else {
        fs2.copyPath(srcFilename, destFilename, { force: overwrite })
      }
    }

    if (opt.verbose) {
      console.log(grey(`  ${filename}`))
    }
  })

  kpyLogResult(opt, filenames, started)
}

function kpyPrepare(opt: KpyOptions): void {
  // Default pattern
  if (!opt.inputPatterns?.length) opt.inputPatterns = ['**']

  // default to cwd
  opt.baseDir ||= '.'
  opt.outputDir ||= '.'

  if (!fs2.pathExists(opt.baseDir)) {
    console.log(`kpy: baseDir doesn't exist: ${boldWhite(opt.baseDir)}`)
    return
  }

  fs2.ensureDir(opt.outputDir)

  // Expand directories (ex-globby feature), experimental!
  const extraPatterns: string[] = []

  for (const pattern of opt.inputPatterns) {
    if (pattern.includes('*')) continue
    if (fs2.isDirectory(path.resolve(opt.baseDir, pattern))) {
      extraPatterns.push(`${pattern}/**`)
    }
  }

  if (opt.verbose) {
    console.log({ extraPatterns })
  }
  opt.inputPatterns.push(...extraPatterns)
}

function kpyLogFilenames(opt: KpyOptions, filenames: string[]): void {
  if (opt.silent) return

  // console.log({filenames})
  console.log(
    `Will ${opt.move ? 'move' : 'copy'} ${yellow(filenames.length)} files from ${dimGrey(
      opt.baseDir,
    )} to ${dimGrey(opt.outputDir)} (${dimGrey(opt.inputPatterns!.join(' '))})`,
  )
}

function kpyLogResult(opt: KpyOptions, filenames: string[], started: UnixTimestampMillis): void {
  if (opt.silent || filenames.length === 0) return

  console.log(
    `${opt.move ? 'Moved' : 'Copied'} ${yellow(filenames.length)} files to ${dimGrey(
      opt.outputDir,
    )} ${dimGrey(_since(started))}`,
  )
}
