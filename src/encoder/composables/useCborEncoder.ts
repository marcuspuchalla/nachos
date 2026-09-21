/**
 * Main CBOR Encoder Composable
 * High-level API for encoding JavaScript values to CBOR
 * Following RFC 8949 specification
 */

import type { EncodeResult, EncodeOptions, EncodableValue, TaggedValue } from '../types'
import { checkEncodingBudget } from '../budget'
import { bytesToHex } from '../utils'
import { DEFAULT_ENCODE_OPTIONS } from '../types'
import { useCborIntegerEncoder } from './useCborIntegerEncoder'
import { useCborStringEncoder } from './useCborStringEncoder'
import { useCborCollectionEncoder } from './useCborCollectionEncoder'
import { useCborSimpleEncoder } from './useCborSimpleEncoder'
import { useCborTagEncoder } from './useCborTagEncoder'
import { useCborByteString, useCborTextString } from '../../parser/composables/useCborStringTypes'

/**
 * Main CBOR Encoder Composable
 *
 * Provides a unified interface for encoding any JavaScript value to CBOR.
 * Automatically selects the appropriate encoder based on value type.
 *
 * @param options - Global encoder options
 *
 * @example
 * ```ts
 * const { encode } = useCborEncoder()
 *
 * // Encode various types
 * encode(42)           // Integer
 * encode("hello")      // Text string
 * encode([1, 2, 3])    // Array
 * encode({ a: 1 })     // Map
 * encode(true)         // Boolean
 * encode(3.14)         // Float
 * encode(new Uint8Array([0xff]))  // Byte string
 *
 * // With options
 * const { encode: encodeCanonical } = useCborEncoder({ canonical: true })
 * encodeCanonical({ z: 1, a: 2 })  // Keys will be sorted
 * ```
 */
