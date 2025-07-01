#!/usr/bin/env node

import 'dotenv/config'
import { dimGrey } from '../colors/colors.js'
import { runScript } from '../script/runScript.js'
import type { DecryptCLIOptions } from '../secret/secrets-decrypt.util.js'
import { secretsDecrypt } from '../secret/secrets-decrypt.util.js'
import { _yargs } from '../yargs/yargs.util.js'

runScript(() => {
  const { dir, file, encKeyBuffer, del, jsonMode } = getDecryptCLIOptions()

  secretsDecrypt(dir, file, encKeyBuffer, del, jsonMode)
})

function getDecryptCLIOptions(): DecryptCLIOptions {
  let { dir, file, encKey, encKeyVar, del, jsonMode } = _yargs().options({
    dir: {
      type: 'array',
      desc: 'Directory with secrets. Can be many',
      // demandOption: true,
      default: './secret',
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
    },
    jsonMode: {
      type: 'boolean',
      desc: 'JSON mode. Encrypts only json values, not the whole file',
      default: false,
    },
  }).argv

  if (!encKey) {
    encKey = process.env[encKeyVar]

    if (encKey) {
      console.log(`using encKey from env.${dimGrey(encKeyVar)}`)
    } else {
      throw new Error(
        `encKey is required. Can be provided as --encKey or env.SECRET_ENCRYPTION_KEY (see readme.md)`,
      )
    }
  }

  const encKeyBuffer = Buffer.from(encKey, 'base64')

  // `as any` because @types/yargs can't handle string[] type properly
  return { dir: dir as any, file, encKeyBuffer, del, jsonMode }
}
