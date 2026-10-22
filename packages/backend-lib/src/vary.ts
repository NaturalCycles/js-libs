import type { ServerResponse } from 'node:http'

/**
 * Adds the field (header name) to the response's Vary header, unless it's already there
 * (case-insensitive). Vary: * stays as is, and adding '*' replaces the whole header with '*'.
 *
 * Vendored (and modernized) from the `vary` package.
 */
export function vary(res: ServerResponse, field: string): void {
  const header = res.getHeader('Vary')
  const value = Array.isArray(header) ? header.join(', ') : String(header ?? '')
  if (!value) {
    res.setHeader('Vary', field)
    return
  }

  const fields = new Set(
    value
      .toLowerCase()
      .split(',')
      .map(f => f.trim()),
  )

  if (field === '*' || fields.has('*')) {
    if (value !== '*') res.setHeader('Vary', '*')
  } else if (!fields.has(field.toLowerCase())) {
    res.setHeader('Vary', `${value}, ${field}`)
  }
}