export function useCborEncoder(globalOptions?: Partial<EncodeOptions>) {
  const options = { ...DEFAULT_ENCODE_OPTIONS, ...globalOptions }

  // Canonical mode overrides: indefinite-length is forbidden per RFC 8949 Section 4.2
  if (options.canonical && options.allowIndefinite) {
    options.allowIndefinite = false
  }

  // Get all specialized encoders
  const { encodeInteger } = useCborIntegerEncoder(options)
  const { encodeTextString, encodeByteString } = useCborStringEncoder(options)
  const { encodeArray, encodeMap, setMainEncode } = useCborCollectionEncoder(options)
  const { encodeSimple, encodeFloat } = useCborSimpleEncoder(options)
  const { encodeTaggedValue } = useCborTagEncoder()

  // Get type guards for composable string types
  const { isCborByteString } = useCborByteString()
  const { isCborTextString } = useCborTextString()

  /**
   * Encode any JavaScript value to CBOR
   *
   * Automatically detects the type and uses the appropriate encoder:
   * - number/bigint → Integer or Float
   * - string → Text string
   * - boolean/null/undefined → Simple values
   * - Uint8Array → Byte string
   * - Array → CBOR array
   * - {tag: number, value: any} → Tagged value
   * - Object/Map → CBOR map
   *
   * @param value - Value to encode
   * @returns Encoded CBOR bytes and hex string
   * @throws Error if value type is unsupported
   */
  const encode = (value: EncodableValue): EncodeResult => {
    if (currentDepth === 0) checkEncodingBudget(value, options.maxOutputSize, options.maxDepth)
    let result = encodeValue(value)

    // Self-described CBOR (RFC 8949 §3.4.6): wrap the output in tag 55799 so
    // it starts with the magic bytes d9d9f7. Only applied at the true top
    // level — encode() re-enters recursively for nested tagged values
    // (currentDepth > 0 there), which must not be wrapped.
    if (options.selfDescribed && currentDepth === 0) {
      const wrapped = new Uint8Array(3 + result.bytes.length)
      wrapped[0] = 0xd9
      wrapped[1] = 0xd9
      wrapped[2] = 0xf7
      wrapped.set(result.bytes, 3)
      result = { bytes: wrapped, hex: 'd9d9f7' + result.hex }
    }

    // Enforce maxOutputSize at the root level.
    // This is the single authoritative check — collection/string encoders no longer
    // track bytesWritten individually, which was broken for nested structures.
    if (result.bytes.length > options.maxOutputSize) {
      throw new Error(
        `Encoded output size ${result.bytes.length} bytes exceeds limit of ${options.maxOutputSize} bytes`
      )
    }

    return result
  }

  // Recursion depth tracked across ALL value types — including the tag boundary.
  // Tagged values re-enter through this same encode()/encodeValue() pair, so
  // counting here (rather than only inside the collection encoder) prevents a
  // deeply nested {tag,value} chain from silently bypassing maxDepth and
  // overflowing the call stack.
  let currentDepth = 0

  /**
   * Encode any JavaScript value to CBOR (internal, no size check)
   */
  const encodeValue = (value: EncodableValue): EncodeResult => {
    if (currentDepth > options.maxDepth) {
      throw new Error(`Maximum nesting depth exceeded (limit ${options.maxDepth})`)
    }
    currentDepth++
    try {
      return encodeValueInner(value)
    } finally {
      currentDepth--
    }
  }

  const encodeValueInner = (value: EncodableValue): EncodeResult => {
    // Handle null/undefined/boolean
    if (value === null || value === undefined || typeof value === 'boolean') {
      return encodeSimple(value)
    }

    // Handle numbers
    if (typeof value === 'number') {
      if (Object.is(value, -0)) {
        return encodeFloat(value, 16)
      }
      // Check if it's an integer
      if (Number.isSafeInteger(value)) {
        return encodeInteger(value)
      }
      // It's a float
      return encodeFloat(value)
    }

    // Handle bigint
    if (typeof value === 'bigint') {
      return encodeInteger(value)
    }

    // Handle composable text strings (check before primitive strings)
    if (isCborTextString(value)) {
      return encodeTextString(value)
    }

    // Handle strings
    if (typeof value === 'string') {
      return encodeTextString(value)
    }

    // Handle composable byte strings (check before Uint8Array)
    if (isCborByteString(value)) {
      return encodeByteString(value)
    }

    // Handle Uint8Array (byte strings)
    if (value instanceof Uint8Array) {
      return encodeByteString(value)
    }

    if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'cbor-float') {
      const f = value as { value: number; bytes?: Uint8Array }
      if (f.bytes && !options.canonical) return { bytes: f.bytes.slice(), hex: Array.from(f.bytes, b => b.toString(16).padStart(2, '0')).join('') }
      if (f.bytes && Number.isNaN(f.value)) {
        const inputWidth = f.bytes.length - 1
        const precision = inputWidth === 2 ? 10n : inputWidth === 4 ? 23n : 52n
        let bits = 0n
        for (const byte of f.bytes.subarray(1)) bits = (bits << 8n) | BigInt(byte)
        const sign = bits >> BigInt(inputWidth * 8 - 1)
        const payload = (bits & ((1n << precision) - 1n)) << (64n - precision)
        const width = (payload & ((1n << 54n) - 1n)) === 0n ? 2 : (payload & ((1n << 41n) - 1n)) === 0n ? 4 : 8
        const p = width === 2 ? 10n : width === 4 ? 23n : 52n
        const exponent = width === 2 ? 31n : width === 4 ? 255n : 2047n
        let output = (sign << BigInt(width * 8 - 1)) | (exponent << p) | (payload >> (64n - p))
        const bytes = new Uint8Array(width + 1); bytes[0] = width === 2 ? 0xf9 : width === 4 ? 0xfa : 0xfb
        for (let i = width; i > 0; i--) { bytes[i] = Number(output & 255n); output >>= 8n }
        return { bytes, hex: Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') }
      }
      for (const precision of [16, 32, 64] as const) {
        const result = encodeFloat(f.value, precision)
        const abs = Math.abs(f.value)
        const fits16 = !Number.isFinite(abs) || abs === 0 || (abs <= 65504 && Number.isInteger(abs / (abs < 2 ** -14 ? 2 ** -24 : 2 ** (Math.floor(Math.log2(abs)) - 10))))
        if (precision === 64 || (precision === 16 && fits16) || (precision === 32 && Object.is(Math.fround(f.value), f.value))) return result
      }
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return encodeArray(value)
    }

    // Handle Map
    if (value instanceof Map) {
      return encodeMap(value)
    }

    // Handle tagged values (MUST come before plain objects)
    // Check for {tag: number, value: any} structure
    if (typeof value === 'object' && value !== null && 'tag' in value && 'value' in value && (typeof (value as { tag: unknown }).tag === 'number' || typeof (value as { tag: unknown }).tag === 'bigint')) {
      return encodeTaggedValue(value as TaggedValue, encode)
    }

    if (typeof value === 'object' && value !== null && 'simpleValue' in value) {
      const simple = value.simpleValue
      if (typeof simple !== 'number' || !Number.isInteger(simple) || simple < 0 || simple > 255 || (simple >= 24 && simple < 32)) throw new Error('Invalid simple value')
      const bytes = new Uint8Array(simple < 24 ? [0xe0 + simple] : [0xf8, simple])
      return { bytes, hex: Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') }
    }

    // Handle plain objects
    if (typeof value === 'object' && value !== null) {
      return encodeMap(value as { [key: string]: EncodableValue })
    }

    throw new Error(`Unsupported value type: ${typeof value}`)
  }

  // Set the main encode function for recursive collection encoding
  // This allows the collection encoder to handle nested tagged values
  setMainEncode(encode)

  /**
   * Encode value and return only the hex string
   *
   * @param value - Value to encode
   * @returns Hex string representation
   */
  const encodeToHex = (value: EncodableValue): string => {
    return encode(value).hex
  }

  /**
   * Encode value and return only the bytes
   *
   * @param value - Value to encode
   * @returns Uint8Array bytes
   */
  const encodeToBytes = (value: EncodableValue): Uint8Array => {
    return encode(value).bytes
  }

  /**
   * Encode multiple values in sequence
   *
   * Useful for CBOR sequences (RFC 8742)
   *
   * @param values - Values to encode
   * @returns Concatenated CBOR encoding
   */
  const encodeSequence = (values: EncodableValue[]): EncodeResult => {
    const allBytes: Uint8Array[] = []

    for (const value of values) {
      const result = encode(value)
      allBytes.push(result.bytes)
    }

    // Concatenate all encoded values
    const totalLength = allBytes.reduce((sum, arr) => sum + arr.length, 0)
    if (totalLength > options.maxOutputSize) throw new Error(`Encoded output size ${totalLength} bytes exceeds limit of ${options.maxOutputSize} bytes`)
    const concatenated = new Uint8Array(totalLength)

    let offset = 0
    for (const bytes of allBytes) {
      concatenated.set(bytes, offset)
      offset += bytes.length
    }

    const hex = bytesToHex(concatenated)

    return {
      bytes: concatenated,
      hex
    }
  }

  return {
    encode,
    encodeToHex,
    encodeToBytes,
    encodeSequence
  }
}
