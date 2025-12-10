// Modified version of topbar:
// http://buunguyen.github.io/topbar
// oxlint-disable

export interface TopBarOptions {
  /**
   * @default true
   */
  autoRun?: boolean

  /**
   * @default 5
   */
  barThickness?: number

  barColors?: any
  shadowColor?: any

  /**
   * @default 10
   */
  shadowBlur?: number
}

const browser = typeof window !== 'undefined'

let canvas: any
let progressTimerId: any
let fadeTimerId: any
let currentProgress: any
let showing: any
const addEvent = (elem: any, type: any, handler: any) => {
  if (elem.addEventListener) elem.addEventListener(type, handler, false)
  else if (elem.attachEvent) elem.attachEvent('on' + type, handler)
  else elem['on' + type] = handler
}
const options = {
  autoRun: true,
  barThickness: 5,
  barColors: {
    '0': 'rgba(26,  188, 156, .9)',
    '.25': 'rgba(52,  152, 219, .9)',
    '.50': 'rgba(241, 196, 15,  .9)',
    '.75': 'rgba(230, 126, 34,  .9)',
    '1.0': 'rgba(211, 84,  0,   .9)',
  },
  shadowBlur: 10,
  shadowColor: 'rgba(0,   0,   0,   .6)',
}
const repaint = () => {
  canvas.width = window.innerWidth
  canvas.height = options.barThickness * 5 // need space for shadow

  const ctx = canvas.getContext('2d')
  ctx.shadowBlur = options.shadowBlur
  ctx.shadowColor = options.shadowColor

  const lineGradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
  for (const stop in options.barColors) {
    // @ts-expect-error
    lineGradient.addColorStop(stop, options.barColors[stop])
  }
  ctx.lineWidth = options.barThickness
  ctx.beginPath()
  ctx.moveTo(0, options.barThickness / 2)
  ctx.lineTo(Math.ceil(currentProgress * canvas.width), options.barThickness / 2)
  ctx.strokeStyle = lineGradient
  ctx.stroke()
}
const createCanvas = () => {
  canvas = document.createElement('canvas')
  canvas.ariaHidden = 'true'
  const style = canvas.style
  style.position = 'fixed'
  style.top = style.left = style.right = style.margin = style.padding = 0
  style.zIndex = 100001
  style.display = 'none'
  document.body.appendChild(canvas)
  addEvent(window, 'resize', repaint)
}

export const topbar = {
  config(opts: TopBarOptions) {
    for (const key in opts) {
      if (options.hasOwnProperty(key)) {
        // @ts-expect-error
        options[key] = opts[key]
      }
    }
  },
  set(show: boolean, opts?: TopBarOptions) {
    if (show) {
      topbar.show(opts)
    } else {
      topbar.hide()
    }
  },
  show(opts?: TopBarOptions) {
    if (!browser) return // ssr protection
    if (opts) topbar.config(opts)
    if (showing) return
    showing = true
    if (fadeTimerId !== null) {
      window.cancelAnimationFrame(fadeTimerId)
    }
    if (!canvas) createCanvas()
    canvas.style.opacity = 1
    canvas.style.display = 'block'
    topbar.progress(0)
    if (options.autoRun) {
      ;(function loop() {
        progressTimerId = window.requestAnimationFrame(loop)
        topbar.progress('+' + 0.05 * (1 - Math.sqrt(currentProgress)) ** 2)
      })()
    }
  },
  progress(to: number | string) {
    if (!browser) return // ssr protection
    if (typeof to === 'undefined') {
      return currentProgress
    }
    if (typeof to === 'string') {
      to = (to.includes('+') || to.includes('-') ? currentProgress : 0) + parseFloat(to)
    }
    currentProgress = (to as number) > 1 ? 1 : to
    repaint()
    return currentProgress
  },
  hide() {
    if (!showing || !browser) return
    showing = false
    if (progressTimerId != null) {
      window.cancelAnimationFrame(progressTimerId)
      progressTimerId = null
    }
    ;(function loop() {
      if (topbar.progress('+.1') >= 1) {
        canvas.style.opacity -= 0.05
        if (canvas.style.opacity <= 0.05) {
          canvas.style.display = 'none'
          fadeTimerId = null
          return
        }
      }
      fadeTimerId = window.requestAnimationFrame(loop)
    })()
  },
}
