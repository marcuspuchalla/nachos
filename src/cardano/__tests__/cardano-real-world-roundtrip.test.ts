/**
 * Real-World Cardano CBOR Roundtrip Tests
 * Tests that decode(encode(x)) === x for actual Cardano transaction structures
 *
 * These test cases are based on real Cardano preprod transactions
 * and verify that our encoder/decoder maintain perfect fidelity.
 */

import { describe, it, expect } from 'vitest'
import { useCborParser } from '../../parser/composables/useCborParser'
import { useCborEncoder } from '../../encoder/composables/useCborEncoder'

describe('Real-World Cardano Roundtrip Tests', () => {
  const { parseWithSourceMap } = useCborParser()
  const { encode } = useCborEncoder()

  /**
   * Helper function to verify roundtrip: decode(encode(decoded)) === decoded
   */
  function verifyRoundtrip(cborHex: string, description: string) {
    // Step 1: Decode original CBOR
    const decoded = parseWithSourceMap(cborHex)
    expect(decoded.value).toBeDefined()

    // Step 2: Encode the decoded value
    const encodeResult = encode(decoded.value, { canonical: true })
    const reencodedHex = encodeResult.hex

    // Step 3: Decode the re-encoded value
    const redecoded = parseWithSourceMap(reencodedHex)

    // Step 4: Verify equality
    expect(redecoded.value).toEqual(decoded.value)

    console.log(`✅ Roundtrip verified for: ${description}`)
    console.log(`   Original bytes: ${cborHex.length / 2}`)
    console.log(`   Re-encoded bytes: ${reencodedHex.length / 2}`)

    return { decoded, reencoded: encodeResult.bytes, redecoded }
  }

  describe('Simple ADA Transfers', () => {
    it('should roundtrip simple UTXO input', () => {
      // [[txHash, index]]
      const txHash = '48bd01d51e580cde15afa6d28f63d89c9137b93a910e5941192e26b129061067'
      const cborHex = '82' + '5820' + txHash + '00'

      verifyRoundtrip(cborHex, 'Simple UTXO input')
    })

    it('should roundtrip lovelace amount (1 ADA)', () => {
      // 1,000,000 lovelace
      const cborHex = '1a000f4240'

      verifyRoundtrip(cborHex, '1 ADA amount')
    })

    it('should roundtrip transaction output', () => {
      // [address, amount]
      const address = '000dae074cac48222800da644971a35b68832abb40b619643efde77dc9db8ec58f9fa297093e286f81d37bea7154209064956254d5d4e2108d'
      const cborHex = '82' + '5839' + address + '1a000f4240'

      verifyRoundtrip(cborHex, 'Transaction output (address + amount)')
    })
  })

  describe('Plutus Data Structures', () => {
    it('should roundtrip Plutus constructor 0 (Nothing)', () => {
      // Tag 121 with empty array
      const cborHex = 'd87980'

      verifyRoundtrip(cborHex, 'Plutus Constructor 0 (Nothing)')
    })

    it('should roundtrip Plutus constructor 1 (Just 42)', () => {
      // Tag 122 with [42]
      const cborHex = 'd87a81182a'

      verifyRoundtrip(cborHex, 'Plutus Constructor 1 (Just 42)')
    })

    it('should roundtrip nested Plutus constructors', () => {
      // Tag 121 -> [Tag 121 -> []]
      const cborHex = 'd87981d87980'

      verifyRoundtrip(cborHex, 'Nested Plutus constructors')
    })

    it('should roundtrip Plutus extended constructor (tag 1283)', () => {
      // Tag 1283 (Constructor 10) with [1, 2, 3]
      const cborHex = 'd9050383010203'

      verifyRoundtrip(cborHex, 'Plutus Extended Constructor 10')
    })

    it('should roundtrip Plutus alternative constructor (tag 102)', () => {
      // Tag 102 with [200, [99]]
      const cborHex = 'd8668218c8811863'

      verifyRoundtrip(cborHex, 'Plutus Alternative Constructor 200')
    })
  })

  describe('Complex Cardano Structures', () => {
    it('should roundtrip redeemer with Plutus data', () => {
      // Real redeemer: Tag 121 with indefinite array of mixed data
      const cborHex = 'd8799f' +
        '5773747265616d5f6d677870763171645f356b65376e6b6a' +
        '581c2fc2a082557dc6a74dfc42d204a6d3ff1a241c103c0bbdd2f3525ce6' +
        '581cd8b6a54c95aac8970bcfbf625bb694336c43baa40aa1fc50952563f4' +
        '1a03473bc0' +
        '1a064528dc' +
        '1a064544e8' +
        '1a06467a5c' +
        '00' +
        'd87980' +
        'ff'

      verifyRoundtrip(cborHex, 'Real Cardano redeemer with Plutus data')
    })

    it('should roundtrip map with text keys', () => {
      // {"amount": 1000000}
      const cborHex = 'a166616d6f756e741a000f4240'

      verifyRoundtrip(cborHex, 'Map with text keys')
    })

    it('should roundtrip nested maps', () => {
      // {"tx": {"fee": 170000}}
      const cborHex = 'a16274' + 'a1636665651a00029810'

      verifyRoundtrip(cborHex, 'Nested maps (transaction metadata)')
    })

    it('should roundtrip indefinite-length array', () => {
      // Indefinite array [1, 2, 3, 4, 5]
      const cborHex = '9f0102030405ff'

      verifyRoundtrip(cborHex, 'Indefinite-length array')
    })

    it('should roundtrip indefinite-length map', () => {
      // Indefinite map {"a": 1, "b": 2}
      const cborHex = 'bf616101616202ff'

      const result = verifyRoundtrip(cborHex, 'Indefinite-length map')

      // NOTE: Canonical mode will convert to definite-length
      // So we just verify the VALUE is preserved, not the exact encoding
      expect(result.decoded.value).toEqual(result.redecoded.value)
    })
  })

  describe('Edge Cases and Special Values', () => {
    it('should roundtrip empty structures', () => {
      const emptyArray = '80'
      const emptyMap = 'a0'
      const emptyString = '60'
      const emptyBytes = '40'

      verifyRoundtrip(emptyArray, 'Empty array')
      verifyRoundtrip(emptyMap, 'Empty map')
      verifyRoundtrip(emptyString, 'Empty string')
      verifyRoundtrip(emptyBytes, 'Empty byte string')
    })

    it('should roundtrip boolean values', () => {
      const falseValue = 'f4'
      const trueValue = 'f5'

      verifyRoundtrip(falseValue, 'Boolean false')
      verifyRoundtrip(trueValue, 'Boolean true')
    })

    it('should roundtrip null and undefined', () => {
      const nullValue = 'f6'
      const undefinedValue = 'f7'

      verifyRoundtrip(nullValue, 'Null value')

      // Undefined requires special handling since expect(undefined).toBeDefined() fails
      const decodedUndef = parseWithSourceMap(undefinedValue)
      expect(decodedUndef.value).toBeUndefined()

      const encodedUndef = encode(decodedUndef.value, { canonical: true })
      const redecodedUndef = parseWithSourceMap(encodedUndef.hex)
      expect(redecodedUndef.value).toBeUndefined()

      console.log(`✅ Roundtrip verified for: Undefined value`)
    })

    it('should roundtrip large integers', () => {
      // 2^32 = 4294967296
      const cborHex = '1b0000000100000000'

      verifyRoundtrip(cborHex, 'Large integer (2^32)')
    })

    it('should roundtrip negative integers', () => {
      // -1000
      const cborHex = '3903e7'

      verifyRoundtrip(cborHex, 'Negative integer (-1000)')
    })

    it('should roundtrip floating point numbers', () => {
      // 1.1 as float64
      const cborHex = 'fb3ff199999999999a'

      verifyRoundtrip(cborHex, 'Float64 (1.1)')
    })
  })

  describe('Real Transaction Components', () => {
    it('should roundtrip transaction hash', () => {
      const txHash = '48bd01d51e580cde15afa6d28f63d89c9137b93a910e5941192e26b129061067'
      const cborHex = '5820' + txHash

      verifyRoundtrip(cborHex, 'Transaction hash (32 bytes)')
    })

    it('should roundtrip payment key hash', () => {
      const keyHash = '000dae074cac48222800da644971a35b68832abb40b619643efde77dc9'
      const cborHex = '581c' + keyHash

      verifyRoundtrip(cborHex, 'Payment key hash (28 bytes)')
    })

    it('should roundtrip Shelley address', () => {
      const address = '000dae074cac48222800da644971a35b68832abb40b619643efde77dc9db8ec58f9fa297093e286f81d37bea7154209064956254d5d4e2108d'
      const cborHex = '5839' + address

      verifyRoundtrip(cborHex, 'Shelley address (57 bytes)')
    })

    it('should roundtrip collateral UTXO structure', () => {
      // Real CIP-30 collateral format
      const txHash = '48bd01d51e580cde15afa6d28f63d89c9137b93a910e5941192e26b129061067'
      const cborHex = '8182' + '5820' + txHash + '00'

      verifyRoundtrip(cborHex, 'CIP-30 collateral UTXO')
    })
  })

  describe('Tagged Values (Non-Plutus)', () => {
    it('should roundtrip datetime (tag 0)', () => {
      // Tag 0 with "2013-03-21T20:04:00Z"
      const cborHex = 'c074323031332d30332d32315432303a30343a30305a'

      verifyRoundtrip(cborHex, 'Datetime (tag 0)')
    })

    it('should roundtrip set (tag 258)', () => {
      // Tag 258 with [1, 2, 3]
      const cborHex = 'd9010283010203'

      verifyRoundtrip(cborHex, 'Set (tag 258)')
    })
  })

  describe('Canonical Encoding Verification', () => {
    it('should produce canonical encoding for maps', () => {
      // Map with keys that need sorting: {"z": 1, "a": 2}
      // Canonical order should be: {"a": 2, "z": 1}
      const unsortedMap = { z: 1, a: 2 }

      const encoded = encode(unsortedMap, { canonical: true })
      const hex = encoded.hex

      // Decode and verify order is preserved in value (JS Maps maintain insertion order)
      const decoded = parseWithSourceMap(hex)

      // Re-encode and verify it's still canonical
      const reencoded = encode(decoded.value, { canonical: true })
      const reencodedHex = reencoded.hex

      expect(hex).toBe(reencodedHex)
      // Nachos base decodes CBOR maps to real Map instances (rather than plain
      // objects), preserving key types. Assert the decoded entries directly.
      expect(decoded.value).toBeInstanceOf(Map)
      const decodedMap = decoded.value as Map<unknown, unknown>
      expect(decodedMap.size).toBe(2)
      expect(decodedMap.get('a')).toBe(2)
      expect(decodedMap.get('z')).toBe(1)
    })

    it('should use smallest integer encoding', () => {
      // 23 should be encoded as 0x17 (1 byte), not 0x1817 (2 bytes)
      const encoded = encode(23, { canonical: true })
      expect(encoded.bytes).toHaveLength(1)
      expect(encoded.bytes[0]).toBe(0x17)

      // 100 should be encoded as 0x1864 (2 bytes)
      const encoded100 = encode(100, { canonical: true })
      expect(encoded100.bytes).toHaveLength(2)
      expect(encoded100.bytes[0]).toBe(0x18)
      expect(encoded100.bytes[1]).toBe(0x64)
    })

    it('should use definite-length encoding in canonical mode', () => {
      const array = [1, 2, 3]
      const encoded = encode(array, { canonical: true })

      // Should NOT start with 0x9f (indefinite array)
      expect(encoded.bytes[0]).not.toBe(0x9f)
      // Should start with 0x83 (definite array of 3)
      expect(encoded.bytes[0]).toBe(0x83)
    })
  })

  describe('Stress Tests with Large Structures', () => {
    it('should roundtrip array with 100 elements', () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => i)
      const encoded = encode(largeArray, { canonical: true })
      const hex = encoded.hex

      verifyRoundtrip(hex, 'Array with 100 elements')
    })

    it('should roundtrip map with 50 entries', () => {
      const largeMap: Record<string, number> = {}
      for (let i = 0; i < 50; i++) {
        largeMap[`key${i}`] = i
      }

      const encoded = encode(largeMap, { canonical: true })
      const hex = encoded.hex

      verifyRoundtrip(hex, 'Map with 50 entries')
    })

    it('should roundtrip deeply nested structure', () => {
      // Nest arrays 10 levels deep
      let nested: any = [42]
      for (let i = 0; i < 9; i++) {
        nested = [nested]
      }

      const encoded = encode(nested, { canonical: true })
      const hex = encoded.hex

      verifyRoundtrip(hex, 'Deeply nested array (10 levels)')
    })
  })
})
