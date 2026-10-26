import { it } from 'vitest'
import { _blockTimer } from './time.util.js'

it('_blockTimer', () => {
  using _ = _blockTimer()
})
