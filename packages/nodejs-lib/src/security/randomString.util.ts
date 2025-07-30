import { nanoIdCustomAlphabet } from './nanoid.js'

export const BASE62_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
export const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export class RandomString {
  private constructor() {}

  static BASE62_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  static BASE62_REGEX = /^[A-Za-z0-9]+$/

  static BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  static BASE64_REGEX = /^[A-Za-z0-9+/]+$/

  static BASE64_URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  static BASE64_URL_REGEX = /^[A-Za-z0-9-_]+$/

  static NON_AMBIGUOUS_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  static NON_AMBIGUOUS_REGEX = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/

  /**
   * Generate cryptographically-secure string id.
   * Powered by `nanoid`.
   */
  static generate(alphabet: string, length: number): string {
    return nanoIdCustomAlphabet(alphabet, length)()
  }

  /**
   * Generate a string using BASE62 alphabet with default length of 16.
   * Powered by `nanoid`.
   */
  static base62(length = 16): string {
    // TODO: length is non-configurable in `id.util.ts` - maybe for a reason?
    return this.generate(this.BASE62_ALPHABET, length)
  }

  /**
   * Generate a string using BASE64 alphabet with default length of 16.
   *
   * Length should be dividable by 4 (otherwise unexpected length will be produced).
   * Dividable by 4 lengths produce ids with no padding `=` characters, which is optimal.
   */
  static base64(length = 16): string {
    return this.generate(this.BASE64_ALPHABET, length)
    // TODO: `id.util.ts` uses `randomBytes` for Base64 generation - maybe for a reason?
    // return randomBytes(length * 0.75).toString('base64')
  }

  /**
   * Generate a string using BASE64 URL alphabet with default length of 16.
   *
   * Length should be dividable by 4 (otherwise unexpected length will be produced).
   * Base64url always produces strings without a padding character `=`, by design.
   */
  static base64Url(length = 16): string {
    return this.generate(this.BASE64_URL_ALPHABET, length)
  }

  /**
   * Generate cryptographically-secure string id with non-ambiguous characters only,
   * e.g. missing O and 0, I and 1 and l etc.
   *
   * Default length is 16.
   */
  static nonAmbiguous(length = 16): string {
    return this.generate(this.NON_AMBIGUOUS_ALPHABET, length)
  }
}
