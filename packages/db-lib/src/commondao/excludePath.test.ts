import { describe, expect, test } from 'vitest'
import { compileExcludePath, createExcludeBuilder } from './excludePath.js'

interface Sample {
  id: string
  title: string
  meta?: { author: string; status: string }
  config?: { theme: string }
  tags?: { label: string; score: number }[]
}

const ex = createExcludeBuilder<Sample>()

describe('createExcludeBuilder', () => {
  test('should build a NestedSpec tagged object', () => {
    expect(ex.nested('meta', 'author')).toEqual({
      type: 'nested',
      field: 'meta',
      subPath: 'author',
    })
  })

  test('should build a WildcardSpec tagged object', () => {
    expect(ex.wildcard('config')).toEqual({
      type: 'wildcard',
      field: 'config',
    })
  })

  test('should build an ElementSpec with default "*" matchProperty', () => {
    expect(ex.element('tags')).toEqual({
      type: 'element',
      arrayName: 'tags',
      matchProperty: '*',
    })
  })

  test('should build an ElementSpec with explicit matchProperty', () => {
    expect(ex.element('tags', 'label')).toEqual({
      type: 'element',
      arrayName: 'tags',
      matchProperty: 'label',
    })
  })
})

describe('compileExcludePath', () => {
  test('should return the input verbatim for a top-level key string', () => {
    expect(compileExcludePath<Sample>('title')).toBe('title')
  })

  test('should produce "field.subPath" for a nested spec', () => {
    expect(compileExcludePath(ex.nested('meta', 'author'))).toBe('meta.author')
  })

  test('should produce "field.*" for a wildcard spec', () => {
    expect(compileExcludePath(ex.wildcard('config'))).toBe('config.*')
  })

  test('should produce "arrayName[].*" for an element spec with default matchProperty', () => {
    expect(compileExcludePath(ex.element('tags'))).toBe('tags[].*')
  })

  test('should produce "arrayName[].property" for an element spec with explicit matchProperty', () => {
    expect(compileExcludePath(ex.element('tags', 'label'))).toBe('tags[].label')
  })
})

describe('type-level constraints', () => {
  test('should reject nested() on a primitive key', () => {
    // @ts-expect-error title is a string, not an object
    ex.nested('title', 'foo')
  })

  test('should reject nested() on an array key', () => {
    // @ts-expect-error tags is an array, not a nested object
    ex.nested('tags', 'label')
  })

  test('should reject nested() with a sub-path that does not exist on the field', () => {
    // @ts-expect-error 'notAKey' is not a key of meta
    ex.nested('meta', 'notAKey')
  })

  test('should reject wildcard() on a primitive key', () => {
    // @ts-expect-error title is a string, not an object
    ex.wildcard('title')
  })

  test('should reject wildcard() on an array key', () => {
    // @ts-expect-error tags is an array, not a nested object
    ex.wildcard('tags')
  })

  test('should reject element() on a non-array key', () => {
    // @ts-expect-error meta is an object, not an array
    ex.element('meta')
  })

  test('should reject element() with a matchProperty that does not exist on the array element', () => {
    // @ts-expect-error 'notAKey' is not a key of a tag
    ex.element('tags', 'notAKey')
  })
})
