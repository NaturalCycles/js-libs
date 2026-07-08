import { _assert, AppError } from '@naturalcycles/js-lib/error'
import type { NumberOfBytes } from '@naturalcycles/js-lib/types'
import busboy from 'busboy'
import type { Busboy, FileInfo } from 'busboy'
import type { BackendRequest } from '../server/server.model.js'

/**
 * Parses a `multipart/form-data` request body (on top of `busboy`), populates `req.body` with the
 * form fields, and returns the requested files keyed by their form field name:
 *
 *     const { csv } = await getUploadedFiles(req, { files: ['csv'] })
 *     const { csv, avatar } = await getUploadedFiles(req, {
 *       files: ['csv'],            // required   -> UploadedFile
 *       optionalFiles: ['avatar'], // optional   -> UploadedFile | undefined
 *     })
 *
 * `files` are required: each is asserted to be present and non-empty (throws 400 otherwise).
 * `optionalFiles` are returned as `UploadedFile | undefined` — `undefined` when the field is
 * absent or empty (e.g. a blank file input), so "optional" is genuinely optional.
 *
 * Throws 413 as soon as ANY uploaded file exceeds `maxFileSize` bytes (default: 10 MB), aborting
 * the parse immediately without buffering the rest of the body.
 *
 * Meant to be called from inside a request handler, AFTER authentication — so an
 * unauthenticated/unauthorized request is rejected before its (potentially large) multipart body
 * is buffered into memory.
 */
export async function getUploadedFiles<
  const FILENAMES extends string = never,
  const OPTIONAL_FILENAMES extends string = never,
>(
  req: BackendRequest,
  opt: {
    files?: readonly FILENAMES[]
    optionalFiles?: readonly OPTIONAL_FILENAMES[]
    maxFileSize?: NumberOfBytes
  },
): Promise<Record<FILENAMES, UploadedFile> & Record<OPTIONAL_FILENAMES, UploadedFile | undefined>> {
  const { files: requiredNames = [], optionalFiles = [], maxFileSize = 10 * MB } = opt

  const uploadedFiles = await parseMultipart(req, maxFileSize)
  const result: Record<string, UploadedFile | undefined> = {}

  for (const name of requiredNames) {
    const file = uploadedFiles[name]
    _assert(file, `Uploaded file "${name}" is missing`, { backendResponseStatusCode: 400 })
    _assert(file.size > 0, `Uploaded file "${name}" is empty`, { backendResponseStatusCode: 400 })
    result[name] = file
  }

  for (const name of optionalFiles) {
    const file = uploadedFiles[name]
    // Absent or empty (e.g. a blank file input) is treated as "not provided".
    result[name] = file && file.size > 0 ? file : undefined
  }

  return result as Record<FILENAMES, UploadedFile> &
    Record<OPTIONAL_FILENAMES, UploadedFile | undefined>
}

/**
 * Streams the request through busboy, buffering each file into memory and collecting the form
 * fields onto `req.body`. Resolves with the uploaded files keyed by their form field name.
 *
 * Rejects (aborting the parse) the moment a file exceeds `maxFileSize`.
 */
async function parseMultipart(
  req: BackendRequest,
  maxFileSize: NumberOfBytes,
): Promise<Record<string, UploadedFile>> {
  return new Promise((resolve, reject) => {
    const files: Record<string, UploadedFile> = {}
    const body: Record<string, string> = {}

    let bb: Busboy
    try {
      bb = busboy({ headers: req.headers, limits: { fileSize: maxFileSize } })
    } catch {
      // Not a multipart request (or malformed Content-Type) — no files to parse
      resolve(files)
      return
    }

    bb.on('field', (name, value) => {
      body[name] = value
    })

    bb.on('file', (name: string, stream, info: FileInfo) => {
      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      // Abort as soon as the size limit is hit: stop feeding busboy and reject right away,
      // rather than buffering the whole over-limit body and reporting it at the end.
      stream.on('limit', () => {
        req.unpipe(bb)
        req.resume() // drain the remainder so the connection can close cleanly
        reject(
          new AppError(`Uploaded file "${name}" exceeds the size limit of ${maxFileSize} bytes`, {
            backendResponseStatusCode: 413,
          }),
        )
      })
      stream.on('close', () => {
        const data = Buffer.concat(chunks)
        files[name] = {
          name: info.filename,
          mimeType: info.mimeType,
          encoding: info.encoding,
          data,
          size: data.length,
        }
      })
    })

    bb.on('error', reject)
    bb.on('close', () => {
      req.body = body
      resolve(files)
    })

    req.pipe(bb)
  })
}

const MB = 1024 * 1024

/**
 * A single uploaded file, buffered in memory.
 */
export interface UploadedFile {
  /** Original filename from the client. */
  name: string
  /** Content-Type of the file part. */
  mimeType: string
  /** Content-Transfer-Encoding of the file part. */
  encoding: string
  /** File contents. */
  data: Buffer
  /** Size of `data` in bytes. */
  size: NumberOfBytes
}
