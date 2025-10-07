// Relevant material:
// https://deviceandbrowserinfo.com/learning_zone/articles/detecting-headless-chrome-puppeteer-2024

import { BotReason } from '../bot.model.js'
import { isServerSide } from '../env.js'

export interface BotDetectionServiceCfg {
  /**
   * Defaults to true.
   * Set to false if you need to disable it under certain conditions (e.g in Angular unit tests so it doesn't scream 'Error!')
   */
  enabled?: boolean

  /**
   * Defaults to false.
   * If true - the instance will memoize (remember) the results of the detection
   * and won't re-run it.
   */
  memoizeResults?: boolean

  /**
   * Defaults to false.
   * If set to true: `getBotReason()` would return BotReason.CDP if CDP is detected.
   * Otherwise - `getBotReason()` will not perform the CDP check.
   */
  treatCDPAsBotReason?: boolean
}

const botRegex =
  /bot|spider|crawl|headless|electron|phantom|slimer|proximic|cincraw|slurp|MicrosoftPreview|ahrefs|preview|lighthouse|facebookexternal|pinterest|screaming|apis-google|duplexweb-google|feedfetcher-google|google-read-aloud|googleweblight|mediapartners-google/i

/**
 * Service to detect bots and CDP (Chrome DevTools Protocol).
 *
 * @experimental
 */
export class BotDetectionService {
  constructor(public cfg: BotDetectionServiceCfg = {}) {}

  // memoized results
  private botReason: BotReason | null | undefined
  private cdp: boolean | undefined

  isBotOrCDP(): boolean {
    return !!this.getBotReason() || this.isCDP()
  }

  isBot(): boolean {
    return !!this.getBotReason()
  }

  /**
   * Returns null if it's not a Bot,
   * otherwise a truthy BotReason.
   */
  getBotReason(): BotReason | null {
    if (this.cfg.enabled === false) return null
    if (this.cfg.memoizeResults && this.botReason !== undefined) {
      return this.botReason
    }

    this.botReason = this.detectBotReason()
    return this.botReason
  }

  private detectBotReason(): BotReason | null {
    // SSR - not a bot
    if (isServerSide()) return null
    const { navigator } = globalThis
    if (!navigator) return BotReason.NoNavigator
    const { userAgent } = navigator
    if (!userAgent) return BotReason.NoUserAgent

    if (botRegex.test(userAgent)) {
      return BotReason.UserAgent
    }

    if (navigator.webdriver) {
      return BotReason.WebDriver
    }

    // Kirill: commented out, as it's no longer seems reliable,
    // e.g generates false positives with latest Android clients (e.g. Chrome 129)
    // if (navigator.plugins?.length === 0) {
    //   return BotReason.ZeroPlugins // Headless Chrome
    // }

    if ((navigator.languages as any) === '') {
      return BotReason.EmptyLanguages // Headless Chrome
    }

    // isChrome is true if the browser is Chrome, Chromium or Opera
    // this is "the chrome test" from https://intoli.com/blog/not-possible-to-block-chrome-headless/
    // this property is for some reason not present by default in headless chrome
    // Kirill: criterium removed due to false positives with Android
    // if (userAgent.includes('Chrome') && !(globalThis as any).chrome) {
    //   return BotReason.ChromeWithoutChrome // Headless Chrome
    // }

    if (this.cfg.treatCDPAsBotReason && this.isCDP()) {
      return BotReason.CDP
    }

    return null
  }

  /**
   * CDP stands for Chrome DevTools Protocol.
   * This function tests if the current environment is a CDP environment.
   * If it's true - it's one of:
   *
   * 1. Bot, automated with CDP, e.g Puppeteer, Playwright or such.
   * 2. Developer with Chrome DevTools open.
   *
   * 2 is certainly not a bot, but unfortunately we can't distinguish between the two.
   * That's why this function is not part of `isBot()`, because it can give "false positive" with DevTools.
   *
   * Based on: https://deviceandbrowserinfo.com/learning_zone/articles/detecting-headless-chrome-puppeteer-2024
   */
  isCDP(): boolean {
    if (this.cfg.enabled === false) return false
    if (this.cfg.memoizeResults && this.cdp !== undefined) {
      return this.cdp
    }

    this.cdp = this.detectCDP()
    return this.cdp
  }

  private detectCDP(): boolean {
    if (isServerSide()) return false
    let cdpCheck1 = false
    try {
      /* eslint-disable */
      const e = new window.Error()
      window.Object.defineProperty(e, 'stack', {
        configurable: false,
        enumerable: false,
        get: function () {
          cdpCheck1 = true
          return ''
        },
      })
      // This is part of the detection and shouldn't be deleted
      window.console.debug(e)
      /* eslint-enable */
    } catch {}
    return cdpCheck1
  }
}
