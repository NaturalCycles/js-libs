import { _Memo } from '../decorators/memo.decorator.js'
import { isServerSide } from '../env.js'
import { _stringify } from '../string/stringify.js'
import type { Promisable } from '../types.js'

export interface AdminModeCfg {
  /**
   * Function (predicate) to detect if needed keys are pressed.
   *
   * @example
   * predicate: e => e.ctrlKey && e.key === 'L'
   *
   * @default
   * Detects Ctrl+Shift+L
   */
  predicate?: (e: KeyboardEvent) => boolean

  /**
   * Called when RedDot is clicked. Implies that AdminMode is enabled.
   */
  onRedDotClick?: () => any

  /**
   * Called when AdminMode was changed.
   */
  onChange?: (adminMode: boolean) => any

  /**
   * Called BEFORE entering AdminMode.
   * Serves as a predicate that can cancel entering AdminMode if false is returned.
   * Return true to allow.
   * Function is awaited before proceeding.
   */
  beforeEnter?: () => Promisable<boolean>

  /**
   * Called BEFORE exiting AdminMode.
   * Serves as a predicate that can cancel exiting AdminMode if false is returned.
   * Return true to allow.
   * Function is awaited before proceeding.
   */
  beforeExit?: () => Promisable<boolean>

  /**
   * @default true
   * If true - it will "persist" the adminMode state in LocalStorage
   */
  persistToLocalStorage?: boolean

  /**
   * The key for LocalStorage persistence.
   *
   * @default '__adminMode__'
   */
  localStorageKey?: string
}

const RED_DOT_ID = '__red-dot__'
const NOOP = (): void => {}

/**
 * @experimental
 *
 * Allows to listen for AdminMode keypress combination (Ctrl+Shift+L by default) to toggle AdminMode,
 * indicated by RedDot DOM element.
 *
 * todo: help with Authentication
 */
export class AdminService {
  constructor(cfg?: AdminModeCfg) {
    this.cfg = {
      predicate: e => e.ctrlKey && e.key === 'L',
      persistToLocalStorage: true,
      localStorageKey: '__adminMode__',
      onRedDotClick: NOOP,
      onChange: NOOP,
      beforeEnter: () => true,
      beforeExit: () => true,
      ...cfg,
    }
  }

  cfg: Required<AdminModeCfg>

  adminMode = false

  private listening = false

  /**
   * Start listening to keyboard events to toggle AdminMode when detected.
   */
  startListening(): void {
    if (this.listening || isServerSide()) return

    this.adminMode = !!localStorage.getItem(this.cfg.localStorageKey)

    if (this.adminMode) this.toggleRedDotVisibility()

    document.addEventListener('keydown', this.keydownListener.bind(this), { passive: true })

    this.listening = true
  }

  stopListening(): void {
    if (isServerSide()) return
    document.removeEventListener('keydown', this.keydownListener)
    this.listening = false
  }

  private async keydownListener(e: KeyboardEvent): Promise<void> {
    // console.log(e)
    if (!this.cfg.predicate(e)) return
    await this.toggleRedDot()
  }

  async toggleRedDot(): Promise<void> {
    try {
      const allow = await this.cfg[this.adminMode ? 'beforeExit' : 'beforeEnter']()
      if (!allow) return // no change
    } catch (err) {
      console.error(err)
      // ok to show alert to Admins, it's not user-facing
      alert(_stringify(err))
      return // treat as "not allowed"
    }

    this.adminMode = !this.adminMode

    this.toggleRedDotVisibility()

    if (this.cfg.persistToLocalStorage) {
      const { localStorageKey } = this.cfg
      if (this.adminMode) {
        localStorage.setItem(localStorageKey, '1')
      } else {
        localStorage.removeItem(localStorageKey)
      }
    }

    this.cfg.onChange(this.adminMode)
  }

  private toggleRedDotVisibility(): void {
    this.getRedDotElement().style.display = this.adminMode ? 'block' : 'none'
  }

  @_Memo()
  private getRedDotElement(): HTMLElement {
    const el = document.createElement('div')
    el.id = RED_DOT_ID
    el.style.cssText =
      'position:fixed;width:24px;height:24px;margin-top:-12px;background-color:red;opacity:0.5;top:50%;left:0;z-index:9999999;cursor:pointer;border-radius:0 3px 3px 0'
    el.addEventListener('click', () => this.cfg.onRedDotClick())
    document.body.append(el)
    return el
  }
}
