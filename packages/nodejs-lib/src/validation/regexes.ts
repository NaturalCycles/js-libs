export const BASE62_REGEX = /^[a-zA-Z0-9]+$/
export const BASE64_REGEX = /^[a-zA-Z0-9+/]+={0,2}$/
export const BASE64URL_REGEX = /^[a-zA-Z0-9_-]+$/
// from `ajv-formats`, case-insensitive via character class (not flag) for JSON Schema compatibility
export const UUID_REGEX = /^(?:urn:uuid:)?[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/
export const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/
export const CURRENCY_REGEX = /^[A-Z]{3}$/
/**
 * @deprecated
 * Avoid using blanket regex for a concept so ambiguous as "ID".
 * We should always define what kind of an ID we talk about: MongoDB ID, Base64 ID etc.
 *
 * We keep this regex here, because JOI shared schemas has been exporting this check.
 */
export const ID_REGEX = /^[a-zA-Z0-9_]{6,64}$/
export const IPV4_REGEX =
  // from `ajv-formats`
  /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/
// from `ajv-formats`, case-insensitive via character class (not flag) for JSON Schema compatibility
export const IPV6_REGEX =
  /^((([0-9a-fA-F]{1,4}:){7}([0-9a-fA-F]{1,4}|:))|(([0-9a-fA-F]{1,4}:){6}(:[0-9a-fA-F]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-fA-F]{1,4}:){5}(((:[0-9a-fA-F]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-fA-F]{1,4}:){4}(((:[0-9a-fA-F]{1,4}){1,3})|((:[0-9a-fA-F]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-fA-F]{1,4}:){3}(((:[0-9a-fA-F]{1,4}){1,4})|((:[0-9a-fA-F]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-fA-F]{1,4}:){2}(((:[0-9a-fA-F]{1,4}){1,5})|((:[0-9a-fA-F]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-fA-F]{1,4}:){1}(((:[0-9a-fA-F]{1,4}){1,6})|((:[0-9a-fA-F]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-fA-F]{1,4}){1,7})|((:[0-9a-fA-F]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/
// IETF language tag (https://en.wikipedia.org/wiki/IETF_language_tag)
export const LANGUAGE_TAG_REGEX = /^[a-z]{2}(-[A-Z]{2})?$/
export const MAC_ADDRESS_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
export const SEMVER_REGEX = /^[0-9]+\.[0-9]+\.[0-9]+$/
export const SLUG_REGEX = /^[a-z0-9-]+$/
// URL regex based on `ajv-formats`, but without flags for JSON Schema compatibility.
// Uses [a-zA-Z] instead of [a-z] with i flag. Simplified to not require unicode flag.
// Without the unicode flag - it DOES NOT support urls like https://münchen.de
export const URL_REGEX =
  /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-zA-Z0-9]+-)*[a-zA-Z0-9]+)(?:\.(?:[a-zA-Z0-9]+-)*[a-zA-Z0-9]+)*(?:\.(?:[a-zA-Z]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/
