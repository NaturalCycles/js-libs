import type { CommonLogFunction } from '@naturalcycles/js-lib/log'
import { commonLoggerNoop } from '@naturalcycles/js-lib/log'
import type {
  AnyObject,
  AnyObjectWithId,
  BaseDBEntity,
  ObjectWithId,
} from '@naturalcycles/js-lib/types'
import { describe, expect, it, vi } from 'vitest'
import { CommonDao } from '../../commondao/common.dao.js'
import { InMemoryDB } from '../../inmemory/inMemory.db.js'
import { DBQuery } from '../../query/dbQuery.js'
import { runCommonDaoTest, runCommonDBTest } from '../../testing/index.js'
import { CacheDB } from './cache.db.js'
import type { CacheDBCfg } from './cache.db.model.js'

const downstreamDB = new InMemoryDB()
const cacheDB = new InMemoryDB()
const db = new CacheDB({
  createCacheDB: () => cacheDB,
  downstreamDB,
  logCached: true,
  logDownstream: true,
})

describe('runCommonDBTest', async () => {
  await runCommonDBTest(db)
})

describe('runCommonDaoTest', async () => {
  await runCommonDaoTest(db)
})

describe('without createCacheDB (NoopDB)', async () => {
  const noopCacheDB = new CacheDB({ downstreamDB: new InMemoryDB() })

  describe('runCommonDBTest', async () => {
    await runCommonDBTest(noopCacheDB)
  })

  describe('runCommonDaoTest', async () => {
    await runCommonDaoTest(noopCacheDB)
  })
})

it('should take dbType and support from downstreamDB', () => {
  const downstreamDB = new InMemoryDB()
  const db = new CacheDB({ downstreamDB })
  expect(db.support).toEqual(downstreamDB.support)
  expect(db.dbType).toBe(downstreamDB.dbType)
})

it('should serve cached rows and read only the missing ids from downstream', async () => {
  const { db, cacheDB } = await setup({
    downstream: [
      { id: 'a', v: 'downstream' },
      { id: 'b', v: 'downstream' },
    ],
    cache: [{ id: 'a', v: 'cache' }],
  })

  const rows = await db.getByIds('Table', ['a', 'b'])

  expect(rows).toEqual([
    { id: 'a', v: 'cache' },
    { id: 'b', v: 'downstream' },
  ])
  expect(cacheDB.data['Table']).toEqual({
    a: { id: 'a', v: 'cache' },
    b: { id: 'b', v: 'downstream' },
  })
})

it.each([{ cfgSkipCache: true }, { optSkipCache: true }])(
  'should read from downstream and not populate the cache with skipCache: %o',
  async ({ cfgSkipCache, optSkipCache }) => {
    const { db, cacheDB } = await setup({
      downstream: [
        { id: 'a', v: 'downstream' },
        { id: 'b', v: 'downstream' },
      ],
      cache: [{ id: 'a', v: 'cache' }],
      cfg: { skipCache: cfgSkipCache },
    })

    const rows = await db.getByIds('Table', ['a', 'b'], { skipCache: optSkipCache })
    const rowsByTable = await db.multiGet({ ['Table']: ['a', 'b'] }, { skipCache: optSkipCache })

    const expected = [
      { id: 'a', v: 'downstream' },
      { id: 'b', v: 'downstream' },
    ]
    expect(rows).toEqual(expected)
    expect(rowsByTable).toEqual({ ['Table']: expected })
    expect(cacheDB.data['Table']).toEqual({ a: { id: 'a', v: 'cache' } })
  },
)

it('should read from downstream and not populate the cache when readAt is passed', async () => {
  const { db, cacheDB } = await setup({
    downstream: [
      { id: 'a', v: 'downstream' },
      { id: 'b', v: 'downstream' },
    ],
    cache: [{ id: 'a', v: 'cache' }],
  })

  const rows = await db.getByIds('Table', ['a', 'b'], { readAt: 1 as any })

  expect(rows).toEqual([
    { id: 'a', v: 'downstream' },
    { id: 'b', v: 'downstream' },
  ])
  expect(cacheDB.data['Table']).toEqual({ a: { id: 'a', v: 'cache' } })
})

