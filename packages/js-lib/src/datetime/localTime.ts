import { _assert } from '../error/assert.js'
import type {
  IANATimezone,
  Inclusiveness,
  IsoDate,
  IsoDateTime,
  IsoMonth,
  MonthId,
  MutateOptions,
  NumberOfHours,
  NumberOfMinutes,
  SortDirection,
  UnixTimestamp,
  UnixTimestampMillis,
} from '../types.js'
import type { LocalDate } from './localDate.js'
import { localDate } from './localDate.js'
import { _ms } from './time.util.js'
import { WallTime } from './wallTime.js'

export type LocalTimeUnit = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second'

export enum ISODayOfWeek {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 7,
}

export type LocalTimeInput = LocalTime | Date | IsoDate | IsoDateTime | UnixTimestamp
export type LocalTimeInputNullable = LocalTimeInput | null | undefined
export type LocalTimeFormatter = (ld: LocalTime) => string

export type DateTimeObject = DateObject & TimeObject
export type DateTimeObjectInput = DateObject & Partial<TimeObject>

export interface DateObject {
  year: number
  month: number
  day: number
}

export interface TimeObject {
  hour: number
  minute: number
  second: number
}

const weekStartsOn = 1 // mon, as per ISO
const MILLISECONDS_IN_WEEK = 604800000
const SECONDS_IN_DAY = 86400
// const MILLISECONDS_IN_DAY = 86400000
// const MILLISECONDS_IN_MINUTE = 60000
export const VALID_DAYS_OF_WEEK = new Set([1, 2, 3, 4, 5, 6, 7])

/**
 * It supports 2 forms:
 * 1. 2023-03-03
 * 2. 2023-03-03T05:10:02
 */
const DATE_TIME_REGEX_LOOSE = /^(\d{4})-(\d{2})-(\d{2})([Tt\s](\d{2}):?(\d{2})?:?(\d{2})?)?/
/**
 * Supports 2 forms:
 * 1. 2023-03-03
 * 2. 2023-03-03T05:10:02
 * Ok, now it allows arbitrary stuff after `:ss`, to allow millis/timezone info,
 * but it will not take it into account.
 */
const DATE_TIME_REGEX_STRICT = /^(\d{4})-(\d{2})-(\d{2})[Tt\s](\d{2}):(\d{2}):(\d{2})/
const DATE_REGEX_STRICT = /^(\d\d\d\d)-(\d\d)-(\d\d)$/

export class LocalTime {
  constructor(public $date: Date) {}

  /**
   * Returns [cloned] LocalTime that is based on the same unixtimestamp, but in UTC timezone.
   * Opposite of `.local()` method.
   */
  toUTC(): LocalTime {
    return new LocalTime(new Date(this.$date.toISOString()))
  }

  /**
   * Returns [cloned] LocalTime that is based on the same unixtimestamp, but in local timezone.
   * Opposite of `.utc()` method.
   */
  toLocal(): LocalTime {
    return new LocalTime(new Date(this.$date))
  }

  /**
   * Returns [cloned] fake LocalTime that has yyyy-mm-dd hh:mm:ss in the provided timezone.
   * It is a fake LocalTime in a sense that it's timezone is not real.
   * See this ("common errors"): https://stackoverflow.com/a/15171030/4919972
   * Fake also means that unixTimestamp of that new LocalDate is not the same.
   * For that reason we return WallTime, and not a LocalTime.
   * WallTime can be pretty-printed as Date-only, Time-only or DateAndTime.
   *
   * E.g `inTimezone('America/New_York').toISOTime()`
   *
   * https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
   *
   * @experimental
   */
  inTimezone(tz: IANATimezone): WallTime {
    const d = new Date(this.$date.toLocaleString('en-US', { timeZone: tz }))
    return new WallTime({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      second: d.getSeconds(),
    })
  }

  /**
   * UTC offset is the opposite of "timezone offset" - it's the number of minutes to add
   * to the local time to get UTC time.
   *
   * E.g utcOffset for CEST is -120,
   * which means that you need to add -120 minutes to the local time to get UTC time.
   *
   * Instead of -0 it returns 0, for the peace of mind and less weird test/snapshot differences.
   *
   * If timezone (tz) is specified, e.g `America/New_York`,
   * it will return the UTC offset for that timezone.
   *
   * https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
   */
  getUTCOffsetMinutes(tz?: IANATimezone): NumberOfMinutes {
    if (tz) {
      // based on: https://stackoverflow.com/a/53652131/4919972
      const nowTime = this.$date.getTime()
      const tzTime = new Date(this.$date.toLocaleString('en-US', { timeZone: tz })).getTime()
      return Math.round((tzTime - nowTime) / 60000) || 0
    }

    return -this.$date.getTimezoneOffset() || 0
  }

