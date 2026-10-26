import { it } from 'vitest'
import { grey, hasColors } from './colors.js'

it('colors', () => {
  console.log(grey('sdf'))
  console.log(grey('15 16'))
  // console.log(grey({hello: 'world', num: 5}))
})

it('hasColors', () => {
  console.log(hasColors)
})
