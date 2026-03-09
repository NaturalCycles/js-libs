import tty from 'node:tty'
import ansis from 'ansis'

/**
 * Based on: https://github.com/sindresorhus/yoctocolors/pull/5
 *
 * @experimental
 */
export const hasColors = !process.env['NO_COLOR'] && tty.WriteStream.prototype.hasColors()

// The point of re-exporting is:
// 1. Fix typings to allow to pass `number` (very common case)
// 2. Easier/shorter to import, rather than from 'ansis'
// export type ColorFn = (...args: (string | number)[]) => string

export const white = ansis.white
export const dimWhite = ansis.dim.white
export const boldWhite = ansis.bold.white
export const inverseWhite = ansis.inverse.white
export const grey = ansis.gray
export const dimGrey = ansis.dim.gray
export const boldGrey = ansis.bold.gray
export const yellow = ansis.yellow
export const dimYellow = ansis.dim.yellow
export const boldYellow = ansis.bold.yellow
export const inverseYellow = ansis.inverse.yellow
export const green = ansis.green
export const dimGreen = ansis.dim.green
export const boldGreen = ansis.bold.green
export const red = ansis.red
export const dimRed = ansis.dim.red
export const boldRed = ansis.bold.red
export const blue = ansis.blue
export const dimBlue = ansis.dim.blue
export const boldBlue = ansis.bold.blue
export const magenta = ansis.magenta
export const dimMagenta = ansis.dim.magenta
export const boldMagenta = ansis.bold.magenta
export const cyan = ansis.cyan
export const dimCyan = ansis.dim.cyan
export const boldCyan = ansis.bold.cyan
