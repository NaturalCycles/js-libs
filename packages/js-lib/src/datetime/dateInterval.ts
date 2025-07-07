import type { IsoDate } from '../types.js'
import type { LocalDate, LocalDateInput, LocalDateUnit } from './localDate.js'
import { localDate } from './localDate.js'

export type DateIntervalConfig = DateInterval | DateIntervalString
export type DateIntervalString = string

/**
 * Class that supports ISO8601 "Time interval" standard that looks like `2022-02-24/2022-03-30`.
 *
 * @experimental
 */
export class DateInterval {
  private constructor(
    public start: LocalDate,
    public end: LocalDate,
  ) {}

  static of(start: LocalDateInput, end: LocalDateInput): DateInterval {
    return new DateInterval(localDate(start), localDate(end))
  }

  /**
   * Parses string like `2022-02-24/2023-03-30` into a DateInterval.
   */
  static parse(d: DateIntervalConfig): DateInterval {
    if (d instanceof DateInterval) return d

    const [start, end] = d.split('/') as IsoDate[]

    if (!end || !start) {
      throw new Error(`Cannot parse "${d}" into DateInterval`)
    }

    return new DateInterval(localDate(start), localDate(end))
  }

  isSame(d: DateIntervalConfig): boolean {
    return this.cmp(d) === 0
  }

  isBefore(d: DateIntervalConfig, inclusive = false): boolean {
    const r = this.cmp(d)
    return r === -1 || (r === 0 && inclusive)
  }

  isSameOrBefore(d: DateIntervalConfig): boolean {
    return this.cmp(d) <= 0
  }

  isAfter(d: DateIntervalConfig, inclusive = false): boolean {
    const r = this.cmp(d)
    return r === 1 || (r === 0 && inclusive)
  }

  isSameOrAfter(d: DateIntervalConfig): boolean {
    return this.cmp(d) >= 0
  }

  /**
   * Ranges of DateInterval (start, end) are INCLUSIVE.
   */
  includes(d: LocalDateInput): boolean {
    return localDate(d).isBetween(this.start, this.end, '[]')
  }

  intersects(int: DateIntervalConfig): boolean {
    const $int = DateInterval.parse(int)
    return this.includes($int.start) || this.includes($int.end)
  }

  /**
   * DateIntervals compare by start date.
   * If it's the same - then by end date.
   */
  cmp(d: DateIntervalConfig): -1 | 0 | 1 {
    d = DateInterval.parse(d)
    return this.start.compare(d.start) || this.end.compare(d.end)
  }

  getDays(): LocalDate[] {
    return localDate.range(this.start, this.end, '[]', 1, 'day')
  }

  /**
   * Returns an array of LocalDates that are included in the interval.
   */
  range(step = 1, stepUnit: LocalDateUnit = 'day'): LocalDate[] {
    return localDate.range(this.start, this.end, '[]', step, stepUnit)
  }

  toString(): DateIntervalString {
    return [this.start, this.end].join('/')
  }

  toJSON(): DateIntervalString {
    return this.toString()
  }
}
