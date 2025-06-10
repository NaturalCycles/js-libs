import { localDate } from '@naturalcycles/js-lib'
import { describe, expect, test, vi } from 'vitest'
import {
  mockBucket,
  mockDecoratedUserAssignment,
  mockExperiment,
  mockUserExperiment,
} from './test/mocks.js'
import type { Bucket, ExclusionSet, SegmentationRule } from './types.js'
import { AssignmentStatus, SegmentationRuleOperator } from './types.js'
import { randomService } from './util.js'
import * as util from './util.js'

const experimentId = 'mockExperimentId'

describe('validateTotalBucketRatio', () => {
  test('sum of bucket ratios !== 100 throws', () => {
    const buckets: Bucket[] = [mockBucket(experimentId, 'A', 50), mockBucket(experimentId, 'A', 49)]
    expect(() => util.validateTotalBucketRatio(buckets)).toThrow(
      'Total bucket ratio must be 100 before you can activate an experiment',
    )
  })

  test('sum of bucket ratios === 100 does not throw', () => {
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

  test('returns null if excluded from sample population', () => {
    vi.spyOn(randomService, 'rollDie').mockReturnValueOnce(notIncludedInSample)

    const assignment = util.determineAssignment(sampleRatio, buckets)
    expect(assignment).toBeNull()
  })

  test('returns bucket by ratio allocation', () => {
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
    valid: string | number | boolean
    invalid: string | number | boolean
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
  ]

  for (const testcase of cases) {
    const key = 'myProp'
    test(`${testcase.operator} - Valid`, () => {
      const result = util.validateSegmentationRules(
        [{ key, operator: testcase.operator, value: testcase.ruleValue }],
        { myProp: testcase.valid },
      )
      expect(result).toBe(true)
    })

    test(`${testcase.operator} - Invalid`, () => {
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
  test('returns false if exclusionSet contains experimentId', () => {
    const exclusionSet: ExclusionSet = new Set()
    exclusionSet.add(experiment.id)

    const result = util.canGenerateNewAssignments(experiment, exclusionSet)
    expect(result).toBe(false)
  })

  test('true if active and within start/end date', () => {
    const result = util.canGenerateNewAssignments(experiment, new Set())

    expect(result).toBe(true)
  })

  test('false if not active', () => {
    const result = util.canGenerateNewAssignments(
      mockExperiment({ status: AssignmentStatus.Inactive }),
      new Set(),
    )

    expect(result).toBe(false)
  })

  test('false if not within start/end date', () => {
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

  test('returns a set containing mutually exclusive experiment ids where the user already has an assigment to a mutually exclusive experiment', () => {
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

  test('returns a set that does not include mutual exclusions for existing assignments where a user was excluded due to sampling rates. i.e bucketId=null', () => {
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
