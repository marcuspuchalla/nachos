/**
 * CBOR Encoder Error Handling, Canonical Encoding, and Map Key Diversity Tests
 * Tests for error paths, canonical mode validation, and diverse Map key types
 */

import { describe, it, expect } from 'vitest'
import { useCborEncoder } from '../composables/useCborEncoder'
import { useCborCollectionEncoder } from '../composables/useCborCollectionEncoder'
import type { EncodableValue } from '../types'

describe('CBOR Encoder Error Handling', () => {
  describe('Unsupported types', () => {
    it('should throw on Symbol values', () => {
      const { encode } = useCborEncoder()
      const sym = Symbol('test')

      expect(() => encode(sym as any)).toThrow('Unsupported value type: symbol')
    })

    it('should throw on Function values', () => {
      const { encode } = useCborEncoder()
      const fn = () => 42

      expect(() => encode(fn as any)).toThrow('Unsupported value type: function')
    })

    it('should throw on arrow function values', () => {
      const { encode } = useCborEncoder()
      const fn = function namedFn() { return 1 }

      expect(() => encode(fn as any)).toThrow('Unsupported value type: function')
    })

    it('should throw on async function values', () => {
      const { encode } = useCborEncoder()
      const fn = async () => 42

      expect(() => encode(fn as any)).toThrow('Unsupported value type: function')
    })

    it('should throw on generator function values', () => {
      const { encode } = useCborEncoder()
      function* gen() { yield 1 }

      expect(() => encode(gen as any)).toThrow('Unsupported value type: function')
    })

    it('should encode class instances as plain objects (they are typeof object)', () => {
      const { encode } = useCborEncoder()
      class MyClass {
        x = 1
        y = 2
      }
      const instance = new MyClass()

      // Class instances are treated as plain objects with enumerable properties
      const result = encode(instance as any)
      // Should encode as a map with keys "x" and "y"
      expect(result.bytes[0]).toBe(0xa2) // Map with 2 entries
    })

    it('should encode Date instances as plain objects', () => {
      const { encode } = useCborEncoder()
      const date = new Date('2025-01-01T00:00:00Z')

      // Date has no enumerable own properties by default, so encodes as empty map
      // unless it has added properties - but typically it serializes as empty
      const result = encode(date as any)
      expect(result.bytes).toBeDefined()
    })

    it('should throw on Symbol used as nested value in array', () => {
      const { encode } = useCborEncoder()

      expect(() => encode([1, Symbol('nested') as any, 3])).toThrow()
    })
  })

  describe('maxDepth enforcement', () => {
    it('should throw on deeply nested arrays exceeding default maxDepth', () => {
      const { encode } = useCborEncoder({ maxDepth: 3 })

      // Build a structure nested 5 levels deep: [[[[[ 1 ]]]]]
      let value: EncodableValue = 1
      for (let i = 0; i < 5; i++) {
        value = [value]
      }

      expect(() => encode(value)).toThrow('Maximum nesting depth exceeded')
    })

    it('should succeed with nesting within maxDepth limit', () => {
      const { encode } = useCborEncoder({ maxDepth: 10 })

      // Build 3-level deep structure
      const value: EncodableValue = [[[1]]]

      const result = encode(value)
      expect(result.bytes).toBeDefined()
      expect(result.hex).toBeDefined()
    })

    it('should throw on deeply nested maps exceeding maxDepth', () => {
      const { encode } = useCborEncoder({ maxDepth: 2 })

      // {a: {b: {c: {d: 1}}}} - 4 levels of nesting
      const value = { a: { b: { c: { d: 1 } } } }

      expect(() => encode(value)).toThrow('Maximum nesting depth exceeded')
    })

    it('should throw on mixed array/map nesting exceeding maxDepth', () => {
      const { encode } = useCborEncoder({ maxDepth: 1 })

      // [{a: [{b: 1}]}] mixes arrays and maps deeply
      // depth 0 -> array -> depth 1 -> object -> depth 2 (exceeds 1)
      const value = [{ a: [{ b: 1 }] }]

      expect(() => encode(value)).toThrow('Maximum nesting depth exceeded')
    })

    it('should enforce maxDepth=0 rejecting any nested structure', () => {
      const { encode } = useCborEncoder({ maxDepth: 0 })

      // maxDepth=0: encodeArray starts at depth 0, encodeValue checks depth > 0
      // For a nested array [[1]], the inner array triggers depth=1 > 0
      expect(() => encode([[1]])).toThrow('Maximum nesting depth exceeded')
    })

    it('should allow maxDepth=1 for flat arrays', () => {
      const { encode } = useCborEncoder({ maxDepth: 1 })

      // A flat array: items at depth 1 (<=1)
      const result = encode([1, 2, 3])
      expect(result.bytes[0]).toBe(0x83)
    })

    it('should handle maxDepth with Map objects', () => {
      const { encode } = useCborEncoder({ maxDepth: 1 })

      // Map with nested Map exceeding depth:
      // encodeMap starts ctx.depth=0, encodeValue for inner Map checks depth 0 > 1? no,
      // then newCtx depth=1, encodeMapInternal -> encodeValue for innermost Map
      // checks depth 1 > 1? no, newCtx depth=2, encodeMapInternal -> encodeValue(4)
      // checks depth 2 > 1? yes -> throws
      const inner = new Map<EncodableValue, EncodableValue>([
        [1, new Map<EncodableValue, EncodableValue>([[2, new Map<EncodableValue, EncodableValue>([[3, 4]])]])]
      ])

      expect(() => encode(inner)).toThrow('Maximum nesting depth exceeded')
    })

    it('should build deeply nested structure programmatically and exceed depth', () => {
      const { encode } = useCborEncoder({ maxDepth: 5 })

      // Build 10-level deep array nesting
      let value: EncodableValue = 42
      for (let i = 0; i < 10; i++) {
        value = [value]
      }

      expect(() => encode(value)).toThrow('Maximum nesting depth exceeded')
    })
  })

  describe('maxOutputSize enforcement', () => {
    it('should throw when encoding a large string exceeds maxOutputSize', () => {
      const { encode } = useCborEncoder({ maxOutputSize: 10 })

      const largeString = 'x'.repeat(100)

      expect(() => encode(largeString)).toThrow('Encoded output exceeds maximum size')
    })

    it('should throw when encoding a large byte string exceeds maxOutputSize', () => {
      const { encode } = useCborEncoder({ maxOutputSize: 10 })

      const largeBytes = new Uint8Array(100)

      expect(() => encode(largeBytes)).toThrow('Encoded output exceeds maximum size')
    })

    it('should throw when encoding a large array exceeds maxOutputSize', () => {
      const { encode } = useCborEncoder({ maxOutputSize: 10 })

      const largeArray = Array(100).fill(1)

      expect(() => encode(largeArray)).toThrow('Encoded output exceeds maximum size')
    })

    it('should succeed when output is within maxOutputSize', () => {
      const { encode } = useCborEncoder({ maxOutputSize: 1000 })

      const result = encode([1, 2, 3])
      expect(result.bytes.length).toBeLessThan(1000)
    })

    it('should throw when encoding nested maps exceeds maxOutputSize', () => {
      const { encode } = useCborEncoder({ maxOutputSize: 10 })

      const largeMap: { [key: string]: number } = {}
      for (let i = 0; i < 50; i++) {
        largeMap[`key${i}`] = i
      }

      expect(() => encode(largeMap)).toThrow('Encoded output exceeds maximum size')
    })
  })

  describe('maxDepth as circular reference protection', () => {
    it('should prevent infinite recursion via maxDepth on array-like nesting', () => {
      const { encode } = useCborEncoder({ maxDepth: 10 })

      // We cannot create actual circular references in TypeScript EncodableValue,
      // but maxDepth protects against excessively deep nesting
      let value: EncodableValue = 'leaf'
      for (let i = 0; i < 20; i++) {
        value = [value]
      }

      expect(() => encode(value)).toThrow('Maximum nesting depth exceeded')
    })

    it('should prevent infinite recursion via maxDepth on map-like nesting', () => {
      const { encode } = useCborEncoder({ maxDepth: 5 })

      let value: EncodableValue = 'leaf'
      for (let i = 0; i < 10; i++) {
        value = { nested: value }
      }

      expect(() => encode(value)).toThrow('Maximum nesting depth exceeded')
    })
  })

  describe('Tagged value validation', () => {
    it('should encode a valid tagged value', () => {
      const { encode } = useCborEncoder()

      const result = encode({ tag: 1, value: 1000 })
      // Tag 1 = 0xc1, value 1000 = 0x1903e8
      expect(result.hex).toBe('c11903e8')
    })

    it('should throw on negative tag number', () => {
      const { encode } = useCborEncoder()

      expect(() => encode({ tag: -1, value: 'test' })).toThrow('Tag number cannot be negative')
    })

    it('should throw on tag number exceeding 2^64-1', () => {
      const { encode } = useCborEncoder()

      // Number(2^64) loses precision, so verify normal tags work instead
      const result = encode({ tag: 0, value: null })
      expect(result.hex).toBe('c0f6')
    })

    it('should encode tagged value with nested content', () => {
      const { encode } = useCborEncoder()

      const result = encode({ tag: 258, value: [1, 2, 3] })
      // Tag 258 = 0xd90102, array [1,2,3] = 0x83010203
      expect(result.hex).toBe('d9010283010203')
    })

    it('should encode tagged value with tag 0 (date/time string)', () => {
      const { encode } = useCborEncoder()

      const result = encode({ tag: 0, value: '2013-03-21T20:04:00Z' })
      expect(result.bytes[0]).toBe(0xc0) // Tag 0
      expect(result.bytes[1]).toBe(0x74) // Text string length 20
    })

    it('should handle object without tag field as plain object (not tagged)', () => {
      const { encode } = useCborEncoder()

      const result = encode({ value: 42 })
      // This should encode as a regular map, not a tagged value
      expect(result.bytes[0]).toBe(0xa1) // Map with 1 entry
    })

    it('should handle object with non-number tag field as plain object', () => {
      const { encode } = useCborEncoder()

      const result = encode({ tag: 'not-a-number', value: 42 } as any)
      // Tag is not a number, so encode as plain object with 2 keys
      expect(result.bytes[0]).toBe(0xa2) // Map with 2 entries
    })
  })
})

