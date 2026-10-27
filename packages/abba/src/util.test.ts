import { localDate } from '@naturalcycles/js-lib/datetime'
import { describe, expect, it, vi } from 'vitest'
import {
  mockBucket,
  mockDecoratedUserAssignment,
  mockExperiment,
  mockUserExperiment,
} from './test/mocks.js'
import type { Bucket, ExclusionSet, SegmentationRule, SegmentationRuleFn } from './types.js'
import { AssignmentStatus, SegmentationRuleOperator } from './types.js'
import { randomService } from './util.js'
import * as util from './util.js'

const experimentId = 'mockExperimentId'

describe('validateTotalBucketRatio', () => {
  it('should throw when the bucket ratios do not sum to 100', () => {
    const buckets: Bucket[] = [mockBucket(experimentId, 'A', 50), mockBucket(experimentId, 'A', 49)]
    expect(() => util.validateTotalBucketRatio(buckets)).toThrow(
      'Total bucket ratio must be 100 before you can activate an experiment',
    )
  })

  it('should not throw when the bucket ratios sum to 100', () => {
    const buckets: Bucket[] = [mockBucket(experimentId, 'A', 50), mockBucket(experimentId, 'A', 50)]
    expect(() => util.validateTotalBucketRatio(buckets)).not.toThrow()
  })
})

describe('determineAssignment', () => {
  const sampleRatio = 50
  const notIncludedInSample = sampleRatio + 1
  const includedInSample = sampleRatio - 1
  const buckets: Bucket[] = [
    mockBucket(experimentId, 'A', 33),
    mockBucket(experimentId, 'B', 33),
    mockBucket(experimentId, 'C', 34),
  ]

  it('should return null when the roll falls outside the sample', () => {
    vi.spyOn(randomService, 'rollDie').mockReturnValueOnce(notIncludedInSample)

    const assignment = util.determineAssignment(sampleRatio, buckets)
    expect(assignment).toBeNull()
  })

  it('should pick the bucket whose ratio range contains the roll', () => {
    vi.spyOn(randomService, 'rollDie').mockReturnValueOnce(includedInSample).mockReturnValueOnce(30)

    const assignment1 = util.determineAssignment(sampleRatio, buckets)
    expect(assignment1).toEqual(buckets[0]) // Bucket A

    vi.spyOn(randomService, 'rollDie').mockReturnValueOnce(includedInSample).mockReturnValueOnce(60)

    const assignment2 = util.determineAssignment(sampleRatio, buckets)
    expect(assignment2).toEqual(buckets[1]) // Bucket B

    vi.spyOn(randomService, 'rollDie').mockReturnValueOnce(includedInSample).mockReturnValueOnce(90)

    const assignment3 = util.determineAssignment(sampleRatio, buckets)
    expect(assignment3).toEqual(buckets[2]) // Bucket C
  })
})

