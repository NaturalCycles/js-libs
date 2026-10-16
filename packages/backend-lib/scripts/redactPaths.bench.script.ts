/*

Measures validateRequest overhead with/without redactPaths, on happy and failure paths.

pn tsx scripts/redactPaths.bench.script.ts

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import { j } from '@naturalcycles/nodejs-lib/ajv'
import { validateRequest } from '../src/validation/ajv/validateRequest.js'

interface LoginInput {
  email: string
  pw: string
  deviceId?: string
}

const loginSchema = j.object<LoginInput>({
  email: j.string().email(),
  pw: j.string().minLength(8).maxLength(100),
  deviceId: j.string().optional(),
})

interface HeadersInput {
  appver?: string
  clientid?: string
  deviceuuid?: string
  sessionid?: string
  signature?: string
  publickey?: string
  tz?: string
  uilang?: string
}

const headersSchema = j.object<HeadersInput>({
  appver: j.string().optional(),
  clientid: j.string().optional(),
  deviceuuid: j.string().optional(),
  sessionid: j.string().optional(),
  signature: j.string().optional(),
  publickey: j.string().optional(),
  tz: j.string().optional(),
  uilang: j.string().optional(),
})

const validBody = {
  email: 'user@example.com',
  pw: 'S3cretPassword!',
  deviceId: 'abc-123-def-456',
}
const invalidBody = { email: 'nope', pw: 'S3cretPassword!' }

const headers = {
  appver: '4.100.0',
  clientid: 'ios',
  deviceuuid: '8b7e2a1c-1111-2222-3333-444455556666',
  sessionid: 'FyDdMPYo4qDsBKUPWZDMgw|9wEMZbC1EPS8g4h1Zw',
  signature: 'a'.repeat(684),
  publickey: 'b'.repeat(2048),
  tz: 'Europe/Stockholm',
  uilang: 'en',
  'user-agent': 'NC/4.100.0 (iPhone; iOS 19.1)',
  accept: 'application/json',
  host: 'api.example.com',
}

function makeBodyReq(body: any): any {
  return { body: structuredClone(body), rawBody: Buffer.from(JSON.stringify(body)) }
}

const validReq = makeBodyReq(validBody)
const invalidReq = makeBodyReq(invalidBody)
const headersReq = { headers } as any

runBenchScript({
  name: 'redactPaths',
  fns: {
    'body valid, no redactPaths': () => {
      validateRequest.body(validReq, loginSchema)
    },
    'body valid, redactPaths [pw]': () => {
      validateRequest.body(validReq, loginSchema, { redactPaths: ['pw'] })
    },
    'headers valid, no redactPaths': () => {
      validateRequest.headers(headersReq, headersSchema)
    },
    'headers valid, redactPaths [3 paths]': () => {
      validateRequest.headers(headersReq, headersSchema, {
        redactPaths: ['sessionid', 'signature', 'publickey'],
      })
    },
    'body INVALID, redactPaths [pw]': () => {
      try {
        validateRequest.body(invalidReq, loginSchema, { redactPaths: ['pw'] })
      } catch {}
    },
  },
})
