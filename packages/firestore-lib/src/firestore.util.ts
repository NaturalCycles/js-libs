const SLASH = '_SLASH_'

export function escapeDocId(docId: string | number): string {
  if (typeof docId === 'number') return String(docId)
  return docId.replaceAll('/', SLASH)
}

export function unescapeDocId(docId: string): string {
  // if (typeof docId === 'number') return docId
  return docId.replaceAll(SLASH, '/')
}
