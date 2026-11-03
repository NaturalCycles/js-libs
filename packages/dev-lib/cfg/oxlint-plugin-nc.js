const ASSERTABLE_ERRORS = new Set(['Error', 'AppError', 'AssertionError'])
const EQUALITY_OPERATORS = new Set(['===', '!==', '==', '!='])
// A condition that stays readable once negated; `!(a instanceof B && c)` does not
const UNASSERTABLE_TESTS = new Set([
  'LogicalExpression',
  'ConditionalExpression',
  'AssignmentExpression',
  'SequenceExpression',
])
// An inline callback in the condition (`items.some(item => ...)`) does not read as an assertion once negated
const FUNCTION_NODES = new Set(['ArrowFunctionExpression', 'FunctionExpression'])
// `_assert` builds its message and data before checking, so a call, await or interpolated message there
// would run on the happy path too (keep ids in the data bag), and a value the condition narrows
// (`if (!res.ok) throw new Error(res.error)`) no longer typechecks
const EVALUATED_ARGUMENTS = new Set([
  'CallExpression',
  'NewExpression',
  'AwaitExpression',
  'TaggedTemplateExpression',
  'YieldExpression',
  'UpdateExpression',
  'AssignmentExpression',
])
// Test files and test helpers throw plain errors on purpose (mocks, fakes). Checked here rather than in
// a shared `overrides` entry, because `defineOxlintConfig` lets a consumer's `overrides` replace it
const TEST_FILE_PATTERN = /\.(?:test\.tsx?|spec\.ts)$|\/(?:test|testing)\//

// No `fix`/`suggest`: dev-lib runs oxlint with --fix-dangerously, which would apply them and leave
// `_assert` unimported
const preferAssertRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer _assert over an if whose only statement throws an Error or AppError with a static message',
    },
    messages: {
      preferAssert:
        'Use _assert(condition, message, data) from @naturalcycles/js-lib/error instead of throwing in an if',
    },
  },
  create(context) {
    if (TEST_FILE_PATTERN.test(context.filename)) return {}

    return {
      IfStatement(node) {
        if (node.alternate || node.parent.type === 'IfStatement') return
        if (!isAssertableTest(node.test)) return

        const { consequent } = node
        const statement =
          consequent.type === 'BlockStatement' && consequent.body.length === 1
            ? consequent.body[0]
            : consequent
        if (statement?.type !== 'ThrowStatement') return

        const error = statement.argument
        if (
          error.type !== 'NewExpression' ||
          error.callee.type !== 'Identifier' ||
          !ASSERTABLE_ERRORS.has(error.callee.name) ||
          error.arguments.length > 2 ||
          error.arguments.some(argument => argument.type === 'SpreadElement') ||
          error.arguments.some(argument => containsEvaluation(argument))
        ) {
          return
        }
        const narrowed = referencedNames(node.test)
        if (error.arguments.some(argument => referencesAny(argument, narrowed))) return

        context.report({ node, messageId: 'preferAssert' })
      },
    }
  },
}

function isAssertableTest(test) {
  if (UNASSERTABLE_TESTS.has(test.type)) return false
  if (test.type === 'BinaryExpression' && !EQUALITY_OPERATORS.has(test.operator)) return false
  return !containsFunction(test)
}

function containsFunction(node) {
  return visit(node, child => FUNCTION_NODES.has(child.type))
}

function containsEvaluation(node) {
  return visit(
    node,
    child =>
      EVALUATED_ARGUMENTS.has(child.type) ||
      (child.type === 'TemplateLiteral' && child.expressions.length > 0),
  )
}

function referencedNames(node) {
  const names = new Set()
  visit(node, child => {
    if (child.type === 'Identifier') names.add(child.name)
    if (child.type === 'ThisExpression') names.add('this')
    return false
  })
  return names
}

function referencesAny(node, names) {
  return visit(node, child => {
    if (child.type === 'Identifier') return names.has(child.name)
    if (child.type === 'ThisExpression') return names.has('this')
    return false
  })
}

/**
 * Depth-first walk over the AST below `node`, skipping `parent` links and the names that are not
 * references: non-computed member properties and object keys. Stops at the first node `fn` returns
 * true for, and returns whether there was one.
 */
function visit(node, fn) {
  if (!node || typeof node !== 'object') return false
  if (Array.isArray(node)) return node.some(item => visit(item, fn))
  const { type } = node
  if (!type) return false
  if (fn(node)) return true
  for (const [key, child] of Object.entries(node)) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue
    if (key === 'property' && type === 'MemberExpression' && !node.computed) continue
    if (key === 'key' && type === 'Property' && !node.computed) continue
    if (visit(child, fn)) return true
  }
  return false
}

const ncPlugin = {
  meta: {
    name: 'nc',
  },
  rules: {
    'prefer-assert': preferAssertRule,
  },
}

export default ncPlugin
