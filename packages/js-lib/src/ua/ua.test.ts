// Tests ported from https://github.com/mcollina/my-ua-parser (v2.0.4, commit 0ff5baa)
// The fixture corpus (ua.test.fixtures.ts) is the full upstream test/*-test.json corpus.

import { expect, test } from 'vitest'
import { uaParser, parseUserAgent, UABrowserName, UAOSName, UAParser } from './ua.js'
import type { UAParserExtensions, UARegexMapEntry } from './ua.js'
import type { UAFixture } from './ua.test.fixtures.js'
import {
  browserFixtures,
  cpuFixtures,
  deviceFixtures,
  engineFixtures,
  osFixtures,
} from './ua.test.fixtures.js'

test('parseUserAgent equals new UAParser().setUA().getResult()', () => {
  const ua =
    'Mozilla/5.0 (Windows NT 6.2) AppleWebKit/536.6 (KHTML, like Gecko) Chrome/20.0.1090.0 Safari/536.6'
  expect(parseUserAgent(ua)).toStrictEqual(new UAParser().setUA(ua).getResult())
})

test('constructor does not throw with undefined ua argument', () => {
  expect(() => new UAParser(undefined).getResult()).not.toThrow()
  expect(() => uaParser(undefined).getResult()).not.toThrow()
})

test('setUA does not throw with undefined ua argument', () => {
  expect(() => new UAParser().setUA(undefined).getResult()).not.toThrow()
})

test('getBrowser', () => {
  testFixtures(browserFixtures, parser => parser.getBrowser())
})

test('getCPU', () => {
  testFixtures(cpuFixtures, parser => parser.getCPU())
})

test('getDevice', () => {
  testFixtures(deviceFixtures, parser => parser.getDevice())
})

test('getEngine', () => {
  testFixtures(engineFixtures, parser => parser.getEngine())
})

test('getOS', () => {
  testFixtures(osFixtures, parser => parser.getOS())
})

test('getResult returns all-undefined values for empty ua', () => {
  expect(new UAParser('').getResult()).toStrictEqual({
    ua: '',
    browser: { name: undefined, version: undefined, major: undefined },
    engine: { name: undefined, version: undefined },
    os: { name: undefined, version: undefined },
    device: { vendor: undefined, model: undefined, type: undefined },
    cpu: { architecture: undefined },
  })
})

test('extending regexes', () => {
  const uaString = 'Mozilla/5.0 MyOwnBrowser/1.3'
  const myOwnBrowser: UARegexMapEntry[] = [
    [/(myownbrowser)\/((\d+)?[\w.]+)/i],
    ['name', 'version', 'major'],
  ]
  const extensions: UAParserExtensions = { browser: myOwnBrowser }

  const parser1 = new UAParser(uaString, extensions)
  expect(parser1.getBrowser()).toStrictEqual({
    name: 'MyOwnBrowser',
    version: '1.3',
    major: '1',
  })

  const parser2 = new UAParser(undefined, extensions)
  expect(parser2.getBrowser().name).toBeUndefined()
  parser2.setUA(uaString)
  expect(parser2.getBrowser().name).toBe('MyOwnBrowser')
})

test('user-agent longer than 500 characters is trimmed down', () => {
  const uaString = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '.padEnd(1000, 'x')
  expect(parseUserAgent(uaString).ua).toHaveLength(500)
})

const UA_IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const UA_IPAD =
  'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
const UA_IOS_WEBVIEW =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
const UA_ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
const UA_ANDROID_WEBVIEW =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UD1A.230803.041; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.144 Mobile Safari/537.36'
const UA_MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const UA_MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const UA_WINDOWS_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
const UA_WINDOWS_FIREFOX =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0'
const UA_LINUX_CHROME =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const UA_CHROMEOS =
  'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.111 Safari/537.36'
const UA_WATCHOS = 'atc/1.0 watchOS/9.6 model/Watch6,7 hwp/t8301 build/20U63 (6; dt:266)'
const UA_HEADLESS_CHROME =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/124.0.0.0 Safari/537.36'
const UA_OPERA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 OPR/110.0.0.0'
const UA_SAMSUNG_INTERNET =
  'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36'
const UA_FACEBOOK_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/20B82 [FBAN/FBIOS;FBAV/389.0.0.29.109;FBBV/370919632;FBDV/iPhone14,2]'
const UA_INSTAGRAM_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.14.109 (iPhone14,2; iOS 16_1)'

