/**
 * CBOR Integer Encoder Composable
 * Handles Major Type 0 (Unsigned) and Major Type 1 (Negative)
 * Following RFC 8949 specification
 */

import type { EncodeResult, EncodeOptions } from '../types'
import { DEFAULT_ENCODE_OPTIONS } from '../types'
import { bytesToHex, writeUint, writeBigUint } from '../utils'

/** Largest value encodable as CBOR major type 0 (2^64 - 1) */
const MAX_UINT64 = 18446744073709551615n
/** Smallest value encodable as CBOR major type 1 (-2^64) */
const MIN_INT64 = -18446744073709551616n

/**
 * Convert a non-negative bigint to its minimal-length big-endian byte
 * representation (no leading zero bytes, per RFC 8949 §4.2.1 deterministic
 * bignum encoding). Zero encodes as an empty byte string.
 */
export function bigintToMinimalBytes(n: bigint): Uint8Array {
  if (n < 0n) {
    throw new Error('bigintToMinimalBytes requires a non-negative value')
  }
  if (n === 0n) {
    return new Uint8Array(0)
  }
  let hex = n.toString(16)
  if (hex.length % 2 !== 0) {
    hex = '0' + hex
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/**
 * CBOR Integer Encoder Composable
 *
 * Provides functions to encode integers to CBOR format:
 * - Major Type 0: Unsigned integers (0 to 2^64-1)
 * - Major Type 1: Negative integers (-1 to -2^64)
 *
 * @example
 * ```ts
 * const { encodeUnsignedInt, encodeNegativeInt, encodeInteger } = useCborIntegerEncoder()
 *
 * // Encode unsigned integer
 * const result1 = encodeUnsignedInt(100)
 * // result1: { bytes: Uint8Array([0x18, 0x64]), hex: '1864' }
 *
 * // Encode negative integer
 * const result2 = encodeNegativeInt(-100)
 * // result2: { bytes: Uint8Array([0x38, 0x63]), hex: '3863' }
 *
 * // Auto-detect integer type
 * const result3 = encodeInteger(-100)
 * // result3: { bytes: Uint8Array([0x38, 0x63]), hex: '3863' }
 * ```
 */
export function useCborIntegerEncoder(globalOptions?: Partial<EncodeOptions>) {
  const maxBignumBytes = globalOptions?.maxBignumBytes ?? DEFAULT_ENCODE_OPTIONS.maxBignumBytes

  /**
   * Encode unsigned integer (Major Type 0)
   *
   * Encoding rules:
   * - 0-23: Direct encoding in initial byte (0x00-0x17)
   * - 24-255: 0x18 + 1 byte
   * - 256-65535: 0x19 + 2 bytes
   * - 65536-4294967295: 0x1a + 4 bytes
   * - 4294967296-2^64-1: 0x1b + 8 bytes
   *
   * @param value - Unsigned integer (0 to 2^64-1)
   * @returns Encoded CBOR bytes and hex string
   * @throws Error if value is negative or >= 2^64
   */
  const encodeUnsignedInt = (value: number | bigint): EncodeResult => {
    // Convert to BigInt for consistent handling
    const bigValue = typeof value === 'bigint' ? value : BigInt(value)

    // Validate value is non-negative
    if (bigValue < 0n) {
      throw new Error('Cannot encode negative value as unsigned integer')
    }

    // Validate value doesn't exceed 2^64-1
    const MAX_UINT64 = 18446744073709551615n  // 2^64 - 1
    if (bigValue > MAX_UINT64) {
      throw new Error('Value exceeds maximum unsigned integer (2^64-1)')
    }

    let bytes: Uint8Array

    // Direct encoding (0-23)
    if (bigValue <= 23n) {
      bytes = new Uint8Array([Number(bigValue)])
    }
    // 1-byte encoding (24-255)
    else if (bigValue <= 255n) {
      bytes = new Uint8Array([0x18, Number(bigValue)])
    }
    // 2-byte encoding (256-65535)
    else if (bigValue <= 65535n) {
      const valueBytes = writeUint(Number(bigValue), 2)
      bytes = new Uint8Array([0x19, ...valueBytes])
    }
    // 4-byte encoding (65536-4294967295)
    else if (bigValue <= 4294967295n) {
      const valueBytes = writeUint(Number(bigValue), 4)
      bytes = new Uint8Array([0x1a, ...valueBytes])
    }
    // 8-byte encoding (> 4294967295)
    else {
      const valueBytes = writeBigUint(bigValue, 8)
      bytes = new Uint8Array([0x1b, ...valueBytes])
    }

    return {
      bytes,
      hex: bytesToHex(bytes)
    }
  }

  /**
   * Encode negative integer (Major Type 1)
   *
   * CBOR encodes negative integers as: -1 - N
   * where N is the encoded value
   *
   * Encoding rules:
   * - -1 to -24: Direct encoding in initial byte (0x20-0x37)
   * - -25 to -256: 0x38 + 1 byte
   * - -257 to -65536: 0x39 + 2 bytes
   * - -65537 to -4294967296: 0x3a + 4 bytes
   * - -4294967297 to -2^64: 0x3b + 8 bytes
   *
   * @param value - Negative integer (-1 to -2^64)
   * @returns Encoded CBOR bytes and hex string
   * @throws Error if value is non-negative or < -2^64
   */
  const encodeNegativeInt = (value: number | bigint): EncodeResult => {
    // Convert to BigInt for consistent handling
    const bigValue = typeof value === 'bigint' ? value : BigInt(value)

    // Validate value is negative
    if (bigValue >= 0n) {
      throw new Error('Cannot encode positive value as negative integer')
    }

    // Validate value doesn't exceed -2^64
    const MIN_INT64 = -18446744073709551616n  // -2^64
    if (bigValue < MIN_INT64) {
      throw new Error('Value exceeds minimum negative integer (-2^64)')
    }

    // CBOR encodes negative as: -1 - N
    // So for value V, we encode N = -1 - V
    const encoded = -1n - bigValue

    let bytes: Uint8Array

    // Direct encoding (-1 to -24, encoded as 0-23)
    if (encoded <= 23n) {
      bytes = new Uint8Array([0x20 + Number(encoded)])
    }
    // 1-byte encoding (-25 to -256, encoded as 24-255)
    else if (encoded <= 255n) {
      bytes = new Uint8Array([0x38, Number(encoded)])
    }
    // 2-byte encoding (-257 to -65536, encoded as 256-65535)
    else if (encoded <= 65535n) {
      const valueBytes = writeUint(Number(encoded), 2)
      bytes = new Uint8Array([0x39, ...valueBytes])
    }
    // 4-byte encoding (-65537 to -4294967296, encoded as 65536-4294967295)
    else if (encoded <= 4294967295n) {
      const valueBytes = writeUint(Number(encoded), 4)
      bytes = new Uint8Array([0x3a, ...valueBytes])
    }
    // 8-byte encoding (< -4294967296)
    else {
      const valueBytes = writeBigUint(encoded, 8)
      bytes = new Uint8Array([0x3b, ...valueBytes])
    }

    return {
      bytes,
      hex: bytesToHex(bytes)
    }
  }

  /**
   * Encode integer (auto-detect type)
   *
   * Automatically selects Major Type 0 (unsigned) or Major Type 1 (negative)
   * based on the sign of the value.
   *
   * @param value - Any integer
   * @returns Encoded CBOR bytes and hex string
   */
  const encodeInteger = (value: number | bigint): EncodeResult => {
    const bigValue = typeof value === 'bigint' ? value : BigInt(value)

    // Bigints outside the 64-bit CBOR integer range are automatically encoded
    // as bignums (tag 2 for positive, tag 3 for negative, RFC 8949 §3.4.3).
    // Values that DO fit in 64 bits always use major type 0/1 (preferred
    // serialization, RFC 8949 §4.2.1) — never tags 2/3.
    if (bigValue > MAX_UINT64 || bigValue < MIN_INT64) {
      return encodeBignum(bigValue)
    }

    if (bigValue < 0n) {
      return encodeNegativeInt(bigValue)
    } else {
      return encodeUnsignedInt(bigValue)
    }
  }

  /**
   * Encode a bigint as a CBOR bignum (tag 2 = positive, tag 3 = negative).
   *
   * Content is a byte string holding the minimal-length big-endian magnitude
   * (n for tag 2, -1-n for tag 3), with no leading zero bytes per the
   * deterministic encoding rules (RFC 8949 §4.2.1).
   *
   * @param value - Any bigint (typically outside the ±2^64 range)
   * @returns Encoded CBOR bytes and hex string
   * @throws Error if the magnitude exceeds maxBignumBytes
   */
  const encodeBignum = (value: bigint): EncodeResult => {
    const isNegative = value < 0n
    const magnitude = isNegative ? -1n - value : value
    const content = bigintToMinimalBytes(magnitude)

    if (content.length > maxBignumBytes) {
      throw new Error(
        `Bignum size ${content.length} bytes exceeds limit of ${maxBignumBytes} bytes`
      )
    }

    // Tag header: 0xc2 (tag 2, positive) or 0xc3 (tag 3, negative)
    const tagByte = isNegative ? 0xc3 : 0xc2

    // Byte string header (major type 2) for the content length
    let header: number[]
    if (content.length <= 23) {
      header = [0x40 | content.length]
    } else if (content.length <= 255) {
      header = [0x58, content.length]
    } else if (content.length <= 65535) {
      header = [0x59, (content.length >> 8) & 0xff, content.length & 0xff]
    } else {
      header = [
        0x5a,
        (content.length >>> 24) & 0xff,
        (content.length >> 16) & 0xff,
        (content.length >> 8) & 0xff,
        content.length & 0xff
      ]
    }

    const bytes = new Uint8Array(1 + header.length + content.length)
    bytes[0] = tagByte
    bytes.set(header, 1)
    bytes.set(content, 1 + header.length)

    return {
      bytes,
      hex: bytesToHex(bytes)
    }
  }

  return {
    encodeUnsignedInt,
    encodeNegativeInt,
    encodeInteger,
    encodeBignum
  }
}
