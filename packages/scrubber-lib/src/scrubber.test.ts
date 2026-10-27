import { _deepFreeze } from '@naturalcycles/js-lib/object'
import { nanoid } from '@naturalcycles/nodejs-lib'
import { describe, expect, it, vi } from 'vitest'
import { Scrubber } from './scrubber.js'
import type { ScrubberConfig, ScrubberFn, ScrubbersMap } from './scrubber.model.js'
import { saltedHashEmailScrubber, saltedHashScrubber } from './scrubbers.js'
import {
  configCatchAllScrubbersMock,
  configEmailScrubberMock,
  configInvalidScrubberMock,
  configMultiFieldMock,
  configParentScrubbersMock,
  configStaticScrubbersMock,
} from './test/scrubber.mock.js'

// Convenient method for initializing object and scrubbing
function scrub<T>(
  data: T,
  cfg: ScrubberConfig = configStaticScrubbersMock(),
  additionalScrubbersImpl?: ScrubbersMap,
): T {
  const scrubber = new Scrubber(cfg, additionalScrubbersImpl)
  return scrubber.scrub(data)
}

it('should scrub a single object and return an object', () => {
  const data = { pw: 'secret', name: 'Real Name' }
  const result = scrub(data)
  expect(result).toEqual({ pw: 'notsecret', name: 'Jane Doe' })
})

it('should scrub an array of one object without mutating it and return an array', () => {
  const data = [{ pw: 'secret', name: 'Real Name' }]
  _deepFreeze(data) // Ensure data doesnt mutate

  const result = scrub(data)
  expect(result).toEqual([{ pw: 'notsecret', name: 'Jane Doe' }])
})

it('should scrub fields nested two levels deep', () => {
  const data = [{ account: { pw: 'secret', name: 'Real Name' } }]
  _deepFreeze(data) // Ensure data doesnt mutate

  const result = scrub(data)
  expect(result).toEqual([{ account: { pw: 'notsecret', name: 'Jane Doe' } }])
})

it('should scrub fields nested three levels deep', () => {
  const data = [{ object: { account: { pw: 'secret', name: 'Real Name' } } }]
  _deepFreeze(data) // Ensure data doesnt mutate

  const result = scrub(data)
  expect(result).toEqual([{ object: { account: { pw: 'notsecret', name: 'Jane Doe' } } }])
})

it('should scrub objects inside a nested array and keep it an array', () => {
  const obj1 = { pw: 'shouldChange', safe: 'shouldStay' }
  const obj2 = { name: 'personalInformation', safe2: 'isSafe' }
  const users = [{ users: [obj1, obj2] }]
  _deepFreeze(users)

  const result = scrub(users)
  expect(result[0]!.users[0]).toEqual({ pw: 'notsecret', safe: 'shouldStay' })
  expect(result[0]!.users[1]).toEqual({ name: 'Jane Doe', safe2: 'isSafe' })
  expect(Array.isArray(result[0]!.users)).toBe(true) // makes sure we don't convert array to objects
})

it('should keep fields without a scrubber unchanged', () => {
  const data = [{ safeField: 'keep', email: 'real@email.com' }]
  _deepFreeze(data) // Ensure data doesnt mutate

  const result = scrub(data, configEmailScrubberMock())
  expect(result).toEqual([{ safeField: 'keep', email: 'anonymized@email.com' }])
})

it('should apply an additional scrubber passed to the constructor', () => {
  const mockScrubber: ScrubberFn = () => 'modified'
  const additionalScrubbers: ScrubbersMap = { aNewScrubber: mockScrubber }

  const cfg: ScrubberConfig = {
    fields: {
      target: {
        scrubber: 'aNewScrubber',
      },
    },
  }

  const data = [{ target: 'original' }]
  _deepFreeze(data) // Ensure data doesnt mutate

  const result = scrub(data, cfg, additionalScrubbers)
  expect(result).toEqual([{ target: 'modified' }])
})

it('should apply the scrubber to each field of a comma-separated field name', () => {
  const data = [{ field1: 'orig1', field2: 'orig2' }]
  _deepFreeze(data) // Ensure data doesnt mutate

  const result = scrub(data, configMultiFieldMock())
  expect(result).toEqual([{ field1: 'modified', field2: 'modified' }])
})

it('should return an empty array for an empty array', () => {
  const result = scrub([])
  expect(result).toEqual([])
})

it('should throw when a configured scrubber does not exist, even if unused', () => {
  expect(() => {
    scrub([], configInvalidScrubberMock())
  }).toThrowErrorMatchingInlineSnapshot(`[AssertionError: nonExistingScrubber not found]`)
})

