import { pMap } from '../../promise/pMap.js'
import type { StringMap } from '../../types.js'

export type MissingTranslationHandler = (key: string, params?: StringMap<any>) => string

export const defaultMissingTranslationHandler: MissingTranslationHandler = key => {
  console.warn(`[tr] missing: ${key}`)
  return `[${key}]`
}

export interface TranslationServiceCfg {
  defaultLocale: string
  supportedLocales: string[]

  /**
   * It is allowed to set it later. Will default to `defaultLocale` in that case.
   */
  currentLocale?: string

  translationLoader: TranslationLoader

  /**
   * Defaults to `defaultMissingTranslationHandler` that returns `[${key}]` and emits console warning.
   */
  missingTranslationHandler?: MissingTranslationHandler
}

export interface TranslationServiceCfgComplete extends TranslationServiceCfg {
  missingTranslationHandler: MissingTranslationHandler // non-optional
}

export interface TranslationLoader {
  load: (locale: string) => Promise<StringMap>
}

export class TranslationService {
  constructor(cfg: TranslationServiceCfg, preloadedLocales: StringMap<StringMap> = {}) {
    this.cfg = {
      ...cfg,
      missingTranslationHandler: defaultMissingTranslationHandler,
    }

    this.locales = {
      ...preloadedLocales,
    }

    this.currentLocale = cfg.currentLocale || cfg.defaultLocale
  }

  cfg: TranslationServiceCfgComplete

  /**
   * Cache of loaded locales
   */
  locales: StringMap<StringMap>

  currentLocale: string

  /**
   * Manually set locale data, bypassing the TranslationLoader.
   */
  setLocale(localeName: string, locale: StringMap): void {
    this.locales[localeName] = locale
  }

  getLocale(locale: string): StringMap | undefined {
    return this.locales[locale]
  }

  /**
   * Loads locale(s) (if not already cached) via configured TranslationLoader.
   * Resolves promise when done (ready to be used).
   */
  async loadLocale(locale: string | readonly string[]): Promise<void> {
    const locales = Array.isArray(locale) ? locale : [locale]

    await pMap(locales, async locale => {
      if (this.locales[locale]) return // already loaded
      this.locales[locale] = await this.cfg.translationLoader.load(locale)
      // console.log(`[tr] locale loaded: ${locale}`)
    })
  }

  /**
   * Will invoke `missingTranslationHandler` on missing tranlation.
   *
   * Does NOT do any locale loading. The locale needs to be loaded beforehand:
   * either pre-loaded and passed to the constructor,
   * or `await loadLocale(locale)`.
   */
  translate(key: string, params?: StringMap): string {
    return this.translateIfExists(key, params) || this.cfg.missingTranslationHandler(key, params)
  }

  /**
   * Does NOT invoke `missingTranslationHandler`, returns `undefined` instead.
   */
  translateIfExists(key: string, _params?: StringMap): string | undefined {
    // todo: support params
    return this.locales[this.currentLocale]?.[key] || this.locales[this.cfg.defaultLocale]?.[key]
  }
}
