/**
 * CBOR Tag Encoder Composable
 * Handles Major Type 6 (Semantic Tags)
 * Following RFC 8949 specification
 */

import type { EncodeResult, TaggedValue, EncodableValue } from '../types'
import { bytesToHex, writeUint, writeBigUint } from '../utils'
import { bigintToMinimalBytes } from './useCborIntegerEncoder'

/**
 * CBOR Tag Encoder Composable
 *
 * Provides functions to encode tagged values to CBOR format:
 * - Major Type 6: Semantic tags (0 to 2^64-1)
 *
 * Tags provide semantic meaning to CBOR values:
 * - Tag 0: Date/time string (RFC 3339)
 * - Tag 1: Epoch timestamp
 * - Tag 2: Positive bignum
 * - Tag 3: Negative bignum
 * - Tag 258: Cardano set (CIP-0005)
 * - And many more...
 *
 * @example
 * ```ts
 * const { encodeTag } = useCborTagEncoder()
 *
 * // Encode date/time string (tag 0)
 * const result1 = encodeTag(0, '2013-03-21T20:04:00Z', encode)
 * // result1.hex: 'c074323031332d30332d32315432303a30343a30305a'
 *
 * // Encode positive bignum (tag 2)
 * const result2 = encodeTag(2, new Uint8Array([0x01, 0xff]), encode)
 * // result2.hex: 'c24201ff'
 *
 * // Encode Cardano set (tag 258)
 * const result3 = encodeTag(258, [1, 2, 3], encode)
 * // result3.hex: 'd9010283010203'
 * ```
 */
export function useCborTagEncoder() {
  /**
   * Encode tag number (Major Type 6 header)
   *
   * Tag numbers use the same encoding rules as unsigned integers:
   * - 0-23: Direct encoding in initial byte (0xc0-0xd7)
   * - 24-255: 0xd8 + 1 byte
   * - 256-65535: 0xd9 + 2 bytes
   * - 65536-4294967295: 0xda + 4 bytes
   * - 4294967296-2^64-1: 0xdb + 8 bytes
   *
   * @param tagNumber - Tag number (0 to 2^64-1)
   * @returns Encoded tag header bytes
   * @throws Error if tag number is negative or >= 2^64
   */
  const encodeTagNumber = (tagNumber: number | bigint): Uint8Array => {
    if (typeof tagNumber === 'number' && !Number.isSafeInteger(tagNumber)) throw new Error('Tag number must be a safe integer or bigint')
    // Convert to BigInt for consistent handling
    const bigTag = typeof tagNumber === 'bigint' ? tagNumber : BigInt(tagNumber)

    // Validate tag is non-negative
    if (bigTag < 0n) {
      throw new Error('Tag number cannot be negative')
    }

    // Validate tag doesn't exceed 2^64-1
    const MAX_UINT64 = 18446744073709551615n  // 2^64 - 1
    if (bigTag > MAX_UINT64) {
      throw new Error('Tag number exceeds maximum (2^64-1)')
    }

    let bytes: Uint8Array

    // Direct encoding (0-23) - Major type 6 (0xc0) + tag number
    if (bigTag <= 23n) {
      bytes = new Uint8Array([0xc0 + Number(bigTag)])
    }
    // 1-byte encoding (24-255) - 0xd8 + 1 byte
    else if (bigTag <= 255n) {
      bytes = new Uint8Array([0xd8, Number(bigTag)])
    }
    // 2-byte encoding (256-65535) - 0xd9 + 2 bytes
    else if (bigTag <= 65535n) {
      const valueBytes = writeUint(Number(bigTag), 2)
      bytes = new Uint8Array([0xd9, ...valueBytes])
    }
    // 4-byte encoding (65536-4294967295) - 0xda + 4 bytes
    else if (bigTag <= 4294967295n) {
      const valueBytes = writeUint(Number(bigTag), 4)
      bytes = new Uint8Array([0xda, ...valueBytes])
    }
    // 8-byte encoding (> 4294967295) - 0xdb + 8 bytes
    else {
      const valueBytes = writeBigUint(bigTag, 8)
      bytes = new Uint8Array([0xdb, ...valueBytes])
    }

    return bytes
  }

  /**
   * Encode tagged value (tag + content)
   *
   * A tagged value consists of:
   * 1. Tag number (Major Type 6 header)
   * 2. Tagged content (recursively encoded value)
   *
   * The encode function is passed as a parameter to avoid circular dependencies.
   *
   * @param tagNumber - Tag number
   * @param value - Value to tag
   * @param encode - Encoder function for the tagged value
   * @returns Encoded CBOR bytes and hex string
   */
  const encodeTag = (
    tagNumber: number | bigint,
    value: EncodableValue,
    encode: (value: EncodableValue) => EncodeResult
  ): EncodeResult => {
    // Encode tag number
    const tagBytes = encodeTagNumber(tagNumber)

    // Bignum tags (2/3) semantically contain a byte string. The decoder
    // converts that byte string to a BigInt ({ tag: 2, value: 2n**70n }), so
    // accept the BigInt form here and re-emit the minimal-length big-endian
    // byte string (round-trip support, RFC 8949 §3.4.3).
    let contentValue = value
    const numericTag = typeof tagNumber === 'bigint' ? Number(tagNumber) : tagNumber
    if ((numericTag === 2 || numericTag === 3) && typeof value === 'bigint') {
      if (numericTag === 2 && value < 0n) {
        throw new Error('Tag 2 (positive bignum) cannot contain a negative bigint')
      }
      if (numericTag === 3 && value >= 0n) {
        throw new Error('Tag 3 (negative bignum) requires a negative bigint')
      }
      const magnitude = numericTag === 2 ? value : -1n - value
      contentValue = bigintToMinimalBytes(magnitude)
    }

    // Recursively encode the tagged value
    const valueResult = encode(contentValue)

    // Concatenate tag header + value bytes
    const totalLength = tagBytes.length + valueResult.bytes.length
    const bytes = new Uint8Array(totalLength)
    bytes.set(tagBytes, 0)
    bytes.set(valueResult.bytes, tagBytes.length)

    return {
      bytes,
      hex: bytesToHex(bytes)
    }
  }

  /**
   * Encode TaggedValue object
   *
   * Convenience function for encoding { tag, value } objects.
   *
   * @param taggedValue - Object with tag and value properties
   * @param encode - Encoder function for the tagged value
   * @returns Encoded CBOR bytes and hex string
   */
  const encodeTaggedValue = (
    taggedValue: TaggedValue,
    encode: (value: EncodableValue) => EncodeResult
  ): EncodeResult => {
    return encodeTag(taggedValue.tag, taggedValue.value, encode)
  }

  return {
    encodeTagNumber,
    encodeTag,
    encodeTaggedValue
  }
}
