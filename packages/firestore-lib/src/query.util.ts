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
  let q = emptyQuery

  // filter
  for (const f of dbQuery._filters) {
    q = q.where(f.name as string, OP_MAP[f.op] || (f.op as WhereFilterOp), f.val)
  }

  // order
  for (const ord of dbQuery._orders) {
    q = q.orderBy(ord.name as string, ord.descending ? 'desc' : 'asc')
  }

  // limit
  q = q.limit(dbQuery._limitValue)

  // selectedFields
  if (dbQuery._selectedFieldNames) {
    // todo: check if at least id / __key__ is required to be set
    q = q.select(...(dbQuery._selectedFieldNames as string[]))
  }

  return q
}
