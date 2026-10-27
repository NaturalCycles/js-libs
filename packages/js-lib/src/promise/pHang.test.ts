import { it } from 'vitest'
import { pHang } from './pHang.js'

it('pHang', async () => {
  void pHang() // never resolves
})
