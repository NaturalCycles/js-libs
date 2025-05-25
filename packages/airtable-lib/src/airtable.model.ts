import type { AnySchema, ArraySchema, JoiValidationError } from '@naturalcycles/nodejs-lib'
import {
  arraySchema,
  integerSchema,
  objectSchema,
  stringSchema,
  urlSchema,
} from '@naturalcycles/nodejs-lib'
import type { AirtableApiSort } from './airtable.api.js'

export enum AirtableErrorCode {
  AIRTABLE_ERROR = 'AIRTABLE_ERROR',
}

// biome-ignore lint/correctness/noUnusedVariables: ok
export type AirtableId<T = any> = string

export const airtableIdSchema = stringSchema // todo: apply certain restrictions

export const airtableMultipleLinkSchema = <T>(): ArraySchema<AirtableId<T>[]> =>
  arraySchema<AirtableId<T>>(airtableIdSchema).optional().default([])

export const airtableSingleLinkSchema = <T>(): ArraySchema<AirtableId<T>[]> =>
  airtableMultipleLinkSchema<T>().max(1)

/* Example:

  "filename": "nc_product_landscape_4_1200_6243.jpg",
  "id": "attmPr95JznHLp4UY",
  "size": 152338,
  "thumbnails": {
    "full": {
      "height": 583,
      "url": "https://dl.airtable.com/Umt8YV0wSNCZzVG4nGEh_full_nc_product_landscape_4_1200_6243.jpg",
      "width": 932
    },
    "large": {
      "height": 512,
      "url": "https://dl.airtable.com/VuG1E7mRyTlK3ZQFzQKg_large_nc_product_landscape_4_1200_6243.jpg",
      "width": 818
    },
    "small": {
      "height": 36,
      "url": "https://dl.airtable.com/zQo9TzDHRda8WYhtL1Hc_small_nc_product_landscape_4_1200_6243.jpg",
      "width": 58
    }
  },
  "type": "image/jpeg",
  "url": "https://dl.airtable.com/RZECUa9NS2q3bTR8B0Hg_nc_product_landscape_4_1200_6243.jpg"
 */

export interface AirtableThumbnails {
  full: AirtableThumbnail
  large: AirtableThumbnail
  small: AirtableThumbnail
}

export interface AirtableThumbnail {
  width: number
  height: number
  url: string
}

export const airtableThumbnailSchema = objectSchema<AirtableThumbnail>({
  width: integerSchema.min(0),
  height: integerSchema.min(0),
  url: urlSchema(),
})

export interface AirtableAttachment {
  id: string
  url: string
  filename: string
  size?: number
  type?: string
  thumbnails?: AirtableThumbnails
}

export interface AirtableAttachmentUpload {
  url: string
  filename?: string
}

export const airtableAttachmentSchema = objectSchema<AirtableAttachment>({
  id: stringSchema,
  url: urlSchema(),
  filename: stringSchema,
  size: integerSchema.optional(),
  type: stringSchema.optional(),
  thumbnails: objectSchema({
    full: airtableThumbnailSchema,
    large: airtableThumbnailSchema,
    small: airtableThumbnailSchema,
  })
    .options({ stripUnknown: false })
    .optional(),
}).options({ stripUnknown: false })

export const airtableAttachmentsSchema = arraySchema<AirtableAttachment>(airtableAttachmentSchema)
  .optional()
  .default([])

export interface AirtableLibCfg {
  apiKey: string
}

export interface AirtableRecord {
  /**
   * `airtableId` changes every time you re-upload data from json to Airtable,
   * so not to be relied upon.
   * The purpose of `airtableId` is to link records between each other.
   */
  airtableId: AirtableId

  /**
   * Convention for each Airtable table to have a string `id` property.
   */
  // id: string
}

export const airtableRecordSchema = objectSchema<AirtableRecord>({
  airtableId: airtableIdSchema,
  // id: stringSchema,
})