it('should remove the row from the cache when saving with skipCache', async () => {
  const { db, downstreamDB, cacheDB } = await setup({
    downstream: [
      { id: 'a', v: 'old' },
      { id: 'b', v: 'old' },
    ],
    cache: [
      { id: 'a', v: 'old' },
      { id: 'b', v: 'old' },
    ],
  })

  await db.saveBatch('Table', [{ id: 'a', v: 'new' }], { skipCache: true })

  expect(downstreamDB.data['Table']).toEqual({
    a: { id: 'a', v: 'new' },
    b: { id: 'b', v: 'old' },
  })
  expect(cacheDB.data['Table']).toEqual({ b: { id: 'b', v: 'old' } })
})

it('should save to the cache as upsert regardless of saveMethod', async () => {
  const { db, cacheDB } = await setup({
    downstream: [{ id: 'a', v: 'old' }],
    cache: [{ id: 'b', v: 'old' }],
  })

  await db.saveBatch('Table', [{ id: 'a', v: 'new' }], { saveMethod: 'update' })
  await db.saveBatch('Table', [{ id: 'b', v: 'new' }], { saveMethod: 'insert' })

  expect(cacheDB.data['Table']).toEqual({
    a: { id: 'a', v: 'new' },
    b: { id: 'b', v: 'new' },
  })
})

it('should log and not throw when a not-awaited cache write fails', async () => {
  const logger = { ...commonLoggerNoop, error: vi.fn<CommonLogFunction>() }
  const { db, downstreamDB, cacheDB } = await setup({ cfg: { awaitCache: false, logger } })
  cacheDB.saveBatch = async () => {
    throw new Error('cache down')
  }

  await db.saveBatch('Table', [{ id: 'a', v: 'new' }])

  expect(downstreamDB.data['Table']).toEqual({ a: { id: 'a', v: 'new' } })
  await vi.waitFor(() => {
    expect(logger.error).toHaveBeenCalledWith(
      'CacheDB: cache write failed',
      new Error('cache down'),
    )
  })
})

it('should merge cache and downstream rows in multiGet', async () => {
  const { db, cacheDB } = await setup({
    downstream: [
      { id: 'a', v: 'downstream' },
      { id: 'b', v: 'downstream' },
    ],
    cache: [{ id: 'a', v: 'cache' }],
  })

  const rowsByTable = await db.multiGet({ ['Table']: ['a', 'b'], OtherTable: ['x'] })

  expect(rowsByTable).toEqual({
    ['Table']: [
      { id: 'a', v: 'cache' },
      { id: 'b', v: 'downstream' },
    ],
    OtherTable: [],
  })
  expect(cacheDB.data['Table']).toEqual({
    a: { id: 'a', v: 'cache' },
    b: { id: 'b', v: 'downstream' },
  })
})

it('should update the cache in multiSave and multiDelete', async () => {
  const { db, downstreamDB, cacheDB } = await setup({
    downstream: [
      { id: 'a', v: 'old' },
      { id: 'b', v: 'old' },
    ],
    cache: [
      { id: 'a', v: 'old' },
      { id: 'b', v: 'old' },
    ],
  })

  await db.multiSave({ ['Table']: [{ id: 'a', v: 'new' }] })
  await db.multiDelete({ ['Table']: ['b'] })

  expect(downstreamDB.data['Table']).toEqual({ a: { id: 'a', v: 'new' } })
  expect(cacheDB.data['Table']).toEqual({ a: { id: 'a', v: 'new' } })
})

