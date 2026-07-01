/**
 * Cardano Era Types and Interfaces
 *
 * Defines types for era detection, transaction structures,
 * and CDDL compliance checking across all Cardano eras.
 */

/**
 * All Cardano eras from Byron to Conway
 */
export type CardanoEra =
  | 'byron'
  | 'shelley'
  | 'allegra'
  | 'mary'
  | 'alonzo'
  | 'babbage'
  | 'conway'
  | 'unknown'

/**
 * Era metadata including introduction dates and key features
 */
export interface EraInfo {
  name: CardanoEra
  displayName: string
  introduced: string  // Approximate date
  description: string
  keyFeatures: string[]
  cddlSpec: string    // Path in cardano-ledger repo
  cips: CipReference[]
}

/**
 * Reference to a Cardano Improvement Proposal
 */
export interface CipReference {
  number: number
  name: string
  url: string
  description?: string
}

/**
 * Result of era detection analysis
 */
export interface EraDetectionResult {
  era: CardanoEra
  confidence: 'high' | 'medium' | 'low'
  markers: EraMarker[]
  warnings: string[]
  references: EraReference[]
  transactionInfo?: TransactionInfo
}

/**
 * A detected marker that indicates a specific era
 */
export interface EraMarker {
  type: MarkerType
  description: string
  era: CardanoEra
  field?: string | number
  confidence: 'high' | 'medium' | 'low'
}

export type MarkerType =
  | 'transaction_field'
  | 'certificate_type'
  | 'script_type'
  | 'address_format'
  | 'output_format'
  | 'witness_type'
  | 'governance'
  | 'structure'

/**
 * Reference to documentation for detected era
 */
export interface EraReference {
  name: string
  url: string
  type: 'cddl' | 'cip' | 'docs'
  section?: string
}

/**
 * Parsed transaction information
 */
export interface TransactionInfo {
  inputCount: number
  outputCount: number
  collateralInputCount: number
  referenceInputCount: number
  fee?: bigint
  ttl?: number
  validityStart?: number
  hasCertificates: boolean
  certificateTypes?: CertificateType[]
  hasWithdrawals: boolean
  hasMint: boolean
  hasCollateral: boolean
  hasReferenceInputs: boolean
  hasInlineDatums: boolean
  hasReferenceScripts: boolean
  hasVotingProcedures: boolean
  hasProposalProcedures: boolean
  scriptTypes?: ScriptType[]
}

/**
 * Certificate types across all eras
 */
export type CertificateType =
  // Shelley era (0-6)
  | 'stake_registration'           // 0
  | 'stake_deregistration'         // 1
  | 'stake_delegation'             // 2
  | 'pool_registration'            // 3
  | 'pool_retirement'              // 4
  | 'genesis_key_delegation'       // 5
  | 'move_instantaneous_rewards'   // 6
  // Conway era (7-18)
  | 'reg_cert'                     // 7
  | 'unreg_cert'                   // 8
  | 'vote_deleg_cert'              // 9
  | 'stake_vote_deleg_cert'        // 10
  | 'stake_reg_deleg_cert'         // 11
  | 'vote_reg_deleg_cert'          // 12
  | 'stake_vote_reg_deleg_cert'    // 13
  | 'auth_committee_hot_cert'      // 14
  | 'resign_committee_cold_cert'   // 15
  | 'reg_drep_cert'                // 16
  | 'unreg_drep_cert'              // 17
  | 'update_drep_cert'             // 18
  | 'unknown'

/**
 * Script types across eras
 */
export type ScriptType =
  | 'native'           // Shelley+
  | 'timelock'         // Allegra+
  | 'plutus_v1'        // Alonzo+
  | 'plutus_v2'        // Babbage+
  | 'plutus_v3'        // Conway+

/**
 * Transaction body field indices per CDDL
 */
export const TRANSACTION_BODY_FIELDS = {
  inputs: 0,
  outputs: 1,
  fee: 2,
  ttl: 3,
  certificates: 4,
  withdrawals: 5,
  update: 6,
  auxiliary_data_hash: 7,
  validity_interval_start: 8,
  mint: 9,
  script_data_hash: 11,
  collateral: 13,
  required_signers: 14,
  network_id: 15,
  collateral_return: 16,
  total_collateral: 17,
  reference_inputs: 18,
  voting_procedures: 19,
  proposal_procedures: 20,
  current_treasury_value: 21,
  donation: 22,
} as const

/**
 * Certificate type indices per CDDL
 */
export const CERTIFICATE_TYPE_INDICES: Record<number, CertificateType> = {
  0: 'stake_registration',
  1: 'stake_deregistration',
  2: 'stake_delegation',
  3: 'pool_registration',
  4: 'pool_retirement',
  5: 'genesis_key_delegation',
  6: 'move_instantaneous_rewards',
  7: 'reg_cert',
  8: 'unreg_cert',
  9: 'vote_deleg_cert',
  10: 'stake_vote_deleg_cert',
  11: 'stake_reg_deleg_cert',
  12: 'vote_reg_deleg_cert',
  13: 'stake_vote_reg_deleg_cert',
  14: 'auth_committee_hot_cert',
  15: 'resign_committee_cold_cert',
  16: 'reg_drep_cert',
  17: 'unreg_drep_cert',
  18: 'update_drep_cert',
}

/**
 * Era information database
 */
