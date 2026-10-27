import { it } from 'vitest'
import { _blockTimer } from './time.util.js'

it('should run as a disposable block timer without throwing', () => {
  using _ = _blockTimer()
})
