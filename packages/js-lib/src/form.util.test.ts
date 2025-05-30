import { expect, test } from 'vitest'
import { formDataToObject, objectToFormData } from './form.util.js'
import type { AnyObject } from './types.js'

test('objectToFormData', () => {
  let o: AnyObject = {}
  let fd = objectToFormData(o)
  expect(fd).toBeInstanceOf(FormData)
  let o2 = formDataToObject(fd)
  expect(o2).toEqual({})

  o = {
    a: 'a',
    b: 2,
  }
  fd = objectToFormData(o)
  o2 = formDataToObject(fd)
  // expect(o2).toEqual(o)
  expect(o2).toEqual({
    ...o,
    b: '2', // everything is a string now
  })
})
