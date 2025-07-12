import fs from 'node:fs'
import path from 'node:path'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import { globSync } from 'tinyglobby'
import { dimGrey, yellow } from '../colors/colors.js'
import { fs2 } from '../fs/fs2.js'
import { encryptObject, encryptRandomIVBuffer } from '../security/crypto.util.js'

export interface EncryptCLIOptions {
  pattern: string[]
  file?: string
  encKeyBuffer: Buffer
  del?: boolean
  jsonMode?: boolean
}

/**
 * Encrypts all files in given directory (except *.enc), saves encrypted versions as filename.ext.enc.
 * Using provided encKey.
 */
export function secretsEncrypt(
  pattern: string[],
  file: string | undefined,
  encKeyBuffer: Buffer,
  del = false,
  jsonMode = false,
): void {
  const patterns = file
    ? [file]
    : [
        ...pattern,
        `!**/*.enc`, // excluding already encoded
      ]
  const filenames = globSync(patterns)
  let encFilename: string

  filenames.forEach(filename => {
    if (jsonMode) {
      _assert(
        filename.endsWith('.plain.json'),
        `${path.basename(filename)} MUST end with '.plain.json'`,
      )
      encFilename = filename.replace('.plain', '')

      const json = encryptObject(fs2.readJson(filename), encKeyBuffer)

      fs2.writeJson(encFilename, json, { spaces: 2 })
    } else {
      const plain = fs.readFileSync(filename)
      const enc = encryptRandomIVBuffer(plain, encKeyBuffer)
      encFilename = `${filename}.enc`
      fs.writeFileSync(encFilename, enc)
    }

    if (del) {
      fs.unlinkSync(filename)
    }

    console.log(`  ${path.basename(filename)} > ${path.basename(encFilename)}`)
  })

  console.log(`encrypted ${yellow(filenames.length)} files in (${dimGrey(pattern.join(' '))})`)
}
