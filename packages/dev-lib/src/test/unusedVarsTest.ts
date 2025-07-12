import { runScript } from '@naturalcycles/nodejs-lib/runScript'

runScript(async () => {
  const usedLater = 1
  // Should be preserved, because of leading underscore
  const _notUsed = usedLater

  // 1. Uncomment these lines
  // 2. import things
  // 3. run `yarn eslint-all`
  // 4. ensure unused imports are removed: `red`, `_pick`
  // red('hello')

  const obj = { a: 'a', b: 'b' }
  // const picked = _pick(obj, ['a'])
  const _obj2 = obj

  // Uncommenting this should complain
  // const unused = 5
})