  /**
   * Same as getUTCOffsetMinutes, but rounded to hours.
   *
   * E.g for CEST it is -2.
   *
   * Instead of -0 it returns 0, for the peace of mind and less weird test/snapshot differences.
   *
   * If timezone (tz) is specified, e.g `America/New_York`,
   * it will return the UTC offset for that timezone.
   */
  getUTCOffsetHours(tz?: IANATimezone): NumberOfHours {
    return Math.round(this.getUTCOffsetMinutes(tz) / 60)
  }

  /**
   * Returns e.g `-05:00` for New_York winter time.
   */
  getUTCOffsetString(tz: IANATimezone): string {
    const minutes = this.getUTCOffsetMinutes(tz)
    const hours = Math.trunc(minutes / 60)
    const sign = hours < 0 ? '-' : '+'
    const h = String(Math.abs(hours)).padStart(2, '0')
    const m = String(minutes % 60).padStart(2, '0')
    return `${sign}${h}:${m}`
  }

  get(unit: LocalTimeUnit): number {
    if (unit === 'year') {
      return this.$date.getFullYear()
    }
    if (unit === 'month') {
      return this.$date.getMonth() + 1
    }
    if (unit === 'day') {
      return this.$date.getDate()
    }
    if (unit === 'hour') {
      return this.$date.getHours()
    }
    if (unit === 'minute') {
      return this.$date.getMinutes()
    }
    if (unit === 'week') {
      return getWeek(this.$date)
    }
    // second
    return this.$date.getSeconds()
  }

  set(unit: LocalTimeUnit, v: number, opt: MutateOptions = {}): LocalTime {
    const t = opt.mutate ? this : this.clone()

    if (unit === 'year') {
      t.$date.setFullYear(v)
    } else if (unit === 'month') {
      t.$date.setMonth(v - 1)
    } else if (unit === 'day') {
      t.$date.setDate(v)
    } else if (unit === 'hour') {
      t.$date.setHours(v)
    } else if (unit === 'minute') {
      t.$date.setMinutes(v)
    } else if (unit === 'second') {
      t.$date.setSeconds(v)
    } else if (unit === 'week') {
      setWeek(t.$date, v, { mutate: true })
    }

    return t
  }

  get year(): number {
    return this.$date.getFullYear()
  }

  setYear(v: number): LocalTime {
    return this.set('year', v)
  }

  get month(): number {
    return this.$date.getMonth() + 1
  }

  setMonth(v: number): LocalTime {
    return this.set('month', v)
  }

  get week(): number {
    return getWeek(this.$date)
  }

  setWeek(v: number): LocalTime {
    return this.set('week', v)
  }

  get day(): number {
    return this.$date.getDate()
  }

  setDay(v: number): LocalTime {
    return this.set('day', v)
  }

  get hour(): number {
    return this.$date.getHours()
  }

  setHour(v: number): LocalTime {
    return this.set('hour', v)
  }

  get minute(): number {
    return this.$date.getMinutes()
  }

  setMinute(v: number): LocalTime {
    return this.set('minute', v)
  }

  get second(): number {
    return this.$date.getSeconds()
  }

  setSecond(v: number): LocalTime {
    return this.set('second', v)
  }

  /**
   * Based on ISO: 1-7 is Mon-Sun.
   */
  get dayOfWeek(): ISODayOfWeek {
    return (this.$date.getDay() || 7) as ISODayOfWeek
  }

  /**
   * Returns LocalTime for the given DayOfWeek (e.g Monday), that is in the same week as this.
   * It may move the time into the future, or the past, depending on how the desired DayOfWeek is in
   * relation to `this`.
   */
  setDayOfWeek(dow: ISODayOfWeek): LocalTime {
    _assert(VALID_DAYS_OF_WEEK.has(dow), `Invalid dayOfWeek: ${dow}`)
    const delta = dow - this.dayOfWeek
    return this.plus(delta, 'day')
  }

  /**
   * Returns LocalTime for the given DayOfWeek (e.g Monday), that is in the future,
   * in relation to this.
   * If this LocalTime is Monday, and desired DoW is also Monday - `this` is returned.
   */
  setNextDayOfWeek(dow: ISODayOfWeek): LocalTime {
    _assert(VALID_DAYS_OF_WEEK.has(dow), `Invalid dayOfWeek: ${dow}`)
    let delta = dow - this.dayOfWeek
    if (delta < 0) delta += 7
    return this.plus(delta, 'day')
  }

