export function isCpfValid(cpf: string): boolean {
  const digits = cpf.replaceAll(/\D/g, '')

  if (digits.length !== 11) return false
  if (/^(\d)\1+$/.test(digits)) return false

  return checkDigit(digits, 9) && checkDigit(digits, 10)
}

function checkDigit(digits: string, position: number): boolean {
  let sum = 0
  for (let i = 0; i < position; i++) {
    sum += Number(digits[i]) * (position + 1 - i)
  }
  const remainder = sum % 11
  const expected = remainder < 2 ? 0 : 11 - remainder
  return Number(digits[position]) === expected
}
