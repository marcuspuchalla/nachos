/**
 * Tests for Cardano Helper Functions
 */

import { describe, it, expect } from 'vitest'
import { useCardanoHelpers } from '../composables/useCardanoHelpers'

describe('useCardanoHelpers', () => {
  const helpers = useCardanoHelpers()

  describe('Address Parsing', () => {
    it('should parse Shelley base address', () => {
      // Base address with payment and stake key hashes
      const hex = '583901aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

      const address = helpers.parseAddress(hex)

      expect(address.type).toBe('shelley')
      expect(address.network).toBe('mainnet')
      expect(address.paymentCredential?.type).toBe('key')
      expect(address.stakeCredential?.type).toBe('key')
    })

    it('should parse enterprise address', () => {
      // Enterprise address (no stake credential) - 29 bytes: type byte + 28-byte key hash
      // Type byte 0x61 = 0110 0001 = enterprise address (type 6) + mainnet (network 1)
      // Followed by 28-byte payment key hash
      const hex = '581d6179df6c1244e0d5e1b1ccdd63f9e1c6b8f8c4e6d0c2a8f6e4d2c0b8a0'

      const address = helpers.parseAddress(hex)

      expect(address.type).toBe('enterprise')
      expect(address.paymentCredential).toBeDefined()
      expect(address.stakeCredential).toBeUndefined()
    })
  })

  describe('Plutus Data', () => {
    it('should parse Plutus constructor 0 (tag 121)', () => {
      const value = {
        tag: 121,
        value: [42, 'test']
      }

      const plutusData = helpers.parsePlutusData(value)

      expect(plutusData.constructor).toBe(0)
      expect(plutusData.fields).toEqual([42, 'test'])
    })

    it('should parse Plutus constructor 1 (tag 122)', () => {
      const value = {
        tag: 122,
        value: [100]
      }

      const plutusData = helpers.parsePlutusData(value)

      expect(plutusData.constructor).toBe(1)
      expect(plutusData.fields).toEqual([100])
    })

    it('should parse Plutus constructor 7 (tag 1280)', () => {
      const value = {
        tag: 1280,
        value: []
      }

      const plutusData = helpers.parsePlutusData(value)

      expect(plutusData.constructor).toBe(7)
      expect(plutusData.fields).toEqual([])
    })

    it('should parse big constructor with tag 102', () => {
      const value = {
        tag: 102,
        value: [200, [1, 2, 3]]
      }

      const plutusData = helpers.parsePlutusData(value)

      expect(plutusData.constructor).toBe(200)
      expect(plutusData.fields).toEqual([1, 2, 3])
    })

    it('should identify Plutus constructors', () => {
      expect(helpers.isPlutusConstructor({ tag: 121, value: [] })).toBe(true)
      expect(helpers.isPlutusConstructor({ tag: 127, value: [] })).toBe(true)
      expect(helpers.isPlutusConstructor({ tag: 1280, value: [] })).toBe(true)
      expect(helpers.isPlutusConstructor({ tag: 102, value: [1, []] })).toBe(true)

      expect(helpers.isPlutusConstructor({ tag: 0, value: [] })).toBe(false)
      expect(helpers.isPlutusConstructor({ tag: 258, value: [] })).toBe(false)
      expect(helpers.isPlutusConstructor('not an object')).toBe(false)
    })
  })

  describe('Transaction Body Parsing', () => {
    it('should parse transaction body map', () => {
      const bodyMap = new Map([
        [0, [[new Uint8Array(32), 0]]],  // inputs
        [1, []],  // outputs
        [2, 170000],  // fee
        [3, 12345678]  // ttl
      ])

      const txBody = helpers.parseTransactionBody(bodyMap)

      expect(txBody.inputs).toBeDefined()
      expect(txBody.outputs).toBeDefined()
      expect(txBody.fee).toBe(170000)
      expect(txBody.ttl).toBe(12345678)
    })

    it('should parse Babbage-era fields', () => {
      const bodyMap = new Map([
        [2, 170000],  // fee
        [13, []],  // collateral inputs
        [16, undefined],  // collateral return
        [17, 5000000],  // total collateral
        [18, []]  // reference inputs (Babbage)
      ])

      const txBody = helpers.parseTransactionBody(bodyMap)

      expect(txBody.fee).toBe(170000)
      expect(txBody.collateral).toEqual([])
      expect(txBody.totalCollateral).toBe(5000000)
      expect(txBody.referenceInputs).toEqual([])
    })

    it('should parse Conway-era fields', () => {
      const bodyMap = new Map([
        [2, 170000],  // fee
        [19, undefined],  // voting procedures
        [20, undefined],  // proposal procedures
        [21, 1000000000],  // current treasury value
        [22, 100000]  // donation
      ])

      const txBody = helpers.parseTransactionBody(bodyMap)

      expect(txBody.currentTreasuryValue).toBe(1000000000)
      expect(txBody.donation).toBe(100000)
    })
  })

  describe('Witness Set Parsing', () => {
    it('should parse witness set map', () => {
      const witnessMap = new Map([
        [0, []],  // vkey witnesses
        [3, []],  // Plutus V1 scripts
        [4, []],  // Plutus data
        [5, []]   // redeemers
      ])

      const witnesses = helpers.parseWitnessSet(witnessMap)

      expect(witnesses.vkeyWitnesses).toEqual([])
      expect(witnesses.plutusV1Scripts).toEqual([])
      expect(witnesses.plutusData).toEqual([])
      expect(witnesses.redeemers).toEqual([])
    })

    it('should parse Plutus V2 and V3 witnesses', () => {
      const witnessMap = new Map([
        [6, []],  // Plutus V2 scripts
        [7, []]   // Plutus V3 scripts
      ])

      const witnesses = helpers.parseWitnessSet(witnessMap)

      expect(witnesses.plutusV2Scripts).toEqual([])
      expect(witnesses.plutusV3Scripts).toEqual([])
    })
  })
})
