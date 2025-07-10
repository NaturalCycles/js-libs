import { _Memo } from '@naturalcycles/js-lib/decorators'
import type { AppOptions, ServiceAccount } from 'firebase-admin'
import type FirebaseAdmin from 'firebase-admin'

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
  async admin(): Promise<FirebaseAdmin.app.App> {
    const { serviceAccount } = this.cfg

    // lazy loading
    const { default: admin } = await import('firebase-admin')

    const credential = serviceAccount
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault()

    return admin.initializeApp(
      {
        credential,
        ...this.cfg.opt,
      },
      this.cfg.appName,
    )
  }

  async auth(): Promise<FirebaseAdmin.auth.Auth> {
    const admin = await this.admin()
    return admin.auth()
  }
}
