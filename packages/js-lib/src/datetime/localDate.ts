import { _assert } from '../error/assert.js'
import { Iterable2 } from '../iter/iterable2.js'
import type {
  Inclusiveness,
  IsoDate,
  IsoDateTime,
  IsoMonth,
  MutateOptions,
  SortOptions,
  UnixTimestamp,
  UnixTimestampMillis,
} from '../types.js'
import type { DateObject, ISODayOfWeek, LocalTime } from './localTime.js'
import { localTime, VALID_DAYS_OF_WEEK } from './localTime.js'

export type LocalDateUnit = LocalDateUnitStrict | 'week'
export type LocalDateUnitStrict = 'year' | 'month' | 'day'

const MDAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
/**
 * Regex is open-ended (no $ at the end) to support e.g Date+Time string to be parsed (time part will be dropped)
 */
const DATE_REGEX = /^(\d\d\d\d)-(\d\d)-(\d\d)/
const COMPACT_DATE_REGEX = /^(\d\d\d\d)(\d\d)(\d\d)$/

export type LocalDateInput = LocalDate | Date | IsoDate
export type LocalDateInputNullable = LocalDateInput | null | undefined
export type LocalDateFormatter = (ld: LocalDate) => string

/**
 * LocalDate represents a date without time.
 * It is timezone-independent.
 */
export class LocalDate {
  constructor(
    public year: number,
    public month: number,
    public day: number,
  ) {}

  get(unit: LocalDateUnitStrict): number {
    return unit === 'year' ? this.year : unit === 'month' ? this.month : this.day
  }

  set(unit: LocalDateUnitStrict, v: number, opt: MutateOptions = {}): LocalDate {
    const t = opt.mutate ? this : this.clone()

    if (unit === 'year') {
      t.year = v
    } else if (unit === 'month') {
      t.month = v
    } else {
      t.day = v
    }

    return t
  }

  setYear(v: number): LocalDate {
    return this.set('year', v)
  }

  setMonth(v: number): LocalDate {
    return this.set('month', v)
  }

  setDay(v: number): LocalDate {
    return this.set('day', v)
  }

  get dayOfWeek(): ISODayOfWeek {
    return (this.toDate().getDay() || 7) as ISODayOfWeek
  }

  /**
   * Returns LocalDate for the given DayOfWeek (e.g Monday), that is in the same week as this.
   * It may move the time into the future, or the past, depending on how the desired DayOfWeek is in
   * relation to `this`.
   */
  setDayOfWeek(dow: ISODayOfWeek): LocalDate {
    _assert(VALID_DAYS_OF_WEEK.has(dow), `Invalid dayOfWeek: ${dow}`)
    const delta = dow - this.dayOfWeek
    return this.plus(delta, 'day')
  }

  /**
   * Returns LocalDate for the given DayOfWeek (e.g Monday), that is in the future,
   * in relation to this.
   * If this LocalDate is Monday, and desired DoW is also Monday - `this` is returned.
   */
  setNextDayOfWeek(dow: ISODayOfWeek): LocalDate {
    _assert(VALID_DAYS_OF_WEEK.has(dow), `Invalid dayOfWeek: ${dow}`)
    let delta = dow - this.dayOfWeek
    if (delta < 0) delta += 7
    return this.plus(delta, 'day')
  }

  isSame(d: LocalDateInput): boolean {
    d = localDate.fromInput(d)
    return this.day === d.day && this.month === d.month && this.year === d.year
  }

  isBefore(d: LocalDateInput, inclusive = false): boolean {
    const r = this.compare(d)
    return r === -1 || (r === 0 && inclusive)
  }

  isSameOrBefore(d: LocalDateInput): boolean {
    return this.compare(d) <= 0
  }

  isAfter(d: LocalDateInput, inclusive = false): boolean {
    const r = this.compare(d)
    return r === 1 || (r === 0 && inclusive)
  }

  isSameOrAfter(d: LocalDateInput): boolean {
    return this.compare(d) >= 0
  }

