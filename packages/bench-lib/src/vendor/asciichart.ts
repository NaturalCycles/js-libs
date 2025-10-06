/*

Completely based on:
https://github.com/kroitor/asciichart/

Adapted for typescript.

Super-experimental!
 */

// oxlint-disable no-new-array -- vendored ASCII chart relies on Array constructors
export const asciiColor = {
  black: '\u001B[30m',
  red: '\u001B[31m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  blue: '\u001B[34m',
  magenta: '\u001B[35m',
  cyan: '\u001B[36m',
  lightgray: '\u001B[37m',
  default: '\u001B[39m',
  darkgray: '\u001B[90m',
  lightred: '\u001B[91m',
  lightgreen: '\u001B[92m',
  lightyellow: '\u001B[93m',
  lightblue: '\u001B[94m',
  lightmagenta: '\u001B[95m',
  lightcyan: '\u001B[96m',
  white: '\u001B[97m',
  reset: '\u001B[0m',
}

function colored(char: string, color?: string): string {
  // do not color it if color is not specified
  return color === undefined ? char : color + char + asciiColor.reset
}

export interface AsciiPlotOptions {
  min?: number
  max?: number
  offset?: number
  padding?: string
  height?: number
  colors?: string[]
  format?: (y: number, index: number) => string
  symbols?: string[]
}

export function asciiPlot(seriesInput: number[][], cfg: AsciiPlotOptions = {}): string {
  // this function takes both one array and array of arrays
  // if an array of numbers is passed it is transformed to
  // an array of exactly one array with numbers
  const series: number[][] = seriesInput as any

  // if (typeof(seriesInput[0]) === "number"){
  //   series = [seriesInput as number[]]
  // }

  cfg = typeof cfg !== 'undefined' ? cfg : {}

  let min = typeof cfg.min !== 'undefined' ? cfg.min : series[0]![0]!
  let max = typeof cfg.max !== 'undefined' ? cfg.max : series[0]![0]!

  for (const element of series) {
    for (const element_ of element) {
      min = Math.min(min, element_)
      max = Math.max(max, element_)
    }
  }

  const defaultSymbols = ['┼', '┤', '╶', '╴', '─', '╰', '╭', '╮', '╯', '│']
  const range = Math.abs(max - min)
  const offset = typeof cfg.offset !== 'undefined' ? cfg.offset : 3
  const padding = typeof cfg.padding !== 'undefined' ? cfg.padding : '           '
  const height = typeof cfg.height !== 'undefined' ? cfg.height : range
  const colors = typeof cfg.colors !== 'undefined' ? cfg.colors : []
  const ratio = range !== 0 ? height / range : 1
  const min2 = Math.round(min * ratio)
  const max2 = Math.round(max * ratio)
  const rows = Math.abs(max2 - min2)
  let width = 0
  for (const element of series) {
    width = Math.max(width, element.length)
  }
  width += offset
  const symbols = typeof cfg.symbols !== 'undefined' ? cfg.symbols : defaultSymbols
  const format =
    typeof cfg.format !== 'undefined'
      ? cfg.format
      : (x: number) => (padding + x.toFixed(2)).slice(-padding.length)

  const result = new Array(rows + 1) // empty space
  for (let i = 0; i <= rows; i++) {
    result[i] = new Array(width)
    for (let j = 0; j < width; j++) {
      result[i][j] = ' '
    }
  }
  for (let y = min2; y <= max2; ++y) {
    // axis + labels
    const label = format(rows > 0 ? max - ((y - min2) * range) / rows : y, y - min2)
    result[y - min2][Math.max(offset - label.length, 0)] = label
    result[y - min2][offset - 1] = y === 0 ? symbols[0] : symbols[1]
  }

  for (const [j, element] of series.entries()) {
    const currentColor = colors[j % colors.length]
    const y0 = Math.round(element[0]! * ratio) - min2
    result[rows - y0][offset - 1] = colored(symbols[0]!, currentColor) // first value

    for (let x = 0; x < element.length - 1; x++) {
      // plot the line
      const y0 = Math.round(element[x + 0]! * ratio) - min2
      const y1 = Math.round(element[x + 1]! * ratio) - min2
      if (y0 === y1) {
        result[rows - y0][x + offset] = colored(symbols[4]!, currentColor)
      } else {
        result[rows - y1][x + offset] = colored(y0 > y1 ? symbols[5]! : symbols[6]!, currentColor)
        result[rows - y0][x + offset] = colored(y0 > y1 ? symbols[7]! : symbols[8]!, currentColor)
        const from = Math.min(y0, y1)
        const to = Math.max(y0, y1)
        for (let y = from + 1; y < to; y++) {
          result[rows - y][x + offset] = colored(symbols[9]!, currentColor)
        }
      }
    }
  }
  return result.map(x => x.join('')).join('\n')
}
