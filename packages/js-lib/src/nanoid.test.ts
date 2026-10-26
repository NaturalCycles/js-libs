import { expect, it } from 'vitest'
import { nanoidBrowser, nanoidBrowserCustomAlphabet } from './nanoid.js'

const base64urlAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

it('should return a string of required length', () => {
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

it('should be random, 2 values should not be equal', () => {
  expect(nanoidBrowser()).not.toBe(nanoidBrowser())
})

it('customAlphabet id all characters should be from the alphabet', () => {
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
