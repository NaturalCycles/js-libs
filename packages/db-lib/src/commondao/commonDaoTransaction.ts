import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { _deepCopy } from '@naturalcycles/js-lib/object'
import type { BaseDBEntity, Unsaved } from '@naturalcycles/js-lib/types'
import type { DBTransaction } from '../db.model.js'
import type { AnyDao, CommonDao, InferID } from './common.dao.js'
import type {
  CommonDaoOptions,
  CommonDaoReadOptions,
  CommonDaoSaveBatchOptions,
  CommonDaoSaveOptions,
} from './common.dao.model.js'

/**
 * Transaction context.
 * Has similar API than CommonDao, but all operations are performed in the context of the transaction.
 */
export class CommonDaoTransaction {
  constructor(
    public tx: DBTransaction,
    private logger: CommonLogger,
  ) {}

  /**
   * Commits the underlying DBTransaction.
   * May throw.
   */
  async commit(): Promise<void> {
    await this.tx.commit()
  }

  /**
   * Perform a graceful rollback without throwing/re-throwing any error.
   * Never throws.
   */
  async rollback(): Promise<void> {
    try {
      await this.tx.rollback()
    } catch (err) {
      // graceful rollback without re-throw
      this.logger.error(err)
    }
  }

  async getById<BM extends BaseDBEntity, DBM extends BaseDBEntity, ID extends string = BM['id']>(
    dao: CommonDao<BM, DBM, ID>,
    id?: ID | null,
    opt?: CommonDaoReadOptions,
  ): Promise<BM | null> {
    return await dao.getById(id, { ...opt, tx: this.tx })
  }

  async getByIds<BM extends BaseDBEntity, DBM extends BaseDBEntity, ID extends string = BM['id']>(
    dao: CommonDao<BM, DBM, ID>,
    ids: ID[],
    opt?: CommonDaoReadOptions,
  ): Promise<BM[]> {
    return await dao.getByIds(ids, { ...opt, tx: this.tx })
  }

  // todo: Queries inside Transaction are not supported yet
  // async runQuery<BM extends PartialObjectWithId, DBM extends ObjectWithId>(
  //   dao: CommonDao<BM, DBM, any>,
  //   q: DBQuery<DBM>,
  //   opt?: CommonDaoOptions,
  // ): Promise<BM[]> {
  //   try {
  //     return await dao.runQuery(q, { ...opt, tx: this.tx })
  //   } catch (err) {
  //     await this.rollback()
  //     throw err
  //   }
  // }

  async save<BM extends BaseDBEntity, DBM extends BaseDBEntity>(
    dao: CommonDao<BM, DBM>,
    bm: Unsaved<BM>,
    opt?: CommonDaoSaveOptions<BM, DBM>,
  ): Promise<BM> {
    return await dao.save(bm, { ...opt, tx: this.tx })
  }

  async saveBatch<BM extends BaseDBEntity, DBM extends BaseDBEntity>(
    dao: CommonDao<BM, DBM>,
    bms: Unsaved<BM>[],
    opt?: CommonDaoSaveBatchOptions<DBM>,
  ): Promise<BM[]> {
    return await dao.saveBatch(bms, { ...opt, tx: this.tx })
  }

  /**
   * DaoTransaction.patch does not load from DB.
   * It assumes the bm was previously loaded in the same Transaction, hence could not be
   * concurrently modified. Hence it's safe to not sync with DB.
   *
   * So, this method is a rather simple convenience "Object.assign and then save".
   */
  async patch<BM extends BaseDBEntity, DBM extends BaseDBEntity, ID extends string = BM['id']>(
    dao: CommonDao<BM, DBM, ID>,
    bm: BM,
    patch: Partial<BM>,
    opt?: CommonDaoSaveOptions<BM, DBM>,
  ): Promise<BM> {
    const skipIfEquals = _deepCopy(bm)
    Object.assign(bm, patch)
    return await dao.save(bm, { ...opt, skipIfEquals, tx: this.tx })
  }

  async deleteById<DAO extends AnyDao>(
    dao: DAO,
    id?: InferID<DAO> | null,
    opt?: CommonDaoOptions,
  ): Promise<number> {
    if (!id) return 0
    return await this.deleteByIds(dao, [id], opt)
  }

  async deleteByIds<DAO extends AnyDao>(
    dao: DAO,
    ids: InferID<DAO>[],
    opt?: CommonDaoOptions,
  ): Promise<number> {
    return await dao.deleteByIds(ids, { ...opt, tx: this.tx })
  }
}
