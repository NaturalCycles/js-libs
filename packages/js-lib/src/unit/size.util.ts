export function _gb(b: number): number {
  return Math.round(b / 1024 ** 3)
}

export function _mb(b: number): number {
  return Math.round(b / 1024 ** 2)
}

export function _kb(b: number): number {
  return Math.round(b / 1024)
}

/**
 * Byte size to Human byte size string
 */
export function _hb(b = 0): string {
  if (b < 100) return `${Math.round(b)} byte(s)`
  if (b < 1000) return `${(b / 1024).toFixed(2)} Kb`
  if (b < 0.9 * 1024 ** 2) return `${Math.round(b / 1024)} Kb`
  if (b < 0.9 * 1024 ** 3) return `${Math.round(b / 1024 ** 2)} Mb`
  if (b < 0.09 * 1024 ** 4) return `${(b / 1024 ** 3).toFixed(2)} Gb`
  if (b < 0.9 * 1024 ** 4) return `${Math.round(b / 1024 ** 3)} Gb`
  if (b < 0.9 * 1024 ** 5) return `${(b / 1024 ** 4).toFixed(2)} Tb`
  return `${Math.round(b / 1024 ** 4)} Tb`
}

/**
 * hc stands for "human count", similar to "human bytes" `_hb` function.
 * Helpful to print big numbers, as it adds `K` (kilo), `M` (mega), etc to make
 * them more readable.
 */
export function _hc(c = 0): string {
  if (c < 10 ** 4) return String(Math.round(c))
  if (c < 10 ** 6) return Math.round(c / 10 ** 3) + ' K'
  if (c < 10 ** 9) return Math.round(c / 10 ** 6) + ' M' // million
  if (c < 10 ** 12) return Math.round(c / 10 ** 9) + ' B' // billion
  if (c < 10 ** 15) return Math.round(c / 10 ** 12) + ' T' // trillion
  return Math.round(c / 10 ** 12) + ' T'
}
