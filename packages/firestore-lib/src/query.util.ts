import type { Query, WhereFilterOp } from '@google-cloud/firestore'
import type { DBQuery, DBQueryFilterOperator } from '@naturalcycles/db-lib'
import type { ObjectWithId } from '@naturalcycles/js-lib/types'

// Map DBQueryFilterOp to WhereFilterOp
// Currently it's fully aligned!
const OP_MAP: Partial<Record<DBQueryFilterOperator, WhereFilterOp>> = {
  // '=': '==',
  // in: 'array-contains',
}

export function dbQueryToFirestoreQuery<ROW extends ObjectWithId>(
  dbQuery: DBQuery<ROW>,
  emptyQuery: Query,
): Query {
  // filter
  // eslint-disable-next-line unicorn/no-array-reduce
  let q = dbQuery._filters.reduce((q, f) => {
    return q.where(f.name as string, OP_MAP[f.op] || (f.op as WhereFilterOp), f.val)
  }, emptyQuery)

  // order
  // eslint-disable-next-line unicorn/no-array-reduce
  q = dbQuery._orders.reduce((q, ord) => {
    return q.orderBy(ord.name as string, ord.descending ? 'desc' : 'asc')
  }, q)

  // limit
  q = q.limit(dbQuery._limitValue)

  // selectedFields
  if (dbQuery._selectedFieldNames) {
    // todo: check if at least id / __key__ is required to be set
    q = q.select(...(dbQuery._selectedFieldNames as string[]))
  }

  return q
}
