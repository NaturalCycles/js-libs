import type { AsyncPredicate } from '../types.js'

export async function pFilter<T>(iterable: Iterable<T>, filterFn: AsyncPredicate<T>): Promise<T[]> {
  const items = Array.from(iterable)
  const predicates = await Promise.all(items.map((item, i) => filterFn(item, i)))
  return items.filter((_item, i) => predicates[i])
}
