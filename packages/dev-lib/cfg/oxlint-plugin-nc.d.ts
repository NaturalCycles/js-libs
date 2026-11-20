import type { RuleTester } from 'oxlint/plugins-dev'

type Rule = Parameters<RuleTester['run']>[1]

declare const ncPlugin: {
  meta: { name: string }
  rules: {
    'no-singleton-self-reference': Rule
    'prefer-assert': Rule
    'prefer-env-destructuring': Rule
    'prefer-last': Rule
  }
}

export default ncPlugin
