/**
 * CBOR Float and Simple Values Parser Composable
 * Handles Major Type 7 (Simple Values and Floats)
 * Supports Float16, Float32, Float64, and simple values (true, false, null, undefined)
 */

import type { ParseResult, ParseOptions } from '../types'
import { hexToBytes, readByte, extractCborHeader } from '../utils'

/**
 * Composable for parsing CBOR floats and simple values (Major Type 7)
 *
 * @returns Object with parse, parseFloat, and parseSimple functions
 *
 * @example
 * ```ts
 * const { parse } = useCborFloat()
 * const result = parse('f5') // true
 * ```
 */
export function useCborFloat() {
  /**
   * Converts IEEE 754 binary16 (Float16) to JavaScript number
   * Manual conversion required as JavaScript doesn't have native Float16 support
   *
   * @param buffer - Data buffer
   * @param offset - Starting offset
   * @returns Float64 number representation
   */
  const float16ToFloat64 = (buffer: Uint8Array, offset: number): number => {
    // Read 16-bit value in big-endian
    const byte1 = readByte(buffer, offset)
    const byte2 = readByte(buffer, offset + 1)
    const value = (byte1 << 8) | byte2

    // Extract components
    const sign = (value & 0x8000) >> 15
    const exponent = (value & 0x7c00) >> 10
    const fraction = value & 0x03ff

    // Handle special cases
    if (exponent === 0) {
      if (fraction === 0) {
        // Zero (positive or negative)
        return sign === 0 ? 0.0 : -0.0
      }
      // Subnormal number
      return (sign === 0 ? 1 : -1) * Math.pow(2, -14) * (fraction / 1024)
    }

    if (exponent === 0x1f) {
      if (fraction === 0) {
        // Infinity (positive or negative)
        return sign === 0 ? Infinity : -Infinity
      }
      // NaN
      return NaN
    }

    // Normal number
    // Formula: (-1)^sign * 2^(exponent - 15) * (1 + fraction/1024)
    return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - 15) * (1 + fraction / 1024)
  }

  const isNegativeZero = (value: number): boolean => Object.is(value, -0)

  const encodeFloat16Bytes = (value: number): Uint8Array => {
    if (isNegativeZero(value)) return new Uint8Array([0x80, 0x00])
    if (value === 0) return new Uint8Array([0x00, 0x00])
    if (Number.isNaN(value)) return new Uint8Array([0x7e, 0x00])
    if (value === Infinity) return new Uint8Array([0x7c, 0x00])
    if (value === -Infinity) return new Uint8Array([0xfc, 0x00])

    const sign = value < 0 ? 1 : 0
    const absValue = Math.abs(value)

    const buffer = new ArrayBuffer(8)
    const view = new DataView(buffer)
    view.setFloat64(0, absValue, false)

    const bits = view.getBigUint64(0, false)
    const exp64 = Number((bits >> 52n) & 0x7ffn) - 1023
    const mant64 = Number(bits & 0xfffffffffffffn)

    let exp16: number
    let mant16: number

    if (exp64 < -14) {
      exp16 = 0
      mant16 = 0
    } else if (exp64 > 15) {
      exp16 = 31
      mant16 = 0
    } else {
      exp16 = exp64 + 15
      mant16 = mant64 >> 42
    }

    const float16 = (sign << 15) | (exp16 << 10) | mant16

    return new Uint8Array([
      (float16 >> 8) & 0xff,
      float16 & 0xff
    ])
  }

  const canBeFloat16 = (value: number): boolean => {
    if (Number.isNaN(value)) return true
    if (!Number.isFinite(value) || Object.is(value, 0) || isNegativeZero(value)) {
      return true
    }

    const absValue = Math.abs(value)
    if (absValue < 0.00006103515625 || absValue > 65504) {
      return false
    }

    const bytes = encodeFloat16Bytes(value)
    const decoded = float16ToFloat64(bytes, 0)
    return Object.is(decoded, value)
  }

  const canBeFloat32 = (value: number): boolean => {
    if (Number.isNaN(value)) return true
    if (!Number.isFinite(value) || Object.is(value, 0) || isNegativeZero(value)) {
      return true
    }

    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)
    view.setFloat32(0, value, false)
    const decoded = view.getFloat32(0, false)

    return Object.is(decoded, value)
  }

  /**
   * Parses simple values (booleans, null, undefined, unassigned)
   *
   * @param buffer - Data buffer
   * @param offset - Current offset
   * @returns Parsed simple value and bytes read
   */
  const parseSimpleFromBuffer = (buffer: Uint8Array, offset: number): ParseResult => {
    const initialByte = readByte(buffer, offset)
    const { majorType, additionalInfo } = extractCborHeader(initialByte)

    if (majorType !== 7) {
      throw new Error(`Expected major type 7 (simple/float), got ${majorType}`)
    }

    // Simple values based on additional info
    if (additionalInfo < 20) {
      // Unassigned simple values (0-19)
      return {
        value: { simpleValue: additionalInfo },
        bytesRead: 1
      }
    }

    switch (additionalInfo) {
      case 20: // false
        return { value: false, bytesRead: 1 }

      case 21: // true
        return { value: true, bytesRead: 1 }

      case 22: // null
        return { value: null, bytesRead: 1 }

      case 23: // undefined
        return { value: undefined, bytesRead: 1 }

      case 24: // 1-byte simple value
        {
          if (offset + 1 >= buffer.length) {
            throw new Error('Unexpected end of buffer while reading simple value')
          }
          const simpleValue = readByte(buffer, offset + 1)
          // Simple values 0-19 should not use 1-byte encoding
          if (simpleValue < 32) {
            throw new Error(`Invalid 1-byte encoding for simple value ${simpleValue}`)
          }
          return {
            value: { simpleValue },
            bytesRead: 2
          }
        }

      case 25: // Float16
      case 26: // Float32
      case 27: // Float64
        // These are floats, not simple values - should use parseFloatFromBuffer
        throw new Error(`Additional info ${additionalInfo} is a float, use parseFloat instead`)

      case 28:
      case 29:
      case 30:
        // Reserved
        throw new Error(`Reserved additional info value: ${additionalInfo}`)

      case 31: // Break marker
        throw new Error('Break marker (0xff) should only appear in indefinite-length items')

      default:
        throw new Error(`Invalid additional info: ${additionalInfo}`)
    }
  }

  /**
   * Parses floating point numbers (Float16, Float32, Float64)
   *
   * @param buffer - Data buffer
   * @param offset - Current offset
   * @returns Parsed float and bytes read
   */
  const parseFloatFromBuffer = (buffer: Uint8Array, offset: number, options?: ParseOptions): ParseResult => {
    const initialByte = readByte(buffer, offset)
    const { majorType, additionalInfo } = extractCborHeader(initialByte)

    if (majorType !== 7) {
      throw new Error(`Expected major type 7 (simple/float), got ${majorType}`)
    }

    switch (additionalInfo) {
      case 25: // Float16 (2 bytes)
        {
          if (offset + 2 >= buffer.length) {
            throw new Error('Unexpected end of buffer while reading Float16')
          }
          const value = float16ToFloat64(buffer, offset + 1)
          return { value, bytesRead: 3 }
        }

      case 26: // Float32 (4 bytes)
        {
          if (offset + 4 >= buffer.length) {
            throw new Error('Unexpected end of buffer while reading Float32')
          }
          // Use DataView for proper IEEE 754 parsing
          const dataView = new DataView(buffer.buffer, buffer.byteOffset + offset + 1, 4)
          const value = dataView.getFloat32(0, false) // false = big-endian
          if (options?.validateCanonical) {
            if (Number.isNaN(value)) {
              throw new Error('Non-canonical NaN encoding: use float16 NaN')
            }
            if (canBeFloat16(value)) {
              throw new Error('Non-canonical float encoding: value fits in float16')
            }
          }
          return { value, bytesRead: 5 }
        }

      case 27: // Float64 (8 bytes)
        {
          if (offset + 8 >= buffer.length) {
            throw new Error('Unexpected end of buffer while reading Float64')
          }
          // Use DataView for proper IEEE 754 parsing
          const dataView = new DataView(buffer.buffer, buffer.byteOffset + offset + 1, 8)
          const value = dataView.getFloat64(0, false) // false = big-endian
          if (options?.validateCanonical) {
            if (Number.isNaN(value)) {
              throw new Error('Non-canonical NaN encoding: use float16 NaN')
            }
            if (canBeFloat16(value) || canBeFloat32(value)) {
              throw new Error('Non-canonical float encoding: value fits in float16/float32')
            }
          }
          return { value, bytesRead: 9 }
        }

      default:
        throw new Error(`Additional info ${additionalInfo} is not a float type`)
    }
  }

  /**
   * Auto-detects and parses any Major Type 7 value (simple or float)
   *
   * @param buffer - Data buffer
   * @param offset - Current offset
   * @returns Parsed value and bytes read
   */
  const parseFromBuffer = (buffer: Uint8Array, offset: number, options?: ParseOptions): ParseResult => {
    const initialByte = readByte(buffer, offset)
    const { majorType, additionalInfo } = extractCborHeader(initialByte)

    if (majorType !== 7) {
      throw new Error(`Expected major type 7 (simple/float), got ${majorType}`)
    }

    // Determine if it's a float or simple value based on additional info
    if (additionalInfo === 25 || additionalInfo === 26 || additionalInfo === 27) {
      // Float16, Float32, or Float64
      return parseFloatFromBuffer(buffer, offset, options)
    } else {
      // Simple value (including false, true, null, undefined)
      return parseSimpleFromBuffer(buffer, offset)
    }
  }

  /**
   * Parses CBOR simple value from hex string
   *
   * @param hexString - CBOR hex string
   * @param _options - Parser options (optional, for future use)
   * @returns Parsed simple value and bytes read
   */
  const parseSimple = (hexString: string, _options?: ParseOptions): ParseResult => {
    const buffer = hexToBytes(hexString)
    return parseSimpleFromBuffer(buffer, 0)
  }

  /**
   * Parses CBOR float from hex string
   *
   * @param hexString - CBOR hex string
   * @param _options - Parser options (optional, for future use)
   * @returns Parsed float and bytes read
   */
  const parseFloat = (hexString: string, options?: ParseOptions): ParseResult => {
    const buffer = hexToBytes(hexString)
    return parseFloatFromBuffer(buffer, 0, options)
  }

  /**
   * Auto-detects and parses any Major Type 7 value from hex string
   *
   * @param hexString - CBOR hex string
   * @param _options - Parser options (optional, for future use)
   * @returns Parsed value and bytes read
   */
  const parse = (hexString: string, options?: ParseOptions): ParseResult => {
    const buffer = hexToBytes(hexString)
    return parseFromBuffer(buffer, 0, options)
  }

  return {
    parse,
    parseFloat,
    parseSimple
  }
}
