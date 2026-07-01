/**
 * Cardano Integration Tests
 * Real-world Cardano CBOR data roundtrip tests
 */

import { describe, it, expect } from 'vitest'
import { useCborParser } from '../../parser/composables/useCborParser'
import { useCborEncoder } from '../../encoder/composables/useCborEncoder'

describe('Cardano CBOR Integration Tests', () => {
  const { parse, parseWithSourceMap } = useCborParser()
  const { encode } = useCborEncoder({ canonical: true })

  describe('CIP-30 Wallet API Examples', () => {
    it('should decode and roundtrip collateral UTXO', () => {
      // Real CIP-30 collateral response: Array of [txHash, outputIndex]
      // 82 = array of 2, 5820 = 32 byte string, 00 = index 0
      const hex = '82582048bd01d51e580cde15afa6d28f63d89c9137b93a910e5941192e26b12906106700'

      const decoded = parse(hex)
      expect(decoded.value).toBeInstanceOf(Array)
      expect(decoded.value.length).toBe(2)

      // Should have txHash (32 bytes) and index
      const [txInfo, idx] = decoded.value
      expect(txInfo).toBeInstanceOf(Uint8Array)
      expect(txInfo.length).toBe(32)
      expect(idx).toBe(0)
    })

    it('should decode wallet balance response', () => {
      // Balance: 1000000 lovelace (1 ADA)
      const hex = '1a000f4240'

      const decoded = parse(hex)
      expect(decoded.value).toBe(1000000)
    })

    it('should decode multi-asset balance', () => {
      // Simple map with ADA amount
      const hex = 'a1001a000f4240' // {0: 1000000}

      const decoded = parse(hex)
      // Nachos base decodes CBOR maps to real Map instances and preserves the
      // integer key 0 (rather than coercing to the string "0").
      expect(decoded.value).toBeInstanceOf(Map)
      expect((decoded.value as Map<unknown, unknown>).get(0)).toBe(1000000)
    })
  })

  describe('Plutus Data Structures', () => {
    it('should decode Plutus Nothing (tag 121, empty array)', () => {
      const hex = 'd87980'

      const decoded = parse(hex)
      expect(decoded.value.tag).toBe(121)
      expect(decoded.value.value).toEqual([])
    })

    it('should decode Plutus Just (tag 122, [value])', () => {
      const hex = 'd87a81182a' // Just 42

      const decoded = parse(hex)
      expect(decoded.value.tag).toBe(122)
      expect(decoded.value.value).toEqual([42])
    })

    it('should decode nested Plutus constructors', () => {
      // Tag 121 containing Tag 122 containing value
      const hex = 'd87981d87a8100'

      const decoded = parse(hex)
      expect(decoded.value.tag).toBe(121)
      expect(decoded.value.value[0].tag).toBe(122)
    })

    it('should roundtrip complex Plutus redeemer', () => {
      // Real-world redeemer structure
      const original = {
        tag: 121,
        value: [
          'stream_id_123',
          42n,
          1000000n,
          { tag: 121, value: [] }
        ]
      }

      const encoded = encode(original)
      const decoded = parse(encoded.hex)

      expect(decoded.value.tag).toBe(121)
      expect(decoded.value.value[0]).toBe('stream_id_123')
      expect(decoded.value.value[3].tag).toBe(121)
    })

    it('should decode alternative constructor (tag 102)', () => {
      // Tag 102: [constructor_index, fields]
      const hex = 'd8668218c8811863' // Constructor 200 with field [99]

      const decoded = parse(hex)
      expect(decoded.value.tag).toBe(102)
      expect(decoded.value.value[0]).toBe(200)
      expect(decoded.value.value[1]).toEqual([99])
    })

    it('should decode extended constructor (tag 1280+)', () => {
      const hex = 'd9050083010203' // Constructor 7 with fields [1,2,3]

      const decoded = parse(hex)
      expect(decoded.value.tag).toBe(1280)
      expect(decoded.value.value).toEqual([1, 2, 3])
    })
  })

  describe('Transaction Components', () => {
    it('should decode script hash (28 bytes)', () => {
      const hash = '2fc2a082557dc6a74dfc42d204a6d3ff1a241c103c0bbdd2f3525ce6'
      const hex = '581c' + hash

      const decoded = parse(hex)
      expect(decoded.value).toBeInstanceOf(Uint8Array)
      expect(decoded.value.length).toBe(28)
    })

    it('should decode transaction hash (32 bytes)', () => {
      const hash = '48bd01d51e580cde15afa6d28f63d89c9137b93a910e5941192e26b129061067'
      const hex = '5820' + hash

      const decoded = parse(hex)
      expect(decoded.value).toBeInstanceOf(Uint8Array)
      expect(decoded.value.length).toBe(32)
    })

    it('should decode address with stake part', () => {
      // Byron/Shelley address bytes
      const hex = '5839010102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f30313233343536373839'

      const decoded = parse(hex)
      expect(decoded.value).toBeInstanceOf(Uint8Array)
      expect(decoded.value.length).toBe(57)
    })
  })

  describe('Metadata Structures', () => {
    it('should decode NFT metadata', () => {
      // Simplified NFT metadata map
      const nftMeta = {
        name: 'Test NFT',
        image: 'ipfs://QmTest',
        mediaType: 'image/png'
      }

      const encoded = encode(nftMeta)
      const decoded = parse(encoded.hex)

      // Nachos base decodes CBOR maps to real Map instances.
      const decodedMap = decoded.value as Map<unknown, unknown>
      expect(decodedMap.get('name')).toBe('Test NFT')
      expect(decodedMap.get('image')).toBe('ipfs://QmTest')
    })

    it('should decode CIP-25 style metadata', () => {
      // Policy -> Asset -> Properties
      const metadata = {
        '721': {
          'policyId': {
            'assetName': {
              name: 'NFT',
              description: 'Test'
            }
          }
        }
      }

      const encoded = encode(metadata)
      const decoded = parse(encoded.hex)

      // Nachos base decodes nested CBOR maps to nested Map instances.
      const root = decoded.value as Map<unknown, unknown>
      const policy = root.get('721') as Map<unknown, unknown>
      const asset = policy.get('policyId') as Map<unknown, unknown>
      const props = asset.get('assetName') as Map<unknown, unknown>
      expect(props.get('name')).toBe('NFT')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large integers (epoch)', () => {
      // Cardano slot number
      const slot = 104622300
      const encoded = encode(slot)
      const decoded = parse(encoded.hex)
      expect(decoded.value).toBe(slot)
    })

    it('should handle negative integers', () => {
      // Negative coin values (for calculation)
      const value = -1000000
      const encoded = encode(value)
      const decoded = parse(encoded.hex)
      expect(decoded.value).toBe(value)
    })

    it('should handle empty collections', () => {
      const emptyArray = encode([])
      const emptyMap = encode({})

      expect(parse(emptyArray.hex).value).toEqual([])
      // Nachos base decodes an empty CBOR map to an empty Map instance.
      expect(parse(emptyMap.hex).value).toEqual(new Map())
    })

    it('should handle deeply nested structures', () => {
      const deep = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      }

      const encoded = encode(deep)
      const decoded = parse(encoded.hex)
      // Nachos base decodes nested CBOR maps to nested Map instances.
      const l1 = (decoded.value as Map<unknown, unknown>).get('level1') as Map<unknown, unknown>
      const l2 = l1.get('level2') as Map<unknown, unknown>
      const l3 = l2.get('level3') as Map<unknown, unknown>
      expect(l3.get('value')).toBe('deep')
    })
  })

  describe('Source Map Generation', () => {
    it('should generate source map for complex data', () => {
      const hex = '83010203' // [1, 2, 3]

      const result = parseWithSourceMap(hex)
      expect(result.sourceMap).toBeDefined()
      expect(result.sourceMap.length).toBeGreaterThan(0)
    })

    it('should track byte positions correctly', () => {
      const hex = 'a2616101616202' // {a: 1, b: 2}

      const result = parseWithSourceMap(hex)
      expect(result.sourceMap[0].start).toBe(0)
      expect(result.bytesRead).toBe(7) // Total bytes
    })
  })
})
