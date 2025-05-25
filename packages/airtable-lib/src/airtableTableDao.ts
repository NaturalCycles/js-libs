import type { InstanceId } from '@naturalcycles/js-lib'
import { _LogMethod, _mapValues, AppError, pMap } from '@naturalcycles/js-lib'
import { getValidationResult, inspectAny } from '@naturalcycles/nodejs-lib'
import type {
  AirtableApi,
  AirtableApiRecord,
  AirtableApiSelectOpts,
  AirtableApiTable,
} from './airtable.api.js'
import type { AirtableDaoOptions, AirtableRecord, AirtableTableCfg } from './airtable.model.js'
import { AirtableErrorCode } from './airtable.model.js'
import { stripQueryStringFromAttachments } from './airtable.util.js'

export class AirtableTableDao<T extends AirtableRecord = any> implements InstanceId {
  constructor(
    airtableApi: AirtableApi,
    baseId: string,
    private tableName: string,
    private cfg: AirtableTableCfg<T>,
  ) {
    this.table = airtableApi.base(baseId)<T>(tableName)
    this.instanceId = [baseId, tableName].join('_')
  }

  instanceId!: string

  private table!: AirtableApiTable<T>

  /**
   * Empty records are filtered out.
   */
  @_LogMethod()
  async getRecords(
    opt: AirtableDaoOptions = {},
    selectOpts: AirtableApiSelectOpts<T> = {},
  ): Promise<T[]> {
    const { sort, idField } = this.cfg

    const records = await this.table
      .select({
        // defaults
        pageSize: 100,
        view: this.cfg.view || 'Grid view',
        ...(sort?.length && { sort }),
        ...selectOpts,
      })
      .all()
      .catch(err => this.onError(err))

    return (
      records
        // Filter out empty records
        .filter(r => Object.keys(r.fields).length)
        // Filter empty records by idField being empty
        .filter(r => r.fields[idField as keyof T])
        .map(r => this.mapToAirtableRecord(r, opt))
    )
  }

  @_LogMethod()
  async getRecord(airtableId: string, opt: AirtableDaoOptions = {}): Promise<T | undefined> {
    const record = await this.table
      .find(airtableId)
      .catch(err => this.onErrorOrUndefined(err, { airtableId }))

    return record && this.mapToAirtableRecord(record, opt)
  }

  async getByIds(
    ids: string[],
    opt: AirtableDaoOptions = {},
    selectOpts: AirtableApiSelectOpts<T> = {},
  ): Promise<T[]> {
    if (!ids.length) return []

    const { idField = 'id' } = opt

    const pairs = ids.map(id => `{${idField}}="${id}"`)
    const filterByFormula = `OR(${pairs.join(',')})`

    return await this.getRecords(opt, {
      filterByFormula,
      ...selectOpts,
    })
  }

  /**
   * @returns created record (with generated `airtableId`)
   */
  @_LogMethod()
  async createRecord(record: Exclude<T, 'airtableId'>, opt: AirtableDaoOptions = {}): Promise<T> {
    // pre-save validation is skipped, cause we'll need to "omit" the `airtableId` from schema
    const raw = await this.table
      .create(record as Partial<T>)
      .catch(err => this.onError(err, { record }))

    return this.mapToAirtableRecord(raw, opt)
  }

  /**
   * Warning:
   * Order of records is not preserved if `concurrency` is set to higher than 1!
   * Or if opt.skipPreservingOrder=true
   */
  @_LogMethod()
  async createRecords(
    records: Exclude<T, 'airtableId'>[],
    opt: AirtableDaoOptions = {},
  ): Promise<T[]> {
    const concurrency = opt.concurrency || (opt.skipPreservingOrder ? 4 : 1)

    return await pMap(
      records,
      async record => {
        // pre-save validation is skipped
        const raw = await this.table
          .create(record as Partial<T>)
          .catch(err => this.onError(err, { record }))
        return this.mapToAirtableRecord(raw, opt)
      },
      { concurrency },
    )
  }

