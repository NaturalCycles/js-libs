import { expect, expectTypeOf, test } from 'vitest'
import type { SafeHtml } from '../types.js'
import { htmlEscape, htmlUnescape } from './escape.js'

test('htmlEscape returns SafeHtml branded type', () => {
  expectTypeOf(htmlEscape('foo')).toEqualTypeOf<SafeHtml>()
})

test('htmlEscape', () => {
  expect(htmlEscape('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;')
  expect(htmlEscape('🦄 & 🐐')).toBe('🦄 &amp; 🐐')
  expect(htmlEscape('Hello <em>World</em>')).toBe('Hello &lt;em&gt;World&lt;/em&gt;')
})

test('htmlUnescape', () => {
  expect(htmlUnescape('&amp;&lt;&gt;&quot;&#39;')).toBe('&<>"\'')
  expect(htmlUnescape('🦄 &amp; 🐐')).toBe('🦄 & 🐐')
  expect(htmlUnescape('Hello &lt;em&gt;World&lt;/em&gt;')).toBe('Hello <em>World</em>')
})

test('htmlEscape & htmlUnescape', () => {
  expect(htmlUnescape(htmlEscape('&<>"\''))).toBe('&<>"\'')
  expect(htmlUnescape(htmlEscape('&quot;'))).toBe('&quot;')
})

test('htmlEscape as template tag', () => {
  expect(htmlEscape`foobarz${'&<>"\''}`).toBe('foobarz&amp;&lt;&gt;&quot;&#39;')
  expect(htmlEscape`🦄 ${'&'} 🐐`).toBe('🦄 &amp; 🐐')
  expect(htmlEscape`Hello <em><>${'<>'}</em>`).toBe('Hello <em><>&lt;&gt;</em>')
})

test('htmlEscape as template tag with non-strings', () => {
  expect(htmlEscape`foobarz${undefined}`).toBe('foobarzundefined')
  expect(htmlEscape`🦄 ${true}`).toBe('🦄 true')
  expect(htmlEscape`Hello <em><>${1}</em>`).toBe('Hello <em><>1</em>')
})

test('htmlUnescape as template tag', () => {
  expect(htmlUnescape`foobarz${'&amp;&lt;&gt;&quot;&#39;'}`).toBe('foobarz&<>"\'')
  expect(htmlUnescape`🦄 ${'&amp;'} 🐐`).toBe('🦄 & 🐐')
  expect(htmlUnescape`Hello <em><>${'&lt;&gt;'}</em>`).toBe('Hello <em><><></em>')
})

test('htmlUnescape as template tag on non-strings', () => {
  expect(htmlUnescape`foobarz${undefined}`).toBe('foobarzundefined')
  expect(htmlUnescape`🦄 ${true}`).toBe('🦄 true')
  expect(htmlUnescape`Hello <em><>${1}</em>`).toBe('Hello <em><>1</em>')
})

test('htmlEscape & htmlUnescape as template tags', () => {
  const input = '&<>"\''
  const actual = htmlUnescape`${htmlEscape`${input}`}`
  expect(actual).toBe(input)
})
