// Credit to (adopted from): https://github.com/sindresorhus/slugify/

export interface SlugifyOptions {
  /**
   * Default: `-`
   */
  separator?: string
  /**
   * Default: true
   */
  lowercase?: boolean
  /**
   * Default: true
   */
  decamelize?: boolean
  /**
   * Default: []
   */
  preserveCharacters?: string[]
}

export function _slugify(s: string, opt: SlugifyOptions = {}): string {
  opt = {
    separator: '-',
    lowercase: true,
    decamelize: true,
    preserveCharacters: [],
    ...opt,
  }

  if (opt.decamelize) {
    s = decamelize(s)
  }

  const patternSlug = buildPatternSlug(opt)

  if (opt.lowercase) {
    s = s.toLowerCase()
  }

  // based on https://stackoverflow.com/a/23633850/4919972
  // Combining Diacritical Marks
  // https://www.unicode.org/charts/PDF/U0300.pdf
  s = s.normalize('NFKD').replaceAll(/[\u0300-\u036F]/g, '')

  // Detect contractions/possessives by looking for any word followed by a `'t`
  // or `'s` in isolation and then remove it.
  s = s.replaceAll(/([a-zA-Z\d]+)'([ts])(\s|$)/g, '$1$2$3')

  s = s.replace(patternSlug, opt.separator!)
  s = s.replaceAll('\\', '')

  if (opt.separator) {
    s = removeMootSeparators(s, opt.separator)
  }

  return s
}

function buildPatternSlug(options: any): RegExp {
  let negationSetPattern = String.raw`a-z\d`
  negationSetPattern += options.lowercase ? '' : 'A-Z'

  if (options.preserveCharacters.length > 0) {
    for (const character of options.preserveCharacters) {
      if (character === options.separator) {
        throw new Error(
          `The separator character \`${options.separator}\` cannot be included in preserved characters: ${options.preserveCharacters}`,
        )
      }

      negationSetPattern += escapeStringRegexp(character)
    }
  }

  return new RegExp(`[^${negationSetPattern}]+`, 'g')
}

function removeMootSeparators(s: string, separator: string): string {
  const escapedSeparator = escapeStringRegexp(separator)

  return s
    .replaceAll(new RegExp(`${escapedSeparator}{2,}`, 'g'), separator)
    .replaceAll(new RegExp(`^${escapedSeparator}|${escapedSeparator}$`, 'g'), '')
}

function decamelize(s: string): string {
  return (
    s
      // Separate capitalized words.
      .replaceAll(/([A-Z]{2,})(\d+)/g, '$1 $2')
      .replaceAll(/([a-z\d]+)([A-Z]{2,})/g, '$1 $2')

      .replaceAll(/([a-z\d])([A-Z])/g, '$1 $2')
      // `[a-rt-z]` matches all lowercase characters except `s`.
      // This avoids matching plural acronyms like `APIs`.
      .replaceAll(/([A-Z]+)([A-Z][a-rt-z\d]+)/g, '$1 $2')
  )
}

// based on: https://github.com/sindresorhus/escape-string-regexp/
function escapeStringRegexp(s: string): string {
  // Escape characters with special meaning either inside or outside character sets.
  // Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
  // oxlint-disable-next-line unicorn/escape-case, unicorn/no-hex-escape
  return s.replaceAll(/[|\\{}()[\]^$+*?.]/g, String.raw`\$&`).replaceAll('-', String.raw`\x2d`)
}
