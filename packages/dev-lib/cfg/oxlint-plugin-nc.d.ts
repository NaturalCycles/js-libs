import type { RuleTester } from 'oxlint/plugins-dev'

type Rule = Parameters<RuleTester['run']>[1]

declare const ncPlugin: {
  meta: { name: string }
  rules: { 'prefer-assert': Rule }
}

export default ncPlugin
