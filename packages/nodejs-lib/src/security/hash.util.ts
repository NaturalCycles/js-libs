import type { BinaryToTextEncoding } from 'node:crypto'
import { hash as cryptoHash } from 'node:crypto'
import type { Base64String, Base64UrlString } from '@naturalcycles/js-lib/types'

export function md5(s: string | Buffer, outputEncoding: BinaryToTextEncoding = 'hex'): string {
  return hash(s, 'md5', outputEncoding)
}

export function md5AsBuffer(s: string | Buffer): Buffer {
  return hashAsBuffer(s, 'md5')
}

export function sha256(s: string | Buffer, outputEncoding: BinaryToTextEncoding = 'hex'): string {
  return hash(s, 'sha256', outputEncoding)
}

export function sha256AsBuffer(s: string | Buffer): Buffer {
  return hashAsBuffer(s, 'sha256')
}

export function hash(
  s: string | Buffer,
  algorithm: string,
  outputEncoding: BinaryToTextEncoding = 'hex',
): string {
  return cryptoHash(algorithm, s, outputEncoding)
}

export function hashAsBuffer(s: string | Buffer, algorithm: string): Buffer {
  return cryptoHash(algorithm, s, 'buffer')
}

export function base64(s: string | Buffer): Base64String {
  return (typeof s === 'string' ? Buffer.from(s) : s).toString('base64')
}

export function base64Url(s: string | Buffer): Base64UrlString {
  return (typeof s === 'string' ? Buffer.from(s) : s).toString('base64url')
}

export function base64ToString(strBase64: Base64String): string {
  return Buffer.from(strBase64, 'base64').toString('utf8')
}

export function base64UrlToString(strBase64Url: Base64UrlString): string {
  return Buffer.from(strBase64Url, 'base64url').toString('utf8')
}

export function base64ToBuffer(strBase64: Base64String): Buffer {
  return Buffer.from(strBase64, 'base64')
}

export function base64UrlToBuffer(strBase64Url: Base64UrlString): Buffer {
  return Buffer.from(strBase64Url, 'base64url')
}

export function stringToBase64(s: string): Base64String {
  return Buffer.from(s, 'utf8').toString('base64')
}

export function stringToBase64Url(s: string): Base64UrlString {
  return Buffer.from(s, 'utf8').toString('base64url')
}

export function bufferToBase64(b: Buffer): Base64String {
  return b.toString('base64')
}

export function bufferToBase64Url(b: Buffer): Base64UrlString {
  return b.toString('base64url')
}
