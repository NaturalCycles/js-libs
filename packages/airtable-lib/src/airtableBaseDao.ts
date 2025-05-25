import type { AnyObject, InstanceId, StringMap, UnixTimestamp } from '@naturalcycles/js-lib'
import { _assert, _LogMethod, _omit, localTime } from '@naturalcycles/js-lib'
import { md5 } from '@naturalcycles/nodejs-lib'
import type {
  AirtableBaseDaoCfg,
  AirtableConnector,
  AirtableDaoOptions,
  AirtableDaoSaveOptions,
  AirtableRecord,
} from './airtable.model.js'
import { sortAirtableBase } from './airtable.util.js'

/**
 * Holds cache of Airtable Base (all tables, all records, indexed by `airtableId` for quick access).
 * Base is sorted (deterministic order of tables and record keys).
 * Order of rows is preserved as is.
 * Provides API to access records.
 * Provides API to fetch or upload records via provided Connectors (e.g Json, Remote).
 */
export class AirtableBaseDao<BASE extends AnyObject = any> implements InstanceId {
  constructor(public cfg: AirtableBaseDaoCfg<BASE>) {
    this.connectorMap = new Map<symbol, AirtableConnector<BASE>>()
    this.lastFetchedMap = new Map<symbol, UnixTimestamp | undefined>()

    cfg.connectors.forEach(c => {
      this.connectorMap.set(c.TYPE, c)
      this.lastFetchedMap.set(c.TYPE, undefined)
    })

    this.instanceId = this.cfg.baseName
  }

  private connectorMap!: Map<symbol, AirtableConnector<BASE>>

  instanceId!: string

  /**
   * Unix timestamp of when this Base was last fetched (for given Connector).
   */
  lastFetchedMap!: Map<symbol, UnixTimestamp | undefined>

  /**
   * Unix timestamp of when the cache of this Base was last changed. Initially `undefined`.
   */
  lastChanged?: UnixTimestamp

  /**
   * Push to this array to add a listener, it'll be fired every time Cache is changed
   * (including when it's set to `undefined`, including the very first fetch).
   */
  cacheUpdatedListeners: ((base: BASE | undefined) => void)[] = []

  private _cache?: BASE

  /**
   * Deterministic hash of BASE content. Should NOT change if content is the same, should change otherwise.
   * `undefined` for empty BASE.
   * Used to detect change of content and fire `cacheUpdated$` when changed.
   */
  private contentHash?: string

  /**
   * Map from airtableId to Record
   */
  private _airtableIdIndex?: StringMap<AirtableRecord>

  /**
   * _tableIdIndex[tableName][id]
   * where id is defined by idField property
   */
  private _tableIdIndex?: StringMap<StringMap<AirtableRecord>>

  /**
   * Only defined while loading data.
   * It exists to be able to return the same promise while loading data,
   * to avoid issuing multiple requests to the connector.
   * Upon completion it's set back to undefined.
   */
  private loadingDataPromise?: Promise<BASE>

  async getCache(): Promise<BASE> {
    if (!this._cache) {
      if (this.loadingDataPromise) return await this.loadingDataPromise
      this.loadingDataPromise = this.getConnector(this.cfg.primaryConnector).fetch(this.cfg)

      const base = await this.loadingDataPromise
      this.setCache(base, {
        preserveLastChanged: true,
      })
      this.loadingDataPromise = undefined
    }

    return this._cache!
  }

  getCacheSync(): BASE {
    _assert(this._cache, `getCacheSync is called, but cache was not preloaded`)
    return this._cache
  }

  setCache(cache?: BASE, opt: AirtableDaoOptions = {}): void {
    if (!cache) {
      console.warn(`AirtableBaseDao.${this.instanceId} setCache to undefined`)
      this._cache = undefined
      this._airtableIdIndex = undefined
      this.contentHash = undefined
      this.cacheUpdatedListeners.forEach(fn => fn(undefined))
      return
    }

    cache = sortAirtableBase(cache)
    const newContentHash = md5(JSON.stringify(cache))

    if (newContentHash === this.contentHash) {
      console.log(
        `AirtableBaseDao.${this.instanceId} setCache: contentHash unchanged (${newContentHash})`,
      )
      return
    }

    const cacheWasDefined = !!this._cache
    this._cache = cache
    this.contentHash = newContentHash

    // Index cache
    const airtableIndex: StringMap<AirtableRecord> = {}

    Object.values(this._cache).forEach((records: AirtableRecord[]) => {
      records.forEach(r => (airtableIndex[r.airtableId] = r))
    })

    this._airtableIdIndex = airtableIndex

    // TableIdIndex
    const tableIdIndex: StringMap<StringMap<AirtableRecord>> = {}
    Object.entries(this.cfg.tableCfgMap).forEach(([tableName, cfg]) => {
      const { idField } = cfg
      tableIdIndex[tableName] = {}
      ;(this._cache![tableName] || []).forEach(
        (r: AirtableRecord) => (tableIdIndex[tableName]![r[idField as keyof AirtableRecord]] = r),
      )
    })

    this._tableIdIndex = tableIdIndex

    // Update
    if (!opt.preserveLastChanged && cacheWasDefined) {
      this.lastChanged = localTime.nowUnix()
    }
    this.cacheUpdatedListeners.forEach(fn => fn(this._cache))
  }

