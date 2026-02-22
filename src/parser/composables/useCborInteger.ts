/**
 * CBOR Integer Parser Composable
 * Handles Major Types 0 (Unsigned) and 1 (Negative)
 * Supports BigInt for 64-bit values outside Number.MAX_SAFE_INTEGER
 */

import type { ParseResult, ParseOptions } from '../types'
import { hexToBytes, readByte, readUint, readBigUint, extractCborHeader, validateCanonicalInteger } from '../utils'

/**
 * Composable for parsing CBOR integers (Major Types 0 and 1)
 * 
 * @returns Object with parseInteger function
 * 
 * @example
 * ```ts
 * const { parseInteger } = useCborInteger()
 * const result = parseInteger('1864') // 100
 * ```
 */
export function useCborInteger() {
  /**
   * Parses CBOR integer (Major Type 0 or 1) from a buffer at a given offset
   *
   * @param buffer - Data buffer
   * @param offset - Current offset into the buffer
   * @param options - Parser options (optional)
   * @returns Parsed integer value and bytes read
   */
  const parseIntegerFromBuffer = (buffer: Uint8Array, offset: number, options?: ParseOptions): ParseResult => {
    const initialByte = readByte(buffer, offset)

    const { majorType, additionalInfo } = extractCborHeader(initialByte)

    // Get the raw value based on additional info
    let rawValue: number | bigint
    let bytesRead: number

    if (additionalInfo < 24) {
      // Direct encoding (0-23)
      rawValue = additionalInfo
      bytesRead = 1
    } else if (additionalInfo === 24) {
      // 1 byte follows
      rawValue = readByte(buffer, offset + 1)
      bytesRead = 2
    } else if (additionalInfo === 25) {
      // 2 bytes follow
      rawValue = readUint(buffer, offset + 1, 2)
      bytesRead = 3
    } else if (additionalInfo === 26) {
      // 4 bytes follow
      rawValue = readUint(buffer, offset + 1, 4)
      bytesRead = 5
    } else if (additionalInfo === 27) {
      // 8 bytes follow - use BigInt for large values
      const bigValue = readBigUint(buffer, offset + 1, 8)

      // Check if value fits in Number.MAX_SAFE_INTEGER
      if (bigValue <= BigInt(Number.MAX_SAFE_INTEGER)) {
        rawValue = Number(bigValue)
      } else {
        rawValue = bigValue
      }
      bytesRead = 9
    } else {
      throw new Error(`Invalid additional info: ${additionalInfo}`)
    }

    // Validate canonical encoding if requested
    if (options?.validateCanonical) {
      validateCanonicalInteger(rawValue, additionalInfo)
    }

    // Calculate final value based on major type
    let finalValue: number | bigint

    if (majorType === 0) {
      // Unsigned integer
      finalValue = rawValue
    } else if (majorType === 1) {
      // Negative integer: -1 - N
      if (typeof rawValue === 'bigint') {
        const negValue = -1n - rawValue
        // Check if result fits in safe integer range
        if (negValue >= BigInt(Number.MIN_SAFE_INTEGER) && negValue <= BigInt(Number.MAX_SAFE_INTEGER)) {
          finalValue = Number(negValue)
        } else {
          finalValue = negValue
        }
      } else {
        const negValue = -1 - rawValue
        // Check if the negative value is still within safe integer range
        if (negValue >= Number.MIN_SAFE_INTEGER) {
          finalValue = negValue
        } else {
          // Convert to BigInt if outside safe range
          finalValue = BigInt(negValue)
        }
      }
    } else {
      throw new Error(`Expected major type 0 or 1, got ${majorType}`)
    }

    return {
      value: finalValue,
      bytesRead
    }
  }

  /**
   * Parses CBOR integer (Major Type 0 or 1) from hex string
   * Thin wrapper around parseIntegerFromBuffer
   *
   * @param hexString - CBOR hex string
   * @param options - Parser options (optional)
   * @returns Parsed integer value and bytes read
   */
  const parseInteger = (hexString: string, options?: ParseOptions): ParseResult => {
    const buffer = hexToBytes(hexString)
    return parseIntegerFromBuffer(buffer, 0, options)
  }

  return {
    parseInteger,
    parseIntegerFromBuffer
  }
}