describe('falsy values handling', () => {
  const cfg: ScrubberConfig = {
    fields: {
      target: {
        scrubber: 'undefinedScrubber',
      },
    },
  }

  it.each([-1, true, false, undefined, '', 0, null, NaN])(
    'should scrub "%s" when preserveFalsy is false',
    input => {
      const cfgWithPreserveDisabled: ScrubberConfig = { ...cfg, preserveFalsy: false }

      const scrubber = new Scrubber(cfgWithPreserveDisabled)
      const result = scrubber.scrub({ target: input })

      expect(result.target).toBeUndefined()
    },
  )

  it.each([false, undefined, '', 0, null, NaN])(
    'should keep "%s" when preserveFalsy is true',
    input => {
      const cfgWithPreserveEnabled: ScrubberConfig = { ...cfg, preserveFalsy: true }

      const scrubber = new Scrubber(cfgWithPreserveEnabled)
      const result = scrubber.scrub({ target: input })

      expect(result.target).toEqual(input)
    },
  )
})

describe('error handling', () => {
  const faultyScrubber: ScrubberFn = () => {
    throw new Error('ops')
  }

  const cfg: ScrubberConfig = {
    fields: {
      target: {
        scrubber: 'faultyScrubber',
      },
    },
  }

  const object = { target: 'foo' }

  it('should log scrubber errors by default', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const scrubber = new Scrubber(cfg, { faultyScrubber })
    scrubber.scrub(object)

    expect(console.log).toMatchSnapshot()
  })

  it('should rethrow scrubber errors when throwOnError is set', () => {
    const cfgWithErrorsEnabled: ScrubberConfig = { ...cfg, throwOnError: true }

    const scrubber = new Scrubber(cfgWithErrorsEnabled, { faultyScrubber })

    expect(() => {
      scrubber.scrub(object)
    }).toThrowErrorMatchingInlineSnapshot(`[Error: ops]`)
  })
})

it('should match the snapshot for mixed value types', () => {
  const result = scrub([
    {
      null: null,
      undefined,
      array: [1, 2, { pw: 'secret' }],
      function: () => 1,
      symbol: Symbol(42),
      map: new Map([['b', 'c']]),
      set: new Set([1, 2, 3, 4]),
      buffer: Buffer.from('data'),
      date: new Date(0),
    },
  ])

  expect(result).toMatchSnapshot()
})

it('should pass the same initializationVector to scrubbers on every scrub', () => {
  const mockScrubber = vi.fn<ScrubberFn>(() => 'modified')
  const additionalScrubbers: ScrubbersMap = { aNewScrubber: mockScrubber }

  const cfg: ScrubberConfig = {
    fields: {
      pw: {
        scrubber: 'aNewScrubber',
      },
    },
  }

  const data = [{ pw: 'secret' }]
  _deepFreeze(data) // Ensure data doesnt mutate

  const scrubber = new Scrubber(cfg, additionalScrubbers)
  scrubber.scrub(data)

  expect(mockScrubber).toHaveBeenLastCalledWith('secret', {
    initializationVector: expect.any(String),
  })
  scrubber.scrub(data)

  const vector1 = mockScrubber.mock.calls[0]
  const vector2 = mockScrubber.mock.calls[1]

  expect(vector1).toEqual(vector2)
})

it('should use a different initializationVector and hash per scrubber instance', () => {
  const mockScrubber = vi.fn<typeof saltedHashScrubber>(saltedHashScrubber)
  const additionalScrubbers: ScrubbersMap = { aNewScrubber: mockScrubber }

  const cfg: ScrubberConfig = {
    fields: {
      id: {
        scrubber: 'aNewScrubber',
      },
    },
  }

  const toBeSalted = 'id1'
  const data = [{ id: toBeSalted }]
  const scrubber1 = new Scrubber(cfg, additionalScrubbers)
  scrubber1.scrub(data)
  expect(mockScrubber).toHaveBeenCalledWith(toBeSalted, {
    initializationVector: expect.any(String),
  })
  const vector1 = mockScrubber.mock.calls[0]
  const result1 = mockScrubber.mock.results[0]

  const scrubber2 = new Scrubber(cfg, additionalScrubbers) // New vector to be generated by constructor
  scrubber2.scrub(data)
  const vector2 = mockScrubber.mock.calls[1]
  const result2 = mockScrubber.mock.results[1]

  expect(vector1).not.toEqual(vector2)
  expect(result1!.value).not.toBe(toBeSalted)
  expect(result1!.value).not.toBe(result2!.value)
})