  private async getAirtableIndex(): Promise<StringMap<AirtableRecord>> {
    if (!this._airtableIdIndex) {
      await this.getCache()
    }

    return this._airtableIdIndex!
  }

  private async getTableIdIndex(): Promise<StringMap<StringMap<AirtableRecord>>> {
    if (!this._tableIdIndex) {
      await this.getCache()
    }

    return this._tableIdIndex!
  }

  async getTableRecords<TABLE_NAME extends keyof BASE>(
    tableName: TABLE_NAME,
    noAirtableIds = false,
  ): Promise<BASE[TABLE_NAME]> {
    const base = (await this.getCache())[tableName] as any

    if (noAirtableIds && base) {
      return base.map((r: AirtableRecord) => _omit(r, ['airtableId']))
    }

    return base || []
  }

  async getById<T extends AirtableRecord>(table: string, id?: string): Promise<T | undefined> {
    return (await this.getTableIdIndex())[table]?.[id!] as T
  }

  async getByIds<T extends AirtableRecord>(table: string, ids: string[]): Promise<T[]> {
    const index = (await this.getTableIdIndex())[table]

    return ids.map(id => index?.[id]) as T[]
  }

  async requireById<T extends AirtableRecord>(table: string, id: string): Promise<T | undefined> {
    const r = (await this.getTableIdIndex())[table]?.[id] as T
    if (!r) {
      throw new Error(`requireById ${this.cfg.baseName}.${table}.${id} not found`)
    }
    return r
  }

  async requireByIds<T extends AirtableRecord>(table: string, ids: string[]): Promise<T[]> {
    const index = (await this.getTableIdIndex())[table]

    return ids.map(id => {
      const r = index?.[id] as T
      if (!r) {
        throw new Error(`requireByIds ${this.cfg.baseName}.${table}.${id} not found`)
      }
      return r
    })
  }

  async getByAirtableId<T extends AirtableRecord>(airtableId?: string): Promise<T | undefined> {
    return (await this.getAirtableIndex())[airtableId!] as T | undefined
  }

  async requireByAirtableId<T extends AirtableRecord>(airtableId: string): Promise<T> {
    const r = (await this.getAirtableIndex())[airtableId] as T | undefined
    if (!r) {
      throw new Error(`requireByAirtableId ${this.cfg.baseName}.${airtableId} not found`)
    }
    return r
  }

  async getByAirtableIds<T extends AirtableRecord>(airtableIds: string[] = []): Promise<T[]> {
    const index = await this.getAirtableIndex()
    return airtableIds.map(id => index[id]) as T[]
  }

  async requireByAirtableIds<T extends AirtableRecord>(airtableIds: string[] = []): Promise<T[]> {
    const index = await this.getAirtableIndex()

    return airtableIds.map(id => {
      const r = index[id]
      if (!r) {
        throw new Error(`requireByAirtableIds ${this.cfg.baseName}.${id} not found`)
      }
      return r
    }) as T[]
  }

  private getConnector(connectorType: symbol): AirtableConnector<BASE> {
    const connector = this.connectorMap.get(connectorType)
    if (!connector) {
      throw new Error(`Connector not found by type: ${String(connectorType)}`)
    }
    return connector
  }

  /**
   * Fetches from Connector.
   *
   * If `opt.cache` is true - saves to cache.
   */
  @_LogMethod({ logStart: true })
  async fetch(connectorType: symbol, opt: AirtableDaoOptions = {}): Promise<BASE> {
    const base = await this.getConnector(connectorType).fetch(this.cfg, opt)

    if (!base) {
      console.warn(`AirtableBaseDao.${this.instanceId}.fetch returned empty base`)
      return undefined as any
    }

    if (opt.noCache) {
      return sortAirtableBase(base)
    }

    if (!opt.preserveLastFetched) {
      this.lastFetchedMap.set(connectorType, localTime.nowUnix())
    }

    this.setCache(base, opt)
    return this._cache!
  }

  @_LogMethod({ logStart: true })
  async upload(connectorType: symbol, opt: AirtableDaoSaveOptions = {}): Promise<void> {
    const base = await this.getCache()
    await this.getConnector(connectorType).upload(base, this.cfg, opt)
  }
}
