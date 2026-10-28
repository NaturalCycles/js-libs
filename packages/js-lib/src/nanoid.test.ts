import { expect, it } from 'vitest'
import { nanoidBrowser, nanoidBrowserCustomAlphabet } from './nanoid.js'

const base64urlAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

it('should return a base64url id of the requested length, 21 by default', () => {
  const id = nanoidBrowser()
  expect(typeof id).toBe('string')
  expect(id).toHaveLength(21)
  expectToMatchAlphabet(id, base64urlAlphabet)

  expect(nanoidBrowser(10)).toHaveLength(10)
  expect(nanoidBrowser(1)).toHaveLength(1)
  expect(nanoidBrowser(8)).toHaveLength(8)
  expect(nanoidBrowser(256)).toHaveLength(256)
  expect(nanoidBrowser(300)).toHaveLength(300)
})

it('should return a different id on each call', () => {
  expect(nanoidBrowser()).not.toBe(nanoidBrowser())
})

it('should use only characters from a custom alphabet', () => {
  const alphabet = 'abcdefgh'
  const fn = nanoidBrowserCustomAlphabet(alphabet)
  let id = fn()
  expect(id).toHaveLength(21)
  expectToMatchAlphabet(id, alphabet)

  id = fn(16)
  expect(id).toHaveLength(16)
  expectToMatchAlphabet(id, alphabet)
})

function expectToMatchAlphabet(id: string, alphabet: string): void {
  const charSet = new Set(alphabet.split(''))
  id.split('').forEach(char => {
    expect(charSet.has(char)).toBe(true)
  })
}
