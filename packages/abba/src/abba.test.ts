import { InMemoryDB } from '@naturalcycles/db-lib/inmemory'
import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { Abba } from './abba.js'
import { bucketDao } from './dao/bucket.dao.js'
import { experimentDao } from './dao/experiment.dao.js'
import { userAssignmentDao } from './dao/userAssignment.dao.js'
import { mockBucket, mockExperiment, mockUserAssignment, mockUserId1 } from './test/mocks.js'
import { AssignmentStatus, SegmentationRuleOperator } from './types.js'
import type { DecoratedUserAssignment } from './types.js'

const db = new InMemoryDB({ logger: undefined })
const abba = new Abba({ db })
const experimentsDAO = experimentDao(db)
const bucketsDAO = bucketDao(db)
const userAssignmentsDAO = userAssignmentDao(db)

beforeEach(() => {
  db.data = {}
})

describe('mergeAssignmentsForUserIds', async () => {
  test('should update userId for all assignments if no existing assignments for experiments for new userId', async () => {
    const intoUserId = 'newUserId'
    const assignment1 = await userAssignmentsDAO.save(
      mockUserAssignment('mockExperimentId1', 'mockBucketId1'),
    )
    const assignment2 = await userAssignmentsDAO.save(
      mockUserAssignment('mockExperimentId2', 'mockBucketId2'),
    )

    await abba.mergeAssignmentsForUserIds(assignment1.userId, intoUserId)

    const updatedAssignment1 = await userAssignmentsDAO.requireById(assignment1.id)
    expect(updatedAssignment1.userId).toEqual(intoUserId)

    const updatedAssignment2 = await userAssignmentsDAO.requireById(assignment2.id)
    expect(updatedAssignment2.userId).toEqual(intoUserId)
  })

  test('should not update userId if assignments for the same experimentId already exist for the new userId', async () => {
    const fromUserId = 'fromUserId'
    const intoUserId = 'intoUserId'
    const assignment1 = await userAssignmentsDAO.save(
      mockUserAssignment('mockExperimentId1', 'mockBucketId1', { userId: fromUserId }),
    )
    const assignment2 = await userAssignmentsDAO.save(
      mockUserAssignment('mockExperimentId2', 'mockBucketId2', { userId: fromUserId }),
    )
    await userAssignmentsDAO.save(
      mockUserAssignment('mockExperimentId1', 'mockBucketId3', { userId: intoUserId }),
    )

    await abba.mergeAssignmentsForUserIds(fromUserId, intoUserId)

    const updatedAssignment1 = await userAssignmentsDAO.requireById(assignment1.id)
    expect(updatedAssignment1.userId).toEqual(fromUserId) // Should not change

    const updatedAssignment2 = await userAssignmentsDAO.requireById(assignment2.id)
    expect(updatedAssignment2.userId).toEqual(intoUserId) // Should change
  })
})

describe('createExperiment', () => {
  test('adding exclusion updates other mutually exclusive experiments', async () => {
    const experiment1 = mockExperiment()
    const experiment2 = mockExperiment({ id: 'mockExperiment2' })

    await experimentsDAO.saveBatch([experiment1, experiment2])

    const updatedExperiment1 = await abba.createExperiment(
      { ...experiment1, exclusions: [experiment2.id] },
      [mockBucket(experiment1.id, 'control', 100)],
    )

    expect(updatedExperiment1.exclusions).toEqual([experiment2.id])
    const updatedExperiment2 = await experimentsDAO.requireById(experiment2.id)
    expect(updatedExperiment2.exclusions).toEqual([experiment1.id])
  })
})

describe('deleteExperiment', () => {
  test('will throw if the experiment is not inactive', async () => {
    const experiment = await experimentsDAO.save(
      mockExperiment({ status: AssignmentStatus.Active }),
    )

    await expect(abba.deleteExperiment(experiment.id)).rejects.toThrow(
      'Experiment must be inactive for at least 15 minutes before deletion',
    )
  })

  test('will throw if the experiment is inactive but was last updated within 15 minutes', async () => {
    const experiment = await experimentsDAO.save(
      mockExperiment({
        status: AssignmentStatus.Inactive,
        updated: localTime.now().minusMinutes(14).unix,
      }),
      { preserveUpdated: true },
    )

    await expect(abba.deleteExperiment(experiment.id)).rejects.toThrow(
      'Experiment must be inactive for at least 15 minutes before deletion',
    )
  })

  test('removes id from all experiment exclusions', async () => {
    const experiment1 = await experimentsDAO.save(
      mockExperiment({
        status: AssignmentStatus.Inactive,
        updated: localTime.now().minusMinutes(15).unix,
      }),
      { preserveUpdated: true },
    )
    const experiment2 = await experimentsDAO.save(
      mockExperiment({ id: 'mockExperiment2', exclusions: [experiment1.id] }),
    )

    await abba.deleteExperiment(experiment1.id)

    const updatedExperiment1 = await experimentsDAO.getById(experiment1.id)
    expect(updatedExperiment1).toBeNull()
    const updatedExperiment2 = await experimentsDAO.requireById(experiment2.id)
    expect(updatedExperiment2?.exclusions).toEqual([])
  })
})

