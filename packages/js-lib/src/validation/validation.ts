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

export type ValidationFunction2<IN, OUT, ERR extends AppError> = (
  input: IN,
  opt?: ValidationFunctionOptions,
) => ValidationFunctionResult<OUT, ERR>

export type ValidationFunctionResult2<OUT, ERR extends AppError> = [err: ERR | null, output: OUT]

export interface ValidationFunctionOptions {
  /**
   * Defaults to undefined.
   *
   * Undefined means that it's up for the underlying validation library (implementation)
   * to mutate or not.
   * E.g joi and zod would deep-clone, while ajv would mutate.
   *
   * False means that the ValidationFunction IS NOT ALLOWED to mutate the input.
   * If set to true - the ValidationFunction HAS TO mutate the input
   * if it needs to apply transformations, such as:
   * - stripping unknown properties
   * - converting types (e.g. string to number)
   * - applying transformations (which as string trim, toLowerCase, etc)
   */
  mutateInput?: boolean
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
