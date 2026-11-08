// Should be uppercase, because e.g this browser issue: https://github.com/axios/axios/issues/26
// QUERY is like GET (safe and idempotent), but with a request body: https://datatracker.ietf.org/doc/draft-ietf-httpbis-safe-method-w-body/
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'QUERY'

export type HttpStatusFamily = 5 | 4 | 3 | 2 | 1

/**
 * Number, representing a valid Http status code (e.g 401, 500, etc)
 */
export type HttpStatusCode = number

export const HTTP_METHODS: readonly HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'QUERY',
]
