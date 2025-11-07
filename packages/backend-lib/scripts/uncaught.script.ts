/*

pn tsx scripts/uncaught

 */

// oxlint-disable

process.on('uncaughtException', (err, origin) => {
  console.error('here', origin, err)
})

process.on('unhandledRejection', (reason, _promise) => {
  console.error('unhandledRejection:', reason)
  // console.error('Unhandled Rejection at:', promise, 'reason:', reason);
})

console.log('started')

run()

function run() {
  // @ts-expect-error
  nonEx()
}

Promise.resolve().then(() => {
  // @ts-expect-error
  nonEx()

  // intended tpyo
  ;(JSON as any).pasre('asdf')
})

console.log('never finished')
