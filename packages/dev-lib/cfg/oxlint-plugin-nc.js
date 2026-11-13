const ASSERTABLE_ERRORS = new Set(['Error', 'AppError', 'AssertionError'])
const EQUALITY_OPERATORS = new Set(['===', '!==', '==', '!='])
// A condition that stays readable once negated; `!(a ? b : c)` does not
const UNASSERTABLE_TESTS = new Set([
  'ConditionalExpression',
  'AssignmentExpression',
  'SequenceExpression',
])
// An inline callback in the condition (`items.some(item => ...)`) does not read as an assertion once negated
const FUNCTION_NODES = new Set(['ArrowFunctionExpression', 'FunctionExpression'])
// `_assert` builds its message and data before checking, so a call or await there would run on the
// happy path too, and a value the condition narrows (`if (!res.ok) throw new Error(res.error)`) no
// longer typechecks. Interpolating plain values into the message is cheap enough to allow
const EVALUATED_ARGUMENTS = new Set([
  'CallExpression',
  'NewExpression',
  'AwaitExpression',
  'TaggedTemplateExpression',
  'YieldExpression',
  'UpdateExpression',
  'AssignmentExpression',
  'SpreadElement',
])
// Test files and test helpers throw plain errors on purpose (mocks, fakes). Checked here rather than in
// a shared `overrides` entry, because `defineOxlintConfig` lets a consumer's `overrides` replace it
const TEST_FILE_PATTERN = /\.(?:test|spec)\.[cm]?[jt]sx?$|\/(?:test|testing)\//

// No `fix`/`suggest`: dev-lib runs oxlint with --fix-dangerously, which would apply them and leave
// `_assert` unimported
const preferAssertRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer _assert over an if whose only statement throws an Error or AppError with a message that is cheap to build',
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
          error.arguments.length > maxArguments(error.callee.name) ||
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

// A second `Error` argument is `{ cause }`, which `_assert` would store as data and lose as a cause
function maxArguments(errorName) {
  return errorName === 'Error' ? 1 : 2
}

function isAssertableTest(test) {
  return isAssertableCondition(test) && !containsFunction(test)
}

// `a && b && c` negates to a readable `!a || !b || !c`; mixing `&&` with `||` (or `??`) does not
function isAssertableCondition(test, operator) {
  if (UNASSERTABLE_TESTS.has(test.type)) return false
  if (test.type === 'BinaryExpression') return EQUALITY_OPERATORS.has(test.operator)
  if (test.type !== 'LogicalExpression') return true
  if (test.operator === '??' || (operator && test.operator !== operator)) return false
  return (
    isAssertableCondition(test.left, test.operator) &&
    isAssertableCondition(test.right, test.operator)
  )
}

function containsFunction(node) {
  return visit(node, child => FUNCTION_NODES.has(child.type))
}

function containsEvaluation(node) {
  return visit(node, child => EVALUATED_ARGUMENTS.has(child.type))
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

const preferLastRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer _last / _lastOrUndefined over array.at(-1), array[array.length - 1] and array.slice(-1)[0]',
    },
    messages: {
      preferLast:
        'Use _last(array), or _lastOrUndefined(array) when it can be empty, from @naturalcycles/js-lib/array',
    },
  },
  create(context) {
    return {
      // `array.at(-1)`
      CallExpression(node) {
        if (!isMethodCall(node, 'at') || !isMinusOne(node.arguments[0])) return
        if (isStringLiteral(node.callee.object) || containsOptional(node)) return
        context.report({ node, messageId: 'preferLast' })
      },
      MemberExpression(node) {
        if (!node.computed || isWriteTarget(node) || containsOptional(node)) return
        const { object, property } = node
        // `array[array.length - 1]`
        const lastIndex =
          property.type === 'BinaryExpression' &&
          property.operator === '-' &&
          isNumber(property.right, 1) &&
          isLengthOf(property.left, object)
        // `array.slice(-1)[0]`
        const lastSlice =
          isNumber(property, 0) && isMethodCall(object, 'slice') && isMinusOne(object.arguments[0])
        if (lastIndex || lastSlice) context.report({ node, messageId: 'preferLast' })
      },
    }
  },
}

const preferEnvDestructuringRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer `const { MY_VAR } = process.env` over reading process.env.MY_VAR or process.env["MY_VAR"]',
    },
    messages: {
      preferEnvDestructuring: 'Destructure the variable instead: const { {{name}} } = process.env',
    },
  },
  create(context) {
    // Tests set, restore and assert on single variables, where the member access reads better
    if (TEST_FILE_PATTERN.test(context.filename)) return {}

    return {
      MemberExpression(node) {
        if (!isProcessEnv(node.object) || node.optional || isWriteTarget(node)) return
        const name = staticKey(node)
        // Only a name that can be destructured as is; `process.env[key]` and `npm_config_user-agent` stay
        if (!name || !IDENTIFIER_PATTERN.test(name)) return
        context.report({ node, messageId: 'preferEnvDestructuring', data: { name } })
      },
    }
  },
}

const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/

// Not `process?.env` (nor `process.env?.X`): an optional chain guards code that also runs where
// `process` does not exist, and a destructuring would throw there
function isProcessEnv(node) {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    !node.optional &&
    node.object.type === 'Identifier' &&
    node.object.name === 'process' &&
    node.property.name === 'env'
  )
}

function staticKey(node) {
  if (!node.computed) return node.property.name
  return typeof node.property.value === 'string' ? node.property.value : undefined
}

// Assigned to, updated or deleted: `x[i] = 1`, `x[i]++`, `delete x[i]`
function isWriteTarget(node) {
  const { parent } = node
  return (
    (parent.type === 'AssignmentExpression' && parent.left === node) ||
    parent.type === 'UpdateExpression' ||
    (parent.type === 'UnaryExpression' && parent.operator === 'delete')
  )
}

function isMethodCall(node, name) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.name === name &&
    node.arguments.length === 1
  )
}

function isNumber(node, value) {
  return node?.type === 'Literal' && node.value === value
}

function isMinusOne(node) {
  return node?.type === 'UnaryExpression' && node.operator === '-' && isNumber(node.argument, 1)
}

function isStringLiteral(node) {
  return (
    node.type === 'TemplateLiteral' || (node.type === 'Literal' && typeof node.value === 'string')
  )
}

// `a?.b.at(-1)` is undefined when `a` is, which `_lastOrUndefined(a?.b)` does not accept
function containsOptional(node) {
  return visit(node, child => child.optional === true)
}

function isLengthOf(node, array) {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.name === 'length' &&
    isSameReference(node.object, array)
  )
}

// The same variable or property path (`a`, `this.a`, `a.b.c`) on both sides, nothing that is evaluated
function isSameReference(a, b) {
  if (a.type !== b.type) return false
  if (a.type === 'Identifier') return a.name === b.name
  if (a.type === 'ThisExpression') return true
  return (
    a.type === 'MemberExpression' &&
    !a.computed &&
    !b.computed &&
    a.property.name === b.property.name &&
    isSameReference(a.object, b.object)
  )
}

const ncPlugin = {
  meta: {
    name: 'nc',
  },
  rules: {
    'prefer-assert': preferAssertRule,
    'prefer-env-destructuring': preferEnvDestructuringRule,
    'prefer-last': preferLastRule,
  },
}

export default ncPlugin
