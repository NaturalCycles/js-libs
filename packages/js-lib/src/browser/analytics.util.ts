import { isServerSide } from '../index.js'
import { loadScript } from './script.util.js'

declare global {
  var dataLayer: any[]
  var gtag: (...args: any[]) => void
  var hj: (...args: any[]) => void
}

/**
 * Pass enabled = false to only init globalThis.gtag, but not load actual gtag script (e.g in dev mode).
 */
export async function loadGTag(gtagId: string, enabled = true): Promise<void> {
  if (isServerSide()) return

  globalThis.dataLayer ||= []
  globalThis.gtag ||= function gtag() {
    // biome-ignore lint/complexity/useArrowFunction: ok
    // biome-ignore lint/complexity/noArguments: ok
    globalThis.dataLayer.push(arguments)
  }
  globalThis.gtag('js', new Date())
  globalThis.gtag('config', gtagId)

  if (!enabled) return

  await loadScript(`https://www.googletagmanager.com/gtag/js?id=${gtagId}`)
}

export async function loadGTM(gtmId: string, enabled = true): Promise<void> {
  if (isServerSide()) return

  globalThis.dataLayer ||= []
  globalThis.dataLayer.push({
    'gtm.start': Date.now(),
    event: 'gtm.js',
  })

  if (!enabled) return

  await loadScript(`https://www.googletagmanager.com/gtm.js?id=${gtmId}`)
}

export function loadHotjar(hjid: number): void {
  if (isServerSide()) return

  /* eslint-disable */
  // prettier-ignore
  ;
  ;((h: any, o, t, j, a?: any, r?: any) => {
    h.hj =
      h.hj ||
      function hj() {
        // biome-ignore lint/complexity/noArguments: ok
        ;(h.hj.q = h.hj.q || []).push(arguments)
      }
    h._hjSettings = { hjid, hjsv: 6 }
    a = o.querySelectorAll('head')[0]
    r = o.createElement('script')
    r.async = 1
    r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv
    a.append(r)
  })(globalThis, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=')
  /* eslint-enable */
}
