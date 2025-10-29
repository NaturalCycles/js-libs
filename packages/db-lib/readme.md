## @naturalcycles/db-lib

> Lowest Common Denominator API to supported Databases

[![npm](https://img.shields.io/npm/v/@naturalcycles/db-lib/latest.svg)](https://www.npmjs.com/package/@naturalcycles/db-lib)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![loc](https://badgen.net/codeclimate/loc/NaturalCycles/db-lib)](https://github.com/NaturalCycles/db-lib)
[![Actions](https://github.com/NaturalCycles/db-lib/workflows/ci/badge.svg)](https://github.com/NaturalCycles/db-lib/actions)

Defines 3 things:

- `CommonDB` interface
- `CommonDao` class
- `DBQuery` class

CommonDB serves as a Lowest Commond Denominator between different DB implementations (see further).
So you can use same syntax, e.g `getById<DBM>(id: string): Promise<DBM | undefined>` across
different DBs.

`DBQuery` allows to use the same _query syntax_ across different DBs! E.g:

```typescript
const q = DBQuery.create('table1')
  .filterEq('type', 'cat')
  .filter('updated', '>', '2019-01-17')
  .order('name', true)

await db.runQuery(q)
```

So, you can run it against Datastore, Firestore, Redis, MongoDB, Airtable, etc. Different DBs, same
syntax!

You can swap DB implementations without changing your application code. Migrate Datastore to
Firestore? Easy.

You can test your code against `InMemoryDB` (that implements full `CommonDB` interface, even with
querying, streaming, etc). So, your unit tests can use exactly same querying syntax, or even exactly
same services, DAOs. Just swap real DB with `InMemoryDB` in your `setupJest.ts` (for example).

# Supported databases

- [x] InMemoryDB (with optional file persistence, Redis-like; implemented in this package)
- [x] [datastore-lib](https://github.com/NaturalCycles/datastore-lib) (GCP Datastore, or Firestore
      in Datastore mode)
- [x] [firestore-lib](https://github.com/NaturalCycles/firestore-lib) (Firestore in Native mode)
- [x] [mysql-lib](https://github.com/NaturalCycles/mysql-lib) (MySQL)
- [x] [redis-lib](https://github.com/NaturalCycles/redis-lib) (Redis)
- [x] [mongo-lib](https://github.com/NaturalCycles/mongo-lib) (MongoDB)
- [x] [airtable-lib](https://github.com/NaturalCycles/airtable-lib) (Airtable)
- [x] HttpDB (CommonDB exposed via REST API, implemented in
      [backend-lib](https://github.com/NaturalCycles/backend-lib))
- [x] [spreadsheet-lib](https://github.com/NaturalCycles/spreadsheet-lib) "Google Spreadsheets as a
      Database"
- [x] [github-db](https://github.com/NaturalCycles/github-db) "github branch as a Database"
- [x] [sqlite-lib](https://github.com/NaturalCycles/sqlite-lib) SqliteDB (in progress),
      SqliteKeyValueDB (done)

# Features

- CommonDB, CommonDao, DBQuery
- Streaming (Node.js streams with backpressure)
- DBM / BM, validation, conversion (Joi-powered)
- Conventions
  - String `id`s
  - `created`, `updated` (unix timestamps)
  - Dates as ISO strings, e.g `2019-06-21`
  - Timestamps as unixtimestamps (seconds, not milliseconds; UTC)
  - Complex objects as JSON serialized to string (DBM), converted to object (BM)

# Concept

CommonDB is a low-level API (no high-level sugar-syntax). CommonDao is the opposite - a high-level
API (with convenience methods), built on top of CommonDB.

Concerns of CommonDB:

- Access to DB (all tables): CRUD (create, read, update, delete)
- Batch methods (cause they can be more optimal if implemented "natively")
- Querying
- Streaming

Concerns of CommonDao:

- Access to one DB Table ("kind")
- Transformation between DBM and BM, validation/conversion
- Auto-generating `id`, `created`, `updated` fields
- Anonymization hook to be able to plug your implementation (privacy by design)

# CommonDB API

- [ping](#ping)
- [getByIds](#getbyids)
- [runQuery](#runquery)
- [runQueryCount](#runquerycount)
- [streamQuery](#streamquery)
- [saveBatch](#savebatch)
- [deleteByIds](#deletebyids)
- [deleteByQuery](#deletebyquery)
- [getTables](#gettables)
- [getTableSchema](#gettableschema)
- [createTable](#createtable)

###### ping

`ping(): Promise<void>`

Call this to check that DB connection, credentials, configuration is working. Should throw an error
if any of above is invalid.

###### getByIds

`getByIds<DBM>(table: string, ids: string[]): Promise<DBM[]>`

```typescript
await db.getByIds('table1', ['id1, 'id2'])
// [ { id: 'id1', ... }, { id: 'id2', ... } ]
```

Should return items in the same order as ids in the input.

Only returns items that are found, does not return undefined (absent) items.

###### runQuery

`runQuery<DBM>(q: DBQuery<DBM>): Promise<RunQueryResult<DBM>>`

```typescript
const q = DBQuery.create('table1').filterEq('type', 'cat').order('name', true) // desc

await db.runQuery(q)
// { records: [ { ... }, { ... }, ... ] }
```

###### runQueryCount

`runQueryCount(q: DBQuery): Promise<number>`

```typescript
await db.runQuery(DBQuery.create('table1'))
// 5
```

###### streamQuery

`streamQuery<DBM>(q: DBQuery<DBM>): ReadableTyped<DBM>`

Returns `ReadableTyped` (typed wrapper of Node.js
[Readable](https://nodejs.org/api/stream.html#stream_class_stream_readable)).

Streams in Node.js support back-pressure by default (if piped properly by the consumer).

```ts
const q = DBQuery.create('table1') // "return all items" query

await _pipeline([
  db.streamQuery(q),
  writableForEach(item => {
    console.log(item)
  }),
])

// { item1 }
// { item2 }
// ...
```

Alternative:

```ts
await db.streamQuery(q).forEach(item => {
  console.log(item)
})
```

###### saveBatch

`saveBatch<DBM>(table: string, dbms: DBM[]): Promise<void>`

Since CommonDB is a "minimal API", there's no save method for a single item, only for multiple. Pass
an array with single item to save just one item.

```typescript
const items = [
  { item1 },
  { item2 },
]

await db.saveBatch('table1', items) // returns void
await db.runQuery(DBQuery.create('table1') // "get all" query
// [ { item1 }, { item2 } ]
```

###### deleteByIds

`deleteByIds(table: string, ids: string[]): Promise<number>`

Returns number of deleted items (not all CommonDB implementations support that).

```typescript
await db.deleteByIds('table1', ['id1', 'id2'])
// 2
```

###### deleteByQuery

`deleteByQuery(q: DBQuery): Promise<number>`

Returns number of deleted items.

```typescript
await db.deleteByQuery(DBQuery.create('table1'))
// 2
```

###### getTables

`getTables(): Promise<string[]>`

```typescript
await db.getTables()
// [ 'table1', 'table2' ]
```

###### getTableSchema

`getTableSchema(table: string): Promise<JsonSchemaObject>`

```typescript
await db.getTableSchema('table1')
```

Returns a JsonSchema, generated from the table.

###### createTable

`createTable(table: string, schema: JsonSchemaObject): Promise<void>`

Applicable to Relational DBs, like MySQL. Will invoke smth like `create table Table1 ... ;`. Takes a
`JsonSchema` as an argument.

# DBQuery

Object that defines "DB Query".

```typescript
// Simplest query - "get all" query
DBQuery.create('table1')

// where type = "cat"
DBQuery.create('table1').filter('type', '==', 'cat')

// OR
DBQuery.create('table1').filterEq('type', 'cat')

// Where updated > 2019-01-17
DBQuery.create('table1').filter('updated', '>', '2019-01-17')

// order by 'name'
DBQuery.create('table1').filter('updated', '>', '2019-01-17').order('name')

// order by 'name' in descending order
DBQuery.create('table1').filter('updated', '>', '2019-01-17').order('name', true)
```

Features:

###### .filter(key: string, operator: Operator, value: any)

```typescript
.filter('updatedDate', '>', '2019-01-17')
```

###### .filterEq(key: string, value: any)

```typescript
.filterEq('updated', true)
```

###### .order(key: string, descending: boolean = false)

```typescript
.order('updated') // asc
.order('updated', true) // desc
```

###### .limit(lim: number)

```typescript
.limit(1000)
.limit(0) // no limit
```

###### .select(fields: string[])

Allows "projection queries" - queries that return subset of fields. Like `select a,b,c from Table`
in SQL, as opposed to `select * from Table`.

Passing empty array will actually return an array of empty objects (documented edge case).

```typescript
.select([]) // returns [ {}, {}, {} ]
.select(['id']) //=> [ { id: 'id1' }, { id: 'id2' }, ... ]
```

# Exports

- `/` root
- `/adapter/file`
- `/adapter/cachedb`
- `/testing`
  - dbTest
  - daoTest
  - Test models, utils, etc
- `/validation`
  - Joi validation schemas for DBQuery, CommonDBOptions, CommonSchema, etc
