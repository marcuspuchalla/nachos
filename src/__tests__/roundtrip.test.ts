/**
 * Round-Trip Tests for NACHOS CBOR Library
 *
 * Tests that encode(value) -> decode(hex) -> value produces the original value
 * for all supported CBOR types and edge cases.
 *
 * Key considerations:
 * - Decoder returns Map for CBOR maps (not plain objects)
 * - Decoder returns plain Uint8Array for definite-length byte strings
 * - NaN !== NaN, so use Number.isNaN()
 * - Encoder treats -0.0 as integer 0 (since Number.isInteger(-0) is true)
 */

import { describe, it, expect } from 'vitest'
import { encode, decode } from '../index'
// Note: The decoder returns plain Uint8Array for definite-length byte strings,
// not CborByteString objects. CborByteString is only used internally.

/**
 * Helper: round-trip a value through encode -> decode and return the decoded value.
 */
function roundTrip(value: any): any {
  const encoded = encode(value)
  const decoded = decode(encoded.hex)
  return decoded.value
}

/**
 * Helper: check that the hex produced by encode can be decoded back,
 * and that bytesRead matches the encoded length.
 */
function roundTripFull(value: any): { hex: string; decoded: any; bytesRead: number } {
  const encoded = encode(value)
  const decoded = decode(encoded.hex)
  return { hex: encoded.hex, decoded: decoded.value, bytesRead: decoded.bytesRead }
}

// ---------------------------------------------------------------------------
// 1. Integers
// ---------------------------------------------------------------------------