export interface AirtableDaoSaveOptions extends AirtableDaoOptions {
  /**
   * @default true
   *
   * If true - will DELETE all items as a first step of Upload process.
   * If false - will APPEND items, which may lead to duplicates (unless `upsert` is set to `true`).
   */
  deleteAllOnUpload?: boolean

  /**
   * @default false
   *
   * If true - will OVERWRITE records if they exist (by `id`).
   * If false - will NOT check for id uniqueness. Duplicate ids can exist because of that.
   */
  upsert?: boolean
}

/**
 * All properties default to undefined (treated as false).
 */
export interface AirtableDaoOptions {
  /**
   * Will still _transform_ the value.
   *
   * @default false
   */
  skipValidation?: boolean

  /**
   * @default false
   */
  throwOnValidationError?: boolean

  onValidationError?: (err: JoiValidationError) => any

  /**
   * Applies only to "upload to remote Airtable" tasks.
   * `true` means it will upload rows concurrently and the order will NOT be preserved.
   * Otherwise order is preserved, but upload is sequential and slower.
   *
   * @default false
   */
  skipPreservingOrder?: boolean

  /**
   * Use given concurrency instead of default concurrency for given method (differs per method).
   */
  concurrency?: number

  /**
   * By default AirtableBaseDao caches everything that is fetched from Connector.
   * Settings this to `true` skips caching.
   * Applicable to AirtableBaseDao methods that fetch data, not applicable to AirtableTableDao methods.
   *
   * @default false
   */
  noCache?: boolean

  /**
   * If set to true - preserves `lastChanged` field.
   *
   * @default false
   */
  preserveLastChanged?: boolean

  /**
   * If set to true - preserves `lastFetched` field.
   *
   * @default false
   */
  preserveLastFetched?: boolean

  /**
   * @default `id`
   *
   * Defines the primary key (leftmost column) of the Airtable sheet.
   * Conventionally should be named `id` (to match the CommonDB specification).
   */
  idField?: string
}

export interface AirtableBaseDaoCfg<BASE = any> {
  baseId: string
  baseName: string

  /**
   * Primary connector that is used to access Airtable data.
   *
   * The `connectors` array is for other purposes, such as syncing data between connectors
   * (e.g from Remote to Datastore, or Remote to Json files).
   */
  primaryConnector: symbol

  connectors: AirtableConnector<BASE>[]

  tableCfgMap: AirtableTableCfgMap<BASE>

  noAttachmentQueryString?: boolean
}

export interface AirtableTableCfg<T extends AirtableRecord = any> {
  /**
   * Required field!
   *
   * It will skip rows (without marking them invalid) if row[idField] is empty
   */
  idField: string

  validationSchema?: AnySchema<T>
  sort?: AirtableApiSort<T>[]

  /**
   * @default 'Grid view'
   * Without view - airtable api returns records in wrongly sorted order (sorted by airtableId), not in the view order.
   */
  view?: string

  /**
   * Set to true to strip away query string from attachment urls.
   * E.g
   * TAYGREWE3.JPG?ts=1651857038&userId=usrgPxsBnMxTz7qD2&cs=3ff02a34e23ce4df
   * will become:
   * TAYGREWE3.JPG
   *
   * Defaults to false.
   */
  noAttachmentQueryString?: boolean
}

export type AirtableTableCfgMap<BASE = any> = {
  // [tableName in keyof BASE]: AirtableTableDaoCfg<BASE[tableName]>
  [tableName in keyof BASE]: AirtableTableCfg
}

export interface AirtableConnector<BASE = any> {
  TYPE: symbol
  fetch: (baseDaoCfg: AirtableBaseDaoCfg<BASE>, opt?: AirtableDaoOptions) => Promise<BASE>
  upload: (
    base: BASE,
    baseDaoCfg: AirtableBaseDaoCfg<BASE>,
    opt?: AirtableDaoSaveOptions,
  ) => Promise<void>
}
