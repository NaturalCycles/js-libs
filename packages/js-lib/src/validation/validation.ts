import type { AppError } from '../error/error.util.js'
import type { ErrorDataTuple } from '../types.js'

/**
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
  item: T,
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
