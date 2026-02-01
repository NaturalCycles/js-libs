import { FieldPath } from '@google-cloud/firestore'
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
    q = q.where(mapName(f.name), OP_MAP[f.op] || (f.op as WhereFilterOp), f.val)
  }

  // order
  for (const ord of dbQuery._orders) {
    q = q.orderBy(mapName(ord.name), ord.descending ? 'desc' : 'asc')
  }

  // limit
  q = q.limit(dbQuery._limitValue)

  // selectedFields
  if (dbQuery._selectedFieldNames) {
    // id is filtered out, because in Firestore it's not a "property",
    // and doc.id is always returned, even if we request empty set of fields
    q = q.select(...(dbQuery._selectedFieldNames as string[]).filter(n => n !== 'id'))
  }

  // cursor
  if (dbQuery._startCursor) {
    // Using `startAfter`, not `startAt` here
    // Why?
    // Because in Firestore, you can only retrieve "last document id" to be used as Cursor.
    // That document was already retrieved, so it makes sense to start AFTER it.
    q = q.startAfter(dbQuery._startCursor)
  }

  if (dbQuery._endCursor) {
    q = q.endAt(dbQuery._endCursor)
  }

  return q
}

function mapName<ROW extends ObjectWithId>(name: keyof ROW): string | FieldPath {
  if (name === 'id') return FieldPath.documentId()
  return name as string
}
