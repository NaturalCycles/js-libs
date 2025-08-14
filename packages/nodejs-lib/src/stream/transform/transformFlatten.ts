import { Transform } from 'node:stream'
import type { TransformTyped } from '../stream.model.js'

export function transformFlatten<T>(): TransformTyped<T[], T> {
  return new Transform({
    objectMode: true,
    transform(chunk: T[], _, cb) {
      if (!Array.isArray(chunk)) {
        // As a safety precaution, to not crash the pipeline - push as is
        this.push(chunk)
      } else {
        for (const item of chunk) {
          this.push(item)
        }
      }
      cb() // acknowledge
    },
  })
}
