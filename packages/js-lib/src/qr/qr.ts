// Vendored & modernized from https://github.com/kazuhikoarase/qrcode-generator
// Original: QR Code Generator for JavaScript, Copyright (c) 2009 Kazuhiko Arase, MIT license.
// The word 'QR Code' is a registered trademark of DENSO WAVE INCORPORATED.
//
// Reason for vendoring: the upstream package is unmaintained, ships as legacy closure-based
// JS, and carries a lot of dead weight (GIF/LZW encoder, base64 streams, HTML <table> renderer,
// Kanji/SJIS conversion tables). This is a compact, typed, tree-shakeable rewrite that keeps the
// proven core (Galois-field math, Reed-Solomon ECC, masking, data encoding) and drops everything
// that modern browsers/Node make trivial:
// - Byte mode now encodes UTF-8 via TextEncoder (the original mangled non-ASCII via `c & 0xff`).
// - Output is SVG (string or data URL), ASCII (terminal), or a 2d canvas context - no GIF/LZW.
//
// The generated module matrix is byte-for-byte identical to the upstream library (verified by
// differential tests against qrcode-generator@2.0.4), so any scanner-validated output stays valid.

// oxlint-disable no-bitwise, prefer-math-trunc -- QR encoding (Galois field, BCH, bit packing) is
// inherently bitwise; `(1 << 0)` terms mirror the spec's generator polynomials

/// <reference lib="dom" preserve="true" />

/**
 * Error correction level, ordered by recovery capacity (and overhead):
 * L ~7%, M ~15%, Q ~25%, H ~30%.
 */
export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

/**
 * Encoding mode for the payload.
 * - `numeric`: digits only (most compact)
 * - `alphanumeric`: 0-9 A-Z and ` $%*+-./:` (uppercase only)
 * - `byte`: any string, encoded as UTF-8
 *
 * When omitted, the smallest applicable mode is auto-detected.
 */
export type QrMode = 'numeric' | 'alphanumeric' | 'byte'

export interface QrCodeOptions {
  /**
   * Error correction level. Default: `M`.
   */
  ecl?: QrErrorCorrectionLevel
  /**
   * QR version 1..40 (matrix grows by 4 modules per step: v1=21x21, v40=177x177).
   * Default: `0` = auto-select the smallest version that fits the payload.
   */
  typeNumber?: number
  /**
   * Force an encoding mode. Default: auto-detect (`numeric` < `alphanumeric` < `byte`).
   * Ignored when the content is a `Uint8Array` (always `byte`).
   */
  mode?: QrMode
}

export interface QrSvgOptions {
  /** Pixels per module (the rendered `width`/`height` = `(size + border*2) * scale`). Default `4`. */
  scale?: number
  /** Quiet-zone width in modules. The spec recommends `4`. Default `4`. */
  border?: number
  /** Color of dark modules. Default `#000000`. */
  dark?: string
  /** Color of light modules / background. Default `#ffffff`. */
  light?: string
}

export interface QrAsciiOptions {
  /** Quiet-zone width in modules. Default `2`. */
  border?: number
  /** Swap dark/light glyphs (useful on dark terminal backgrounds). Default `false`. */
  invert?: boolean
}

export interface QrCanvasOptions {
  /** Pixels per module. Default `4`. */
  scale?: number
  /** Quiet-zone width in modules. Default `4`. */
  border?: number
  /** Color of dark modules. Default `#000000`. */
  dark?: string
  /** Color of light modules. Default `#ffffff`. */
  light?: string
}

/**
 * Create a QR code from a string or raw bytes.
 *
 * @example
 * createQrCode('https://example.com').toDataUrl()
 * createQrCode('HELLO', { ecl: 'H' }).toSvg({ scale: 8 })
 */
export function createQrCode(content: string | Uint8Array, opt: QrCodeOptions = {}): QrCode {
  const ecl = opt.ecl ?? 'M'
  const segment = makeSegment(content, opt.mode)
  const { size, modules } = generate(segment, opt.typeNumber ?? 0, ecl)
  return new QrCode(size, modules, ecl)
}

/**
 * An immutable QR code: a square matrix of dark/light modules, plus renderers.
 */
export class QrCode {
  constructor(
    /** Width/height of the matrix in modules (`typeNumber * 4 + 17`). */
    readonly size: number,
    /** `modules[row][col]` - `true` = dark. */
    readonly modules: readonly boolean[][],
    /** Error correction level used. */
    readonly ecl: QrErrorCorrectionLevel,
  ) {}

  /** Whether the module at `[row, col]` is dark. */
  isDark(row: number, col: number): boolean {
    return this.modules[row]![col] === true
  }

