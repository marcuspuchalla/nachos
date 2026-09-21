/**
 * Cardano-Specific CBOR Helper Functions
 *
 * Provides utility functions for working with Cardano blockchain CBOR data.
 * Based on Cardano Improvement Proposals (CIPs) and Cardano ledger specs.
 */

import { useCborParser } from '../../parser/composables/useCborParser'
import { useCip25Parser } from './useCip25Parser'
import type { Cip25ParseResult } from './useCip25Parser'

export interface CardanoAddress {
  type: 'shelley' | 'byron' | 'reward' | 'enterprise' | 'pointer'
  network: 'mainnet' | 'testnet'
  paymentCredential?: {
    type: 'key' | 'script'
    hash: Uint8Array
  }
  stakeCredential?: {
    type: 'key' | 'script'
    hash: Uint8Array
  } | {
    type: 'pointer'
    slot: number
    txIndex: number
    certIndex: number
  }
  raw: Uint8Array
}

export interface CardanoTransaction {
  body: CardanoTransactionBody
  witnessSet?: CardanoWitnessSet
  isValid?: boolean
  auxiliaryData?: any
}

export interface CardanoTransactionBody {
  inputs?: Array<[Uint8Array, number]>  // [txHash, outputIndex]
  outputs?: CardanoTransactionOutput[]
  fee?: number | bigint
  ttl?: number | bigint
  certificates?: any[]
  withdrawals?: Map<Uint8Array, number | bigint>
  update?: any
  auxiliaryDataHash?: Uint8Array
  validityIntervalStart?: number | bigint
  mint?: Map<Uint8Array, Map<Uint8Array, number | bigint>>
  scriptDataHash?: Uint8Array
  collateral?: Array<[Uint8Array, number]>
  requiredSigners?: Uint8Array[]
  networkId?: number
  collateralReturn?: CardanoTransactionOutput
  totalCollateral?: number | bigint
  referenceInputs?: Array<[Uint8Array, number]>
  votingProcedures?: any
  proposalProcedures?: any
  currentTreasuryValue?: number | bigint
  donation?: number | bigint
}

export interface CardanoTransactionOutput {
  address: Uint8Array
  amount: number | bigint | Map<Uint8Array, Map<Uint8Array, number | bigint>>
  datumOption?: {
    type: 'hash' | 'inline'
    value: Uint8Array | any
  }
  scriptRef?: Uint8Array
}

export interface CardanoWitnessSet {
  vkeyWitnesses?: Array<[Uint8Array, Uint8Array]>  // [vkey, signature]
  nativeScripts?: any[]
  bootstrapWitnesses?: any[]
  plutusV1Scripts?: Uint8Array[]
  plutusData?: any[]
  redeemers?: any[]
  plutusV2Scripts?: Uint8Array[]
  plutusV3Scripts?: Uint8Array[]
}

/**
 * Structured Plutus constructor as returned by the Cardano helper layer.
 *
 * Renamed from the fork's local `PlutusData` to avoid colliding with the
 * canonical `PlutusData` union exported from the Nachos base
 * (`src/parser/types.ts`). This helper shape mirrors the base `PlutusConstr`
 * ({ constructor, fields }) but keeps `fields: any[]` for the loosely-typed
 * transaction/witness parsing used here.
 */
export interface CardanoHelperPlutusData {
  constructor: number | bigint
  fields: any[]
}

/**
 * Cardano Helper Composable
 *
 * Provides functions for parsing and working with Cardano blockchain data
 */
