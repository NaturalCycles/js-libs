import type { AnyObject, InstanceId } from '../types.js'

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
