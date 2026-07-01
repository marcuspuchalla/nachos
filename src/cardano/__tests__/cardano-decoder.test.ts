/**
 * Cardano CBOR Decoder Tests
 * Tests enhanced decoder with Cardano-specific interpretations
 */

import { describe, it, expect } from 'vitest'
import { useCardanoCborDecoder } from '../composables/useCardanoCborDecoder'

describe('useCardanoCborDecoder', () => {
  describe('Basic Decoding', () => {
    it('should decode simple integer with description', () => {
      const { decode } = useCardanoCborDecoder()
      const result = decode('1864') // 100

      expect(result.value).toBe(100)
      expect(result.sourceMap).toHaveLength(1)
      expect(result.sourceMap[0].description).toContain('100')
      expect(result.sourceMap[0].bytesHex).toBe('1864')
    })

    it('should decode text string with description', () => {
      const { decode } = useCardanoCborDecoder()
      const result = decode('6449455446') // "IETF"

      expect(result.value).toBe('IETF')
      expect(result.sourceMap[0].description).toContain('IETF')
    })

    it('should decode boolean with description', () => {
      const { decode } = useCardanoCborDecoder()
      const result = decode('f5') // true

      expect(result.value).toBe(true)
      expect(result.sourceMap[0].description).toBe('boolean: true')
    })
  })

  describe('Cardano-Specific Values', () => {
    it('should recognize 1 ADA amount', () => {
      const { decode } = useCardanoCborDecoder()
      const result = decode('1a000f4240') // 1000000

      expect(result.value).toBe(1000000)
      expect(result.sourceMap[0].description).toContain('1 ADA')
      expect(result.sourceMap[0].description).toContain('lovelace')
    })

    it('should recognize 10 ADA amount', () => {
      const { decode } = useCardanoCborDecoder()
      const result = decode('1a00989680') // 10000000

      expect(result.value).toBe(10000000)
      expect(result.sourceMap[0].description).toContain('10 ADA')
    })

    it('should recognize 32-byte hash', () => {
      const { decode } = useCardanoCborDecoder()
      // 32-byte hash
      const hash = '48bd01d51e580cde15afa6d28f63d89c9137b93a910e5941192e26b129061067'
      const result = decode('5820' + hash)

      expect(result.sourceMap[0].description).toContain('32 bytes')
      expect(result.sourceMap[0].description).toContain('tx hash')
    })

    it('should recognize 28-byte key hash', () => {
      const { decode } = useCardanoCborDecoder()
      // 28-byte key hash
      const keyHash = '000dae074cac48222800da644971a35b68832abb40b619643efde77dc9'
      const result = decode('581c' + keyHash)

      expect(result.sourceMap[0].description).toContain('28 bytes')
      expect(result.sourceMap[0].description).toContain('key hash')
    })

    it('should recognize 57-byte Shelley address', () => {
      const { decode } = useCardanoCborDecoder()
      // 57-byte address
      const address = '000dae074cac48222800da644971a35b68832abb40b619643efde77dc9db8ec58f9fa297093e286f81d37bea7154209064956254d5d4e2108d'
      const result = decode('5839' + address)

      expect(result.sourceMap[0].description).toContain('57 bytes')
      expect(result.sourceMap[0].description).toContain('Shelley address')
    })
  })

  describe('Maps with Cardano Context', () => {
    it('should decode map with amount field', () => {
      const { decode } = useCardanoCborDecoder()
      // {"amount": 1000000}
      const result = decode('a166616d6f756e741a000f4240')

      // Nachos base decodes CBOR maps to real Map instances (integer/typed-key
      // preserving), so the decoded value is a Map, not a plain object.
      expect(result.value).toEqual(new Map<unknown, unknown>([['amount', 1000000]]))
      expect(result.sourceMap).toHaveLength(4) // map header + key header + key content + value

      // Check map entry
      const mapEntry = result.sourceMap[0]
      expect(mapEntry.path).toBe('')
      expect(mapEntry.type).toContain('map')
      expect(mapEntry.description).toContain('1 entry')

      // Check amount value entry (path changed to .amount with leading dot)
      const amountEntry = result.sourceMap.find(e => e.path === '.amount')
      expect(amountEntry).toBeDefined()
      expect(amountEntry!.type).toBe('Unsigned Integer')
      expect(amountEntry!.description).toContain('lovelace')
    })
  })

  describe('Arrays with Cardano Context', () => {
    it('should detect transaction hash in array', () => {
      const { decode } = useCardanoCborDecoder()
      // [[txHash, 0]]
      const txHash = '48bd01d51e580cde15afa6d28f63d89c9137b93a910e5941192e26b129061067'
      const hex = '8182' + '5820' + txHash + '00'

      const result = decode(hex)

      // Find the tx hash entry
      const txHashEntry = result.sourceMap.find(e => e.path === '[0][0]')
      expect(txHashEntry).toBeDefined()
      expect(txHashEntry?.cardanoType).toContain('Hash32') // Updated to match actual output
    })

    it('should detect address and amount in UTXO', () => {
      const { decode } = useCardanoCborDecoder()
      // [[txHash, 0], [address, amount]]
      const txHash = '48bd01d51e580cde15afa6d28f63d89c9137b93a910e5941192e26b129061067'
      const address = '000dae074cac48222800da644971a35b68832abb40b619643efde77dc9db8ec58f9fa297093e286f81d37bea7154209064956254d5d4e2108d'
      const hex = '82' + // array of 2
                   '82' + '5820' + txHash + '00' + // [txHash, 0]
                   '82' + '5839' + address + '1a000f4240' // [address, 1000000]

      const result = decode(hex)

      // Find address entry
      const addressEntry = result.sourceMap.find(e => e.path === '[1][0]')
      expect(addressEntry).toBeDefined()
      expect(addressEntry?.cardanoType).toContain('Address')

      // Find amount entry
      const amountEntry = result.sourceMap.find(e => e.path === '[1][1]')
      expect(amountEntry).toBeDefined()
      expect(amountEntry?.cardanoType).toContain('lovelace')
      expect(amountEntry?.description).toContain('1 ADA')
    })
  })

  describe('Utility Functions', () => {
    it('should format hex string with spaces', () => {
      const { formatHex } = useCardanoCborDecoder()
      expect(formatHex('1864')).toBe('18 64')
      expect(formatHex('a166616d6f756e741a000f4240')).toBe('a1 66 61 6d 6f 75 6e 74 1a 00 0f 42 40')
    })

    it('should provide byte breakdown', () => {
      const { decode, getByteBreakdown } = useCardanoCborDecoder()
      const result = decode('1864')

      const breakdown = getByteBreakdown(result.sourceMap[0])
      expect(breakdown).toHaveLength(2)
      expect(breakdown[0].byte).toBe('18')
      expect(breakdown[0].description).toContain('CBOR header')
      expect(breakdown[1].byte).toBe('64')
    })
  })

  describe('Complex Structures', () => {
    it('should handle nested arrays with context', () => {
      const { decode } = useCardanoCborDecoder()
      const result = decode('83010203') // [1, 2, 3]

      expect(result.sourceMap).toHaveLength(4) // array + 3 elements
      expect(result.sourceMap[0].description).toContain('array [3]') // Updated to match actual format
    })

    it('should handle maps with multiple entries', () => {
      const { decode } = useCardanoCborDecoder()
      // {a: 1, b: 2}
      const result = decode('a2616101616202')

      expect(result.sourceMap[0].description).toContain('2 entries')
    })

    it('should handle tagged values', () => {
      const { decode } = useCardanoCborDecoder()
      // Tag 121 (Cardano address with network tag)
      const result = decode('d87900') // tag 121, value 0

      const tagEntry = result.sourceMap.find(e => e.type.startsWith('tag('))
      expect(tagEntry).toBeDefined()
      expect(tagEntry?.description).toContain('Cardano')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const { decode } = useCardanoCborDecoder()
      const result = decode('60')

      expect(result.value).toBe('')
      expect(result.sourceMap[0].description).toBe('empty string')
    })

    it('should handle empty byte string', () => {
      const { decode } = useCardanoCborDecoder()
      const result = decode('40')

      expect(result.value).toEqual(new Uint8Array([]))
      expect(result.sourceMap[0].description).toBe('empty byte string')
    })

    it('should handle null', () => {
      const { decode } = useCardanoCborDecoder()
      const result = decode('f6')

      expect(result.value).toBe(null)
      expect(result.sourceMap[0].description).toBe('null value')
    })

    it('should handle undefined', () => {
      const { decode } = useCardanoCborDecoder()
      const result = decode('f7')

      expect(result.value).toBe(undefined)
      expect(result.sourceMap[0].description).toBe('undefined value')
    })

    it('should truncate long strings in description', () => {
      const { decode } = useCardanoCborDecoder()
      const longText = 'a'.repeat(100)
      const hex = '78' + '64' + Buffer.from(longText, 'utf-8').toString('hex')
      const result = decode(hex)

      expect(result.sourceMap[0].description).toContain('...')
      expect(result.sourceMap[0].description).toContain('100 chars')
    })
  })
})
