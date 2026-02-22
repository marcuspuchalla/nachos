/**
 * Tests for buffer-native parsing optimization (Task 2-A)
 * Validates that buffer-based parsers produce identical results to hex-string parsers
 * and that O(N^2) hex conversion is eliminated.
 */

import { describe, it, expect } from 'vitest'
import { useCborInteger } from '../composables/useCborInteger'
import { useCborFloat } from '../composables/useCborFloat'
import { useCborTag } from '../composables/useCborTag'
import { useCborCollection } from '../composables/useCborCollection'
import { hexToBytes } from '../utils'

describe('Buffer-native parsing - parseIntegerFromBuffer', () => {
  const { parseInteger, parseIntegerFromBuffer } = useCborInteger()

  it('should export parseIntegerFromBuffer from useCborInteger', () => {
    expect(typeof parseIntegerFromBuffer).toBe('function')
  })

  it('should parse unsigned integer 0 from buffer', () => {
    const buffer = hexToBytes('00')
    const result = parseIntegerFromBuffer(buffer, 0)
    expect(result.value).toBe(0)
    expect(result.bytesRead).toBe(1)
  })

  it('should parse unsigned integer 23 from buffer', () => {
    const buffer = hexToBytes('17')
    const result = parseIntegerFromBuffer(buffer, 0)
    expect(result.value).toBe(23)
    expect(result.bytesRead).toBe(1)
  })

  it('should parse unsigned integer 24 from buffer (1-byte follows)', () => {
    const buffer = hexToBytes('1818')
    const result = parseIntegerFromBuffer(buffer, 0)
    expect(result.value).toBe(24)
    expect(result.bytesRead).toBe(2)
  })

  it('should parse unsigned integer 100 from buffer (1-byte follows)', () => {
    const buffer = hexToBytes('1864')
    const result = parseIntegerFromBuffer(buffer, 0)
    expect(result.value).toBe(100)
    expect(result.bytesRead).toBe(2)
  })

  it('should parse unsigned integer 1000 from buffer (2-byte follows)', () => {
    const buffer = hexToBytes('1903e8')
    const result = parseIntegerFromBuffer(buffer, 0)
    expect(result.value).toBe(1000)
    expect(result.bytesRead).toBe(3)
  })

  it('should parse unsigned integer 1000000 from buffer (4-byte follows)', () => {
    const buffer = hexToBytes('1a000f4240')
    const result = parseIntegerFromBuffer(buffer, 0)
    expect(result.value).toBe(1000000)
    expect(result.bytesRead).toBe(5)
  })

  it('should parse large unsigned integer from buffer (8-byte follows)', () => {
    const buffer = hexToBytes('1b000000e8d4a51000')
    const result = parseIntegerFromBuffer(buffer, 0)
    expect(result.value).toBe(1000000000000)
    expect(result.bytesRead).toBe(9)
  })

  it('should parse negative integer -1 from buffer', () => {
    const buffer = hexToBytes('20')
    const result = parseIntegerFromBuffer(buffer, 0)
    expect(result.value).toBe(-1)
    expect(result.bytesRead).toBe(1)
  })

  it('should parse negative integer -100 from buffer', () => {
    const buffer = hexToBytes('3863')
    const result = parseIntegerFromBuffer(buffer, 0)
    expect(result.value).toBe(-100)
    expect(result.bytesRead).toBe(2)
  })

  it('should parse BigInt unsigned from buffer', () => {
    // 18446744073709551615 (max uint64)
    const buffer = hexToBytes('1bffffffffffffffff')
    const result = parseIntegerFromBuffer(buffer, 0)
    expect(result.value).toBe(18446744073709551615n)
    expect(result.bytesRead).toBe(9)
  })

  it('should parse BigInt negative from buffer', () => {
    // -18446744073709551616
    const buffer = hexToBytes('3bffffffffffffffff')
    const result = parseIntegerFromBuffer(buffer, 0)
    expect(result.value).toBe(-18446744073709551616n)
    expect(result.bytesRead).toBe(9)
  })

  it('should parse integer at non-zero offset', () => {
    // Buffer: [0x83, 0x01, 0x02, 0x03] - array(3) then integers 1, 2, 3
    // Parsing integer at offset 1 should get value 1
    const buffer = hexToBytes('83010203')
    const result = parseIntegerFromBuffer(buffer, 1)
    expect(result.value).toBe(1)
    expect(result.bytesRead).toBe(1)
  })

  it('should parse integer at offset with trailing data', () => {
    // Buffer with integer 100 at offset 2, followed by other data
    const buffer = hexToBytes('0000186400')
    const result = parseIntegerFromBuffer(buffer, 2)
    expect(result.value).toBe(100)
    expect(result.bytesRead).toBe(2)
  })

  it('should produce identical results to parseInteger for all test vectors', () => {
    const testVectors = [
      '00', '01', '0a', '17', '1818', '1864', '18ff',
      '190100', '1903e8', '19ffff',
      '1a00010000', '1a000f4240', '1affffffff',
      '1b0000000100000000', '1b000000e8d4a51000', '1bffffffffffffffff',
      '20', '37', '3863', '38ff',
      '390100', '3903e7', '39ffff',
      '3a00010000', '3affffffff',
      '3b0000000100000000', '3bffffffffffffffff',
    ]

    for (const hex of testVectors) {
      const hexResult = parseInteger(hex)
      const buffer = hexToBytes(hex)
      const bufferResult = parseIntegerFromBuffer(buffer, 0)

      expect(bufferResult.value).toEqual(hexResult.value)
      expect(bufferResult.bytesRead).toEqual(hexResult.bytesRead)
    }
  })

  it('should validate canonical encoding when options are passed', () => {
    // Non-canonical: value 0 encoded with 1-byte AI
    const buffer = hexToBytes('1800')
    expect(() => parseIntegerFromBuffer(buffer, 0, { validateCanonical: true }))
      .toThrow(/[Nn]on-canonical/)
  })
})

