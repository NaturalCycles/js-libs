import type { ScrubberConfig } from '../scrubber.model.js'

export function configStaticScrubbersMock(): ScrubberConfig {
  return {
    fields: {
      pw: {
        scrubber: 'staticScrubber',
        params: {
          replacement: 'notsecret',
        },
      },
      name: {
        scrubber: 'staticScrubber',
        params: {
          replacement: 'Jane Doe',
        },
      },
    },
    preserveFalsy: false,
  }
}

export function configMultiFieldMock(): ScrubberConfig {
  return {
    fields: {
      'field1, field2': {
        scrubber: 'staticScrubber',
        params: {
          replacement: 'modified',
        },
      },
    },
    preserveFalsy: false,
  }
}

export function configEmailScrubberMock(): ScrubberConfig {
  return {
    fields: {
      email: {
        scrubber: 'staticScrubber',
        params: {
          replacement: 'anonymized@email.com',
        },
      },
    },
    preserveFalsy: false,
  }
}

export function configParentScrubbersMock(): ScrubberConfig {
  return {
    fields: {
      'multi.interim.secret': {
        scrubber: 'staticScrubber',
        params: {
          replacement: 'replaced',
        },
      },
      'encryption.key, second.key': {
        scrubber: 'staticScrubber',
        params: {
          replacement: 'replaced',
        },
      },
    },
    preserveFalsy: false,
  }
}

export function configCatchAllScrubbersMock(): ScrubberConfig {
  return {
    fields: {
      name: {
        scrubber: 'staticScrubber',
        params: {
          replacement: 'Jane Doe',
        },
      },
      'HardwareDevice.name': {
        scrubber: 'excludeScrubber',
      },
      'Account.profile.name': {
        scrubber: 'staticScrubber',
        params: {
          replacement: 'more specific',
        },
      },
      'profile.name': {
        scrubber: 'staticScrubber',
        params: {
          replacement: 'less specific',
        },
      },
    },
    preserveFalsy: false,
  }
}

export function configInvalidScrubberMock(): ScrubberConfig {
  return {
    fields: {
      email: {
        scrubber: 'nonExistingScrubber',
      },
    },
    preserveFalsy: false,
  }
}
