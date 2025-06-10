import type { UnixTimestamp } from '@naturalcycles/js-lib'
import { localDate } from '@naturalcycles/js-lib'
import { stringId } from '@naturalcycles/nodejs-lib'
import type {
  Bucket,
  DecoratedUserAssignment,
  Experiment,
  UserAssignment,
  UserExperiment,
} from '../types.js'
import { AssignmentStatus } from '../types.js'

export const mockUserId1 = 'mockUserId1'

export function mockExperiment(opts?: Partial<Experiment>): Experiment {
  return {
    id: stringId(),
    key: 'MOCK_EXPERIMENT',
    description: null,
    exclusions: [],
    rules: [],
    sampling: 100,
    status: AssignmentStatus.Active,
    startDateIncl: localDate.today().toISODate(),
    endDateExcl: localDate.today().plus(1, 'month').toISODate(),
    created: 0 as UnixTimestamp,
    updated: 0 as UnixTimestamp,
    data: null,
    deleted: false,
    ...opts,
  }
}

export function mockBucket(
  experimentId: string,
  key: string,
  ratio: number,
  opts?: Partial<Bucket>,
): Bucket {
  return {
    id: stringId(),
    experimentId,
    key,
    ratio,
    data: null,
    created: 0 as UnixTimestamp,
    updated: 0 as UnixTimestamp,
    ...opts,
  }
}

export function mockUserAssignment(
  experimentId: string,
  bucketId: string | null,
  opts?: Partial<UserAssignment>,
): UserAssignment {
  return {
    id: stringId(),
    userId: mockUserId1,
    experimentId,
    bucketId,
    created: 0 as UnixTimestamp,
    updated: 0 as UnixTimestamp,
    ...opts,
  }
}

export function mockUserExperiment(opts?: Partial<UserExperiment>): UserExperiment {
  return {
    ...mockExperiment(),
    buckets: [],
    ...opts,
  }
}

export function mockDecoratedUserAssignment(
  opts?: Partial<DecoratedUserAssignment>,
): DecoratedUserAssignment {
  const experiment = mockExperiment()
  return {
    ...mockUserAssignment(experiment.id, null),
    experimentKey: experiment.key,
    experimentData: null,
    bucketKey: null,
    bucketData: null,
    ...opts,
  }
}
