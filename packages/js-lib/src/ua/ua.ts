// Vendored & modernized from https://github.com/mcollina/my-ua-parser (v2.0.4, commit 0ff5baa),
// which is an MIT fork of https://github.com/faisalman/ua-parser-js
// Copyright © 2024 Matteo Collina <hello@matteocollina.com>
// Copyright © 2012-2025 Faisal Salman <f@faisalman.com>
// MIT license.
//
// Regex data refreshed from ua-parser-js v1.0.41 (`1.0.x` branch, 2025-08-19), which stayed
// MIT-licensed. Nothing is taken from ua-parser-js v2.x, which is AGPL-3.0-licensed.
//
// Detects Browser, Engine, OS, CPU and Device type/model from a User-Agent string.
// Supports browser & Node.js environments.

// oxlint-disable no-useless-escape -- regexes are preserved verbatim from upstream, incl. escapes

/// <reference lib="dom" preserve="true" />

export type UADeviceType = 'console' | 'mobile' | 'tablet' | 'smarttv' | 'wearable' | 'embedded'

/**
 * Popular OS names as produced by the parser, for convenient comparisons
 * (`os.name === UAOSName.iOS`) without magic strings.
 *
 * Not exhaustive - the parser emits many more names; compare against a string for the rest.
 */
export enum UAOSName {
  iOS = 'iOS',
  Android = 'Android',
  MacOS = 'Mac OS',
  Windows = 'Windows',
  Linux = 'Linux',
  ChromiumOS = 'Chromium OS',
  WatchOS = 'watchOS',
}

/**
 * Popular browser names as produced by the parser, for convenient comparisons
 * (`browser.name === UABrowserName.Safari`) without magic strings.
 *
 * Not exhaustive - the parser emits many more names; compare against a string for the rest.
 */
export enum UABrowserName {
  Chrome = 'Chrome',
  ChromeWebView = 'Chrome WebView',
  ChromeHeadless = 'Chrome Headless',
  Safari = 'Safari',
  MobileSafari = 'Mobile Safari',
  Firefox = 'Firefox',
  Edge = 'Edge',
  Opera = 'Opera',
  SamsungInternet = 'Samsung Internet',
  Facebook = 'Facebook',
  Instagram = 'Instagram',
  /**
   * Bare WebKit UA without a Safari token, typically an iOS in-app webview (e.g. WKWebView).
   */
  WebKit = 'WebKit',
}

export interface UABrowser {
  /**
   * E.g Chrome, Edge, Firefox, Safari, Mobile Safari, Opera, IE, UCBrowser, WeChat, ...
   * Popular values are available as `UABrowserName`.
   */
  name: string | undefined
  version: string | undefined
  /**
   * Major version, e.g. '20' for version '20.0.1090.0'.
   */
  major: string | undefined
}

export interface UACpu {
  /**
   * E.g 68k, amd64, arm, arm64, armhf, avr, ia32, ia64, irix, irix64, mips, mips64,
   * pa-risc, ppc, sparc, sparc64.
   */
  architecture: string | undefined
}

export interface UADevice {
  /**
   * E.g Apple, Samsung, Huawei, Xiaomi, Google, Sony, LG, Microsoft, Amazon, ...
   */
  vendor: string | undefined
  model: string | undefined
  /**
   * Undefined means "desktop-like" (no specific device type detected).
   */
  type: UADeviceType | undefined
}

export interface UAEngine {
  /**
   * E.g Blink, Gecko, WebKit, EdgeHTML, Presto, Trident, ...
   */
  name: string | undefined
  version: string | undefined
}

export interface UAOS {
  /**
   * E.g Windows, iOS, Mac OS, Android, Linux, Chromium OS, ...
   * Popular values are available as `UAOSName`.
   */
  name: string | undefined
  version: string | undefined
}

export interface UAResult {
  ua: string
  browser: UABrowser
  engine: UAEngine
  os: UAOS
  device: UADevice
  cpu: UACpu
}

export type UAMapperFn = (match: string) => string | undefined
export type UAStrMap = Record<string, string | string[]>

/**
 * Describes how a regex capture group is assigned to a result property:
 * - `prop` - assign the raw match
 * - `[prop, value]` - assign a fixed value (ignore the match)
 * - `[prop, fn]` - assign `fn(match)`
 * - `[prop, regex, replacement]` - assign `match.replace(regex, replacement)`
 * - `[prop, fn, map]` - assign `fn(match, map)` (string-map lookup)
 * - `[prop, regex, replacement, fn]` - assign `fn(match.replace(regex, replacement))`
 */
export type UAAction =
  | string
  | readonly [string, string]
  | readonly [string, UAMapperFn]
  | readonly [string, RegExp, string]
  | readonly [string, (str: string, map: UAStrMap) => string | undefined, UAStrMap]
  | readonly [string, RegExp, string, UAMapperFn]

/**
 * Alternating sequence of regex-list and action-list:
 * `[RegExp[], UAAction[], RegExp[], UAAction[], ...]`.
 * The regexes are tried in order; the first match wins and its capture groups
 * are assigned via the following action-list.
 */
export type UARegexMapEntry = RegExp[] | UAAction[]

/**
 * Custom regexes to extend the built-in ones.
 * Extension regexes are tried before the built-in regexes of the same category.
 */
export interface UAParserExtensions {
  browser?: UARegexMapEntry[]
  cpu?: UARegexMapEntry[]
  device?: UARegexMapEntry[]
  engine?: UARegexMapEntry[]
  os?: UARegexMapEntry[]
}

type UARegexMaps = Required<UAParserExtensions>

/**
 * Parses the given User-Agent string into browser, engine, os, device and cpu information.
 *
 * When `ua` is not provided and running in a browser - `navigator.userAgent` is used
 * (with client-hints-based refinements, e.g. Brave and iPadOS detection).
 */
export function parseUserAgent(userAgent?: string, extensions?: UAParserExtensions): UAResult {
  return new UAParser(userAgent, extensions).getResult()
}

export function uaParser(userAgent?: string, extensions?: UAParserExtensions): UAParser {
  return new UAParser(userAgent, extensions)
}

/**
 * User-Agent parser.
 *
 * Compared to `parseUserAgent()`, the class allows parsing only the needed parts
 * (e.g `getBrowser()` alone is much cheaper than `getResult()`),
 * and reusing the compiled extensions across multiple `setUA()` calls.
 */
export class UAParser {
  constructor(ua?: string, extensions?: UAParserExtensions) {
    this.nav = typeof globalThis.window !== 'undefined' ? globalThis.navigator : undefined
    this.rgxMap = extensions ? extend(regexes, extensions) : regexes
    const initialUa = ua || this.nav?.userAgent || ''
    // Whether we're parsing the environment's own UA - only then the
    // navigator-based refinements (Brave, client hints, iPadOS) apply
    this.isSelfNav = !!this.nav && this.nav.userAgent === initialUa
    this.setUA(initialUa)
  }

  private ua = ''
  private readonly nav: UaNavigator | undefined
  private readonly rgxMap: UARegexMaps
  private readonly isSelfNav: boolean
  // Lazily cached results shared by the is* helpers (so multiple checks cost one parse),
  // reset by setUA(). The get* methods deliberately stay uncached and return fresh objects.
  private cachedBrowser?: UABrowser
  private cachedOs?: UAOS
  private cachedDevice?: UADevice

  getBrowser(): UABrowser {
    const browser: UABrowser = { name: undefined, version: undefined, major: undefined }
    rgxMapper(browser, this.ua, this.rgxMap.browser)
    browser.major = majorize(browser.version)
    // Brave-specific detection
    if (this.isSelfNav && typeof this.nav?.brave?.isBrave === 'function') {
      browser.name = 'Brave'
    }
    return browser
  }