describe('saveExperiment', () => {
  test('adding exclusion updates other mutually exclusive experiments', async () => {
    const experiment1 = mockExperiment()
    const experiment2 = mockExperiment({ id: 'mockExperiment2' })
    const experiment3 = mockExperiment({ id: 'mockExperiment3' })

    experiment2.exclusions = [experiment3.id]
    experiment3.exclusions = [experiment2.id]

    await experimentsDAO.saveBatch([experiment1, experiment2, experiment3])

    const result = await abba.saveExperiment({ ...experiment1, exclusions: [experiment2.id] }, [
      { ...mockBucket(experiment1.id, 'control', 100), id: undefined },
    ])

    expect(result.exclusions).toEqual([experiment2.id])
    const updatedExperiment2 = await experimentsDAO.requireById(experiment2.id)
    expect(updatedExperiment2.exclusions).toEqual([experiment3.id, experiment1.id])

    // Ensure non-related are not updated
    const updatedExperiment3 = await experimentsDAO.requireById(experiment3.id)
    expect(updatedExperiment3.exclusions).toEqual([experiment2.id])
  })

  test('removing exclusion updates other mutually exclusive experiments', async () => {
    const experiment1 = mockExperiment()
    const experiment2 = mockExperiment({ id: 'mockExperiment2' })
    const experiment3 = mockExperiment({ id: 'mockExperiment3' })

    experiment1.exclusions = [experiment2.id, experiment3.id]
    experiment2.exclusions = [experiment1.id, experiment3.id]
    experiment3.exclusions = [experiment1.id, experiment2.id]

    await experimentsDAO.saveBatch([experiment1, experiment2, experiment3])

    const updatedExperiment1 = await abba.saveExperiment({ ...experiment1, exclusions: [] }, [
      { ...mockBucket(experiment1.id, 'control', 100), id: undefined },
    ])

    expect(updatedExperiment1.exclusions).toEqual([])

    const updatedExperiment2 = await experimentsDAO.requireById(experiment2.id)
    expect(updatedExperiment2.exclusions).toEqual([experiment3.id])

    // Ensure non-related are not updated
    const updatedExperiment3 = await experimentsDAO.requireById(experiment3.id)
    expect(updatedExperiment3.exclusions).toEqual([experiment2.id])
  })
})