  isBetween(min: LocalDateInput, max: LocalDateInput, incl: Inclusiveness): boolean {
    let r = this.compare(min)
    if (r < 0) return false
    r = this.compare(max)
    if (r > 0 || (r === 0 && incl[1] === ')')) return false
    return true
  }

  /**
   * Checks if this localDate is older (<) than "today" by X units.
   *
   * Example:
   *
   * localDate(expirationDate).isOlderThan(5, 'day')
   *
   * Third argument allows to override "today".
   */
  isOlderThan(n: number, unit: LocalDateUnit, today?: LocalDateInput): boolean {
    return this.isBefore(localDate.fromInput(today || new Date()).plus(-n, unit))
  }

  /**
   * Checks if this localDate is same or older (<=) than "today" by X units.
   */
  isSameOrOlderThan(n: number, unit: LocalDateUnit, today?: LocalDateInput): boolean {
    return this.isSameOrBefore(localDate.fromInput(today || new Date()).plus(-n, unit))
  }

  /**
   * Checks if this localDate is younger (>) than "today" by X units.
   *
   * Example:
   *
   * localDate(expirationDate).isYoungerThan(5, 'day')
   *
   * Third argument allows to override "today".
   */
  isYoungerThan(n: number, unit: LocalDateUnit, today?: LocalDateInput): boolean {
    return this.isAfter(localDate.fromInput(today || new Date()).plus(-n, unit))
  }

  /**
   * Checks if this localDate is same or younger (>=) than "today" by X units.
   */
  isSameOrYoungerThan(n: number, unit: LocalDateUnit, today?: LocalDateInput): boolean {
    return this.isSameOrAfter(localDate.fromInput(today || new Date()).plus(-n, unit))
  }

  isToday(): boolean {
    return this.isSame(localDate.today())
  }

  isAfterToday(): boolean {
    return this.isAfter(localDate.today())
  }

  isSameOrAfterToday(): boolean {
    return this.isSameOrAfter(localDate.today())
  }

  isBeforeToday(): boolean {
    return this.isBefore(localDate.today())
  }

  isSameOrBeforeToday(): boolean {
    return this.isSameOrBefore(localDate.today())
  }

  getAgeInYears(today?: LocalDateInput): number {
    return this.getAgeIn('year', today)
  }

  getAgeInMonths(today?: LocalDateInput): number {
    return this.getAgeIn('month', today)
  }

  getAgeInDays(today?: LocalDateInput): number {
    return this.getAgeIn('day', today)
  }

  getAgeIn(unit: LocalDateUnit, today?: LocalDateInput): number {
    return localDate.fromInput(today || new Date()).diff(this, unit)
  }

  /**
   * Returns 1 if this > d
   * returns 0 if they are equal
   * returns -1 if this < d
   */
  compare(d: LocalDateInput): -1 | 0 | 1 {
    d = localDate.fromInput(d)
    if (this.year < d.year) return -1
    if (this.year > d.year) return 1
    if (this.month < d.month) return -1
    if (this.month > d.month) return 1
    if (this.day < d.day) return -1
    if (this.day > d.day) return 1
    return 0
  }

  /**
   * Same as Math.abs( diff )
   */
  absDiff(d: LocalDateInput, unit: LocalDateUnit): number {
    return Math.abs(this.diff(d, unit))
  }