  setComponents(c: Partial<DateTimeObject>, opt: MutateOptions = {}): LocalTime {
    const d = opt.mutate ? this.$date : new Date(this.$date)

    // Year, month and day set all-at-once, to avoid 30/31 (and 28/29) mishap
    if (c.day || c.month !== undefined || c.year !== undefined) {
      d.setFullYear(
        c.year ?? d.getFullYear(),
        c.month ? c.month - 1 : d.getMonth(),
        c.day || d.getDate(),
      )
    }

    if (c.hour !== undefined) {
      d.setHours(c.hour)
    }
    if (c.minute !== undefined) {
      d.setMinutes(c.minute)
    }
    if (c.second !== undefined) {
      d.setSeconds(c.second)
    }

    return opt.mutate ? this : new LocalTime(d)
  }

  plusSeconds(num: number): LocalTime {
    return this.plus(num, 'second')
  }

  plusMinutes(num: number): LocalTime {
    return this.plus(num, 'minute')
  }

  plusHours(num: number): LocalTime {
    return this.plus(num, 'hour')
  }

  plusDays(num: number): LocalTime {
    return this.plus(num, 'day')
  }

  plusWeeks(num: number): LocalTime {
    return this.plus(num, 'week')
  }

  plusMonths(num: number): LocalTime {
    return this.plus(num, 'month')
  }

  plusYears(num: number): LocalTime {
    return this.plus(num, 'year')
  }

  minusSeconds(num: number): LocalTime {
    return this.plus(-num, 'second')
  }

  minusMinutes(num: number): LocalTime {
    return this.plus(-num, 'minute')
  }

  minusHours(num: number): LocalTime {
    return this.plus(-num, 'hour')
  }

  minusDays(num: number): LocalTime {
    return this.plus(-num, 'day')
  }

  minusWeeks(num: number): LocalTime {
    return this.plus(-num, 'week')
  }

  minusMonths(num: number): LocalTime {
    return this.plus(-num, 'month')
  }

  minusYears(num: number): LocalTime {
    return this.plus(-num, 'year')
  }

  plus(num: number, unit: LocalTimeUnit, opt: MutateOptions = {}): LocalTime {
    if (unit === 'week') {
      num *= 7
      unit = 'day'
    }

    if (unit === 'year' || unit === 'month') {
      const d = addMonths(this.$date, unit === 'month' ? num : num * 12, opt)
      return opt.mutate ? this : localTime.fromInput(d)
    }

    return this.set(unit, this.get(unit) + num, opt)
  }

  minus(num: number, unit: LocalTimeUnit, opt: MutateOptions = {}): LocalTime {
    return this.plus(num * -1, unit, opt)
  }

  absDiff(other: LocalTimeInput, unit: LocalTimeUnit): number {
    return Math.abs(this.diff(other, unit))
  }

  diff(other: LocalTimeInput, unit: LocalTimeUnit): number {
    const date2 = localTime.fromInput(other).$date

    const secDiff = (this.$date.valueOf() - date2.valueOf()) / 1000
    if (!secDiff) return 0

    let r: number

    if (unit === 'year') {
      r = differenceInMonths(this.$date, date2) / 12
    } else if (unit === 'month') {
      r = differenceInMonths(this.$date, date2)
    } else if (unit === 'day') {
      r = secDiff / SECONDS_IN_DAY
    } else if (unit === 'week') {
      r = secDiff / (7 * 24 * 60 * 60)
    } else if (unit === 'hour') {
      r = secDiff / 3600
    } else if (unit === 'minute') {
      r = secDiff / 60
    } else {
      // unit === 'second'
      r = secDiff
    }

    // `|| 0` is to avoid returning -0
    return Math.trunc(r) || 0
  }

  startOf(unit: LocalTimeUnit, opt: MutateOptions = {}): LocalTime {
    if (unit === 'second') return this
    const d = opt.mutate ? this.$date : new Date(this.$date)
    d.setSeconds(0, 0)

    if (unit !== 'minute') {
      d.setMinutes(0)
      if (unit !== 'hour') {
        d.setHours(0)
        if (unit !== 'day') {
          // year, month or week

          if (unit === 'year') {
            d.setMonth(0)
            d.setDate(1)
          } else if (unit === 'month') {
            d.setDate(1)
          } else {
            // week
            startOfWeek(d, { mutate: true })
          }
        }
      }
    }

    return opt.mutate ? this : new LocalTime(d)
  }