describe('getUserAssignment', () => {
  test('returns null if experiment is inactive, even with existing assignment', async () => {
    const experiment = await experimentsDAO.save(
      mockExperiment({ status: AssignmentStatus.Inactive }),
    )
    const bucket = await bucketsDAO.save(mockBucket(experiment.id, 'test', 100))
    await userAssignmentsDAO.save({
      userId: 'userId',
      experimentId: experiment.id,
      bucketId: bucket.id,
    })

    const assignment = await abba.getUserAssignment(experiment.key, 'userId', true, undefined)

    expect(assignment).toBeNull()
  })

  test('returns null if experiment is paused, even if existingOnly is false', async () => {
    const experiment = await experimentsDAO.save(
      mockExperiment({ status: AssignmentStatus.Paused }),
    )

    const assignment = await abba.getUserAssignment(experiment.key, 'userId', true, undefined)

    expect(assignment).toBeNull()
  })

  test('returns existing assignment', async () => {
    const experiment = await experimentsDAO.save(mockExperiment())
    const bucket = await bucketsDAO.save(mockBucket(experiment.id, 'test', 100))
    const existingAssignment = await userAssignmentsDAO.save({
      userId: 'userId',
      experimentId: experiment.id,
      bucketId: bucket.id,
    })

    const generatedUserAssignment = await abba.getUserAssignment(
      experiment.key,
      'userId',
      true,
      undefined,
    )

    expect(generatedUserAssignment).toEqual<DecoratedUserAssignment>({
      ...existingAssignment,
      experimentKey: experiment.key,
      experimentData: experiment.data,
      bucketKey: bucket.key,
      bucketData: null,
    })
  })

  test('does not generate new if existingOnly is true and user has no existing assignment', async () => {
    const experiment = await experimentsDAO.save(mockExperiment())

    const assignment = await abba.getUserAssignment(experiment.key, 'userId', true, undefined)

    expect(assignment).toBeNull()
  })

  test('Generates new assignment if experiment is active and user is eligible', async () => {
    const experiment = await experimentsDAO.save(mockExperiment())
    const bucket = await bucketsDAO.save(mockBucket(experiment.id, 'test', 100))

    vi.spyOn(abba, 'getAllExperimentsWithBuckets').mockResolvedValueOnce([
      { ...experiment, buckets: [bucket] },
    ])

    const generatedUserAssignment = await abba.getUserAssignment(
      experiment.key,
      mockUserId1,
      false,
      {},
    )

    expect(generatedUserAssignment).toMatchObject({
      experimentId: experiment.id,
      experimentKey: experiment.key,
      bucketKey: bucket.key,
      bucketData: null,
      userId: mockUserId1,
    })
  })
})

describe('getExperimentWithBuckets', () => {
  test('returns the experiment by id, and its buckets', async () => {
    const experiment = await experimentsDAO.save(mockExperiment())
    const bucket = await bucketsDAO.save(mockBucket(experiment.id, 'test', 100))

    const result = await abba.getExperimentWithBuckets(experiment.id)

    expect(result).toEqual({
      ...experiment,
      buckets: [bucket],
    })
  })

  test('returns undefined if experiment not found', async () => {
    const result = await abba.getExperimentWithBuckets('nonExistentId')

    expect(result).toBeUndefined()
  })
})

describe('generateUserAssignments', () => {
  // We spy on getAllExperiments to avoid the cache
  test('Does not return existing assignment for experiments that are inactive', async () => {
    const experiment = await experimentsDAO.save(
      mockExperiment({ status: AssignmentStatus.Inactive }),
    )
    const bucket = await bucketsDAO.save(mockBucket(experiment.id, 'test', 100))
    await userAssignmentsDAO.save(mockUserAssignment(experiment.id, bucket.id))

    vi.spyOn(abba, 'getAllExperimentsWithBuckets').mockResolvedValueOnce([
      { ...experiment, buckets: [bucket] },
    ])

    const assignments = await abba.generateUserAssignments(mockUserId1, {}, true)

    expect(assignments).toEqual([])
  })

  test('returns existing assignment for experiments that are not inactive', async () => {
    const experiment = await experimentsDAO.save(
      mockExperiment({ id: 'mockExperimentId2', status: AssignmentStatus.Paused }),
    )
    const bucket = await bucketsDAO.save(mockBucket(experiment.id, 'test', 100))
    const userAssignment = await userAssignmentsDAO.save(
      mockUserAssignment(experiment.id, bucket.id),
    )

    vi.spyOn(abba, 'getAllExperimentsWithBuckets').mockResolvedValueOnce([
      { ...experiment, buckets: [bucket] },
    ])

    const generatedUserAssignment = await abba.generateUserAssignments(mockUserId1, {}, true)

    expect(generatedUserAssignment).toEqual<DecoratedUserAssignment[]>([
      {
        ...userAssignment,
        experimentKey: experiment.key,
        experimentData: experiment.data,
        bucketKey: bucket.key,
        bucketData: null,
      },
    ])
  })

  test('Generates new assignment for experiments that are active and user is eligible', async () => {
    const experiment = await experimentsDAO.save(
      mockExperiment({ status: AssignmentStatus.Active }),
    )
    const bucket = await bucketsDAO.save(mockBucket(experiment.id, 'test', 100))

    vi.spyOn(abba, 'getAllExperimentsWithBuckets').mockResolvedValueOnce([
      { ...experiment, buckets: [bucket] },
    ])

    const assignments = await abba.generateUserAssignments(mockUserId1, {})

    expect(assignments).toHaveLength(1)
    expect(assignments[0]).toMatchObject({
      experimentId: experiment.id,
      experimentKey: experiment.key,
      bucketKey: bucket.key,
      bucketData: null,
      userId: mockUserId1,
    })
  })
})

