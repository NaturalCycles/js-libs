import { describe, expect, test } from 'vitest'
import { compileExcludePath, ExcludeFromIndexesBuilder } from './excludePath.js'

interface Inner {
  name: string
  age: number
}

interface Sample {
  id: string
  title: string
  meta?: { author: string; status: string; profile?: Inner }
  config?: { theme: string }
  tags?: { label: string; score: number }[]
  scores?: number[]
}

const ex = new ExcludeFromIndexesBuilder<Sample>()

describe('compileExcludePath', () => {
  test('should return the input verbatim for a top-level key string', () => {
    expect(compileExcludePath<Sample>('title')).toBe('title')
  })

  test('should return the wrapped path for a PathSpec', () => {
    const spec = ex.object('meta').property('author')
    expect(compileExcludePath<Sample>(spec)).toBe('meta.author')
  })
})

describe('ExcludeFromIndexesBuilder.object', () => {
  test('should produce a PathSpec equivalent to a top-level wildcard', () => {
    expect(ex.object('meta').wildcard()).toEqual({ type: 'path', path: 'meta.*' })
  })

  test('should produce a PathSpec equivalent to a one-level nested property', () => {
    expect(ex.object('meta').property('author')).toEqual({ type: 'path', path: 'meta.author' })
  })

  test('should chain `object` for deeper nesting', () => {
    expect(ex.object('meta').object('profile').property('name')).toEqual({
      type: 'path',
      path: 'meta.profile.name',
    })
  })

  test('should chain `object` then terminate with `wildcard`', () => {
    expect(ex.object('meta').object('profile').wildcard()).toEqual({
      type: 'path',
      path: 'meta.profile.*',
    })
  })
})

describe('ExcludeFromIndexesBuilder.array', () => {
  test('should descend into an array and terminate at a property', () => {
    expect(ex.array('tags').property('label')).toEqual({
      type: 'path',
      path: 'tags[].label',
    })
  })

  test('should descend into an array and terminate with wildcard', () => {
    expect(ex.array('tags').wildcard()).toEqual({
      type: 'path',
      path: 'tags[].*',
    })
  })

  test('should chain after a nested `object` to reach an inner array', () => {
    // contrived but exercises composition: meta has no array — use a fresh shape
    interface WithNestedArray {
      id: string
      group?: { entries?: { label: string }[] }
    }
    const exN = new ExcludeFromIndexesBuilder<WithNestedArray>()
    expect(exN.object('group').array('entries').property('label')).toEqual({
      type: 'path',
      path: 'group.entries[].label',
    })
  })
})

describe('ExcludeFromIndexesBuilder type constraints', () => {
  test('should reject `object` on a primitive top-level key', () => {
    // @ts-expect-error title is a string, not an object
    ex.object('title')
  })

  test('should reject `object` on an array key', () => {
    // @ts-expect-error tags is an array — use `.array(...)` instead
    ex.object('tags')
  })

  test('should reject `object` on a deeper primitive key', () => {
    // @ts-expect-error meta.author is a string
    ex.object('meta').object('author')
  })

  test('should reject `object` with a non-existent key', () => {
    // @ts-expect-error 'notAKey' is not a key of Sample
    ex.object('notAKey')
  })

  test('should reject `array` on a non-array key', () => {
    // @ts-expect-error meta is an object — use `.object(...)` instead
    ex.array('meta')
  })

  test('should reject `property` at the root (no prefix yet)', () => {
    // @ts-expect-error cannot terminate at the root
    ex.property('title')
  })

  test('should reject `wildcard` at the root (no prefix yet)', () => {
    // @ts-expect-error cannot terminate at the root
    ex.wildcard()
  })

  test('should reject `property` with a non-existent sub-key', () => {
    // @ts-expect-error 'notAKey' is not a key of meta
    ex.object('meta').property('notAKey')
  })

  test('should reject `wildcard` on a primitive-element array scope', () => {
    // After `.array('scores')`, current is `number` (primitive).
    // @ts-expect-error wildcard is meaningless on primitive elements
    ex.array('scores').wildcard()
  })

  test('should reject `property` on a primitive-element array scope', () => {
    // @ts-expect-error number has no meaningful object keys for exclusion
    ex.array('scores').property('toFixed')
  })
})

describe('ExcludeFromIndexesBuilder with discriminated-union variants', () => {
  interface VariantA {
    kind: 'a'
    sharedField: string
    onlyOnA: string
  }
  interface VariantB {
    kind: 'b'
    sharedField: string
    onlyOnB: number
  }
  interface WithUnion {
    id: string
    payload?: VariantA | VariantB
  }

  const exU = new ExcludeFromIndexesBuilder<WithUnion>()

  test('should accept keys from any variant of a discriminated union', () => {
    expect(exU.object('payload').property('onlyOnA')).toEqual({
      type: 'path',
      path: 'payload.onlyOnA',
    })
    expect(exU.object('payload').property('onlyOnB')).toEqual({
      type: 'path',
      path: 'payload.onlyOnB',
    })
    expect(exU.object('payload').property('sharedField')).toEqual({
      type: 'path',
      path: 'payload.sharedField',
    })
  })

  test('should reject keys that exist on no variant', () => {
    // @ts-expect-error 'notAKey' is on neither variant
    exU.object('payload').property('notAKey')
  })
})
