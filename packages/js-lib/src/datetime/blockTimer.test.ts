import { test } from 'vitest'
import { _blockTimer } from './time.util.js'

test('_blockTimer', () => {
  using _timer = _blockTimer()
})
