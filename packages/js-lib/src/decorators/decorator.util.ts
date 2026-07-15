import type { AnyObject, InstanceId } from '../types.js'

/**
 * Generic override of TypeScript's built-in legacy MethodDecorator, that
 * allows us to infer the parameters of the decorated method from the parameters
 * of a decorator.
 */
export type MethodDecorator<T> = (
  target: AnyObject,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T> | undefined

/**
 * @returns
 * e.g `NameOfYourClass.methodName`
 * or `NameOfYourClass(instanceId).methodName`
 */
export function _getMethodSignature(ctx: any, keyStr: string): string {
  const { instanceId } = ctx as InstanceId
  return `${ctx.constructor.name}${instanceId ? `#${instanceId}` : ''}.${keyStr}`
}

/**
 * @returns `NameOfYourClass.methodName`
 */
export function _getTargetMethodSignature(target: AnyObject, keyStr: string): string {
  return `${target.constructor.name}.${keyStr}`
}

/**
 * @example
 * e.g for method (a: string, b: string, c: string)
 * returns:
 * a, b, c
 */
export function _getArgsSignature(args: any[] = [], logArgs = true): string {
  if (!logArgs) return ''

  return args
    .map(arg => {
      const s = arg && typeof arg === 'object' ? JSON.stringify(arg) : String(arg)

      return s.length > 30 ? '...' : s
    })
    .join(', ')
}
