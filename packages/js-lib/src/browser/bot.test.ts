import { beforeEach, expect, it, vi } from 'vitest'
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

it('should detect neither a bot nor CDP on the server side', () => {
  Object.assign(globalThis, {
    window: undefined,
  })
  expect(botDetectionService.getBotReason()).toBeNull()
  expect(botDetectionService.isCDP()).toBe(false)
  expect(botDetectionService.isBot()).toBe(false)
  expect(botDetectionService.isBotOrCDP()).toBe(false)
})

it('should not detect a bot for a regular Chrome user agent', () => {
  Object.assign(globalThis, {
    navigator: {
      userAgent: userAgentChrome,
    } as Navigator,
    chrome: {},
  })
  expect(botDetectionService.getBotReason()).toBeNull()
})

it('should not detect a bot for a regular Safari user agent', () => {
  Object.assign(globalThis, {
    navigator: {
      userAgent: userAgentSafari,
    } as Navigator,
  })
  expect(botDetectionService.getBotReason()).toBeNull()
})

it('should not detect a bot for the Snapchat in-app browser', () => {
  Object.assign(globalThis, {
    navigator: {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1.1 Mobile/15E148 Snapchat/13.26.0.41 (like Safari/8619.2.8.10.9)',
    } as Navigator,
  })
  expect(botDetectionService.getBotReason()).toBeNull()
})

it('should detect a bot when there is no navigator', () => {
  expect(botDetectionService.getBotReason()).toBe(BotReason.NoNavigator)
  expect(botDetectionService.isBot()).toBe(true)
  expect(botDetectionService.isBotOrCDP()).toBe(true)
})

it('should detect a bot when there is no userAgent', () => {
  globalThis.navigator = {} as Navigator
  expect(botDetectionService.getBotReason()).toBe(BotReason.NoUserAgent)
})

it('should detect a bot when the userAgent contains "bot"', () => {
  globalThis.navigator = { userAgent: 'KlaviyoBot' } as Navigator
  expect(botDetectionService.getBotReason()).toBe(BotReason.UserAgent)
})

it('should detect a bot when the userAgent contains "headless"', () => {
  globalThis.navigator = { userAgent: 'HeadlessChrome' } as Navigator
  expect(botDetectionService.getBotReason()).toBe(BotReason.UserAgent)
})

it('should detect a bot when the userAgent contains "electron"', () => {
  globalThis.navigator = { userAgent: 'I am Electron 99' } as Navigator
  expect(botDetectionService.getBotReason()).toBe(BotReason.UserAgent)
})

it('should detect a bot when the userAgent contains "phantom"', () => {
  globalThis.navigator = { userAgent: 'Phantom Menace' } as Navigator
  expect(botDetectionService.getBotReason()).toBe(BotReason.UserAgent)
})

it('should detect a bot when the userAgent contains "slimer"', () => {
  globalThis.navigator = { userAgent: 'Slimer than Slime' } as Navigator
  expect(botDetectionService.getBotReason()).toBe(BotReason.UserAgent)
})

it('should detect neither a bot nor CDP when disabled', () => {
  globalThis.navigator = { userAgent: 'HeadlessChrome' } as Navigator
  const service = new BotDetectionService({
    enabled: false,
  })
  expect(service.isCDP()).toBe(false)
  expect(service.getBotReason()).toBeNull()
  expect(service.isBotOrCDP()).toBe(false)
})

it('should detect a bot when navigator.webdriver is set', () => {
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

it('should detect a bot when navigator.languages is an empty string', () => {
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
it('should run the CDP check without throwing when window is defined', () => {
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

it('should return the CDP reason when treatCDPAsBotReason is set and CDP is detected', () => {
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