describe('validateSegmentationRules', () => {
  type TestCase = [
    input: Parameters<SegmentationRuleFn>[0],
    operator: SegmentationRuleOperator,
    ruleValue: SegmentationRule['value'],
  ]

  const key = 'myProp'

  const acceptedCases: TestCase[] = [
    ['Yes way Marvin Gaye', SegmentationRuleOperator.EqualsText, 'Yes way Marvin Gaye'],
    ['Yes way Marvin Gaye', SegmentationRuleOperator.NotEqualsText, 'No way jose'],
    ['Not Empty', SegmentationRuleOperator.IsSet, ''],
    ['', SegmentationRuleOperator.IsNotSet, ''],
    ['3.2.2', SegmentationRuleOperator.Semver, '>3.2.1'],
    ['app', SegmentationRuleOperator.Regex, 'app|app2'],
    ['true', SegmentationRuleOperator.Boolean, 'true'],
    ['false', SegmentationRuleOperator.Boolean, 'false'],
    ['', SegmentationRuleOperator.Boolean, 'false'],
    [true, SegmentationRuleOperator.Boolean, 'true'],
    [false, SegmentationRuleOperator.Boolean, 'false'],
    ['2021-01-01', SegmentationRuleOperator.LessThan, '2021-01-11'],
    ['1', SegmentationRuleOperator.LessThan, '2'],
    [1, SegmentationRuleOperator.LessThan, '2'],
    ['a', SegmentationRuleOperator.LessThan, 'b'],
    ['2021-01-21', SegmentationRuleOperator.GreaterThan, '2021-01-11'],
    ['3', SegmentationRuleOperator.GreaterThan, '2'],
    [3, SegmentationRuleOperator.GreaterThan, '2'],
    ['c', SegmentationRuleOperator.GreaterThan, 'b'],
  ]

  const rejectedCases: TestCase[] = [
    ['No way jose', SegmentationRuleOperator.EqualsText, 'Yes way Marvin Gaye'],
    ['No way jose', SegmentationRuleOperator.NotEqualsText, 'No way jose'],
    ['', SegmentationRuleOperator.IsSet, ''],
    ['Not Empty', SegmentationRuleOperator.IsNotSet, ''],
    ['3.2.0', SegmentationRuleOperator.Semver, '>3.2.1'],
    ['website', SegmentationRuleOperator.Regex, 'app|app2'],
    ['false', SegmentationRuleOperator.Boolean, 'true'],
    ['true', SegmentationRuleOperator.Boolean, 'false'],
    [false, SegmentationRuleOperator.Boolean, 'true'],
    [true, SegmentationRuleOperator.Boolean, 'false'],
    ['2021-01-21', SegmentationRuleOperator.LessThan, '2021-01-11'],
    ['3', SegmentationRuleOperator.LessThan, '2'],
    [3, SegmentationRuleOperator.LessThan, '2'],
    ['c', SegmentationRuleOperator.LessThan, 'b'],
    [null, SegmentationRuleOperator.LessThan, '2'],
    [undefined, SegmentationRuleOperator.LessThan, '2'],
    ['2021-01-01', SegmentationRuleOperator.GreaterThan, '2021-01-11'],
    ['1', SegmentationRuleOperator.GreaterThan, '2'],
    [1, SegmentationRuleOperator.GreaterThan, '2'],
    ['a', SegmentationRuleOperator.GreaterThan, 'b'],
    [null, SegmentationRuleOperator.GreaterThan, '2'],
    [undefined, SegmentationRuleOperator.GreaterThan, '2'],
  ]

  it.each(acceptedCases)('should accept %j for %s %j', (input, operator, ruleValue) => {
    const result = util.validateSegmentationRules([{ key, operator, value: ruleValue }], {
      [key]: input,
    })
    expect(result).toBe(true)
  })

  it.each(rejectedCases)('should reject %j for %s %j', (input, operator, ruleValue) => {
    const result = util.validateSegmentationRules([{ key, operator, value: ruleValue }], {
      [key]: input,
    })
    expect(result).toBe(false)
  })
})

describe('canGenerateNewAssignments', () => {
  const experiment = mockExperiment()
  it('should return false when the experiment is in the exclusion set', () => {
    const exclusionSet: ExclusionSet = new Set([experiment.id])

    const result = util.canGenerateNewAssignments(experiment, exclusionSet)
    expect(result).toBe(false)
  })

  it('should return true for an active experiment on its start date', () => {
    const result = util.canGenerateNewAssignments(
      mockExperiment({ startDateIncl: localDate.today().toISODate() }),
      new Set(),
    )

    expect(result).toBe(true)
  })

  it('should return false for an inactive experiment', () => {
    const result = util.canGenerateNewAssignments(
      mockExperiment({ status: AssignmentStatus.Inactive }),
      new Set(),
    )

    expect(result).toBe(false)
  })

  it.each([
    ['has ended', -2, -1],
    ['ends today', -1, 0],
    ['starts tomorrow', 1, 2],
  ])(
    'should return false for an experiment that %s',
    (_name, startDaysFromToday, endDaysFromToday) => {
      const result = util.canGenerateNewAssignments(
        mockExperiment({
          startDateIncl: localDate.today().plus(startDaysFromToday, 'day').toISODate(),
          endDateExcl: localDate.today().plus(endDaysFromToday, 'day').toISODate(),
        }),
        new Set(),
      )

      expect(result).toBe(false)
    },
  )
})

describe('getUserExclusionSet', () => {
  const experiment1Id = 'mockExperiment1'
  const experiment2Id = 'mockExperiment2'

  it('should exclude the experiments mutually exclusive with one the user is assigned to', () => {
    const experiment1 = mockUserExperiment({
      id: experiment1Id,
      exclusions: [experiment2Id],
      userAssignment: mockDecoratedUserAssignment({ experimentId: experiment1Id, bucketId: '123' }),
    })
    const experiment2 = mockUserExperiment({
      id: experiment2Id,
      exclusions: [experiment1Id],
    })

    const set = util.getUserExclusionSet([experiment1, experiment2])

    expect(set.size).toBe(1)
    // Should include experiment2 id as user already has an assignment to mutually exclusive experiment1
    expect(set.has(experiment2.id)).toBe(true)
  })

  it('should not exclude anything for an assignment without a bucket', () => {
    const experiment1 = mockUserExperiment({
      id: experiment1Id,
      exclusions: [experiment2Id],
      userAssignment: mockDecoratedUserAssignment({ experimentId: experiment1Id, bucketId: null }),
    })
    const experiment2 = mockUserExperiment({
      id: experiment2Id,
      exclusions: [experiment1Id],
    })

    const set = util.getUserExclusionSet([experiment1, experiment2])

    expect(set.size).toBe(0)
  })
})
