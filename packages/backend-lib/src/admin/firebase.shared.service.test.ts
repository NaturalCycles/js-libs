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

it('should create the firebase app once, under the configured name, and auth for it', async () => {
  const app = await service.admin()
  expect(app.name).toBe('firebase-shared-service-test')
  expect(await service.admin()).toBe(app)

  const auth = await service.auth()
  expect(auth.app).toBe(app)
})