  getCPU(): UACpu {
    const cpu: UACpu = { architecture: undefined }
    rgxMapper(cpu, this.ua, this.rgxMap.cpu)
    return cpu
  }

  getDevice(): UADevice {
    const device: UADevice = { vendor: undefined, model: undefined, type: undefined }
    rgxMapper(device, this.ua, this.rgxMap.device)
    if (this.isSelfNav && !device.type && this.nav?.userAgentData?.mobile) {
      device.type = MOBILE
    }
    // iPadOS-specific detection: identified as Mac, but has some iOS-only properties
    if (
      this.isSelfNav &&
      device.model === 'Macintosh' &&
      typeof this.nav?.standalone !== 'undefined' &&
      this.nav.maxTouchPoints > 2
    ) {
      device.model = 'iPad'
      device.type = TABLET
    }
    return device
  }

  getEngine(): UAEngine {
    const engine: UAEngine = { name: undefined, version: undefined }
    rgxMapper(engine, this.ua, this.rgxMap.engine)
    return engine
  }

  getOS(): UAOS {
    const os: UAOS = { name: undefined, version: undefined }
    rgxMapper(os, this.ua, this.rgxMap.os)
    const platform = this.nav?.userAgentData?.platform
    if (this.isSelfNav && !os.name && platform && platform !== 'Unknown') {
      os.name = platform.replace(/chrome os/i, CHROMIUM_OS).replace(/macos/i, MAC_OS) // backward compatibility
    }
    return os
  }

  getResult(): UAResult {
    return {
      ua: this.getUA(),
      browser: this.getBrowser(),
      engine: this.getEngine(),
      os: this.getOS(),
      device: this.getDevice(),
      cpu: this.getCPU(),
    }
  }

  getUA(): string {
    return this.ua
  }

  setUA(ua: string | undefined): this {
    ua ||= ''
    this.ua = ua.length > UA_MAX_LENGTH ? ua.replace(/^\s\s*/, '').slice(0, UA_MAX_LENGTH) : ua
    this.cachedBrowser = this.cachedOs = this.cachedDevice = undefined
    return this
  }

  /**
   * True if the OS is iOS.
   * Note: desktop-mode iPads send a Mac-like UA and are not detected as iOS
   * (except when parsing the browser's own UA, where client-hints refinements apply).
   */
  isIos(): boolean {
    return this.os().name === UAOSName.iOS
  }

  isAndroid(): boolean {
    return this.os().name === UAOSName.Android
  }

  isMacOs(): boolean {
    return this.os().name === UAOSName.MacOS
  }

  isWindows(): boolean {
    return this.os().name === UAOSName.Windows
  }

  /**
   * True for 'Chrome', 'Chrome WebView' and 'Chrome Headless' (not for Chromium).
   */
  isChrome(): boolean {
    return !!this.browser().name?.startsWith(UABrowserName.Chrome)
  }

  /**
   * True for 'Safari' and 'Mobile Safari' (not for bare-WebKit iOS in-app webviews).
   */
  isSafari(): boolean {
    const { name } = this.browser()
    return name === UABrowserName.Safari || name === UABrowserName.MobileSafari
  }

  isFirefox(): boolean {
    return this.browser().name === UABrowserName.Firefox
  }

  isEdge(): boolean {
    return this.browser().name === UABrowserName.Edge
  }

  /**
   * True if the device type is 'mobile' (phones; tablets are 'tablet' - see isTablet).
   */
  isMobile(): boolean {
    return this.device().type === MOBILE
  }

  isTablet(): boolean {
    return this.device().type === TABLET
  }

  private browser(): UABrowser {
    return (this.cachedBrowser ??= this.getBrowser())
  }

  private os(): UAOS {
    return (this.cachedOs ??= this.getOS())
  }

  private device(): UADevice {
    return (this.cachedDevice ??= this.getDevice())
  }
}

/**
 * Non-standard/experimental Navigator properties used for UA refinement.
 */
interface UaNavigator extends Navigator {
  userAgentData?: {
    mobile?: boolean
    platform?: string
  }
  brave?: {
    isBrave?: unknown
  }
  standalone?: boolean
}

///////////
// Helpers
//////////

function extend(defaults: UARegexMaps, extensions: UAParserExtensions): UARegexMaps {
  return {
    browser: mergeMapEntries(defaults.browser, extensions.browser),
    cpu: mergeMapEntries(defaults.cpu, extensions.cpu),
    device: mergeMapEntries(defaults.device, extensions.device),
    engine: mergeMapEntries(defaults.engine, extensions.engine),
    os: mergeMapEntries(defaults.os, extensions.os),
  }
}

function mergeMapEntries(
  defaults: UARegexMapEntry[],
  extension?: UARegexMapEntry[],
): UARegexMapEntry[] {
  // extension must be a valid alternating [regexes, actions, ...] sequence, otherwise ignored
  return extension?.length && extension.length % 2 === 0 ? extension.concat(defaults) : defaults
}

function rgxMapper(
  target: UABrowser | UACpu | UADevice | UAEngine | UAOS,
  ua: string,
  arrays: UARegexMapEntry[],
): void {
  const t = target as unknown as Record<string, string | undefined>
  let matches: RegExpExecArray | null = null

  // loop through all regexes maps
  for (let i = 0; i < arrays.length && !matches; i += 2) {
    const regexList = arrays[i] as RegExp[] // even sequence (0,2,4,..)
    const actions = arrays[i + 1] as UAAction[] // odd sequence (1,3,5,..)
    let k = 0

    // try matching uastring with regexes
    for (let j = 0; j < regexList.length && !matches; j++) {
      const regex = regexList[j]
      if (!regex) break
      matches = regex.exec(ua)

      if (matches) {
        for (const q of actions) {
          const match = matches[++k]
          if (typeof q === 'string') {
            // assign the raw match
            t[q] = match || undefined
          } else if (q.length === 2) {
            if (typeof q[1] === 'function') {
              // assign modified match
              t[q[0]] = match === undefined ? undefined : q[1](match)
            } else {
              // assign given value, ignore regex match
              t[q[0]] = q[1]
            }
          } else if (q.length === 3) {
            if (typeof q[1] === 'function') {
              // call function (usually string mapper)
              // typeof check on q[1] doesn't discriminate the tuple union, hence the cast
              const [prop, fn, map] = q as [
                string,
                (str: string, map: UAStrMap) => string | undefined,
                UAStrMap,
              ]
              t[prop] = match ? fn(match, map) : undefined
            } else {
              // sanitize match using given regex
              const [prop, rgx, replacement] = q as [string, RegExp, string]
              t[prop] = match ? match.replace(rgx, replacement) : undefined
            }
          } else if (q.length === 4) {
            t[q[0]] = match ? q[3](match.replace(q[1], q[2])) : undefined
          }
        }
      }
    }
  }
}

function strMapper(str: string, map: UAStrMap): string | undefined {
  for (const key of Object.keys(map)) {
    const value = map[key]!
    // check if current value is array
    if (Array.isArray(value)) {
      for (const v of value) {
        if (has(v, str)) {
          return key === UNKNOWN ? undefined : key
        }
      }
    } else if (has(value, str)) {
      return key === UNKNOWN ? undefined : key
    }
  }
  // '*' is a catch-all fallback value (always a string in the built-in maps)
  const fallback = map['*']
  return typeof fallback === 'string' ? fallback : str
}

function majorize(version: string | undefined): string | undefined {
  return typeof version === 'string' ? version.replaceAll(/[^\d\.]/g, '').split('.')[0] : undefined
}

function has(str1: string, str2: string): boolean {
  return lowerize(str2).includes(lowerize(str1))
}

function lowerize(str: string): string {
  return str.toLowerCase()
}

function trimStr(str: string): string {
  return str.replace(/^\s\s*/, '')
}

//////////////
// Constants
/////////////

const UNKNOWN = '?'
const UA_MAX_LENGTH = 500