// Fixed-assignment names are wired to the enums inside the regex maps; names captured
// from the UA text (e.g. 'Android', 'Safari', desktop 'Chrome') are pinned by these tests.
test('UAOSName matches the parser vocabulary', () => {
  const uaByOsName: Record<UAOSName, string> = {
    [UAOSName.iOS]: UA_IPHONE_SAFARI,
    [UAOSName.Android]: UA_ANDROID_CHROME,
    [UAOSName.MacOS]: UA_MAC_SAFARI,
    [UAOSName.Windows]: UA_WINDOWS_EDGE,
    [UAOSName.Linux]: UA_LINUX_CHROME,
    [UAOSName.ChromiumOS]: UA_CHROMEOS,
    [UAOSName.WatchOS]: UA_WATCHOS,
  }
  for (const [osName, ua] of Object.entries(uaByOsName)) {
    expect(parseUserAgent(ua).os.name, ua).toBe(osName)
  }
})

test('UABrowserName matches the parser vocabulary', () => {
  const uaByBrowserName: Record<UABrowserName, string> = {
    [UABrowserName.Chrome]: UA_MAC_CHROME,
    [UABrowserName.ChromeWebView]: UA_ANDROID_WEBVIEW,
    [UABrowserName.ChromeHeadless]: UA_HEADLESS_CHROME,
    [UABrowserName.Safari]: UA_MAC_SAFARI,
    [UABrowserName.MobileSafari]: UA_IPHONE_SAFARI,
    [UABrowserName.Firefox]: UA_WINDOWS_FIREFOX,
    [UABrowserName.Edge]: UA_WINDOWS_EDGE,
    [UABrowserName.Opera]: UA_OPERA,
    [UABrowserName.SamsungInternet]: UA_SAMSUNG_INTERNET,
    [UABrowserName.Facebook]: UA_FACEBOOK_IOS,
    [UABrowserName.Instagram]: UA_INSTAGRAM_IOS,
    [UABrowserName.WebKit]: UA_IOS_WEBVIEW,
  }
  for (const [browserName, ua] of Object.entries(uaByBrowserName)) {
    expect(parseUserAgent(ua).browser.name, ua).toBe(browserName)
  }
})

test('is* helpers', () => {
  const parser = uaParser(UA_IPHONE_SAFARI)
  expect(parser.isIos()).toBe(true)
  expect(parser.isAndroid()).toBe(false)
  expect(parser.isSafari()).toBe(true)
  expect(parser.isChrome()).toBe(false)
  expect(parser.isMobile()).toBe(true)
  expect(parser.isTablet()).toBe(false)

  // setUA resets the cached results
  parser.setUA(UA_ANDROID_CHROME)
  expect(parser.isIos()).toBe(false)
  expect(parser.isAndroid()).toBe(true)
  expect(parser.isChrome()).toBe(true)
  expect(parser.isSafari()).toBe(false)

  const mac = uaParser(UA_MAC_CHROME)
  expect(mac.isMacOs()).toBe(true)
  expect(mac.isWindows()).toBe(false)
  expect(mac.isChrome()).toBe(true)
  expect(mac.isMobile()).toBe(false)

  const edge = uaParser(UA_WINDOWS_EDGE)
  expect(edge.isWindows()).toBe(true)
  expect(edge.isEdge()).toBe(true)
  expect(edge.isChrome()).toBe(false)

  expect(uaParser(UA_WINDOWS_FIREFOX).isFirefox()).toBe(true)
  expect(uaParser(UA_IPAD).isTablet()).toBe(true)
  // Chrome WebView and Chrome Headless count as Chrome
  expect(uaParser(UA_ANDROID_WEBVIEW).isChrome()).toBe(true)
  expect(uaParser(UA_HEADLESS_CHROME).isChrome()).toBe(true)
  // bare-WebKit iOS webview is not Safari
  expect(uaParser(UA_IOS_WEBVIEW).isSafari()).toBe(false)
})

// Upstream asserts each expected property with strictEqual, treating the string 'undefined'
// as undefined. Here the fixtures omit undefined keys instead, and `toEqual` treats
// undefined-valued properties of the actual object as absent - same semantics.
function testFixtures(fixtures: UAFixture[], fn: (parser: UAParser) => unknown): void {
  const parser = new UAParser()
  for (const { desc, ua, expected } of fixtures) {
    expect(fn(parser.setUA(ua)), `${desc}\n${ua}`).toEqual(expected)
  }
}