  endOf(unit: LocalTimeUnit, opt: MutateOptions = {}): LocalTime {
    if (unit === 'second') return this
    const d = opt.mutate ? this.$date : new Date(this.$date)
    d.setSeconds(59, 0)

    if (unit !== 'minute') {
      d.setMinutes(59)
      if (unit !== 'hour') {
        d.setHours(23)
        if (unit !== 'day') {
          // year, month or week

          if (unit === 'year') {
            d.setMonth(11)
          }

          if (unit === 'week') {
            endOfWeek(d, { mutate: true })
          } else {
            // year or month
            const lastDay = localDate.getMonthLength(d.getFullYear(), d.getMonth() + 1)
            d.setDate(lastDay)
          }
        }
      }
    }

    return opt.mutate ? this : new LocalTime(d)
  }

  /**
   * Returns how many days are in the current month.
   * E.g 31 for January.
   */
  get daysInMonth(): number {
    return localDate.getMonthLength(this.$date.getFullYear(), this.$date.getMonth() + 1)
  }

  isSame(d: LocalTimeInput): boolean {
    return this.compare(d) === 0
  }

  isBefore(d: LocalTimeInput, inclusive = false): boolean {
    const r = this.compare(d)
    return r === -1 || (r === 0 && inclusive)
  }

  isSameOrBefore(d: LocalTimeInput): boolean {
    return this.compare(d) <= 0
  }

  isAfter(d: LocalTimeInput, inclusive = false): boolean {
    const r = this.compare(d)
    return r === 1 || (r === 0 && inclusive)
  }

  isSameOrAfter(d: LocalTimeInput): boolean {
    return this.compare(d) >= 0
  }

  isBetween(min: LocalTimeInput, max: LocalTimeInput, incl: Inclusiveness): boolean {
    let r = this.compare(min)
    if (r < 0) return false
    r = this.compare(max)
    if (r > 0 || (r === 0 && incl[1] === ')')) return false
    return true
  }

  /**
   * Checks if this localTime is older (<) than "now" by X units.
   *
   * Example:
   *
   * localTime(expirationDate).isOlderThan(5, 'day')
   *
   * Third argument allows to override "now".
   */
  isOlderThan(n: number, unit: LocalTimeUnit, now?: LocalTimeInput): boolean {
    return this.isBefore(localTime.fromInput(now ?? new Date()).plus(-n, unit))
  }

  /**
   * Checks if this localTime is same or older (<=) than "now" by X units.
   */
  isSameOrOlderThan(n: number, unit: LocalTimeUnit, now?: LocalTimeInput): boolean {
    return this.isSameOrBefore(localTime.fromInput(now ?? new Date()).plus(-n, unit))
  }

  /**
   * Checks if this localTime is younger (>) than "now" by X units.
   *
   * Example:
   *
   * localTime(expirationDate).isYoungerThan(5, 'day')
   *
   * Third argument allows to override "now".
   */
  isYoungerThan(n: number, unit: LocalTimeUnit, now?: LocalTimeInput): boolean {
    return this.isAfter(localTime.fromInput(now ?? new Date()).plus(-n, unit))
  }

  /**
   * Checks if this localTime is same or younger (>=) than "now" by X units.
   */
  isSameOrYoungerThan(n: number, unit: LocalTimeUnit, now?: LocalTimeInput): boolean {
    return this.isSameOrAfter(localTime.fromInput(now ?? new Date()).plus(-n, unit))
  }

  getAgeInYears(now?: LocalTimeInput): number {
    return this.getAgeIn('year', now)
  }

  getAgeInMonths(now?: LocalTimeInput): number {
    return this.getAgeIn('month', now)
  }

  getAgeInDays(now?: LocalTimeInput): number {
    return this.getAgeIn('day', now)
  }

  getAgeInHours(now?: LocalTimeInput): number {
    return this.getAgeIn('hour', now)
  }

  getAgeInMinutes(now?: LocalTimeInput): number {
    return this.getAgeIn('minute', now)
  }

  getAgeInSeconds(now?: LocalTimeInput): number {
    return this.getAgeIn('second', now)
  }

  getAgeIn(unit: LocalTimeUnit, now?: LocalTimeInput): number {
    return localTime.fromInput(now ?? new Date()).diff(this, unit)
  }

  isAfterNow(): boolean {
    return this.$date.valueOf() > Date.now()
  }

  isBeforeNow(): boolean {
    return this.$date.valueOf() < Date.now()
  }

  /**
   * Returns 1 if this > d
   * returns 0 if they are equal
   * returns -1 if this < d
   */
  compare(d: LocalTimeInput): -1 | 0 | 1 {
    const t1 = this.$date.valueOf()
    const t2 = localTime.fromInput(d).$date.valueOf()
    if (t1 === t2) return 0
    return t1 < t2 ? -1 : 1
  }

