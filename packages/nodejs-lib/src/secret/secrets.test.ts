import fs from 'node:fs'
import { beforeEach, it, vi } from 'vitest'
import { secretDir } from '../test/paths.cnst.js'
import { TEST_ENC_KEY } from '../test/test.cnst.js'
import { secretsDecrypt } from './secrets-decrypt.util.js'
import { secretsEncrypt } from './secrets-encrypt.util.js'

beforeEach(() => {
  vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
  vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {})
})

const encKeyBuffer = Buffer.from(TEST_ENC_KEY, 'base64')

it('secrets', async () => {
  secretsDecrypt([secretDir], undefined, encKeyBuffer)
  secretsDecrypt([secretDir], undefined, encKeyBuffer, true)

  secretsEncrypt([secretDir], undefined, encKeyBuffer)
  secretsEncrypt([secretDir], undefined, encKeyBuffer, true)
})
