import type { ErrorData } from '@naturalcycles/js-lib/error'
import { _assert, _errorDataAppend } from '@naturalcycles/js-lib/error'
import type { AnyObject, JWTString } from '@naturalcycles/js-lib/types'
import type { AnySchema } from 'joi'
import type { Algorithm, JwtHeader, SignOptions, VerifyOptions } from 'jsonwebtoken'
import jsonwebtoken from 'jsonwebtoken'
import { anyObjectSchema } from '../validation/joi/joi.shared.schemas.js'
import { validate } from '../validation/joi/joi.validation.util.js'
export { jsonwebtoken }
export type { Algorithm, JwtHeader, SignOptions, VerifyOptions }

export interface JWTServiceCfg {
  /**
   * Public key is required to Verify incoming tokens.
   * Optional if you only want to Decode or Sign.
   */
  publicKey?: string | Buffer
  /**
   * Private key is required to Sign (create) outgoing tokens.
   * Optional if you only want to Decode or Verify.
   */
  privateKey?: string | Buffer

  /**
   * Recommended: ES256
   * Keys (private/public) should be generated using proper settings
   * that fit the used Algorithm.
   */
  algorithm: Algorithm

  /**
   * If provided - will be applied to every Sign operation.
   */
  signOptions?: SignOptions

  /**
   * If provided - will be applied to every Sign operation.
   */
  verifyOptions?: VerifyOptions

  /**
   * If set - errors thrown from this service will be extended
   * with this errorData (in err.data)
   */
  errorData?: ErrorData
}

// todo: define JWTError and list possible options
// jwt expired (TokenExpiredError)
// jwt invalid
// jwt token is empty

/**
 * Wraps popular `jsonwebtoken` library.
 * You should create one instance of JWTService for each pair of private/public key.
 *
 * Generate key pair like this.
 * Please note that parameters should be different for different algorithms.
 * For ES256 (default algo in JWTService) key should have `prime256v1` parameter:
 *
 * openssl ecparam -name prime256v1 -genkey -noout -out key.pem
 * openssl ec -in key.pem -pubout > key.pub.pem
 */
export class JWTService {
  constructor(public cfg: JWTServiceCfg) {}

  sign<T extends AnyObject>(payload: T, schema?: AnySchema<T>, opt: SignOptions = {}): JWTString {
    _assert(
      this.cfg.privateKey,
      'JWTService: privateKey is required to be able to verify, but not provided',
    )

    if (schema) {
      validate(payload, schema)
    }

    return jsonwebtoken.sign(payload, this.cfg.privateKey, {
      algorithm: this.cfg.algorithm,
      noTimestamp: true,
      ...this.cfg.signOptions,
      ...opt,
    })
  }

  verify<T extends AnyObject>(
    token: JWTString,
    schema?: AnySchema<T>,
    opt: VerifyOptions = {},
    publicKey?: string, // allows to override public key
  ): T {
    _assert(
      this.cfg.publicKey,
      'JWTService: publicKey is required to be able to verify, but not provided',
    )

    try {
      const data = jsonwebtoken.verify(token, publicKey || this.cfg.publicKey, {
        algorithms: [this.cfg.algorithm],
        ...this.cfg.verifyOptions,
        ...opt,
      }) as T

      if (schema) {
        validate(data, schema)
      }

      return data
    } catch (err) {
      if (this.cfg.errorData) {
        _errorDataAppend(err, {
          ...this.cfg.errorData,
        })
      }
      throw err
    }
  }

  decode<T extends AnyObject>(
    token: JWTString,
    schema?: AnySchema<T>,
  ): {
    header: JwtHeader
    payload: T
    signature: string
  } {
    const data = jsonwebtoken.decode(token, {
      complete: true,
    }) as {
      header: JwtHeader
      payload: T
      signature: string
    } | null

    _assert(data?.payload, 'invalid token, decoded value is empty', {
      ...this.cfg.errorData,
    })

    validate(data.payload, schema || anyObjectSchema)

    return data
  }
}
