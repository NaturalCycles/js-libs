import type { CommonLogFunction } from '@naturalcycles/js-lib/log'
import { commonLoggerNoop } from '@naturalcycles/js-lib/log'
import type { BaseDBEntity, ObjectWithId } from '@naturalcycles/js-lib/types'
import { describe, expect, it, vi } from 'vitest'
import { CommonDao } from '../../commondao/common.dao.js'
import { InMemoryDB } from '../../inmemory/inMemory.db.js'
import { DBQuery } from '../../query/dbQuery.js'
import { runCommonDaoTest, runCommonDBTest } from '../../testing/index.js'
import { CacheDB } from './cache.db.js'
import type { CacheDBCfg } from './cache.db.model.js'
import { NoopDB } from './noop.db.js'

const downstreamDB = new InMemoryDB()
const cacheDB = new InMemoryDB()
const db = new CacheDB({
  cacheDB,
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

describe('with cacheDB: undefined (NoopDB)', async () => {
  const noopCacheDB = new CacheDB({ downstreamDB: new InMemoryDB(), cacheDB: undefined })

  describe('runCommonDBTest', async () => {
    await runCommonDBTest(noopCacheDB)
  })

  describe('runCommonDaoTest', async () => {
    await runCommonDaoTest(noopCacheDB)
  })
})

it('should use NoopDB and take dbType and support from downstreamDB when cacheDB is undefined', () => {
  const downstreamDB = new InMemoryDB()
  const db = new CacheDB({ downstreamDB, cacheDB: undefined })
  expect(db.cfg.cacheDB).toBeInstanceOf(NoopDB)
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
      { Table: [{ id: 'a', v: 'downstream' }] },
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

it('should remove the cached rows on patchByQuery, patchById and incrementBatch', async () => {
  const { db, downstreamDB, cacheDB } = await setup({
    downstream: [
      { id: 'a', v: 'old' },
      { id: 'b', v: 'old' },
      { id: 'c', v: 'old', n: 1 },
      { id: 'd', v: 'old' },
    ],
    cache: [
      { id: 'a', v: 'old' },
      { id: 'b', v: 'old' },
      { id: 'c', v: 'old', n: 1 },
      { id: 'd', v: 'old' },
    ],
  })

  await db.patchByQuery(DBQuery.create<Row>('Table').filterEq('id', 'a'), { v: 'patched' })
  await db.patchById<Row>('Table', 'b', { v: 'patched' })
  await db.incrementBatch('Table', 'n', { c: 1 })

  expect(downstreamDB.data['Table']).toEqual({
    a: { id: 'a', v: 'patched' },
    b: { id: 'b', v: 'patched' },
    c: { id: 'c', v: 'old', n: 2 },
    d: { id: 'd', v: 'old' },
  })
  expect(cacheDB.data['Table']).toEqual({ d: { id: 'd', v: 'old' } })
})

it('should throw when onlyCache and skipCache are both set in cfg', () => {
  const cfg = {
    downstreamDB: new InMemoryDB(),
    cacheDB: undefined,
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
      cacheDB: undefined,
    }).createTransaction()
    const error = 'opt.tx is not a transaction of this CacheDB'

    for (const tx of [downstreamTx, otherCacheDBTx]) {
      await expect(db.getByIds('Table', ['a'], { tx })).rejects.toThrow(error)
      await expect(db.saveBatch('Table', [{ id: 'a', v: 'tx' }], { tx })).rejects.toThrow(error)
      await expect(db.runQuery(DBQuery.create('Table'), { tx })).rejects.toThrow(error)
    }
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
  const db = new CacheDB({ downstreamDB, cacheDB, awaitCache: true, ...input.cfg })
  return { db, downstreamDB, cacheDB }
}
