/*

pn tsx scripts/hashBench

 */

// oxlint-disable no-unused-vars

import nodeCrypto from 'node:crypto'
import { runBenchScript } from '@naturalcycles/bench-lib'
import { md5 } from '@naturalcycles/nodejs-lib'
import cryptoJS from 'crypto-js'
import { _range } from '../src/array/index.js'
import { hashCode, hashCode64 } from '../src/string/index.js'
const crypto = nodeCrypto.webcrypto

const data = _range(100).map(n => ({
  id: `id_${n}`,
  s: String(n).repeat(n),
  odd: !!(n % 2),
}))

runBenchScript({
  fns: {
    hashCode: () => {
      const _r = data.map(obj => {
        return String(hashCode(JSON.stringify(obj)))
      })
    },
    // hashCodeHex: done => {
    //   const _r = data.map(obj => {
    //     return String(hashCode16(JSON.stringify(obj)))
    //   })
    //
    //   done.resolve()
    // },
    hashCodeBase64url: () => {
      const _r = data.map(obj => {
        return String(hashCode64(JSON.stringify(obj)))
      })
    },
    // hashCodeBase36: done => {
    //   const _r = data.map(obj => {
    //     return String(hashCode36(JSON.stringify(obj)))
    //   })
    //
    //   done.resolve()
    // },
    cryptojsmd5: () => {
      const _r = data.map(obj => {
        return cryptoJS.MD5(JSON.stringify(obj))
      })
    },
    // subtleCryptoSha256: async done => {
    //   const _r: any[] = []
    //
    //   await pMap(data, async item => {
    //     _r.push(await subtleCryptoSha256(JSON.stringify(item)))
    //   })
    //
    //   done.resolve()
    // },
    nodemd5: () => {
      const _r = data.map(obj => {
        return md5(JSON.stringify(obj))
      })
    },
  },
})

async function _subtleCryptoSha256(s: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(s)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hash))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('') // convert bytes to hex string
  return hashHex
}
