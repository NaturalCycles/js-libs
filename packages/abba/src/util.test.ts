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
  interface TestCase {
    operator: SegmentationRuleOperator
    ruleValue: SegmentationRule['value']
    valid: Parameters<SegmentationRuleFn>[0]
    invalid: Parameters<SegmentationRuleFn>[0]
  }

  const cases: TestCase[] = [
    {
      operator: SegmentationRuleOperator.EqualsText,
      ruleValue: 'Yes way Marvin Gaye',
      valid: 'Yes way Marvin Gaye',
      invalid: 'No way jose',
    },
    {
      operator: SegmentationRuleOperator.NotEqualsText,
      ruleValue: 'No way jose',
      valid: 'Yes way Marvin Gaye',
      invalid: 'No way jose',
    },
    {
      operator: SegmentationRuleOperator.IsSet,
      ruleValue: '',
      valid: 'Not Empty',
      invalid: '',
    },
    {
      operator: SegmentationRuleOperator.IsNotSet,
      ruleValue: '',
      valid: '',
      invalid: 'Not Empty',
    },
    {
      operator: SegmentationRuleOperator.Semver,
      ruleValue: '>3.2.1',
      valid: '3.2.2',
      invalid: '3.2.0',
    },
    {
      operator: SegmentationRuleOperator.Regex,
      ruleValue: 'app|app2',
      valid: 'app',
      invalid: 'website',
    },
    {
      operator: SegmentationRuleOperator.Boolean,
      ruleValue: 'true',
      valid: 'true',
      invalid: 'false',
    },
    {
      operator: SegmentationRuleOperator.Boolean,
      ruleValue: 'false',
      valid: 'false',
      invalid: 'true',
    },
    {
      operator: SegmentationRuleOperator.Boolean,
      ruleValue: 'false',
      valid: '',
      invalid: 'true',
    },
    {
      operator: SegmentationRuleOperator.Boolean,
      ruleValue: 'true',
      valid: true,
      invalid: false,
    },
    {
      operator: SegmentationRuleOperator.Boolean,
      ruleValue: 'false',
      valid: false,
      invalid: true,
    },
    {
      operator: SegmentationRuleOperator.LessThan,
      ruleValue: '2021-01-11',
      valid: '2021-01-01',
      invalid: '2021-01-21',
    },
    {
      operator: SegmentationRuleOperator.LessThan,
      ruleValue: '2',
      valid: '1',
      invalid: '3',
    },
    {
      operator: SegmentationRuleOperator.LessThan,
      ruleValue: '2',
      valid: 1,
      invalid: 3,
    },
    {
      operator: SegmentationRuleOperator.LessThan,
      ruleValue: 'b',
      valid: 'a',
      invalid: 'c',
    },
    {
      operator: SegmentationRuleOperator.LessThan,
      ruleValue: '2',
      valid: '1',
      invalid: null,
    },
    {
      operator: SegmentationRuleOperator.LessThan,
      ruleValue: '2',
      valid: '1',
      invalid: undefined,
    },
    {
      operator: SegmentationRuleOperator.GreaterThan,
      ruleValue: '2021-01-11',
      valid: '2021-01-21',
      invalid: '2021-01-01',
    },
    {
      operator: SegmentationRuleOperator.GreaterThan,
      ruleValue: '2',
      valid: '3',
      invalid: '1',
    },
    {
      operator: SegmentationRuleOperator.GreaterThan,
      ruleValue: '2',
      valid: 3,
      invalid: 1,
    },
    {
      operator: SegmentationRuleOperator.GreaterThan,
      ruleValue: 'b',
      valid: 'c',
      invalid: 'a',
    },
    {
      operator: SegmentationRuleOperator.GreaterThan,
      ruleValue: '2',
      valid: '3',
      invalid: null,
    },
    {
      operator: SegmentationRuleOperator.GreaterThan,
      ruleValue: '2',
      valid: '3',
      invalid: undefined,
    },
  ]

  for (const testcase of cases) {
    const key = 'myProp'
    it(`should accept ${JSON.stringify(testcase.valid)} for ${testcase.operator} ${JSON.stringify(testcase.ruleValue)}`, () => {
      const result = util.validateSegmentationRules(
        [{ key, operator: testcase.operator, value: testcase.ruleValue }],
        { myProp: testcase.valid },
      )
      expect(result).toBe(true)
    })

    it(`should reject ${JSON.stringify(testcase.invalid)} for ${testcase.operator} ${JSON.stringify(testcase.ruleValue)}`, () => {
      const result = util.validateSegmentationRules(
        [{ key, operator: testcase.operator, value: testcase.ruleValue }],
        { myProp: testcase.invalid },
      )
      expect(result).toBe(false)
    })
  }
})

describe('canGenerateNewAssignments', () => {
  const experiment = mockExperiment()
  it('should return false when the experiment is in the exclusion set', () => {
    const exclusionSet: ExclusionSet = new Set([experiment.id])

    const result = util.canGenerateNewAssignments(experiment, exclusionSet)
    expect(result).toBe(false)
  })

  it('should return true for an active experiment within its dates', () => {
    const result = util.canGenerateNewAssignments(experiment, new Set())

    expect(result).toBe(true)
  })

  it('should return false for an inactive experiment', () => {
    const result = util.canGenerateNewAssignments(
      mockExperiment({ status: AssignmentStatus.Inactive }),
      new Set(),
    )

    expect(result).toBe(false)
  })

  it('should return false for an experiment that has ended', () => {
    const result = util.canGenerateNewAssignments(
      mockExperiment({
        startDateIncl: localDate.today().minus(2, 'day').toISODate(),
        endDateExcl: localDate.today().minus(1, 'day').toISODate(),
      }),
      new Set(),
    )

    expect(result).toBe(false)
  })
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
