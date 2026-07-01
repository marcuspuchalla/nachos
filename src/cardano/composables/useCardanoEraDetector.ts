/**
 * Cardano Era Detector Composable
 *
 * Automatically detects the Cardano era from CBOR-encoded data
 * by analyzing transaction structure, certificates, scripts, and addresses.
 *
 * Detection is performed from newest era to oldest, returning the
 * minimum era required to support all detected features.
 */

import type { CborValue } from '../../parser/types'
import {
  type CardanoEra,
  type EraDetectionResult,
  type EraMarker,
  type EraReference,
  type TransactionInfo,
  type CertificateType,
  TRANSACTION_BODY_FIELDS,
  CERTIFICATE_TYPE_INDICES,
  ERA_INFO,
  compareEras,
} from '../types/cardano-eras'

/**
 * Helper to unwrap tagged values (e.g., tag 258 for sets)
 * Returns the inner value if it's a tagged value, otherwise returns as-is
 */
function unwrapTaggedValue(value: unknown): unknown {
  if (value && typeof value === 'object' && 'tag' in value && 'value' in value) {
    return (value as { tag: number; value: unknown }).value
  }
  return value
}

/**
 * Cardano Era Detector Composable
 */
export function useCardanoEraDetector() {
  /**
   * Detect the Cardano era from parsed CBOR data
   */
  const detectEra = (parsed: CborValue): EraDetectionResult => {
    const markers: EraMarker[] = []
    const warnings: string[] = []
    let detectedEra: CardanoEra = 'unknown'

    // Try to detect if this is a transaction
    const txInfo = analyzeTransaction(parsed, markers, warnings)

    // Analyze based on detected markers
    if (markers.length > 0) {
      // Find the highest era required by any marker
      detectedEra = markers.reduce((maxEra, marker) => {
        return compareEras(marker.era, maxEra) > 0 ? marker.era : maxEra
      }, 'byron' as CardanoEra)
    } else {
      // Try other detection methods
      detectedEra = detectFromStructure(parsed, markers, warnings)
    }

    // Calculate confidence
    const confidence = calculateConfidence(markers, detectedEra)

    // Build references
    const references = buildReferences(detectedEra, markers)

    return {
      era: detectedEra,
      confidence,
      markers,
      warnings,
      references,
      transactionInfo: txInfo,
    }
  }

  /**
   * Analyze a potential transaction structure
   */
  const analyzeTransaction = (
    parsed: CborValue,
    markers: EraMarker[],
    warnings: string[]
  ): TransactionInfo | undefined => {
    // Transaction can be:
    // 1. Array: [body, witness_set, is_valid, auxiliary_data]
    // 2. Just the body (map with numeric keys)

    let txBody: Map<number, CborValue> | null = null

    // Check if it's a full transaction array
    if (Array.isArray(parsed) && parsed.length >= 2) {
      const body = parsed[0]
      if (body instanceof Map || (typeof body === 'object' && body !== null)) {
        txBody = normalizeToMap(body)
        markers.push({
          type: 'structure',
          description: 'Full transaction structure detected',
          era: 'shelley',
          confidence: 'high',
        })

        // Check witness set for script types
        if (parsed.length >= 2 && parsed[1]) {
          analyzeWitnessSet(parsed[1], markers)
        }
      }
    }
    // Check if it's just a transaction body (map)
    else if (parsed instanceof Map) {
      txBody = parsed as Map<number, CborValue>
    }
    // Plain object with numeric keys
    else if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const keys = Object.keys(parsed)
      if (keys.some(k => !isNaN(parseInt(k)))) {
        txBody = new Map(
          Object.entries(parsed).map(([k, v]) => [parseInt(k), v])
        )
      }
    }

    if (!txBody) {
      // Not a transaction, try other structures
      return undefined
    }

    // Analyze transaction body fields
    return analyzeTransactionBody(txBody, markers, warnings)
  }

  /**
   * Normalize object or Map to Map<number, CborValue>
   */
  const normalizeToMap = (obj: unknown): Map<number, CborValue> => {
    if (obj instanceof Map) {
      return obj as Map<number, CborValue>
    }
    if (typeof obj === 'object' && obj !== null) {
      return new Map(
        Object.entries(obj).map(([k, v]) => [parseInt(k), v as CborValue])
      )
    }
    return new Map()
  }

  /**
   * Analyze transaction body fields to detect era
   */
  const analyzeTransactionBody = (
    txBody: Map<number, CborValue>,
    markers: EraMarker[],
    warnings: string[]
  ): TransactionInfo => {
    const info: TransactionInfo = {
      inputCount: 0,
      outputCount: 0,
      collateralInputCount: 0,
      referenceInputCount: 0,
      hasCertificates: false,
      hasWithdrawals: false,
      hasMint: false,
      hasCollateral: false,
      hasReferenceInputs: false,
      hasInlineDatums: false,
      hasReferenceScripts: false,
      hasVotingProcedures: false,
      hasProposalProcedures: false,
    }

    // Field 0: inputs
    const inputs = txBody.get(TRANSACTION_BODY_FIELDS.inputs)
    const unwrappedInputs = unwrapTaggedValue(inputs)
    if (unwrappedInputs && Array.isArray(unwrappedInputs)) {
      info.inputCount = unwrappedInputs.length
    } else if (unwrappedInputs instanceof Set || (unwrappedInputs && typeof unwrappedInputs === 'object' && 'size' in unwrappedInputs)) {
      info.inputCount = (unwrappedInputs as Set<unknown>).size
    }

    // Field 1: outputs
    const outputs = txBody.get(TRANSACTION_BODY_FIELDS.outputs)
    if (outputs && Array.isArray(outputs)) {
      info.outputCount = outputs.length
      analyzeOutputs(outputs, markers, info)
    }

    // Field 2: fee
    const fee = txBody.get(TRANSACTION_BODY_FIELDS.fee)
    if (fee !== undefined) {
      info.fee = typeof fee === 'bigint' ? fee : BigInt(fee as number)
    }

    // Field 3: ttl (Shelley+)
    const ttl = txBody.get(TRANSACTION_BODY_FIELDS.ttl)
    if (ttl !== undefined) {
      info.ttl = Number(ttl)
      markers.push({
        type: 'transaction_field',
        description: 'TTL field present (time-to-live)',
        era: 'shelley',
        field: 'ttl',
        confidence: 'medium',
      })
    }

    // Field 4: certificates (Shelley+)
    const certificates = txBody.get(TRANSACTION_BODY_FIELDS.certificates)
    if (certificates && Array.isArray(certificates) && certificates.length > 0) {
      info.hasCertificates = true
      info.certificateTypes = analyzeCertificates(certificates, markers)
    }

    // Field 5: withdrawals (Shelley+)
    const withdrawals = txBody.get(TRANSACTION_BODY_FIELDS.withdrawals)
    if (withdrawals && (withdrawals instanceof Map || typeof withdrawals === 'object')) {
      info.hasWithdrawals = true
      markers.push({
        type: 'transaction_field',
        description: 'Withdrawals field present',
        era: 'shelley',
        field: 'withdrawals',
        confidence: 'medium',
      })
    }

    // Field 8: validity_interval_start (Allegra+)
    if (txBody.has(TRANSACTION_BODY_FIELDS.validity_interval_start)) {
      info.validityStart = Number(txBody.get(TRANSACTION_BODY_FIELDS.validity_interval_start))
      markers.push({
        type: 'transaction_field',
        description: 'Validity interval start present (Allegra feature)',
        era: 'allegra',
        field: 'validity_interval_start',
        confidence: 'high',
      })
    }

    // Field 9: mint (Mary+)
    const mint = txBody.get(TRANSACTION_BODY_FIELDS.mint)
    if (mint && (mint instanceof Map || typeof mint === 'object')) {
      info.hasMint = true
      markers.push({
        type: 'transaction_field',
        description: 'Mint field present (native token minting)',
        era: 'mary',
        field: 'mint',
        confidence: 'high',
      })
    }

    // Field 11: script_data_hash (Alonzo+)
    if (txBody.has(TRANSACTION_BODY_FIELDS.script_data_hash)) {
      markers.push({
        type: 'transaction_field',
        description: 'Script data hash present (Plutus scripts)',
        era: 'alonzo',
        field: 'script_data_hash',
        confidence: 'high',
      })
    }

    // Field 13: collateral (Alonzo+)
    const collateral = txBody.get(TRANSACTION_BODY_FIELDS.collateral)
    const unwrappedCollateral = unwrapTaggedValue(collateral)
    if (unwrappedCollateral && Array.isArray(unwrappedCollateral) && unwrappedCollateral.length > 0) {
      info.hasCollateral = true
      info.collateralInputCount = unwrappedCollateral.length
      markers.push({
        type: 'transaction_field',
        description: `Collateral inputs present (${unwrappedCollateral.length} collateral${unwrappedCollateral.length > 1 ? 's' : ''}, Plutus execution)`,
        era: 'alonzo',
        field: 'collateral',
        confidence: 'high',
      })
    }

    // Field 16: collateral_return (Babbage+)
    if (txBody.has(TRANSACTION_BODY_FIELDS.collateral_return)) {
      markers.push({
        type: 'transaction_field',
        description: 'Collateral return output present',
        era: 'babbage',
        field: 'collateral_return',
        confidence: 'high',
      })
    }

    // Field 17: total_collateral (Babbage+)
    if (txBody.has(TRANSACTION_BODY_FIELDS.total_collateral)) {
      markers.push({
        type: 'transaction_field',
        description: 'Total collateral amount specified',
        era: 'babbage',
        field: 'total_collateral',
        confidence: 'high',
      })
    }

    // Field 18: reference_inputs (Babbage+)
    const refInputs = txBody.get(TRANSACTION_BODY_FIELDS.reference_inputs)
    const unwrappedRefInputs = unwrapTaggedValue(refInputs)
    if (unwrappedRefInputs && Array.isArray(unwrappedRefInputs) && unwrappedRefInputs.length > 0) {
      info.hasReferenceInputs = true
      info.referenceInputCount = unwrappedRefInputs.length
      markers.push({
        type: 'transaction_field',
        description: `Reference inputs present (${unwrappedRefInputs.length} reference${unwrappedRefInputs.length > 1 ? 's' : ''}, CIP-31)`,
        era: 'babbage',
        field: 'reference_inputs',
        confidence: 'high',
      })
    }

    // Field 19: voting_procedures (Conway+)
    const voting = txBody.get(TRANSACTION_BODY_FIELDS.voting_procedures)
    if (voting && (voting instanceof Map || typeof voting === 'object')) {
      info.hasVotingProcedures = true
      markers.push({
        type: 'governance',
        description: 'Voting procedures present (CIP-1694 governance)',
        era: 'conway',
        field: 'voting_procedures',
        confidence: 'high',
      })
    }

    // Field 20: proposal_procedures (Conway+)
    const proposals = txBody.get(TRANSACTION_BODY_FIELDS.proposal_procedures)
    if (proposals && Array.isArray(proposals) && proposals.length > 0) {
      info.hasProposalProcedures = true
      markers.push({
        type: 'governance',
        description: 'Proposal procedures present (governance actions)',
        era: 'conway',
        field: 'proposal_procedures',
        confidence: 'high',
      })
    }

    // Field 21: current_treasury_value (Conway+)
    if (txBody.has(TRANSACTION_BODY_FIELDS.current_treasury_value)) {
      markers.push({
        type: 'governance',
        description: 'Treasury value field present',
        era: 'conway',
        field: 'current_treasury_value',
        confidence: 'high',
      })
    }

    // Field 22: donation (Conway+)
    if (txBody.has(TRANSACTION_BODY_FIELDS.donation)) {
      markers.push({
        type: 'governance',
        description: 'Treasury donation field present',
        era: 'conway',
        field: 'donation',
        confidence: 'high',
      })
    }

    // Field interdependency validation (from CDDL research)
    // These help detect potential issues and improve detection accuracy
    validateFieldDependencies(txBody, info, markers, warnings)

    return info
  }

  /**
   * Validate field interdependencies based on CDDL specs
   *
   * From CDDL research:
   * - If Plutus scripts are used: Fields 11 (script_data_hash), 13 (collateral)
   *   become effectively required
   * - If minting: Policy scripts must be in witness set
   * - Babbage+ adds field 17 (total_collateral) as recommended with collateral
   */
  const validateFieldDependencies = (
    txBody: Map<number, CborValue>,
    info: TransactionInfo,
    markers: EraMarker[],
    warnings: string[]
  ): void => {
    // Check if this looks like a Plutus transaction
    const hasCollateral = info.hasCollateral
    const hasScriptDataHash = txBody.has(TRANSACTION_BODY_FIELDS.script_data_hash)
    const hasTotalCollateral = txBody.has(TRANSACTION_BODY_FIELDS.total_collateral)
    const hasCollateralReturn = txBody.has(TRANSACTION_BODY_FIELDS.collateral_return)

    // If collateral is present, this is a Plutus transaction
    if (hasCollateral) {
      // script_data_hash should be present for Plutus transactions
      if (!hasScriptDataHash) {
        warnings.push(
          'Collateral present but script_data_hash (field 11) is missing. ' +
          'This may indicate an incomplete or invalid Plutus transaction.'
        )
      }

      // Babbage+ recommends total_collateral when collateral is present
      if (!hasTotalCollateral && !hasCollateralReturn) {
        // This might be an Alonzo-style transaction
        markers.push({
          type: 'structure',
          description: 'Collateral without total_collateral (Alonzo-style)',
          era: 'alonzo',
          confidence: 'low',
        })
      }

      // If both total_collateral and collateral_return are present, definitely Babbage+
      if (hasTotalCollateral && hasCollateralReturn) {
        markers.push({
          type: 'structure',
          description: 'Complete collateral specification (Babbage+ style)',
          era: 'babbage',
          confidence: 'high',
        })
      }
    }

    // Minting validation
    if (info.hasMint && !txBody.has(TRANSACTION_BODY_FIELDS.script_data_hash)) {
      // Minting without script_data_hash means native token minting (not Plutus)
      markers.push({
        type: 'structure',
        description: 'Native token minting (no Plutus)',
        era: 'mary',
        confidence: 'medium',
      })
    }
  }

  /**
   * Analyze transaction outputs for era-specific features
   *
   * Output format evolution (from CDDL specs):
   * - Shelley/Allegra: [address, coin]
   * - Mary: [address, value] where value = coin | [coin, multiasset]
   * - Alonzo: [address, value, ?datum_hash]
   * - Babbage+: Map format {0: address, 1: value, ?2: datum_option, ?3: script_ref}
   *   or legacy array format for backward compatibility
   */
  const analyzeOutputs = (
    outputs: CborValue[],
    markers: EraMarker[],
    info: TransactionInfo
  ): void => {
    let hasMapFormatOutput = false
    let hasArrayFormatOutput = false

    for (const output of outputs) {
      // Babbage+ outputs can have inline datums and reference scripts
      // Format: [address, value, datum_option?, script_ref?]
      // Or: { 0: address, 1: value, 2?: datum_option, 3?: script_ref }

      if (Array.isArray(output)) {
        hasArrayFormatOutput = true

        // Check for inline datum (index 2)
        if (output.length >= 3 && output[2] !== null && output[2] !== undefined) {
          // Datum option: [0, hash] or [1, data]
          if (Array.isArray(output[2]) && output[2].length === 2) {
            if (output[2][0] === 1) {
              info.hasInlineDatums = true
              markers.push({
                type: 'output_format',
                description: 'Inline datum in output (CIP-32)',
                era: 'babbage',
                confidence: 'high',
              })
            } else if (output[2][0] === 0) {
              // Datum hash reference - Alonzo+
              markers.push({
                type: 'output_format',
                description: 'Datum hash in output (Plutus)',
                era: 'alonzo',
                confidence: 'medium',
              })
            }
          } else if (output[2] instanceof Uint8Array && output[2].length === 32) {
            // Direct datum hash (legacy Alonzo format)
            markers.push({
              type: 'output_format',
              description: 'Datum hash in output (Alonzo format)',
              era: 'alonzo',
              confidence: 'high',
            })
          }
        }
        // Check for reference script (index 3)
        if (output.length >= 4 && output[3] !== null && output[3] !== undefined) {
          info.hasReferenceScripts = true
          const scriptRef = output[3]
          const scriptEra = analyzeScriptReference(scriptRef, markers)
          if (!scriptEra) {
            markers.push({
              type: 'output_format',
              description: 'Reference script in output (CIP-33)',
              era: 'babbage',
              confidence: 'high',
            })
          }
        }
        // Check for multiasset value (Mary+)
        if (output.length >= 2 && Array.isArray(output[1])) {
          markers.push({
            type: 'output_format',
            description: 'Multi-asset value in output',
            era: 'mary',
            confidence: 'high',
          })
        }
      } else if (output instanceof Map || (typeof output === 'object' && output !== null)) {
        hasMapFormatOutput = true
        const outMap = normalizeToMap(output)

        // Map-based output format is a strong Babbage+ indicator
        markers.push({
          type: 'output_format',
          description: 'Map-based output format (Babbage+ style)',
          era: 'babbage',
          confidence: 'high',
        })

        // Check datum_option (key 2)
        if (outMap.has(2)) {
          const datum = outMap.get(2)
          if (Array.isArray(datum) && datum.length >= 1) {
            if (datum[0] === 1) {
              info.hasInlineDatums = true
              markers.push({
                type: 'output_format',
                description: 'Inline datum in output (CIP-32)',
                era: 'babbage',
                confidence: 'high',
              })
            } else if (datum[0] === 0) {
              markers.push({
                type: 'output_format',
                description: 'Datum hash reference in output',
                era: 'alonzo',
                confidence: 'medium',
              })
            }
          }
        }
        // Check script_ref (key 3)
        if (outMap.has(3)) {
          info.hasReferenceScripts = true
          const scriptRef = outMap.get(3)
          const scriptEra = analyzeScriptReference(scriptRef, markers)
          if (!scriptEra) {
            markers.push({
              type: 'output_format',
              description: 'Reference script in output (CIP-33)',
              era: 'babbage',
              confidence: 'high',
            })
          }
        }

        // Check for multiasset value (Mary+)
        const value = outMap.get(1)
        if (Array.isArray(value) && value.length === 2) {
          markers.push({
            type: 'output_format',
            description: 'Multi-asset value in output',
            era: 'mary',
            confidence: 'high',
          })
        }
      }
    }

    // If we have map-format outputs, this is definitely Babbage+
    if (hasMapFormatOutput && !hasArrayFormatOutput) {
      // Pure Babbage-style transaction
    }
  }

  /**
   * Analyze a script reference to determine its type and era
   * Script reference format per CDDL:
   * - [0, native_script]
   * - [1, plutus_v1_script]
   * - [2, plutus_v2_script] (Babbage+)
   * - [3, plutus_v3_script] (Conway+)
   */
  const analyzeScriptReference = (
    scriptRef: CborValue,
    markers: EraMarker[]
  ): CardanoEra | null => {
    if (!Array.isArray(scriptRef) || scriptRef.length < 2) {
      return null
    }

    const scriptType = scriptRef[0]

    switch (scriptType) {
      case 0:
        markers.push({
          type: 'script_type',
          description: 'Native script reference',
          era: 'shelley',
          confidence: 'medium',
        })
        return 'shelley'
      case 1:
        markers.push({
          type: 'script_type',
          description: 'Plutus V1 script reference',
          era: 'alonzo',
          confidence: 'high',
        })
        return 'alonzo'
      case 2:
        markers.push({
          type: 'script_type',
          description: 'Plutus V2 script reference (CIP-33)',
          era: 'babbage',
          confidence: 'high',
        })
        return 'babbage'
      case 3:
        markers.push({
          type: 'script_type',
          description: 'Plutus V3 script reference (Conway)',
          era: 'conway',
          confidence: 'high',
        })
        return 'conway'
      default:
        return null
    }
  }

  /**
   * Analyze certificates to detect era-specific types
   */
  const analyzeCertificates = (
    certificates: CborValue[],
    markers: EraMarker[]
  ): CertificateType[] => {
    const types: CertificateType[] = []

    for (const cert of certificates) {
      let certType: number | undefined

      // Certificate format: [type, ...params]
      if (Array.isArray(cert) && cert.length > 0) {
        certType = typeof cert[0] === 'number' ? cert[0] : undefined
      }

      if (certType !== undefined) {
        const typeName = CERTIFICATE_TYPE_INDICES[certType] || 'unknown'
        types.push(typeName)

        // Conway-specific certificates (7-18)
        if (certType >= 7 && certType <= 18) {
          markers.push({
            type: 'certificate_type',
            description: `${typeName} certificate (Conway governance)`,
            era: 'conway',
            confidence: 'high',
          })
        }
        // Genesis/MIR certificates (5-6) - Shelley but rare
        else if (certType === 5 || certType === 6) {
          markers.push({
            type: 'certificate_type',
            description: `${typeName} certificate`,
            era: 'shelley',
            confidence: 'high',
          })
        }
        // Basic certificates (0-4) - Shelley+
        else if (certType >= 0 && certType <= 4) {
          markers.push({
            type: 'certificate_type',
            description: `${typeName} certificate`,
            era: 'shelley',
            confidence: 'medium',
          })
        }
      }
    }

    return types
  }

  /**
   * Analyze witness set for script types and redeemer tags
   *
   * Witness set structure per CDDL:
   * - Key 0: vkeywitnesses
   * - Key 1: native_scripts (Shelley+)
   * - Key 2: bootstrap_witnesses
   * - Key 3: plutus_v1_scripts (Alonzo+)
   * - Key 4: plutus_data (datums, Alonzo+)
   * - Key 5: redeemers (Alonzo+)
   * - Key 6: plutus_v2_scripts (Babbage+)
   * - Key 7: plutus_v3_scripts (Conway+)
   */
  const analyzeWitnessSet = (
    witnessSet: CborValue,
    markers: EraMarker[]
  ): void => {
    const ws = witnessSet instanceof Map
      ? witnessSet
      : (typeof witnessSet === 'object' && witnessSet !== null
        ? new Map(Object.entries(witnessSet).map(([k, v]) => [parseInt(k), v]))
        : null)

    if (!ws) return

    // Key 1: native_scripts (Shelley+)
    if (ws.has(1)) {
      markers.push({
        type: 'script_type',
        description: 'Native scripts in witness set',
        era: 'shelley',
        confidence: 'medium',
      })
    }

    // Key 3: plutus_v1_scripts (Alonzo+)
    if (ws.has(3)) {
      markers.push({
        type: 'script_type',
        description: 'Plutus V1 scripts in witness set',
        era: 'alonzo',
        confidence: 'high',
      })
    }

    // Key 4: plutus_data/datums (Alonzo+)
    if (ws.has(4)) {
      markers.push({
        type: 'witness_type',
        description: 'Plutus datum values in witness set',
        era: 'alonzo',
        confidence: 'high',
      })
    }

    // Key 5: redeemers (Alonzo+)
    if (ws.has(5)) {
      markers.push({
        type: 'script_type',
        description: 'Redeemers in witness set (Plutus execution)',
        era: 'alonzo',
        confidence: 'high',
      })

      // Analyze redeemer tags for Conway detection
      // Redeemer format: [tag, index, data, ex_units]
      // Tags: 0=spend, 1=mint, 2=cert, 3=reward, 4=voting (Conway), 5=proposing (Conway)
      const redeemers = ws.get(5)
      analyzeRedeemers(redeemers, markers)
    }

    // Key 6: plutus_v2_scripts (Babbage+)
    if (ws.has(6)) {
      markers.push({
        type: 'script_type',
        description: 'Plutus V2 scripts in witness set',
        era: 'babbage',
        confidence: 'high',
      })
    }

    // Key 7: plutus_v3_scripts (Conway+)
    if (ws.has(7)) {
      markers.push({
        type: 'script_type',
        description: 'Plutus V3 scripts in witness set',
        era: 'conway',
        confidence: 'high',
      })
    }
  }

  /**
   * Analyze redeemers for era-specific tags
   *
   * Redeemer tags per CDDL:
   * - 0: spend (spending a script UTxO)
   * - 1: mint (minting/burning with policy script)
   * - 2: cert (certificate script)
   * - 3: reward (reward withdrawal script)
   * - 4: voting (Conway: voting script)
   * - 5: proposing (Conway: proposal script)
   */
  const analyzeRedeemers = (
    redeemers: CborValue,
    markers: EraMarker[]
  ): void => {
    if (!redeemers) return

    // Redeemers can be an array or a map (Babbage introduced map format)
    let redeemerList: CborValue[] = []

    if (Array.isArray(redeemers)) {
      redeemerList = redeemers
    } else if (redeemers instanceof Map) {
      // Map format: { [tag, index] => [data, ex_units] }
      // This is Babbage+ format
      markers.push({
        type: 'witness_type',
        description: 'Map-format redeemers (Babbage+ style)',
        era: 'babbage',
        confidence: 'high',
      })

      // Extract tags from map keys
      for (const key of Array.from(redeemers.keys())) {
        if (Array.isArray(key) && key.length >= 1) {
          const tag = key[0]
          checkRedeemerTag(tag, markers)
        }
      }
      return
    }

    // Array format: [[tag, index, data, ex_units], ...]
    for (const redeemer of redeemerList) {
      if (Array.isArray(redeemer) && redeemer.length >= 1) {
        const tag = redeemer[0]
        checkRedeemerTag(tag, markers)
      }
    }
  }

  /**
   * Check a single redeemer tag for era-specific values
   */
  const checkRedeemerTag = (tag: unknown, markers: EraMarker[]): void => {
    if (typeof tag !== 'number') return

    // Conway-specific redeemer tags
    if (tag === 4) {
      markers.push({
        type: 'governance',
        description: 'Voting redeemer tag (Conway governance)',
        era: 'conway',
        confidence: 'high',
      })
    } else if (tag === 5) {
      markers.push({
        type: 'governance',
        description: 'Proposing redeemer tag (Conway governance)',
        era: 'conway',
        confidence: 'high',
      })
    }
  }

  /**
   * Detect era from general CBOR structure (non-transaction)
   */
  const detectFromStructure = (
    parsed: CborValue,
    markers: EraMarker[],
    _warnings: string[]
  ): CardanoEra => {
    // Check for Plutus data structures (constructors)
    if (isPlutusData(parsed)) {
      markers.push({
        type: 'structure',
        description: 'Plutus data structure detected',
        era: 'alonzo',
        confidence: 'medium',
      })
      return 'alonzo'
    }

    // Check for address patterns
    const addressEra = detectAddressEra(parsed, markers)
    if (addressEra !== 'unknown') {
      return addressEra
    }

    // Check for block structure
    if (Array.isArray(parsed) && parsed.length === 2) {
      const [tag] = parsed
      if (tag === 0 || tag === 1) {
        markers.push({
          type: 'structure',
          description: 'Byron block structure detected',
          era: 'byron',
          confidence: 'high',
        })
        return 'byron'
      }
    }

    return 'unknown'
  }

  /**
   * Check if value is Plutus data (has constructor tag)
   */
  const isPlutusData = (value: CborValue): boolean => {
    if (typeof value === 'object' && value !== null) {
      if ('constructor' in value && 'fields' in value) {
        return true
      }
      if ('tag' in value) {
        const tag = (value as { tag: number }).tag
        // Plutus constructor tags: 121-127, 102, 1280-1400
        if ((tag >= 121 && tag <= 127) || tag === 102 || (tag >= 1280 && tag <= 1400)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * Detect era from address format
   */
  const detectAddressEra = (
    parsed: CborValue,
    markers: EraMarker[]
  ): CardanoEra => {
    // Look for byte arrays that could be addresses
    const checkBytes = (bytes: Uint8Array): CardanoEra => {
      if (bytes.length === 57) {
        markers.push({
          type: 'address_format',
          description: 'Shelley address format (57 bytes)',
          era: 'shelley',
          confidence: 'medium',
        })
        return 'shelley'
      }
      if (bytes.length === 29) {
        markers.push({
          type: 'address_format',
          description: 'Enterprise/reward address format (29 bytes)',
          era: 'shelley',
          confidence: 'medium',
        })
        return 'shelley'
      }
      // Byron bootstrap addresses start with 0x82 and are typically 82+ bytes
      if (bytes.length >= 82 && bytes[0] === 0x82) {
        markers.push({
          type: 'address_format',
          description: 'Byron bootstrap address format',
          era: 'byron',
          confidence: 'high',
        })
        return 'byron'
      }
      return 'unknown'
    }

    if (parsed instanceof Uint8Array) {
      return checkBytes(parsed)
    }

    // Recursively check arrays
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item instanceof Uint8Array) {
          const era = checkBytes(item)
          if (era !== 'unknown') return era
        }
      }
    }

    return 'unknown'
  }

  /**
   * Calculate detection confidence
   */
  const calculateConfidence = (
    markers: EraMarker[],
    era: CardanoEra
  ): 'high' | 'medium' | 'low' => {
    if (markers.length === 0) return 'low'

    const highConfidenceMarkers = markers.filter(m => m.confidence === 'high')
    const eraMarkers = markers.filter(m => m.era === era)

    if (highConfidenceMarkers.length >= 2 && eraMarkers.length >= 1) {
      return 'high'
    }
    if (highConfidenceMarkers.length >= 1 || eraMarkers.length >= 2) {
      return 'medium'
    }
    return 'low'
  }

  /**
   * Build reference list for detected era
   */
  const buildReferences = (
    era: CardanoEra,
    markers: EraMarker[]
  ): EraReference[] => {
    const refs: EraReference[] = []
    const eraInfo = ERA_INFO[era]

    if (era !== 'unknown' && eraInfo.cddlSpec) {
      refs.push({
        name: `${eraInfo.displayName} CDDL Specification`,
        url: `https://github.com/IntersectMBO/cardano-ledger/blob/master/${eraInfo.cddlSpec}`,
        type: 'cddl',
      })
    }

    // Add CIP references from era info
    for (const cip of eraInfo.cips) {
      refs.push({
        name: `CIP-${cip.number}: ${cip.name}`,
        url: cip.url,
        type: 'cip',
      })
    }

    // Add CIP references based on specific markers
    const addedCips = new Set<number>()
    for (const marker of markers) {
      if (marker.description.includes('CIP-31') && !addedCips.has(31)) {
        refs.push({
          name: 'CIP-31: Reference Inputs',
          url: 'https://cips.cardano.org/cip/CIP-0031',
          type: 'cip',
        })
        addedCips.add(31)
      }
      if (marker.description.includes('CIP-32') && !addedCips.has(32)) {
        refs.push({
          name: 'CIP-32: Inline Datums',
          url: 'https://cips.cardano.org/cip/CIP-0032',
          type: 'cip',
        })
        addedCips.add(32)
      }
      if (marker.description.includes('CIP-33') && !addedCips.has(33)) {
        refs.push({
          name: 'CIP-33: Reference Scripts',
          url: 'https://cips.cardano.org/cip/CIP-0033',
          type: 'cip',
        })
        addedCips.add(33)
      }
      if (marker.description.includes('CIP-1694') && !addedCips.has(1694)) {
        refs.push({
          name: 'CIP-1694: On-Chain Governance',
          url: 'https://cips.cardano.org/cip/CIP-1694',
          type: 'cip',
        })
        addedCips.add(1694)
      }
    }

    return refs
  }

  /**
   * Get era information
   */
  const getEraInfo = (era: CardanoEra) => ERA_INFO[era]

  /**
   * Format era detection result for display
   */
  const formatDetectionResult = (result: EraDetectionResult): string => {
    const lines: string[] = []
    const eraInfo = ERA_INFO[result.era]

    lines.push(`Era: ${eraInfo.displayName}`)
    lines.push(`Confidence: ${result.confidence}`)
    lines.push('')

    if (result.markers.length > 0) {
      lines.push('Detected Markers:')
      for (const marker of result.markers) {
        lines.push(`  • ${marker.description}`)
      }
      lines.push('')
    }

    if (result.transactionInfo) {
      const tx = result.transactionInfo
      lines.push('Transaction Info:')
      lines.push(`  • Inputs: ${tx.inputCount}`)
      lines.push(`  • Outputs: ${tx.outputCount}`)
      if (tx.fee !== undefined) {
        lines.push(`  • Fee: ${tx.fee} lovelace`)
      }
      if (tx.hasCertificates && tx.certificateTypes) {
        lines.push(`  • Certificates: ${tx.certificateTypes.join(', ')}`)
      }
      lines.push('')
    }

    if (result.references.length > 0) {
      lines.push('References:')
      for (const ref of result.references) {
        lines.push(`  • ${ref.name}`)
        lines.push(`    ${ref.url}`)
      }
    }

    if (result.warnings.length > 0) {
      lines.push('')
      lines.push('Warnings:')
      for (const warning of result.warnings) {
        lines.push(`  ⚠ ${warning}`)
      }
    }

    return lines.join('\n')
  }

  return {
    detectEra,
    getEraInfo,
    formatDetectionResult,
  }
}
