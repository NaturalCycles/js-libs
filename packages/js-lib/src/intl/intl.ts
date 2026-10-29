import { _Memo } from '../decorators/memo.decorator.js'
import type { AnyObject, IANATimezone } from '../types.js'

// oxlint-disable no-restricted-globals

/**
 * Returns cached Intl.* formatters, because they are known to be
 * very slow to create.
 *
 * See https://github.com/poppinss/intl-formatter
 *
 * Methods accept non-optional arguments consciously,
 * to be able to cache them better. Just pass {} for options.
 *
 * The cache is never evicted, it grows with each unique combination of arguments.
 * Don't pass unbounded dynamic values (e.g arbitrary user input) as locales or options.
 */
class MemoizedIntl {
  /**
   * Escape hatch: for when you want to use native Intl, but linter screams at you - then you can use
   * Intl2.Intl.*
   *
   * Prefer the memoized methods of Intl2 for creating formatters; use this for static functions
   * (e.g `getCanonicalLocales`), `instanceof` checks, and cheap objects like Locale.
   *
   * Intl.Locale is not wrapped consciously: it was benchmarked and does NOT benefit from memoization.
   * It's cheap to create (~1.3µs raw vs ~0.2µs cache hit, so ~1µs saved), while its tag often comes
   * from runtime data (e.g request language), which would grow the never-evicted cache unboundedly.
   * Use `new Intl2.Intl.Locale(tag)` instead.
   */
  readonly Intl = Intl

  /**
   * Returns the IANA timezone e.g `Europe/Stockholm`.
   * https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
   *
   * Memoized, so it returns the timezone at the time of the first call.
   * Changing `process.env.TZ` at runtime after that is not reflected.
   */
  @_Memo()
  getTimezone(): IANATimezone {
    return Intl.DateTimeFormat().resolvedOptions().timeZone as IANATimezone
  }

  /**
   * Returns the list of IANA timezones supported by the runtime (~420 entries).
   * Memoized, because V8 rebuilds the list on every call (~70µs).
   *
   * The list contains canonical CLDR ids only, so valid aliases are missing from it,
   * e.g `UTC` and `Europe/Kyiv` (listed as `Europe/Kiev`).
   * Don't use it to validate user input as is.
   */
  @_Memo()
  getSupportedTimezones(): readonly IANATimezone[] {
    return Intl.supportedValuesOf('timeZone') as IANATimezone[]
  }

  @_Memo({ cacheKeyFn: intlCacheKeyFn })
  DateTimeFormat(
    locales: Intl.LocalesArgument,
    options: Intl.DateTimeFormatOptions,
  ): Intl.DateTimeFormat {
    return new Intl.DateTimeFormat(locales, options)
  }

  @_Memo({ cacheKeyFn: intlCacheKeyFn })
  RelativeTimeFormat(
    locales: Intl.LocalesArgument,
    options: Intl.RelativeTimeFormatOptions,
  ): Intl.RelativeTimeFormat {
    return new Intl.RelativeTimeFormat(locales, options)
  }

  @_Memo({ cacheKeyFn: intlCacheKeyFn })
  DurationFormat(
    locales: Intl.LocalesArgument,
    options: Intl.DurationFormatOptions,
  ): Intl.DurationFormat {
    return new Intl.DurationFormat(locales, options)
  }

  @_Memo({ cacheKeyFn: intlCacheKeyFn })
  NumberFormat(
    locales: Intl.LocalesArgument,
    options: Intl.NumberFormatOptions,
  ): Intl.NumberFormat {
    return new Intl.NumberFormat(locales, options)
  }

  @_Memo({ cacheKeyFn: intlCacheKeyFn })
  Collator(locales: Intl.LocalesArgument, options: Intl.CollatorOptions): Intl.Collator {
    return new Intl.Collator(locales, options)
  }

  @_Memo({ cacheKeyFn: intlCacheKeyFn })
  PluralRules(locales: Intl.LocalesArgument, options: Intl.PluralRulesOptions): Intl.PluralRules {
    return new Intl.PluralRules(locales, options)
  }

  @_Memo({ cacheKeyFn: intlCacheKeyFn })
  ListFormat(locales: Intl.LocalesArgument, options: Intl.ListFormatOptions): Intl.ListFormat {
    return new Intl.ListFormat(locales, options)
  }

  @_Memo({ cacheKeyFn: intlCacheKeyFn })
  DisplayNames(
    locales: Intl.LocalesArgument,
    options: Intl.DisplayNamesOptions,
  ): Intl.DisplayNames {
    return new Intl.DisplayNames(locales, options)
  }

  @_Memo({ cacheKeyFn: intlCacheKeyFn })
  Segmenter(locales: Intl.LocalesArgument, options: Intl.SegmenterOptions): Intl.Segmenter {
    return new Intl.Segmenter(locales, options)
  }
}

export const Intl2 = new MemoizedIntl()

/**
 * Default `jsonMemoSerializer` would serialize `Intl.Locale` instances as `{}`,
 * making all Locale arguments share one cache key. Convert them to their string tags instead.
 *
 * Options keys are serialized in sorted order, so that `{ a, b }` and `{ b, a }` share one cache key.
 * Passing a keys array as replacer works, because Intl options are flat objects.
 */
function intlCacheKeyFn([locales, options]: [Intl.LocalesArgument, AnyObject]): string {
  return JSON.stringify(localesKey(locales)) + JSON.stringify(options, Object.keys(options).sort())
}

function localesKey(locales: Intl.LocalesArgument): string | string[] | undefined {
  if (locales === undefined) return
  if (Array.isArray(locales)) return locales.map(String)
  return String(locales)
}
