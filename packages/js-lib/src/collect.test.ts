import { test } from 'vitest'
import { isServerSide } from './index.js'

test('collect time', () => {
  const _router = isServerSide()
})
