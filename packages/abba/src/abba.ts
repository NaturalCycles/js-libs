import { _shuffle } from '@naturalcycles/js-lib/array/array.util.js'
import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import { _Memo } from '@naturalcycles/js-lib/decorators/memo.decorator.js'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import { pMap } from '@naturalcycles/js-lib/promise/pMap.js'
import type { Unsaved } from '@naturalcycles/js-lib/types'
import { LRUMemoCache } from '@naturalcycles/nodejs-lib/lruMemoCache'
import { bucketDao } from './dao/bucket.dao.js'
import { experimentDao } from './dao/experiment.dao.js'
import type { GetAllExperimentsOpts } from './dao/experiment.dao.js'
import { userAssignmentDao } from './dao/userAssignment.dao.js'
import type {
  AbbaConfig,
  Bucket,
  BucketAssignmentStatistics,
  DecoratedUserAssignment,
  Experiment,
  ExperimentAssignmentStatistics,
  ExperimentWithBuckets,
  SegmentationData,
  UserAssignment,
  UserExperiment,
} from './types.js'
import { AssignmentStatus } from './types.js'
import {
  canGenerateNewAssignments,
  generateUserAssignmentData,
  getUserExclusionSet,
  validateTotalBucketRatio,
} from './util.js'

/**
 * 10 minutes
 */
const CACHE_TTL = 600_000

export class Abba {
  private experimentDao = experimentDao(this.cfg.db)
  private bucketDao = bucketDao(this.cfg.db)
  private userAssignmentDao = userAssignmentDao(this.cfg.db)

  constructor(public cfg: AbbaConfig) {}

  /**
   * Returns all experiments.
   * Cached (see CACHE_TTL)
   */
  @_Memo({ cacheFactory: () => new LRUMemoCache({ ttl: CACHE_TTL, max: 1 }) })
  async getAllExperimentsWithBuckets(
    opts?: GetAllExperimentsOpts,
  ): Promise<ExperimentWithBuckets[]> {
    return await this.getAllExperimentsWithBucketsNoCache(opts)
  }

  /**
   * Returns all experiments.
   */
  async getAllExperimentsWithBucketsNoCache(
    opts?: GetAllExperimentsOpts,
  ): Promise<ExperimentWithBuckets[]> {
    const experiments = await this.experimentDao.getAllExperiments(opts)
    const buckets = await this.bucketDao.getAll()

    return experiments.map(experiment => ({
      ...experiment,
      buckets: buckets.filter(bucket => bucket.experimentId === experiment.id),
    }))
  }

  async getUserExperiments(userId: string): Promise<UserExperiment[]> {
    const experiments = await this.getAllExperimentsWithBuckets({ includeDeleted: false })

    const experimentIds = experiments.map(e => e.id)
    const userAssignments = await this.userAssignmentDao.getUserAssigmentsByExperimentIds(
      userId,
      experimentIds,
    )

    return experiments.map(experiment => {
      const existingAssignment = userAssignments.find(ua => ua.experimentId === experiment.id)
      const existingAssignmentBucket = experiment.buckets.find(
        b => b.id === existingAssignment?.bucketId,
      )

      return {
        ...experiment,
        ...(existingAssignment && {
          userAssignment: {
            ...existingAssignment,
            experimentId: experiment.id,
            experimentData: experiment.data,
            experimentKey: experiment.key,
            bucketData: existingAssignmentBucket?.data || null,
            bucketKey: existingAssignmentBucket?.key || null,
          },
        }),
      }
    })
  }

  /**
   * Changes all user assignments from one userId to another, as long as no
   * assignment for a given experiment already exists with the new userId.
   */
  async mergeAssignmentsForUserIds(fromUserId: string, intoUserId: string): Promise<void> {
    const fromAssignments = await this.userAssignmentDao.getBy('userId', fromUserId)
    const existingIntoAssignments = await this.userAssignmentDao.getBy('userId', intoUserId)

    await pMap(fromAssignments, async from => {
      if (!existingIntoAssignments.some(into => into.experimentId === from.experimentId)) {
        await this.userAssignmentDao.patch(from, { userId: intoUserId })
      }
    })
  }

  /**
   * Creates a new experiment.
   * Cold method.
   */
  async createExperiment(
    experiment: Experiment,
    buckets: Bucket[],
  ): Promise<ExperimentWithBuckets> {
    if (experiment.status === AssignmentStatus.Active) {
      validateTotalBucketRatio(buckets)
    }

    const created = await this.experimentDao.save(experiment)
    const createdbuckets = await this.bucketDao.saveBatch(
      buckets.map(b => ({ ...b, experimentId: created.id })),
    )

    await this.updateExclusions(created.id, created.exclusions)

    return {
      ...created,
      buckets: createdbuckets,
    }
  }

