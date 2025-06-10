import type { CommonDB } from '@naturalcycles/db-lib'
import { CommonDao } from '@naturalcycles/db-lib'
import type { BaseBucket, Bucket } from '../types.js'

type BucketDBM = BaseBucket & {
  data: string | null
}

export class BucketDao extends CommonDao<Bucket, BucketDBM> {
  async getByExperimentId(experimentId: string): Promise<Bucket[]> {
    return await this.query().filterEq('experimentId', experimentId).runQuery()
  }

  async deleteByExperimentId(experimentId: string): Promise<void> {
    await this.query().filterEq('experimentId', experimentId).deleteByQuery()
  }
}

export function bucketDao(db: CommonDB): BucketDao {
  return new BucketDao({
    db,
    table: 'Bucket',
    hooks: {
      beforeBMToDBM: bm => {
        return {
          ...bm,
          data: bm.data ? JSON.stringify(bm.data) : null,
        }
      },
      beforeDBMToBM: dbm => ({
        ...dbm,
        data: dbm.data ? JSON.parse(dbm.data) : null,
      }),
    },
  })
}
