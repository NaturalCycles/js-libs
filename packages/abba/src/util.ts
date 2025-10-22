import { localDate } from '@naturalcycles/js-lib/datetime'
import type { Unsaved } from '@naturalcycles/js-lib/types'
import { satisfies } from 'semver'
import type {
  Bucket,
  ExclusionSet,
  Experiment,
  ExperimentWithBuckets,
  SegmentationData,
  SegmentationRule,
  SegmentationRuleFn,
  UserAssignment,
  UserExperiment,
} from './types.js'
import { AssignmentStatus, SegmentationRuleOperator } from './types.js'

/**
 * Generate a new assignment for a given user.
 * Doesn't save it.
 */
export function generateUserAssignmentData(
  experiment: ExperimentWithBuckets,
  userId: string,
  segmentationData: SegmentationData,
): Unsaved<UserAssignment> | null {
  const segmentationMatch = validateSegmentationRules(experiment.rules, segmentationData)
  if (!segmentationMatch) return null

  const bucket = determineAssignment(experiment.sampling, experiment.buckets)

  return {
    userId,
    experimentId: experiment.id,
    bucketId: bucket?.id || null,
  }
}

class RandomService {
  /**
   * Generate a random number between 0 and 100
   */
  rollDie(): number {
    return Math.random() * 100
  }
}

export const randomService = new RandomService()

/**
 * Determines a users assignment for this experiment. Returns null if they are not considered to be in the sampling group
 */
export function determineAssignment(sampling: number, buckets: Bucket[]): Bucket | null {
  // Should this person be considered for the experiment?
  if (randomService.rollDie() > sampling) {
    return null
  }

  // get their bucket
  return determineBucket(buckets)
}

/**
 * Determines which bucket a user assignment will recieve
 */
export function determineBucket(buckets: Bucket[]): Bucket {
  const bucketRoll = randomService.rollDie()
  let range: [number, number] | undefined
  const bucket = buckets.find(b => {
    if (!range) {
      range = [0, b.ratio]
    } else {
      range = [range[1], range[1] + b.ratio]
    }

    if (bucketRoll > range[0] && bucketRoll <= range[1]) {
      return b
    }
  })

  if (!bucket) {
    throw new Error('Could not detetermine bucket from ratios')
  }

  return bucket
}

/**
 * Validate the total ratio of the buckets equals 100
 */
export function validateTotalBucketRatio(buckets: Unsaved<Bucket>[]): void {
  const bucketSum = buckets.reduce((sum, current) => sum + current.ratio, 0)
  if (bucketSum !== 100) {
    throw new Error('Total bucket ratio must be 100 before you can activate an experiment')
  }
}

/**
 * Validate a users segmentation data against multiple rules. Returns false if any fail
 *
 * @param rules
 * @param segmentationData
 * @returns
 */
export function validateSegmentationRules(
  rules: SegmentationRule[],
  segmentationData: SegmentationData,
): boolean {
  for (const rule of rules) {
    const { key, value, operator } = rule
    if (!segmentationRuleMap[operator](segmentationData[key], value)) return false
  }
  return true
}

/**
 * Map of segmentation rule validators
 */
export const segmentationRuleMap: Record<SegmentationRuleOperator, SegmentationRuleFn> = {
  [SegmentationRuleOperator.IsSet](keyValue) {
    return !!keyValue
  },
  [SegmentationRuleOperator.IsNotSet](keyValue) {
    return !keyValue
  },
  [SegmentationRuleOperator.EqualsText](keyValue, ruleValue) {
    return keyValue?.toString() === ruleValue.toString()
  },
  [SegmentationRuleOperator.NotEqualsText](keyValue, ruleValue) {
    return keyValue?.toString() !== ruleValue.toString()
  },
  [SegmentationRuleOperator.Semver](keyValue, ruleValue) {
    return satisfies(keyValue?.toString() || '', ruleValue.toString())
  },
  [SegmentationRuleOperator.Regex](keyValue, ruleValue) {
    return new RegExp(ruleValue).test(keyValue?.toString() || '')
  },
  [SegmentationRuleOperator.Boolean](keyValue, ruleValue) {
    // If it's true, then must be true
    if (ruleValue === 'true') return keyValue?.toString() === 'true'
    // Anything else cannot be true
    return keyValue?.toString() !== 'true'
  },
  [SegmentationRuleOperator.GreaterThan](keyValue, ruleValue) {
    if (keyValue === null || keyValue === undefined) return false
    return keyValue > ruleValue
  },
  [SegmentationRuleOperator.LessThan](keyValue, ruleValue) {
    if (keyValue === null || keyValue === undefined) return false
    return keyValue < ruleValue
  },
}

/**
 * Returns true if an experiment is able to generate new assignments based on status and start/end dates
 */
export function canGenerateNewAssignments(
  experiment: Experiment,
  exclusionSet: ExclusionSet,
): boolean {
  return (
    !exclusionSet.has(experiment.id) &&
    experiment.status === AssignmentStatus.Active &&
    localDate.today().isBetween(experiment.startDateIncl, experiment.endDateExcl, '[)')
  )
}

/**
 * Returns an object that includes keys of all experimentIds a user should not be assigned to
 * based on a combination of existing assignments and mutual exclusion configuration
 */
export function getUserExclusionSet(experiments: UserExperiment[]): ExclusionSet {
  const exclusionSet: ExclusionSet = new Set()
  experiments.forEach(experiment => {
    const { userAssignment } = experiment
    // Users who are excluded from an experiment due to sampling
    // should not prevent potential assignment to other mutually exclusive experiments
    if (!userAssignment || userAssignment?.bucketId === null) return

    experiment.exclusions.forEach(experimentId => exclusionSet.add(experimentId))
  })
  return exclusionSet
}