  /**
   * Render as a standalone SVG document string.
   */
  toSvg(opt: QrSvgOptions = {}): string {
    const { scale = 4, border = 4, dark = '#000000', light = '#ffffff' } = opt
    const dim = this.size + border * 2
    const px = dim * scale

    let path = ''
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.modules[row]![col]) {
          // a 1x1 module rect, in module-unit coordinates (the viewBox scales it up)
          path += `M${col + border},${row + border}h1v1h-1z`
        }
      }
    }

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ` +
      `viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
      `<rect width="${dim}" height="${dim}" fill="${light}"/>` +
      `<path d="${path}" fill="${dark}"/>` +
      `</svg>`
    )
  }

  /**
   * Render as an `data:image/svg+xml` URL, ready for `<img src>` or CSS `background`.
   */
  toDataUrl(opt: QrSvgOptions = {}): string {
    return `data:image/svg+xml,${encodeURIComponent(this.toSvg(opt))}`
  }

  /**
   * Render as ASCII art using block characters - handy for terminals and logs.
   * Each module is 2 chars wide so the output keeps a square aspect ratio.
   */
  toAscii(opt: QrAsciiOptions = {}): string {
    const { border = 2, invert = false } = opt
    const darkCell = invert ? '  ' : '██'
    const lightCell = invert ? '██' : '  '
    const lines: string[] = []

    for (let row = -border; row < this.size + border; row++) {
      let line = ''
      for (let col = -border; col < this.size + border; col++) {
        const dark =
          row >= 0 && row < this.size && col >= 0 && col < this.size && this.modules[row]![col]
        line += dark ? darkCell : lightCell
      }
      lines.push(line)
    }
    return lines.join('\n')
  }

  /** Same as {@link toAscii} with defaults. */
  toString(): string {
    return this.toAscii()
  }

  /**
   * Paint the QR code onto a 2d canvas context (browser).
   */
  renderToCanvas(ctx: CanvasRenderingContext2D, opt: QrCanvasOptions = {}): void {
    const { scale = 4, border = 4, dark = '#000000', light = '#ffffff' } = opt
    const px = (this.size + border * 2) * scale
    ctx.fillStyle = light
    ctx.fillRect(0, 0, px, px)
    ctx.fillStyle = dark
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.modules[row]![col]) {
          ctx.fillRect((col + border) * scale, (row + border) * scale, scale, scale)
        }
      }
    }
  }
}

// --- internals -------------------------------------------------------------

const MODE_NUMERIC = 1 << 0
const MODE_ALPHANUMERIC = 1 << 1
const MODE_BYTE = 1 << 2

const PAD0 = 0xec
const PAD1 = 0x11

/** ECC level as encoded in the format-info bits. */
const ECL_BITS: Record<QrErrorCorrectionLevel, number> = { L: 1, M: 0, Q: 3, H: 2 }
/** ECC level as a row offset into the RS block table (ordered L, M, Q, H per version). */
const ECL_OFFSET: Record<QrErrorCorrectionLevel, number> = { L: 0, M: 1, Q: 2, H: 3 }

const NUMERIC_RE = /^\d+$/
const ALPHANUMERIC_RE = /^[\dA-Z $%*+./:-]+$/
const ALPHANUMERIC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'

const textEncoder = /* @__PURE__ */ new TextEncoder()

/**
 * A single encoded data segment (one mode + payload). The current API always produces exactly
 * one segment, but the matrix builder is written against a list to mirror the spec.
 */
interface QrSegment {
  mode: number
  /** Character count as written into the length field (digits/chars for text, bytes for byte mode). */
  length: number
  write: (bb: BitBuffer) => void
}

function makeSegment(content: string | Uint8Array, mode: QrMode | undefined): QrSegment {
  if (typeof content !== 'string') return byteSegment(content)

  const resolved = mode ?? detectMode(content)
  if (resolved === 'numeric') return numericSegment(content)
  if (resolved === 'alphanumeric') return alphanumericSegment(content)
  return byteSegment(textEncoder.encode(content))
}

function detectMode(s: string): QrMode {
  if (NUMERIC_RE.test(s)) return 'numeric'
  if (ALPHANUMERIC_RE.test(s)) return 'alphanumeric'
  return 'byte'
}

function numericSegment(data: string): QrSegment {
  return {
    mode: MODE_NUMERIC,
    length: data.length,
    write(bb) {
      let i = 0
      // 3 digits -> 10 bits
      for (; i + 2 < data.length; i += 3) {
        bb.put(Number(data.slice(i, i + 3)), 10)
      }
      // tail: 2 digits -> 7 bits, 1 digit -> 4 bits
      if (data.length - i === 2) {
        bb.put(Number(data.slice(i, i + 2)), 7)
      } else if (data.length - i === 1) {
        bb.put(Number(data.slice(i, i + 1)), 4)
      }
    },
  }
}

