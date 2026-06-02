const noAsXAsRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow `as any as X` / `as unknown as X` double-casts',
    },
    messages: {
      asXAs:
        'Avoid `as {{intermediate}} as X` double-casts. Add a type annotation and use `as any` if truly necessary.',
    },
    schema: [],
  },
  create(context) {
    return {
      TSAsExpression(node) {
        const inner = node.expression
        if (inner?.type !== 'TSAsExpression') return

        const innerType = inner.typeAnnotation?.type
        if (innerType !== 'TSAnyKeyword' && innerType !== 'TSUnknownKeyword') return

        context.report({
          node,
          messageId: 'asXAs',
          data: { intermediate: innerType === 'TSAnyKeyword' ? 'any' : 'unknown' },
        })
      },
    }
  },
}

const ncPlugin = {
  meta: {
    name: 'nc',
  },
  rules: {
    'no-as-x-as': noAsXAsRule,
  },
}

export default ncPlugin
