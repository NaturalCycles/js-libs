import type { CommonDB } from '@naturalcycles/db-lib'
import { CommonDao } from '@naturalcycles/db-lib/dao'
import { _uniq } from '@naturalcycles/js-lib/array'
import type { UserAssignment } from '../types.js'

export class UserAssignmentDao extends CommonDao<UserAssignment> {
  async getUserAssignmentByExperimentId(
    userId: string,
    experimentId: string,
  ): Promise<UserAssignment | null> {
    const query = this.query().filterEq('userId', userId).filterEq('experimentId', experimentId)
    const [userAssignment] = await this.runQuery(query)
    return userAssignment || null
  }

  async getUserAssigmentsByExperimentIds(
    userId: string,
    experimentIds: string[],
  ): Promise<UserAssignment[]> {
    const query = this.query().filterEq('userId', userId).filterIn('experimentId', experimentIds)
    return await this.runQuery(query)
  }

  /**
   * Returns every UserAssignment whose `userId` is in `userIds` AND whose `experimentId`
   * is in `experimentIds`. This is the cross-product, not paired lookup: callers must
   * filter the result by the specific (userId, experimentId) pairs they care about.
   */
  async getByUserIdsAndExperimentIds(
    userIds: string[],
    experimentIds: string[],
  ): Promise<UserAssignment[]> {
    if (!userIds.length || !experimentIds.length) return []
    const query = this.query().filterIn('userId', userIds).filterIn('experimentId', experimentIds)
    return await this.runQuery(query)
  }

  async deleteByExperimentId(experimentId: string): Promise<void> {
    await this.query().filterEq('experimentId', experimentId).deleteByQuery()
  }

  async getCountByExperimentId(experimentId: string): Promise<number> {
    return await this.query().filterEq('experimentId', experimentId).runQueryCount()
  }

  async getCountByBucketId(bucketId: string): Promise<number> {
    return await this.query().filterEq('bucketId', bucketId).runQueryCount()
  }

  async getUserIdsByBucketIds(bucketIds: string[]): Promise<string[]> {
    if (!bucketIds.length) return []

    const userIds = await this.query()
      .filterIn('bucketId', bucketIds)
      .select(['userId'])
      .distinct()
      .runQuerySingleColumn<string>()

    return _uniq(userIds)
  }
}

export function userAssignmentDao(db: CommonDB): UserAssignmentDao {
  return new UserAssignmentDao({
    db,
    table: 'UserAssignment',
  })
}
