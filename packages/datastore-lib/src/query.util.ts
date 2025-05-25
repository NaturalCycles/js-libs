import type { PropertyFilter, Query } from '@google-cloud/datastore'
import type { DBQuery, DBQueryFilterOperator } from '@naturalcycles/db-lib'
import type { ObjectWithId, StringMap } from '@naturalcycles/js-lib'

const FNAME_MAP: StringMap = {
  id: '__key__',
}

const OP_MAP: Partial<Record<DBQueryFilterOperator, string>> = {
  '==': '=',
  in: 'IN',
  'not-in': 'NOT_IN',
}

export function dbQueryToDatastoreQuery<ROW extends ObjectWithId>(
  dbQuery: Readonly<DBQuery<ROW>>,
  emptyQuery: Query,
  propertyFilterClass: typeof PropertyFilter,
): Query {
  let q = emptyQuery

  // filter
  for (const f of dbQuery._filters) {
    // keeping "previous syntax" commented out
    // (q, f) => q.filter(f.name as string, OP_MAP[f.op] || (f.op as any), f.val),

    // Datastore doesn't allow `undefined` as filter value.
    // We don't want to throw on it, so instead we'll replace it with valid value of `null`.
    // `a > null` will return anything that's indexed
    // `a < null` should return nothing
    // `a == null` will return just that - rows with null values
    let { op, val } = f
    if (val === undefined) val = null
    q = q.filter(new propertyFilterClass(f.name as string, OP_MAP[op] || (op as any), val))
  }

  // limit
  q = q.limit(dbQuery._limitValue || 0)

  // order
  for (const ord of dbQuery._orders) {
    q = q.order(ord.name as string, { descending: ord.descending })
  }

  // select
  if (dbQuery._selectedFieldNames) {
    const fields = (dbQuery._selectedFieldNames as string[]).map(f => FNAME_MAP[f] || f)

    // Datastore requires you to specify at least one column, so if empty array is passed - it'll include __key__ at least
    if (!fields.length) {
      fields.push('__key__')
    }

    q = q.select(fields)
  }

  // cursor
  if (dbQuery._startCursor) {
    q = q.start(dbQuery._startCursor)
  }

  if (dbQuery._endCursor) {
    q = q.end(dbQuery._endCursor)
  }

  return q
}
