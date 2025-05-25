import { _deepFreeze } from '@naturalcycles/js-lib'
import { nanoid } from '@naturalcycles/nodejs-lib'
import { describe, expect, test, vi } from 'vitest'
import { Scrubber } from './scrubber.js'
import type { ScrubberConfig, ScrubberFn, ScrubbersMap } from './scrubber.model.js'
import { saltedHashEmailScrubber, saltedHashScrubber } from './scrubbers.js'
import {
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

test('returns a single object when input is a single object', () => {
  const data = { pw: 'secret', name: 'Real Name' }
  const result = scrub(data)
  expect(result).toEqual({ pw: 'notsecret', name: 'Jane Doe' })
})

test('returns an array with one object when input is an array with one object', () => {
  const data = { pw: 'secret', name: 'Real Name' }
  const result = scrub([data])

  expect(result).toEqual([{ pw: 'notsecret', name: 'Jane Doe' }])
})

test('applies to more than a field', () => {
  const data = [{ pw: 'secret', name: 'Real Name' }]
  _deepFreeze(data) // Ensure data doesnt mutate
  const result = scrub(data)
  expect(result).toEqual([{ pw: 'notsecret', name: 'Jane Doe' }])
})

test('applies to nested fields (deep transverse, 2 levels)', () => {
  const data = [{ account: { pw: 'secret', name: 'Real Name' } }]
  _deepFreeze(data) // Ensure data doesnt mutate

  const result = scrub(data)
  expect(result).toEqual([{ account: { pw: 'notsecret', name: 'Jane Doe' } }])
})

test('applies to nested fields (deep transverse, 3 levels)', () => {
  const data = [{ object: { account: { pw: 'secret', name: 'Real Name' } } }]
  _deepFreeze(data) // Ensure data doesnt mutate

  const result = scrub(data)
  expect(result).toEqual([{ object: { account: { pw: 'notsecret', name: 'Jane Doe' } } }])
})

test('applies to nested arrays', () => {
  const obj1 = { pw: 'shouldChange', safe: 'shouldStay' }
  const obj2 = { name: 'personalInformation', safe2: 'isSafe' }
  const users = [{ users: [obj1, obj2] }]
  _deepFreeze(users)

  const result = scrub(users)
  expect(result[0]!['users'][0]).toEqual({ pw: 'notsecret', safe: 'shouldStay' })
  expect(result[0]!['users'][1]).toEqual({ name: 'Jane Doe', safe2: 'isSafe' })
  expect(Array.isArray(result[0]!['users'])).toBe(true) // makes sure we don't convert array to objects
})

test('keeps not modified fields', () => {
  const data = [{ safeField: 'keep', email: 'real@email.com' }]
  _deepFreeze(data) // Ensure data doesnt mutate

  const result = scrub(data, configEmailScrubberMock())
  expect(result).toEqual([{ safeField: 'keep', email: 'anonymized@email.com' }])
})

test('supports additional scrubbers', () => {
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

test('supports comma-separated fields in field name', () => {
  const data = [{ field1: 'orig1', field2: 'orig2' }]
  _deepFreeze(data) // Ensure data doesnt mutate

  const result = scrub(data, configMultiFieldMock())
  expect(result).toEqual([{ field1: 'modified', field2: 'modified' }])
})

test('returns empty array for empty arrays', () => {
  const result = scrub([])
  expect(result).toEqual([])
})

test('fails when scrubber from config is not found (even if not used)', () => {
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

  test.each([-1, true, false, undefined, '', 0, null, NaN])(
    'does not preserve "%s" if configuration is false',
    input => {
      const cfgWithPreserveDisabled: ScrubberConfig = { ...cfg, preserveFalsy: false }

      const scrubber = new Scrubber(cfgWithPreserveDisabled)
      const result = scrubber.scrub({ target: input })

      expect(result.target).toBeUndefined()
    },
  )

  test.each([false, undefined, '', 0, null, NaN])(
    'preserves "%s" if configuration is true',
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

  test('logs errors by default', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const scrubber = new Scrubber(cfg, { faultyScrubber })
    scrubber.scrub(object)

    expect(console.log).toMatchSnapshot()
  })

  test('re-throw error if enabled on config', () => {
    const cfgWithErrorsEnabled: ScrubberConfig = { ...cfg, throwOnError: true }

    const scrubber = new Scrubber(cfgWithErrorsEnabled, { faultyScrubber })

    expect(() => {
      scrubber.scrub(object)
    }).toThrowErrorMatchingInlineSnapshot(`[Error: ops]`)
  })
})

test('scrubs different types of data', () => {
  const result = scrub([
    {
      null: null,
      undefined, // eslint-disable-line id-blacklist
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

test('initializationVector is passed as param to scrubbers', () => {
  const mockScrubber = vi.fn(() => 'modified')
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

test('Ensure initializationVector is random and affects saltedHashScrubber', () => {
  const mockScrubber = vi.fn(saltedHashScrubber)
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
  expect(result1).not.toEqual(toBeSalted)
  expect(result1).not.toEqual(result2)
})

test('initializationVector passed to scrubber constructor is passed to scrubbers', () => {
  const mockScrubber = vi.fn(saltedHashScrubber)
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
  expect(mockScrubber).toHaveBeenCalledWith(toBeSalted, {
    initializationVector: expect.stringMatching(initializationVector),
  })
  const vector1 = mockScrubber.mock.calls[0]
  const result1 = mockScrubber.mock.results[0]

  const scrubber2 = new Scrubber(cfg, additionalScrubbers, undefined, initializationVector)
  scrubber2.scrub(data)
  const vector2 = mockScrubber.mock.calls[1]
  const result2 = mockScrubber.mock.results[1]

  expect(vector1).toEqual(vector2)
  expect(result1).not.toEqual(toBeSalted)
  expect(result1).toEqual(result2)
})

test('supplying an initializationVector in config should take precedence', () => {
  const configVector = '123'
  const mockScrubber = vi.fn(saltedHashScrubber)
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

test('supplying an initializationVector in config of saltedHashEmailScrubber should produce consistent results', () => {
  const configVector = '123'
  const domain = '@example.com.br'
  const mockScrubber = vi.fn(saltedHashEmailScrubber)
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
  expect(result).not.toEqual(data)
  const emailRes = result['email']
  expect(emailRes).toContain(domain)
  expect(emailRes).not.toContain(toBeSalted)
})

test('example (readme)', () => {
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
  const _newObject = scrubber.scrub(object)
})

test('Support scrubbing based on parent', () => {
  const data = { nested: { api: { key: 'notsosecret' }, encryption: { key: '123456' } } }
  const scrubber = new Scrubber(configParentScrubbersMock())
  const result = scrubber.scrub(data)

  expect(result).toEqual({
    nested: { api: { key: 'notsosecret' }, encryption: { key: 'replaced' } },
  })
})

test('Support scrubbing array based on parent', () => {
  const data = { nested: { encryption: [{ key: 'secret' }], second: [{ key: 'secret2' }] } }
  const scrubber = new Scrubber(configParentScrubbersMock())
  const result = scrubber.scrub(data)

  expect(result).toEqual({
    nested: { encryption: [{ key: 'replaced' }], second: [{ key: 'replaced' }] },
  })
})

test('Support scrubbing based on multi-level parent', () => {
  const data = { multi: { api: { secret: 'notsosecret' }, interim: { secret: '123456' } } }
  const scrubber = new Scrubber(configParentScrubbersMock())
  const result = scrubber.scrub(data)

  expect(result).toEqual({
    multi: { api: { secret: 'notsosecret' }, interim: { secret: 'replaced' } },
  })
})

test('Parent reference inside of array', () => {
  const data = { multi: { interim: [{ secret: '123456' }] } }
  const scrubber = new Scrubber(configParentScrubbersMock())
  const result = scrubber.scrub(data)

  expect(result).toEqual({
    multi: { interim: [{ secret: 'replaced' }] },
  })
})

test('Parent via passed root type', () => {
  const data = { key: '123456' }
  const scrubber = Scrubber.getScrubberForType('encryption', configParentScrubbersMock())
  const result = scrubber.scrub(data)

  expect(result).toEqual({ key: 'replaced' })
})

test('getScrubberSql', () => {
  const scrubber = new Scrubber(configStaticScrubbersMock())
  expect(scrubber.getScrubberSql('non-existing')).toBeUndefined()
  expect(scrubber.getScrubberSql('pw')).toMatchInlineSnapshot(`"'notsecret'"`)
  expect(scrubber.getScrubberSql('name')).toMatchInlineSnapshot(`"'Jane Doe'"`)
})

test('saltedHashSubstringScrubber should scrub substring values', () => {
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
