import { _Memo } from '@naturalcycles/js-lib/decorators/memo.decorator.js'
import type { App, AppOptions, ServiceAccount } from 'firebase-admin/app'
import type { Auth } from 'firebase-admin/auth'
import type { Messaging } from 'firebase-admin/messaging'

export interface FirebaseSharedServiceCfg {
  /**
   * If undefined - will try to use credential.applicationDefault()
   * Can be ServiceAccount object or path to a json file (string)
   */
  serviceAccount?: ServiceAccount | string

  /**
   * Used in Firebase Auth.
   */
  authDomain: string

  /**
   * Used e.g in Firebase Auth to decrypt JWT auth tokens.
   */
  apiKey: string

  /**
   * @default 'GoogleAuthProvider'
   */
  adminAuthProvider?: string

  /**
   * Will be passed to .initializeApp()
   */
  opt?: AppOptions

  /**
   * Second argument to .initializeApp()
   * When you need more-than-one firebase instance
   */
  appName?: string
}

export class FirebaseSharedService {
  constructor(public cfg: FirebaseSharedServiceCfg) {}

  async init(): Promise<void> {
    await this.admin()
  }

  @_Memo()
  async admin(): Promise<App> {
    const { serviceAccount } = this.cfg

    // lazy loading
    const { initializeApp, cert, applicationDefault } = await import('firebase-admin/app')

    const credential = serviceAccount ? cert(serviceAccount) : applicationDefault()

    return initializeApp(
      {
        credential,
        ...this.cfg.opt,
      },
      this.cfg.appName,
    )
  }

  async auth(): Promise<Auth> {
    const app = await this.admin()
    const { getAuth } = await import('firebase-admin/auth')
    return getAuth(app)
  }

  async messaging(): Promise<Messaging> {
    const app = await this.admin()
    const { getMessaging } = await import('firebase-admin/messaging')
    return getMessaging(app)
  }
}
