/**
 * Returns true if the given Content-Type (parameters, e.g `; charset=utf-8`, are ignored) is compressible.
 *
 * Vendored (and modernized) from the `compressible` package.
 * Instead of loading the whole `mime-db` (~2500 types), it's reduced to the equivalent:
 * a regex + the list of compressible types that the regex doesn't match (as of mime-db@1.54.0).
 * No type matched by the regex is marked as non-compressible in mime-db.
 */
export function compressible(type: string): boolean {
  const mime = EXTRACT_TYPE_REGEX.exec(type)![1]!.toLowerCase()
  return COMPRESSIBLE_TYPE_REGEX.test(mime) || COMPRESSIBLE_TYPES.has(mime)
}

const EXTRACT_TYPE_REGEX = /^\s*([^;\s]*)/
const COMPRESSIBLE_TYPE_REGEX = /^text\/|\+(?:json|text|xml)$/

const COMPRESSIBLE_TYPES = new Set([
  'application/dart',
  'application/ecmascript',
  'application/javascript',
  'application/json',
  'application/octet-stream',
  'application/postscript',
  'application/raml+yaml',
  'application/rtf',
  'application/tar',
  'application/toml',
  'application/vnd.dart',
  'application/vnd.ms-fontobject',
  'application/vnd.ms-opentype',
  'application/wasm',
  'application/x-httpd-php',
  'application/x-javascript',
  'application/x-ns-proxy-autoconfig',
  'application/x-sh',
  'application/x-tar',
  'application/x-virtualbox-hdd',
  'application/x-virtualbox-ova',
  'application/x-virtualbox-ovf',
  'application/x-virtualbox-vbox',
  'application/x-virtualbox-vdi',
  'application/x-virtualbox-vhd',
  'application/x-virtualbox-vmdk',
  'application/x-www-form-urlencoded',
  'application/xml',
  'application/xml-dtd',
  'font/otf',
  'font/ttf',
  'image/bmp',
  'image/vnd.adobe.photoshop',
  'image/vnd.microsoft.icon',
  'image/vnd.ms-dds',
  'image/x-icon',
  'image/x-ms-bmp',
  'message/rfc822',
  'model/gltf-binary',
  'x-shader/x-fragment',
  'x-shader/x-vertex',
])