describe('multi-table operations on the cacheDB', () => {
  it('should call the cacheDB multi-table methods once for all tables', async () => {
    const { db, cacheDB } = await setup({
      downstream: [{ id: 'a', v: 'downstream' }],
      cache: [{ id: 'b', v: 'cache' }],
    })
    const multiGet = vi.spyOn(cacheDB, 'multiGet')
    const multiSave = vi.spyOn(cacheDB, 'multiSave')
    const multiDelete = vi.spyOn(cacheDB, 'multiDelete')

    const rowsByTable = await db.multiGet({ Table: ['a', 'b'], OtherTable: ['x'] })
    await db.multiSave({ Table: [{ id: 'c', v: 'new' }], OtherTable: [{ id: 'x', v: 'new' }] })
    await db.multiDelete({ Table: ['b'], OtherTable: ['x'] })

    expect(rowsByTable).toEqual({
      Table: [
        { id: 'a', v: 'downstream' },
        { id: 'b', v: 'cache' },
      ],
      OtherTable: [],
    })
    expect(cacheDB.data['Table']).toEqual({
      a: { id: 'a', v: 'downstream' },
      c: { id: 'c', v: 'new' },
    })
    expect(cacheDB.data['OtherTable']).toEqual({})
    const savedRowsByTable = multiSave.mock.calls.map(([rowsByTable]) => rowsByTable)
    expect(savedRowsByTable).toEqual([
      { Table: [{ id: 'c', v: 'new' }], OtherTable: [{ id: 'x', v: 'new' }] },
    ])
    expect(multiGet).toHaveBeenCalledExactlyOnceWith({ Table: ['a', 'b'], OtherTable: ['x'] })
    expect(multiDelete).toHaveBeenCalledExactlyOnceWith({ Table: ['b'], OtherTable: ['x'] })
  })

  it('should call the cacheDB single-table methods when the cacheDB has no multiTableOperations', async () => {
    const { db, cacheDB } = await setup({
      downstream: [{ id: 'a', v: 'downstream' }],
      cache: [{ id: 'b', v: 'cache' }],
    })
    cacheDB.support = { ...cacheDB.support, multiTableOperations: false }
    const multiGet = vi.spyOn(cacheDB, 'multiGet')
    const multiSave = vi.spyOn(cacheDB, 'multiSave')
    const multiDelete = vi.spyOn(cacheDB, 'multiDelete')

    const rowsByTable = await db.multiGet({ Table: ['a', 'b'], OtherTable: ['x'] })
    await db.multiSave({ Table: [{ id: 'c', v: 'new' }], OtherTable: [{ id: 'x', v: 'new' }] })
    await db.multiDelete({ Table: ['b'], OtherTable: ['x'] })

    expect(rowsByTable).toEqual({
      Table: [
        { id: 'a', v: 'downstream' },
        { id: 'b', v: 'cache' },
      ],
      OtherTable: [],
    })
    expect(cacheDB.data['Table']).toEqual({
      a: { id: 'a', v: 'downstream' },
      c: { id: 'c', v: 'new' },
    })
    expect(cacheDB.data['OtherTable']).toEqual({})
    expect(multiGet).not.toHaveBeenCalled()
    expect(multiSave).not.toHaveBeenCalled()
    expect(multiDelete).not.toHaveBeenCalled()
  })
})

it('should remove the cached rows on patchById and incrementBatch', async () => {
  const { db, downstreamDB, cacheDB } = await setup({
    downstream: [
      { id: 'a', v: 'old' },
      { id: 'b', v: 'old', n: 1 },
      { id: 'c', v: 'old' },
    ],
    cache: [
      { id: 'a', v: 'old' },
      { id: 'b', v: 'old', n: 1 },
      { id: 'c', v: 'old' },
    ],
  })

  await db.patchById<Row>('Table', 'a', { v: 'patched' })
  await db.incrementBatch('Table', 'n', { b: 1 })

  expect(downstreamDB.data['Table']).toEqual({
    a: { id: 'a', v: 'patched' },
    b: { id: 'b', v: 'old', n: 2 },
    c: { id: 'c', v: 'old' },
  })
  expect(cacheDB.data['Table']).toEqual({ c: { id: 'c', v: 'old' } })
})

