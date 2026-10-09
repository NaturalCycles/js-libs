import { _Memo, _memoized } from '@naturalcycles/js-lib/decorators'
import { _assert } from '@naturalcycles/js-lib/error'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import type { Auth, FirebaseAuthError } from 'firebase-admin/auth'
import { srcDir } from '../paths.cnst.js'
import type { BackendRequest, BackendRequestHandler } from '../server/server.model.js'
import type { FirebaseSharedServiceCfg } from './firebase.shared.service.js'

/**
 * Verifies Firebase Auth tokens.
 */
export class FirebaseAuthService {
  constructor(
    private loadFirebaseAuth: () => Promise<FirebaseTokenVerifier>,
    public cfg: FirebaseAuthServiceCfg,
  ) {}

  /**
   * Reads the configured cookie first, then the header.
   */
  getToken(req: BackendRequest): string | undefined {
    const { tokenCookie, tokenHeader } = this.cfg

    if (tokenCookie) {
      const token = req.cookies?.[tokenCookie]
      if (token) return token
    }

    if (tokenHeader) return req.header(tokenHeader)
  }

  /**
   * Returns undefined if there's no token, or it's expired.
   * Rejects on any other verification failure.
   */
  async getEmailByToken(token: string | undefined): Promise<string | undefined> {
    if (!token) return

    const auth = await this.getFirebaseAuth()
    try {
      const decodedToken = await auth.verifyIdToken(token)
      return decodedToken.email
    } catch (err) {
      if ((err as Partial<FirebaseAuthError> | undefined)?.hasCode?.('id-token-expired')) return
      throw err
    }
  }

  @_Memo()
  private async getFirebaseAuth(): Promise<FirebaseTokenVerifier> {
    return await this.loadFirebaseAuth()
  }

  /**
   * POST handler that stores the token from the `Authentication` header in `tokenCookie` (not validated).
   * `Authentication: logout` clears it. The bundled login.html posts to `/admin/login`.
   */
  getLoginHandler(): BackendRequestHandler {
    const { tokenCookie } = this.cfg
    _assert(tokenCookie, 'getLoginHandler requires tokenCookie to be configured')

    return async (req, res) => {
      const token = req.header('authentication')
      _assert(token, `401 Unauthenticated`, {
        userFriendly: true,
        backendResponseStatusCode: 401,
      })

      let maxAge = 1000 * 60 * 60 * 24 * 30 // 30 days

      if (token === 'logout') {
        // delete the cookie
        maxAge = 0
      }

      res
        .cookie(tokenCookie, token, {
          maxAge,
          sameSite: 'lax', // can be: none, lax, strict
          // comment these 2 lines to debug on localhost
          httpOnly: true,
          secure: true,
        })
        .status(204)
        .end()
    }
  }
}

/**
 * Serves login.html, configured for Firebase Auth.
 */
export function loginHtmlHandler(
  firebaseServiceCfg: FirebaseSharedServiceCfg,
): BackendRequestHandler {
  const {
    apiKey: firebaseApiKey,
    authDomain: firebaseAuthDomain,
    adminAuthProvider: firebaseAuthProvider = 'GoogleAuthProvider',
  } = firebaseServiceCfg

  return (_req, res) => {
    res.send(
      getLoginHtml({
        firebaseApiKey,
        firebaseAuthDomain,
        firebaseAuthProvider,
      }),
    )
  }
}

const getLoginHtml = _memoized((cfg: LoginHtmlCfg) => {
  return fs2
    .readText(`${srcDir}/admin/login.html`)
    .replaceAll('<%= firebaseApiKey %>', cfg.firebaseApiKey)
    .replaceAll('<%= firebaseAuthDomain %>', cfg.firebaseAuthDomain)
    .replaceAll('<%= firebaseAuthProvider %>', cfg.firebaseAuthProvider)
})

/**
 * The part of Firebase `Auth` that FirebaseAuthService uses.
 */
export type FirebaseTokenVerifier = Pick<Auth, 'verifyIdToken'>

export interface FirebaseAuthServiceCfg {
  /**
   * Read by `getToken`, set by `getLoginHandler`.
   */
  tokenCookie?: string

  tokenHeader?: string
}

interface LoginHtmlCfg {
  firebaseApiKey: string
  firebaseAuthDomain: string
  firebaseAuthProvider: string
}
