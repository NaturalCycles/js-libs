import 'dotenv/config'
console.log('root release.config.js is loaded!')

/** @type {import('semantic-release').Options} */
export default {
  // release from main and the usual pre‑release branches
  branches: [
    'main',
    { name: 'next', prerelease: true },
    { name: 'beta', prerelease: true },
    { name: 'alpha', prerelease: true },
  ],

  /** Make every workspace package its own independent release */
  // https://github.com/pmowrer/semantic-release-monorepo
  extends: ['semantic-release-monorepo'],

  plugins: [
    ['@semantic-release/commit-analyzer'],
    ['@semantic-release/release-notes-generator'],
    // ['@semantic-release/changelog'], // let's skip changelog, as github releases can be used instead
    // https://github.com/autoclouddev/semantic-release-pnpm
    // ['semantic-release-pnpm'], // uses `pnpm publish`
    '@semantic-release/npm',
    // let's use github instead
    // ['@semantic-release/git', { assets: ['CHANGELOG.md', 'package.json', 'pnpm-lock.yaml'] }],
    ['@semantic-release/github'], // GitHub Release + PR/issue comments
  ],
}
