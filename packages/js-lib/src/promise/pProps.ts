/**
 * Promise.all for Object instead of Array.
 *
 * Inspired by Bluebird Promise.props() and https://github.com/sindresorhus/p-props
 *
 * Improvements:
 *
 * - Exported as { pProps }, so IDE auto-completion works
 * - Simpler: no support for Map, Mapper, Options
 * - Included Typescript typings (no need for @types/p-props)
 *
 * Concurrency implementation via pMap was removed in favor of preserving async
 * stack traces (more important!).
 */
export async function pProps<T>(input: { [K in keyof T]: T[K] | Promise<T[K]> }): Promise<{
  [K in keyof T]: Awaited<T[K]>
}> {
  const keys = Object.keys(input)
  return Object.fromEntries((await Promise.all(Object.values(input))).map((v, i) => [keys[i], v]))
}
