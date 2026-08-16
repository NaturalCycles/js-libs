// Tests ported from https://github.com/mcollina/my-ua-parser (v2.0.4, commit 0ff5baa)
// The fixture corpus (ua.test.fixtures.ts) is the full upstream test/*-test.json corpus.

import { expect, test } from 'vitest'
import type { UAParserExtensions, UARegexMapEntry } from './ua.js'
import { parseUserAgent, UAParser } from './ua.js'
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

  const parser2 = new UAParser(extensions)
  expect(parser2.getBrowser().name).toBeUndefined()
  parser2.setUA(uaString)
  expect(parser2.getBrowser().name).toBe('MyOwnBrowser')
})

test('user-agent longer than 500 characters is trimmed down', () => {
  const uaString = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '.padEnd(1000, 'x')
  expect(parseUserAgent(uaString).ua).toHaveLength(500)
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
