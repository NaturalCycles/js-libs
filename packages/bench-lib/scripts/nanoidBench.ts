/*

yarn tsx scripts/nanoidBench

 */

// oxlint-disable no-unused-vars

// import { nanoid as nanoidAsync } from 'nanoid/async'
// import { nanoid as nanoidNonSecure } from 'nanoid/non-secure'
import { nanoid } from '@naturalcycles/nodejs-lib'
import { nanoid as nanoidNonSecure } from 'nanoid/non-secure'
import { runBenchScript } from '../src/index.js'

/* eslint-disable no-useless-assignment */

runBenchScript({
  fns: {
    nanoidNonSecure: () => {
      let _count = 0
      const id = nanoidNonSecure()
      if (id) _count++
    },
    nanoidSync: () => {
      let _count = 0
      const id = nanoid()
      if (id) _count++
    },
    // nanoidAsync: async done => {
    //   let _count = 0
    //   const id = await nanoidAsync()
    //   if (id) _count++
    //   done.resolve()
    // },
  },
})
