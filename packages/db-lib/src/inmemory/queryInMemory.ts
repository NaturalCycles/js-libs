import { _get, _pick } from '@naturalcycles/js-lib/object/object.util.js'
import type { ObjectWithId } from '@naturalcycles/js-lib/types'
import type { DBQuery, DBQueryFilterOperator } from '../query/dbQuery.js'

type FilterFn = (v: any, val: any) => boolean
const FILTER_FNS: Record<DBQueryFilterOperator, FilterFn> = {
  '==': (v, val) => v === val,
  '!=': (v, val) => v !== val,
  '<': (v, val) => v < val,
  '<=': (v, val) => v <= val,
  '>': (v, val) => v > val,
  '>=': (v, val) => v >= val,
  in: (v, val?: any[]) => (val || []).includes(v),
  'not-in': (v, val?: any[]) => !(val || []).includes(v),
  'array-contains': (v?: any[], val?: any) => (v || []).includes(val),
  'array-contains-any': (v?: any[], val?: any[]) =>
    (v && val && v.some(item => val.includes(item))) || false,
}

// Important: q.table is not used in this function, so tablesPrefix is not needed.
// But should be careful here..
export function queryInMemory<ROW extends ObjectWithId>(q: DBQuery<ROW>, rows: ROW[] = []): ROW[] {
  // .filter
  // eslint-disable-next-line unicorn/no-array-reduce
  rows = q._filters.reduce((rows, filter) => {
    return rows.filter(row => {
      const value = _get(row, filter.name as string)
      return FILTER_FNS[filter.op](value, filter.val)
    })
  }, rows)

  // .select(fieldNames)
  if (q._selectedFieldNames) {
    rows = rows.map(row => _pick(row, q._selectedFieldNames as any[]))
  }

  // todo: only one order is supported (first)
  const [order] = q._orders
  if (order) {
    const { name, descending } = order
    rows = rows.sort((a, b) => {
      // biome-ignore lint/suspicious/noDoubleEquals: ok
      if (a[name] == b[name]) return 0

      if (descending) {
        return a[name] < b[name] ? 1 : -1
      }
      return a[name] > b[name] ? 1 : -1
    })
  }

  // .offset()
  if (q._offsetValue) {
    rows = rows.slice(q._offsetValue)
  }

  // .limit()
  if (q._limitValue) {
    rows = rows.slice(0, Math.min(q._limitValue, rows.length))
  }

  return rows
}