const MODEL = 'model'
const NAME = 'name'
const TYPE = 'type'
const VENDOR = 'vendor'
const VERSION = 'version'
const ARCHITECTURE = 'architecture'
const CONSOLE = 'console'
const MOBILE = 'mobile'
const TABLET = 'tablet'
const SMARTTV = 'smarttv'
const WEARABLE = 'wearable'
const EMBEDDED = 'embedded'

const AMAZON = 'Amazon'
const APPLE = 'Apple'
const ASUS = 'ASUS'
const BLACKBERRY = 'BlackBerry'
const BROWSER = 'Browser'
const SUFFIX_BROWSER = ' Browser'
const CHROME = UABrowserName.Chrome
const EDGE = UABrowserName.Edge
const FIREFOX = UABrowserName.Firefox
const GOOGLE = 'Google'
const HONOR = 'Honor'
const HUAWEI = 'Huawei'
const LENOVO = 'Lenovo'
const LG = 'LG'
const MICROSOFT = 'Microsoft'
const MOTOROLA = 'Motorola'
const NVIDIA = 'Nvidia'
const ONEPLUS = 'OnePlus'
const OPERA = UABrowserName.Opera
const OPPO = 'OPPO'
const SAMSUNG = 'Samsung'
const SHARP = 'Sharp'
const SONY = 'Sony'
const XIAOMI = 'Xiaomi'
const ZEBRA = 'Zebra'
const FACEBOOK = UABrowserName.Facebook
const CHROMIUM_OS = UAOSName.ChromiumOS
const MAC_OS = UAOSName.MacOS

///////////////
// String maps
//////////////

// Safari < 3.0
const oldSafariMap: UAStrMap = {
  '1.0': '/8',
  '1.2': '/1',
  '1.3': '/3',
  '2.0': '/412',
  '2.0.2': '/416',
  '2.0.3': '/417',
  '2.0.4': '/419',
  '?': '/',
}

const windowsVersionMap: UAStrMap = {
  ME: '4.90',
  'NT 3.11': 'NT3.51',
  'NT 4.0': 'NT4.0',
  2000: 'NT 5.0',
  XP: ['NT 5.1', 'NT 5.2'],
  Vista: 'NT 6.0',
  7: 'NT 6.1',
  8: 'NT 6.2',
  8.1: 'NT 6.3',
  10: ['NT 6.4', 'NT 10.0'],
  RT: 'ARM',
}

//////////////
// Regex map
/////////////

// The regexes below are preserved verbatim from upstream ua-parser-js 1.0.41 (MIT) -
// do not "fix" escapes or simplify them, to keep them diffable against upstream.