function alphanumericSegment(data: string): QrSegment {
  return {
    mode: MODE_ALPHANUMERIC,
    length: data.length,
    write(bb) {
      let i = 0
      // 2 chars -> 11 bits (c0 * 45 + c1)
      for (; i + 1 < data.length; i += 2) {
        bb.put(alphanumericCode(data[i]!) * 45 + alphanumericCode(data[i + 1]!), 11)
      }
      // tail: 1 char -> 6 bits
      if (i < data.length) {
        bb.put(alphanumericCode(data[i]!), 6)
      }
    },
  }
}

function alphanumericCode(c: string): number {
  const code = ALPHANUMERIC_CHARS.indexOf(c)
  if (code === -1) throw new Error(`qr: illegal alphanumeric char: ${c}`)
  return code
}

function byteSegment(bytes: Uint8Array): QrSegment {
  return {
    mode: MODE_BYTE,
    length: bytes.length,
    write(bb) {
      for (const b of bytes) bb.put(b, 8)
    },
  }
}

/**
 * Build the final module matrix: resolve version, encode data, then pick the mask pattern with the
 * lowest penalty score (matching the reference scoring, incl. tie-break to the lowest mask index).
 */
function generate(
  segment: QrSegment,
  typeNumber: number,
  ecl: QrErrorCorrectionLevel,
): { size: number; modules: boolean[][] } {
  const resolvedType = typeNumber >= 1 ? typeNumber : bestTypeNumber(segment, ecl)
  const data = createData(resolvedType, ecl, segment)

  let bestMask = 0
  let minLostPoint = Number.POSITIVE_INFINITY
  for (let mask = 0; mask < 8; mask++) {
    // scoring uses "test" modules (format/version bits blanked), as the original does
    const testModules = renderModules(resolvedType, ecl, data, mask, true)
    const lostPoint = getLostPoint(testModules)
    if (lostPoint < minLostPoint) {
      minLostPoint = lostPoint
      bestMask = mask
    }
  }

  const modules = renderModules(resolvedType, ecl, data, bestMask, false)
  return { size: modules.length, modules }
}

/** Smallest version (1..40) whose data capacity fits the segment at the given ECC level. */
function bestTypeNumber(segment: QrSegment, ecl: QrErrorCorrectionLevel): number {
  for (let type = 1; type <= 40; type++) {
    const bb = new BitBuffer()
    writeSegment(bb, segment, type)
    let totalDataCount = 0
    for (const block of getRsBlocks(type, ecl)) totalDataCount += block.dataCount
    if (bb.lengthInBits <= totalDataCount * 8) return type
  }
  throw new Error('qr: data too long for a single QR code')
}

function renderModules(
  typeNumber: number,
  ecl: QrErrorCorrectionLevel,
  data: number[],
  maskPattern: number,
  test: boolean,
): boolean[][] {
  const size = typeNumber * 4 + 17
  // `undefined` = "not yet filled" (function patterns must not be overwritten by data/timing)
  const modules: (boolean | undefined)[][] = Array.from({ length: size }, () =>
    new Array<boolean | undefined>(size).fill(undefined),
  )

  setupPositionProbePattern(modules, 0, 0)
  setupPositionProbePattern(modules, size - 7, 0)
  setupPositionProbePattern(modules, 0, size - 7)
  setupPositionAdjustPattern(modules, typeNumber)
  setupTimingPattern(modules)
  setupTypeInfo(modules, test, maskPattern, ecl)
  if (typeNumber >= 7) {
    setupTypeNumber(modules, test, typeNumber)
  }
  mapData(modules, data, maskPattern)

  // every cell is filled by now; coerce the sentinel away
  return modules as boolean[][]
}

function setupPositionProbePattern(
  modules: (boolean | undefined)[][],
  row: number,
  col: number,
): void {
  const size = modules.length
  for (let r = -1; r <= 7; r++) {
    if (row + r <= -1 || size <= row + r) continue
    for (let c = -1; c <= 7; c++) {
      if (col + c <= -1 || size <= col + c) continue
      modules[row + r]![col + c] =
        (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
        (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4)
    }
  }
}

function setupPositionAdjustPattern(modules: (boolean | undefined)[][], typeNumber: number): void {
  const pos = PATTERN_POSITION_TABLE[typeNumber - 1]!
  for (const row of pos) {
    for (const col of pos) {
      if (modules[row]![col] !== undefined) continue
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          modules[row + r]![col + c] =
            r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)
        }
      }
    }
  }
}

