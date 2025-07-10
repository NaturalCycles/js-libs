import type { Readable } from 'node:stream'
import type { CommonLogger } from '@naturalcycles/js-lib/log'

export function pipelineClose(
  name: string,
  readableDownstream: Readable,
  sourceReadable: Readable | undefined,
  streamDone: Promise<void> | undefined,
  logger: CommonLogger,
): void {
  readableDownstream.push(null) // this closes the stream, so downstream Readable will receive `end` and won't write anything

  if (!sourceReadable) {
    logger.warn(`${name} sourceReadable is not provided, readable stream will not be stopped`)
  } else {
    logger.log(`${name} is calling readable.unpipe() to pause the stream`)
    sourceReadable.unpipe() // it is expected to pause the stream

    if (!streamDone) {
      logger.log(`${name} streamDone is not provided, will do readable.destroy right away`)
      sourceReadable.destroy()
    } else {
      void streamDone.then(() => {
        logger.log(`${name} streamDone, calling readable.destroy()`)
        sourceReadable.destroy() // this throws ERR_STREAM_PREMATURE_CLOSE
      })
    }
  }
}
