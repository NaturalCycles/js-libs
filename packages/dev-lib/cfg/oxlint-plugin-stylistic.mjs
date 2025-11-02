const BLANK_LINE_PATTERN = /(?:\r?\n)[ \t]*(?:\r?\n)/
const FALLBACK_PADDING_OPTIONS = [
  { blankLine: 'always', prev: 'function', next: '*' },
  { blankLine: 'always', prev: '*', next: 'function' },
  { blankLine: 'always', prev: 'class', next: '*' },
  { blankLine: 'always', prev: '*', next: 'class' },
]

/**
 * Utility that unwraps export declarations so the underlying declaration
 * (function/class) can be inspected.
 */
function unwrapExported(node) {
  if (!node) return null
  if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
    return node.declaration || null
  }
  return node
}

function isFunctionLikeStatement(node) {
  const inner = unwrapExported(node)
  if (!inner) return false

  return inner.type === 'FunctionDeclaration'
}

function isFunctionOverloadStatement(node) {
  const inner = unwrapExported(node)
  if (!inner) return false

  return inner.type === 'TSDeclareFunction'
}

function isClassLikeStatement(node) {
  const inner = unwrapExported(node)
  if (!inner) return false

  return inner.type === 'ClassDeclaration'
}

function describeStatement(node) {
  if (!node) return 'statement'
  if (isFunctionLikeStatement(node)) return 'function declaration'
  if (isClassLikeStatement(node)) return 'class declaration'
  return 'statement'
}

function isMethodOverload(node) {
  if (!node) return false
  if (node.type !== 'MethodDefinition' && node.type !== 'TSAbstractMethodDefinition') return false
  return node.value && node.value.type === 'TSEmptyBodyFunctionExpression'
}

function hasBlankLineBetween(sourceCode, prevNode, nextNode) {
  if (!prevNode || !nextNode) return false
  if (!prevNode.range || !nextNode.range) return false
  if (prevNode.range[1] >= nextNode.range[0]) return false

  const between = sourceCode.text.slice(prevNode.range[1], nextNode.range[0])
  return BLANK_LINE_PATTERN.test(between)
}

function insertBlankLineBeforeNext(fixer, sourceCode, prevNode, nextNode) {
  if (!prevNode || !nextNode) return null
  if (!prevNode.range || !nextNode.range) return null
  if (prevNode.range[1] >= nextNode.range[0]) return null

  const commentsBetween = sourceCode
    .getCommentsBefore(nextNode)
    ?.filter(comment => comment.range && comment.range[0] >= prevNode.range[1])
    ?.sort((a, b) => a.range[0] - b.range[0])
  const insertionTarget =
    commentsBetween && commentsBetween.length > 0 ? commentsBetween[0].range[0] : nextNode.range[0]

  const between = sourceCode.text.slice(prevNode.range[1], insertionTarget)
  const hasLinebreak = /\r?\n/.test(between)
  const linebreak = sourceCode.text.includes('\r\n') ? '\r\n' : '\n'
  const text = hasLinebreak ? linebreak : linebreak + linebreak

  return fixer.insertTextBeforeRange([insertionTarget, insertionTarget], text)
}

function matchesSelector(selector, candidate) {
  if (selector == null) return false
  if (selector === '*') return true
  if (Array.isArray(selector)) return selector.some(item => matchesSelector(item, candidate))
  return selector === candidate
}

