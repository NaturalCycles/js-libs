import type { AppError } from '../error/index.js'
import type { ErrorDataTuple } from '../types.js'

/**
 * Item to be validated.
 * Can be null or undefined, which allows validation function to produce an error,
 * if undefined/null are not accepted. But they might be accepted too, it depends
 * on the schema (implementation detail of the ValidationFunction).
 *
 * Function returns a tuple of [err, item].
 * In case of error it will be [err, null].
 * In case of success it is [null, item].
 *
 * ValidationFunction may mutate the input item or not,
 * depending on the implementation.
 *
 * @experimental
 */
export type ValidationFunction<T, ERR extends AppError> = (
  item: T | null | undefined,
  opt?: ValidationFunctionOptions,
) => ErrorDataTuple<T, ERR>

export interface ValidationFunctionOptions {
  /**
   * E.g User
   * Used for error message printing.
   */
  itemName?: string
  /**
   * E.g `12345678` (user id).
   * Used for error message printing.
   */
  itemId?: string
}