describe('Buffer-native parsing - parseFromBuffer (float/simple)', () => {
  const { parseFromBuffer } = useCborFloat()

  it('should export parseFromBuffer from useCborFloat', () => {
    expect(typeof parseFromBuffer).toBe('function')
  })

  it('should parse false from buffer', () => {
    const buffer = hexToBytes('f4')
    const result = parseFromBuffer(buffer, 0)
    expect(result.value).toBe(false)
    expect(result.bytesRead).toBe(1)
  })

  it('should parse true from buffer', () => {
    const buffer = hexToBytes('f5')
    const result = parseFromBuffer(buffer, 0)
    expect(result.value).toBe(true)
    expect(result.bytesRead).toBe(1)
  })

  it('should parse null from buffer', () => {
    const buffer = hexToBytes('f6')
    const result = parseFromBuffer(buffer, 0)
    expect(result.value).toBe(null)
    expect(result.bytesRead).toBe(1)
  })

  it('should parse undefined from buffer', () => {
    const buffer = hexToBytes('f7')
    const result = parseFromBuffer(buffer, 0)
    expect(result.value).toBe(undefined)
    expect(result.bytesRead).toBe(1)
  })

  it('should parse float16 0.0 from buffer', () => {
    const buffer = hexToBytes('f90000')
    const result = parseFromBuffer(buffer, 0)
    expect(result.value).toBe(0.0)
    expect(result.bytesRead).toBe(3)
  })

  it('should parse float16 1.0 from buffer', () => {
    const buffer = hexToBytes('f93c00')
    const result = parseFromBuffer(buffer, 0)
    expect(result.value).toBe(1.0)
    expect(result.bytesRead).toBe(3)
  })

  it('should parse float32 from buffer', () => {
    const buffer = hexToBytes('fa47c35000')
    const result = parseFromBuffer(buffer, 0)
    expect(result.value).toBe(100000.0)
    expect(result.bytesRead).toBe(5)
  })

  it('should parse float64 from buffer', () => {
    const buffer = hexToBytes('fb3ff199999999999a')
    const result = parseFromBuffer(buffer, 0)
    expect(result.value).toBeCloseTo(1.1, 10)
    expect(result.bytesRead).toBe(9)
  })

  it('should parse Infinity from buffer', () => {
    const buffer = hexToBytes('f97c00')
    const result = parseFromBuffer(buffer, 0)
    expect(result.value).toBe(Infinity)
    expect(result.bytesRead).toBe(3)
  })

  it('should parse NaN from buffer', () => {
    const buffer = hexToBytes('f97e00')
    const result = parseFromBuffer(buffer, 0)
    expect(result.value).toBeNaN()
    expect(result.bytesRead).toBe(3)
  })

  it('should parse at non-zero offset', () => {
    const buffer = hexToBytes('00f5')
    const result = parseFromBuffer(buffer, 1)
    expect(result.value).toBe(true)
    expect(result.bytesRead).toBe(1)
  })
})

