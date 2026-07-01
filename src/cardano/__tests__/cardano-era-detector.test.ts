/**
 * Cardano Era Detector Tests
 *
 * Tests era detection across all Cardano eras (Byron → Conway)
 * using real-world transaction structures.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest'
import { useCardanoEraDetector } from '../composables/useCardanoEraDetector'
import { useCborParser } from '../../parser/composables/useCborParser'

describe('useCardanoEraDetector', () => {
  const { detectEra, getEraInfo, formatDetectionResult } = useCardanoEraDetector()
  const { parse } = useCborParser()

  // Helper to parse hex and detect era
  const detectFromHex = (hex: string) => {
    const result = parse(hex)
    return detectEra(result.value)
  }

  describe('Shelley era detection', () => {
    it('should detect Shelley transaction with stake delegation certificate', () => {
      // Minimal transaction body with stake delegation certificate
      // { 0: [[txid, 0]], 1: [[addr, 1000000]], 2: 200000, 4: [[2, stake_cred, pool_id]] }
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],  // inputs
        [1, [[new Uint8Array(57), 1000000n]]],  // outputs
        [2, 200000n],  // fee
        [4, [[2, [0, new Uint8Array(28)], new Uint8Array(28)]]],  // stake delegation cert
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('shelley')
      expect(result.markers.some(m => m.type === 'certificate_type')).toBe(true)
      expect(result.transactionInfo?.hasCertificates).toBe(true)
    })

    it('should detect Shelley transaction with TTL', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [3, 50000000],  // TTL
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('shelley')
      expect(result.markers.some(m => m.field === 'ttl')).toBe(true)
    })

    it('should detect Shelley transaction with withdrawals', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [5, new Map([[new Uint8Array(29), 50000000n]])],  // withdrawals
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('shelley')
      expect(result.transactionInfo?.hasWithdrawals).toBe(true)
    })
  })

  describe('Allegra era detection', () => {
    it('should detect Allegra transaction with validity_interval_start', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [3, 50000000],  // TTL
        [8, 45000000],  // validity_interval_start (Allegra+)
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('allegra')
      // Allegra only has one unique marker, so confidence is medium
      expect(['high', 'medium']).toContain(result.confidence)
      expect(result.markers.some(m =>
        m.era === 'allegra' && m.field === 'validity_interval_start'
      )).toBe(true)
    })
  })

  describe('Mary era detection', () => {
    it('should detect Mary transaction with mint field', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [9, new Map([  // mint field
          [new Uint8Array(28), new Map([[new Uint8Array(8), 1000n]])]
        ])],
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('mary')
      expect(result.transactionInfo?.hasMint).toBe(true)
      expect(result.markers.some(m => m.field === 'mint')).toBe(true)
    })

    it('should detect Mary transaction with multiasset outputs', () => {
      // Output with multiasset: [address, [coin, multiasset]]
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[
          new Uint8Array(57),
          [1000000n, new Map([[new Uint8Array(28), new Map([[new Uint8Array(8), 100n]])]])]
        ]]],
        [2, 200000n],
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('mary')
      expect(result.markers.some(m =>
        m.type === 'output_format' && m.description.includes('Multi-asset')
      )).toBe(true)
    })
  })

  describe('Alonzo era detection', () => {
    it('should detect Alonzo transaction with script_data_hash', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [11, new Uint8Array(32)],  // script_data_hash
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('alonzo')
      expect(result.markers.some(m => m.field === 'script_data_hash')).toBe(true)
    })

    it('should detect Alonzo transaction with collateral', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [13, [[new Uint8Array(32), 1]]],  // collateral inputs
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('alonzo')
      expect(result.transactionInfo?.hasCollateral).toBe(true)
    })

    it('should detect Alonzo from Plutus V1 scripts in witness set', () => {
      // Full transaction: [body, witness_set, is_valid, auxiliary_data]
      const tx = [
        new Map<number, unknown>([  // body
          [0, [[new Uint8Array(32), 0]]],
          [1, [[new Uint8Array(57), 1000000n]]],
          [2, 200000n],
        ]),
        new Map<number, unknown>([  // witness set
          [3, [new Uint8Array(100)]],  // plutus_v1_scripts
        ]),
        true,  // is_valid
        null,  // auxiliary_data
      ]

      const result = detectEra(tx)

      expect(result.era).toBe('alonzo')
      expect(result.markers.some(m =>
        m.type === 'script_type' && m.description.includes('Plutus V1')
      )).toBe(true)
    })

    it('should detect Alonzo from redeemers in witness set', () => {
      const tx = [
        new Map<number, unknown>([
          [0, [[new Uint8Array(32), 0]]],
          [1, [[new Uint8Array(57), 1000000n]]],
          [2, 200000n],
        ]),
        new Map<number, unknown>([
          // Use array format for redeemers (Alonzo style)
          // Map format would indicate Babbage+
          [5, [[0, 0, { constructor: 0, fields: [] }, [1000, 2000]]]],
        ]),
        true,
        null,
      ]

      const result = detectEra(tx)

      expect(result.era).toBe('alonzo')
      expect(result.markers.some(m => m.description.includes('Redeemers'))).toBe(true)
    })
  })

  describe('Babbage era detection', () => {
    it('should detect Babbage transaction with reference inputs', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [18, [[new Uint8Array(32), 2]]],  // reference_inputs
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('babbage')
      expect(result.transactionInfo?.hasReferenceInputs).toBe(true)
      expect(result.references.some(r => r.name.includes('CIP-31'))).toBe(true)
    })

    it('should detect Babbage transaction with inline datum', () => {
      // Output with inline datum: [address, value, [1, datum], script_ref?]
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[
          new Uint8Array(57),
          1000000n,
          [1, { constructor: 0, fields: [] }],  // inline datum
        ]]],
        [2, 200000n],
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('babbage')
      expect(result.transactionInfo?.hasInlineDatums).toBe(true)
      expect(result.references.some(r => r.name.includes('CIP-32'))).toBe(true)
    })

    it('should detect Babbage transaction with reference script', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[
          new Uint8Array(57),
          1000000n,
          null,  // no datum
          new Uint8Array(100),  // reference script
        ]]],
        [2, 200000n],
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('babbage')
      expect(result.transactionInfo?.hasReferenceScripts).toBe(true)
      expect(result.references.some(r => r.name.includes('CIP-33'))).toBe(true)
    })

    it('should detect Babbage from Plutus V2 scripts', () => {
      const tx = [
        new Map<number, unknown>([
          [0, [[new Uint8Array(32), 0]]],
          [1, [[new Uint8Array(57), 1000000n]]],
          [2, 200000n],
        ]),
        new Map<number, unknown>([
          [6, [new Uint8Array(100)]],  // plutus_v2_scripts
        ]),
        true,
        null,
      ]

      const result = detectEra(tx)

      expect(result.era).toBe('babbage')
      expect(result.markers.some(m =>
        m.type === 'script_type' && m.description.includes('Plutus V2')
      )).toBe(true)
    })

    it('should detect Babbage with collateral_return', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [13, [[new Uint8Array(32), 1]]],  // collateral
        [16, [new Uint8Array(57), 500000n]],  // collateral_return
        [17, 500000n],  // total_collateral
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('babbage')
    })
  })

  describe('Conway era detection', () => {
    it('should detect Conway transaction with voting procedures', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [19, new Map([  // voting_procedures
          [[0, new Uint8Array(28)], new Map()]
        ])],
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('conway')
      expect(result.transactionInfo?.hasVotingProcedures).toBe(true)
      expect(result.references.some(r => r.name.includes('CIP-1694'))).toBe(true)
    })

    it('should detect Conway transaction with proposal procedures', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [20, [[  // proposal_procedures
          1000000n,  // deposit
          new Uint8Array(29),  // reward account
          [0, null],  // governance action (parameter change)
          [null, new Uint8Array(32)],  // anchor
        ]]],
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('conway')
      expect(result.transactionInfo?.hasProposalProcedures).toBe(true)
    })

    it('should detect Conway with treasury donation', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [22, 5000000n],  // donation
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('conway')
    })

    it('should detect Conway from DRep certificate', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [4, [[16, [0, new Uint8Array(28)], 2000000n, null]]],  // reg_drep_cert
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('conway')
      expect(result.transactionInfo?.certificateTypes).toContain('reg_drep_cert')
    })

    it('should detect Conway from Plutus V3 scripts', () => {
      const tx = [
        new Map<number, unknown>([
          [0, [[new Uint8Array(32), 0]]],
          [1, [[new Uint8Array(57), 1000000n]]],
          [2, 200000n],
        ]),
        new Map<number, unknown>([
          [7, [new Uint8Array(100)]],  // plutus_v3_scripts
        ]),
        true,
        null,
      ]

      const result = detectEra(tx)

      expect(result.era).toBe('conway')
      expect(result.markers.some(m =>
        m.type === 'script_type' && m.description.includes('Plutus V3')
      )).toBe(true)
    })
  })

  describe('Byron era detection', () => {
    it('should detect Byron block structure', () => {
      // Byron block: [0, ebblock] or [1, mainblock]
      const byronBlock = [1, {
        header: new Uint8Array(100),
        body: [],
        extra: null,
      }]

      const result = detectEra(byronBlock)

      expect(result.era).toBe('byron')
      expect(result.markers.some(m => m.description.includes('Byron block'))).toBe(true)
    })

    it('should detect Byron from bootstrap address format', () => {
      // Byron bootstrap addresses start with 0x82 and are ~82 bytes
      // Wrap in array to trigger address detection in array context
      const byronAddress = new Uint8Array(82)
      byronAddress[0] = 0x82

      const result = detectEra([byronAddress])

      expect(result.era).toBe('byron')
      expect(result.markers.some(m => m.description.includes('Byron bootstrap'))).toBe(true)
    })
  })

  describe('Plutus data detection', () => {
    it('should detect Alonzo+ from Plutus constructor data', () => {
      const plutusData = {
        constructor: 0,
        fields: [1, 2, 3],
      }

      const result = detectEra(plutusData)

      expect(result.era).toBe('alonzo')
      expect(result.markers.some(m => m.description.includes('Plutus data'))).toBe(true)
    })
  })

  describe('Transaction info extraction', () => {
    it('should extract complete transaction info', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0], [new Uint8Array(32), 1]]],  // 2 inputs
        [1, [  // 3 outputs
          [new Uint8Array(57), 1000000n],
          [new Uint8Array(57), 2000000n],
          [new Uint8Array(57), 500000n],
        ]],
        [2, 200000n],  // fee
        [3, 50000000],  // TTL
        [8, 45000000],  // validity start
        [9, new Map()],  // mint
        [13, [[new Uint8Array(32), 0]]],  // collateral
      ])

      const result = detectEra(txBody)

      expect(result.transactionInfo).toBeDefined()
      expect(result.transactionInfo?.inputCount).toBe(2)
      expect(result.transactionInfo?.outputCount).toBe(3)
      expect(result.transactionInfo?.fee).toBe(200000n)
      expect(result.transactionInfo?.ttl).toBe(50000000)
      expect(result.transactionInfo?.validityStart).toBe(45000000)
      expect(result.transactionInfo?.hasMint).toBe(true)
      expect(result.transactionInfo?.hasCollateral).toBe(true)
    })
  })

  describe('Era info and formatting', () => {
    it('should return correct era info', () => {
      const babbageInfo = getEraInfo('babbage')

      expect(babbageInfo.displayName).toBe('Babbage')
      expect(babbageInfo.keyFeatures).toContain('Reference inputs')
      expect(babbageInfo.cips.some(c => c.number === 31)).toBe(true)
    })

    it('should format detection result correctly', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [18, [[new Uint8Array(32), 2]]],
      ])

      const result = detectEra(txBody)
      const formatted = formatDetectionResult(result)

      expect(formatted).toContain('Era: Babbage')
      expect(formatted).toContain('Reference inputs')
      expect(formatted).toContain('CIP-31')
    })
  })

  describe('Confidence levels', () => {
    it('should return high confidence with multiple high-confidence markers', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [18, [[new Uint8Array(32), 2]]],  // reference inputs - high
        [16, [new Uint8Array(57), 500000n]],  // collateral return - high
      ])

      const result = detectEra(txBody)

      expect(result.confidence).toBe('high')
    })

    it('should return low confidence for ambiguous data', () => {
      const result = detectEra({ someKey: 'someValue' })

      expect(result.confidence).toBe('low')
    })
  })

  describe('Output format detection (CDDL improvements)', () => {
    it('should detect map-based output format as Babbage+', () => {
      // Babbage map-style output: { 0: address, 1: value }
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [new Map<number, unknown>([
          [0, new Uint8Array(57)],  // address
          [1, 1000000n],  // value
        ])]],
        [2, 200000n],
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('babbage')
      expect(result.markers.some(m =>
        m.description.includes('Map-based output format')
      )).toBe(true)
    })

    it('should detect Alonzo datum hash in output', () => {
      // Alonzo-style output with direct datum hash: [addr, value, hash32]
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[
          new Uint8Array(57),
          1000000n,
          new Uint8Array(32),  // Direct datum hash (32 bytes)
        ]]],
        [2, 200000n],
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('alonzo')
      expect(result.markers.some(m =>
        m.description.includes('Datum hash') && m.era === 'alonzo'
      )).toBe(true)
    })

    it('should detect datum_option [0, hash] as Alonzo-style', () => {
      // Array output with datum_option [0, hash]
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[
          new Uint8Array(57),
          1000000n,
          [0, new Uint8Array(32)],  // datum hash option
        ]]],
        [2, 200000n],
      ])

      const result = detectEra(txBody)

      expect(result.markers.some(m =>
        m.description.includes('Datum hash') && m.era === 'alonzo'
      )).toBe(true)
    })
  })

  describe('Script reference version detection', () => {
    it('should detect Plutus V1 script reference', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[
          new Uint8Array(57),
          1000000n,
          null,
          [1, new Uint8Array(100)],  // Plutus V1 script ref
        ]]],
        [2, 200000n],
      ])

      const result = detectEra(txBody)

      expect(result.markers.some(m =>
        m.description.includes('Plutus V1 script reference')
      )).toBe(true)
    })

    it('should detect Plutus V2 script reference', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[
          new Uint8Array(57),
          1000000n,
          null,
          [2, new Uint8Array(100)],  // Plutus V2 script ref
        ]]],
        [2, 200000n],
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('babbage')
      expect(result.markers.some(m =>
        m.description.includes('Plutus V2 script reference')
      )).toBe(true)
    })

    it('should detect Plutus V3 script reference as Conway', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[
          new Uint8Array(57),
          1000000n,
          null,
          [3, new Uint8Array(100)],  // Plutus V3 script ref
        ]]],
        [2, 200000n],
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('conway')
      expect(result.markers.some(m =>
        m.description.includes('Plutus V3 script reference')
      )).toBe(true)
    })
  })

  describe('Redeemer tag detection for Conway', () => {
    it('should detect voting redeemer tag (4) as Conway', () => {
      const tx = [
        new Map<number, unknown>([
          [0, [[new Uint8Array(32), 0]]],
          [1, [[new Uint8Array(57), 1000000n]]],
          [2, 200000n],
        ]),
        new Map<number, unknown>([
          [5, [  // redeemers - array format
            [4, 0, { constructor: 0, fields: [] }, [1000, 2000]],  // voting tag
          ]],
        ]),
        true,
        null,
      ]

      const result = detectEra(tx)

      expect(result.era).toBe('conway')
      expect(result.markers.some(m =>
        m.description.includes('Voting redeemer tag')
      )).toBe(true)
    })

    it('should detect proposing redeemer tag (5) as Conway', () => {
      const tx = [
        new Map<number, unknown>([
          [0, [[new Uint8Array(32), 0]]],
          [1, [[new Uint8Array(57), 1000000n]]],
          [2, 200000n],
        ]),
        new Map<number, unknown>([
          [5, [  // redeemers - array format
            [5, 0, { constructor: 0, fields: [] }, [1000, 2000]],  // proposing tag
          ]],
        ]),
        true,
        null,
      ]

      const result = detectEra(tx)

      expect(result.era).toBe('conway')
      expect(result.markers.some(m =>
        m.description.includes('Proposing redeemer tag')
      )).toBe(true)
    })

    it('should detect map-format redeemers as Babbage+', () => {
      const tx = [
        new Map<number, unknown>([
          [0, [[new Uint8Array(32), 0]]],
          [1, [[new Uint8Array(57), 1000000n]]],
          [2, 200000n],
        ]),
        new Map<number, unknown>([
          [5, new Map([  // redeemers - map format (Babbage+)
            [[0, 0], [{ constructor: 0, fields: [] }, [1000, 2000]]],
          ])],
        ]),
        true,
        null,
      ]

      const result = detectEra(tx)

      expect(result.markers.some(m =>
        m.description.includes('Map-format redeemers')
      )).toBe(true)
    })
  })

  describe('Field interdependency validation', () => {
    it('should warn when collateral present but script_data_hash missing', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [13, [[new Uint8Array(32), 1]]],  // collateral, but no script_data_hash
      ])

      const result = detectEra(txBody)

      expect(result.warnings.some(w =>
        w.includes('script_data_hash') && w.includes('missing')
      )).toBe(true)
    })

    it('should detect complete collateral specification as Babbage', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [11, new Uint8Array(32)],  // script_data_hash
        [13, [[new Uint8Array(32), 1]]],  // collateral
        [16, [new Uint8Array(57), 500000n]],  // collateral_return
        [17, 500000n],  // total_collateral
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('babbage')
      expect(result.markers.some(m =>
        m.description.includes('Complete collateral specification')
      )).toBe(true)
    })

    it('should detect native token minting (no Plutus)', () => {
      const txBody = new Map<number, unknown>([
        [0, [[new Uint8Array(32), 0]]],
        [1, [[new Uint8Array(57), 1000000n]]],
        [2, 200000n],
        [9, new Map([  // mint without script_data_hash
          [new Uint8Array(28), new Map([[new Uint8Array(8), 1000n]])]
        ])],
      ])

      const result = detectEra(txBody)

      expect(result.era).toBe('mary')
      expect(result.markers.some(m =>
        m.description.includes('Native token minting')
      )).toBe(true)
    })
  })

  describe('Witness set analysis improvements', () => {
    it('should detect plutus datum values in witness set', () => {
      const tx = [
        new Map<number, unknown>([
          [0, [[new Uint8Array(32), 0]]],
          [1, [[new Uint8Array(57), 1000000n]]],
          [2, 200000n],
        ]),
        new Map<number, unknown>([
          [4, [{ constructor: 0, fields: [1, 2, 3] }]],  // plutus_data/datums
        ]),
        true,
        null,
      ]

      const result = detectEra(tx)

      expect(result.markers.some(m =>
        m.description.includes('Plutus datum values')
      )).toBe(true)
    })
  })

  describe('Real-world CBOR parsing integration', () => {
    it('should detect era from real CBOR hex', () => {
      // Simple Shelley transaction body (minimal)
      // a4 00 81 82 ... (map with keys 0, 1, 2, 3)
      const shelleyTxHex = 'a400818258200000000000000000000000000000000000000000000000000000000000000000000181825839000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a000f4240021a0002bf20031a02faf080'

      const result = detectFromHex(shelleyTxHex)

      expect(result.era).toBe('shelley')
      expect(result.transactionInfo?.inputCount).toBe(1)
      expect(result.transactionInfo?.outputCount).toBe(1)
    })

    it('should correctly count inputs when wrapped in tag 258 (set)', () => {
      // Transaction body with tagged set for inputs (tag 258)
      // This simulates Conway transactions that use set encoding
      const txBody = new Map<number, unknown>([
        // Field 0: inputs wrapped in tag 258 (set of 3 inputs)
        [0, { tag: 258, value: [
          [new Uint8Array(32).fill(1), 0],
          [new Uint8Array(32).fill(2), 0],
          [new Uint8Array(32).fill(3), 1],
        ]}],
        // Field 1: outputs (3)
        [1, [
          [new Uint8Array(57), 24950000n],
          [new Uint8Array(29), 2050000n],
          [new Uint8Array(57), 72522728n],
        ]],
        // Field 2: fee
        [2, 943975n],
        // Field 8: validity start (Allegra+)
        [8, 108894820],
        // Field 11: script data hash (Alonzo+)
        [11, new Uint8Array(32)],
        // Field 13: collateral - also wrapped in tag 258
        [13, { tag: 258, value: [[new Uint8Array(32).fill(4), 1]] }],
        // Field 14: required signers - wrapped in tag 258
        [14, { tag: 258, value: [new Uint8Array(28)] }],
      ])

      // Wrap in full transaction structure
      const tx = [
        txBody,
        new Map<number, unknown>([
          [0, { tag: 258, value: [[new Uint8Array(32), new Uint8Array(64)]] }],  // vkey witnesses
          [7, { tag: 258, value: [new Uint8Array(500), new Uint8Array(500)] }],  // Plutus V3 scripts
        ]),
        true,  // is_valid
        { tag: 259, value: {} },  // auxiliary data
      ]

      const result = detectEra(tx)

      // Should detect Conway due to Plutus V3 scripts
      expect(result.era).toBe('conway')

      // Should correctly count inputs (3) and collateral (1)
      expect(result.transactionInfo?.inputCount).toBe(3)
      expect(result.transactionInfo?.outputCount).toBe(3)
      expect(result.transactionInfo?.collateralInputCount).toBe(1)
      expect(result.transactionInfo?.hasCollateral).toBe(true)

      // Fee should be extracted
      expect(result.transactionInfo?.fee).toBe(943975n)
    })
  })
})
