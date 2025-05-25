import { Readable, Writable } from 'node:stream'
import { finished } from 'node:stream/promises'
import { pDelay } from '@naturalcycles/js-lib'
import { runScript, transformMapSimple } from '@naturalcycles/nodejs-lib'

runScript(async () => {
  const stream = Readable.from(gen())
    .on('error', err => {
      console.log('onError1', err)
      stream.emit('error', err)
    })
    .pipe(
      transformMapSimple(v => {
        // if (v === 'c') throw new Error('oopsie from transform')
        return v
      }),
    )
    .on('error', err => {
      console.log('onError2', err)
      stream.emit('error', err)
    })
    .pipe(
      new Writable({
        objectMode: true,
        write(v, _, cb) {
          console.log('writable: ' + v)
          if (v === 'c') {
            // cb(new Error('oopsie from writable'))
            throw new Error('oopsie from writable')
          }
          cb()
        },
      }),
    )
  // .pipe(writableForEach(v => {
  //   console.log('writable: ' + v)
  //   if (v === 'c') throw new Error('oopsie from writable')
  // }))

  try {
    await finished(stream)
  } catch (err) {
    console.log('finished with err', err)
  }

  console.log('okay')
})

async function* gen(): AsyncGenerator<string> {
  yield 'a'
  await pDelay(1000)
  yield 'b'
  await pDelay(1000)
  yield 'c'
  // throw new Error('oopsie daisie')
}