  /**
   * Returns the number of **full** units difference (aka `Math.floor`).
   *
   * a.diff(b) means "a minus b"
   */
  diff(d: LocalDateInput, unit: LocalDateUnit): number {
    d = localDate.fromInput(d)

    const sign = this.compare(d)
    if (!sign) return 0

    // Put items in descending order: "big minus small"
    const [big, small] = sign === 1 ? [this, d] : [d, this]

    if (unit === 'year') {
      let years = big.year - small.year

      if (
        big.month < small.month ||
        (big.month === small.month &&
          big.day < small.day &&
          !(
            big.day === localDate.getMonthLength(big.year, big.month) &&
            small.day === localDate.getMonthLength(small.year, small.month)
          ))
      ) {
        years--
      }

      return years * sign || 0
    }

    if (unit === 'month') {
      let months = (big.year - small.year) * 12 + (big.month - small.month)
      if (big.day < small.day) {
        const bigMonthLen = localDate.getMonthLength(big.year, big.month)
        if (big.day !== bigMonthLen || small.day < bigMonthLen) {
          months--
        }
      }
      return months * sign || 0
    }

    // unit is 'day' or 'week'
    let days = big.day - small.day

    // If small date is after 1st of March - next year's "leapness" should be used
    const offsetYear = small.month >= 3 ? 1 : 0
    for (let year = small.year; year < big.year; year++) {
      days += localDate.getYearLength(year + offsetYear)
    }

    if (small.month < big.month) {
      for (let month = small.month; month < big.month; month++) {
        days += localDate.getMonthLength(big.year, month)
      }
    } else if (big.month < small.month) {
      for (let month = big.month; month < small.month; month++) {
        days -= localDate.getMonthLength(big.year, month)
      }
    }

    if (unit === 'week') {
      return Math.trunc(days / 7) * sign || 0
    }

    return days * sign || 0
  }

  plusDays(num: number): LocalDate {
    return this.plus(num, 'day')
  }

  plusWeeks(num: number): LocalDate {
    return this.plus(num, 'week')
  }

  plusMonths(num: number): LocalDate {
    return this.plus(num, 'month')
  }

  plusYears(num: number): LocalDate {
    return this.plus(num, 'year')
  }

  minusDays(num: number): LocalDate {
    return this.plus(-num, 'day')
  }

  minusWeeks(num: number): LocalDate {
    return this.plus(-num, 'week')
  }

  minusMonths(num: number): LocalDate {
    return this.plus(-num, 'month')
  }

  minusYears(num: number): LocalDate {
    return this.plus(-num, 'year')
  }

  plus(num: number, unit: LocalDateUnit, opt: MutateOptions = {}): LocalDate {
    num = Math.floor(num) // if a fractional number like 0.5 is passed - it will be floored, as LocalDate only deals with "whole days" as minimal unit
    let { day, month, year } = this

    if (unit === 'week') {
      num *= 7
      unit = 'day'
    }

    if (unit === 'day') {
      day += num
    } else if (unit === 'month') {
      month += num
    } else if (unit === 'year') {
      year += num
    }

    // check month overflow
    while (month > 12) {
      year += 1
      month -= 12
    }
    while (month < 1) {
      year -= 1
      month += 12
    }

    // check day overflow
    // Applies not only for 'day' unit, but also e.g 2022-05-31 plus 1 month should be 2022-06-30 (not 31!)
    if (day < 1) {
      while (day < 1) {
        month -= 1
        if (month < 1) {
          year -= 1
          month += 12
        }

        day += localDate.getMonthLength(year, month)
      }
    } else {
      let monLen = localDate.getMonthLength(year, month)

      if (unit !== 'day') {
        if (day > monLen) {
          // Case of 2022-05-31 plus 1 month should be 2022-06-30, not 31
          day = monLen
        }
      } else {
        while (day > monLen) {
          day -= monLen
          month += 1
          if (month > 12) {
            year += 1
            month -= 12
          }

          monLen = localDate.getMonthLength(year, month)
        }
      }
    }

    if (opt.mutate) {
      this.year = year
      this.month = month
      this.day = day
      return this
    }

    return new LocalDate(year, month, day)
  }

  minus(num: number, unit: LocalDateUnit, opt: MutateOptions = {}): LocalDate {
    return this.plus(-num, unit, opt)
  }

  startOf(unit: LocalDateUnitStrict): LocalDate {
    if (unit === 'day') return this
    if (unit === 'month') return new LocalDate(this.year, this.month, 1)
    // year
    return new LocalDate(this.year, 1, 1)
  }

  endOf(unit: LocalDateUnitStrict): LocalDate {
    if (unit === 'day') return this
    if (unit === 'month') {
      return new LocalDate(this.year, this.month, localDate.getMonthLength(this.year, this.month))
    }
    // year
    return new LocalDate(this.year, 12, 31)
  }

  /**
   * Returns how many days are in the current month.
   * E.g 31 for January.
   */
  get daysInMonth(): number {
    return localDate.getMonthLength(this.year, this.month)
  }

