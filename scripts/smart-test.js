#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { resolve, relative, join } from 'path'

/**
 * Smart test runner that can:
 * 1. Run all tests if no arguments provided
 * 2. Run specific test files by automatically detecting the package and adjusting the path
 *
 * Usage:
 * - `pnpm test` - runs all tests
 * - `pnpm test packages/js-lib/src/bot.test.ts` - runs specific test in js-lib package
 * - `pnpm test src/bot.test.ts` - if run from a package directory
 */

process.on('SIGINT', () => {
  console.log('☠️ Death to the process! ☠️')
  process.exit(1)
})

const args = process.argv.slice(2)

// If no arguments, run all tests
if (args.length === 0) {
  console.log('Running all tests...')
  execSync(`pnpm test:all`, { stdio: 'inherit' })
  process.exit(0)
}

// Parse file paths and determine which package(s) to test
const testFiles = args.filter(arg => !arg.startsWith('-'))
const otherArgs = args.filter(arg => arg.startsWith('-'))

if (testFiles.length === 0) {
  // Only flags provided, run all tests with those flags
  console.log('Running all tests with flags...')
  execSync(`pnpm --filter '@naturalcycles/*' run test ${otherArgs.join(' ')}`, { stdio: 'inherit' })
  process.exit(0)
}

// Group test files by package
const packageTests = new Map()
const workspaceRoot = process.cwd()

for (const testFile of testFiles) {
  const fullPath = resolve(testFile)
  const relativePath = relative(workspaceRoot, fullPath)

  // Check if it's in packages/ directory
  if (relativePath.startsWith('packages/')) {
    const pathParts = relativePath.split('/')
    const packageName = pathParts[1]
    const fileInPackage = pathParts.slice(2).join('/')

    // Verify the package exists
    const packageJsonPath = join(workspaceRoot, 'packages', packageName, 'package.json')
    if (!existsSync(packageJsonPath)) {
      console.error(`Package not found: packages/${packageName}`)
      process.exit(1)
    }

    // Read package.json to get the actual package name
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    const actualPackageName = packageJson.name

    if (!packageTests.has(actualPackageName)) {
      packageTests.set(actualPackageName, [])
    }
    packageTests.get(actualPackageName).push(fileInPackage)
  } else {
    console.error(`Test file must be in packages/ directory: ${testFile}`)
    process.exit(1)
  }
}

// Run tests for each package
for (const [packageName, files] of packageTests) {
  console.log(`Running tests in ${packageName} for files: ${files.join(', ')}`)

  const testArgs = [...files, ...otherArgs].join(' ')
  const command = `pnpm --filter ${packageName} run test ${testArgs}`

  try {
    execSync(command, { stdio: 'inherit' })
  } catch {
    console.error(`Tests failed in ${packageName}`)
    process.exit(1)
  }
}

console.log('All tests completed successfully!')
