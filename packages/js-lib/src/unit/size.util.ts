const kb = 1024
const mb = 1024 ** 2
const gb = 1024 ** 3
const tb = 1024 ** 4

export function _gb(b: number): number {
  return Math.round(b / gb)
}

export function _mb(b: number): number {
  return Math.round(b / mb)
}

export function _kb(b: number): number {
  return Math.round(b / kb)
}

/**
 * Byte size to Human byte size string
 */
export function _hb(b = 0): string {
  if (b < 100) return `${Math.round(b)} byte(s)`
  if (b < 10 ** 4) return `${(b / kb).toFixed(2)} Kb`
  if (b < 10 ** 5) return `${(b / kb).toFixed(1)} Kb`
  if (b < 10 ** 6) return `${Math.round(b / kb)} Kb`
  if (b < 10 ** 7) return `${(b / mb).toFixed(2)} Mb`
  if (b < 10 ** 8) return `${(b / mb).toFixed(1)} Mb`
  if (b < 10 ** 9) return `${Math.round(b / mb)} Mb`
  if (b < 10 ** 10) return `${(b / gb).toFixed(2)} Gb`
  if (b < 10 ** 11) return `${(b / gb).toFixed(1)} Gb`
  if (b < 10 ** 12) return `${Math.round(b / gb)} Gb`
  if (b < 10 ** 13) return `${(b / tb).toFixed(2)} Tb`
  if (b < 10 ** 14) return `${(b / tb).toFixed(1)} Tb`
  return `${Math.round(b / tb)} Tb`
}

/**
 * hc stands for "human count", similar to "human bytes" `_hb` function.
 * Helpful to print big numbers, as it adds `K` (kilo), `M` (mega), etc to make
 * them more readable.
 *
 * Implementation rule of thumb: aim to have up to 3 significant digits, cut the rest.
 */
export function _hc(c = 0): string {
  if (c < 10 ** 3) return String(Math.round(c))
  if (c < 10 ** 4) return (c / 10 ** 3).toFixed(2) + ' K'
  if (c < 10 ** 5) return (c / 10 ** 3).toFixed(1) + ' K'
  if (c < 10 ** 6) return Math.round(c / 10 ** 3) + ' K'
  if (c < 10 ** 7) return (c / 10 ** 6).toFixed(2) + ' M'
  if (c < 10 ** 8) return (c / 10 ** 6).toFixed(1) + ' M'
  if (c < 10 ** 9) return Math.round(c / 10 ** 6) + ' M'
  if (c < 10 ** 10) return (c / 10 ** 9).toFixed(2) + ' B'
  if (c < 10 ** 11) return (c / 10 ** 9).toFixed(1) + ' B'
  if (c < 10 ** 12) return Math.round(c / 10 ** 9) + ' B'
  if (c < 10 ** 13) return (c / 10 ** 12).toFixed(2) + ' T'
  if (c < 10 ** 14) return (c / 10 ** 12).toFixed(1) + ' T'
  return Math.round(c / 10 ** 12) + ' T'
}
