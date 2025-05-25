import type { StringMap } from '@naturalcycles/js-lib'
import { _range, _substringAfterLast, pMap } from '@naturalcycles/js-lib'
import type { CommonStorage, FileEntry } from '../commonStorage.js'

const TEST_FOLDER = 'test/subdir'

const TEST_ITEMS = _range(10).map(n => ({
  id: `id_${n + 1}`,
  n,
  even: n % 2 === 0,
}))

const TEST_ITEMS2 = _range(10).map(n => ({
  fileType: 2,
  id: `id_${n + 1}`,
  n,
  even: n % 2 === 0,
}))

const TEST_ITEMS3 = _range(10).map(n => ({
  fileType: 3,
  id: `id_${n + 1}`,
  n,
  even: n % 2 === 0,
}))

const TEST_FILES: FileEntry[] = [TEST_ITEMS, TEST_ITEMS2, TEST_ITEMS3].map((obj, i) => ({
  filePath: `${TEST_FOLDER}/file_${i + 1}.json`,
  content: Buffer.from(JSON.stringify(obj)),
}))

/**
 * This test suite must be idempotent.
 */
export async function runCommonStorageTest(
  storage: CommonStorage,
  bucketName: string,
): Promise<void> {
  // this is because vitest cannot be "required" from cjs
  const { test, expect } = await import('vitest')

  // test('createBucket', async () => {
  //   await storage.createBucket(bucketName)
  // })

  test('ping', async () => {
    await storage.ping(bucketName)
  })

  // test('listBuckets', async () => {
  //   const buckets = await storage.getBucketNames()
  //   console.log(buckets)
  // })
  //
  // test('streamBuckets', async () => {
  //   const buckets = await readableToArray(storage.getBucketNamesStream())
  //   console.log(buckets)
  // })

  test('prepare: clear bucket', async () => {
    await pMap(
      TEST_FILES.map(f => f.filePath),
      async filePath => await storage.deletePath(bucketName, filePath),
    )
  })

  // test('listFileNames on root should return empty', async () => {
  //   const fileNames = await storage.getFileNames(bucketName)
  //   expect(fileNames).toEqual([])
  // })

  test(`listFileNames on ${TEST_FOLDER} should return empty`, async () => {
    const fileNames = await storage.getFileNames(bucketName, { prefix: TEST_FOLDER })
    expect(fileNames).toEqual([])
  })

  test(`streamFileNames on ${TEST_FOLDER} should return empty`, async () => {
    const fileNames = await storage
      .getFileNamesStream(bucketName, { prefix: TEST_FOLDER })
      .toArray()
    expect(fileNames).toEqual([])
  })

  test(`exists should return empty array`, async () => {
    await pMap(TEST_FILES, async f => {
      const exists = await storage.fileExists(bucketName, f.filePath)
      expect(exists).toBe(false)
    })
  })

  test(`saveFiles, then listFileNames, streamFileNames and getFiles should return just saved files`, async () => {
    const testFilesMap = Object.fromEntries(TEST_FILES.map(f => [f.filePath, f.content]))

    // It's done in the same test to ensure "strong consistency"
    await pMap(TEST_FILES, async f => await storage.saveFile(bucketName, f.filePath, f.content))

    const fileNamesShort = await storage.getFileNames(bucketName, {
      prefix: TEST_FOLDER,
      fullPaths: false,
    })
    expect(fileNamesShort.sort()).toEqual(
      TEST_FILES.map(f => _substringAfterLast(f.filePath, '/')).sort(),
    )

    const fileNames = await storage.getFileNames(bucketName, { prefix: TEST_FOLDER })
    expect(fileNames.sort()).toEqual(TEST_FILES.map(f => f.filePath).sort())

    const streamedFileNames = await storage
      .getFileNamesStream(bucketName, { prefix: TEST_FOLDER })
      .toArray()
    expect(streamedFileNames.sort()).toEqual(TEST_FILES.map(f => f.filePath).sort())

    const filesMap: StringMap<Buffer> = {}

    await pMap(fileNames, async filePath => {
      filesMap[filePath] = (await storage.getFile(bucketName, filePath))!
    })

    expect(filesMap).toEqual(testFilesMap)

    await pMap(fileNames, async filePath => {
      const exists = await storage.fileExists(bucketName, filePath)
      expect(exists).toBe(true)
    })
  })

  test('cleanup', async () => {
    await storage.deletePath(bucketName, TEST_FOLDER)
  })

  // Cannot update access control for an object when uniform bucket-level access is enabled. Read more at https://cloud.google.com/storage/docs/uniform-bucket-level-access
  /*
  test(`get/set FilesVisibility`, async () => {
    const fileNames = TEST_FILES.map(f => f.filePath)

    let map = await storage.getFilesVisibility(bucketName, fileNames)
    expect(map).toEqual(Object.fromEntries(fileNames.map(f => [f, false])))

    await storage.setFilesVisibility(bucketName, fileNames, true)

    map = await storage.getFilesVisibility(bucketName, fileNames)
    expect(map).toEqual(Object.fromEntries(fileNames.map(f => [f, true])))

    await storage.setFilesVisibility(bucketName, fileNames, false)

    map = await storage.getFilesVisibility(bucketName, fileNames)
    expect(map).toEqual(Object.fromEntries(fileNames.map(f => [f, false])))
  })
   */
}