function setupTimingPattern(modules: (boolean | undefined)[][]): void {
  const size = modules.length
  for (let r = 8; r < size - 8; r++) {
    if (modules[r]![6] === undefined) modules[r]![6] = r % 2 === 0
  }
  for (let c = 8; c < size - 8; c++) {
    if (modules[6]![c] === undefined) modules[6]![c] = c % 2 === 0
  }
}

function setupTypeInfo(
  modules: (boolean | undefined)[][],
  test: boolean,
  maskPattern: number,
  ecl: QrErrorCorrectionLevel,
): void {
  const size = modules.length
  const data = (ECL_BITS[ecl] << 3) | maskPattern
  const bits = getBchTypeInfo(data)

  for (let i = 0; i < 15; i++) {
    const mod = !test && ((bits >> i) & 1) === 1

    // vertical
    if (i < 6) {
      modules[i]![8] = mod
    } else if (i < 8) {
      modules[i + 1]![8] = mod
    } else {
      modules[size - 15 + i]![8] = mod
    }

    // horizontal
    if (i < 8) {
      modules[8]![size - i - 1] = mod
    } else if (i < 9) {
      modules[8]![15 - i - 1 + 1] = mod
    } else {
      modules[8]![15 - i - 1] = mod
    }
  }

  // fixed dark module
  modules[size - 8]![8] = !test
}

function setupTypeNumber(
  modules: (boolean | undefined)[][],
  test: boolean,
  typeNumber: number,
): void {
  const size = modules.length
  const bits = getBchTypeNumber(typeNumber)
  for (let i = 0; i < 18; i++) {
    const mod = !test && ((bits >> i) & 1) === 1
    modules[Math.floor(i / 3)]![(i % 3) + size - 8 - 3] = mod
    modules[(i % 3) + size - 8 - 3]![Math.floor(i / 3)] = mod
  }
}

function mapData(modules: (boolean | undefined)[][], data: number[], maskPattern: number): void {
  const size = modules.length
  let inc = -1
  let row = size - 1
  let bitIndex = 7
  let byteIndex = 0
  const maskFunc = MASK_FUNCTIONS[maskPattern]!

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1
    for (;;) {
      for (let c = 0; c < 2; c++) {
        if (modules[row]![col - c] === undefined) {
          let dark = false
          if (byteIndex < data.length) {
            dark = ((data[byteIndex]! >>> bitIndex) & 1) === 1
          }
          if (maskFunc(row, col - c)) dark = !dark
          modules[row]![col - c] = dark
          bitIndex--
          if (bitIndex === -1) {
            byteIndex++
            bitIndex = 7
          }
        }
      }
      row += inc
      if (row < 0 || size <= row) {
        row -= inc
        inc = -inc
        break
      }
    }
  }
}

/** Mask penalty score - lower is better. Sum of the 4 penalty rules from the QR spec. */
function getLostPoint(modules: boolean[][]): number {
  return (
    lostPointAdjacent(modules) +
    lostPointBlocks(modules) +
    lostPointFinderLike(modules) +
    lostPointDarkRatio(modules)
  )
}

/** LEVEL 1: runs of same-colored modules in a 3x3 neighbourhood. */
function lostPointAdjacent(modules: boolean[][]): number {
  const size = modules.length
  let lostPoint = 0
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      let sameCount = 0
      const dark = modules[row]![col]
      for (let r = -1; r <= 1; r++) {
        if (row + r < 0 || size <= row + r) continue
        for (let c = -1; c <= 1; c++) {
          if (col + c < 0 || size <= col + c) continue
          if (r === 0 && c === 0) continue
          if (dark === modules[row + r]![col + c]) sameCount++
        }
      }
      if (sameCount > 5) lostPoint += 3 + sameCount - 5
    }
  }
  return lostPoint
}

/** LEVEL 2: 2x2 blocks of one color. */
function lostPointBlocks(modules: boolean[][]): number {
  const size = modules.length
  let lostPoint = 0
  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      let count = 0
      if (modules[row]![col]) count++
      if (modules[row + 1]![col]) count++
      if (modules[row]![col + 1]) count++
      if (modules[row + 1]![col + 1]) count++
      if (count === 0 || count === 4) lostPoint += 3
    }
  }
  return lostPoint
}

