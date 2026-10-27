import { it } from 'vitest'
import { pHang } from './pHang.js'

it('should return a promise without throwing', async () => {
  void pHang() // never resolves
})