it.each([
  { op: 'patchByQuery', write: (db: CacheDB, q: DBQuery<Row>) => db.patchByQuery(q, { v: 'x' }) },
  { op: 'deleteByQuery', write: (db: CacheDB, q: DBQuery<Row>) => db.deleteByQuery(q) },
])('should remove all rows of the table from the cache on $op', async ({ write }) => {
  const { db, cacheDB } = await setup({
    downstream: [
      { id: 'a', v: 'new' },
      { id: 'b', v: 'old' },
    ],
    cache: [
      { id: 'a', v: 'old' },
      { id: 'b', v: 'old' },
    ],
  })

  await write(db, DBQuery.create<Row>('Table').filterEq('v', 'new'))

  expect(cacheDB.data['Table']).toEqual({})
})

it('should throw when onlyCache and skipCache are both set in cfg', () => {
  const cfg = {
    downstreamDB: new InMemoryDB(),
    onlyCache: true,
    skipCache: true,
  }

  expect(() => new CacheDB(cfg)).toThrow('CacheDB: onlyCache and skipCache are both set')
})

it.each([
  { cfg: {}, opt: { onlyCache: true, skipCache: true } },
  { cfg: { onlyCache: true }, opt: { skipCache: true } },
  { cfg: { skipCache: true }, opt: { onlyCache: true } },
])('should throw when onlyCache and skipCache are both set with cfg: %o', async ({ cfg, opt }) => {
  const { db } = await setup({ cfg })
  const error = 'CacheDB: onlyCache and skipCache are both set'

  const getByIds = db.getByIds('Table', ['a'], opt)
  await expect(getByIds).rejects.toThrow(error)

  const saveBatch = db.saveBatch('Table', [{ id: 'a', v: 'new' }], opt)
  await expect(saveBatch).rejects.toThrow(error)
})