describe('Round-trip: Integers', () => {
  describe('unsigned integers', () => {
    it('should round-trip 0', () => {
      expect(roundTrip(0)).toBe(0)
    })

    it('should round-trip 1', () => {
      expect(roundTrip(1)).toBe(1)
    })

    it('should round-trip 23 (max direct encoding)', () => {
      expect(roundTrip(23)).toBe(23)
    })

    it('should round-trip 24 (1-byte follows)', () => {
      expect(roundTrip(24)).toBe(24)
    })

    it('should round-trip 255 (max 1-byte)', () => {
      expect(roundTrip(255)).toBe(255)
    })

    it('should round-trip 256 (2-byte follows)', () => {
      expect(roundTrip(256)).toBe(256)
    })

    it('should round-trip 65535 (max 2-byte)', () => {
      expect(roundTrip(65535)).toBe(65535)
    })

    it('should round-trip 65536 (4-byte follows)', () => {
      expect(roundTrip(65536)).toBe(65536)
    })

    it('should round-trip 2^32 - 1 (max 4-byte)', () => {
      expect(roundTrip(4294967295)).toBe(4294967295)
    })

    it('should round-trip 2^32 (8-byte follows)', () => {
      expect(roundTrip(4294967296)).toBe(4294967296)
    })

    it('should round-trip Number.MAX_SAFE_INTEGER', () => {
      expect(roundTrip(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    })
  })

  describe('negative integers', () => {
    it('should round-trip -1', () => {
      expect(roundTrip(-1)).toBe(-1)
    })

    it('should round-trip -24 (max direct negative encoding)', () => {
      expect(roundTrip(-24)).toBe(-24)
    })

    it('should round-trip -25 (1-byte follows)', () => {
      expect(roundTrip(-25)).toBe(-25)
    })

    it('should round-trip -256', () => {
      expect(roundTrip(-256)).toBe(-256)
    })

    it('should round-trip -257 (2-byte follows)', () => {
      expect(roundTrip(-257)).toBe(-257)
    })

    it('should round-trip -65536', () => {
      expect(roundTrip(-65536)).toBe(-65536)
    })

    it('should round-trip -65537 (4-byte follows)', () => {
      expect(roundTrip(-65537)).toBe(-65537)
    })

    it('should round-trip Number.MIN_SAFE_INTEGER', () => {
      expect(roundTrip(Number.MIN_SAFE_INTEGER)).toBe(Number.MIN_SAFE_INTEGER)
    })
  })

  describe('BigInt values', () => {
    it('should round-trip BigInt(0)', () => {
      expect(roundTrip(0n)).toBe(0)
    })

    it('should round-trip BigInt larger than MAX_SAFE_INTEGER', () => {
      const big = 2n ** 53n + 1n
      const result = roundTrip(big)
      expect(result).toBe(big)
    })

    it('should round-trip large negative BigInt', () => {
      const big = -(2n ** 53n + 1n)
      const result = roundTrip(big)
      expect(result).toBe(big)
    })

    it('should round-trip BigInt at 2^64 - 1 boundary', () => {
      const big = 2n ** 64n - 1n
      const result = roundTrip(big)
      expect(result).toBe(big)
    })
  })
})

// ---------------------------------------------------------------------------
// 2. Floats
// ---------------------------------------------------------------------------

describe('Round-trip: Floats', () => {
  it('should round-trip 0.0 (encodes as integer 0)', () => {
    // 0.0 is an integer, so encoder uses integer encoding
    expect(roundTrip(0.0)).toBe(0)
  })

  it('should encode -0.0 as float16 preserving sign', () => {
    // -0.0 is detected by the encoder and encoded as float16 (f98000),
    // which correctly preserves the negative zero sign bit.
    const encoded = encode(-0.0)
    expect(encoded.hex).toBe('f98000')
    expect(Object.is(roundTrip(-0.0), -0)).toBe(true)
  })

  it('should round-trip 1.5 (exact in float16)', () => {
    expect(roundTrip(1.5)).toBe(1.5)
  })

  it('should round-trip -4.1 (requires float64)', () => {
    expect(roundTrip(-4.1)).toBeCloseTo(-4.1, 15)
  })

  it('should round-trip Infinity', () => {
    expect(roundTrip(Infinity)).toBe(Infinity)
  })

  it('should round-trip -Infinity', () => {
    expect(roundTrip(-Infinity)).toBe(-Infinity)
  })

  it('should round-trip NaN', () => {
    const result = roundTrip(NaN)
    expect(Number.isNaN(result)).toBe(true)
  })

  it('should round-trip a very small float (subnormal in float16)', () => {
    // 5.960464477539063e-8 is the smallest positive subnormal float16
    const val = 5.960464477539063e-8
    const result = roundTrip(val)
    expect(result).toBe(val)
  })

  it('should round-trip 65504 (max finite float16)', () => {
    expect(roundTrip(65504.0)).toBe(65504)
  })

  it('should round-trip 3.4028234663852886e+38 (max float32)', () => {
    const val = 3.4028234663852886e+38
    expect(roundTrip(val)).toBe(val)
  })

  it('should round-trip 1.1 (requires float64 precision)', () => {
    expect(roundTrip(1.1)).toBe(1.1)
  })

  it('should round-trip Number.EPSILON', () => {
    const val = Number.EPSILON
    expect(roundTrip(val)).toBe(val)
  })
})

// ---------------------------------------------------------------------------
// 3. Strings
// ---------------------------------------------------------------------------

describe('Round-trip: Strings', () => {
  it('should round-trip empty string', () => {
    expect(roundTrip('')).toBe('')
  })

  it('should round-trip ASCII string', () => {
    expect(roundTrip('hello')).toBe('hello')
  })

  it('should round-trip "IETF" (from RFC 8949 examples)', () => {
    expect(roundTrip('IETF')).toBe('IETF')
  })

  it('should round-trip UTF-8 multi-byte characters', () => {
    expect(roundTrip('\u00fc')).toBe('\u00fc')  // u-umlaut
  })

  it('should round-trip CJK characters', () => {
    expect(roundTrip('\u6c34')).toBe('\u6c34')  // water
  })

  it('should round-trip emoji', () => {
    expect(roundTrip('\ud83d\ude00')).toBe('\ud83d\ude00')  // grinning face
  })

  it('should round-trip string with mixed scripts', () => {
    const mixed = 'Hello \u4e16\u754c \ud83c\udf0d!'
    expect(roundTrip(mixed)).toBe(mixed)
  })

  it('should round-trip long string (> 256 bytes)', () => {
    const long = 'a'.repeat(300)
    expect(roundTrip(long)).toBe(long)
  })

  it('should round-trip string with special characters', () => {
    const special = 'line1\nline2\ttab\r\nwindows'
    expect(roundTrip(special)).toBe(special)
  })

  it('should round-trip string with null byte', () => {
    const withNull = 'before\x00after'
    expect(roundTrip(withNull)).toBe(withNull)
  })
})

// ---------------------------------------------------------------------------
// 4. Byte Strings
// ---------------------------------------------------------------------------

describe('Round-trip: Byte Strings', () => {
  it('should round-trip empty Uint8Array', () => {
    const result = roundTrip(new Uint8Array([]))
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result).toEqual(new Uint8Array([]))
  })

  it('should round-trip single byte', () => {
    const result = roundTrip(new Uint8Array([0xff]))
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result).toEqual(new Uint8Array([0xff]))
  })

  it('should round-trip multi-byte Uint8Array', () => {
    const input = new Uint8Array([0x01, 0x02, 0x03, 0x04])
    const result = roundTrip(input)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result).toEqual(input)
  })

  it('should round-trip 256-byte Uint8Array', () => {
    const input = new Uint8Array(256)
    for (let i = 0; i < 256; i++) input[i] = i
    const result = roundTrip(input)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result).toEqual(input)
  })

  it('should round-trip all-zeros byte string', () => {
    const input = new Uint8Array([0x00, 0x00, 0x00])
    const result = roundTrip(input)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result).toEqual(input)
  })
})

