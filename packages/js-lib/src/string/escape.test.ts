import { expect, expectTypeOf, it } from 'vitest'
import type { SafeHtml } from '../types.js'
import { htmlEscape, htmlUnescape } from './escape.js'

it('should return the SafeHtml branded type from htmlEscape', () => {
  expectTypeOf(htmlEscape('foo')).toEqualTypeOf<SafeHtml>()
})

it('should escape HTML special characters with htmlEscape', () => {
  expect(htmlEscape('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;')
  expect(htmlEscape('🦄 & 🐐')).toBe('🦄 &amp; 🐐')
  expect(htmlEscape('Hello <em>World</em>')).toBe('Hello &lt;em&gt;World&lt;/em&gt;')
})

it('should unescape HTML entities with htmlUnescape', () => {
  expect(htmlUnescape('&amp;&lt;&gt;&quot;&#39;')).toBe('&<>"\'')
  expect(htmlUnescape('🦄 &amp; 🐐')).toBe('🦄 & 🐐')
  expect(htmlUnescape('Hello &lt;em&gt;World&lt;/em&gt;')).toBe('Hello <em>World</em>')
})

it('should round-trip a string through htmlEscape and htmlUnescape', () => {
  expect(htmlUnescape(htmlEscape('&<>"\''))).toBe('&<>"\'')
  expect(htmlUnescape(htmlEscape('&quot;'))).toBe('&quot;')
})

it('should escape only the interpolated values with htmlEscape as a template tag', () => {
  expect(htmlEscape`foobarz${'&<>"\''}`).toBe('foobarz&amp;&lt;&gt;&quot;&#39;')
  expect(htmlEscape`🦄 ${'&'} 🐐`).toBe('🦄 &amp; 🐐')
  expect(htmlEscape`Hello <em><>${'<>'}</em>`).toBe('Hello <em><>&lt;&gt;</em>')
})

it('should stringify non-string values with htmlEscape as a template tag', () => {
  expect(htmlEscape`foobarz${undefined}`).toBe('foobarzundefined')
  expect(htmlEscape`🦄 ${true}`).toBe('🦄 true')
  expect(htmlEscape`Hello <em><>${1}</em>`).toBe('Hello <em><>1</em>')
})

it('should unescape only the interpolated values with htmlUnescape as a template tag', () => {
  expect(htmlUnescape`foobarz${'&amp;&lt;&gt;&quot;&#39;'}`).toBe('foobarz&<>"\'')
  expect(htmlUnescape`🦄 ${'&amp;'} 🐐`).toBe('🦄 & 🐐')
  expect(htmlUnescape`Hello <em><>${'&lt;&gt;'}</em>`).toBe('Hello <em><><></em>')
})

it('should stringify non-string values with htmlUnescape as a template tag', () => {
  expect(htmlUnescape`foobarz${undefined}`).toBe('foobarzundefined')
  expect(htmlUnescape`🦄 ${true}`).toBe('🦄 true')
  expect(htmlUnescape`Hello <em><>${1}</em>`).toBe('Hello <em><>1</em>')
})

it('should round-trip a string through htmlEscape and htmlUnescape as template tags', () => {
  const input = '&<>"\''
  const actual = htmlUnescape`${htmlEscape`${input}`}`
  expect(actual).toBe(input)
})