describe('transactions', () => {
  it('should read from downstream and not populate the cache in a transaction', async () => {
    const { db, cacheDB } = await setup({
      downstream: [
        { id: 'a', v: 'downstream' },
        { id: 'b', v: 'downstream' },
      ],
      cache: [{ id: 'a', v: 'cache' }],
    })

    let rows: Row[] = []
    await db.runInTransaction(async tx => {
      rows = await tx.getByIds<Row>('Table', ['a', 'b'])
    })

    expect(rows).toEqual([
      { id: 'a', v: 'downstream' },
      { id: 'b', v: 'downstream' },
    ])
    expect(cacheDB.data['Table']).toEqual({ a: { id: 'a', v: 'cache' } })
  })

  it('should remove written rows from the cache and commit in runInTransaction', async () => {
    const { db, downstreamDB, cacheDB } = await setup({
      downstream: [
        { id: 'a', v: 'old' },
        { id: 'b', v: 'old' },
        { id: 'c', v: 'old' },
      ],
      cache: [
        { id: 'a', v: 'old' },
        { id: 'b', v: 'old' },
        { id: 'c', v: 'old' },
      ],
    })

    await db.runInTransaction(async tx => {
      await tx.saveBatch('Table', [{ id: 'a', v: 'tx' }])
      await tx.deleteByIds('Table', ['b'])
      expect(cacheDB.data['Table']).toEqual({ c: { id: 'c', v: 'old' } })
    })

    expect(downstreamDB.data['Table']).toEqual({
      a: { id: 'a', v: 'tx' },
      c: { id: 'c', v: 'old' },
    })
    expect(cacheDB.data['Table']).toEqual({ c: { id: 'c', v: 'old' } })
  })

  it('should remove written rows from the cache and keep downstream on rollback', async () => {
    const { db, downstreamDB, cacheDB } = await setup({
      downstream: [
        { id: 'a', v: 'old' },
        { id: 'b', v: 'old' },
      ],
      cache: [
        { id: 'a', v: 'old' },
        { id: 'b', v: 'old' },
      ],
    })

    const transaction = db.runInTransaction(async tx => {
      await tx.saveBatch('Table', [{ id: 'a', v: 'tx' }])
      throw new Error('fail')
    })

    await expect(transaction).rejects.toThrow('fail')
    expect(downstreamDB.data['Table']).toEqual({
      a: { id: 'a', v: 'old' },
      b: { id: 'b', v: 'old' },
    })
    expect(cacheDB.data['Table']).toEqual({ b: { id: 'b', v: 'old' } })
  })

  it('should remove rows that were cached during the transaction after commit', async () => {
    const { db, cacheDB } = await setup({ downstream: [{ id: 'a', v: 'old' }] })

    const tx = await db.createTransaction()
    await tx.saveBatch('Table', [{ id: 'a', v: 'tx' }])
    const rowsBeforeCommit = await db.getByIds('Table', ['a'])

    expect(rowsBeforeCommit).toEqual([{ id: 'a', v: 'old' }])
    expect(cacheDB.data['Table']).toEqual({ a: { id: 'a', v: 'old' } })

    await tx.commit()

    expect(cacheDB.data['Table']).toEqual({})

    const rowsAfterCommit = await db.getByIds('Table', ['a'])

    expect(rowsAfterCommit).toEqual([{ id: 'a', v: 'tx' }])
  })

  it('should remove the whole table from the cache after commit when a query wrote in the transaction', async () => {
    const { db, cacheDB } = await setup({
      downstream: [
        { id: 'a', v: 'old' },
        { id: 'b', v: 'old' },
      ],
    })

    const tx = await db.createTransaction()
    await db.deleteByQuery(DBQuery.create<Row>('Table').filterEq('id', 'b'), { tx })
    await db.getByIds('Table', ['a'])

    expect(cacheDB.data['Table']).toEqual({ a: { id: 'a', v: 'old' } })

    await tx.commit()

    expect(cacheDB.data['Table']).toEqual({})
  })

  it('should route CommonDao transaction operations through the downstream transaction', async () => {
    const { db, downstreamDB, cacheDB } = await setup({
      downstream: [
        { id: 'a', v: 'old' },
        { id: 'b', v: 'old' },
        { id: 'c', v: 'old' },
      ],
      cache: [
        { id: 'a', v: 'old' },
        { id: 'b', v: 'old' },
        { id: 'c', v: 'old' },
      ],
    })
    const dao = new CommonDao<Row & BaseDBEntity>({ table: 'Table', db })

    await dao.runInTransaction(async tx => {
      const a = await tx.getById(dao, 'a')
      await tx.save(dao, { ...a!, v: 'tx' })
      await tx.deleteById(dao, 'b')
    })

    expect(downstreamDB.data['Table']).toEqual({
      a: expect.objectContaining({ id: 'a', v: 'tx' }),
      c: { id: 'c', v: 'old' },
    })
    expect(cacheDB.data['Table']).toEqual({ c: { id: 'c', v: 'old' } })
  })

  it('should throw when opt.tx is not a transaction of this CacheDB', async () => {
    const { db, downstreamDB } = await setup()
    const downstreamTx = await downstreamDB.createTransaction()
    const otherCacheDBTx = await new CacheDB({
      downstreamDB,
    }).createTransaction()
    const error = 'opt.tx is not a transaction of this CacheDB'

    for (const tx of [downstreamTx, otherCacheDBTx]) {
      await expect(db.getByIds('Table', ['a'], { tx })).rejects.toThrow(error)
      await expect(db.saveBatch('Table', [{ id: 'a', v: 'tx' }], { tx })).rejects.toThrow(error)
      await expect(db.runQuery(DBQuery.create('Table'), { tx })).rejects.toThrow(error)
    }
  })
})