  clone(): LocalDate {
    return new LocalDate(this.year, this.month, this.day)
  }

  /**
   * Converts LocalDate into instance of Date.
   * Year, month and day will match.
   * Hour, minute, second, ms will be 0.
   * Timezone will match local timezone.
   */
  toDate(): Date {
    return new Date(this.year, this.month - 1, this.day)
  }

  /**
   * Converts LocalDate to Date in UTC timezone.
   * Unlike normal `.toDate` that uses browser's timezone by default.
   */
  toDateInUTC(): Date {
    return new Date(this.toISODateTimeInUTC())
  }

  toDateObject(): DateObject {
    return {
      year: this.year,
      month: this.month,
      day: this.day,
    }
  }

  /**
   * Converts LocalDate to LocalTime with 0 hours, 0 minutes, 0 seconds.
   * LocalTime's Date will be in local timezone.
   */
  toLocalTime(): LocalTime {
    return localTime.fromDate(this.toDate())
  }

  /**
   * Returns e.g: `1984-06-21`
   */
  toISODate(): IsoDate {
    return [
      String(this.year).padStart(4, '0'),
      String(this.month).padStart(2, '0'),
      String(this.day).padStart(2, '0'),
    ].join('-') as IsoDate
  }

  /**
   * Returns e.g: `1984-06`
   */
  toISOMonth(): IsoMonth {
    return this.toISODate().slice(0, 7) as IsoMonth
  }

  /**
   * Returns e.g: `1984-06-21T00:00:00`
   * Hours, minutes and seconds are 0.
   */
  toISODateTime(): IsoDateTime {
    return (this.toISODate() + 'T00:00:00') as IsoDateTime
  }

  /**
   * Returns e.g: `1984-06-21T00:00:00Z` (notice the Z at the end, which indicates UTC).
   * Hours, minutes and seconds are 0.
   */
  toISODateTimeInUTC(): IsoDateTime {
    return (this.toISODateTime() + 'Z') as IsoDateTime
  }

  toString(): IsoDate {
    return this.toISODate()
  }

  /**
   * Returns e.g: `19840621`
   */
  toStringCompact(): string {
    return [
      String(this.year).padStart(4, '0'),
      String(this.month).padStart(2, '0'),
      String(this.day).padStart(2, '0'),
    ].join('')
  }

  /**
   * Returns unix timestamp of 00:00:00 of that date (in UTC, because unix timestamp always reflects UTC).
   */
  get unix(): UnixTimestamp {
    return Math.floor(this.toDate().valueOf() / 1000) as UnixTimestamp
  }

  /**
   * Same as .unix(), but in milliseconds.
   */
  get unixMillis(): UnixTimestampMillis {
    return this.toDate().valueOf() as UnixTimestampMillis
  }

  toJSON(): IsoDate {
    return this.toISODate()
  }

  format(fmt: Intl.DateTimeFormat | LocalDateFormatter): string {
    if (fmt instanceof Intl.DateTimeFormat) {
      return fmt.format(this.toDate())
    }

    return fmt(this)
  }
}

class LocalDateFactory {
  /**
   * Creates a LocalDate from the input, unless it's falsy - then returns undefined.
   *
   * Similar to `localDate.orToday`, but that will instead return Today on falsy input.
   */
  orUndefined(d: LocalDateInputNullable): LocalDate | undefined {
    return d ? this.fromInput(d) : undefined
  }

  /**
   * Creates a LocalDate from the input, unless it's falsy - then returns localDate.today.
   */
  orToday(d: LocalDateInputNullable): LocalDate {
    return d ? this.fromInput(d) : this.today()
  }

  /**
   * Creates LocalDate that represents `today` (in local timezone).
   */
  today(): LocalDate {
    return this.fromDate(new Date())
  }

  /**
   * Creates LocalDate that represents `today` in UTC.
   */
  todayInUTC(): LocalDate {
    return this.fromDateInUTC(new Date())
  }

  /**
   Convenience function to return current today's IsoDate representation, e.g `2024-06-21`
   */
  todayString(): IsoDate {
    return this.fromDate(new Date()).toISODate()
  }

