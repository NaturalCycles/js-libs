import type { AppError } from '../error/error.util.js'

/**
 * Function returns a tuple of [err, output].
 *
 * If ERR is returned, it indicates that validation has failed.
 * If ERR is null - validation has succeeded.
 *
 * Regardless of the Error, ValidationFunction always returns the output item.
 *
 * Output item may be transformed or not, depending on the implementation.
 *
 * ValidationFunction may mutate the input item or not,
 * depending on the implementation.
 *
 * @experimental
 */
export type ValidationFunction<T, ERR extends AppError> = (
  input: T,
  opt?: ValidationFunctionOptions,
) => ValidationFunctionResult<T, ERR>

export type ValidationFunctionResult<T, ERR extends AppError> = [err: ERR | null, output: T]

export interface ValidationFunctionOptions {
  /**
   * E.g User
   * Used for error message printing.
   */
  inputName?: string
  /**
   * E.g `12345678` (user id).
   * Used for error message printing.
   */
  inputId?: string
}