/** LEVEL 3: finder-like 1:1:3:1:1 patterns, horizontal and vertical. */
function lostPointFinderLike(modules: boolean[][]): number {
  const size = modules.length
  let lostPoint = 0
  const isDark = (r: number, c: number): boolean => modules[r]![c] === true
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size - 6; col++) {
      if (
        isDark(row, col) &&
        !isDark(row, col + 1) &&
        isDark(row, col + 2) &&
        isDark(row, col + 3) &&
        isDark(row, col + 4) &&
        !isDark(row, col + 5) &&
        isDark(row, col + 6)
      ) {
        lostPoint += 40
      }
    }
  }
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size - 6; row++) {
      if (
        isDark(row, col) &&
        !isDark(row + 1, col) &&
        isDark(row + 2, col) &&
        isDark(row + 3, col) &&
        isDark(row + 4, col) &&
        !isDark(row + 5, col) &&
        isDark(row + 6, col)
      ) {
        lostPoint += 40
      }
    }
  }
  return lostPoint
}

/** LEVEL 4: deviation of the dark-module ratio from 50%. */
function lostPointDarkRatio(modules: boolean[][]): number {
  const size = modules.length
  let darkCount = 0
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      if (modules[row]![col]) darkCount++
    }
  }
  const ratio = Math.abs((100 * darkCount) / size / size - 50) / 5
  return ratio * 10
}

// --- data encoding (ECC) ---------------------------------------------------

function createData(typeNumber: number, ecl: QrErrorCorrectionLevel, segment: QrSegment): number[] {
  const rsBlocks = getRsBlocks(typeNumber, ecl)
  const bb = new BitBuffer()
  writeSegment(bb, segment, typeNumber)

  let totalDataCount = 0
  for (const block of rsBlocks) totalDataCount += block.dataCount

  if (bb.lengthInBits > totalDataCount * 8) {
    throw new Error(`qr: code length overflow (${bb.lengthInBits} > ${totalDataCount * 8})`)
  }

  // terminator
  if (bb.lengthInBits + 4 <= totalDataCount * 8) bb.put(0, 4)
  // pad to byte boundary
  while (bb.lengthInBits % 8 !== 0) bb.putBit(false)
  // pad with alternating PAD0/PAD1 to capacity
  for (;;) {
    if (bb.lengthInBits >= totalDataCount * 8) break
    bb.put(PAD0, 8)
    if (bb.lengthInBits >= totalDataCount * 8) break
    bb.put(PAD1, 8)
  }

  return createBytes(bb, rsBlocks)
}

function writeSegment(bb: BitBuffer, segment: QrSegment, typeNumber: number): void {
  bb.put(segment.mode, 4)
  bb.put(segment.length, getLengthInBits(segment.mode, typeNumber))
  segment.write(bb)
}

/** Interleave data & error-correction codewords across the RS blocks. */
function createBytes(buffer: BitBuffer, rsBlocks: RsBlock[]): number[] {
  let offset = 0
  let maxDcCount = 0
  let maxEcCount = 0
  const dcdata: number[][] = new Array(rsBlocks.length)
  const ecdata: number[][] = new Array(rsBlocks.length)
  const src = buffer.buffer

  for (let r = 0; r < rsBlocks.length; r++) {
    const dcCount = rsBlocks[r]!.dataCount
    const ecCount = rsBlocks[r]!.totalCount - dcCount
    maxDcCount = Math.max(maxDcCount, dcCount)
    maxEcCount = Math.max(maxEcCount, ecCount)

    const dc = new Array<number>(dcCount)
    for (let i = 0; i < dcCount; i++) dc[i] = 0xff & src[i + offset]!
    dcdata[r] = dc
    offset += dcCount

    const rsPoly = getErrorCorrectPolynomial(ecCount)
    const modPoly = polyMod(newPolynomial(dc, rsPoly.length - 1), rsPoly)
    const ec = new Array<number>(rsPoly.length - 1)
    for (let i = 0; i < ec.length; i++) {
      const modIndex = i + modPoly.length - ec.length
      ec[i] = modIndex >= 0 ? modPoly[modIndex]! : 0
    }
    ecdata[r] = ec
  }

  let totalCodeCount = 0
  for (const block of rsBlocks) totalCodeCount += block.totalCount

  const data = new Array<number>(totalCodeCount)
  let index = 0
  for (let i = 0; i < maxDcCount; i++) {
    for (let r = 0; r < rsBlocks.length; r++) {
      if (i < dcdata[r]!.length) data[index++] = dcdata[r]![i]!
    }
  }
  for (let i = 0; i < maxEcCount; i++) {
    for (let r = 0; r < rsBlocks.length; r++) {
      if (i < ecdata[r]!.length) data[index++] = ecdata[r]![i]!
    }
  }
  return data
}

