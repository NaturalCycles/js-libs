import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { expect, it } from 'vitest'
import { vary } from './vary.js'

it.each([
  [undefined, 'Accept-Encoding', 'Accept-Encoding'],
  ['', 'Accept-Encoding', 'Accept-Encoding'],
  ['Accept', 'Accept-Encoding', 'Accept, Accept-Encoding'],
  ['accept-encoding', 'Accept-Encoding', 'accept-encoding'],
  [' accept ,  origin ', 'Origin', ' accept ,  origin '],
  [['Accept', 'Origin'], 'Accept-Encoding', 'Accept, Origin, Accept-Encoding'],
  [['Accept', 'Origin'], 'origin', ['Accept', 'Origin']],
  ['*', 'Accept-Encoding', '*'],
  ['Accept, *', 'Accept', '*'],
  ['Accept', '*', '*'],
] as const)('vary(%j, %s) => %j', (header, field, expected) => {
  const res = new ServerResponse(new IncomingMessage(new Socket()))
  if (header !== undefined) res.setHeader('Vary', header)
  vary(res, field)
  expect(res.getHeader('Vary')).toEqual(expected)
})