  /**
   * Update experiment information, will also validate the buckets' ratio if experiment.active is true
   * Cold method.
   */
  async saveExperiment(
    experiment: Experiment,
    buckets: Unsaved<Bucket>[],
  ): Promise<ExperimentWithBuckets> {
    if (experiment.status === AssignmentStatus.Active) {
      validateTotalBucketRatio(buckets)
    }

    const updatedExperiment = await this.experimentDao.save(experiment, { saveMethod: 'update' })
    const updatedBuckets = await pMap(buckets, async bucket => {
      return await this.bucketDao.save(
        { ...bucket, experimentId: updatedExperiment.id },
        { saveMethod: bucket.id ? 'update' : undefined },
      )
    })

    await this.updateExclusions(updatedExperiment.id, updatedExperiment.exclusions)

    return {
      ...updatedExperiment,
      buckets: updatedBuckets,
    }
  }

  /**
   * Ensures that mutual exclusions are maintained
   */
  private async updateExclusions(experimentId: string, updatedExclusions: string[]): Promise<void> {
    const experiments = await this.experimentDao.getAll()

    const requiresUpdating: Experiment[] = []
    experiments.map(experiment => {
      // Make sure it's mutual
      if (
        updatedExclusions.includes(experiment.id) &&
        !experiment.exclusions.includes(experimentId)
      ) {
        experiment.exclusions.push(experimentId)
        requiresUpdating.push(experiment)
      }

      // Make sure it's mutual
      if (
        !updatedExclusions.includes(experiment.id) &&
        experiment.exclusions.includes(experimentId)
      ) {
        experiment.exclusions = experiment.exclusions.filter(id => id !== experimentId)
        requiresUpdating.push(experiment)
      }
    })

    await this.experimentDao.saveBatch(requiresUpdating, { saveMethod: 'update' })
  }

  async softDeleteExperiment(experimentId: string): Promise<void> {
    await this.experimentDao.patchById(
      experimentId,
      { deleted: true, status: AssignmentStatus.Inactive, exclusions: [] },
      { saveMethod: 'update' },
    )
    await this.updateExclusions(experimentId, [])
  }

  /**
   * Delete an experiment. Removes all user assignments and buckets.
   * Requires the experiment to have been inactive for at least 15 minutes in order to
   * avoid row locking issues.
   * Cold method.
   */
  async deleteExperiment(experimentId: string): Promise<void> {
    const experiment = await this.experimentDao.requireById(experimentId)

    const hasBeenInactiveFor15Mins =
      experiment.status === AssignmentStatus.Inactive &&
      localTime(experiment.updated).isOlderThan(15, 'minute')
    _assert(
      hasBeenInactiveFor15Mins,
      'Experiment must be inactive for at least 15 minutes before deletion',
    )

    await this.userAssignmentDao.deleteByExperimentId(experimentId)
    await this.bucketDao.deleteByExperimentId(experimentId)
    await this.experimentDao.deleteById(experimentId)
    await this.updateExclusions(experimentId, [])
  }

  /**
   * Get an assignment for a given user. If existingOnly is false, it will attempt to generate a new assignment
   * Cold method.
   *
   * @param experimentId
   * @param userId
   * @param existingOnly Do not generate any new assignments for this experiment
   * @param segmentationData Required if existingOnly is false
   */
  async getUserAssignment(
    experimentKey: string,
    userId: string,
    existingOnly: boolean,
    segmentationData?: SegmentationData,
  ): Promise<DecoratedUserAssignment | null> {
    const experiment = await this.experimentDao.getByKey(experimentKey)
    _assert(experiment, `Experiment does not exist: ${experimentKey}`)

    // Inactive experiments should never return an assignment
    if (experiment.status === AssignmentStatus.Inactive) {
      return null
    }

    const buckets = await this.bucketDao.getByExperimentId(experiment.id)
    const userAssignment = await this.userAssignmentDao.getUserAssignmentByExperimentId(
      userId,
      experiment.id,
    )
    if (userAssignment) {
      const bucket = buckets.find(b => b.id === userAssignment.bucketId)
      return {
        ...userAssignment,
        experimentData: experiment.data,
        experimentKey: experiment.key,
        bucketKey: bucket?.key || null,
        bucketData: bucket?.data || null,
      }
    }

    // No existing assignment, but we don't want to generate a new one
    if (existingOnly || experiment.status === AssignmentStatus.Paused) {
      return null
    }

    const experiments = await this.getUserExperiments(userId)
    const exclusionSet = getUserExclusionSet(experiments)
    if (!canGenerateNewAssignments(experiment, exclusionSet)) {
      return null
    }

    _assert(segmentationData, 'Segmentation data required when creating a new assignment')

    const experimentWithBuckets = { ...experiment, buckets }
    const assignment = generateUserAssignmentData(experimentWithBuckets, userId, segmentationData)
    if (!assignment) {
      return null
    }

    const newAssignment = await this.userAssignmentDao.save(assignment)

    const bucket = buckets.find(b => b.id === newAssignment.bucketId)

    return {
      ...newAssignment,
      experimentData: experiment.data,
      experimentKey: experiment.key,
      bucketKey: bucket?.key || null,
      bucketData: bucket?.data || null,
    }
  }

