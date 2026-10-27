import { afterAll, expect, it } from 'vitest'
import { FirebaseSharedService } from './firebase.shared.service.js'

const service = new FirebaseSharedService({
  apiKey: 'abc',
  authDomain: 'abc',
  appName: 'firebase-shared-service-test', // Unique name to avoid conflicts
})

afterAll(async () => {
  // Clean up Firebase app to avoid polluting other tests
  const { deleteApp } = await import('firebase-admin/app')
  await deleteApp(await service.admin())
})

it('should create the firebase admin app and auth', async () => {
  const admin = await service.admin()
  expect(typeof admin).toBe('object')
  const auth = await service.auth()
  expect(typeof auth.deleteUser).toBe('function')
})
