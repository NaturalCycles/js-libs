import { requireEnvKeys } from '@naturalcycles/nodejs-lib'
import { describe } from 'vitest'
import { CloudStorage } from '../cloudStorage.js'
import type { GCPServiceAccount } from '../model.js'
import { runCommonStorageTest } from '../testing/commonStorageTest.js'

const { bucketName, GCP_SERVICE_ACCOUNT: serviceAccountStr } = requireEnvKeys(
  'bucketName',
  'GCP_SERVICE_ACCOUNT',
)
const serviceAccount: GCPServiceAccount = JSON.parse(serviceAccountStr)

const storage = await CloudStorage.createFromGCPServiceAccount(serviceAccount)

// const TEST_FOLDER = 'test/subdir'
//
// const TEST_ITEMS = _range(10).map(n => ({
//   id: `id_${n + 1}`,
//   n,
//   even: n % 2 === 0,
// }))
//
// const TEST_ITEMS2 = _range(10).map(n => ({
//   fileType: 2,
//   id: `id_${n + 1}`,
//   n,
//   even: n % 2 === 0,
// }))
//
// const TEST_ITEMS3 = _range(10).map(n => ({
//   fileType: 3,
//   id: `id_${n + 1}`,
//   n,
//   even: n % 2 === 0,
// }))
//
// const TEST_FILES: FileEntry[] = [TEST_ITEMS, TEST_ITEMS2, TEST_ITEMS3].map((obj, i) => ({
//   filePath: `${TEST_FOLDER}/file_${i + 1}.json`,
//   content: Buffer.from(JSON.stringify(obj)),
// }))

describe(`runCommonStorageTest`, async () => {
  await runCommonStorageTest(storage, bucketName)
})

/*
test('listFiles', async () => {
  let files = await storage.getFileNames(bucketName, '')
  console.log(files)

  await storage.deletePaths(bucketName, files)

  files = await storage.getFileNames(bucketName, '')
  expect(files).toEqual([])

  let exists = await storage.fileExists(bucketName, TEST_FILES.map(f => f.filePath))
  expect(exists).toEqual([])

  await storage.saveFiles(bucketName, TEST_FILES)

  files = await storage.getFileNames(bucketName, '')
  expect(files).toEqual(TEST_FILES.map(f => f.filePath))

  exists = await storage.fileExists(bucketName, TEST_FILES.map(f => f.filePath))
  expect(exists).toEqual(TEST_FILES.map(f => f.filePath))
})
*/
