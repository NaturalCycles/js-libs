import 'dotenv/config'
import { requireEnvKeys } from '@naturalcycles/nodejs-lib'
import { createAdminMiddleware } from '../../admin/adminMiddleware.js'
import { BaseAdminService } from '../../admin/base.admin.service.js'
import { FirebaseSharedService } from '../../admin/firebase.shared.service.js'

const { FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN } = requireEnvKeys(
  'FIREBASE_SERVICE_ACCOUNT_PATH',
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
)

export const firebaseService = new FirebaseSharedService({
  authDomain: FIREBASE_AUTH_DOMAIN,
  apiKey: FIREBASE_API_KEY,
  serviceAccount: FIREBASE_SERVICE_ACCOUNT_PATH,
})

class AdminService extends BaseAdminService {
  override async getEmailPermissions(_email?: string): Promise<Set<string> | undefined> {
    return new Set() // allow all
    // return // deny all
  }
}

// const firebaseAdmin
export const adminService = new AdminService(() => firebaseService.auth(), {
  // authEnabled: false,
})

export const reqAdmin = createAdminMiddleware(adminService)
