import type { BackendErrorResponseObject } from '@naturalcycles/js-lib/error'
import { afterAll, expect, test } from 'vitest'
import { getDefaultRouter } from '../express/getDefaultRouter.js'
import { expressTestService } from '../testing/index.js'
import { getUploadedFiles } from './getUploadedFiles.js'

const router = getDefaultRouter()

router.put('/single', async (req, res) => {
  const { csv } = await getUploadedFiles(req, { files: ['csv'] })
  res.json({
    name: csv.name,
    size: csv.size,
    content: csv.data.toString('utf8'),
    body: req.body, // form fields are populated on req.body
  })
})

router.put('/multiple', async (req, res) => {
  const { a, b } = await getUploadedFiles(req, { files: ['a', 'b'] })
  res.json({ a: a.data.toString('utf8'), b: b.data.toString('utf8') })
})

router.put('/smallLimit', async (req, res) => {
  const { csv } = await getUploadedFiles(req, { files: ['csv'], maxFileSize: 1024 }) // 1 KB
  res.json({ name: csv.name })
})

router.put('/optional', async (req, res) => {
  const { csv, avatar } = await getUploadedFiles(req, {
    files: ['csv'],
    optionalFiles: ['avatar'],
  })
  res.json({ csv: csv.name, avatar: avatar?.name ?? null })
})

const app = await expressTestService.createAppFromResource(router)

afterAll(async () => {
  await app.close()
})

test('parses an uploaded file and populates req.body with form fields', async () => {
  const csvContent = 'a,b,c\n1,2,3'
  const form = new FormData()
  form.append('csv', new File([csvContent], 'test.csv', { type: 'text/csv' }))
  form.append('note', 'hello')

  const res = await app.put<{ name: string; size: number; content: string; body: unknown }>(
    'single',
    { form },
  )

  expect(res.name).toBe('test.csv')
  expect(res.content).toBe(csvContent)
  expect(res.size).toBe(Buffer.byteLength(csvContent))
  expect(res.body).toMatchObject({ note: 'hello' })
})

test('returns every requested file', async () => {
  const form = new FormData()
  form.append('a', new File(['aaa'], 'a.txt'))
  form.append('b', new File(['bbb'], 'b.txt'))

  const res = await app.put<{ a: string; b: string }>('multiple', { form })

  expect(res).toEqual({ a: 'aaa', b: 'bbb' })
})

test('throws 400 when a requested file is missing', async () => {
  const form = new FormData()
  form.append('note', 'no file here')

  const res = await app.put<BackendErrorResponseObject>('single', {
    form,
    throwHttpErrors: false,
  })

  expect(res.error.data.backendResponseStatusCode).toBe(400)
  expect(res.error.message).toContain('Uploaded file "csv" is missing')
})

test('throws 400 when a requested file is empty', async () => {
  const form = new FormData()
  form.append('csv', new File([], 'empty.csv', { type: 'text/csv' }))

  const res = await app.put<BackendErrorResponseObject>('single', {
    form,
    throwHttpErrors: false,
  })

  expect(res.error.data.backendResponseStatusCode).toBe(400)
  expect(res.error.message).toContain('Uploaded file "csv" is empty')
})

test('accepts a file within the size limit', async () => {
  const form = new FormData()
  form.append('csv', new File(['small'], 'small.csv', { type: 'text/csv' }))

  const res = await app.put<{ name: string }>('smallLimit', { form })

  expect(res.name).toBe('small.csv')
})

test('returns an optional file when present', async () => {
  const form = new FormData()
  form.append('csv', new File(['a,b'], 'test.csv', { type: 'text/csv' }))
  form.append('avatar', new File(['img'], 'me.png', { type: 'image/png' }))

  const res = await app.put<{ csv: string; avatar: string | null }>('optional', { form })

  expect(res).toEqual({ csv: 'test.csv', avatar: 'me.png' })
})

test('returns undefined for an absent optional file', async () => {
  const form = new FormData()
  form.append('csv', new File(['a,b'], 'test.csv', { type: 'text/csv' }))

  const res = await app.put<{ csv: string; avatar: string | null }>('optional', { form })

  expect(res).toEqual({ csv: 'test.csv', avatar: null })
})

test('treats an empty optional file as absent', async () => {
  const form = new FormData()
  form.append('csv', new File(['a,b'], 'test.csv', { type: 'text/csv' }))
  form.append('avatar', new File([], 'empty.png', { type: 'image/png' }))

  const res = await app.put<{ csv: string; avatar: string | null }>('optional', { form })

  expect(res).toEqual({ csv: 'test.csv', avatar: null })
})

test('throws 413 when a requested file exceeds the size limit', async () => {
  const form = new FormData()
  form.append('csv', new File(['x'.repeat(2000)], 'big.csv', { type: 'text/csv' }))

  const res = await app.put<BackendErrorResponseObject>('smallLimit', {
    form,
    throwHttpErrors: false,
  })

  expect(res.error.data.backendResponseStatusCode).toBe(413)
  expect(res.error.message).toContain('exceeds the size limit')
})
