/**
 * CBOR Tag Parser Composable
 * Handles Major Type 6 (Semantic Tags)
 * Supports standard tags (0-5), encoding hints (21-36), self-describe (55799), and Cardano tags
 */

import type { ParseResult, CborValue, TaggedValue, ParseOptions, PlutusConstr, CborByteString } from '../types'
import { hasDuplicates } from '../utils'
import { createScanner, inputBytes, resolveOptions } from '../scanner'

/**
 * Composable for parsing CBOR tags (Major Type 6)
 *
 * @returns Object with parseTag and parse functions
 *
 * @example
 * ```ts
 * const { parseTag } = useCborTag()
 * const result = parseTag('c11a514b67b0') // 1(1363896240) - epoch timestamp
 * ```
 */
export function useCborTag() {
  /**
   * Validates semantic constraints for specific CBOR tags
   *
   * @param tagNumber - The tag number
   * @param value - The tagged value
   * @param options - Parser options
   * @throws Error if validation fails
   */
  /**
   * Validates RFC 3339 date/time string format
   */
  const isValidRfc3339 = (dateStr: string): boolean => {
    // RFC 3339 format: YYYY-MM-DDTHH:MM:SS[.fraction][Z|+/-HH:MM]
    const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/i.exec(dateStr)
    if (!parts) return false
    const year = Number(parts[1]), month = Number(parts[2]), day = Number(parts[3])
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]! && Number(parts[4]) <= 23 && Number(parts[5]) <= 59 && Number(parts[6]) <= 60 && (!parts[8] || Number(parts[8]) <= 23) && (!parts[9] || Number(parts[9]) <= 59)
  }

  /**
   * Validates URI format (basic check for scheme)
   */
  const isValidUri = (uri: string): boolean => {
    // Basic URI validation: must have scheme followed by colon
    // RFC 3986: scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
    const uriRegex = /^[a-zA-Z][a-zA-Z0-9+.-]*:/
    return uriRegex.test(uri)
  }

  /**
   * Checks if a value is a text string (CborTextString or plain string)
   */
  const isTextString = (value: CborValue): value is string => {
    if (typeof value === 'string') return true
    if (value && typeof value === 'object' && 'type' in value && (value as any).type === 'cbor-text-string') {
      return true
    }
    return false
  }

  const isByteString = (value: CborValue): value is Uint8Array | CborByteString => {
    if (value instanceof Uint8Array) return true
    if (value && typeof value === 'object' && 'type' in value && (value as any).type === 'cbor-byte-string') {
      return true
    }
    return false
  }

  /**
   * Gets string value from CborTextString or plain string
   */
  const getTextStringValue = (value: CborValue): string => {
    if (typeof value === 'string') return value
    if (value && typeof value === 'object' && 'text' in value) {
      return (value as any).text
    }
    return String(value)
  }

  const validateTagSemantics = (tagNumber: number | bigint, value: CborValue, options?: ParseOptions): void => {
    if (typeof tagNumber === 'bigint') return
    // Check different validation types separately
    // Standard tag semantics (Tags 0, 1, 4, 5, 32, 35, 36, 258)
    const shouldValidateStandard = options?.validateTagSemantics ?? options?.strict

    switch (tagNumber) {
      case 0: // Date/Time String (RFC 3339)
        if (!shouldValidateStandard) break

        if (!isTextString(value)) {
          throw new Error(`Tag 0 (date/time string) must contain a text string, got ${typeof value}`)
        }
        const dateStr = getTextStringValue(value)
        if (!isValidRfc3339(dateStr)) {
          throw new Error(`Tag 0 (date/time string) contains invalid RFC 3339 date format: "${dateStr}"`)
        }
        break

      case 1: // Epoch-Based Date/Time
        if (!shouldValidateStandard) break

        if (typeof value !== 'number' && typeof value !== 'bigint') {
          throw new Error(`Tag 1 (epoch time) must contain a number (integer or float), got ${typeof value}`)
        }
        break

      case 2: // Positive bignum
      case 3: // Negative bignum
        if (!shouldValidateStandard) break

        if (!isByteString(value)) {
          throw new Error(`Tag ${tagNumber} (bignum) must contain a byte string, got ${typeof value}`)
        }
        break

      case 4: // Decimal Fraction
        if (!shouldValidateStandard) break

        if (!Array.isArray(value)) {
          throw new Error(`Tag 4 (decimal fraction) must contain an array, got ${typeof value}`)
        }
        if (value.length !== 2) {
          throw new Error(`Tag 4 (decimal fraction) array must have exactly 2 elements [exponent, mantissa], got ${value.length}`)
        }
        if ((typeof value[0] !== 'number' && typeof value[0] !== 'bigint') ||
            (typeof value[0] === 'number' && !Number.isInteger(value[0]))) {
          throw new Error(`Tag 4 (decimal fraction) exponent must be an integer, got ${value[0]}`)
        }
        if ((typeof value[1] !== 'number' && typeof value[1] !== 'bigint' && !(value[1] && typeof value[1] === 'object' && 'tag' in value[1] && (value[1].tag === 2 || value[1].tag === 3) && typeof value[1].value === 'bigint')) ||
            (typeof value[1] === 'number' && !Number.isInteger(value[1]))) {
          throw new Error(`Tag 4 (decimal fraction) mantissa must be an integer, got ${value[1]}`)
        }
        break

      case 5: // Bigfloat
        if (!shouldValidateStandard) break

        if (!Array.isArray(value)) {
          throw new Error(`Tag 5 (bigfloat) must contain an array, got ${typeof value}`)
        }
        if (value.length !== 2) {
          throw new Error(`Tag 5 (bigfloat) array must have exactly 2 elements [exponent, mantissa], got ${value.length}`)
        }
        if ((typeof value[0] !== 'number' && typeof value[0] !== 'bigint') ||
            (typeof value[0] === 'number' && !Number.isInteger(value[0]))) {
          throw new Error(`Tag 5 (bigfloat) exponent must be an integer, got ${value[0]}`)
        }
        if ((typeof value[1] !== 'number' && typeof value[1] !== 'bigint' && !(value[1] && typeof value[1] === 'object' && 'tag' in value[1] && (value[1].tag === 2 || value[1].tag === 3) && typeof value[1].value === 'bigint')) ||
            (typeof value[1] === 'number' && !Number.isInteger(value[1]))) {
          throw new Error(`Tag 5 (bigfloat) mantissa must be an integer, got ${value[1]}`)
        }
        break

      case 32: // URI (RFC 3986)
        if (!shouldValidateStandard) break

        if (!isTextString(value)) {
          throw new Error(`Tag 32 (URI) must contain a text string, got ${typeof value}`)
        }
        const uriStr = getTextStringValue(value)
        if (!isValidUri(uriStr)) {
          throw new Error(`Tag 32 (URI) contains invalid URI format (missing scheme): "${uriStr}"`)
        }
        break

      case 33: // base64url without padding
      case 34: // base64 without padding
        {
          if (!shouldValidateStandard) break

          if (!isTextString(value)) {
            throw new Error(`Tag ${tagNumber} (base64${tagNumber === 33 ? 'url' : ''}) must contain a text string, got ${typeof value}`)
          }
          // RFC 8949 §3.4.5.3: content must use the respective RFC 4648
          // alphabet. Tag 33: base64url (A-Z a-z 0-9 - _), tag 34: base64
          // (A-Z a-z 0-9 + /); '=' padding tolerated only for tag 34.
          const b64Str = getTextStringValue(value)
          const alphabet = tagNumber === 33
            ? /^[A-Za-z0-9_-]*$/
            : /^[A-Za-z0-9+/]*={0,2}$/
          const unpadded = b64Str.replace(/=+$/, '')
          const padding = b64Str.length - unpadded.length
          const tail = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' + (tagNumber === 33 ? '-_' : '+/')
          const last = tail.indexOf(unpadded.slice(-1))
          const remainder = unpadded.length % 4
          const badPadding = padding > 0 && (b64Str.length % 4 !== 0 || padding !== (4 - remainder) % 4)
          const badBits = (remainder === 2 && (last & 15) !== 0) || (remainder === 3 && (last & 3) !== 0)
          if (!alphabet.test(b64Str) || remainder === 1 || badPadding || badBits) {
            throw new Error(
              `Tag ${tagNumber} (base64${tagNumber === 33 ? 'url' : ''}) contains characters outside the ` +
              `${tagNumber === 33 ? 'base64url' : 'base64'} alphabet: "${b64Str}"`
            )
          }
        }
        break

      case 35: // Regular Expression
        if (!shouldValidateStandard) break

        if (!isTextString(value)) {
          throw new Error(`Tag 35 (regexp) must contain a text string, got ${typeof value}`)
        }
        break

      case 36: // MIME Message
        if (!shouldValidateStandard) break

        if (!isTextString(value)) {
          throw new Error(`Tag 36 (MIME message) must contain a text string, got ${typeof value}`)
        }
        break

      case 24:
        if (shouldValidateStandard && !isByteString(value)) throw new Error('Tag 24 must contain a byte string')
        break

      case 258: // Mathematical Finite Set
        {
          // Validate set uniqueness if enabled
          const shouldValidateUniqueness = options?.validateSetUniqueness ?? options?.strict

          if (shouldValidateStandard && !Array.isArray(value)) throw new Error('Tag 258 (set) must contain an array')
          if (shouldValidateUniqueness) {
            if (!Array.isArray(value)) {
              throw new Error(`Tag 258 (set) must contain an array, got ${typeof value}`)
            }

            if (hasDuplicates(value)) {
              throw new Error(
                `Tag 258 (set) contains duplicate items. ` +
                `Sets must contain only unique values (RFC 8949). ` +
                `Use validateSetUniqueness: false to allow duplicates.`
              )
            }
          }
        }
        break

      // Plutus Constructor tags
      case 102: // Alternative Plutus Constructor
        validatePlutusAlternativeConstructor(value, options)
        break

      // No validation needed for other tags (yet)
      default:
        // Plutus Compact Constructors (121-127)
        if (tagNumber >= 121 && tagNumber <= 127) {
          validatePlutusCompactConstructor(tagNumber, value, options)
        }
        // Plutus Extended Constructors (1280-1400)
        else if (tagNumber >= 1280 && tagNumber <= 1400) {
          validatePlutusExtendedConstructor(tagNumber, value, options)
        }
        break
    }
  }

  /**
   * Validates Plutus compact constructor (Tags 121-127)
   *
   * @param tagNumber - Tag number (121-127)
   * @param value - Tagged value (should be array)
   * @param options - Parser options
   */
  const validatePlutusCompactConstructor = (tagNumber: number | bigint, value: CborValue, options?: ParseOptions): void => {
    const shouldValidate = options?.validatePlutusSemantics ?? options?.strict

    if (!shouldValidate) {
      return
    }

    if (!Array.isArray(value)) {
      throw new Error(
        `Plutus constructor tag ${tagNumber} must contain an array, got ${typeof value}`
      )
    }

    // Tags 121-127 encode constructor index 0-6
    // Per Cardano CDDL: constr<tag> = #6.tag([* any])
    // The tag number encodes the constructor index, NOT the arity
    // Any number of fields (0 or more) is valid
  }

  /**
   * Validates Plutus alternative constructor (Tag 102)
   *
   * @param value - Tagged value (should be [uint, array])
   * @param options - Parser options
   */
  const validatePlutusAlternativeConstructor = (value: CborValue, options?: ParseOptions): void => {
    const shouldValidate = options?.validatePlutusSemantics ?? options?.strict

    if (!shouldValidate) {
      return
    }

    if (!Array.isArray(value)) {
      throw new Error(
        `Plutus alternative constructor (tag 102) must contain an array, got ${typeof value}`
      )
    }

    if (value.length !== 2) {
      throw new Error(
        `Plutus alternative constructor (tag 102) must be [constructor_index, fields], got array of length ${value.length}`
      )
    }

    const constructorIndex = value[0]
    const fields = value[1]

    if ((typeof constructorIndex !== 'number' && typeof constructorIndex !== 'bigint') || constructorIndex < 0 || (typeof constructorIndex === 'number' && !Number.isSafeInteger(constructorIndex)) || constructorIndex > 18446744073709551615n) {
      throw new Error(
        `Plutus constructor index must be non-negative integer, got ${typeof constructorIndex}`
      )
    }

    if (!Array.isArray(fields)) {
      throw new Error(
        `Plutus constructor fields must be an array, got ${typeof fields}`
      )
    }
  }

  /**
   * Validates Plutus extended constructor (Tags 1280-1400)
   *
   * @param tagNumber - Tag number (1280-1400)
   * @param value - Tagged value (should be array)
   * @param options - Parser options
   */
  const validatePlutusExtendedConstructor = (tagNumber: number | bigint, value: CborValue, options?: ParseOptions): void => {
    const shouldValidate = options?.validatePlutusSemantics ?? options?.strict

    if (!shouldValidate) {
      return
    }

    if (!Array.isArray(value)) {
      throw new Error(
        `Plutus constructor tag ${tagNumber} must contain an array, got ${typeof value}`
      )
    }

    const constructorIndex = (Number(tagNumber) - 1280) + 7

    // Extended constructors can have any number of fields (0 to unlimited)
    // Constructor index is 7-127
    if (constructorIndex < 7 || constructorIndex > 127) {
      throw new Error(
        `Plutus extended constructor tag ${tagNumber} produces invalid constructor index ${constructorIndex} ` +
        `(expected 7-127)`
      )
    }
  }

  /**
   * Decodes a Plutus constructor from a tag
   *
   * @param tagNumber - CBOR tag number
   * @param value - Tagged value
   * @returns PlutusConstr or null if not a Plutus constructor
   */
  const decodePlutusConstructor = (tagNumber: number | bigint, value: CborValue): PlutusConstr | null => {
    if (typeof tagNumber === 'bigint') return null
    // Tag 102: Alternative constructor [index, fields]
    if (tagNumber === 102) {
      if (!Array.isArray(value) || value.length !== 2) {
        return null
      }
      const [constructorIndex, fields] = value
      if ((typeof constructorIndex !== 'number' && typeof constructorIndex !== 'bigint') || !Array.isArray(fields)) {
        return null
      }
      return {
        constructor: constructorIndex,
        fields: fields as any[]
      }
    }

    // Tags 121-127: Compact constructors
    if (tagNumber >= 121 && tagNumber <= 127) {
      if (!Array.isArray(value)) {
        return null
      }
      const constructorIndex = tagNumber - 121
      return {
        constructor: constructorIndex,
        fields: value as any[]
      }
    }

    // Tags 1280-1400: Extended constructors
    if (tagNumber >= 1280 && tagNumber <= 1400) {
      if (!Array.isArray(value)) {
        return null
      }
      const constructorIndex = (Number(tagNumber) - 1280) + 7
      return {
        constructor: constructorIndex,
        fields: value as any[]
      }
    }

    return null
  }

  /**
   * Internal tag parser that works with buffers
   *
   * @param buffer - Data buffer
   * @param offset - Current offset
   * @param options - Parser options
   * @returns Parsed tagged value and bytes read
   */
  const parseTagFromBuffer = (buffer: Uint8Array, offset: number, options?: ParseOptions, tagDepth = 0): ParseResult => {
    if ((buffer[offset]! >> 5) !== 6) throw new Error(`Expected major type 6 (tag), got ${buffer[offset]! >> 5}`)
    const node = createScanner(buffer, options).scan(offset, 0, tagDepth)
    return { value: node.value, bytesRead: node.end - offset }
  }
  const parseTag = (hex: string, options?: ParseOptions) => parseTagFromBuffer(inputBytes(hex, resolveOptions(options)), 0, options)
  const parse = parseTag

  /**
   * Applies the "expected later encoding" conversion for tags 21-23
   * (RFC 8949 §3.4.5.2) for diagnostic/interop purposes.
   *
   * Decoding keeps these tags as pass-through { tag, value } wrappers; this
   * helper converts a byte-string content to the string form the tag promises:
   * - Tag 21: base64url without padding
   * - Tag 22: base64 (with padding)
   * - Tag 23: base16 (lowercase hex)
   *
   * @param tagged - A decoded tagged value
   * @returns The converted string, or null when the tag/content don't apply
   */
  const applyExpectedEncoding = (tagged: TaggedValue): string | null => {
    if (tagged.tag !== 21 && tagged.tag !== 22 && tagged.tag !== 23) {
      return null
    }

    let bytes: Uint8Array | null = null
    if (tagged.value instanceof Uint8Array) {
      bytes = tagged.value
    } else if (
      tagged.value && typeof tagged.value === 'object' &&
      'type' in tagged.value && (tagged.value as CborByteString).type === 'cbor-byte-string'
    ) {
      bytes = (tagged.value as CborByteString).bytes
    }
    if (!bytes) {
      return null
    }

    if (tagged.tag === 23) {
      // base16 (lowercase)
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    }

    // base64 via btoa-compatible manual encoding (no Node Buffer dependency)
    const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let b64 = ''
    for (let i = 0; i < bytes.length; i += 3) {
      const b0 = bytes[i]!
      const b1 = i + 1 < bytes.length ? bytes[i + 1]! : 0
      const b2 = i + 2 < bytes.length ? bytes[i + 2]! : 0
      b64 += BASE64_CHARS[b0 >> 2]
      b64 += BASE64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)]
      b64 += i + 1 < bytes.length ? BASE64_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)] : '='
      b64 += i + 2 < bytes.length ? BASE64_CHARS[b2 & 0x3f] : '='
    }

    if (tagged.tag === 22) {
      return b64
    }
    // Tag 21: base64url without padding
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  return {
    parseTag,
    parse,
    parseTagFromBuffer,
    validateTagSemantics,
    decodePlutusConstructor,
    applyExpectedEncoding
  }
}
