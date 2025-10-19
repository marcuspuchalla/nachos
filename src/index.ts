/**
 * @cbor-codec/core
 *
 * RFC 8949 CBOR (Concise Binary Object Representation) encoder and decoder
 * with full source map support for interactive debugging.
 *
 * @module @cbor-codec/core
 * @see https://datatracker.ietf.org/doc/html/rfc8949
 *
 * @example
 * ```typescript
 * // Simple decoding
 * import { decode } from '@cbor-codec/core'
 * const result = decode('1864')  // { value: 100, bytesRead: 2 }
 *
 * // Simple encoding
 * import { encode } from '@cbor-codec/core'
 * const { hex, bytes } = encode(100)  // hex: "1864"
 *
 * // With source maps for debugging
 * import { decodeWithSourceMap } from '@cbor-codec/core'
 * const { value, sourceMap } = decodeWithSourceMap('d87980')
 * // sourceMap links hex bytes to decoded values
 * ```
 */

// Re-export from parser (decoder)
export { useCborParser } from '../../src/parser/composables/useCborParser'
export { useCborInteger } from '../../src/parser/composables/useCborInteger'
export { useCborString } from '../../src/parser/composables/useCborString'
export { useCborCollection } from '../../src/parser/composables/useCborCollection'
export { useCborFloat } from '../../src/parser/composables/useCborFloat'
export { useCborTag } from '../../src/parser/composables/useCborTag'

// Re-export from encoder
export { useCborEncoder } from '../../src/encoder/composables/useCborEncoder'
export { useCborIntegerEncoder } from '../../src/encoder/composables/useCborIntegerEncoder'
export { useCborStringEncoder } from '../../src/encoder/composables/useCborStringEncoder'
export { useCborCollectionEncoder } from '../../src/encoder/composables/useCborCollectionEncoder'
export { useCborSimpleEncoder } from '../../src/encoder/composables/useCborSimpleEncoder'

// Re-export types
export type {
  // Parser types
  ParseResult,
  ParseResultWithMap,
  ParseOptions,
  ParseError,
  ParserLimits,
  CborContext,
  CborValue,
  CborMap,
  TaggedValue,
  PlutusData,
  PlutusConstr,
  PlutusMap,
  PlutusList,
  PlutusInt,
  PlutusBytes,
  SourceMapEntry,
  Result
} from '../../src/parser/types'

export {
  DEFAULT_OPTIONS,
  DEFAULT_LIMITS,
  CborMajorType,
  CborAdditionalInfo,
  CborSimpleValue,
  CborTag
} from '../../src/parser/types'

export type {
  // Encoder types
  EncodeResult,
  EncodeOptions,
  EncodableValue,
  EncodeContext
} from '../../src/encoder/types'

export {
  DEFAULT_ENCODE_OPTIONS
} from '../../src/encoder/types'

// Convenience exports with cleaner names for library users
import { useCborParser } from '../../src/parser/composables/useCborParser'
import { useCborEncoder } from '../../src/encoder/composables/useCborEncoder'
import type { ParseResult, ParseResultWithMap, ParseOptions } from '../../src/parser/types'
import type { EncodeResult, EncodeOptions, EncodableValue } from '../../src/encoder/types'

/**
 * Decode CBOR hex string to JavaScript value
 *
 * @param hexString - CBOR data as hex string (e.g., "1864" for integer 100)
 * @param options - Optional parser configuration
 * @returns Decoded value and number of bytes consumed
 *
 * @throws {Error} If input is invalid or malformed CBOR
 *
 * @example
 * ```typescript
 * // Decode integer
 * decode('1864')  // { value: 100, bytesRead: 2 }
 *
 * // Decode string
 * decode('6449455446')  // { value: "IETF", bytesRead: 5 }
 *
 * // Decode array
 * decode('83010203')  // { value: [1, 2, 3], bytesRead: 4 }
 *
 * // With strict validation
 * decode('1864', { strict: true })
 *
 * // With canonical validation
 * decode('a16161 01', { validateCanonical: true })
 * ```
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8949 | RFC 8949}
 */
