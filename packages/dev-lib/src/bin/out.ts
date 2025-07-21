#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

try {
  spawnSync('pnpm', ['outdated'], {
    encoding: 'utf8',
    stdio: 'inherit',
    shell: false,
  })
} catch {
  // suppress the error, since `pnpm outdated`
  // returns non-zero exit code if any outdated deps are found,
  // but in fact it's perfectly fine and not an error exit
}
