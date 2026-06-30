import { _parseArgs } from '../cli/parseArgs.js'
import { dimGrey } from '../colors/colors.js'
import { runScript } from '../script/runScript.js'
import type { EncryptCLIOptions } from '../secret/secrets-encrypt.util.js'
import { secretsEncrypt } from '../secret/secrets-encrypt.util.js'

runScript(() => {
  const { pattern, file, encKeyBuffer, del, jsonMode } = getEncryptCLIOptions()

  secretsEncrypt(pattern, file, encKeyBuffer, del, jsonMode)
})

function getEncryptCLIOptions(): EncryptCLIOptions {
  let { pattern, file, encKey, encKeyVar, del, jsonMode } = _parseArgs({
    pattern: {
      type: 'string',
      array: true,
      desc: 'Glob pattern for secrets. Can be multiple.',
      // demandOption: true,
      default: './secret/**',
    },
    file: {
      type: 'string',
      desc: 'Single file to decrypt. Useful in jsonMode',
    },
    encKey: {
      type: 'string',
      desc: 'Encryption key as base64 encoded string',
      // demandOption: true,
      // default: process.env.SECRET_ENCRYPTION_KEY!,
    },
    encKeyVar: {
      type: 'string',
      desc: 'Env variable name to get `encKey` from.',
      default: 'SECRET_ENCRYPTION_KEY',
    },
    // algorithm: {
    //   type: 'string',
    //   default: 'aes-256-cbc',
    // },
    del: {
      type: 'boolean',
      desc: 'Delete source files after encryption/decryption. Be careful!',
      default: false,
    },
    jsonMode: {
      type: 'boolean',
      desc: 'JSON mode. Encrypts only json values, not the whole file',
      default: false,
    },
  })

  if (!encKey) {
    encKey = process.env[encKeyVar]

    if (encKey) {
      console.log(`using encKey from process.env.${dimGrey(encKeyVar)}`)
    } else {
      throw new Error(
        `encKey is required. Can be provided as --encKey or env.SECRET_ENCRYPTION_KEY (see readme.md)`,
      )
    }
  }

  const encKeyBuffer = Buffer.from(encKey, 'base64')

  return { pattern, file, encKeyBuffer, del, jsonMode }
}
