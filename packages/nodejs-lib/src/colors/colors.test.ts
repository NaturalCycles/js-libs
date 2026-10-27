import { it } from 'vitest'
import { grey, hasColors } from './colors.js'

it('should not throw when coloring strings grey', () => {
  console.log(grey('sdf'))
  console.log(grey('15 16'))
  // console.log(grey({hello: 'world', num: 5}))
})

it('should not throw when reading hasColors', () => {
  console.log(hasColors)
})