const regexes: UARegexMaps = {
  browser: [
    [
      /\b(?:crmo|crios)\/([\w\.]+)/i, // Chrome for Android/iOS
    ],
    [VERSION, [NAME, CHROME]],
    [
      /edg(?:e|ios|a)?\/([\w\.]+)/i, // Microsoft Edge
    ],
    [VERSION, [NAME, EDGE]],
    [
      // Presto based
      /(opera mini)\/([-\w\.]+)/i, // Opera Mini
      /(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i, // Opera Mobi/Tablet
      /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i, // Opera
    ],
    [NAME, VERSION],
    [
      /opios[\/ ]+([\w\.]+)/i, // Opera mini on iphone >= 8.0
    ],
    [VERSION, [NAME, OPERA + ' Mini']],
    [
      /\bop(?:rg)?x\/([\w\.]+)/i, // Opera GX
    ],
    [VERSION, [NAME, OPERA + ' GX']],
    [
      /\bopr\/([\w\.]+)/i, // Opera Webkit
    ],
    [VERSION, [NAME, OPERA]],
    [
      // Mixed
      /\bb[ai]*d(?:uhd|[ub]*[aekoprswx]{5,6})[\/ ]?([\w\.]+)/i, // Baidu
    ],
    [VERSION, [NAME, 'Baidu']],
    [
      /\b(?:mxbrowser|mxios|myie2)\/?([-\w\.]*)\b/i, // Maxthon
    ],
    [VERSION, [NAME, 'Maxthon']],
    [
      /(kindle)\/([\w\.]+)/i, // Kindle
      /(lunascape|maxthon|netfront|jasmine|blazer|sleipnir)[\/ ]?([\w\.]*)/i,
      // Lunascape/Maxthon/Netfront/Jasmine/Blazer/Sleipnir
      // Trident based
      /(avant|iemobile|slim(?:browser|boat|jet))[\/ ]?([\d\.]*)/i, // Avant/IEMobile/SlimBrowser/SlimBoat/Slimjet
      /(?:ms|\()(ie) ([\w\.]+)/i, // Internet Explorer

      // Blink/Webkit/KHTML based                                         // Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron/Iridium/PhantomJS/Bowser/QupZilla/Falkon
      /(flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs|bowser|qupzilla|falkon|rekonq|puffin|brave|whale(?!.+naver)|qqbrowserlite|duckduckgo|klar|helio|(?=comodo_)?dragon)\/([-\w\.]+)/i,
      // Rekonq/Puffin/Brave/Whale/QQBrowserLite/QQ//Vivaldi/DuckDuckGo/Klar/Helio/Dragon
      /(heytap|ovi|115)browser\/([\d\.]+)/i, // HeyTap/Ovi/115
      /(weibo)__([\d\.]+)/i, // Weibo
    ],
    [NAME, VERSION],
    [
      /quark(?:pc)?\/([-\w\.]+)/i, // Quark
    ],
    [VERSION, [NAME, 'Quark']],
    [
      /\bddg\/([\w\.]+)/i, // DuckDuckGo
    ],
    [VERSION, [NAME, 'DuckDuckGo']],
    [
      /(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i, // UCBrowser
    ],
    [VERSION, [NAME, 'UC' + BROWSER]],
    [
      /microm.+\bqbcore\/([\w\.]+)/i, // WeChat Desktop for Windows Built-in Browser
      /\bqbcore\/([\w\.]+).+microm/i,
      /micromessenger\/([\w\.]+)/i, // WeChat
    ],
    [VERSION, [NAME, 'WeChat']],
    [
      /konqueror\/([\w\.]+)/i, // Konqueror
    ],
    [VERSION, [NAME, 'Konqueror']],
    [
      /trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i, // IE11
    ],
    [VERSION, [NAME, 'IE']],
    [
      /ya(?:search)?browser\/([\w\.]+)/i, // Yandex
    ],
    [VERSION, [NAME, 'Yandex']],
    [
      /slbrowser\/([\w\.]+)/i, // Smart Lenovo Browser
    ],
    [VERSION, [NAME, 'Smart Lenovo ' + BROWSER]],
    [
      /(avast|avg)\/([\w\.]+)/i, // Avast/AVG Secure Browser
    ],
    [[NAME, /(.+)/, '$1 Secure ' + BROWSER], VERSION],
    [
      /\bfocus\/([\w\.]+)/i, // Firefox Focus
    ],
    [VERSION, [NAME, FIREFOX + ' Focus']],
    [
      /\bopt\/([\w\.]+)/i, // Opera Touch
    ],
    [VERSION, [NAME, OPERA + ' Touch']],
    [
      /coc_coc\w+\/([\w\.]+)/i, // Coc Coc Browser
    ],
    [VERSION, [NAME, 'Coc Coc']],
    [
      /dolfin\/([\w\.]+)/i, // Dolphin
    ],
    [VERSION, [NAME, 'Dolphin']],
    [
      /coast\/([\w\.]+)/i, // Opera Coast
    ],
    [VERSION, [NAME, OPERA + ' Coast']],
    [
      /miuibrowser\/([\w\.]+)/i, // MIUI Browser
    ],
    [VERSION, [NAME, 'MIUI' + SUFFIX_BROWSER]],
    [
      /fxios\/([\w\.-]+)/i, // Firefox for iOS
    ],
    [VERSION, [NAME, FIREFOX]],
    [
      /\bqihoobrowser\/?([\w\.]*)/i, // 360
    ],
    [VERSION, [NAME, '360']],
    [
      /\b(qq)\/([\w\.]+)/i, // QQ
    ],
    [[NAME, /(.+)/, '$1Browser'], VERSION],
    [/(oculus|sailfish|huawei|vivo|pico)browser\/([\w\.]+)/i],
    [[NAME, /(.+)/, '$1' + SUFFIX_BROWSER], VERSION], // Oculus/Sailfish/HuaweiBrowser/VivoBrowser/PicoBrowser
    [
      /samsungbrowser\/([\w\.]+)/i, // Samsung Internet
    ],
    [VERSION, [NAME, UABrowserName.SamsungInternet]],
    [
      /metasr[\/ ]?([\d\.]+)/i, // Sogou Explorer
    ],
    [VERSION, [NAME, 'Sogou Explorer']],
    [
      /(sogou)mo\w+\/([\d\.]+)/i, // Sogou Mobile
    ],
    [[NAME, 'Sogou Mobile'], VERSION],
    [
      /(electron)\/([\w\.]+) safari/i, // Electron-based App
      /(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i, // Tesla
      /m?(qqbrowser|2345(?=browser|chrome|explorer))\w*[\/ ]?v?([\w\.]+)/i, // QQ/2345
    ],
    [NAME, VERSION],
    [
      /(lbbrowser|rekonq)/i, // LieBao Browser/Rekonq
      /\[(linkedin)app\]/i, // LinkedIn App for iOS & Android
    ],
    [NAME],
    [
      /ome\/([\w\.]+) \w* ?(iron) saf/i, // Iron
      /ome\/([\w\.]+).+qihu (360)[es]e/i, // 360
    ],
    [VERSION, NAME],
    [
      // WebView
      /((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i, // Facebook App for iOS & Android
    ],
    [[NAME, FACEBOOK], VERSION],
    [
      /(Klarna)\/([\w\.]+)/i, // Klarna Shopping Browser for iOS & Android
      /(kakao(?:talk|story))[\/ ]([\w\.]+)/i, // Kakao App
      /(naver)\(.*?(\d+\.[\w\.]+).*\)/i, // Naver InApp
      /(daum)apps[\/ ]([\w\.]+)/i, // Daum App
      /safari (line)\/([\w\.]+)/i, // Line App for iOS
      /\b(line)\/([\w\.]+)\/iab/i, // Line App for Android
      /(alipay)client\/([\w\.]+)/i, // Alipay
      /(twitter)(?:and| f.+e\/([\w\.]+))/i, // Twitter
      /(chromium|instagram|snapchat)[\/ ]([-\w\.]+)/i, // Chromium/Instagram/Snapchat
    ],
    [NAME, VERSION],
    [
      /\bgsa\/([\w\.]+) .*safari\//i, // Google Search Appliance on iOS
    ],
    [VERSION, [NAME, 'GSA']],
    [
      /musical_ly(?:.+app_?version\/|_)([\w\.]+)/i, // TikTok
    ],
    [VERSION, [NAME, 'TikTok']],
    [
      /headlesschrome(?:\/([\w\.]+)| )/i, // Chrome Headless
    ],
    [VERSION, [NAME, UABrowserName.ChromeHeadless]],
    [
      / wv\).+(chrome)\/([\w\.]+)/i, // Chrome WebView
    ],
    [[NAME, UABrowserName.ChromeWebView], VERSION],
    [
      /droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i, // Android Browser
    ],
    [VERSION, [NAME, 'Android ' + BROWSER]],
    [
      /(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i, // Chrome/OmniWeb/Arora/Tizen/Nokia
    ],
    [NAME, VERSION],
    [
      /version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i, // Mobile Safari
    ],
    [VERSION, [NAME, UABrowserName.MobileSafari]],
    [
      /version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i, // Safari & Safari Mobile
    ],
    [VERSION, NAME],
    [
      /webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i, // Safari < 3.0
    ],
    [NAME, [VERSION, strMapper, oldSafariMap]],
    [/(webkit|khtml)\/([\w\.]+)/i],
    [NAME, VERSION],
    [
      // Gecko based
      /(navigator|netscape\d?)\/([-\w\.]+)/i, // Netscape
    ],
    [[NAME, 'Netscape'], VERSION],
    [
      /(wolvic|librewolf)\/([\w\.]+)/i, // Wolvic/LibreWolf
    ],
    [NAME, VERSION],
    [
      /mobile vr; rv:([\w\.]+)\).+firefox/i, // Firefox Reality
    ],
    [VERSION, [NAME, FIREFOX + ' Reality']],
    [
      /ekiohf.+(flow)\/([\w\.]+)/i, // Flow
      /(swiftfox)/i, // Swiftfox
      /(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror)[\/ ]?([\w\.\+]+)/i,
      // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
      /(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i,
      // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
      /(firefox)\/([\w\.]+)/i, // Other Firefox-based
      /(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i, // Mozilla
    ],
    [NAME, VERSION],
    [
      // Other
      /(amaya|dillo|doris|icab|ladybird|lynx|mosaic|netsurf|obigo|polaris|w3m|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i,
      // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf/Obigo/Mosaic/Go/ICE/UP.Browser/Ladybird
      /\b(links) \(([\w\.]+)/i, // Links
    ],
    [NAME, [VERSION, /_/g, '.']],
    [
      /(cobalt)\/([\w\.]+)/i, // Cobalt
    ],
    [NAME, [VERSION, /master.|lts./, '']],
  ],

  cpu: [
    [
      /\b((amd|x|x86[-_]?|wow|win)64)\b/i, // AMD64 (x64)
    ],
    [[ARCHITECTURE, 'amd64']],
    [
      /(ia32(?=;))/i, // IA32 (quicktime)
      /\b((i[346]|x)86)(pc)?\b/i, // IA32 (x86)
    ],
    [[ARCHITECTURE, 'ia32']],
    [
      /\b(aarch64|arm(v?[89]e?l?|_?64))\b/i, // ARM64
    ],
    [[ARCHITECTURE, 'arm64']],
    [
      /\b(arm(v[67])?ht?n?[fl]p?)\b/i, // ARMHF
    ],
    [[ARCHITECTURE, 'armhf']],
    [
      // PocketPC mistakenly identified as PowerPC
      /( (ce|mobile); ppc;|\/[\w\.]+arm\b)/i,
    ],
    [[ARCHITECTURE, 'arm']],
    [
      /((ppc|powerpc)(64)?)( mac|;|\))/i, // PowerPC
    ],
    [[ARCHITECTURE, /ower/, '', lowerize]],
    [
      / sun4\w[;\)]/i, // SPARC
    ],
    [[ARCHITECTURE, 'sparc']],
    [
      /\b(avr32|ia64(?=;)|68k(?=\))|\barm(?=v([1-7]|[5-7]1)l?|;|eabi)|(irix|mips|sparc)(64)?\b|pa-risc)/i,
      // IA64, 68K, ARM/64, AVR/32, IRIX/64, MIPS/64, SPARC/64, PA-RISC
    ],
    [[ARCHITECTURE, lowerize]],
  ],

  device: [
    [
      //////////////////////////
      // MOBILES & TABLETS
      /////////////////////////

      // Samsung
      /\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i,
    ],
    [MODEL, [VENDOR, SAMSUNG], [TYPE, TABLET]],
    [
      /\b((?:s[cgp]h|gt|sm)-(?![lr])\w+|sc[g-]?[\d]+a?|galaxy nexus)/i,
      /samsung[- ]((?!sm-[lr])[-\w]+)/i,
      /sec-(sgh\w+)/i,
    ],
    [MODEL, [VENDOR, SAMSUNG], [TYPE, MOBILE]],
    [
      // Apple
      /(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i, // iPod/iPhone
    ],
    [MODEL, [VENDOR, APPLE], [TYPE, MOBILE]],
    [
      /\((ipad);[-\w\),; ]+apple/i, // iPad
      /applecoremedia\/[\w\.]+ \((ipad)/i,
      /\b(ipad)\d\d?,\d\d?[;\]].+ios/i,
    ],
    [MODEL, [VENDOR, APPLE], [TYPE, TABLET]],
    [/(macintosh);/i],
    [MODEL, [VENDOR, APPLE]],
    [
      // Sharp
      /\b(sh-?[altvz]?\d\d[a-ekm]?)/i,
    ],
    [MODEL, [VENDOR, SHARP], [TYPE, MOBILE]],
    [
      // Honor
      /\b((?:brt|eln|hey2?|gdi|jdn)-a?[lnw]09|(?:ag[rm]3?|jdn2|kob2)-a?[lw]0[09]hn)(?: bui|\)|;)/i,
    ],
    [MODEL, [VENDOR, HONOR], [TYPE, TABLET]],
    [/honor([-\w ]+)[;\)]/i],
    [MODEL, [VENDOR, HONOR], [TYPE, MOBILE]],
    [
      // Huawei
      /\b((?:ag[rs][2356]?k?|bah[234]?|bg[2o]|bt[kv]|cmr|cpn|db[ry]2?|jdn2|got|kob2?k?|mon|pce|scm|sht?|[tw]gr|vrd)-[ad]?[lw][0125][09]b?|605hw|bg2-u03|(?:gem|fdr|m2|ple|t1)-[7a]0[1-4][lu]|t1-a2[13][lw]|mediapad[\w\. ]*(?= bui|\)))\b(?!.+d\/s)/i,
    ],
    [MODEL, [VENDOR, HUAWEI], [TYPE, TABLET]],
    [
      /(?:huawei)([-\w ]+)[;\)]/i,
      /\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i,
    ],
    [MODEL, [VENDOR, HUAWEI], [TYPE, MOBILE]],
    [
      // Xiaomi
      /oid[^\)]+; (2[\dbc]{4}(182|283|rp\w{2})[cgl]|m2105k81a?c)(?: bui|\))/i,
      /\b((?:red)?mi[-_ ]?pad[\w- ]*)(?: bui|\))/i, // Mi Pad tablets
    ],
    [
      [MODEL, /_/g, ' '],
      [VENDOR, XIAOMI],
      [TYPE, TABLET],
    ],
    [
      /\b(poco[\w ]+|m2\d{3}j\d\d[a-z]{2})(?: bui|\))/i, // Xiaomi POCO
      /\b; (\w+) build\/hm\1/i, // Xiaomi Hongmi 'numeric' models
      /\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i, // Xiaomi Hongmi
      /\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i, // Xiaomi Redmi
      /oid[^\)]+; (m?[12][0-389][01]\w{3,6}[c-y])( bui|; wv|\))/i, // Xiaomi Redmi 'numeric' models
      /\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite|pro)?)(?: bui|\))/i, // Xiaomi Mi
      / ([\w ]+) miui\/v?\d/i,
    ],
    [
      [MODEL, /_/g, ' '],
      [VENDOR, XIAOMI],
      [TYPE, MOBILE],
    ],
    [
      // OPPO
      /; (\w+) bui.+ oppo/i,
      /\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i,
    ],
    [MODEL, [VENDOR, OPPO], [TYPE, MOBILE]],
    [/\b(opd2(\d{3}a?))(?: bui|\))/i],
    [MODEL, [VENDOR, strMapper, { OnePlus: ['304', '403', '203'], '*': OPPO }], [TYPE, TABLET]],
    [
      // Vivo
      /vivo (\w+)(?: bui|\))/i,
      /\b(v[12]\d{3}\w?[at])(?: bui|;)/i,
    ],
    [MODEL, [VENDOR, 'Vivo'], [TYPE, MOBILE]],
    [
      // Realme
      /\b(rmx[1-3]\d{3})(?: bui|;|\))/i,
    ],
    [MODEL, [VENDOR, 'Realme'], [TYPE, MOBILE]],
    [
      // Motorola
      /\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i,
      /\bmot(?:orola)?[- ](\w*)/i,
      /((?:moto(?! 360)[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i,
    ],
    [MODEL, [VENDOR, MOTOROLA], [TYPE, MOBILE]],
    [/\b(mz60\d|xoom[2 ]{0,2}) build\//i],
    [MODEL, [VENDOR, MOTOROLA], [TYPE, TABLET]],
    [
      // LG
      /((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i,
    ],
    [MODEL, [VENDOR, LG], [TYPE, TABLET]],
    [
      /(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i,
      /\blg[-e;\/ ]+((?!browser|netcast|android tv|watch)\w+)/i,
      /\blg-?([\d\w]+) bui/i,
    ],
    [MODEL, [VENDOR, LG], [TYPE, MOBILE]],
    [
      // Lenovo
      /(ideatab[-\w ]+|602lv|d-42a|a101lv|a2109a|a3500-hv|s[56]000|pb-6505[my]|tb-?x?\d{3,4}(?:f[cu]|xu|[av])|yt\d?-[jx]?\d+[lfmx])( bui|;|\)|\/)/i,
      /lenovo ?(b[68]0[08]0-?[hf]?|tab(?:[\w- ]+?)|tb[\w-]{6,7})( bui|;|\)|\/)/i,
    ],
    [MODEL, [VENDOR, LENOVO], [TYPE, TABLET]],
    [
      // Nokia
      /(nokia) (t[12][01])/i,
    ],
    [VENDOR, MODEL, [TYPE, TABLET]],
    [/(?:maemo|nokia).*(n900|lumia \d+|rm-\d+)/i, /nokia[-_ ]?(([-\w\. ]*))/i],
    [
      [MODEL, /_/g, ' '],
      [TYPE, MOBILE],
      [VENDOR, 'Nokia'],
    ],
    [
      // Google
      /(pixel (c|tablet))\b/i, // Google Pixel C/Tablet
    ],
    [MODEL, [VENDOR, GOOGLE], [TYPE, TABLET]],
    [
      /droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i, // Google Pixel
    ],
    [MODEL, [VENDOR, GOOGLE], [TYPE, MOBILE]],
    [
      // Sony
      /droid.+; (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i,
    ],
    [MODEL, [VENDOR, SONY], [TYPE, MOBILE]],
    [/sony tablet [ps]/i, /\b(?:sony)?sgp\w+(?: bui|\))/i],
    [
      [MODEL, 'Xperia Tablet'],
      [VENDOR, SONY],
      [TYPE, TABLET],
    ],
    [
      // OnePlus
      / (kb2005|in20[12]5|be20[12][59])\b/i,
      /(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i,
    ],
    [MODEL, [VENDOR, ONEPLUS], [TYPE, MOBILE]],
    [
      // Amazon
      /(alexa)webm/i,
      /(kf[a-z]{2}wi|aeo(?!bc)\w\w)( bui|\))/i, // Kindle Fire without Silk / Echo Show
      /(kf[a-z]+)( bui|\)).+silk\//i, // Kindle Fire HD
    ],
    [MODEL, [VENDOR, AMAZON], [TYPE, TABLET]],
    [
      /((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i, // Fire Phone
    ],
    [
      [MODEL, /(.+)/g, 'Fire Phone $1'],
      [VENDOR, AMAZON],
      [TYPE, MOBILE],
    ],
    [
      // BlackBerry
      /(playbook);[-\w\),; ]+(rim)/i, // BlackBerry PlayBook
    ],
    [MODEL, VENDOR, [TYPE, TABLET]],
    [
      /\b((?:bb[a-f]|st[hv])100-\d)/i,
      /\(bb10; (\w+)/i, // BlackBerry 10
    ],
    [MODEL, [VENDOR, BLACKBERRY], [TYPE, MOBILE]],
    [
      // Asus
      /(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i,
    ],
    [MODEL, [VENDOR, ASUS], [TYPE, TABLET]],
    [/ (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i],
    [MODEL, [VENDOR, ASUS], [TYPE, MOBILE]],
    [
      // HTC
      /(nexus 9)/i, // HTC Nexus 9
    ],
    [MODEL, [VENDOR, 'HTC'], [TYPE, TABLET]],
    [
      /(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i, // HTC

      // ZTE
      /(zte)[- ]([\w ]+?)(?: bui|\/|\))/i,
      /(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i, // Alcatel/GeeksPhone/Nexian/Panasonic/Sony
    ],
    [VENDOR, [MODEL, /_/g, ' '], [TYPE, MOBILE]],
    [
      // TCL
      /droid [\w\.]+; ((?:8[14]9[16]|9(?:0(?:48|60|8[01])|1(?:3[27]|66)|2(?:6[69]|9[56])|466))[gqswx])\w*(\)| bui)/i,
    ],
    [MODEL, [VENDOR, 'TCL'], [TYPE, TABLET]],
    [
      // itel
      /(itel) ((\w+))/i,
    ],
    [[VENDOR, lowerize], MODEL, [TYPE, strMapper, { tablet: ['p10001l', 'w7001'], '*': 'mobile' }]],
    [
      // Acer
      /droid.+; ([ab][1-7]-?[0178a]\d\d?)/i,
    ],
    [MODEL, [VENDOR, 'Acer'], [TYPE, TABLET]],
    [
      // Meizu
      /droid.+; (m[1-5] note) bui/i,
      /\bmz-([-\w]{2,})/i,
    ],
    [MODEL, [VENDOR, 'Meizu'], [TYPE, MOBILE]],
    [
      // Ulefone
      /; ((?:power )?armor(?:[\w ]{0,8}))(?: bui|\))/i,
    ],
    [MODEL, [VENDOR, 'Ulefone'], [TYPE, MOBILE]],
    [
      // Energizer
      /; (energy ?\w+)(?: bui|\))/i,
      /; energizer ([\w ]+)(?: bui|\))/i,
    ],
    [MODEL, [VENDOR, 'Energizer'], [TYPE, MOBILE]],
    [
      // Cat
      /; cat (b35);/i,
      /; (b15q?|s22 flip|s48c|s62 pro)(?: bui|\))/i,
    ],
    [MODEL, [VENDOR, 'Cat'], [TYPE, MOBILE]],
    [
      // Smartfren
      /((?:new )?andromax[\w- ]+)(?: bui|\))/i,
    ],
    [MODEL, [VENDOR, 'Smartfren'], [TYPE, MOBILE]],
    [
      // Nothing
      /droid.+; (a(?:015|06[35]|142p?))/i,
    ],
    [MODEL, [VENDOR, 'Nothing'], [TYPE, MOBILE]],
    [
      // Archos
      /; (x67 5g|tikeasy \w+|ac[1789]\d\w+)( b|\))/i,
      /archos ?(5|gamepad2?|([\w ]*[t1789]|hello) ?\d+[\w ]*)( b|\))/i,
    ],
    [MODEL, [VENDOR, 'Archos'], [TYPE, TABLET]],
    [/archos ([\w ]+)( b|\))/i, /; (ac[3-6]\d\w{2,8})( b|\))/i],
    [MODEL, [VENDOR, 'Archos'], [TYPE, MOBILE]],
    [
      // MIXED
      /(imo) (tab \w+)/i, // IMO
      /(infinix) (x1101b?)/i, // Infinix XPad
    ],
    [VENDOR, MODEL, [TYPE, TABLET]],
    [
      /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus(?! zenw)|dell|jolla|meizu|motorola|polytron|infinix|tecno|micromax|advan)[-_ ]?([-\w]*)/i,
      // BlackBerry/BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Meizu/Motorola/Polytron/Infinix/Tecno/Micromax/Advan
      /; (hmd|imo) ([\w ]+?)(?: bui|\))/i, // HMD/IMO
      /(hp) ([\w ]+\w)/i, // HP iPAQ
      /(microsoft); (lumia[\w ]+)/i, // Microsoft Lumia
      /(lenovo)[-_ ]?([-\w ]+?)(?: bui|\)|\/)/i, // Lenovo
      /(oppo) ?([\w ]+) bui/i, // OPPO
    ],
    [VENDOR, MODEL, [TYPE, MOBILE]],
    [
      /(kobo)\s(ereader|touch)/i, // Kobo
      /(hp).+(touchpad(?!.+tablet)|tablet)/i, // HP TouchPad
      /(kindle)\/([\w\.]+)/i, // Kindle
      /(nook)[\w ]+build\/(\w+)/i, // Nook
      /(dell) (strea[kpr\d ]*[\dko])/i, // Dell Streak
      /(le[- ]+pan)[- ]+(\w{1,9}) bui/i, // Le Pan Tablets
      /(trinity)[- ]*(t\d{3}) bui/i, // Trinity Tablets
      /(gigaset)[- ]+(q\w{1,9}) bui/i, // Gigaset Tablets
      /(vodafone) ([\w ]+)(?:\)| bui)/i, // Vodafone
    ],
    [VENDOR, MODEL, [TYPE, TABLET]],
    [
      /(surface duo)/i, // Surface Duo
    ],
    [MODEL, [VENDOR, MICROSOFT], [TYPE, TABLET]],
    [
      /droid [\d\.]+; (fp\du?)(?: b|\))/i, // Fairphone
    ],
    [MODEL, [VENDOR, 'Fairphone'], [TYPE, MOBILE]],
    [
      /(u304aa)/i, // AT&T
    ],
    [MODEL, [VENDOR, 'AT&T'], [TYPE, MOBILE]],
    [
      /\bsie-(\w*)/i, // Siemens
    ],
    [MODEL, [VENDOR, 'Siemens'], [TYPE, MOBILE]],
    [
      /\b(rct\w+) b/i, // RCA Tablets
    ],
    [MODEL, [VENDOR, 'RCA'], [TYPE, TABLET]],
    [
      /\b(venue[\d ]{2,7}) b/i, // Dell Venue Tablets
    ],
    [MODEL, [VENDOR, 'Dell'], [TYPE, TABLET]],
    [
      /\b(q(?:mv|ta)\w+) b/i, // Verizon Tablet
    ],
    [MODEL, [VENDOR, 'Verizon'], [TYPE, TABLET]],
    [
      /\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i, // Barnes & Noble Tablet
    ],
    [MODEL, [VENDOR, 'Barnes & Noble'], [TYPE, TABLET]],
    [/\b(tm\d{3}\w+) b/i],
    [MODEL, [VENDOR, 'NuVision'], [TYPE, TABLET]],
    [
      /\b(k88) b/i, // ZTE K Series Tablet
    ],
    [MODEL, [VENDOR, 'ZTE'], [TYPE, TABLET]],
    [
      /\b(nx\d{3}j) b/i, // ZTE Nubia
    ],
    [MODEL, [VENDOR, 'ZTE'], [TYPE, MOBILE]],
    [
      /\b(gen\d{3}) b.+49h/i, // Swiss GEN Mobile
    ],
    [MODEL, [VENDOR, 'Swiss'], [TYPE, MOBILE]],
    [
      /\b(zur\d{3}) b/i, // Swiss ZUR Tablet
    ],
    [MODEL, [VENDOR, 'Swiss'], [TYPE, TABLET]],
    [
      /\b((zeki)?tb.*\b) b/i, // Zeki Tablets
    ],
    [MODEL, [VENDOR, 'Zeki'], [TYPE, TABLET]],
    [
      /\b([yr]\d{2}) b/i,
      /\b(dragon[- ]+touch |dt)(\w{5}) b/i, // Dragon Touch Tablet
    ],
    [[VENDOR, 'Dragon Touch'], MODEL, [TYPE, TABLET]],
    [
      /\b(ns-?\w{0,9}) b/i, // Insignia Tablets
    ],
    [MODEL, [VENDOR, 'Insignia'], [TYPE, TABLET]],
    [
      /\b((nxa|next)-?\w{0,9}) b/i, // NextBook Tablets
    ],
    [MODEL, [VENDOR, 'NextBook'], [TYPE, TABLET]],
    [
      /\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i, // Voice Xtreme Phones
    ],
    [[VENDOR, 'Voice'], MODEL, [TYPE, MOBILE]],
    [
      /\b(lvtel\-)?(v1[12]) b/i, // LvTel Phones
    ],
    [[VENDOR, 'LvTel'], MODEL, [TYPE, MOBILE]],
    [
      /\b(ph-1) /i, // Essential PH-1
    ],
    [MODEL, [VENDOR, 'Essential'], [TYPE, MOBILE]],
    [
      /\b(v(100md|700na|7011|917g).*\b) b/i, // Envizen Tablets
    ],
    [MODEL, [VENDOR, 'Envizen'], [TYPE, TABLET]],
    [
      /\b(trio[-\w\. ]+) b/i, // MachSpeed Tablets
    ],
    [MODEL, [VENDOR, 'MachSpeed'], [TYPE, TABLET]],
    [
      /\btu_(1491) b/i, // Rotor Tablets
    ],
    [MODEL, [VENDOR, 'Rotor'], [TYPE, TABLET]],
    [
      /((?:tegranote|shield t(?!.+d tv))[\w- ]*?)(?: b|\))/i, // Nvidia Tablets
    ],
    [MODEL, [VENDOR, NVIDIA], [TYPE, TABLET]],
    [
      /(sprint) (\w+)/i, // Sprint Phones
    ],
    [VENDOR, MODEL, [TYPE, MOBILE]],
    [
      /(kin\.[onetw]{3})/i, // Microsoft Kin
    ],
    [
      [MODEL, /\./g, ' '],
      [VENDOR, MICROSOFT],
      [TYPE, MOBILE],
    ],
    [
      /droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i, // Zebra
    ],
    [MODEL, [VENDOR, ZEBRA], [TYPE, TABLET]],
    [/droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i],
    [MODEL, [VENDOR, ZEBRA], [TYPE, MOBILE]],
    [
      ///////////////////
      // SMARTTVS
      ///////////////////

      /smart-tv.+(samsung)/i, // Samsung
    ],
    [VENDOR, [TYPE, SMARTTV]],
    [/hbbtv.+maple;(\d+)/i],
    [
      [MODEL, /^/, 'SmartTV'],
      [VENDOR, SAMSUNG],
      [TYPE, SMARTTV],
    ],
    [
      /(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i, // LG SmartTV
    ],
    [
      [VENDOR, LG],
      [TYPE, SMARTTV],
    ],
    [
      /(apple) ?tv/i, // Apple TV
    ],
    [VENDOR, [MODEL, APPLE + ' TV'], [TYPE, SMARTTV]],
    [
      /crkey/i, // Google Chromecast
    ],
    [
      [MODEL, CHROME + 'cast'],
      [VENDOR, GOOGLE],
      [TYPE, SMARTTV],
    ],
    [
      /droid.+aft(\w+)( bui|\))/i, // Fire TV
    ],
    [MODEL, [VENDOR, AMAZON], [TYPE, SMARTTV]],
    [
      /(shield \w+ tv)/i, // Nvidia Shield TV
    ],
    [MODEL, [VENDOR, NVIDIA], [TYPE, SMARTTV]],
    [
      /\(dtv[\);].+(aquos)/i,
      /(aquos-tv[\w ]+)\)/i, // Sharp
    ],
    [MODEL, [VENDOR, SHARP], [TYPE, SMARTTV]],
    [
      /(bravia[\w ]+)( bui|\))/i, // Sony
    ],
    [MODEL, [VENDOR, SONY], [TYPE, SMARTTV]],
    [
      /(mi(tv|box)-?\w+) bui/i, // Xiaomi
    ],
    [MODEL, [VENDOR, XIAOMI], [TYPE, SMARTTV]],
    [
      /Hbbtv.*(technisat) (.*);/i, // TechniSAT
    ],
    [VENDOR, MODEL, [TYPE, SMARTTV]],
    [
      /\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i, // Roku
      /hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i, // HbbTV devices
    ],
    [
      [VENDOR, trimStr],
      [MODEL, trimStr],
      [TYPE, SMARTTV],
    ],
    [
      // SmartTV from Unidentified Vendors
      /droid.+; ([\w- ]+) (?:android tv|smart[- ]?tv)/i,
    ],
    [MODEL, [TYPE, SMARTTV]],
    [/\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i],
    [[TYPE, SMARTTV]],
    [
      ///////////////////
      // CONSOLES
      ///////////////////

      /(ouya)/i, // Ouya
      /(nintendo) ([wids3utch]+)/i, // Nintendo
    ],
    [VENDOR, MODEL, [TYPE, CONSOLE]],
    [
      /droid.+; (shield)( bui|\))/i, // Nvidia Portable
    ],
    [MODEL, [VENDOR, NVIDIA], [TYPE, CONSOLE]],
    [
      /(playstation \w+)/i, // Playstation
    ],
    [MODEL, [VENDOR, SONY], [TYPE, CONSOLE]],
    [
      /\b(xbox(?: one)?(?!; xbox))[\); ]/i, // Microsoft Xbox
    ],
    [MODEL, [VENDOR, MICROSOFT], [TYPE, CONSOLE]],
    [
      ///////////////////
      // WEARABLES
      ///////////////////

      /\b(sm-[lr]\d\d[0156][fnuw]?s?|gear live)\b/i, // Samsung Galaxy Watch
    ],
    [MODEL, [VENDOR, SAMSUNG], [TYPE, WEARABLE]],
    [
      /((pebble))app/i, // Pebble
      /(asus|google|lg|oppo) ((pixel |zen)?watch[\w ]*)( bui|\))/i, // Asus ZenWatch / LG Watch / Pixel Watch
    ],
    [VENDOR, MODEL, [TYPE, WEARABLE]],
    [
      /(ow(?:19|20)?we?[1-3]{1,3})/i, // Oppo Watch
    ],
    [MODEL, [VENDOR, OPPO], [TYPE, WEARABLE]],
    [
      /(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i, // Apple Watch
    ],
    [MODEL, [VENDOR, APPLE], [TYPE, WEARABLE]],
    [
      /(opwwe\d{3})/i, // OnePlus Watch
    ],
    [MODEL, [VENDOR, ONEPLUS], [TYPE, WEARABLE]],
    [
      /(moto 360)/i, // Motorola 360
    ],
    [MODEL, [VENDOR, MOTOROLA], [TYPE, WEARABLE]],
    [
      /(smartwatch 3)/i, // Sony SmartWatch
    ],
    [MODEL, [VENDOR, SONY], [TYPE, WEARABLE]],
    [
      /(g watch r)/i, // LG G Watch R
    ],
    [MODEL, [VENDOR, LG], [TYPE, WEARABLE]],
    [/droid.+; (wt63?0{2,3})\)/i],
    [MODEL, [VENDOR, ZEBRA], [TYPE, WEARABLE]],
    [
      ///////////////////
      // XR
      ///////////////////

      /droid.+; (glass) \d/i, // Google Glass
    ],
    [MODEL, [VENDOR, GOOGLE], [TYPE, WEARABLE]],
    [
      /(pico) (4|neo3(?: link|pro)?)/i, // Pico
    ],
    [VENDOR, MODEL, [TYPE, WEARABLE]],
    [
      /; (quest( \d| pro)?)/i, // Oculus Quest
    ],
    [MODEL, [VENDOR, FACEBOOK], [TYPE, WEARABLE]],
    [
      ///////////////////
      // EMBEDDED
      ///////////////////

      /(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i, // Tesla
    ],
    [VENDOR, [TYPE, EMBEDDED]],
    [
      /(aeobc)\b/i, // Echo Dot
    ],
    [MODEL, [VENDOR, AMAZON], [TYPE, EMBEDDED]],
    [
      /(homepod).+mac os/i, // Apple HomePod
    ],
    [MODEL, [VENDOR, APPLE], [TYPE, EMBEDDED]],
    [/windows iot/i],
    [[TYPE, EMBEDDED]],
    [
      ////////////////////
      // MIXED (GENERIC)
      ///////////////////

      /droid .+?; ([^;]+?)(?: bui|; wv\)|\) applew).+? mobile safari/i, // Android Phones from Unidentified Vendors
    ],
    [MODEL, [TYPE, MOBILE]],
    [
      /droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i, // Android Tablets from Unidentified Vendors
    ],
    [MODEL, [TYPE, TABLET]],
    [
      /\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i, // Unidentifiable Tablet
    ],
    [[TYPE, TABLET]],
    [
      /(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i, // Unidentifiable Mobile
    ],
    [[TYPE, MOBILE]],
    [
      /droid .+?; ([\w\. -]+)( bui|\))/i, // Generic Android Device
    ],
    [MODEL, [VENDOR, 'Generic']],
  ],

  engine: [
    [
      /windows.+ edge\/([\w\.]+)/i, // EdgeHTML
    ],
    [VERSION, [NAME, EDGE + 'HTML']],
    [
      /(arkweb)\/([\w\.]+)/i, // ArkWeb
    ],
    [NAME, VERSION],
    [
      /webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i, // Blink
    ],
    [VERSION, [NAME, 'Blink']],
    [
      /(presto)\/([\w\.]+)/i, // Presto
      /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna|servo)\/([\w\.]+)/i, // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m/Goanna/Servo
      /ekioh(flow)\/([\w\.]+)/i, // Flow
      /(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i, // KHTML/Tasman/Links
      /(icab)[\/ ]([23]\.[\d\.]+)/i, // iCab

      /\b(libweb)/i, // LibWeb
    ],
    [NAME, VERSION],
    [/ladybird\//i],
    [[NAME, 'LibWeb']],
    [
      /rv\:([\w\.]{1,9})\b.+(gecko)/i, // Gecko
    ],
    [VERSION, NAME],
  ],

  os: [
    [
      // Windows
      /microsoft (windows) (vista|xp)/i, // Windows (iTunes)
    ],
    [NAME, VERSION],
    [
      /(windows (?:phone(?: os)?|mobile|iot))[\/ ]?([\d\.\w ]*)/i, // Windows Phone
    ],
    [NAME, [VERSION, strMapper, windowsVersionMap]],
    [
      /windows nt 6\.2; (arm)/i, // Windows RT
      /windows[\/ ]([ntce\d\. ]+\w)(?!.+xbox)/i,
      /(?:win(?=3|9|n)|win 9x )([nt\d\.]+)/i,
    ],
    [
      [VERSION, strMapper, windowsVersionMap],
      [NAME, UAOSName.Windows],
    ],
    [
      // iOS/macOS
      /[adehimnop]{4,7}\b(?:.*os ([\w]+) like mac|; opera)/i, // iOS
      /(?:ios;fbsv\/|iphone.+ios[\/ ])([\d\.]+)/i,
      /cfnetwork\/.+darwin/i,
    ],
    [
      [VERSION, /_/g, '.'],
      [NAME, UAOSName.iOS],
    ],
    [
      /(mac os x) ?([\w\. ]*)/i,
      /(macintosh|mac_powerpc\b)(?!.+haiku)/i, // Mac OS
    ],
    [
      [NAME, MAC_OS],
      [VERSION, /_/g, '.'],
    ],
    [
      // Mobile OSes
      /droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i, // Android-x86/HarmonyOS
    ],
    [VERSION, NAME],
    [
      /(ubuntu) ([\w\.]+) like android/i, // Ubuntu Touch
    ],
    [[NAME, /(.+)/, '$1 Touch'], VERSION],
    [
      // Android/Blackberry/WebOS/QNX/Bada/RIM/KaiOS/Maemo/MeeGo/S40/Sailfish OS/OpenHarmony/Tizen
      /(android|bada|blackberry|kaios|maemo|meego|openharmony|qnx|rim tablet os|sailfish|series40|symbian|tizen|webos)\w*[-\/; ]?([\d\.]*)/i,
    ],
    [NAME, VERSION],
    [
      /\(bb(10);/i, // BlackBerry 10
    ],
    [VERSION, [NAME, BLACKBERRY]],
    [
      /(?:symbian ?os|symbos|s60(?=;)|series ?60)[-\/ ]?([\w\.]*)/i, // Symbian
    ],
    [VERSION, [NAME, 'Symbian']],
    [
      /mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i, // Firefox OS
    ],
    [VERSION, [NAME, FIREFOX + ' OS']],
    [
      /web0s;.+rt(tv)/i,
      /\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i, // WebOS
    ],
    [VERSION, [NAME, 'webOS']],
    [
      /watch(?: ?os[,\/]|\d,\d\/)([\d\.]+)/i, // watchOS
    ],
    [VERSION, [NAME, UAOSName.WatchOS]],
    [
      // Google Chromecast
      /crkey\/([\d\.]+)/i, // Google Chromecast
    ],
    [VERSION, [NAME, CHROME + 'cast']],
    [
      /(cros) [\w]+(?:\)| ([\w\.]+)\b)/i, // Chromium OS
    ],
    [[NAME, CHROMIUM_OS], VERSION],
    [
      // Smart TVs
      /panasonic;(viera)/i, // Panasonic Viera
      /(netrange)mmh/i, // Netrange
      /(nettv)\/(\d+\.[\w\.]+)/i, // NetTV

      // Console
      /(nintendo|playstation) ([wids345portablevuch]+)/i, // Nintendo/Playstation
      /(xbox); +xbox ([^\);]+)/i, // Microsoft Xbox (360, One, X, S, Series X, Series S)

      // Other
      /\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i, // Joli/Palm
      /(mint)[\/\(\) ]?(\w*)/i, // Mint
      /(mageia|vectorlinux)[; ]/i, // Mageia/VectorLinux
      /([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i,
      // Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware/Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus/Raspbian/Plan9/Minix/RISCOS/Contiki/Deepin/Manjaro/elementary/Sabayon/Linspire
      /(hurd|linux)(?: arm\w*| x86\w*| ?)([\w\.]*)/i, // Hurd/Linux
      /(gnu) ?([\w\.]*)/i, // GNU
      /\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i, // FreeBSD/NetBSD/OpenBSD/PC-BSD/GhostBSD/DragonFly
      /(haiku) (\w+)/i, // Haiku
    ],
    [NAME, VERSION],
    [
      /(sunos) ?([\w\.\d]*)/i, // Solaris
    ],
    [[NAME, 'Solaris'], VERSION],
    [
      /((?:open)?solaris)[-\/ ]?([\w\.]*)/i, // Solaris
      /(aix) ((\d)(?=\.|\)| )[\w\.])*/i, // AIX
      /\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux|serenityos)/i, // BeOS/OS2/AmigaOS/MorphOS/OpenVMS/Fuchsia/HP-UX/SerenityOS
      /(unix) ?([\w\.]*)/i, // UNIX
    ],
    [NAME, VERSION],
  ],
}