export function decode(hexString: string, options?: ParseOptions): ParseResult {
  const { parse } = useCborParser()
  return parse(hexString, options)
}

/**
 * Decode CBOR hex string with source map generation
 *
 * Source maps provide bidirectional linking between hex bytes and decoded values,
 * enabling interactive debugging visualizations.
 *
 * @param hexString - CBOR data as hex string
 * @param options - Optional parser configuration
 * @returns Decoded value, byte count, and source map
 *
 * @example
 * ```typescript
 * const { value, sourceMap } = decodeWithSourceMap('d87980')
 * // value: { tag: 121, value: [] }
 * // sourceMap: [
 * //   { path: '', start: 0, end: 3, majorType: 6, type: 'Tag 121', children: ['.value'] },
 * //   { path: '.value', start: 2, end: 3, majorType: 4, type: 'Array', parent: '' }
 * // ]
 *
 * // Use source map for hex-to-JSON linking
 * const entry = sourceMap.find(e => e.path === '.value')
 * console.log(`Value is at bytes ${entry.start}-${entry.end}`)
 * ```
 */
export function decodeWithSourceMap(hexString: string, options?: ParseOptions): ParseResultWithMap {
  const { parseWithSourceMap } = useCborParser()
  return parseWithSourceMap(hexString, options)
}

/**
 * Encode JavaScript value to CBOR
 *
 * Automatically detects value type and uses appropriate CBOR encoding.
 * Supports: numbers, bigints, strings, booleans, null, undefined, Uint8Arrays, arrays, objects, and tagged values.
 *
 * @param value - JavaScript value to encode
 * @param options - Optional encoder configuration
 * @returns CBOR bytes and hex string
 *
 * @throws {Error} If value type is unsupported or encoding fails
 *
 * @example
 * ```typescript
 * // Encode number
 * encode(100)  // { hex: "1864", bytes: Uint8Array[0x18, 0x64] }
 *
 * // Encode string
 * encode("IETF")  // { hex: "6449455446", bytes: ... }
 *
 * // Encode array
 * encode([1, 2, 3])  // { hex: "83010203", bytes: ... }
 *
 * // Encode map (canonical - sorted keys)
 * encode({ z: 1, a: 2 }, { canonical: true })
 * // Keys will be sorted: { a: 2, z: 1 }
 *
 * // Encode tagged value
 * encode({ tag: 121, value: [] })  // { hex: "d87980", bytes: ... }
 * ```
 */
export function encode(value: EncodableValue, options?: Partial<EncodeOptions>): EncodeResult {
  const { encode: encodeValue } = useCborEncoder(options)
  return encodeValue(value)
}

/**
 * Encode JavaScript value to CBOR hex string
 *
 * Convenience function that returns only the hex string (not the bytes).
 *
 * @param value - JavaScript value to encode
 * @param options - Optional encoder configuration
 * @returns CBOR hex string
 *
 * @example
 * ```typescript
 * encodeToHex(100)  // "1864"
 * encodeToHex([1, 2, 3])  // "83010203"
 * encodeToHex({ a: 1 }, { canonical: true })  // "a16161 01"
 * ```
 */
export function encodeToHex(value: EncodableValue, options?: Partial<EncodeOptions>): string {
  const { encodeToHex: encodeValueToHex } = useCborEncoder(options)
  return encodeValueToHex(value)
}

/**
 * Encode JavaScript value to CBOR bytes
 *
 * Convenience function that returns only the bytes (not the hex string).
 *
 * @param value - JavaScript value to encode
 * @param options - Optional encoder configuration
 * @returns CBOR bytes as Uint8Array
 *
 * @example
 * ```typescript
 * const bytes = encodeToBytes(100)  // Uint8Array[0x18, 0x64]
 * const bytes = encodeToBytes([1, 2, 3])  // Uint8Array[0x83, 0x01, 0x02, 0x03]
 * ```
 */