  /**
   * Create LocalDate from LocalDateInput.
   * Input can already be a LocalDate - it is returned as-is in that case.
   * String - will be parsed as yyyy-mm-dd.
   * Date - will be converted to LocalDate (as-is, in whatever timezone it is - local or UTC).
   * No other formats are supported.
   *
   * Will throw if it fails to parse/construct LocalDate.
   */
  fromInput(input: LocalDateInput): LocalDate {
    if (input instanceof LocalDate) return input
    if (input instanceof Date) {
      return this.fromDate(input)
    }
    // It means it's a string
    return this.fromString(input)
  }

  /**
   * Returns true if input is valid to create LocalDate.
   */
  isValid(input: LocalDateInputNullable): boolean {
    if (!input) return false
    if (input instanceof LocalDate) return true
    if (input instanceof Date) return !Number.isNaN(input.getDate())
    return this.isValidString(input)
  }

  /**
   * Returns true if isoString is a valid iso8601 string like `yyyy-mm-dd`.
   */
  isValidString(isoString: string | undefined | null): boolean {
    return !!this.parseToLocalDateOrUndefined(DATE_REGEX, isoString)
  }

  /**
   * Tries to convert/parse the input into LocalDate.
   * Uses LOOSE parsing.
   * If invalid - doesn't throw, but returns undefined instead.
   */
  try(input: LocalDateInputNullable): LocalDate | undefined {
    if (!input) return
    if (input instanceof LocalDate) return input
    if (input instanceof Date) {
      if (Number.isNaN(input.getDate())) return
      return new LocalDate(input.getFullYear(), input.getMonth() + 1, input.getDate())
    }
    return this.parseToLocalDateOrUndefined(DATE_REGEX, input)
  }

  /**
   * Performs STRICT parsing.
   * Only allows IsoDate input, nothing else.
   */
  fromString(s: IsoDate): LocalDate {
    return this.parseToLocalDate(DATE_REGEX, s)
  }

  /**
   * Parses "compact iso8601 format", e.g `19840621` into LocalDate.
   * Throws if it fails to do so.
   */
  fromCompactString(s: string): LocalDate {
    return this.parseToLocalDate(COMPACT_DATE_REGEX, s)
  }

  /**
   * Throws if it fails to parse the input string via Regex and YMD validation.
   */
  private parseToLocalDate(regex: RegExp, s: string): LocalDate {
    const ld = this.parseToLocalDateOrUndefined(regex, s)
    _assert(ld, `Cannot parse "${s}" into LocalDate`)
    return ld
  }

  /**
   * Tries to parse the input string, returns undefined if input is invalid.
   */
  private parseToLocalDateOrUndefined(
    regex: RegExp,
    s: string | undefined | null,
  ): LocalDate | undefined {
    if (!s || typeof (s as any) !== 'string') return
    const m = regex.exec(s)
    if (!m) return
    const year = Number(m[1])
    const month = Number(m[2])
    const day = Number(m[3])
    if (!this.isDateObjectValid({ year, month, day })) return
    return new LocalDate(year, month, day)
  }

  /**
   * Throws on invalid value.
   */
  private validateDateObject(o: DateObject): void {
    _assert(
      this.isDateObjectValid(o),
      `Cannot construct LocalDate from: ${o.year}-${o.month}-${o.day}`,
    )
  }

  isDateObjectValid({ year, month, day }: DateObject): boolean {
    return (
      !!year && month >= 1 && month <= 12 && day >= 1 && day <= this.getMonthLength(year, month)
    )
  }

  /**
   * Constructs LocalDate from Date.
   * Takes Date as-is, in its timezone - local or UTC.
   */
  fromDate(d: Date): LocalDate {
    _assert(
      !Number.isNaN(d.getDate()),
      'localDate.fromDate is called on Date object that is invalid',
    )
    return new LocalDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
  }

  /**
   * Constructs LocalDate from Date.
   * Takes Date's year/month/day components in UTC, using getUTCFullYear, getUTCMonth, getUTCDate.
   */
  fromDateInUTC(d: Date): LocalDate {
    _assert(
      !Number.isNaN(d.getDate()),
      'localDate.fromDateInUTC is called on Date object that is invalid',
    )
    return new LocalDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
  }

