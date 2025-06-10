import type { CommonDB } from '@naturalcycles/db-lib'
import { CommonDao } from '@naturalcycles/db-lib'
import type { IsoDate } from '@naturalcycles/js-lib'
import { localDate } from '@naturalcycles/js-lib'
import type { BaseExperiment, Experiment } from '../types.js'

export class ExperimentDao extends CommonDao<Experiment, ExperimentDBM> {
  async getAllExperiments(opt?: GetAllExperimentsOpts): Promise<Experiment[]> {
    if (!opt?.includeDeleted) {
      return await this.getAll()
    }

    return await this.query().filterEq('deleted', false).runQuery()
  }

  async getByKey(key: string): Promise<Experiment | null> {
    return await this.getOneBy('key', key)
  }
}

export function experimentDao(db: CommonDB): ExperimentDao {
  return new ExperimentDao({
    db,
    table: 'Experiment',
    hooks: {
      beforeBMToDBM: bm => ({
        ...bm,
        rules: bm.rules.length ? JSON.stringify(bm.rules) : null,
        // We add the map here to account for backwards compatibility where exclusion experimentIds were stored as a number
        // TODO: Remove after some time when we are certain only strings are stored
        exclusions: bm.exclusions.length
          ? JSON.stringify(bm.exclusions.map(exclusion => exclusion.toString()))
          : null,
        data: bm.data ? JSON.stringify(bm.data) : null,
      }),
      beforeDBMToBM: dbm => ({
        ...dbm,
        startDateIncl: parseMySQLDate(dbm.startDateIncl),
        endDateExcl: parseMySQLDate(dbm.endDateExcl),
        rules: (dbm.rules && JSON.parse(dbm.rules)) || [],
        // We add the map here to account for backwards compatibility where exclusion experimentIds were stored as a number
        // TODO: Remove after some time when we are certain only strings are stored
        exclusions:
          (dbm.exclusions &&
            JSON.parse(dbm.exclusions).map((exclusion: string | number) => exclusion.toString())) ||
          [],
        data: dbm.data ? JSON.parse(dbm.data) : null,
      }),
    },
  })
}

/**
 * https://nc1.slack.com/archives/CCNTHJT7V/p1682514277002739
 * MySQL Automatically parses Date fields as Date objects
 * For simplicity let's not do that by having this function...
 */
function parseMySQLDate(date: string): IsoDate {
  // @ts-expect-error
  if (date instanceof Date) return localDate(date).toISODate()
  return date as IsoDate
}

type ExperimentDBM = BaseExperiment & {
  rules: string | null
  exclusions: string | null
  data: string | null
}

export interface GetAllExperimentsOpts {
  includeDeleted?: boolean
}