it('should pass the constructor initializationVector to scrubbers, giving stable hashes', () => {
  const mockScrubber = vi.fn<typeof saltedHashScrubber>(saltedHashScrubber)
  const additionalScrubbers: ScrubbersMap = { aNewScrubber: mockScrubber }

  const cfg: ScrubberConfig = {
    fields: {
      id: {
        scrubber: 'aNewScrubber',
      },
    },
  }

  const toBeSalted = 'id1'
  const data = [{ id: toBeSalted }]
  const initializationVector = nanoid()
  const scrubber1 = new Scrubber(cfg, additionalScrubbers, undefined, initializationVector)
  scrubber1.scrub(data)
  expect(mockScrubber).toHaveBeenCalledWith(toBeSalted, { initializationVector })
  const vector1 = mockScrubber.mock.calls[0]
  const result1 = mockScrubber.mock.results[0]

  const scrubber2 = new Scrubber(cfg, additionalScrubbers, undefined, initializationVector)
  scrubber2.scrub(data)
  const vector2 = mockScrubber.mock.calls[1]
  const result2 = mockScrubber.mock.results[1]

  expect(vector1).toEqual(vector2)
  expect(result1!.value).not.toBe(toBeSalted)
  expect(result1!.value).toBe(result2!.value)
})

it('should prefer the config initializationVector over the constructor one', () => {
  const configVector = '123'
  const mockScrubber = vi.fn<typeof saltedHashScrubber>(saltedHashScrubber)
  const additionalScrubbers: ScrubbersMap = { aNewScrubber: mockScrubber }

  const cfg: ScrubberConfig = {
    fields: {
      id: {
        scrubber: 'aNewScrubber',
        params: {
          initializationVector: configVector,
        },
      },
    },
  }

  const toBeSalted = 'id1'
  const data = [{ id: toBeSalted }]
  const initializationVector = nanoid()
  const scrubber1 = new Scrubber(cfg, additionalScrubbers, undefined, initializationVector)
  const result = scrubber1.scrub(data)

  // Result should stay the same since 123 is used as init vector
  expect(result.pop()).toMatchSnapshot()
})

it('should hash the email with the config initializationVector and append the domain', () => {
  const configVector = '123'
  const domain = '@example.com.br'
  const mockScrubber = vi.fn<typeof saltedHashEmailScrubber>(saltedHashEmailScrubber)
  const additionalScrubbers: ScrubbersMap = { aNewScrubber: mockScrubber }

  const cfg: ScrubberConfig = {
    fields: {
      email: {
        scrubber: 'aNewScrubber',
        params: {
          initializationVector: configVector,
          domain,
        },
      },
    },
  }

  const toBeSalted = 'test@email.se'
  const data = [{ email: toBeSalted }]
  const scrubber1 = new Scrubber(cfg, additionalScrubbers)
  const result = scrubber1.scrub(data).pop() as any

  // Result should stay the same since config vector is static
  expect(result).toMatchSnapshot()
  const emailRes = result['email']
  expect(emailRes).toContain(domain)
  expect(emailRes).not.toContain(toBeSalted)
})

it('should scrub the readme example', () => {
  const cfg: ScrubberConfig = {
    fields: {
      name: {
        scrubber: 'staticScrubber',
        params: {
          replacement: 'John Doe',
        },
      },
      password: {
        scrubber: 'undefinedScrubber',
      },
    },
    throwOnError: true,
  }

  const object = { name: 'Real Name', password: 'secret' }

  const scrubber = new Scrubber(cfg)
  expect(scrubber.scrub(object)).toEqual({ name: 'John Doe', password: undefined })
})

it('should scrub a field only under the configured parent', () => {
  const data = { nested: { api: { key: 'notsosecret' }, encryption: { key: '123456' } } }
  const scrubber = new Scrubber(configParentScrubbersMock())
  const result = scrubber.scrub(data)

  expect(result).toEqual({
    nested: { api: { key: 'notsosecret' }, encryption: { key: 'replaced' } },
  })
})

it('should scrub array items under the configured parents', () => {
  const data = { nested: { encryption: [{ key: 'secret' }], second: [{ key: 'secret2' }] } }
  const scrubber = new Scrubber(configParentScrubbersMock())
  const result = scrubber.scrub(data)

  expect(result).toEqual({
    nested: { encryption: [{ key: 'replaced' }], second: [{ key: 'replaced' }] },
  })
})

it('should scrub a field only under the configured multi-level parent', () => {
  const data = { multi: { api: { secret: 'notsosecret' }, interim: { secret: '123456' } } }
  const scrubber = new Scrubber(configParentScrubbersMock())
  const result = scrubber.scrub(data)

  expect(result).toEqual({
    multi: { api: { secret: 'notsosecret' }, interim: { secret: 'replaced' } },
  })
})

it('should match a multi-level parent through an array', () => {
  const data = { multi: { interim: [{ secret: '123456' }] } }
  const scrubber = new Scrubber(configParentScrubbersMock())
  const result = scrubber.scrub(data)

  expect(result).toEqual({
    multi: { interim: [{ secret: 'replaced' }] },
  })
})