describe('cache fill', () => {
  it('should not cache the rows of runQuery', async () => {
    const { db, cacheDB } = await setup({ downstream: [{ id: 'a', v: 'downstream' }] })

    const { rows } = await db.runQuery(DBQuery.create<Row>('Table'))

    expect(rows).toEqual([{ id: 'a', v: 'downstream' }])
    expect(cacheDB.data['Table']).toEqual({})
  })

  it('should not overwrite a row that was saved while the downstream read was running', async () => {
    const { db, downstreamDB, cacheDB } = await setup({ downstream: [{ id: 'a', v: 'old' }] })
    const getByIds = downstreamDB.getByIds.bind(downstreamDB)
    vi.spyOn(downstreamDB, 'getByIds').mockImplementationOnce(async (table, ids) => {
      const rows = await getByIds(table, ids)
      await db.saveBatch(table, [{ id: 'a', v: 'new' }])
      return rows
    })

    const rows = await db.getByIds('Table', ['a'])

    expect(rows).toEqual([{ id: 'a', v: 'old' }])
    expect(cacheDB.data['Table']).toEqual({ a: { id: 'a', v: 'new' } })
  })

  it('should not cache a row that was deleted while the downstream read was running', async () => {
    const { db, downstreamDB, cacheDB } = await setup({ downstream: [{ id: 'a', v: 'old' }] })
    const getByIds = downstreamDB.getByIds.bind(downstreamDB)
    vi.spyOn(downstreamDB, 'getByIds').mockImplementationOnce(async (table, ids) => {
      const rows = await getByIds(table, ids)
      await db.deleteByIds(table, ['a'])
      return rows
    })

    await db.getByIds('Table', ['a'])

    expect(cacheDB.data['Table']).toEqual({})
  })

  it('should not cache rows when a query patched the table while the downstream read was running', async () => {
    const { db, downstreamDB, cacheDB } = await setup({
      downstream: [
        { id: 'a', v: 'old' },
        { id: 'b', v: 'old' },
      ],
    })
    const getByIds = downstreamDB.getByIds.bind(downstreamDB)
    vi.spyOn(downstreamDB, 'getByIds').mockImplementationOnce(async (table, ids) => {
      const rows = await getByIds(table, ids)
      await db.patchByQuery(DBQuery.create<Row>(table).filterEq('id', 'b'), { v: 'patched' })
      return rows
    })

    await db.getByIds('Table', ['a'])

    expect(cacheDB.data['Table']).toEqual({})
  })

  it('should not cache a row that a transaction wrote while the downstream read was running', async () => {
    const { db, downstreamDB, cacheDB } = await setup({ downstream: [{ id: 'a', v: 'old' }] })
    const getByIds = downstreamDB.getByIds.bind(downstreamDB)
    vi.spyOn(downstreamDB, 'getByIds').mockImplementationOnce(async (table, ids) => {
      const rows = await getByIds(table, ids)
      await db.runInTransaction(async tx => {
        await tx.saveBatch(table, [{ id: 'a', v: 'tx' }])
      })
      return rows
    })

    await db.getByIds('Table', ['a'])

    expect(downstreamDB.data['Table']).toEqual({ a: { id: 'a', v: 'tx' } })
    expect(cacheDB.data['Table']).toEqual({})
  })

  it('should skip the fill only for the tables that changed while the downstream multiGet was running', async () => {
    const { db, downstreamDB, cacheDB } = await setup({ downstream: [{ id: 'a', v: 'old' }] })
    await downstreamDB.saveBatch('OtherTable', [{ id: 'x', v: 'old' }])
    const multiGet = downstreamDB.multiGet.bind(downstreamDB)
    vi.spyOn(downstreamDB, 'multiGet').mockImplementationOnce(async idsByTable => {
      const rowsByTable = await multiGet(idsByTable)
      await db.deleteByIds('OtherTable', ['x'])
      return rowsByTable
    })

    await db.multiGet({ Table: ['a'], OtherTable: ['x'] })

    expect(cacheDB.data['Table']).toEqual({ a: { id: 'a', v: 'old' } })
    expect(cacheDB.data['OtherTable']).toBeUndefined()
  })
})

