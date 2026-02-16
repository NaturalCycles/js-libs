import * as sentry from '@sentry/node-core/light'

sentry.init({
  // no config here
})

export { sentry }
