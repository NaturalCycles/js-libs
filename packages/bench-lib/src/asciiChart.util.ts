import { _arrayFilled } from '@naturalcycles/js-lib/array/range.js'
import { asciiColor, asciiPlot } from './vendor/asciichart.js'

const colors = [
  asciiColor.blue,
  asciiColor.green,
  asciiColor.yellow,
  asciiColor.red,
  asciiColor.magenta,
  asciiColor.lightcyan,
  // undefined, // equivalent to default
]

export function plotAsciiChart(results: Record<string, number>): string {
  const series: number[][] = []
  const resultsLen = Object.keys(results).length

  Object.values(results).forEach((result, i) => {
    series.push([
      ..._arrayFilled(5 + 5 * i, 0),
      result,
      ..._arrayFilled(3 + 5 * (resultsLen - i), 0),
    ])
  })

  let s = asciiPlot(series, {
    colors,
    offset: 2,
    height: 10,
    format: y => formatNumber(y).padStart(15, ' ') + ' ',
  })

  s +=
    '\n' +
    Object.keys(results)
      .map((name, i) => colored(' '.repeat(16 + i * 5) + name, colors[i]))
      .join('\n')

  return s
}

function colored(char: string, color?: string): string {
  if (!color) return char
  return color + char + asciiColor.reset
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}