// ---------------------------------------------------------------------------
// 5. Booleans / null / undefined
// ---------------------------------------------------------------------------

describe('Round-trip: Booleans, null, undefined', () => {
  it('should round-trip true', () => {
    expect(roundTrip(true)).toBe(true)
  })

  it('should round-trip false', () => {
    expect(roundTrip(false)).toBe(false)
  })

  it('should round-trip null', () => {
    expect(roundTrip(null)).toBe(null)
  })

  it('should round-trip undefined', () => {
    // CBOR encodes undefined as 0xf7, which decodes back to undefined
    expect(roundTrip(undefined)).toBe(undefined)
  })
})

// ---------------------------------------------------------------------------
// 6. Arrays
// ---------------------------------------------------------------------------

describe('Round-trip: Arrays', () => {
  it('should round-trip empty array', () => {
    expect(roundTrip([])).toEqual([])
  })

  it('should round-trip single-element array', () => {
    expect(roundTrip([42])).toEqual([42])
  })

  it('should round-trip array of integers', () => {
    expect(roundTrip([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('should round-trip nested arrays', () => {
    expect(roundTrip([[1, 2], [3, 4]])).toEqual([[1, 2], [3, 4]])
  })

  it('should round-trip mixed-type array', () => {
    const input = [1, 'hello', true, null]
    const result = roundTrip(input) as any[]
    expect(result[0]).toBe(1)
    expect(result[1]).toBe('hello')
    expect(result[2]).toBe(true)
    expect(result[3]).toBe(null)
  })

  it('should round-trip deeply nested array', () => {
    const deep = [[[[[1]]]]]
    expect(roundTrip(deep)).toEqual([[[[[1]]]]])
  })

  it('should round-trip large array (100 elements)', () => {
    const input = Array.from({ length: 100 }, (_, i) => i)
    expect(roundTrip(input)).toEqual(input)
  })

  it('should round-trip array with negative integers', () => {
    expect(roundTrip([-1, -100, -1000])).toEqual([-1, -100, -1000])
  })
})

// ---------------------------------------------------------------------------
// 7. Maps / Objects
// ---------------------------------------------------------------------------

describe('Round-trip: Maps and Objects', () => {
  it('should round-trip empty object as empty Map', () => {
    const result = roundTrip({}) as Map<any, any>
    expect(result).toBeInstanceOf(Map)
    expect(result.size).toBe(0)
  })

  it('should round-trip object with string keys as Map', () => {
    const result = roundTrip({ a: 1, b: 2 }) as Map<any, any>
    expect(result).toBeInstanceOf(Map)
    expect(result.get('a')).toBe(1)
    expect(result.get('b')).toBe(2)
  })

  it('should round-trip nested object', () => {
    const result = roundTrip({ outer: { inner: 42 } }) as Map<any, any>
    expect(result).toBeInstanceOf(Map)
    const inner = result.get('outer') as Map<any, any>
    expect(inner).toBeInstanceOf(Map)
    expect(inner.get('inner')).toBe(42)
  })

  it('should round-trip object with mixed value types', () => {
    const result = roundTrip({
      num: 42,
      str: 'hello',
      bool: true,
      nil: null,
      arr: [1, 2, 3]
    }) as Map<any, any>

    expect(result.get('num')).toBe(42)
    expect(result.get('str')).toBe('hello')
    expect(result.get('bool')).toBe(true)
    expect(result.get('nil')).toBe(null)
    expect(result.get('arr')).toEqual([1, 2, 3])
  })

  it('should round-trip Map with integer keys', () => {
    const input = new Map<any, any>([
      [0, 'inputs'],
      [1, 'outputs'],
      [2, 1000000]
    ])
    const result = roundTrip(input) as Map<any, any>
    expect(result).toBeInstanceOf(Map)
    expect(result.get(0)).toBe('inputs')
    expect(result.get(1)).toBe('outputs')
    expect(result.get(2)).toBe(1000000)
  })

  it('should round-trip Map with string keys', () => {
    const input = new Map<any, any>([
      ['name', 'Alice'],
      ['age', 30]
    ])
    const result = roundTrip(input) as Map<any, any>
    expect(result.get('name')).toBe('Alice')
    expect(result.get('age')).toBe(30)
  })

  it('should round-trip empty Map', () => {
    const result = roundTrip(new Map()) as Map<any, any>
    expect(result).toBeInstanceOf(Map)
    expect(result.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 8. Tagged Values
// ---------------------------------------------------------------------------

describe('Round-trip: Tagged Values', () => {
  it('should round-trip Plutus constructor 0 (tag 121)', () => {
    const input = { tag: 121, value: [] }
    const result = roundTrip(input)
    expect(result).toMatchObject({ tag: 121, value: [] })
  })

  it('should round-trip epoch timestamp (tag 1)', () => {
    const input = { tag: 1, value: 1234567890 }
    const result = roundTrip(input)
    expect(result).toMatchObject({ tag: 1, value: 1234567890 })
  })

  it('should round-trip tag with string content', () => {
    const input = { tag: 0, value: '2013-03-21T20:04:00Z' }
    const result = roundTrip(input)
    expect(result).toMatchObject({ tag: 0, value: '2013-03-21T20:04:00Z' })
  })

  it('should round-trip tag with array content', () => {
    const input = { tag: 258, value: [1, 2, 3] }
    const result = roundTrip(input)
    expect(result).toMatchObject({ tag: 258, value: [1, 2, 3] })
  })

  it('should round-trip nested tagged values', () => {
    const input = { tag: 121, value: [{ tag: 122, value: [42] }] }
    const result = roundTrip(input)
    expect(result.tag).toBe(121)
    expect(result.value[0].tag).toBe(122)
    expect(result.value[0].value).toEqual([42])
  })

  it('should round-trip Plutus constructors 121-127', () => {
    for (let tag = 121; tag <= 127; tag++) {
      const input = { tag, value: [tag - 121] }
      const result = roundTrip(input)
      expect(result.tag).toBe(tag)
      expect(result.value).toEqual([tag - 121])
    }
  })

  it('should round-trip high tag number (tag 1280)', () => {
    const input = { tag: 1280, value: [1, 2] }
    const result = roundTrip(input)
    expect(result).toMatchObject({ tag: 1280, value: [1, 2] })
  })

  it('should round-trip tag with empty Map content', () => {
    const input = { tag: 121, value: new Map() }
    const result = roundTrip(input)
    expect(result.tag).toBe(121)
    expect(result.value).toBeInstanceOf(Map)
    expect((result.value as Map<any, any>).size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 9. Complex Nested Structures (Cardano-like)
// ---------------------------------------------------------------------------

describe('Round-trip: Complex Nested Structures', () => {
  it('should round-trip a Cardano-like transaction body', () => {
    // Simplified Cardano transaction body structure:
    // Map with integer keys: 0=inputs, 1=outputs, 2=fee
    const txBody = new Map<any, any>([
      [0, [                    // inputs: array of [txHash, index]
        [new Uint8Array(32).fill(0xab), 0]
      ]],
      [1, [                    // outputs: array of [address, amount]
        [new Uint8Array(28).fill(0xcd), 2000000]
      ]],
      [2, 170000]              // fee
    ])

    const result = roundTrip(txBody) as Map<any, any>
    expect(result).toBeInstanceOf(Map)

    // Check fee
    expect(result.get(2)).toBe(170000)

    // Check inputs structure
    const inputs = result.get(0) as any[]
    expect(inputs).toHaveLength(1)
    const [txHash, index] = inputs[0]
    expect(txHash).toBeInstanceOf(Uint8Array)
    expect(txHash).toEqual(new Uint8Array(32).fill(0xab))
    expect(index).toBe(0)

    // Check outputs structure
    const outputs = result.get(1) as any[]
    expect(outputs).toHaveLength(1)
    const [addr, amount] = outputs[0]
    expect(addr).toBeInstanceOf(Uint8Array)
    expect(addr).toEqual(new Uint8Array(28).fill(0xcd))
    expect(amount).toBe(2000000)
  })

  it('should round-trip Plutus script datum (constructor with nested fields)', () => {
    // Represents a Plutus datum like: Constr 0 [I 42, B "deadbeef", List [I 1, I 2]]
    const datum = {
      tag: 121,
      value: [
        42,
        new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
        [1, 2]
      ]
    }

    const result = roundTrip(datum)
    expect(result.tag).toBe(121)
    expect(result.value[0]).toBe(42)
    expect(result.value[1]).toBeInstanceOf(Uint8Array)
    expect(result.value[1]).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))
    expect(result.value[2]).toEqual([1, 2])
  })

  it('should round-trip deeply nested mixed structure', () => {
    const input = [
      new Map<any, any>([
        ['key', [1, 'two', { tag: 3, value: true }]]
      ]),
      null,
      [[], [[]]]
    ]

    const result = roundTrip(input) as any[]
    expect(result).toHaveLength(3)

    const map = result[0] as Map<any, any>
    expect(map).toBeInstanceOf(Map)
    const arr = map.get('key') as any[]
    expect(arr[0]).toBe(1)
    expect(arr[1]).toBe('two')
    expect(arr[2]).toMatchObject({ tag: 3, value: true })

    expect(result[1]).toBe(null)
    expect(result[2]).toEqual([[], [[]]])
  })

  it('should round-trip array of tagged values with Maps', () => {
    const input = [
      { tag: 121, value: [new Map<any, any>([[1, 'a'], [2, 'b']])] },
      { tag: 122, value: [new Map<any, any>([[3, 'c']])] }
    ]

    const result = roundTrip(input) as any[]
    expect(result[0].tag).toBe(121)
    expect((result[0].value[0] as Map<any, any>).get(1)).toBe('a')
    expect((result[0].value[0] as Map<any, any>).get(2)).toBe('b')
    expect(result[1].tag).toBe(122)
    expect((result[1].value[0] as Map<any, any>).get(3)).toBe('c')
  })
})

// ---------------------------------------------------------------------------
// 10. Canonical Mode
// ---------------------------------------------------------------------------

describe('Round-trip: Canonical Mode', () => {
  it('should produce sorted keys in canonical mode', () => {
    const encoded = encode({ z: 1, a: 2, m: 3 }, { canonical: true })
    const decoded = decode(encoded.hex).value as Map<any, any>

    // Keys should be in canonical order (sorted by encoded bytes)
    // For text strings of equal length, this is alphabetical
    const keys = Array.from(decoded.keys())
    expect(keys).toEqual(['a', 'm', 'z'])
  })

  it('should produce consistent hex for reordered keys in canonical mode', () => {
    const hex1 = encode({ z: 1, a: 2, m: 3 }, { canonical: true }).hex
    const hex2 = encode({ a: 2, m: 3, z: 1 }, { canonical: true }).hex
    expect(hex1).toBe(hex2)
  })

  it('should sort Map keys canonically', () => {
    const input = new Map<any, any>([
      ['bb', 2],
      ['a', 1],
      ['ccc', 3]
    ])
    const encoded = encode(input, { canonical: true })
    const decoded = decode(encoded.hex).value as Map<any, any>

    // Canonical sort: shorter keys first (by encoded bytes length), then lexicographic
    const keys = Array.from(decoded.keys())
    expect(keys[0]).toBe('a')     // 1-char key encodes shorter
    expect(keys[1]).toBe('bb')    // 2-char key
    expect(keys[2]).toBe('ccc')   // 3-char key
  })

  it('should round-trip canonical-encoded integers', () => {
    // In canonical mode, values should still round-trip correctly
    expect(decode(encode(42, { canonical: true }).hex).value).toBe(42)
  })

  it('should round-trip canonical-encoded arrays', () => {
    const input = [3, 1, 2]
    // Arrays preserve order (only map keys are sorted)
    expect(decode(encode(input, { canonical: true }).hex).value).toEqual([3, 1, 2])
  })
})

// ---------------------------------------------------------------------------
// 11. Encoding / Decoding Consistency
// ---------------------------------------------------------------------------

describe('Round-trip: Consistency checks', () => {
  it('should have bytesRead match encoded byte length', () => {
    const values = [0, 100, -1, 'hello', true, null, [1, 2], { a: 1 }]
    for (const value of values) {
      const { hex, bytesRead } = roundTripFull(value)
      // hex is 2 chars per byte
      expect(bytesRead).toBe(hex.length / 2)
    }
  })

  it('should produce identical hex when re-encoding a decoded Map', () => {
    // Encode a Map, decode it, re-encode - should get same hex
    const input = new Map<any, any>([
      [1, 'hello'],
      [2, 'world']
    ])
    const hex1 = encode(input).hex
    const decoded = decode(hex1).value as Map<any, any>
    const hex2 = encode(decoded).hex
    expect(hex2).toBe(hex1)
  })

  it('should produce identical hex when re-encoding a decoded tagged value', () => {
    const input = { tag: 121, value: [1, 2, 3] }
    const hex1 = encode(input).hex
    const decoded = decode(hex1).value as any
    const hex2 = encode(decoded).hex
    expect(hex2).toBe(hex1)
  })

  it('should produce identical hex when re-encoding a decoded array', () => {
    const input = [1, 'hello', true, [2, 3]]
    const hex1 = encode(input).hex
    const decoded = decode(hex1).value as any
    const hex2 = encode(decoded).hex
    expect(hex2).toBe(hex1)
  })

  it('should produce identical hex when re-encoding decoded byte strings', () => {
    const input = new Uint8Array([0xde, 0xad, 0xbe, 0xef])
    const hex1 = encode(input).hex
    const decoded = decode(hex1).value as Uint8Array
    // Re-encode the decoded Uint8Array directly
    const hex2 = encode(decoded as any).hex
    expect(hex2).toBe(hex1)
  })
})