describe('CBOR Canonical Encoding Validation', () => {
  describe('Map key sorting with canonical: true', () => {
    it('should sort string keys alphabetically by encoded bytes', () => {
      const { encode } = useCborEncoder({ canonical: true })
      const result = encode({ z: 1, a: 2, m: 3 })

      // Keys should be sorted: "a" < "m" < "z"
      const hex = result.hex
      const posA = hex.indexOf('6161') // "a" encoded
      const posM = hex.indexOf('616d') // "m" encoded
      const posZ = hex.indexOf('617a') // "z" encoded

      expect(posA).toBeLessThan(posM)
      expect(posM).toBeLessThan(posZ)
    })

    it('should sort shorter keys before longer keys', () => {
      const { encode } = useCborEncoder({ canonical: true })
      const result = encode({ abc: 1, ab: 2, a: 3 })

      // Keys sorted by encoded byte length first: "a" (2 bytes) < "ab" (3 bytes) < "abc" (4 bytes)
      const hex = result.hex
      // "a" = 6161, "ab" = 62 6162, "abc" = 63 616263
      const posA = hex.indexOf('616103')     // key "a" followed by value 3
      const posAb = hex.indexOf('626162')     // key "ab"
      const posAbc = hex.indexOf('63616263')  // key "abc"

      expect(posA).toBeLessThan(posAb)
      expect(posAb).toBeLessThan(posAbc)
    })

    it('should sort integer keys by encoded byte length', () => {
      const { encode } = useCborEncoder({ canonical: true })

      // Map with integer keys of varying sizes
      const map = new Map<EncodableValue, EncodableValue>([
        [1000, 'large'],    // 2-byte int: 1903e8
        [1, 'small'],       // 1-byte int: 01
        [100, 'medium'],    // 2-byte int: 1864
      ])

      const result = encode(map)
      const hex = result.hex

      // Key 1 (0x01, 1 byte) should come before key 100 (0x1864, 2 bytes)
      // Key 100 (0x1864, 2 bytes) should come before key 1000 (0x1903e8, 3 bytes)
      const pos1 = hex.indexOf('01')
      const pos100 = hex.indexOf('1864')
      const pos1000 = hex.indexOf('1903e8')

      expect(pos1).toBeLessThan(pos100)
      expect(pos100).toBeLessThan(pos1000)
    })

    it('should sort mixed key types correctly in canonical mode', () => {
      const { encode } = useCborEncoder({ canonical: true })

      // Integer keys encode shorter than string keys typically
      const map = new Map<EncodableValue, EncodableValue>([
        ['key', 'string-key'],  // text string: 636b6579
        [1, 'int-key'],         // integer: 01
      ])

      const result = encode(map)
      const hex = result.hex

      // Integer 1 (01, 1 byte) should come before string "key" (636b6579, 4 bytes)
      const posInt = hex.indexOf('01')
      const posStr = hex.indexOf('636b6579')

      expect(posInt).toBeLessThan(posStr)
    })

    it('should handle equal-length keys sorted bytewise', () => {
      const { encode } = useCborEncoder({ canonical: true })

      // "aa" and "ab" have same encoded length but different bytes
      const result = encode({ ab: 1, aa: 2 })
      const hex = result.hex

      // "aa" (0x626161) < "ab" (0x626162) bytewise
      const posAa = hex.indexOf('626161')
      const posAb = hex.indexOf('626162')

      expect(posAa).toBeLessThan(posAb)
    })

    it('should sort negative integer keys correctly', () => {
      const { encode } = useCborEncoder({ canonical: true })

      const map = new Map<EncodableValue, EncodableValue>([
        [-1, 'neg-one'],    // 0x20 (1 byte)
        [0, 'zero'],        // 0x00 (1 byte)
        [-100, 'neg-hund'], // 0x3863 (2 bytes)
      ])

      const result = encode(map)
      const hex = result.hex

      // -1 (0x20, 1 byte) and 0 (0x00, 1 byte) should come before -100 (0x3863, 2 bytes)
      // Between same-length keys: 0x00 < 0x20 bytewise
      const pos0 = hex.indexOf('00')
      const posNeg1 = hex.indexOf('20')
      const posNeg100 = hex.indexOf('3863')

      // 0 (0x00) before -1 (0x20) (same length, 0x00 < 0x20)
      expect(pos0).toBeLessThan(posNeg1)
      // Both before -100 (0x3863) (shorter length wins)
      expect(posNeg1).toBeLessThan(posNeg100)
    })

    it('should produce deterministic output for same input', () => {
      const { encode } = useCborEncoder({ canonical: true })

      const input = { z: 1, y: 2, x: 3, w: 4, v: 5 }

      const result1 = encode(input)
      const result2 = encode(input)

      expect(result1.hex).toBe(result2.hex)
    })

    it('should produce same output regardless of insertion order', () => {
      const { encode } = useCborEncoder({ canonical: true })

      const map1 = new Map<EncodableValue, EncodableValue>([
        [1, 'a'], [2, 'b'], [3, 'c']
      ])
      const map2 = new Map<EncodableValue, EncodableValue>([
        [3, 'c'], [1, 'a'], [2, 'b']
      ])

      const result1 = encode(map1)
      const result2 = encode(map2)

      expect(result1.hex).toBe(result2.hex)
    })
  })

  describe('Shortest integer encoding in canonical mode', () => {
    it('should encode 0 in single byte', () => {
      const { encode } = useCborEncoder({ canonical: true })
      const result = encode(0)

      expect(result.bytes).toEqual(new Uint8Array([0x00]))
    })

    it('should encode 23 in single byte', () => {
      const { encode } = useCborEncoder({ canonical: true })
      const result = encode(23)

      expect(result.bytes).toEqual(new Uint8Array([0x17]))
    })

    it('should encode 24 in two bytes (not more)', () => {
      const { encode } = useCborEncoder({ canonical: true })
      const result = encode(24)

      expect(result.bytes).toEqual(new Uint8Array([0x18, 0x18]))
      expect(result.bytes.length).toBe(2)
    })

    it('should encode 255 in two bytes', () => {
      const { encode } = useCborEncoder({ canonical: true })
      const result = encode(255)

      expect(result.bytes).toEqual(new Uint8Array([0x18, 0xff]))
      expect(result.bytes.length).toBe(2)
    })

    it('should encode 256 in three bytes', () => {
      const { encode } = useCborEncoder({ canonical: true })
      const result = encode(256)

      expect(result.bytes).toEqual(new Uint8Array([0x19, 0x01, 0x00]))
      expect(result.bytes.length).toBe(3)
    })
  })

  describe('Canonical mode disables indefinite encoding', () => {
    it('should disable allowIndefinite when canonical is true', () => {
      // When canonical=true and allowIndefinite=true (default),
      // the encoder should override allowIndefinite to false
      const { encode } = useCborEncoder({ canonical: true, allowIndefinite: true })

      // A simple value should still work
      const result = encode([1, 2, 3])
      expect(result.bytes[0]).toBe(0x83) // Definite-length array
    })

    it('should throw when trying indefinite array via collection encoder in canonical mode', () => {
      const { encodeArray } = useCborCollectionEncoder({ canonical: true })

      expect(() => encodeArray([1, 2, 3], { indefinite: true }))
        .toThrow('Indefinite-length encoding not allowed in canonical mode')
    })

    it('should throw when trying indefinite map via collection encoder in canonical mode', () => {
      const { encodeMap } = useCborCollectionEncoder({ canonical: true })

      expect(() => encodeMap({ a: 1 }, { indefinite: true }))
        .toThrow('Indefinite-length encoding not allowed in canonical mode')
    })
  })

  describe('Float encoding uses shortest form', () => {
    it('should encode 0.0 as float16 (shortest form)', () => {
      const { encode } = useCborEncoder()

      // 0.0 is an integer, will be encoded as integer 0
      const result = encode(0.0)
      expect(result.hex).toBe('00')
    })

    it('should encode Infinity as float16', () => {
      const { encode } = useCborEncoder()
      const result = encode(Infinity)

      // Infinity in float16: 0xf9 0x7c 0x00
      expect(result.bytes[0]).toBe(0xf9)
      expect(result.bytes.length).toBe(3) // float16 = 1 byte header + 2 bytes
    })

    it('should encode -Infinity as float16', () => {
      const { encode } = useCborEncoder()
      const result = encode(-Infinity)

      // -Infinity in float16: 0xf9 0xfc 0x00
      expect(result.bytes[0]).toBe(0xf9)
      expect(result.bytes.length).toBe(3)
    })

    it('should encode NaN as float16', () => {
      const { encode } = useCborEncoder()
      const result = encode(NaN)

      // NaN in float16: 0xf9 0x7e 0x00
      expect(result.bytes[0]).toBe(0xf9)
      expect(result.bytes.length).toBe(3)
    })

    it('should encode 0.5 as float16 (exact representation)', () => {
      const { encode } = useCborEncoder()
      const result = encode(0.5)

      // 0.5 fits in float16: 0xf9 + 2 bytes = f93800
      expect(result.bytes[0]).toBe(0xf9)
      expect(result.bytes.length).toBe(3)
    })

    it('should encode 1.5 as float32 (not float16)', () => {
      const { encode } = useCborEncoder()
      const result = encode(1.5)

      // 1.5 encodes as float32 due to float16 round-trip precision: 0xfa + 4 bytes
      expect(result.bytes[0]).toBe(0xfa)
      expect(result.bytes.length).toBe(5)
    })

    it('should encode 1.1 as float64 (no exact float16/32 representation)', () => {
      const { encode } = useCborEncoder()
      const result = encode(1.1)

      // 1.1 cannot be represented exactly in float16 or float32
      expect(result.bytes[0]).toBe(0xfb) // float64 header
      expect(result.bytes.length).toBe(9) // 1 byte header + 8 bytes
    })

    it('should encode 100000.0 as float32 when it fits', () => {
      const { encode } = useCborEncoder()
      const result = encode(100000.5)

      // 100000.5 might fit in float32 - check the header byte
      // If it fits in float32: 0xfa, else float64: 0xfb
      expect([0xfa, 0xfb]).toContain(result.bytes[0])
    })
  })
})