  fromDateObject(o: DateObject): LocalDate {
    this.validateDateObject(o)
    return new LocalDate(o.year, o.month, o.day)
  }

  /**
   * Sorts an array of LocalDates in `dir` order (ascending by default).
   */
  sort(items: LocalDate[], opt: SortOptions = {}): LocalDate[] {
    const mod = opt.dir === 'desc' ? -1 : 1
    return (opt.mutate ? items : [...items]).sort((a, b) => a.compare(b) * mod)
  }

  /**
   * Returns the earliest (min) LocalDate from the array, or undefined if the array is empty.
   */
  minOrUndefined(items: LocalDateInputNullable[]): LocalDate | undefined {
    let min: LocalDate | undefined
    for (const item of items) {
      if (!item) continue
      const ld = this.fromInput(item)
      if (!min || ld.isBefore(min)) {
        min = ld
      }
    }
    return min
  }

  /**
   * Returns the earliest LocalDate from the array.
   * Throws if the array is empty.
   */
  min(items: LocalDateInputNullable[]): LocalDate {
    const min = this.minOrUndefined(items)
    _assert(min, 'localDate.min called on empty array')
    return min
  }

  /**
   * Returns the latest (max) LocalDate from the array, or undefined if the array is empty.
   */
  maxOrUndefined(items: LocalDateInputNullable[]): LocalDate | undefined {
    let max: LocalDate | undefined
    for (const item of items) {
      if (!item) continue
      const ld = this.fromInput(item)
      if (!max || ld.isAfter(max)) {
        max = ld
      }
    }
    return max
  }

  /**
   * Returns the latest LocalDate from the array.
   * Throws if the array is empty.
   */
  max(items: LocalDateInputNullable[]): LocalDate {
    const max = this.maxOrUndefined(items)
    _assert(max, 'localDate.max called on empty array')
    return max
  }

  /**
   * Returns the range (array) of LocalDates between min and max.
   * By default, min is included, max is excluded.
   */
  range(
    min: LocalDateInput,
    max: LocalDateInput,
    incl: Inclusiveness,
    step = 1,
    stepUnit: LocalDateUnit = 'day',
  ): LocalDate[] {
    return this.rangeIterable(min, max, incl, step, stepUnit).toArray()
  }

  /**
   * Returns the Iterable2 of LocalDates between min and max.
   * By default, min is included, max is excluded.
   */
  rangeIterable(
    min: LocalDateInput,
    max: LocalDateInput,
    incl: Inclusiveness,
    step = 1,
    stepUnit: LocalDateUnit = 'day',
  ): Iterable2<LocalDate> {
    if (stepUnit === 'week') {
      step *= 7
      stepUnit = 'day'
    }

    const $min = this.fromInput(min).startOf(stepUnit)
    const $max = this.fromInput(max).startOf(stepUnit)

    let value = $min

    if (value.isSameOrAfter($min)) {
      // ok
    } else {
      value.plus(1, stepUnit, { mutate: true })
    }

    const rightInclusive = incl[1] === ']'

    return Iterable2.of({
      *[Symbol.iterator]() {
        while (value.isBefore($max, rightInclusive)) {
          yield value

          // We don't mutate, because we already returned `current`
          // in the previous iteration
          value = value.plus(step, stepUnit)
        }
      },
    })
  }

  getYearLength(year: number): number {
    return this.isLeapYear(year) ? 366 : 365
  }

  getMonthLength(year: number, month: number): number {
    if (month === 2) return this.isLeapYear(year) ? 29 : 28
    return MDAYS[month]!
  }

  isLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  }
}

interface LocalDateFn extends LocalDateFactory {
  (d: LocalDateInput): LocalDate
}

const localDateFactory = new LocalDateFactory()

export const localDate = localDateFactory.fromInput.bind(localDateFactory) as LocalDateFn

// The line below is the blackest of black magic I have ever written in 2024.
// And probably 2023 as well.
Object.setPrototypeOf(localDate, localDateFactory)
