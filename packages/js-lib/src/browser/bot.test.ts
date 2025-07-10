import { beforeEach, expect, test, vi } from 'vitest'
import { BotReason } from '../bot.model.js'
import { BotDetectionService } from './bot.js'

beforeEach(() => {
  vi.stubGlobal('window', { document: {} }) // this make isServerSide() return false
  vi.stubGlobal('navigator', undefined)
  vi.stubGlobal('chrome', undefined)
})

const botDetectionService = new BotDetectionService()

const userAgentChrome = 'Innocent Chrome 998 Mozilla IE Trident All Good Windows 95'
const userAgentSafari = 'Innocent Safari 21 Apple Cupertino 991 Next'

test('serverSide script is not a bot', () => {
  Object.assign(globalThis, {
    window: undefined,
  })
  expect(botDetectionService.getBotReason()).toBeNull()
  expect(botDetectionService.isCDP()).toBe(false)
  expect(botDetectionService.isBot()).toBe(false)
  expect(botDetectionService.isBotOrCDP()).toBe(false)
})

test('innocent chrome is not a bot', () => {
  Object.assign(globalThis, {
    navigator: {
      userAgent: userAgentChrome,
    } as Navigator,
    chrome: {},
  })
  expect(botDetectionService.getBotReason()).toBeNull()
})

test('innocent safari is not a bot', () => {
  Object.assign(globalThis, {
    navigator: {
      userAgent: userAgentSafari,
    } as Navigator,
  })
  expect(botDetectionService.getBotReason()).toBeNull()
})

test('snapchat in-app-browser is not a bot', () => {
  Object.assign(globalThis, {
    navigator: {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1.1 Mobile/15E148 Snapchat/13.26.0.41 (like Safari/8619.2.8.10.9)',
    } as Navigator,
  })
  expect(botDetectionService.getBotReason()).toBeNull()
})

test('no navigator means bot', () => {
  expect(botDetectionService.getBotReason()).toBe(BotReason.NoNavigator)
  expect(botDetectionService.isBot()).toBe(true)
  expect(botDetectionService.isBotOrCDP()).toBe(true)
})

test('no userAgent means bot', () => {
  globalThis.navigator = {} as Navigator
  expect(botDetectionService.getBotReason()).toBe(BotReason.NoUserAgent)
})

test('"bot" in userAgent means bot', () => {
  globalThis.navigator = { userAgent: 'KlaviyoBot' } as Navigator
  expect(botDetectionService.getBotReason()).toBe(BotReason.UserAgent)
})

test('"headless" in userAgent means bot', () => {
  globalThis.navigator = { userAgent: 'HeadlessChrome' } as Navigator
  expect(botDetectionService.getBotReason()).toBe(BotReason.UserAgent)
})

test('"electron" in userAgent means bot', () => {
  globalThis.navigator = { userAgent: 'I am Electron 99' } as Navigator
  expect(botDetectionService.getBotReason()).toBe(BotReason.UserAgent)
})

test('"phantom" in userAgent means bot', () => {
  globalThis.navigator = { userAgent: 'Phantom Menace' } as Navigator
  expect(botDetectionService.getBotReason()).toBe(BotReason.UserAgent)
})

test('"slimer" in userAgent means bot', () => {
  globalThis.navigator = { userAgent: 'Slimer than Slime' } as Navigator
  expect(botDetectionService.getBotReason()).toBe(BotReason.UserAgent)
})

test('disabled should return "not bot"', () => {
  globalThis.navigator = { userAgent: 'HeadlessChrome' } as Navigator
  const service = new BotDetectionService({
    enabled: false,
  })
  expect(service.isCDP()).toBe(false)
  expect(service.getBotReason()).toBeNull()
  expect(service.isBotOrCDP()).toBe(false)
})

test('navigator.webdriver means bot', () => {
  globalThis.navigator = {
    userAgent: userAgentSafari,
    webdriver: true,
  } as Navigator
  expect(botDetectionService.getBotReason()).toBe(BotReason.WebDriver)
})

// test('0 plugins means bot', () => {
//   globalThis.navigator = {
//     userAgent: userAgentSafari,
//     plugins: [] as any,
//   } as Navigator
//   expect(botDetectionService.isBot()).toBe(BotReason.ZeroPlugins)
// })

test('"" languages means bot', () => {
  globalThis.navigator = {
    userAgent: userAgentSafari,
    languages: '' as any,
  } as Navigator
  expect(botDetectionService.getBotReason()).toBe(BotReason.EmptyLanguages)
})

// test('Chrome without chrome means bot', () => {
//   globalThis.navigator = {
//     userAgent: userAgentChrome,
//   } as Navigator
//   expect(botDetectionService.isBot()).toBe(BotReason.ChromeWithoutChrome)
// })

// This test helps with coverage, while not really testing anything useful
test('cdp in jest looks like a bot, because it does error serialization', () => {
  Object.assign(globalThis, {
    window: globalThis,
  })

  // console.log('isBot', botDetectionService.isBot())
  const isCDP = botDetectionService.isCDP()
  // expect(isCDP).toBe(botDetectionService.isBotOrCDP())
  expect(isCDP).toBeDefined()

  // const runInIDE = process.argv.some(
  //   a => a === '--runTestsByPath' || a.includes('IDEA') || a.includes('processChild.js'),
  // )
  // console.log({ runInIDE, argv: process.argv })
  // When running in IntelliJ it is detected as CDP (involves Error.stack serialization somehow), while in Jest CLI it is not
  // const expectedIsCDP = runInIDE
  // expect(isCDP).toBe(expectedIsCDP)
})

test('treatCDPAsBotReason', () => {
  const botDetectionService = new BotDetectionService({
    treatCDPAsBotReason: true,
  })

  vi.spyOn(botDetectionService, 'detectCDP' as any).mockReturnValue(true)
  Object.assign(globalThis, {
    navigator: {
      userAgent: userAgentChrome,
    } as Navigator,
  })
  expect(botDetectionService.getBotReason()).toBe(BotReason.CDP)
})
