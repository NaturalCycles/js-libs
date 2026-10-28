import { expect, it } from 'vitest'
import { InMemoryWebStorage } from './web.js'

it('should get, set, remove, clear, index and stringify items like localStorage', () => {
  const storage = new InMemoryWebStorage()

  expect(storage.getItem('a')).toBeNull()
  expect(storage).toHaveLength(0)
  storage.setItem('a', 'aa')
  expect(storage.getItem('a')).toBe('aa')
  expect(storage).toHaveLength(1)

  storage.setItem('b', 'bb')
  expect(storage.key(0)).toBe('a')
  expect(storage.key(1)).toBe('b')
  expect(storage.key(2)).toBeNull()

  storage.removeItem('a')
  expect(storage.getItem('a')).toBeNull()
  expect(storage.key(0)).toBe('b')
  expect(storage).toHaveLength(1)

  storage.clear()
  expect(storage).toHaveLength(0)
  expect(storage.getItem('b')).toBeNull()

  // should stringify
  storage.setItem('a', 1 as any)
  expect(storage.getItem('a')).toBe('1')
})
