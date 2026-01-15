import type { IsoDate, IsoDateTime } from '../types.js'
// oxlint-disable-next-line import/no-cycle -- intentional cycle
import { LocalDate } from './localDate.js'
import type { DateTimeObject, LocalTime } from './localTime.js'
import { localTime } from './localTime.js'

/**
 * Representation of a "time on the wall clock",
 * which means "local time, regardless of timezone".
 *
 * Experimental simplified container object to hold
 * date and time components as numbers.
 * No math or manipulation is possible here.
 * Can be pretty-printed as Date, Time or DateAndTime.
 */
export class WallTime implements DateTimeObject {
  year!: number
  month!: number
  day!: number
  hour!: number
  minute!: number
  second!: number

  constructor(obj: DateTimeObject) {
    Object.assign(this, obj)
  }

  toLocalDate(): LocalDate {
    return new LocalDate(this.year, this.month, this.day)
  }

  /**
   * Example:
   * WallTime is 1984-06-21 17:56:21
   * .toLocalTime() will return a LocalTime Date instance
   * holding that time in the local timezone.
   */
  toLocalTime(): LocalTime {
    return localTime.fromDateTimeObject(this)
  }

  toJSON(): IsoDateTime {
    return this.toISODateTime()
  }

  toString(): IsoDateTime {
    return this.toISODateTime()
  }

  /**
   * Returns e.g: `1984-06-21 17:56:21`
   * or (if seconds=false):
   * `1984-06-21 17:56`
   */
  toPretty(seconds = true): string {
    return this.toISODate() + ' ' + this.toISOTime(seconds)
  }

  /**
   * Returns e.g: `1984-06-21T17:56:21`
   */
  toISODateTime(): IsoDateTime {
    return (this.toISODate() + 'T' + this.toISOTime()) as IsoDateTime
  }

  /**
   * Returns e.g: `1984-06-21`, only the date part of DateTime
   */
  toISODate(): IsoDate {
    return [
      String(this.year).padStart(4, '0'),
      String(this.month).padStart(2, '0'),
      String(this.day).padStart(2, '0'),
    ].join('-') as IsoDate
  }

  /**
   * Returns e.g: `17:03:15` (or `17:03` with seconds=false)
   */
  toISOTime(seconds = true): string {
    return [
      String(this.hour).padStart(2, '0'),
      String(this.minute).padStart(2, '0'),
      seconds && String(this.second).padStart(2, '0'),
    ]
      .filter(Boolean)
      .join(':')
  }
}