export function encodeToBytes(value: EncodableValue, options?: Partial<EncodeOptions>): Uint8Array {
  const { encodeToBytes: encodeValueToBytes } = useCborEncoder(options)
  return encodeValueToBytes(value)
}

/**
 * Encode multiple values as CBOR sequence
 *
 * Creates a CBOR sequence (RFC 8742) by concatenating multiple encoded values.
 * Useful for streaming or batch encoding.
 *
 * @param values - Array of values to encode
 * @param options - Optional encoder configuration
 * @returns Concatenated CBOR bytes and hex string
 *
 * @example
 * ```typescript
 * encodeSequence([1, "hello", [2, 3]])
 * // Returns concatenated encoding: 0x01 + 0x6568656c6c6f + 0x820203
 * ```
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8742 | RFC 8742 - CBOR Sequences}
 */
export function encodeSequence(values: EncodableValue[], options?: Partial<EncodeOptions>): EncodeResult {
  const { encodeSequence: encodeSeq } = useCborEncoder(options)
  return encodeSeq(values)
}

/**
 * Class-based CBOR decoder
 *
 * Provides an object-oriented interface for CBOR decoding.
 * Useful when you need to maintain decoder state or configuration.
 *
 * @example
 * ```typescript
 * const decoder = new CborDecoder({ strict: true })
 *
 * const result1 = decoder.decode('1864')
 * const result2 = decoder.decode('6449455446')
 *
 * const withMap = decoder.decodeWithSourceMap('d87980')
 * ```
 */
export class CborDecoder {
  private options: ParseOptions

  /**
   * Create a new CBOR decoder
   *
   * @param options - Parser configuration
   */
  constructor(options?: ParseOptions) {
    this.options = options || {}
  }

  /**
   * Decode CBOR hex string
   *
   * @param hexString - CBOR data as hex string
   * @returns Decoded value and byte count
   */
  decode(hexString: string): ParseResult {
    return decode(hexString, this.options)
  }

  /**
   * Decode CBOR hex string with source map
   *
   * @param hexString - CBOR data as hex string
   * @returns Decoded value, byte count, and source map
   */
  decodeWithSourceMap(hexString: string): ParseResultWithMap {
    return decodeWithSourceMap(hexString, this.options)
  }
}

/**
 * Class-based CBOR encoder
 *
 * Provides an object-oriented interface for CBOR encoding.
 * Useful when you need to maintain encoder state or configuration.
 *
 * @example
 * ```typescript
 * const encoder = new CborEncoder({ canonical: true })
 *
 * const result1 = encoder.encode(100)
 * const result2 = encoder.encode([1, 2, 3])
 *
 * const hex = encoder.encodeToHex({ a: 1 })  // Keys will be sorted
 * ```
 */
export class CborEncoder {
  private options: Partial<EncodeOptions>

  /**
   * Create a new CBOR encoder
   *
   * @param options - Encoder configuration
   */
  constructor(options?: Partial<EncodeOptions>) {
    this.options = options || {}
  }

  /**
   * Encode value to CBOR
   *
   * @param value - JavaScript value to encode
   * @returns CBOR bytes and hex string
   */
  encode(value: EncodableValue): EncodeResult {
    return encode(value, this.options)
  }

  /**
   * Encode value to CBOR hex string
   *
   * @param value - JavaScript value to encode
   * @returns CBOR hex string
   */
  encodeToHex(value: EncodableValue): string {
    return encodeToHex(value, this.options)
  }

  /**
   * Encode value to CBOR bytes
   *
   * @param value - JavaScript value to encode
   * @returns CBOR bytes
   */
  encodeToBytes(value: EncodableValue): Uint8Array {
    return encodeToBytes(value, this.options)
  }

  /**
   * Encode multiple values as CBOR sequence
   *
   * @param values - Array of values to encode
   * @returns Concatenated CBOR encoding
   */
  encodeSequence(values: EncodableValue[]): EncodeResult {
    return encodeSequence(values, this.options)
  }
}