/** Bits in the character-count field, by mode, for version ranges [1-9], [10-26], [27-40]. */
const LENGTH_BITS: Record<number, [number, number, number]> = {
  [MODE_NUMERIC]: [10, 12, 14],
  [MODE_ALPHANUMERIC]: [9, 11, 13],
  [MODE_BYTE]: [8, 16, 16],
}

/** Number of bits in the character-count field, per mode & version range. */
function getLengthInBits(mode: number, type: number): number {
  if (type < 1 || type > 40) throw new Error(`qr: bad type number: ${type}`)
  const bits = LENGTH_BITS[mode]
  if (!bits) throw new Error(`qr: bad mode: ${mode}`)
  const range = type < 10 ? 0 : type < 27 ? 1 : 2
  return bits[range]
}

// --- Reed-Solomon polynomials over GF(256) ---------------------------------

/** Drop leading zeros, then right-pad with `shift` zeros. */
function newPolynomial(num: number[], shift: number): number[] {
  let offset = 0
  while (offset < num.length && num[offset] === 0) offset++
  const poly = new Array<number>(num.length - offset + shift).fill(0)
  for (let i = 0; i < num.length - offset; i++) poly[i] = num[i + offset]!
  return poly
}

function polyMultiply(a: number[], b: number[]): number[] {
  const num = new Array<number>(a.length + b.length - 1).fill(0)
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      num[i + j]! ^= gexp(glog(a[i]!) + glog(b[j]!))
    }
  }
  return newPolynomial(num, 0)
}

function polyMod(a: number[], b: number[]): number[] {
  if (a.length - b.length < 0) return a
  const ratio = glog(a[0]!) - glog(b[0]!)
  const num = a.slice()
  for (let i = 0; i < b.length; i++) {
    num[i]! ^= gexp(glog(b[i]!) + ratio)
  }
  // recurse until degree drops below the divisor
  return polyMod(newPolynomial(num, 0), b)
}

function getErrorCorrectPolynomial(ecLength: number): number[] {
  let poly = [1]
  for (let i = 0; i < ecLength; i++) {
    poly = polyMultiply(poly, [1, gexp(i)])
  }
  return poly
}

// --- BCH codes (format & version info) -------------------------------------

const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0)
const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0)
const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1)

function getBchDigit(data: number): number {
  let digit = 0
  while (data !== 0) {
    digit++
    data >>>= 1
  }
  return digit
}

function getBchTypeInfo(data: number): number {
  let d = data << 10
  while (getBchDigit(d) - getBchDigit(G15) >= 0) {
    d ^= G15 << (getBchDigit(d) - getBchDigit(G15))
  }
  return ((data << 10) | d) ^ G15_MASK
}

function getBchTypeNumber(data: number): number {
  let d = data << 12
  while (getBchDigit(d) - getBchDigit(G18) >= 0) {
    d ^= G18 << (getBchDigit(d) - getBchDigit(G18))
  }
  return (data << 12) | d
}

// --- Galois field GF(256) math ---------------------------------------------

const EXP_TABLE = new Uint8Array(256)
const LOG_TABLE = new Uint8Array(256)
for (let i = 0; i < 8; i++) EXP_TABLE[i] = 1 << i
for (let i = 8; i < 256; i++) {
  EXP_TABLE[i] = EXP_TABLE[i - 4]! ^ EXP_TABLE[i - 5]! ^ EXP_TABLE[i - 6]! ^ EXP_TABLE[i - 8]!
}
for (let i = 0; i < 255; i++) LOG_TABLE[EXP_TABLE[i]!] = i

function glog(n: number): number {
  if (n < 1) throw new Error(`qr: glog(${n})`)
  return LOG_TABLE[n]!
}

function gexp(n: number): number {
  while (n < 0) n += 255
  while (n >= 256) n -= 255
  return EXP_TABLE[n]!
}

// --- bit buffer ------------------------------------------------------------

class BitBuffer {
  readonly buffer: number[] = []
  lengthInBits = 0

  put(num: number, length: number): void {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1)
    }
  }

  putBit(bit: boolean): void {
    const bufIndex = Math.floor(this.lengthInBits / 8)
    if (this.buffer.length <= bufIndex) this.buffer.push(0)
    if (bit) this.buffer[bufIndex]! |= 0x80 >>> (this.lengthInBits % 8)
    this.lengthInBits++
  }
}

// --- RS block & alignment-pattern tables -----------------------------------

interface RsBlock {
  totalCount: number
  dataCount: number
}