describe('getExperimentAssignmentStatistics', () => {
  test('returns correct totals', async () => {
    const experiment = await experimentsDAO.save(mockExperiment({ sampling: 50 }))
    const bucket = await bucketsDAO.save(mockBucket(experiment.id, 'test', 100))
    await userAssignmentsDAO.saveBatch([
      mockUserAssignment(experiment.id, bucket.id),
      mockUserAssignment(experiment.id, 'bucket.id', { id: 'mockUserAssignment2' }),
    ])

    const { totalAssignments, bucketAssignments } = await abba.getExperimentAssignmentStatistics(
      experiment.id,
    )

    expect(totalAssignments).toBe(2)
    expect(bucketAssignments).toEqual([{ bucketId: bucket.id, totalAssignments: 1 }])
  })
})

describe('getAllExistingUserAssignments', () => {
  test('getAllExistingUserAssignments', async () => {
    const experiment = await experimentsDAO.save(mockExperiment())
    const bucket = await bucketsDAO.save(mockBucket(experiment.id, 'test', 100))
    const assignment = await userAssignmentsDAO.save(mockUserAssignment(experiment.id, bucket.id))

    const assignments = await abba.getAllExistingUserAssignments(mockUserId1)

    expect(assignments).toEqual([
      {
        ...assignment,
        experimentData: experiment.data,
        experimentKey: experiment.key,
        bucketKey: bucket.key,
        bucketData: null,
      },
    ])
  })

  test('generated user assignments include data if provided', async () => {
    const experiment = await experimentsDAO.save(mockExperiment())
    const bucket = await bucketsDAO.save(
      mockBucket(experiment.id, 'test', 100, { data: { edits: ['hello'] } }),
    )
    const assignment = await userAssignmentsDAO.save(mockUserAssignment(experiment.id, bucket.id))

    const assignments = await abba.getAllExistingUserAssignments(mockUserId1)

    expect(assignments).toEqual([
      {
        ...assignment,
        experimentData: experiment.data,
        experimentKey: experiment.key,
        bucketKey: bucket.key,
        bucketData: { edits: ['hello'] },
      },
    ])
  })
})

describe('getAllExperimentsWithBucketsNoCache', () => {
  test('should query all experiments attached with their respective buckets', async () => {
    const experiment1 = await experimentsDAO.save(mockExperiment({ key: 'exp1' }))
    const experiment1Buckets = await bucketsDAO.saveBatch([
      mockBucket(experiment1.id, 'bucket1', 50),
      mockBucket(experiment1.id, 'bucket2', 50),
    ])
    const experiment2 = await experimentsDAO.save(mockExperiment({ key: 'exp2' }))
    const experiment2Buckets = await bucketsDAO.saveBatch([
      mockBucket(experiment2.id, 'bucket1', 50),
      mockBucket(experiment2.id, 'bucket2', 50),
    ])

    const experiments = await abba.getAllExperimentsWithBucketsNoCache()

    expect(experiments).toEqual([
      { ...experiment1, buckets: experiment1Buckets },
      { ...experiment2, buckets: experiment2Buckets },
    ])
  })
})

describe('getAllExperimentsWithUserAssignments', () => {
  test('should not include user assignments for deleted experiments', async () => {
    vi.spyOn(abba, 'getAllExperimentsWithBuckets')

    await abba.getUserExperiments(mockUserId1)

    expect(abba.getAllExperimentsWithBuckets).toHaveBeenCalledWith({ includeDeleted: false })
  })

  test('should attach user assignments to experiments', async () => {
    const experiment = mockExperiment()
    const bucket = mockBucket(experiment.id, 'test', 100)
    const userAssignment = await userAssignmentsDAO.save(
      mockUserAssignment(experiment.id, bucket.id),
    )

    vi.spyOn(abba, 'getAllExperimentsWithBuckets').mockResolvedValueOnce([
      { ...experiment, buckets: [bucket] },
    ])

    const experiments = await abba.getUserExperiments(mockUserId1)

    expect(experiments).toHaveLength(1)
    expect(experiments[0]?.userAssignment).toEqual({
      ...userAssignment,
      experimentKey: experiment.key,
      experimentData: experiment.data,
      bucketKey: bucket.key,
      bucketData: null,
    })
  })
})

