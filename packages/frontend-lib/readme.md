## @naturalcycles/frontend-lib

> Bundled frontend libraries

[![npm](https://img.shields.io/npm/v/@naturalcycles/frontend-lib/latest.svg)](https://www.npmjs.com/package/@naturalcycles/frontend-lib)

One self-contained bundle per feature, in `bundle/`, to be loaded from a CDN as
`<script type="module" async>`. Consumers with their own bundler use the package exports instead.

### Analytics client on a page

The stub is inline and synchronous, so nothing is lost while the bundle downloads. `init()` drains
it, replaying each call under the timestamp it was made at.

The stub carries every method of the real client, so a page never has to check whether it has
loaded. Only `track` and `identify` can be replayed; the rest have nothing to act on yet and warn.

```html
<script>
  {
    const tooEarly = name => () => console.warn(`[analytics] ${name}() before the client loaded`)

    globalThis.analyticsClient = {
      q: [],
      track(...args) {
        this.q.push({ method: 'track', args, ts: Date.now() })
      },
      identify(...args) {
        this.q.push({ method: 'identify', args, ts: Date.now() })
      },
      init: tooEarly('init'),
      reset: tooEarly('reset'),
      flushNow: tooEarly('flushNow'),
      destroy: tooEarly('destroy'),
      onEvent: () => {
        tooEarly('onEvent')()
        return () => {} // the unsubscribe the real onEvent returns
      },
    }
  }
</script>

<script type="module" async>
  import { AnalyticsClient } from 'https://cdn.jsdelivr.net/npm/@naturalcycles/frontend-lib/bundle/analyticsClient.js'

  const analyticsClient = new AnalyticsClient({
    url: 'https://api.example.com/web/e',
    clientId: 10,
    identity: { persistence: 'cookie', persistenceKey: 'analyticsId' },
  })
  analyticsClient.init()

  // Calls from here on go straight to the client
  Object.assign(globalThis, { analyticsClient })
</script>
```

Track from anywhere on the page, before or after the bundle has loaded:

```js
globalThis.analyticsClient.track('Click', { element: 'cta' })
```

### Autocapturing pageviews

An SPA changes the url without reloading, so there is no event to listen to. Patch both history
methods, and keep `popstate` for back/forward. Safe to run before the bundle has loaded - the stub
records these like any other call.

```js
const { pushState, replaceState } = globalThis.history

function trackPageView() {
  globalThis.analyticsClient.track('PageView', { path: globalThis.location.pathname })
}

globalThis.history.pushState = function (...args) {
  pushState.apply(this, args)
  trackPageView()
}
globalThis.history.replaceState = function (...args) {
  replaceState.apply(this, args)
  trackPageView()
}
globalThis.addEventListener('popstate', trackPageView)

trackPageView() // the pageview of the landing url, which no navigation fires
```

### Credits

The analytics client is a clean-room reimplementation whose design, persisted-identity format and
default property names originate from [mixpanel-browser](https://github.com/mixpanel/mixpanel-js),
Copyright Mixpanel, Inc., licensed under the
[Apache License 2.0](https://github.com/mixpanel/mixpanel-js/blob/master/LICENSE).
