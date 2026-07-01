/**
 * Cardano-Specific CBOR Helper Functions
 *
 * Provides utility functions for working with Cardano blockchain CBOR data.
 * Based on Cardano Improvement Proposals (CIPs) and Cardano ledger specs.
 */

import { useCborParser } from '../../parser/composables/useCborParser'

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
  constructor: number
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

    // Shelley addresses (types 0-7)
    if (addressType <= 7) {
      const paymentType = (addressType & 0x01) === 0 ? 'key' : 'script'
      const stakeType = (addressType & 0x02) === 0 ? 'key' : 'script'
      const hasStake = addressType <= 3

      if (bytes.length < 29) {
        throw new Error('Shelley address is too short')
      }

      const address: CardanoAddress = {
        type: hasStake ? 'shelley' : 'enterprise',
        network,
        paymentCredential: {
          type: paymentType,
          hash: bytes.slice(1, 29)
        },
        raw: bytes
      }

      if (hasStake && bytes.length >= 57) {
        address.stakeCredential = {
          type: stakeType,
          hash: bytes.slice(29, 57)
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

    return {
      body: parseTransactionBody(tx[0]),
      witnessSet: tx[1] ? parseWitnessSet(tx[1]) : undefined,
      isValid: tx[2],
      auxiliaryData: tx[3]
    }
  }

  /**
   * Parse a transaction body
   */
  const parseTransactionBody = (body: any): CardanoTransactionBody => {
    if (!(body instanceof Map)) {
      throw new Error('Transaction body must be a map')
    }

    const result: CardanoTransactionBody = {}

    // Field 0: Inputs
    if (body.has(0)) {
      result.inputs = body.get(0)
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

    // Field 4: Certificates
    if (body.has(4)) {
      result.certificates = body.get(4)
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

    // Field 13: Collateral inputs
    if (body.has(13)) {
      result.collateral = body.get(13)
    }

    // Field 14: Required signers
    if (body.has(14)) {
      result.requiredSigners = body.get(14)
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

    // Field 18: Reference inputs
    if (body.has(18)) {
      result.referenceInputs = body.get(18)
    }

    // Field 19: Voting procedures (Conway)
    if (body.has(19)) {
      result.votingProcedures = body.get(19)
    }

    // Field 20: Proposal procedures (Conway)
    if (body.has(20)) {
      result.proposalProcedures = body.get(20)
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
      result.vkeyWitnesses = witnesses.get(0)
    }

    if (witnesses.has(1)) {
      result.nativeScripts = witnesses.get(1)
    }

    if (witnesses.has(2)) {
      result.bootstrapWitnesses = witnesses.get(2)
    }

    if (witnesses.has(3)) {
      result.plutusV1Scripts = witnesses.get(3)
    }

    if (witnesses.has(4)) {
      result.plutusData = witnesses.get(4)
    }

    if (witnesses.has(5)) {
      result.redeemers = witnesses.get(5)
    }

    if (witnesses.has(6)) {
      result.plutusV2Scripts = witnesses.get(6)
    }

    if (witnesses.has(7)) {
      result.plutusV3Scripts = witnesses.get(7)
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
   * Parse CIP-25 NFT metadata
   *
   * @param hex - CBOR-encoded metadata hex string
   * @returns Decoded NFT metadata
   */
  const parseCIP25Metadata = (hex: string): any => {
    const result = parseWithSourceMap(hex)
    const metadata = result.value as any

    if (!(metadata instanceof Map)) {
      throw new Error('Metadata must be a map')
    }

    // CIP-25 uses label 721
    const nftMetadata = metadata.get(721)
    if (!nftMetadata) {
      throw new Error('No CIP-25 metadata found (label 721)')
    }

    return nftMetadata
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