const paddingLineBetweenStatementsRule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Require a blank line between functions and classes and surrounding statements',
    },
    fixable: 'whitespace',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          blankLine: { enum: ['always'] },
          prev: { anyOf: [{ enum: ['*', 'function', 'class'] }, { type: 'array' }] },
          next: { anyOf: [{ enum: ['*', 'function', 'class'] }, { type: 'array' }] },
        },
        required: ['blankLine', 'prev', 'next'],
        additionalProperties: false,
      },
    },
    defaultOptions: [],
    messages: {
      expectedBlankLine: 'Expected blank line between {{prev}} and {{next}}.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode
    const options =
      Array.isArray(context.options) && context.options.length > 0
        ? context.options
        : FALLBACK_PADDING_OPTIONS

    const requiresBlankLine = {
      beforeFunction: false,
      afterFunction: false,
      beforeClass: false,
      afterClass: false,
    }

    for (const option of options) {
      if (!option || option.blankLine !== 'always') continue

      if (matchesSelector(option.prev, 'function') && matchesSelector(option.next, '*')) {
        requiresBlankLine.afterFunction = true
      }
      if (matchesSelector(option.prev, '*') && matchesSelector(option.next, 'function')) {
        requiresBlankLine.beforeFunction = true
      }
      if (matchesSelector(option.prev, 'class') && matchesSelector(option.next, '*')) {
        requiresBlankLine.afterClass = true
      }
      if (matchesSelector(option.prev, '*') && matchesSelector(option.next, 'class')) {
        requiresBlankLine.beforeClass = true
      }
    }

    const shouldCheckFunctions = requiresBlankLine.beforeFunction || requiresBlankLine.afterFunction
    const shouldCheckClasses = requiresBlankLine.beforeClass || requiresBlankLine.afterClass

    if (!shouldCheckFunctions && !shouldCheckClasses) {
      // Nothing to enforce, bail early.
      return {}
    }

    function needsBlankLine(prevNode, nextNode) {
      if (shouldCheckFunctions) {
        if (
          requiresBlankLine.afterFunction &&
          isFunctionLikeStatement(prevNode) &&
          !isFunctionOverloadStatement(nextNode)
        ) {
          return true
        }
        if (
          requiresBlankLine.beforeFunction &&
          isFunctionLikeStatement(nextNode) &&
          !isFunctionOverloadStatement(prevNode)
        ) {
          return true
        }
      }
      if (shouldCheckClasses) {
        if (requiresBlankLine.afterClass && isClassLikeStatement(prevNode)) return true
        if (requiresBlankLine.beforeClass && isClassLikeStatement(nextNode)) return true
      }
      return false
    }

    function checkStatements(statements) {
      if (!Array.isArray(statements) || statements.length < 2) return

      for (let i = 1; i < statements.length; i += 1) {
        const prevNode = statements[i - 1]
        const nextNode = statements[i]

        if (!prevNode || !nextNode) continue
        if (!needsBlankLine(prevNode, nextNode)) continue
        if (hasBlankLineBetween(sourceCode, prevNode, nextNode)) continue

        context.report({
          node: nextNode,
          messageId: 'expectedBlankLine',
          data: {
            prev: describeStatement(prevNode),
            next: describeStatement(nextNode),
          },
          fix(fixer) {
            return insertBlankLineBeforeNext(fixer, sourceCode, prevNode, nextNode)
          },
        })
      }
    }

    return {
      Program(node) {
        checkStatements(node.body)
      },
      BlockStatement(node) {
        checkStatements(node.body)
      },
      StaticBlock(node) {
        checkStatements(node.body)
      },
      SwitchCase(node) {
        checkStatements(node.consequent)
      },
    }
  },
}

function isSingleLine(node, sourceCode) {
  if (!node || !node.range) return false
  const start = sourceCode.getLocFromIndex(node.range[0])
  const endIndex = node.range[1] > node.range[0] ? node.range[1] - 1 : node.range[1]
  const end = sourceCode.getLocFromIndex(endIndex)
  return start.line === end.line
}

const linesBetweenClassMembersRule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Require blank lines between class members',
    },
    fixable: 'whitespace',
    schema: [
      { enum: ['always'] },
      {
        type: 'object',
        properties: {
          exceptAfterSingleLine: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: ['always', { exceptAfterSingleLine: false }],
    messages: {
      expectedBlankLine: 'Expected blank line between class members.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode
    const mode = context.options?.[0] || 'always'
    const exceptAfterSingleLine =
      context.options?.[1]?.exceptAfterSingleLine !== undefined
        ? Boolean(context.options[1].exceptAfterSingleLine)
        : true
    const exceptAfterOverload = true

    if (mode !== 'always') {
      return {}
    }

    function checkClassBody(body) {
      if (!Array.isArray(body) || body.length < 2) return

      const members = exceptAfterOverload ? body.filter(member => !isMethodOverload(member)) : body
      if (members.length < 2) return

      for (let i = 1; i < members.length; i += 1) {
        const prevElement = members[i - 1]
        const nextElement = members[i]
        if (!prevElement || !nextElement) continue

        if (exceptAfterSingleLine && isSingleLine(prevElement, sourceCode)) continue
        if (hasBlankLineBetween(sourceCode, prevElement, nextElement)) continue

        context.report({
          node: nextElement,
          messageId: 'expectedBlankLine',
          fix(fixer) {
            return insertBlankLineBeforeNext(fixer, sourceCode, prevElement, nextElement)
          },
        })
      }
    }

    return {
      ClassBody(node) {
        checkClassBody(node.body)
      },
    }
  },
}

const stylisticPlugin = {
  meta: {
    name: '@stylistic',
  },
  rules: {
    'padding-line-between-statements': paddingLineBetweenStatementsRule,
    'lines-between-class-members': linesBetweenClassMembersRule,
  },
}

export default stylisticPlugin
