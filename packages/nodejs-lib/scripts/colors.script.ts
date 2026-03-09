/*

pn tsx scripts/colors.script.ts

 */

import ansis from 'ansis'
import { runScript } from '../src/script/runScript.js'

const s = 'Hello World! 1 2 3 4 5ms'

const colors = ['white', 'gray', 'yellow', 'green', 'red', 'blue', 'magenta', 'cyan'] as const
const modifiers = ['dim', null, 'bold', 'inverse'] as const

runScript(async () => {
  colors.forEach(color => {
    modifiers.forEach(mod => {
      if (mod) {
        console.log(ansis[mod][color](`${s} ${mod} ${color}`))
      } else {
        console.log(ansis[color](`${s} ${color}`))
      }
    })
  })
})