describe('cache scope', () => {
  it('should keep a separate cache for each scope and no cache without a scope', async () => {
    const downstreamDB = new InMemoryDB()
    await downstreamDB.saveBatch('Table', [{ id: 'a', v: 'downstream' }])
    let scope: AnyObject | undefined = {}
    const db = new CacheDB({
      downstreamDB,
      createCacheDB: () => new InMemoryDB(),
      getCacheScope: () => scope,
      awaitCache: true,
    })
    const downstreamGetByIds = vi.spyOn(downstreamDB, 'getByIds')

    await db.getByIds('Table', ['a'])
    await db.getByIds('Table', ['a'])
    scope = {}
    await db.getByIds('Table', ['a'])
    scope = undefined
    await db.getByIds('Table', ['a'])
    await db.getByIds('Table', ['a'])

    expect(downstreamGetByIds).toHaveBeenCalledTimes(4)
  })

  it('should not skip the save after read because of a write in another scope', async () => {
    const firstScope = {}
    let scope = firstScope
    const db = new CacheDB({
      downstreamDB: new InMemoryDB(),
      createCacheDB: () => new InMemoryDB(),
      getCacheScope: () => scope,
      awaitCache: true,
    })

    const token = db.getSaveAfterReadToken(['Table'])
    scope = {}
    await db.saveBatch('Table', [{ id: 'b', v: 'other' }])
    scope = firstScope
    await db.saveAfterRead({ Table: [{ id: 'a', v: 'old' }] }, token)

    const rows = await db.getByIds('Table', ['a'], { onlyCache: true })
    expect(rows).toEqual([{ id: 'a', v: 'old' }])
  })

  it('should return copies of the cached rows', async () => {
    const { db } = await setup({ cache: [{ id: 'a', v: 'cache' }] })

    const [first] = await db.getByIds<Row>('Table', ['a'])
    first!.v = 'changed'
    const rows = await db.getByIds('Table', ['a'])

    expect(rows).toEqual([{ id: 'a', v: 'cache' }])
  })

  it('should share the __compressed Buffer and copy the other Buffers of the cached rows', async () => {
    const cachedRow = { id: 'a', v: 'cache', __compressed: Buffer.from('c'), b: Buffer.from('b') }
    const { db, cacheDB } = await setup({ cache: [cachedRow] })
    const storedRow = cacheDB.data['Table']!['a']!

    const [row] = await db.getByIds<AnyObjectWithId>('Table', ['a'])

    expect(row!['__compressed']).toBe(storedRow['__compressed'])
    expect(row!['b']).not.toBe(storedRow['b'])
    expect(row!['b']).toEqual(Buffer.from('b'))
  })
})

interface Row extends ObjectWithId {
  v: string
  n?: number
}

async function setup(
  input: { downstream?: Row[]; cache?: Row[]; cfg?: Partial<CacheDBCfg> } = {},
): Promise<{ db: CacheDB; downstreamDB: InMemoryDB; cacheDB: InMemoryDB }> {
  const downstreamDB = new InMemoryDB()
  const cacheDB = new InMemoryDB()
  await downstreamDB.saveBatch('Table', input.downstream || [])
  await cacheDB.saveBatch('Table', input.cache || [])
  const db = new CacheDB({
    downstreamDB,
    createCacheDB: () => cacheDB,
    awaitCache: true,
    ...input.cfg,
  })
  return { db, downstreamDB, cacheDB }
}
