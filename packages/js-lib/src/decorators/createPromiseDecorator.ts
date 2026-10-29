import { _getTargetMethodSignature } from './decorator.util.js'

export interface PromiseDecoratorCfg<RES = any, PARAMS = any> {
  decoratorName: string

  /**
   * Called BEFORE the original function.
   * If Promise is returned - it will be awaited.
   */
  beforeFn?: (r: PromiseDecoratorResp<PARAMS>) => void | Promise<void>

  /**
   * Called just AFTER the original function.
   * The output of this hook will be passed further,
   * so, pay attention to pass through (or modify) the result.
   */
  thenFn?: (r: PromiseDecoratorResp<PARAMS> & { res: RES }) => RES

  /**
   * Called on Promise.reject.
   * If `catchFn` is not present - will re-throw the error,
   * which will most likely be "unhandledRejection" (unless there's another higher-level @Decorator that will catch it).
   * If `catchFn` is present - it's responsible for handling or re-throwing the error.
   * Whatever `catchFn` returns - passed to the original output.
   * If Promise is returned - it will be awaited.
   */
  catchFn?: (r: PromiseDecoratorResp<PARAMS> & { err: any }) => RES | Promise<RES>

  /**
   * Fires AFTER thenFn / catchFn, like a usual Promise.finally().
   * Doesn't have access to neither res nor err (same as Promise.finally).
   */
  finallyFn?: (r: PromiseDecoratorResp<PARAMS>) => any
}

export interface PromiseDecoratorResp<PARAMS> {
  decoratorParams: PARAMS
  args: any[]
  started: number
  target: any
  key: string
  decoratorName: string
}

/**
 * @example
 * // decorators.ts
 * export const BlockingLoader = () => _createPromiseDecorator({
 *   decoratorName: 'BlockingLoader',
 *   beforeFn: () => store.commit('setBlockingLoader'),
 *   finallyFn: () => store.commit('setBlockingLoader', false),
 * })
 *
 * @experimental
 */

export function _createPromiseDecorator<RES = any, PARAMS = any>(
  cfg: PromiseDecoratorCfg<RES, PARAMS>,
  decoratorParams: PARAMS = {} as any,
): MethodDecorator {
  const { decoratorName } = cfg

  return function decoratorFunction(
    target: any,
    propertyKey: string | symbol,
    pd: PropertyDescriptor,
  ): PropertyDescriptor {
    // console.log(`@Decorator.${cfg.decoratorName} called: ` + propertyKey, pd, target)
    const originalMethod = pd.value
    const key = String(propertyKey)
    const methodSignature = _getTargetMethodSignature(target, key)

    pd.value = async function (this: typeof target, ...args: any[]): Promise<any> {
      // console.log(`@${cfg.decoratorName} called inside function`)
      const started = Date.now()

      try {
        // Before function
        // console.log(`@${cfg.decoratorName} Before`)
        if (cfg.beforeFn) {
          await cfg.beforeFn({
            decoratorParams,
            args,
            key,
            target,
            decoratorName,
            started,
          })
        }

        // Original function
        let res = await originalMethod.apply(this, args)

        // console.log(`${cfg.decoratorName} After`)
        const resp: PromiseDecoratorResp<PARAMS> = {
          decoratorParams,
          args,
          key,
          target,
          decoratorName,
          started,
        }

        if (cfg.thenFn) {
          res = cfg.thenFn({
            ...resp,
            res,
          })
        }

        cfg.finallyFn?.(resp)

        return res
      } catch (err) {
        console.error(`@${decoratorName} ${methodSignature} catch:`, err)

        const resp: PromiseDecoratorResp<PARAMS> = {
          decoratorParams,
          args,
          key,
          target,
          decoratorName,
          started,
        }

        if (!cfg.catchFn) {
          cfg.finallyFn?.(resp)
          throw err // rethrow
        }

        try {
          return await cfg.catchFn({
            ...resp,
            err,
          })
        } finally {
          cfg.finallyFn?.(resp)
        }
      }
    }

    return pd
  }
}