export function useCardanoHelpers() {
  const { parseWithSourceMap } = useCborParser()

  /**
   * Parse a Cardano address from CBOR hex
   *
   * @param hex - CBOR-encoded address hex string
   * @returns Decoded address information
   */
  const parseAddress = (hex: string): CardanoAddress => {
    const result = parseWithSourceMap(hex)
    const bytes = result.value as Uint8Array

    if (!(bytes instanceof Uint8Array)) {
      throw new Error('Address must be a byte string')
    }

    if (bytes.length < 1) {
      throw new Error('Address is too short')
    }

    const header = bytes[0]!
    const addressType = (header & 0xF0) >> 4
    const networkId = header & 0x0F

    const network = networkId === 1 ? 'mainnet' : 'testnet'

    // Shelley addresses (types 0-7, CIP-19):
    //   0-3: base addresses (payment credential + stake credential)
    //   4-5: pointer addresses (payment credential + stake pointer)
    //   6-7: enterprise addresses (payment credential only)
    if (addressType <= 7) {
      const paymentType = (addressType & 0x01) === 0 ? 'key' : 'script'
      const stakeType = (addressType & 0x02) === 0 ? 'key' : 'script'
      const hasStakeHash = addressType <= 3
      const isPointer = addressType === 4 || addressType === 5

      if (bytes.length < 29) {
        throw new Error('Shelley address is too short')
      }

      const address: CardanoAddress = {
        type: hasStakeHash ? 'shelley' : (isPointer ? 'pointer' : 'enterprise'),
        network,
        paymentCredential: {
          type: paymentType,
          hash: bytes.slice(1, 29)
        },
        raw: bytes
      }

      if (hasStakeHash && bytes.length >= 57) {
        address.stakeCredential = {
          type: stakeType,
          hash: bytes.slice(29, 57)
        }
      }

      if (isPointer) {
        // Pointer: three variable-length natural numbers (CIP-19):
        // slot, tx_index, cert_index — 7 bits per byte, high bit = continuation
        let offset = 29
        const readVariableLengthNat = (): number => {
          let value = 0
          for (;;) {
            if (offset >= bytes.length) {
              throw new Error('Pointer address is truncated (incomplete variable-length nat)')
            }
            const byte = bytes[offset]!
            offset++
            value = value * 128 + (byte & 0x7f)
            if ((byte & 0x80) === 0) {
              return value
            }
            if (!Number.isSafeInteger(value)) {
              throw new Error('Pointer address nat exceeds safe integer range')
            }
          }
        }

        const slot = readVariableLengthNat()
        const txIndex = readVariableLengthNat()
        const certIndex = readVariableLengthNat()

        address.stakeCredential = {
          type: 'pointer',
          slot,
          txIndex,
          certIndex
        }
      }

      return address
    }

    // Reward addresses (type 14-15)
    if (addressType === 14 || addressType === 15) {
      const credType = addressType === 14 ? 'key' : 'script'

      return {
        type: 'reward',
        network,
        stakeCredential: {
          type: credType,
          hash: bytes.slice(1, 29)
        },
        raw: bytes
      }
    }

    throw new Error(`Unknown address type: ${addressType}`)
  }

  /**
   * Parse a Cardano transaction from CBOR hex
   *
   * @param hex - CBOR-encoded transaction hex string
   * @returns Decoded transaction
   */
  const parseTransaction = (hex: string): CardanoTransaction => {
    const result = parseWithSourceMap(hex)
    const tx = result.value as any

    if (!Array.isArray(tx)) {
      throw new Error('Transaction must be an array')
    }

    if (tx.length !== 3 && tx.length !== 4) throw new Error('Transaction must have 3 (Shelley) or 4 (Alonzo and later) elements')
    if (tx.length === 4 && typeof tx[2] !== 'boolean') throw new Error('Transaction validity flag must be boolean')
    return {
      body: parseTransactionBody(tx[0]),
      witnessSet: tx[1] ? parseWitnessSet(tx[1]) : undefined,
      ...(tx.length === 4 ? { isValid: tx[2] } : {}),
      auxiliaryData: tx.length === 3 ? tx[2] : tx[3]
    }
  }

  /**
   * Parse a transaction body
   */
  /**
   * Unwrap a tag-258 (set) wrapper, returning the inner array.
   * Conway wraps inputs, collateral, reference inputs, required signers,
   * certificates, and proposal procedures in CBOR tag 258 (CIP-0005 sets).
   */
  const unwrapSet = (value: any): any => {
    if (value && typeof value === 'object' && 'tag' in value && 'value' in value &&
        (value as { tag: number }).tag === 258) {
      return (value as { value: any }).value
    }
    return value
  }

  const parseTransactionBody = (body: any): CardanoTransactionBody => {
    if (!(body instanceof Map)) {
      throw new Error('Transaction body must be a map')
    }

    const result: CardanoTransactionBody = {}

    // Field 0: Inputs (tag-258 set in Conway)
    if (body.has(0)) {
      result.inputs = unwrapSet(body.get(0))
    }

    // Field 1: Outputs
    if (body.has(1)) {
      result.outputs = body.get(1)
    }

    // Field 2: Fee
    if (body.has(2)) {
      result.fee = body.get(2)
    }

    // Field 3: TTL
    if (body.has(3)) {
      result.ttl = body.get(3)
    }

    // Field 4: Certificates (tag-258 set in Conway)
    if (body.has(4)) {
      result.certificates = unwrapSet(body.get(4))
    }

    // Field 5: Withdrawals
    if (body.has(5)) {
      result.withdrawals = body.get(5)
    }

    // Field 6: Update
    if (body.has(6)) {
      result.update = body.get(6)
    }

    // Field 7: Auxiliary data hash
    if (body.has(7)) {
      result.auxiliaryDataHash = body.get(7)
    }

    // Field 8: Validity interval start
    if (body.has(8)) {
      result.validityIntervalStart = body.get(8)
    }

    // Field 9: Mint
    if (body.has(9)) {
      result.mint = body.get(9)
    }

    // Field 11: Script data hash
    if (body.has(11)) {
      result.scriptDataHash = body.get(11)
    }

    // Field 13: Collateral inputs (tag-258 set in Conway)
    if (body.has(13)) {
      result.collateral = unwrapSet(body.get(13))
    }

    // Field 14: Required signers (tag-258 set in Conway)
    if (body.has(14)) {
      result.requiredSigners = unwrapSet(body.get(14))
    }

    // Field 15: Network ID
    if (body.has(15)) {
      result.networkId = body.get(15)
    }

    // Field 16: Collateral return
    if (body.has(16)) {
      result.collateralReturn = body.get(16)
    }

    // Field 17: Total collateral
    if (body.has(17)) {
      result.totalCollateral = body.get(17)
    }

    // Field 18: Reference inputs (tag-258 set in Conway)
    if (body.has(18)) {
      result.referenceInputs = unwrapSet(body.get(18))
    }

    // Field 19: Voting procedures (Conway)
    if (body.has(19)) {
      result.votingProcedures = body.get(19)
    }

    // Field 20: Proposal procedures (Conway, tag-258 set)
    if (body.has(20)) {
      result.proposalProcedures = unwrapSet(body.get(20))
    }

    // Field 21: Current treasury value (Conway)
    if (body.has(21)) {
      result.currentTreasuryValue = body.get(21)
    }

    // Field 22: Donation (Conway)
    if (body.has(22)) {
      result.donation = body.get(22)
    }

    return result
  }

  /**
   * Parse a witness set
   */
  const parseWitnessSet = (witnesses: any): CardanoWitnessSet => {
    if (!(witnesses instanceof Map)) {
      throw new Error('Witness set must be a map')
    }

    const result: CardanoWitnessSet = {}

    if (witnesses.has(0)) {
      result.vkeyWitnesses = unwrapSet(witnesses.get(0))
    }

    if (witnesses.has(1)) {
      result.nativeScripts = unwrapSet(witnesses.get(1))
    }

    if (witnesses.has(2)) {
      result.bootstrapWitnesses = unwrapSet(witnesses.get(2))
    }

    if (witnesses.has(3)) {
      result.plutusV1Scripts = unwrapSet(witnesses.get(3))
    }

    if (witnesses.has(4)) {
      result.plutusData = unwrapSet(witnesses.get(4))
    }

    if (witnesses.has(5)) {
      result.redeemers = witnesses.get(5)
    }

    if (witnesses.has(6)) {
      result.plutusV2Scripts = unwrapSet(witnesses.get(6))
    }

    if (witnesses.has(7)) {
      result.plutusV3Scripts = unwrapSet(witnesses.get(7))
    }

    return result
  }

  /**
   * Convert a tagged Plutus constructor to a structured format
   *
   * @param value - Tagged value from parser (tag 121-127, 1280-1400, or 102)
   * @returns Plutus data structure
   */
  const parsePlutusData = (value: any): CardanoHelperPlutusData => {
    if (typeof value !== 'object' || value === null || !('tag' in value)) {
      throw new Error('Not a valid Plutus data structure')
    }

    const tag = value.tag
    let constructor: number
    let fields: any[]

    // Tags 121-127 → constructors 0-6
    if (tag >= 121 && tag <= 127) {
      constructor = tag - 121
      fields = value.value
    }
    // Tags 1280-1400 → constructors 7-127
    else if (tag >= 1280 && tag <= 1400) {
      constructor = tag - 1280 + 7
      fields = value.value
    }
    // Tag 102 → big constructors (> 127)
    else if (tag === 102) {
      if (!Array.isArray(value.value) || value.value.length < 2) {
        throw new Error('Tag 102 requires [constructor, fields] array')
      }
      constructor = value.value[0]
      fields = value.value[1]
    }
    else {
      throw new Error(`Not a Plutus constructor tag: ${tag}`)
    }

    return {
      constructor,
      fields
    }
  }

  /**
   * Check if a value is a Plutus constructor
   */
  const isPlutusConstructor = (value: any): boolean => {
    if (typeof value !== 'object' || value === null || !('tag' in value)) {
      return false
    }

    const tag = value.tag
    return (tag >= 121 && tag <= 127) ||
           (tag >= 1280 && tag <= 1400) ||
           tag === 102
  }

  /**
   * Parse CIP-25 NFT metadata from CBOR hex
   *
   * Delegates to the single CIP-25 implementation in `useCip25Parser`
   * (Map-aware, validates required fields, collects errors/warnings).
   *
   * @param hex - CBOR-encoded metadata hex string
   * @returns Parsed CIP-25 result (assets, version, errors, warnings)
   * @throws Error if the metadata does not contain the CIP-25 label 721
   */
  const parseCIP25Metadata = (hex: string): Cip25ParseResult => {
    const result = parseWithSourceMap(hex)
    const metadata = result.value as any

    if (!(metadata instanceof Map)) {
      throw new Error('Metadata must be a map')
    }

    const { extractCip25FromCbor } = useCip25Parser()
    const parsed = extractCip25FromCbor(metadata)
    if (!parsed) {
      throw new Error('No CIP-25 metadata found (label 721)')
    }

    return parsed
  }

  return {
    parseAddress,
    parseTransaction,
    parseTransactionBody,
    parseWitnessSet,
    parsePlutusData,
    isPlutusConstructor,
    parseCIP25Metadata
  }
}
