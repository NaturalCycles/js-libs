import { _Memo } from '../decorators/memo.decorator.js'

/**
 * Returns cached Intl.* formatters, because they are known to be
 * very slow to create.
 *
 * See https://github.com/poppinss/intl-formatter
 *
 * Methods accept non-optional arguments consciously,
 * to be able to cache them better. Just pass {} for options.
 */
class MemoizedIntl {
  @_Memo()
  DateTimeFormat(
    locales: Intl.LocalesArgument,
    options: Intl.DateTimeFormatOptions,
  ): Intl.DateTimeFormat {
    return new Intl.DateTimeFormat(locales, options)
  }

  @_Memo()
  RelativeTimeFormat(
    locales: Intl.LocalesArgument,
    options: Intl.RelativeTimeFormatOptions,
  ): Intl.RelativeTimeFormat {
    return new Intl.RelativeTimeFormat(locales, options)
  }

  @_Memo()
  NumberFormat(
    locales: Intl.LocalesArgument,
    options: Intl.NumberFormatOptions,
  ): Intl.NumberFormat {
    return new Intl.NumberFormat(locales, options)
  }

  @_Memo()
  Collator(locales: Intl.LocalesArgument, options: Intl.CollatorOptions): Intl.Collator {
    return new Intl.Collator(locales, options)
  }

  @_Memo()
  PluralRules(locales: Intl.LocalesArgument, options: Intl.PluralRulesOptions): Intl.PluralRules {
    return new Intl.PluralRules(locales, options)
  }

  @_Memo()
  ListFormat(locales: Intl.LocalesArgument, options: Intl.ListFormatOptions): Intl.ListFormat {
    return new Intl.ListFormat(locales, options)
  }

  @_Memo()
  DisplayNames(
    locales: Intl.LocalesArgument,
    options: Intl.DisplayNamesOptions,
  ): Intl.DisplayNames {
    return new Intl.DisplayNames(locales, options)
  }
}

export const Intl2 = new MemoizedIntl()
