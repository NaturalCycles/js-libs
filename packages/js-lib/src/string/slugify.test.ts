import { expect, it } from 'vitest'
import { _slugify } from './slugify.js'

it.each([
  ['', ''],
  ['Hello World', 'hello-world'],
  ['Klättermusen 2', 'klattermusen-2'],
  ["Moe's Tavern", 'moes-tavern'],
  ['Åhléns', 'ahlens'],
])('should slugify %s to %s', (input, expected) => {
  expect(_slugify(input)).toBe(expected)
})