  toDateTimeObject(): DateTimeObject {
    return {
      ...this.toDateObject(),
      ...this.toTimeObject(),
    }
  }

  toDateObject(): DateObject {
    return {
      year: this.$date.getFullYear(),
      month: this.$date.getMonth() + 1,
      day: this.$date.getDate(),
    }
  }

  toTimeObject(): TimeObject {
    return {
      hour: this.$date.getHours(),
      minute: this.$date.getMinutes(),
      second: this.$date.getSeconds(),
    }
  }

  toFromNowString(now: LocalTimeInput = new Date()): string {
    const msDiff = localTime.fromInput(now).$date.valueOf() - this.$date.valueOf()

    if (msDiff === 0) return 'now'

    if (msDiff >= 0) {
      return `${_ms(msDiff)} ago`
    }

    return `in ${_ms(msDiff * -1)}`
  }

  toDate(): Date {
    return this.$date
  }

  clone(): LocalTime {
    return new LocalTime(new Date(this.$date))
  }

  get unix(): UnixTimestamp {
    return Math.floor(this.$date.valueOf() / 1000) as UnixTimestamp
  }

  get unixMillis(): UnixTimestampMillis {
    return this.$date.valueOf() as UnixTimestampMillis
  }

  valueOf(): UnixTimestamp {
    return Math.floor(this.$date.valueOf() / 1000) as UnixTimestamp
  }

  toLocalDate(): LocalDate {
    return localDate.fromDate(this.$date)
  }

  /**
   * Returns e.g: `1984-06-21 17:56:21`
   * or (if seconds=false):
   * `1984-06-21 17:56`
   */
  toPretty(seconds = true): IsoDateTime {
    return (this.toISODate() + ' ' + this.toISOTime(seconds)) as IsoDateTime
    // !! Not using toISOString(), as it returns time in UTC, not in local timezone (unexpected!)
    // const s = this.$date.toISOString()
    // return s.slice(0, 10) + ' ' + s.slice(11, seconds ? 19 : 16)
  }

  /**
   * Returns e.g: `1984-06-21T17:56:21`
   */
  toISODateTime(): IsoDateTime {
    return (this.toISODate() + 'T' + this.toISOTime()) as IsoDateTime
    // !! Not using toISOString(), as it returns time in UTC, not in local timezone (unexpected!)
    // return this.$date.toISOString().slice(0, 19)
  }

  /**
   * Returns e.g: `1984-06-21`, only the date part of DateTime
   */
  toISODate(): IsoDate {
    const { year, month, day } = this.toDateObject()

    return [
      String(year).padStart(4, '0'),
      String(month).padStart(2, '0'),
      String(day).padStart(2, '0'),
    ].join('-') as IsoDate

    // !! Not using toISOString(), as it returns time in UTC, not in local timezone (unexpected!)
    // return this.$date.toISOString().slice(0, 10)
  }

  /**
   * Returns e.g: `1984-06`
   */
  toISOMonth(): IsoMonth {
    return this.toISODate().slice(0, 7)
  }

  /**
   * Returns e.g: `17:03:15` (or `17:03` with seconds=false)
   */
  toISOTime(seconds = true): string {
    const { hour, minute, second } = this.toTimeObject()

    return [
      String(hour).padStart(2, '0'),
      String(minute).padStart(2, '0'),
      seconds && String(second).padStart(2, '0'),
    ]
      .filter(Boolean)
      .join(':')

    // !! Not using toISOString(), as it returns time in UTC, not in local timezone (unexpected!)
    // return this.$date.toISOString().slice(11, seconds ? 19 : 16)
  }

  toWallTime(): WallTime {
    return new WallTime(this.toDateTimeObject())
  }

  /**
   * Returns e.g: `19840621_1705`
   */
  toStringCompact(seconds = false): string {
    const { year, month, day, hour, minute, second } = this.toDateTimeObject()

    return [
      String(year).padStart(4, '0'),
      String(month).padStart(2, '0'),
      String(day).padStart(2, '0'),
      '_',
      String(hour).padStart(2, '0'),
      String(minute).padStart(2, '0'),
      seconds ? String(second).padStart(2, '0') : '',
    ].join('')
  }

  toString(): IsoDateTime {
    return this.toISODateTime()
  }

  toJSON(): UnixTimestamp {
    return this.unix
  }

  /**
   * @deprecated Use toIsoMonth
   */
  toMonthId(): MonthId {
    return this.toISOMonth()
  }

  format(fmt: Intl.DateTimeFormat | LocalTimeFormatter): string {
    if (fmt instanceof Intl.DateTimeFormat) {
      return fmt.format(this.$date)
    }

    return fmt(this)
  }
}