  /**
   * Get all existing user assignments.
   * Hot method.
   * Not cached, because Assignments are fast-changing.
   * Only to be used for testing
   */
  async getAllExistingUserAssignments(userId: string): Promise<DecoratedUserAssignment[]> {
    const assignments = await this.userAssignmentDao.getBy('userId', userId)
    return await pMap(assignments, async assignment => {
      const experiment = await this.experimentDao.requireById(assignment.experimentId)
      const bucket = await this.bucketDao.getById(assignment.bucketId)
      return {
        ...assignment,
        experimentData: experiment.data,
        experimentKey: experiment.key,
        bucketKey: bucket?.key || null,
        bucketData: bucket?.data || null,
      }
    })
  }

  /**
   * Generate user assignments for all active experiments.
   * Will return any existing and attempt to generate any new assignments if existingOnly is false.
   * Hot method.
   */
  async generateUserAssignments(
    userId: string,
    segmentationData: SegmentationData,
    existingOnly = false,
  ): Promise<DecoratedUserAssignment[]> {
    const experiments = await this.getUserExperiments(userId)
    const exclusionSet = getUserExclusionSet(experiments)

    // Shuffling means that randomisation occurs in the mutual exclusion
    // as experiments are looped through sequentially, this removes the risk of the same experiment always being assigned first in the list of mutually exclusive experiments
    // This is simmpler than trying to resolve after assignments have already been determined
    const availableExperiments = _shuffle(
      experiments.filter(
        e => e.status === AssignmentStatus.Active || e.status === AssignmentStatus.Paused,
      ),
    )

    const assignments: DecoratedUserAssignment[] = []
    const newAssignments: Unsaved<UserAssignment>[] = []

    for (const experiment of availableExperiments) {
      const { userAssignment } = experiment
      // Already assigned to this experiment
      if (userAssignment) {
        assignments.push(userAssignment)
        continue
      }

      // Not already assigned, but we don't want to generate a new assignment
      if (existingOnly) continue
      // We are not allowed to generate new assignments for this experiment
      if (!canGenerateNewAssignments(experiment, exclusionSet)) continue

      const assignment = generateUserAssignmentData(experiment, userId, segmentationData)
      if (assignment) {
        // Add to list of new assignments to be saved
        const newAssignment = this.userAssignmentDao.create(assignment)
        newAssignments.push(newAssignment)
        // Add the assignment to the list of assignments
        const bucket = experiment.buckets.find(b => b.id === assignment.bucketId)
        assignments.push({
          ...newAssignment,
          experimentKey: experiment.key,
          experimentData: experiment.data,
          bucketKey: bucket?.key || null,
          bucketData: bucket?.data || null,
        })
        // Prevent future exclusion clashes
        experiment.exclusions.forEach(experimentId => exclusionSet.add(experimentId))
      }
    }

    await this.userAssignmentDao.saveBatch(newAssignments)

    return assignments
  }

  /**
   * Get assignment statistics for an experiment.
   * Cold method.
   */
  async getExperimentAssignmentStatistics(
    experimentId: string,
  ): Promise<ExperimentAssignmentStatistics> {
    const totalAssignments = await this.userAssignmentDao.getCountByExperimentId(experimentId)
    const buckets = await this.bucketDao.getByExperimentId(experimentId)

    const bucketAssignments: BucketAssignmentStatistics[] = await pMap(buckets, async bucket => {
      const totalAssignments = await this.userAssignmentDao.getCountByBucketId(bucket.id)
      return {
        bucketId: bucket.id,
        totalAssignments,
      }
    })

    return {
      totalAssignments,
      bucketAssignments,
    }
  }
}
