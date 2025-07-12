import { _expectedErrorString, pExpectedError } from '@naturalcycles/js-lib/error'
import { _stringify } from '@naturalcycles/js-lib/string/stringify.js'
import { expect, test } from 'vitest'
import { exec2, SpawnError } from './exec2.js'

test('spawn ok', () => {
  exec2.spawn('git status')
  // no error
})

test('spawn error', () => {
  const err = _expectedErrorString(() => exec2.spawn('git stat'))
  expect(err).toMatchInlineSnapshot(`"Error: spawn exited with code 1: git stat"`)
})

test('exec ok', () => {
  const s = exec2.exec('git version')
  expect(s.startsWith('git version')).toBe(true)
})

test('exec error', () => {
  const err = _expectedErrorString(() => exec2.exec('git stat'))
  expect(err).toMatchInlineSnapshot(`"Error: exec exited with code 1: git stat"`)
})

test('spawnAsync ok', async () => {
  await exec2.spawnAsync('git version')
  // no error
})

test('spawnAsync error', async () => {
  const err = await pExpectedError(exec2.spawnAsync('git stat'), Error)
  expect(_stringify(err)).toMatchInlineSnapshot(`"Error: spawnAsync exited with code 1: git stat"`)
})

test('spawnAsyncAndReturn ok', async () => {
  const s = await exec2.spawnAsyncAndReturn('git version')
  expect(s.exitCode).toBe(0)
  expect(s.stderr).toBe('')
  expect(s.stdout.startsWith('git version')).toBe(true)
})

test('spawnAsyncAndReturn error with throw', async () => {
  const err = await pExpectedError(exec2.spawnAsyncAndReturn('git stat'), SpawnError)
  expect(_stringify(err)).toMatchInlineSnapshot(
    `"SpawnError: spawnAsyncAndReturn exited with code 1: git stat"`,
  )
  expect(err.data.exitCode).toBe(1)
  expect(err.data.stdout).toBe('')
  expect(err.data.stderr).toMatchInlineSnapshot(`
"git: 'stat' is not a git command. See 'git --help'.

The most similar commands are
	status
	stage
	stash"
`)
})

test('spawnAsyncAndReturn error without throw', async () => {
  const { exitCode, stdout, stderr } = await exec2.spawnAsyncAndReturn('git stat', {
    throwOnNonZeroCode: false,
  })
  expect(exitCode).toBe(1)
  expect(stdout).toBe('')
  expect(stderr).toMatchInlineSnapshot(`
"git: 'stat' is not a git command. See 'git --help'.

The most similar commands are
	status
	stage
	stash"
`)
})
