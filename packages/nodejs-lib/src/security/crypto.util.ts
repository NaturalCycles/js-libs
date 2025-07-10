import crypto from 'node:crypto'
import { _stringMapEntries, type Base64String, type StringMap } from '@naturalcycles/js-lib/types'
import { md5AsBuffer, sha256AsBuffer } from './hash.util.js'

const algorithm = 'aes-256-cbc'

/**
 * Using aes-256-cbc.
 */
export function encryptRandomIVBuffer(input: Buffer, secretKeyBuffer: Buffer): Buffer {
  // sha256 to match aes-256 key length
  const key = sha256AsBuffer(secretKeyBuffer)

  // Random iv to achieve non-deterministic encryption (but deterministic decryption)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)

  return Buffer.concat([iv, cipher.update(input), cipher.final()])
}

/**
 * Using aes-256-cbc.
 */
export function decryptRandomIVBuffer(input: Buffer, secretKeyBuffer: Buffer): Buffer {
  // sha256 to match aes-256 key length
  const key = sha256AsBuffer(secretKeyBuffer)

  // iv is first 16 bytes of encrypted buffer, the rest is payload
  const iv = input.subarray(0, 16)
  const payload = input.subarray(16)

  const decipher = crypto.createDecipheriv(algorithm, key, iv)

  return Buffer.concat([decipher.update(payload), decipher.final()])
}

/**
 * Decrypts all object values (base64 strings).
 * Returns object with decrypted values (utf8 strings).
 */
export function decryptObject(obj: StringMap<Base64String>, secretKeyBuffer: Buffer): StringMap {
  const { key, iv } = getCryptoParams(secretKeyBuffer)

  const r: StringMap = {}
  _stringMapEntries(obj).forEach(([k, v]) => {
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    r[k] = decipher.update(v, 'base64', 'utf8') + decipher.final('utf8')
  })
  return r
}

/**
 * Encrypts all object values (utf8 strings).
 * Returns object with encrypted values (base64 strings).
 */
export function encryptObject(obj: StringMap, secretKeyBuffer: Buffer): StringMap<Base64String> {
  const { key, iv } = getCryptoParams(secretKeyBuffer)

  const r: StringMap = {}
  _stringMapEntries(obj).forEach(([k, v]) => {
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    r[k] = cipher.update(v, 'utf8', 'base64') + cipher.final('base64')
  })
  return r
}

/**
 * Using aes-256-cbc.
 *
 * Input is base64 string.
 * Output is utf8 string.
 */
export function decryptString(str: Base64String, secretKeyBuffer: Buffer): string {
  const { key, iv } = getCryptoParams(secretKeyBuffer)
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  return decipher.update(str, 'base64', 'utf8') + decipher.final('utf8')
}

/**
 * Using aes-256-cbc.
 *
 * Input is utf8 string.
 * Output is base64 string.
 */
export function encryptString(str: string, secretKeyBuffer: Buffer): Base64String {
  const { key, iv } = getCryptoParams(secretKeyBuffer)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  return cipher.update(str, 'utf8', 'base64') + cipher.final('base64')
}

function getCryptoParams(secretKeyBuffer: Buffer): { key: Buffer; iv: Buffer } {
  const key = sha256AsBuffer(secretKeyBuffer)
  const iv = md5AsBuffer(Buffer.concat([secretKeyBuffer, key]))
  return { key, iv }
}

/**
 * Wraps `crypto.timingSafeEqual` and allows it to be used with String inputs:
 *
 * 1. Does length check first and short-circuits on length mismatch. Because `crypto.timingSafeEqual` only works with same-length inputs.
 *
 * Relevant read:
 * https://medium.com/nerd-for-tech/checking-api-key-without-shooting-yourself-in-the-foot-javascript-nodejs-f271e47bb428
 * https://codahale.com/a-lesson-in-timing-attacks/
 * https://github.com/suryagh/tsscmp/blob/master/lib/index.js
 *
 * Returns true if inputs are equal, false otherwise.
 */
export function timingSafeStringEqual(s1: string | undefined, s2: string | undefined): boolean {
  if (s1 === undefined || s2 === undefined || s1.length !== s2.length) return false
  return crypto.timingSafeEqual(Buffer.from(s1), Buffer.from(s2))
}