class LocalTimeFactory {
  /**
   * Creates a LocalTime from the input, unless it's falsy - then returns undefined.
   *
   * `localTime` function will instead return LocalTime of `now` for falsy input.
   */
  orUndefined(input: LocalTimeInputNullable): LocalTime | undefined {
    return input || input === 0 ? this.fromInput(input) : undefined
  }

  /**
   * Creates a LocalTime from the input, unless it's falsy - then returns LocalTime.now
   */
  orNow(input: LocalTimeInputNullable): LocalTime {
    return input || input === 0 ? this.fromInput(input) : this.now()
  }

  now(): LocalTime {
    return new LocalTime(new Date())
  }

  /**
   Convenience function to return current Unix timestamp in seconds.
   Like Date.now(), but in seconds.
   */
  nowUnix(): UnixTimestamp {
    return Math.floor(Date.now() / 1000) as UnixTimestamp
  }

  /**
   Convenience function that retuns the same as Date.now(), but with proper type of UnixTimestampMillis.
   */
  nowUnixMillis(): UnixTimestampMillis {
    return Date.now() as UnixTimestampMillis
  }

  /**
   * Create LocalTime from LocalTimeInput.
   * Input can already be a LocalTime - it is returned as-is in that case.
   * Date - will be used as-is.
   * String - will be parsed as strict `yyyy-mm-ddThh:mm:ss`.
   * Number - will be treated as unix timestamp in seconds.
   */
  fromInput(input: LocalTimeInput): LocalTime {
    if (input instanceof LocalTime) return input
    if (input instanceof Date) {
      return this.fromDate(input)
    }
    if (typeof input === 'number') {
      return this.fromUnix(input)
    }
    // It means it's a string
    // Will parse it STRICTLY
    return this.fromIsoDateTimeString(input)
  }

  /**
   * Returns true if input is valid to create LocalTime.
   */
  isValid(input: LocalTimeInputNullable): boolean {
    if (!input) return false
    if (input instanceof LocalTime) return true
    if (input instanceof Date) return !Number.isNaN(input.getDate())
    // We currently don't validate Unixtimestamp input, treat it as always valid
    if (typeof input === 'number') return true
    return this.isValidString(input)
  }

  /**
   * Returns true if isoString is a valid iso8601 string like `yyyy-mm-ddThh:mm:dd`.
   */
  isValidString(isoString: IsoDateTime | IsoDate | undefined | null): boolean {
    return !!this.parseStrictlyOrUndefined(isoString)
  }

  /**
   * Tries to convert/parse the input into LocalTime.
   * Uses LOOSE parsing.
   * If invalid - doesn't throw, but returns undefined instead.
   */
  try(input: LocalTimeInputNullable): LocalTime | undefined {
    if (input instanceof LocalTime) return input
    if (input instanceof Date) {
      if (Number.isNaN(input.getDate())) return
      return new LocalTime(input)
    }
    if (typeof input === 'number') {
      return this.fromUnix(input)
    }
    if (!input) return
    const date = this.parseLooselyOrUndefined(input)
    return date ? new LocalTime(date) : undefined
  }

  /**
   * Performs STRICT parsing.
   * Only allows IsoDateTime or IsoDate input, nothing else.
   */

  fromIsoDateTimeString(s: IsoDateTime | IsoDate): LocalTime {
    const d = this.parseStrictlyOrUndefined(s)
    _assert(d, `Cannot parse "${s}" into LocalTime`)
    return new LocalTime(d)
  }

  /**
   * Performs LOOSE parsing.
   * Tries to coerce imprefect/incorrect string input into IsoDateTimeString.
   * Use with caution.
   * Allows to input IsoDate, will set h:m:s to zeros.
   */
  parse(s: string): LocalTime {
    const d = this.parseLooselyOrUndefined(String(s))
    _assert(d, `Cannot parse "${s}" into LocalTime`)
    return new LocalTime(d)
  }

  private parseStrictlyOrUndefined(s: string | undefined | null): Date | undefined {
    if (!s || typeof (s as any) !== 'string') return
    let m = DATE_TIME_REGEX_STRICT.exec(s)
    if (!m) {
      // DateTime regex didn't match, try just-Date regex
      m = DATE_REGEX_STRICT.exec(s)
      if (!m) return
    }
    const o: DateTimeObject = {
      year: Number(m[1]),
      month: Number(m[2]),
      day: Number(m[3]),
      hour: Number(m[4]) || 0,
      minute: Number(m[5]) || 0,
      second: Number(m[6]) || 0,
    }
    if (!this.isDateTimeObjectValid(o)) return
    return this.createDateFromDateTimeObject(o)
  }