it('should match the parent given as root type', () => {
  const data = { key: '123456' }
  const scrubber = Scrubber.getScrubberForType('encryption', configParentScrubbersMock())
  const result = scrubber.scrub(data)

  expect(result).toEqual({ key: 'replaced' })
})

it('should prefer a qualified key over the catch-all bare key', () => {
  const data = { Account: { name: 'Real Name' }, HardwareDevice: { name: 'NC Thermometer1' } }
  const scrubber = new Scrubber(configCatchAllScrubbersMock())

  expect(scrubber.scrub(data)).toEqual({
    Account: { name: 'Jane Doe' },
    HardwareDevice: { name: 'NC Thermometer1' },
  })
})

it('should apply an exclusion to array items via the root type', () => {
  const data = [{ name: 'NC Thermometer1' }, { name: 'NC Thermometer2' }]
  const scrubber = Scrubber.getScrubberForType('HardwareDevice', configCatchAllScrubbersMock())

  expect(scrubber.scrub(data)).toEqual(data)
})

it('should keep traversing nested values below an excluded field', () => {
  const data = { HardwareDevice: { name: 'NC Thermometer1', pairedTo: { name: 'Real Name' } } }
  const scrubber = new Scrubber(configCatchAllScrubbersMock())

  expect(scrubber.scrub(data)).toEqual({
    HardwareDevice: { name: 'NC Thermometer1', pairedTo: { name: 'Jane Doe' } },
  })
})

it('should prefer the longest matching parent path', () => {
  const data = { Account: { profile: { name: 'Real Name' } }, PAccount: { profile: { name: 'x' } } }
  const scrubber = new Scrubber(configCatchAllScrubbersMock())

  expect(scrubber.scrub(data)).toEqual({
    Account: { profile: { name: 'more specific' } },
    PAccount: { profile: { name: 'less specific' } },
  })
})

it('should resolve a qualified field name most-specific-first in getScrubberSql', () => {
  const scrubber = new Scrubber(configCatchAllScrubbersMock())

  expect(scrubber.getScrubberSql('HardwareDevice.name')).toBeUndefined()
  expect(scrubber.getScrubberSql('name')).toMatchInlineSnapshot(`"'Jane Doe'"`)
  expect(scrubber.getScrubberSql('Account.name')).toMatchInlineSnapshot(`"'Jane Doe'"`)
  expect(scrubber.getScrubberSql('Account.profile.name')).toMatchInlineSnapshot(`"'more specific'"`)
  expect(scrubber.getScrubberSql('Account.non-existing')).toBeUndefined()
})

it('should return the SQL of configured fields and undefined for others in getScrubberSql', () => {
  const scrubber = new Scrubber(configStaticScrubbersMock())
  expect(scrubber.getScrubberSql('non-existing')).toBeUndefined()
  expect(scrubber.getScrubberSql('pw')).toMatchInlineSnapshot(`"'notsecret'"`)
  expect(scrubber.getScrubberSql('name')).toMatchInlineSnapshot(`"'Jane Doe'"`)
})

it('should hash each matching substring in the configured fields', () => {
  const data = {
    Data: [
      { id: '01' },
      { id: 'ab02cd' },
      { id: 'ab03cd', foo: '03' },
      { id: 'ab04cd', foo: 'ab04cd' },
      { id: '01\n02\n03' },
    ],
  }

  const result = scrub(data, {
    fields: {
      'id,foo': {
        scrubber: 'saltedHashSubstringScrubber',
        params: {
          regex: [String.raw`\d\d`],
          initializationVector: 'initializationVector',
        },
      },
    },
  })

  expect(result).toMatchInlineSnapshot(`
{
  "Data": [
    {
      "id": "42bb960e91b4abf82bd6bdcc8e49cb405678ba5655a1cdc0210a4089cf2980f9",
    },
    {
      "id": "ab5365d6a9320a362fe52dbd54a20bc58eaa775d548e20dccf58d761882201381acd",
    },
    {
      "foo": "bb722ef61aa727e4a61aab72132badd39388204e9c6d8653c90a313a581bd622",
      "id": "abbb722ef61aa727e4a61aab72132badd39388204e9c6d8653c90a313a581bd622cd",
    },
    {
      "foo": "ab67fe825923d446fa7cd7711e66345232ab15a4bdc1cc9590b975353be70ad616cd",
      "id": "ab67fe825923d446fa7cd7711e66345232ab15a4bdc1cc9590b975353be70ad616cd",
    },
    {
      "id": "42bb960e91b4abf82bd6bdcc8e49cb405678ba5655a1cdc0210a4089cf2980f9
5365d6a9320a362fe52dbd54a20bc58eaa775d548e20dccf58d761882201381a
bb722ef61aa727e4a61aab72132badd39388204e9c6d8653c90a313a581bd622",
    },
  ],
}
`)
})
