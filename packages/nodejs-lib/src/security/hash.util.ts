import type { BinaryToTextEncoding } from 'node:crypto'
import { hash as cryptoHash } from 'node:crypto'
import type { Base64String, Base64UrlString } from '@naturalcycles/js-lib/types'

export function md5(s: string | Uint8Array, outputEncoding: BinaryToTextEncoding = 'hex'): string {
  return hash(s, 'md5', outputEncoding)
}

export function md5AsBuffer(s: string | Uint8Array): Buffer<ArrayBuffer> {
  return hashAsBuffer(s, 'md5')
}

export function sha256(
  s: string | Uint8Array,
  outputEncoding: BinaryToTextEncoding = 'hex',
): string {
  return hash(s, 'sha256', outputEncoding)
}

export function sha256AsBuffer(s: string | Uint8Array): Buffer<ArrayBuffer> {
  return hashAsBuffer(s, 'sha256')
}

export function hash(
  s: string | Uint8Array,
  algorithm: string,
  outputEncoding: BinaryToTextEncoding = 'hex',
): string {
  return cryptoHash(algorithm, s, outputEncoding)
}

export function hashAsBuffer(s: string | Uint8Array, algorithm: string): Buffer<ArrayBuffer> {
  return cryptoHash(algorithm, s, 'buffer')
}

export function base64(s: string | Uint8Array): Base64String {
  if (typeof s === 'string') return Buffer.from(s).toString('base64')
  return bufferToBase64(s)
}

export function base64Url(s: string | Uint8Array): Base64UrlString {
  if (typeof s === 'string') return Buffer.from(s).toString('base64url')
  return bufferToBase64Url(s)
}

export function base64ToString(strBase64: Base64String): string {
  return Buffer.from(strBase64, 'base64').toString('utf8')
}

export function base64UrlToString(strBase64Url: Base64UrlString): string {
  return Buffer.from(strBase64Url, 'base64url').toString('utf8')
}

export function base64ToBuffer(strBase64: Base64String): Buffer<ArrayBuffer> {
  return Buffer.from(strBase64, 'base64')
}

export function base64UrlToBuffer(strBase64Url: Base64UrlString): Buffer<ArrayBuffer> {
  return Buffer.from(strBase64Url, 'base64url')
}

export function stringToBase64(s: string): Base64String {
  return Buffer.from(s, 'utf8').toString('base64')
}

export function stringToBase64Url(s: string): Base64UrlString {
  return Buffer.from(s, 'utf8').toString('base64url')
}

// Buffer#toString is faster than Uint8Array#toBase64 on small inputs (~1.3-1.7x up to ~512 bytes,
// measured on Node 26), hence the Buffer fast-path. On larger inputs they're on par.
export function bufferToBase64(b: Uint8Array): Base64String {
  return Buffer.isBuffer(b) ? b.toString('base64') : b.toBase64()
}

export function bufferToBase64Url(b: Uint8Array): Base64UrlString {
  return Buffer.isBuffer(b)
    ? b.toString('base64url')
    : b.toBase64({ alphabet: 'base64url', omitPadding: true })
}