  private parseLooselyOrUndefined(s: string | undefined | null): Date | undefined {
    if (!s || typeof (s as any) !== 'string') return
    const m = DATE_TIME_REGEX_LOOSE.exec(s)
    if (!m) {
      if (s.length < 8) return
      // Attempt to parse with Date constructor
      const d = new Date(s)
      return Number.isNaN(d.getDate()) ? undefined : d
    }
    const o: DateTimeObject = {
      year: Number(m[1]),
      month: Number(m[2]),
      day: Number(m[3]) || 1,
      // [4] is skipped due to extra regex parentheses group
      hour: Number(m[5]) || 0,
      minute: Number(m[6]) || 0,
      second: Number(m[7]) || 0,
    }
    if (!this.isDateTimeObjectValid(o)) return
    return this.createDateFromDateTimeObject(o)
  }

  /**
   * Throws on invalid value.
   */
  validateDateTimeObject(o: DateTimeObject): void {
    _assert(
      this.isDateTimeObjectValid(o),
      `Cannot construct LocalTime from: ${o.year}-${o.month}-${o.day} ${o.hour}:${o.minute}:${o.second}`,
    )
  }

  isDateTimeObjectValid(o: DateTimeObject): boolean {
    return localDate.isDateObjectValid(o) && this.isTimeObjectValid(o)
  }

  isTimeObjectValid({ hour, minute, second }: TimeObject): boolean {
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59
  }

  fromDate(date: Date): LocalTime {
    _assert(
      !Number.isNaN(date.getDate()),
      'localTime.fromDate is called on Date object that is invalid',
    )
    return new LocalTime(date)
  }

  fromUnix(ts: UnixTimestamp): LocalTime {
    return new LocalTime(new Date(ts * 1000))
  }

  /**
   * Create LocalTime from unixTimestamp in milliseconds (not in seconds).
   */
  fromMillis(millis: UnixTimestampMillis): LocalTime {
    return new LocalTime(new Date(millis))
  }

  fromDateTimeObject(o: DateTimeObjectInput): LocalTime {
    // todo: validate?
    return new LocalTime(this.createDateFromDateTimeObject(o))
  }

  private createDateFromDateTimeObject(o: DateTimeObjectInput): Date {
    return new Date(o.year, o.month - 1, o.day || 1, o.hour || 0, o.minute || 0, o.second || 0)
  }

  // private assertNotNull(
  //   lt: LocalTime | null,
  //   input: LocalTimeInputNullable,
  // ): asserts lt is LocalTime {
  //   _assert(lt !== null, `Cannot parse "${input}" into LocalTime`, {
  //     input,
  //   })
  // }

  /**
   * Returns the IANA timezone e.g `Europe/Stockholm`.
   * https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
   */
  getTimezone(): IANATimezone {
    return Intl.DateTimeFormat().resolvedOptions().timeZone as IANATimezone
  }

  /**
   * Returns true if passed IANA timezone is valid/supported.
   * E.g `Europe/Stockholm` is valid, but `Europe/Stockholm2` is not.
   *
   * This implementation is not optimized for performance. If you need frequent validation -
   * consider caching the Intl.supportedValuesOf values as Set and reuse that.
   */
  isTimezoneValid(tz: string): boolean {
    if (tz === 'UTC') return true // we deliberately consider UTC a valid timezone, while it's mostly used in testing
    return Intl.supportedValuesOf('timeZone').includes(tz)
  }

  sort(items: LocalTime[], dir: SortDirection = 'asc', opt: MutateOptions = {}): LocalTime[] {
    const mod = dir === 'desc' ? -1 : 1
    return (opt.mutate ? items : [...items]).sort((a, b) => {
      const v1 = a.$date.valueOf()
      const v2 = b.$date.valueOf()
      if (v1 === v2) return 0
      return (v1 < v2 ? -1 : 1) * mod
    })
  }

  minOrUndefined(items: LocalTimeInputNullable[]): LocalTime | undefined {
    let min: LocalTime | undefined
    for (const item of items) {
      if (!item) continue
      const lt = this.fromInput(item)
      if (!min || lt.$date.valueOf() < min.$date.valueOf()) {
        min = lt
      }
    }
    return min
  }

  min(items: LocalTimeInputNullable[]): LocalTime {
    const min = this.minOrUndefined(items)
    _assert(min, 'localTime.min called on empty array')
    return min
  }

  maxOrUndefined(items: LocalTimeInputNullable[]): LocalTime | undefined {
    let max: LocalTime | undefined
    for (const item of items) {
      if (!item) continue
      const lt = this.fromInput(item)
      if (!max || lt.$date.valueOf() > max.$date.valueOf()) {
        max = lt
      }
    }
    return max
  }