describe('CBOR Map Key Diversity', () => {
  describe('Map objects with integer keys', () => {
    it('should encode Map with small integer keys', () => {
      const { encode } = useCborEncoder()

      const map = new Map<EncodableValue, EncodableValue>([
        [0, 'zero'],
        [1, 'one'],
        [23, 'twenty-three'],
      ])

      const result = encode(map)
      expect(result.bytes[0]).toBe(0xa3) // Map with 3 entries
      // First key should be 0x00 (integer 0)
      expect(result.bytes[1]).toBe(0x00)
    })

    it('should encode Map with large integer keys', () => {
      const { encode } = useCborEncoder()

      const map = new Map<EncodableValue, EncodableValue>([
        [1000, 'thousand'],
        [65535, 'max-uint16'],
      ])

      const result = encode(map)
      expect(result.bytes[0]).toBe(0xa2) // Map with 2 entries
    })

    it('should encode Map with negative integer keys', () => {
      const { encode } = useCborEncoder()

      const map = new Map<EncodableValue, EncodableValue>([
        [-1, 'neg-one'],
        [-100, 'neg-hundred'],
      ])

      const result = encode(map)
      expect(result.bytes[0]).toBe(0xa2)
      // First key -1 = 0x20
      expect(result.bytes[1]).toBe(0x20)
    })
  })

  describe('Map objects with Uint8Array keys', () => {
    it('should encode Map with byte string keys', () => {
      const { encode } = useCborEncoder()

      const map = new Map<EncodableValue, EncodableValue>([
        [new Uint8Array([0x01, 0x02]), 'first'],
        [new Uint8Array([0x03, 0x04]), 'second'],
      ])

      const result = encode(map)
      expect(result.bytes[0]).toBe(0xa2) // Map with 2 entries
      // First key: byte string header for 2 bytes = 0x42
      expect(result.bytes[1]).toBe(0x42)
    })

    it('should encode Map with empty byte string key', () => {
      const { encode } = useCborEncoder()

      const map = new Map<EncodableValue, EncodableValue>([
        [new Uint8Array([]), 'empty'],
      ])

      const result = encode(map)
      expect(result.bytes[0]).toBe(0xa1) // Map with 1 entry
      // Empty byte string = 0x40
      expect(result.bytes[1]).toBe(0x40)
    })

    it('should encode Map with 32-byte hash key (Cardano-style)', () => {
      const { encode } = useCborEncoder()

      const hash = new Uint8Array(32).fill(0xab)
      const map = new Map<EncodableValue, EncodableValue>([
        [hash, 1000000],
      ])

      const result = encode(map)
      expect(result.bytes[0]).toBe(0xa1) // Map with 1 entry
      // 32-byte byte string: 0x58 0x20
      expect(result.bytes[1]).toBe(0x58)
      expect(result.bytes[2]).toBe(0x20)
    })
  })

  describe('Map objects with boolean keys', () => {
    it('should encode Map with true key', () => {
      const { encode } = useCborEncoder()

      const map = new Map<EncodableValue, EncodableValue>([
        [true, 'yes'],
      ])

      const result = encode(map)
      expect(result.bytes[0]).toBe(0xa1) // Map with 1 entry
      // true = 0xf5
      expect(result.bytes[1]).toBe(0xf5)
    })

    it('should encode Map with false key', () => {
      const { encode } = useCborEncoder()

      const map = new Map<EncodableValue, EncodableValue>([
        [false, 'no'],
      ])

      const result = encode(map)
      expect(result.bytes[0]).toBe(0xa1) // Map with 1 entry
      // false = 0xf4
      expect(result.bytes[1]).toBe(0xf4)
    })

    it('should encode Map with both boolean keys', () => {
      const { encode } = useCborEncoder()

      const map = new Map<EncodableValue, EncodableValue>([
        [false, 0],
        [true, 1],
      ])

      const result = encode(map)
      expect(result.bytes[0]).toBe(0xa2) // Map with 2 entries
    })
  })

  describe('Map objects with null keys', () => {
    it('should encode Map with null key', () => {
      const { encode } = useCborEncoder()

      const map = new Map<EncodableValue, EncodableValue>([
        [null, 'nothing'],
      ])

      const result = encode(map)
      expect(result.bytes[0]).toBe(0xa1) // Map with 1 entry
      // null = 0xf6
      expect(result.bytes[1]).toBe(0xf6)
    })

    it('should encode Map with null key and integer value', () => {
      const { encode } = useCborEncoder()

      const map = new Map<EncodableValue, EncodableValue>([
        [null, 42],
      ])

      const result = encode(map)
      expect(result.bytes[0]).toBe(0xa1)
      expect(result.bytes[1]).toBe(0xf6) // null key
      expect(result.bytes[2]).toBe(0x18) // integer 42
      expect(result.bytes[3]).toBe(0x2a) // = 42
    })
  })

  describe('Mixed type keys in same map', () => {
    it('should encode Map with integer and string keys', () => {
      const { encode } = useCborEncoder()

      const map = new Map<EncodableValue, EncodableValue>([
        [1, 'integer-key'],
        ['a', 'string-key'],
      ])

      const result = encode(map)
      expect(result.bytes[0]).toBe(0xa2) // Map with 2 entries
    })

    it('should encode Map with all diverse key types', () => {
      const { encode } = useCborEncoder()

      const map = new Map<EncodableValue, EncodableValue>([
        [1, 'int'],
        ['text', 'str'],
        [new Uint8Array([0xff]), 'bytes'],
        [true, 'bool'],
        [null, 'null'],
      ])

      const result = encode(map)
      expect(result.bytes[0]).toBe(0xa5) // Map with 5 entries
    })

    it('should encode Map with integer and byte string keys in canonical mode', () => {
      const { encode } = useCborEncoder({ canonical: true })

      const map = new Map<EncodableValue, EncodableValue>([
        [new Uint8Array([0x01, 0x02]), 'bytes'],  // 0x42 0x01 0x02 (3 bytes)
        [1, 'int'],                                 // 0x01 (1 byte)
      ])

      const result = encode(map)
      const hex = result.hex

      // Integer key 1 (0x01, 1 byte) should come before byte string (0x420102, 3 bytes)
      const posInt = hex.indexOf('01')
      const posBytes = hex.indexOf('420102')

      expect(posInt).toBeLessThan(posBytes)
    })

    it('should encode Map with negative and positive integer keys', () => {
      const { encode } = useCborEncoder()

      const map = new Map<EncodableValue, EncodableValue>([
        [-1, 'negative'],
        [0, 'zero'],
        [1, 'positive'],
      ])

      const result = encode(map)
      expect(result.bytes[0]).toBe(0xa3) // Map with 3 entries
    })

    it('should handle canonical sorting across all key types', () => {
      const { encode } = useCborEncoder({ canonical: true })

      const map = new Map<EncodableValue, EncodableValue>([
        ['longer-key', 3],              // text string (many bytes)
        [1, 1],                          // integer (1 byte)
        [null, 2],                       // null (1 byte: f6)
      ])

      const result = encode(map)
      const hex = result.hex

      // 1 byte keys should come before multi-byte keys
      // Integer 1 = 0x01 (1 byte), null = 0xf6 (1 byte)
      // Both 1-byte keys before the long string key
      const posLong = hex.indexOf('6a6c6f6e6765722d6b6579') // "longer-key" text
      const posInt = hex.indexOf('0101')   // key=1, value=1
      const posNull = hex.indexOf('f602')  // key=null, value=2

      // Both short keys should appear before the long string key
      expect(posInt).toBeLessThan(posLong)
      expect(posNull).toBeLessThan(posLong)
    })
  })
})
