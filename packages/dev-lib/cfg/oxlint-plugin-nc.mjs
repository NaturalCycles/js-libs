const noAsUnknownAsRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow `as unknown as X` double-casts',
    },
    messages: {
      asUnknownAs: 'Avoid `as unknown as X` double-casts. Prefer using `any` if truly necessary.',
    },
    schema: [],
  },
  create(context) {
    return {
      TSAsExpression(node) {
        if (
          node.expression?.type === 'TSAsExpression' &&
          node.expression.typeAnnotation?.type === 'TSUnknownKeyword'
        ) {
          context.report({ node, messageId: 'asUnknownAs' })
        }
      },
    }
  },
}

const ncPlugin = {
  meta: {
    name: 'nc',
  },
  rules: {
    'no-as-unknown-as': noAsUnknownAsRule,
  },
}

export default ncPlugin