export const ERA_INFO: Record<CardanoEra, EraInfo> = {
  byron: {
    name: 'byron',
    displayName: 'Byron',
    introduced: '2017-09-29',
    description: 'Original Cardano era with basic UTxO model',
    keyFeatures: ['Basic transactions', 'Bootstrap addresses', 'No staking'],
    cddlSpec: 'eras/byron/cddl-spec/byron.cddl',
    cips: [],
  },
  shelley: {
    name: 'shelley',
    displayName: 'Shelley',
    introduced: '2020-07-29',
    description: 'Decentralization era with staking and delegation',
    keyFeatures: ['Stake delegation', 'Stake pools', 'Rewards', 'Certificates'],
    cddlSpec: 'eras/shelley/impl/cddl-files/shelley.cddl',
    cips: [
      { number: 19, name: 'Cardano Addresses', url: 'https://cips.cardano.org/cip/CIP-0019' },
    ],
  },
  allegra: {
    name: 'allegra',
    displayName: 'Allegra',
    introduced: '2020-12-16',
    description: 'Token locking era with timelocks',
    keyFeatures: ['Timelock scripts', 'Validity intervals'],
    cddlSpec: 'eras/shelley-ma/impl/cddl-files/shelley-ma.cddl',
    cips: [],
  },
  mary: {
    name: 'mary',
    displayName: 'Mary',
    introduced: '2021-03-01',
    description: 'Multi-asset era with native tokens',
    keyFeatures: ['Native tokens', 'Minting policies', 'Multi-asset UTxOs'],
    cddlSpec: 'eras/shelley-ma/impl/cddl-files/shelley-ma.cddl',
    cips: [
      { number: 25, name: 'NFT Metadata Standard', url: 'https://cips.cardano.org/cip/CIP-0025' },
    ],
  },
  alonzo: {
    name: 'alonzo',
    displayName: 'Alonzo',
    introduced: '2021-09-12',
    description: 'Smart contract era with Plutus',
    keyFeatures: ['Plutus V1 scripts', 'Datums', 'Redeemers', 'Collateral'],
    cddlSpec: 'eras/alonzo/impl/cddl-files/alonzo.cddl',
    cips: [
      { number: 31, name: 'Reference Inputs', url: 'https://cips.cardano.org/cip/CIP-0031', description: 'Proposed in Alonzo, implemented in Babbage' },
    ],
  },
  babbage: {
    name: 'babbage',
    displayName: 'Babbage',
    introduced: '2022-09-22',
    description: 'Vasil era with reference scripts and inline datums',
    keyFeatures: ['Plutus V2', 'Reference inputs', 'Inline datums', 'Reference scripts'],
    cddlSpec: 'eras/babbage/impl/cddl-files/babbage.cddl',
    cips: [
      { number: 31, name: 'Reference Inputs', url: 'https://cips.cardano.org/cip/CIP-0031' },
      { number: 32, name: 'Inline Datums', url: 'https://cips.cardano.org/cip/CIP-0032' },
      { number: 33, name: 'Reference Scripts', url: 'https://cips.cardano.org/cip/CIP-0033' },
    ],
  },
  conway: {
    name: 'conway',
    displayName: 'Conway',
    introduced: '2024-09-01',
    description: 'Governance era with on-chain voting',
    keyFeatures: ['Plutus V3', 'Governance actions', 'DReps', 'Voting', 'Treasury'],
    cddlSpec: 'eras/conway/impl/cddl-files/conway.cddl',
    cips: [
      { number: 1694, name: 'On-Chain Governance', url: 'https://cips.cardano.org/cip/CIP-1694' },
    ],
  },
  unknown: {
    name: 'unknown',
    displayName: 'Unknown',
    introduced: '',
    description: 'Unable to determine era',
    keyFeatures: [],
    cddlSpec: '',
    cips: [],
  },
}

/**
 * Fields that indicate minimum era requirements
 */
export const ERA_REQUIRED_FIELDS: Record<number, CardanoEra> = {
  [TRANSACTION_BODY_FIELDS.validity_interval_start]: 'allegra',
  [TRANSACTION_BODY_FIELDS.mint]: 'mary',
  [TRANSACTION_BODY_FIELDS.script_data_hash]: 'alonzo',
  [TRANSACTION_BODY_FIELDS.collateral]: 'alonzo',
  [TRANSACTION_BODY_FIELDS.required_signers]: 'alonzo',
  [TRANSACTION_BODY_FIELDS.network_id]: 'alonzo',
  [TRANSACTION_BODY_FIELDS.collateral_return]: 'babbage',
  [TRANSACTION_BODY_FIELDS.total_collateral]: 'babbage',
  [TRANSACTION_BODY_FIELDS.reference_inputs]: 'babbage',
  [TRANSACTION_BODY_FIELDS.voting_procedures]: 'conway',
  [TRANSACTION_BODY_FIELDS.proposal_procedures]: 'conway',
  [TRANSACTION_BODY_FIELDS.current_treasury_value]: 'conway',
  [TRANSACTION_BODY_FIELDS.donation]: 'conway',
}

/**
 * Era ordering for comparison
 */
export const ERA_ORDER: Record<CardanoEra, number> = {
  unknown: -1,
  byron: 0,
  shelley: 1,
  allegra: 2,
  mary: 3,
  alonzo: 4,
  babbage: 5,
  conway: 6,
}

/**
 * Compare two eras
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
export function compareEras(a: CardanoEra, b: CardanoEra): number {
  return ERA_ORDER[a] - ERA_ORDER[b]
}

/**
 * Get the minimum era that supports a given feature
 */
export function getMinimumEra(feature: keyof typeof TRANSACTION_BODY_FIELDS): CardanoEra {
  const fieldIndex = TRANSACTION_BODY_FIELDS[feature]
  return ERA_REQUIRED_FIELDS[fieldIndex] || 'shelley'
}