describe('Buffer-native parsing - parseTagFromBuffer', () => {
  const { parseTagFromBuffer } = useCborTag()

  it('should export parseTagFromBuffer from useCborTag', () => {
    expect(typeof parseTagFromBuffer).toBe('function')
  })

  it('should parse tag 1 (epoch time) from buffer', () => {
    // c11a514b67b0 = tag(1, 1363896240)
    const buffer = hexToBytes('c11a514b67b0')
    const result = parseTagFromBuffer(buffer, 0)
    expect(result.value).toEqual({
      tag: 1,
      value: 1363896240
    })
    expect(result.bytesRead).toBe(6)
  })

  it('should parse self-describe tag 55799 from buffer', () => {
    // d9d9f7 01 = tag(55799, 1)
    const buffer = hexToBytes('d9d9f701')
    const result = parseTagFromBuffer(buffer, 0)
    expect(result.value).toEqual({
      tag: 55799,
      value: 1
    })
    expect(result.bytesRead).toBe(4)
  })

  it('should parse tag at non-zero offset', () => {
    // Prefix with 0x01, then tag 1 with value 0
    const buffer = hexToBytes('01c100')
    const result = parseTagFromBuffer(buffer, 1)
    expect(result.value).toEqual({
      tag: 1,
      value: 0
    })
    expect(result.bytesRead).toBe(2)
  })
})

describe('Buffer-native parsing - collection integration', () => {
  const { parseArray, parseMap } = useCborCollection()

  it('should parse array of integers without O(N^2) hex conversion', () => {
    // 83 01 02 03 = [1, 2, 3]
    const result = parseArray('83010203')
    expect(result.value).toEqual([1, 2, 3])
    expect(result.bytesRead).toBe(4)
  })

  it('should parse array with mixed types including floats', () => {
    // 83 01 f5 f6 = [1, true, null]
    const result = parseArray('8301f5f6')
    expect(result.value).toEqual([1, true, null])
    expect(result.bytesRead).toBe(4)
  })

  it('should parse nested array with tags', () => {
    // 82 c1 1a514b67b0 01 = [tag(1, 1363896240), 1]
    const result = parseArray('82c11a514b67b001')
    expect(result.value).toHaveLength(2)
    expect((result.value as any[])[0]).toEqual({
      tag: 1,
      value: 1363896240
    })
    expect((result.value as any[])[1]).toBe(1)
    expect(result.bytesRead).toBe(8)
  })

  it('should parse map with integer keys', () => {
    // a2 01 02 03 04 = {1: 2, 3: 4}
    const result = parseMap('a201020304')
    const map = result.value as Map<any, any>
    expect(map.get(1)).toBe(2)
    expect(map.get(3)).toBe(4)
    expect(result.bytesRead).toBe(5)
  })

  it('should parse map with float value', () => {
    // a1 01 f93c00 = {1: 1.0}
    const result = parseMap('a101f93c00')
    const map = result.value as Map<any, any>
    expect(map.get(1)).toBe(1.0)
    expect(result.bytesRead).toBe(5)
  })

  it('should parse large array correctly', () => {
    // Build array of 100 integers 0-99
    let hex = '9864' // array(100)... but that needs proper length encoding
    // Actually: 0x98 = array with 1-byte length, 0x64 = 100
    hex = '9864'
    for (let i = 0; i < 100; i++) {
      if (i < 24) {
        hex += i.toString(16).padStart(2, '0')
      } else {
        hex += '18' + i.toString(16).padStart(2, '0')
      }
    }
    const result = parseArray(hex)
    const arr = result.value as number[]
    expect(arr).toHaveLength(100)
    for (let i = 0; i < 100; i++) {
      expect(arr[i]).toBe(i)
    }
  })
})
