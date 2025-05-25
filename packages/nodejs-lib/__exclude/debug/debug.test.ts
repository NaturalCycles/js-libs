import { Debug } from './debug'

const log = Debug('nodejs-lib')

const obj = {
  a: 'a1',
  b: 'b1',
  n: 15,
  d: {
    ooo: null,
  },
}

const err = new Error('Im an error')

test('debug', () => {
  Debug.disable()
  expect(log.enabled).toBe(false)

  Debug.enable('abc')
  expect(log.enabled).toBe(false)

  Debug.enable('*')
  expect(log.enabled).toBe(true)

  log('hello log', obj)

  log(err)
})
