import type { CommonDB } from '@naturalcycles/db-lib'
import type { AnyObject, BaseDBEntity, IsoDate } from '@naturalcycles/js-lib/types'

export interface AbbaConfig {
  db: CommonDB
}

export type BaseExperiment = BaseDBEntity & {
  /**
   * Human readable name of the experiment
   * To be used for referencing the experiment in the UI
   */
  key: string
  /**
   * Status of the experiment
   */
  status: AssignmentStatus
  /**
   * Percentage of eligible users to include in the experiment
   */
  sampling: number
  /**
   * Description of the experiment, such as the hypothesis
   */
  description: string | null
  /**
   * Date range start for the experiment assignments
   */
  startDateIncl: IsoDate
  /**
   * Date range end for the experiment assignments
   */
  endDateExcl: IsoDate
  /**
   * Whether the experiment is flagged as deleted. This acts as a soft delete only.
   */
  deleted: boolean
}

export type Experiment = BaseExperiment & {
  rules: SegmentationRule[]
  exclusions: string[]
  data: AnyObject | null
}

export type ExperimentWithBuckets = Experiment & {
  buckets: Bucket[]
}

export type BaseBucket = BaseDBEntity & {
  experimentId: string
  key: string
  ratio: number
}

export type Bucket = BaseBucket & {
  data: AnyObject | null
}

export type UserAssignment = BaseDBEntity & {
  userId: string
  experimentId: string
  bucketId: string | null
}

export type DecoratedUserAssignment = UserAssignment & {
  experimentKey: Experiment['key']
  experimentData: Experiment['data']
  bucketKey: Bucket['key'] | null
  bucketData: Bucket['data']
}

export type SegmentationData = AnyObject

export enum AssignmentStatus {
  /**
   * Will return existing assignments and generate new assignments
   */
  Active = 1,
  /**
   * Will return existing assignments but not generate new assignments
   */
  Paused = 2,
  /**
   * Will not return any assignments
   */
  Inactive = 3,
}

export interface SegmentationRule {
  key: string
  operator: SegmentationRuleOperator
  value: string
}

export enum SegmentationRuleOperator {
  IsSet = 'isSet',
  IsNotSet = 'isNotSet',
  EqualsText = 'equalsText',
  NotEqualsText = 'notEqualsText',
  Semver = 'semver',
  Regex = 'regex',
  /* eslint-disable id-denylist */
  Boolean = 'boolean',
}

export type SegmentationRuleFn = (
  segmentationProp: string | boolean | number | null | undefined,
  ruleValue: SegmentationRule['value'],
) => boolean

export interface ExperimentAssignmentStatistics {
  /**
   * Total number of users that were included in the experiment.
   * This includes the users who were sampled and assigned to a bucket.
   */
  totalAssignments: number
  /**
   * Number of users that were assigned to each bucket in the experiment
   */
  bucketAssignments: BucketAssignmentStatistics[]
}

export interface BucketAssignmentStatistics {
  bucketId: string
  totalAssignments: number
}

export type ExclusionSet = Set<string>

export interface UserExperiment extends ExperimentWithBuckets {
  userAssignment?: DecoratedUserAssignment
}