describe('getUserIdsInBuckets', () => {
  test('returns empty Set when experiment key does not exist', async () => {
    const result = await abba.getUserIdsInBuckets('nonexistent_key', ['control'])
    expect(result).toEqual(new Set())
  })

  test('returns empty Set when none of the bucket keys match', async () => {
    const experiment = await experimentsDAO.save(mockExperiment({ key: 'exp_bucket_test' }))
    await bucketsDAO.save(mockBucket(experiment.id, 'control', 100))

    const result = await abba.getUserIdsInBuckets('exp_bucket_test', ['treatment'])
    expect(result).toEqual(new Set())
  })

  test('returns correct user IDs when matching assignments exist', async () => {
    const experiment = await experimentsDAO.save(mockExperiment({ key: 'exp_user_ids' }))
    const bucket = await bucketsDAO.save(mockBucket(experiment.id, 'treatment', 100))
    await userAssignmentsDAO.save(mockUserAssignment(experiment.id, bucket.id, { userId: 'user1' }))
    await userAssignmentsDAO.save(mockUserAssignment(experiment.id, bucket.id, { userId: 'user2' }))

    const result = await abba.getUserIdsInBuckets('exp_user_ids', ['treatment'])
    expect(result).toEqual(new Set(['user1', 'user2']))
  })

  test('deduplicates user IDs when a user is assigned to multiple matching buckets', async () => {
    const experiment = await experimentsDAO.save(mockExperiment({ key: 'exp_dedup' }))
    const bucket1 = await bucketsDAO.save(mockBucket(experiment.id, 'bucketA', 50))
    const bucket2 = await bucketsDAO.save(mockBucket(experiment.id, 'bucketB', 50))
    await userAssignmentsDAO.save(
      mockUserAssignment(experiment.id, bucket1.id, { userId: 'sharedUser' }),
    )
    await userAssignmentsDAO.save(
      mockUserAssignment(experiment.id, bucket2.id, { userId: 'sharedUser' }),
    )

    const result = await abba.getUserIdsInBuckets('exp_dedup', ['bucketA', 'bucketB'])
    expect(result).toEqual(new Set(['sharedUser']))
  })
})

describe('softDeleteExperiment', () => {
  test('should soft delete an experiment', async () => {
    const experiment = await experimentsDAO.save(
      mockExperiment({ status: AssignmentStatus.Paused, deleted: false }),
    )

    await abba.softDeleteExperiment(experiment.id)

    const updatedExperiment = await experimentsDAO.requireById(experiment.id)
    expect(updatedExperiment.deleted).toBe(true)
    expect(updatedExperiment.status).toBe(AssignmentStatus.Inactive)
  })

  test('should remove the experiment from any mutual exclusion lists', async () => {
    const experiment1Id = 'experiment1'
    const experiment2Id = 'experiment2'
    const experiment1 = mockExperiment({ id: experiment1Id, exclusions: [experiment2Id] })
    const experiment2 = mockExperiment({ id: experiment2Id, exclusions: [experiment1Id] })
    await experimentsDAO.saveBatch([experiment1, experiment2])

    await abba.softDeleteExperiment(experiment1Id)

    const updatedExperiment1 = await experimentsDAO.requireById(experiment1Id)
    expect(updatedExperiment1.deleted).toBe(true)
    expect(updatedExperiment1.exclusions).toEqual([])

    const updatedExperiment2 = await experimentsDAO.requireById(experiment1Id)
    expect(updatedExperiment2.exclusions).toEqual([])
  })
})