  /**
   * Partial update (patch) the record.
   */
  @_LogMethod()
  async updateRecord(
    airtableId: string,
    patch: Partial<T>,
    opt: AirtableDaoOptions = {},
  ): Promise<T> {
    // console.log('updateRecord', {airtableId, patch})
    const raw = await this.table
      .update(airtableId, patch)
      .catch(err => this.onError(err, { airtableId, patch }))

    return this.mapToAirtableRecord(raw, opt)
  }

  /**
   * Replace the record.
   * > Any fields that are not included will be cleared.
   */
  @_LogMethod()
  async replaceRecord(
    airtableId: string,
    record: Exclude<T, 'airtableId'>,
    opt: AirtableDaoOptions = {},
  ): Promise<T> {
    const raw = await this.table
      .replace(airtableId, record as Partial<T>)
      .catch(err => this.onError(err, { record }))

    return this.mapToAirtableRecord(raw, opt)
  }

  @_LogMethod()
  async replaceRecords(records: T[], opt: AirtableDaoOptions = {}): Promise<T[]> {
    const concurrency = opt.concurrency || 4
    return await pMap(
      records,
      async r => {
        const { airtableId, ...record } = r
        const raw = await this.table
          .replace(airtableId, record as T)
          .catch(err => this.onError(err, { record: r }))
        return this.mapToAirtableRecord(raw, opt)
      },
      { concurrency },
    )
  }

  /**
   * @returns true if record existed.
   */
  @_LogMethod()
  async deleteRecord(airtableId: string): Promise<boolean> {
    return await this.table
      .destroy(airtableId)
      .catch(err => this.onErrorOrUndefined(err, { airtableId }))
      .then(r => !!r)
  }

  // @_LogMethod()
  // async deleteByIds(ids: string[], opt: AirtableDaoOptions = {}): Promise<boolean> {
  //   await this.getByIds()
  //
  //   return this.table
  //     .destroy(airtableId)
  //     .catch(err => this.onErrorOrUndefined(err, { airtableId }))
  //     .then(r => !!r)
  // }

  /**
   * Will first fetch all records to get their airtableIds.
   * Then will call `deleteRecord` on each of them.
   *
   * @returns array of airtableIds of deleted records
   */
  @_LogMethod()
  async deleteAllRecords(concurrency = 4): Promise<string[]> {
    // Using low level commands to include empty records too
    const airtableIds = (
      await this.table
        .select({
          pageSize: 100,
        })
        .all()
        .catch(err => this.onError(err))
    ).map(r => r.id)

    await pMap(
      airtableIds,
      airtableId => {
        return this.table
          .destroy(airtableId)
          .catch(err => this.onErrorOrUndefined(err, { airtableId }))
      },
      { concurrency },
    )

    return airtableIds
  }

  private validate<R>(record: R, opt: AirtableDaoOptions = {}): R {
    const { validationSchema } = this.cfg
    const { skipValidation, onValidationError, throwOnValidationError } = opt

    const { value, error } = getValidationResult<R>(record, validationSchema as any, this.tableName)

    if (error && !skipValidation) {
      if (onValidationError) onValidationError(error)

      if (throwOnValidationError) {
        throw error
      }
      console.log(error.message)
    }

    return value
  }

  private mapToAirtableRecord(r: AirtableApiRecord<T>, opts: AirtableDaoOptions = {}): T {
    const o = this.validate(
      {
        // @ts-expect-error
        airtableId: r.id,
        ...r.fields,
      },
      opts,
    )

    if (this.cfg.noAttachmentQueryString) {
      _mapValues(o, (_, v) => stripQueryStringFromAttachments(v), true)
    }

    return o
  }

  onErrorOrUndefined(err: any, airtableInput?: any): undefined | never {
    // Turn 404 error into `undefined`
    if (err?.statusCode === 404) {
      return
    }

    this.onError(err, airtableInput)
  }

  private onError(err: any, airtableInput?: any): never {
    // Wrap as AppError with code
    // Don't keep stack, cause `err` from Airtable is not instance of Error (hence no native stack)
    // console.error('onError', err)
    const { tableName } = this
    const msg = `${tableName}: ${inspectAny(err)}`
    throw new AppError(msg, {
      code: AirtableErrorCode.AIRTABLE_ERROR,
      airtableTableName: tableName,
      airtableInput,
    })
  }
}
