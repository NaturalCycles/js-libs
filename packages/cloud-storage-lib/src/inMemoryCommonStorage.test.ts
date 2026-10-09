import { describe, expect, test } from 'vitest'
import { InMemoryCommonStorage } from './inMemoryCommonStorage.js'
import { runCommonStorageTest } from './testing/commonStorageTest.js'

const storage = new InMemoryCommonStorage()

describe(`runCommonStorageTest`, async () => {
  await runCommonStorageTest(storage, 'TEST_BUCKET')
})

const bucket = 'b'
const content = Buffer.from('content')
const metadata = { hash: 'hash_1' }

test('getFileMetadata returns a copy of the metadata', async () => {
  const s = new InMemoryCommonStorage()
  const input = { ...metadata }
  await s.saveFile(bucket, 'a/1', content, { metadata: input })
  input.hash = 'we do not expect to read this back'

  const m = await s.getFileMetadata(bucket, 'a/1')
  m!.metadata['hash'] = 'we do not expect to read this back'

  expect(await s.getFileMetadata(bucket, 'a/1')).toEqual({ metadata, size: content.length })
})

test('uploadFile removes metadata', async () => {
  const s = new InMemoryCommonStorage()
  await s.saveFile(bucket, 'a/1', content, { metadata })
  await s.uploadFile(import.meta.filename, bucket, 'a/1')

  expect((await s.getFileMetadata(bucket, 'a/1'))!.metadata).toEqual({})
})

test('copyFile copies metadata', async () => {
  const s = new InMemoryCommonStorage()
  await s.saveFile(bucket, 'a/1', content, { metadata })
  await s.copyFile(bucket, 'a/1', 'a/2', 'b2')

  expect((await s.getFileMetadata(bucket, 'a/1'))!.metadata).toEqual(metadata)
  expect((await s.getFileMetadata('b2', 'a/2'))!.metadata).toEqual(metadata)
})

test('moveFile moves metadata', async () => {
  const s = new InMemoryCommonStorage()
  await s.saveFile(bucket, 'a/1', content, { metadata })
  await s.moveFile(bucket, 'a/1', 'a/2')

  expect(s.metadata[bucket]).toEqual({ 'a/2': metadata })
  expect((await s.getFileMetadata(bucket, 'a/2'))!.metadata).toEqual(metadata)
})

test('movePath moves metadata', async () => {
  const s = new InMemoryCommonStorage()
  await s.saveFile(bucket, 'a/1', content, { metadata })
  await s.saveFile(bucket, 'a/2', content)
  await s.movePath(bucket, 'a/', 'c/', 'b2')

  expect(s.metadata[bucket]).toEqual({})
  expect(s.metadata['b2']).toEqual({ 'c/1': metadata })
})

test('deleteFiles, deletePath and deletePaths remove metadata', async () => {
  const s = new InMemoryCommonStorage()
  await s.saveFile(bucket, 'a/1', content, { metadata })
  await s.saveFile(bucket, 'b/1', content, { metadata })
  await s.saveFile(bucket, 'c/1', content, { metadata })
  await s.saveFile(bucket, 'd/1', content, { metadata })

  await s.deleteFiles(bucket, ['a/1'])
  await s.deletePath(bucket, 'b/')
  await s.deletePaths(bucket, ['c/'])

  expect(s.metadata[bucket]).toEqual({ 'd/1': metadata })
})

test('combineFiles does not keep metadata', async () => {
  const s = new InMemoryCommonStorage()
  await s.saveFile(bucket, 'a/1', content, { metadata })
  await s.saveFile(bucket, 'a/2', content, { metadata })
  await s.saveFile(bucket, 'c/1', content, { metadata })
  await s.combineFiles(bucket, ['a/1', 'a/2'], 'c/1')

  expect(s.metadata[bucket]).toEqual({})
  expect(await s.getFileMetadata(bucket, 'c/1')).toEqual({
    metadata: {},
    size: content.length * 2,
  })
})
