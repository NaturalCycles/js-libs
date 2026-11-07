import { getFetcher } from '@naturalcycles/js-lib/http'
import type { Fetcher } from '@naturalcycles/js-lib/http'
import type { AnyObject } from '@naturalcycles/js-lib/types'

export interface AirtableApi {
  base: (baseId: string) => AirtableApiBase
}

export type AirtableApiBase = <T extends AnyObject>(tableName: string) => AirtableApiTable<T>

export interface AirtableApiTable<T extends AnyObject> {
  select: (selectOpts?: AirtableApiSelectOpts<T>) => AirtableApiQuery<T>

  find: (airtableId: string) => Promise<AirtableApiRecord<T>>

  create: (record: Partial<T>) => Promise<AirtableApiRecord<T>>

  update: (airtableId: string, patch: Partial<T>) => Promise<AirtableApiRecord<T>>

  replace: (airtableId: string, patch: Partial<T>) => Promise<AirtableApiRecord<T>>

  destroy: (airtableId: string) => Promise<AirtableApiDeletedRecord>
}

export interface AirtableApiSelectOpts<T extends AnyObject> {
  pageSize?: number
  fields?: (keyof T)[]
  maxRecords?: number
  view?: string
  sort?: AirtableApiSort<T>[]

  /**
   * https://support.airtable.com/hc/en-us/articles/203255215-Formula-Field-Reference
   */
  filterByFormula?: string
}

export interface AirtableApiSort<T extends AnyObject = any> {
  field: keyof T

  /**
   * @default 'asc'
   */
  direction?: 'asc' | 'desc'
}

export interface AirtableApiQuery<T extends AnyObject> {
  all: () => Promise<AirtableApiRecord<T>[]>
}

/**
 * Record as returned by the Airtable REST API.
 */
export interface AirtableApiRecord<T extends AnyObject> {
  id: string
  createdTime: string
  fields: T
}

export interface AirtableApiDeletedRecord {
  id: string
  deleted: boolean
}

interface AirtableApiListResponse<T extends AnyObject> {
  records: AirtableApiRecord<T>[]
  /**
   * Present when there are more pages.
   */
  offset?: string
}

export interface AirtableApiCfg {
  apiKey: string

  /**
   * Per request attempt, in milliseconds.
   *
   * @default 40_000
   */
  requestTimeout?: number
}

/**
 * Minimal client for the Airtable REST API, covering what this library uses.
 *
 * https://airtable.com/developers/web/api/introduction
 */
export function createAirtableApi(cfg: AirtableApiCfg): AirtableApi {
  const { apiKey, requestTimeout = 40_000 } = cfg

  const fetcher = getFetcher({
    baseUrl: 'https://api.airtable.com/v0',
    headers: {
      authorization: `Bearer ${apiKey}`,
    },
    timeoutSeconds: requestTimeout / 1000,
    // Airtable answers 429 above 5 requests/second per base, and then rejects all requests for 30 seconds
    retry: {
      count: 5,
      timeout: 5000,
      timeoutMax: 60_000,
    },
    retryPost: true,
    hooks: {
      beforeRetry: [
        res => {
          // Creating a record is the only non-idempotent request, retry it only when Airtable rejected it
          const isCreate =
            res.req.init.method === 'POST' && !res.req.fullUrl.endsWith('/listRecords')
          if (isCreate && res.fetchResponse?.status !== 429) {
            res.retryStatus.retryStopped = true
          }
        },
      ],
    },
  })

  return {
    base:
      baseId =>
      <T extends AnyObject>(tableName: string) =>
        createAirtableApiTable<T>(fetcher, `${baseId}/${encodeURIComponent(tableName)}`),
  }
}

function createAirtableApiTable<T extends AnyObject>(
  fetcher: Fetcher,
  tablePath: string,
): AirtableApiTable<T> {
  return {
    select: (selectOpts = {}) => ({
      all: async () => await listAllRecords<T>(fetcher, tablePath, selectOpts),
    }),
    find: async airtableId => await fetcher.get(`${tablePath}/${airtableId}`),
    create: async record => await fetcher.post(tablePath, { json: { fields: record } }),
    update: async (airtableId, patch) =>
      await fetcher.patch(`${tablePath}/${airtableId}`, { json: { fields: patch } }),
    replace: async (airtableId, patch) =>
      await fetcher.put(`${tablePath}/${airtableId}`, { json: { fields: patch } }),
    destroy: async airtableId => await fetcher.delete(`${tablePath}/${airtableId}`),
  }
}

/**
 * Uses the POST variant of "list records", which takes the options as a JSON body, so a long
 * `filterByFormula` (e.g. `getByIds`) can't hit the 16 KB URL limit of the GET variant.
 */
async function listAllRecords<T extends AnyObject>(
  fetcher: Fetcher,
  tablePath: string,
  selectOpts: AirtableApiSelectOpts<T>,
): Promise<AirtableApiRecord<T>[]> {
  const records: AirtableApiRecord<T>[] = []
  let offset: string | undefined

  do {
    const page = await fetcher.post<AirtableApiListResponse<T>>(`${tablePath}/listRecords`, {
      json: { ...selectOpts, offset },
    })
    records.push(...page.records)
    offset = page.offset
  } while (offset)

  return records
}