  max(items: LocalTimeInputNullable[]): LocalTime {
    const max = this.maxOrUndefined(items)
    _assert(max, 'localTime.max called on empty array')
    return max
  }
}

// based on: https://github.com/date-fns/date-fns/blob/master/src/getISOWeek/index.ts
function getWeek(date: Date): number {
  const diff = startOfWeek(date).getTime() - startOfWeekYear(date).getTime()
  return Math.round(diff / MILLISECONDS_IN_WEEK) + 1
}

function setWeek(date: Date, week: number, opt: MutateOptions = {}): Date {
  const d = opt.mutate ? date : new Date(date)
  const diff = getWeek(d) - week
  d.setDate(d.getDate() - diff * 7)
  return d
}

// based on: https://github.com/date-fns/date-fns/blob/master/src/startOfISOWeekYear/index.ts
function startOfWeekYear(date: Date): Date {
  const year = getWeekYear(date)
  const fourthOfJanuary = new Date(0)
  fourthOfJanuary.setFullYear(year, 0, 4)
  fourthOfJanuary.setHours(0, 0, 0, 0)
  return startOfWeek(fourthOfJanuary, { mutate: true })
}

// based on: https://github.com/date-fns/date-fns/blob/fd6bb1a0bab143f2da068c05a9c562b9bee1357d/src/getISOWeekYear/index.ts
function getWeekYear(date: Date): number {
  const year = date.getFullYear()

  const fourthOfJanuaryOfNextYear = new Date(0)
  fourthOfJanuaryOfNextYear.setFullYear(year + 1, 0, 4)
  fourthOfJanuaryOfNextYear.setHours(0, 0, 0, 0)
  const startOfNextYear = startOfWeek(fourthOfJanuaryOfNextYear, { mutate: true })

  const fourthOfJanuaryOfThisYear = new Date(0)
  fourthOfJanuaryOfThisYear.setFullYear(year, 0, 4)
  fourthOfJanuaryOfThisYear.setHours(0, 0, 0, 0)
  const startOfThisYear = startOfWeek(fourthOfJanuaryOfThisYear, { mutate: true })

  if (date.getTime() >= startOfNextYear.getTime()) {
    return year + 1
  }
  if (date.getTime() >= startOfThisYear.getTime()) {
    return year
  }
  return year - 1
}

// based on: https://github.com/date-fns/date-fns/blob/fd6bb1a0bab143f2da068c05a9c562b9bee1357d/src/startOfWeek/index.ts
function startOfWeek(date: Date, opt: MutateOptions = {}): Date {
  const d = opt.mutate ? date : new Date(date)

  const day = d.getDay()
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn

  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// based on: https://github.com/date-fns/date-fns/blob/master/src/endOfWeek/index.ts
function endOfWeek(date: Date, opt: MutateOptions = {}): Date {
  const d = opt.mutate ? date : new Date(date)

  const day = d.getDay()
  const diff = (day < weekStartsOn ? -7 : 0) + 6 - (day - weekStartsOn)

  d.setDate(d.getDate() + diff)
  return d
}

function addMonths(d: Date, num: number, opt: MutateOptions = {}): Date {
  if (!opt.mutate) d = new Date(d)

  let day = d.getDate()
  let month = d.getMonth() + 1 + num

  if (day < 29) {
    d.setMonth(month - 1)
    return d
  }

  let year = d.getFullYear()

  while (month > 12) {
    year++
    month -= 12
  }
  while (month < 1) {
    year--
    month += 12
  }

  const monthLen = localDate.getMonthLength(year, month)
  if (day > monthLen) day = monthLen

  d.setFullYear(year, month - 1, day)
  return d
}

function differenceInMonths(a: Date, b: Date): number {
  if (a.getDate() < b.getDate()) return -differenceInMonths(b, a)
  const wholeMonthDiff = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  const anchor = addMonths(a, wholeMonthDiff).getTime()
  const sign = b.getTime() - anchor >= 0 ? 1 : -1
  const anchor2 = addMonths(a, wholeMonthDiff + sign).getTime()
  return -(wholeMonthDiff + ((b.getTime() - anchor) / (anchor2 - anchor)) * sign)
}

interface LocalTimeFn extends LocalTimeFactory {
  (d: LocalTimeInput): LocalTime
}

const localTimeFactory = new LocalTimeFactory()

export const localTime = localTimeFactory.fromInput.bind(localTimeFactory) as LocalTimeFn

// The line below is the blackest of black magic I have ever written in 2024.
// And probably 2023 as well.
Object.setPrototypeOf(localTime, localTimeFactory)
