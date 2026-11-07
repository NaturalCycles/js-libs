/*

pnpm --dir packages/nodejs-lib exec tsx scripts/bench/ajvIsoDate.bench.script.ts

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import { localDate } from '@naturalcycles/js-lib/datetime'
import type { IsoDate, StringMap } from '@naturalcycles/js-lib/types'
import { j } from '../../src/validation/ajv/jSchema.js'

interface Entry {
  date: IsoDate
  cycleStartDate: IsoDate
  predictedMensDate?: IsoDate
  cd: number
  color: number
}

const entrySchema = j.object<Entry>({
  date: j.string().isoDate(),
  cycleStartDate: j.string().isoDate(),
  predictedMensDate: j.string().isoDate().optional(),
  cd: j.number(),
  color: j.number(),
})

const mapSchema = j.object<{ entries: StringMap<Entry> }>({
  entries: j.object.stringMap(entrySchema),
})
const optionalMapSchema = j.object<{ entries: StringMap<Entry | undefined> }>({
  entries: j.object.stringMap(entrySchema.optional()),
})
const recordSchema = j.object<{ entries: Record<IsoDate, Entry> }>({
  entries: j.object.record(j.string().isoDate(), entrySchema),
})
const arraySchema = j.array(entrySchema)

const start = localDate('2020-01-01' as IsoDate)
const entries: Entry[] = []
const map: StringMap<Entry> = {}
for (let i = 0; i < 2000; i++) {
  const date = start.plus(i, 'day').toISODate()
  const entry: Entry = {
    date,
    cycleStartDate: start.plus(i - (i % 29), 'day').toISODate(),
    predictedMensDate: start.plus(i - (i % 29) + 29, 'day').toISODate(),
    cd: (i % 29) + 1,
    color: (i % 4) + 1,
  }
  entries.push(entry)
  map[date] = entry
}

runBenchScript({
  fns: {
    stringMapOfIsoDates: () => mapSchema.validate({ entries: map }),
    stringMapOfOptionalIsoDates: () => optionalMapSchema.validate({ entries: map }),
    recordOfIsoDates: () => recordSchema.validate({ entries: map }),
    arrayOfIsoDates: () => arraySchema.validate(entries),
  },
  runs: 2,
})