function getRsBlocks(typeNumber: number, ecl: QrErrorCorrectionLevel): RsBlock[] {
  const rsBlock = RS_BLOCK_TABLE[(typeNumber - 1) * 4 + ECL_OFFSET[ecl]]
  if (!rsBlock) {
    throw new Error(`qr: bad rs block @ typeNumber:${typeNumber}/ecl:${ecl}`)
  }
  const blocks: RsBlock[] = []
  // each row is a flat list of [count, totalCount, dataCount] triples
  for (let i = 0; i < rsBlock.length; i += 3) {
    const count = rsBlock[i]!
    const totalCount = rsBlock[i + 1]!
    const dataCount = rsBlock[i + 2]!
    for (let j = 0; j < count; j++) blocks.push({ totalCount, dataCount })
  }
  return blocks
}

/** Alignment-pattern centre coordinates, indexed by `typeNumber - 1`. */
const PATTERN_POSITION_TABLE: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
]

/** The 8 data-masking functions, indexed by mask pattern (0..7). */
const MASK_FUNCTIONS: ((i: number, j: number) => boolean)[] = [
  (i, j) => (i + j) % 2 === 0,
  (i, _j) => i % 2 === 0,
  (_i, j) => j % 3 === 0,
  (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
  (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
  (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
  (i, j) => (((i * j) % 3) + ((i + j) % 2)) % 2 === 0,
]

/**
 * RS block layout, 4 rows per version (L, M, Q, H), each a flat list of
 * `[count, totalCount, dataCount]` triples. Verbatim from the QR spec.
 */
const RS_BLOCK_TABLE: number[][] = [
  // 1
  [1, 26, 19],
  [1, 26, 16],
  [1, 26, 13],
  [1, 26, 9],
  // 2
  [1, 44, 34],
  [1, 44, 28],
  [1, 44, 22],
  [1, 44, 16],
  // 3
  [1, 70, 55],
  [1, 70, 44],
  [2, 35, 17],
  [2, 35, 13],
  // 4
  [1, 100, 80],
  [2, 50, 32],
  [2, 50, 24],
  [4, 25, 9],
  // 5
  [1, 134, 108],
  [2, 67, 43],
  [2, 33, 15, 2, 34, 16],
  [2, 33, 11, 2, 34, 12],
  // 6
  [2, 86, 68],
  [4, 43, 27],
  [4, 43, 19],
  [4, 43, 15],
  // 7
  [2, 98, 78],
  [4, 49, 31],
  [2, 32, 14, 4, 33, 15],
  [4, 39, 13, 1, 40, 14],
  // 8
  [2, 121, 97],
  [2, 60, 38, 2, 61, 39],
  [4, 40, 18, 2, 41, 19],
  [4, 40, 14, 2, 41, 15],
  // 9
  [2, 146, 116],
  [3, 58, 36, 2, 59, 37],
  [4, 36, 16, 4, 37, 17],
  [4, 36, 12, 4, 37, 13],
  // 10
  [2, 86, 68, 2, 87, 69],
  [4, 69, 43, 1, 70, 44],
  [6, 43, 19, 2, 44, 20],
  [6, 43, 15, 2, 44, 16],
  // 11
  [4, 101, 81],
  [1, 80, 50, 4, 81, 51],
  [4, 50, 22, 4, 51, 23],
  [3, 36, 12, 8, 37, 13],
  // 12
  [2, 116, 92, 2, 117, 93],
  [6, 58, 36, 2, 59, 37],
  [4, 46, 20, 6, 47, 21],
  [7, 42, 14, 4, 43, 15],
  // 13
  [4, 133, 107],
  [8, 59, 37, 1, 60, 38],
  [8, 44, 20, 4, 45, 21],
  [12, 33, 11, 4, 34, 12],
  // 14
  [3, 145, 115, 1, 146, 116],
  [4, 64, 40, 5, 65, 41],
  [11, 36, 16, 5, 37, 17],
  [11, 36, 12, 5, 37, 13],
  // 15
  [5, 109, 87, 1, 110, 88],
  [5, 65, 41, 5, 66, 42],
  [5, 54, 24, 7, 55, 25],
  [11, 36, 12, 7, 37, 13],
  // 16
  [5, 122, 98, 1, 123, 99],
  [7, 73, 45, 3, 74, 46],
  [15, 43, 19, 2, 44, 20],
  [3, 45, 15, 13, 46, 16],
  // 17
  [1, 135, 107, 5, 136, 108],
  [10, 74, 46, 1, 75, 47],
  [1, 50, 22, 15, 51, 23],
  [2, 42, 14, 17, 43, 15],
  // 18
  [5, 150, 120, 1, 151, 121],
  [9, 69, 43, 4, 70, 44],
  [17, 50, 22, 1, 51, 23],
  [2, 42, 14, 19, 43, 15],
  // 19
  [3, 141, 113, 4, 142, 114],
  [3, 70, 44, 11, 71, 45],
  [17, 47, 21, 4, 48, 22],
  [9, 39, 13, 16, 40, 14],
  // 20
  [3, 135, 107, 5, 136, 108],
  [3, 67, 41, 13, 68, 42],
  [15, 54, 24, 5, 55, 25],
  [15, 43, 15, 10, 44, 16],
  // 21
  [4, 144, 116, 4, 145, 117],
  [17, 68, 42],
  [17, 50, 22, 6, 51, 23],
  [19, 46, 16, 6, 47, 17],
  // 22
  [2, 139, 111, 7, 140, 112],
  [17, 74, 46],
  [7, 54, 24, 16, 55, 25],
  [34, 37, 13],
  // 23
  [4, 151, 121, 5, 152, 122],
  [4, 75, 47, 14, 76, 48],
  [11, 54, 24, 14, 55, 25],
  [16, 45, 15, 14, 46, 16],
  // 24
  [6, 147, 117, 4, 148, 118],
  [6, 73, 45, 14, 74, 46],
  [11, 54, 24, 16, 55, 25],
  [30, 46, 16, 2, 47, 17],
  // 25
  [8, 132, 106, 4, 133, 107],
  [8, 75, 47, 13, 76, 48],
  [7, 54, 24, 22, 55, 25],
  [22, 45, 15, 13, 46, 16],
  // 26
  [10, 142, 114, 2, 143, 115],
  [19, 74, 46, 4, 75, 47],
  [28, 50, 22, 6, 51, 23],
  [33, 46, 16, 4, 47, 17],
  // 27
  [8, 152, 122, 4, 153, 123],
  [22, 73, 45, 3, 74, 46],
  [8, 53, 23, 26, 54, 24],
  [12, 45, 15, 28, 46, 16],
  // 28
  [3, 147, 117, 10, 148, 118],
  [3, 73, 45, 23, 74, 46],
  [4, 54, 24, 31, 55, 25],
  [11, 45, 15, 31, 46, 16],
  // 29
  [7, 146, 116, 7, 147, 117],
  [21, 73, 45, 7, 74, 46],
  [1, 53, 23, 37, 54, 24],
  [19, 45, 15, 26, 46, 16],
  // 30
  [5, 145, 115, 10, 146, 116],
  [19, 75, 47, 10, 76, 48],
  [15, 54, 24, 25, 55, 25],
  [23, 45, 15, 25, 46, 16],
  // 31
  [13, 145, 115, 3, 146, 116],
  [2, 74, 46, 29, 75, 47],
  [42, 54, 24, 1, 55, 25],
  [23, 45, 15, 28, 46, 16],
  // 32
  [17, 145, 115],
  [10, 74, 46, 23, 75, 47],
  [10, 54, 24, 35, 55, 25],
  [19, 45, 15, 35, 46, 16],
  // 33
  [17, 145, 115, 1, 146, 116],
  [14, 74, 46, 21, 75, 47],
  [29, 54, 24, 19, 55, 25],
  [11, 45, 15, 46, 46, 16],
  // 34
  [13, 145, 115, 6, 146, 116],
  [14, 74, 46, 23, 75, 47],
  [44, 54, 24, 7, 55, 25],
  [59, 46, 16, 1, 47, 17],
  // 35
  [12, 151, 121, 7, 152, 122],
  [12, 75, 47, 26, 76, 48],
  [39, 54, 24, 14, 55, 25],
  [22, 45, 15, 41, 46, 16],
  // 36
  [6, 151, 121, 14, 152, 122],
  [6, 75, 47, 34, 76, 48],
  [46, 54, 24, 10, 55, 25],
  [2, 45, 15, 64, 46, 16],
  // 37
  [17, 152, 122, 4, 153, 123],
  [29, 74, 46, 14, 75, 47],
  [49, 54, 24, 10, 55, 25],
  [24, 45, 15, 46, 46, 16],
  // 38
  [4, 152, 122, 18, 153, 123],
  [13, 74, 46, 32, 75, 47],
  [48, 54, 24, 14, 55, 25],
  [42, 45, 15, 32, 46, 16],
  // 39
  [20, 147, 117, 4, 148, 118],
  [40, 75, 47, 7, 76, 48],
  [43, 54, 24, 22, 55, 25],
  [10, 45, 15, 67, 46, 16],
  // 40
  [19, 148, 118, 6, 149, 119],
  [18, 75, 47, 31, 76, 48],
  [34, 54, 24, 34, 55, 25],
  [20, 45, 15, 61, 46, 16],
]