describe('saveManualUserAssignments', () => {
  test('should create new assignments and overwrite existing ones in a single batch', async () => {
    const experiment1 = await experimentsDAO.save(mockExperiment({ key: 'EXP_1' }))
    const control1 = await bucketsDAO.save(mockBucket(experiment1.id, 'control', 50))
    const test1 = await bucketsDAO.save(mockBucket(experiment1.id, 'test', 50))
    const experiment2 = await experimentsDAO.save(mockExperiment({ key: 'EXP_2' }))
    const test2 = await bucketsDAO.save(mockBucket(experiment2.id, 'test', 100))
    const existing = await userAssignmentsDAO.save({
      userId: 'userA',
      experimentId: experiment1.id,
      bucketId: control1.id,
    })

    const results = await abba.saveManualUserAssignments([
      { userId: 'userA', experimentKey: 'EXP_1', bucketKey: 'test' },
      { userId: 'userB', experimentKey: 'EXP_1', bucketKey: 'control' },
      { userId: 'userA', experimentKey: 'EXP_2', bucketKey: 'test' },
    ])

    expect(results).toHaveLength(3)
    expect(results[0]).toMatchObject({ id: existing.id, userId: 'userA', bucketId: test1.id })
    expect(results[1]).toMatchObject({ userId: 'userB', bucketId: control1.id })
    expect(results[2]).toMatchObject({ userId: 'userA', bucketId: test2.id })
    const all = await userAssignmentsDAO.getBy('userId', 'userA')
    expect(all).toHaveLength(2)
  })

  test('should return an empty array for an empty input', async () => {
    const result = await abba.saveManualUserAssignments([])
    expect(result).toEqual([])
  })

  test('should apply last-wins dedupe for duplicate (userId, experimentKey) pairs', async () => {
    const experiment = await experimentsDAO.save(mockExperiment())
    await bucketsDAO.save(mockBucket(experiment.id, 'control', 50))
    const testBucket = await bucketsDAO.save(mockBucket(experiment.id, 'test', 50))

    const result = await abba.saveManualUserAssignments([
      { userId: mockUserId1, experimentKey: experiment.key, bucketKey: 'control' },
      { userId: mockUserId1, experimentKey: experiment.key, bucketKey: 'test' },
    ])

    expect(result).toHaveLength(1)
    expect(result[0]!.bucketId).toBe(testBucket.id)
    const persisted = await userAssignmentsDAO.getBy('userId', mockUserId1)
    expect(persisted).toHaveLength(1)
    expect(persisted[0]!.bucketId).toBe(testBucket.id)
  })

  test('should throw when any row references an unknown experiment', async () => {
    const experiment = await experimentsDAO.save(mockExperiment())
    await bucketsDAO.save(mockBucket(experiment.id, 'test', 100))

    await expect(
      abba.saveManualUserAssignments([
        { userId: 'userA', experimentKey: experiment.key, bucketKey: 'test' },
        { userId: 'userB', experimentKey: 'NOPE', bucketKey: 'test' },
      ]),
    ).rejects.toThrow('Experiment does not exist: NOPE')
    const written = await userAssignmentsDAO.getBy('userId', 'userA')
    expect(written).toEqual([])
  })

  test('should throw when the experiment is soft-deleted', async () => {
    const experiment = await experimentsDAO.save(mockExperiment({ deleted: true }))
    await bucketsDAO.save(mockBucket(experiment.id, 'test', 100))

    await expect(
      abba.saveManualUserAssignments([
        { userId: mockUserId1, experimentKey: experiment.key, bucketKey: 'test' },
      ]),
    ).rejects.toThrow(`Experiment does not exist: ${experiment.key}`)
  })

  test('should throw when a bucket key does not belong to its experiment', async () => {
    const experiment = await experimentsDAO.save(mockExperiment())
    await bucketsDAO.save(mockBucket(experiment.id, 'test', 100))

    await expect(
      abba.saveManualUserAssignments([
        { userId: mockUserId1, experimentKey: experiment.key, bucketKey: 'control' },
      ]),
    ).rejects.toThrow(`Bucket does not exist on experiment ${experiment.key}: control`)
  })

  test.each([
    ['Active', AssignmentStatus.Active],
    ['Paused', AssignmentStatus.Paused],
    ['Inactive', AssignmentStatus.Inactive],
  ])('should succeed when the experiment status is %s', async (_name, status) => {
    const experiment = await experimentsDAO.save(mockExperiment({ status }))
    const bucket = await bucketsDAO.save(mockBucket(experiment.id, 'test', 100))

    const [result] = await abba.saveManualUserAssignments([
      { userId: mockUserId1, experimentKey: experiment.key, bucketKey: bucket.key },
    ])

    expect(result!.bucketId).toBe(bucket.id)
  })

  test('should ignore segmentation rules and sampling', async () => {
    const experiment = await experimentsDAO.save(
      mockExperiment({
        sampling: 0,
        rules: [{ key: 'country', operator: SegmentationRuleOperator.EqualsText, value: 'SE' }],
      }),
    )
    const bucket = await bucketsDAO.save(mockBucket(experiment.id, 'test', 100))

    const [result] = await abba.saveManualUserAssignments([
      { userId: mockUserId1, experimentKey: experiment.key, bucketKey: bucket.key },
    ])

    expect(result!.bucketId).toBe(bucket.id)
  })
})
