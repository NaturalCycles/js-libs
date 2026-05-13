import { expect, test } from 'vitest'
import { isCpfValid } from './cpf.js'

test.each([
  { cpf: '52998224725', valid: true },
  { cpf: '529.982.247-25', valid: true },
  { cpf: '111.444.777-35', valid: true },
  { cpf: '52998224715', valid: false, reason: 'wrong first check digit' },
  { cpf: '52998224726', valid: false, reason: 'wrong second check digit' },
  { cpf: '00000000000', valid: false, reason: 'all same digits' },
  { cpf: '11111111111', valid: false, reason: 'all same digits' },
  { cpf: '5299822472', valid: false, reason: 'too short' },
  { cpf: '529982247250', valid: false, reason: 'too long' },
  { cpf: '', valid: false, reason: 'empty' },
])('isCpfValid($cpf) === $valid', ({ cpf, valid }) => {
  expect(isCpfValid(cpf)).toBe(valid)
})
