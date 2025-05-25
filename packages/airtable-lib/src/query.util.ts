import type { DBQuery, DBQueryFilterOperator } from '@naturalcycles/db-lib'
import type { ObjectWithId } from '@naturalcycles/js-lib'
import { _uniq } from '@naturalcycles/js-lib'
import type { AirtableApiSelectOpts } from './airtable.api.js'
import type { AirtableDBOptions } from './airtableDB.js'

const OP_MAP: Partial<Record<DBQueryFilterOperator, string>> = {
  '==': '=',
}

/**
 * https://support.airtable.com/hc/en-us/articles/203255215-Formula-Field-Reference
 */
export function dbQueryToAirtableSelectOptions<ROW extends ObjectWithId>(
  q: DBQuery<ROW>,
  opt: AirtableDBOptions,
): AirtableApiSelectOpts<ROW> {
  const o: AirtableApiSelectOpts<ROW> = {}

  // filter
  if (q._filters.length) {
    const tokens = q._filters.map(f => {
      if (f.op === 'in') {
        const pairs = (f.val as any[]).map(v => `{${f.name as string}}="${v}"`)
        return `OR(${pairs.join(',')})`
      }

      let v: any
      if (typeof f.val === 'boolean') {
        if (f.val) {
          v = 'TRUE()'
        } else {
          return `OR({${String(f.name)}}=FALSE(),{${String(f.name)}}=BLANK())`
        }
      } else {
        v = `"${f.val}"`
      }

      const op = OP_MAP[f.op] || f.op

      return `{${String(f.name)}}${op}${v}`
    })

    o.filterByFormula = `AND(${tokens.join(',')})`
  }

  // limit
  if (q._limitValue) {
    o.maxRecords = q._limitValue
  }

  // order
  if (q._orders.length) {
    o.sort = q._orders.map(o => ({
      field: o.name,
      direction: o.descending ? 'desc' : 'asc',
    }))
  }

  // select
  if (q._selectedFieldNames) {
    const { idField = 'id' } = opt

    // idField must be always included, to be able to "filter empty rows" (by checking if id is empty or not)
    o.fields = _uniq([idField, ...q._selectedFieldNames]) as (keyof ROW)[]
  }

  return o
}
