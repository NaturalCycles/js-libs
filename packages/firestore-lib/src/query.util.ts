import { FieldPath, Timestamp } from '@google-cloud/firestore'
import type { Query, WhereFilterOp } from '@google-cloud/firestore'
import type { CommonDBReadOptions, DBQuery, DBQueryFilterOperator } from '@naturalcycles/db-lib'
import { _round } from '@naturalcycles/js-lib'
import type { ObjectWithId } from '@naturalcycles/js-lib/types'

export function readAtToReadTime(opt: CommonDBReadOptions): Timestamp | undefined {
  if (!opt.readAt) return

  // Same logic as Datastore: round to whole minutes, guard against future
  let readTimeMs = _round(opt.readAt, 60) * 1000
  if (readTimeMs >= Date.now() - 1000) {
    readTimeMs -= 60_000
  }

  return Timestamp.fromMillis(readTimeMs)
}

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
