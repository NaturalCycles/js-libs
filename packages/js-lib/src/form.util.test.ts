import { expect, it } from 'vitest'
import { formDataToObject, objectToFormData } from './form.util.js'
import type { AnyObject } from './types.js'

it('should convert an object to FormData and back, with values as strings', () => {
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
