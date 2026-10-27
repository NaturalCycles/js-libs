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

it('should not throw when decrypting and encrypting a secrets dir', async () => {
  secretsDecrypt([secretDir], undefined, encKeyBuffer)
  secretsDecrypt([secretDir], undefined, encKeyBuffer, true)

  secretsEncrypt([secretDir], undefined, encKeyBuffer)
  secretsEncrypt([secretDir], undefined, encKeyBuffer, true)
})
