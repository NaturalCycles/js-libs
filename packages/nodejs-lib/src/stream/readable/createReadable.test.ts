import { Readable } from 'node:stream'
import { pDelay } from '@naturalcycles/js-lib/promise'
import { expect, it } from 'vitest'
import { Pipeline } from '../pipeline.js'
import { createReadableFromAsync } from './createReadable.js'

it('should pass the items of an asynchronously created Readable through', async () => {
  const readable = createReadableFromAsync(async () => {
    await pDelay(1)
    return Readable.from([1, 2, 3])
  })

  expect(await Pipeline.from(readable).toArray()).toEqual([1, 2, 3])
})

it('should reject, and not crash, when fn rejects before the consumer is attached', async () => {
  const readable = createReadableFromAsync<number>(async () => {
    throw new Error('fn failure')
  })

  // fn rejects during this delay, while nothing listens to the Readable
  await pDelay(10)

  await expect(Pipeline.from(readable).toArray()).rejects.toThrow('fn failure')
})

it('should reject, and not crash, when the source fails before the consumer is attached', async () => {
  const readable = createReadableFromAsync<number>(async () => {
    return new Readable({
      read() {
        this.destroy(new Error('source failure'))
      },
    })
  })

  // The source fails during this delay, while nothing listens to the Readable
  await pDelay(10)

  await expect(Pipeline.from(readable).toArray()).rejects.toThrow('source failure')
})
