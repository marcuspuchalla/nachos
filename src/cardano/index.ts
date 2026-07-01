/**
 * Cardano Application Layer for NACHOS
 *
 * Cardano-specific CBOR tooling built on top of the RFC 8949 base parser:
 * - Era detection (Byron → Conway) from transaction structure
 * - Cardano CBOR decoder with enhanced, human-readable source maps
 * - CIP-25 NFT metadata parsing / validation
 * - Cardano helpers (addresses, transactions, witness sets, Plutus data)
 *
 * Consolidated from the cbor.app fork onto the canonical Nachos base.
 *
 * @module @marcuspuchalla/nachos/cardano
 */

// --- Composables ---
export { useCardanoCborDecoder } from './composables/useCardanoCborDecoder'
export { useCardanoEraDetector } from './composables/useCardanoEraDetector'
export { useCardanoHelpers } from './composables/useCardanoHelpers'
export { useCip25Parser } from './composables/useCip25Parser'

// --- Cardano CBOR decoder types ---
export type {
  CardanoSourceMapEntry,
  CardanoParseResult
} from './composables/useCardanoCborDecoder'

// --- Cardano helper types ---
export type {
  CardanoAddress,
  CardanoTransaction,
  CardanoTransactionBody,
  CardanoTransactionOutput,
  CardanoWitnessSet,
  CardanoHelperPlutusData
} from './composables/useCardanoHelpers'

// --- CIP-25 types ---
export type {
  Cip25File,
  Cip25AssetMetadata,
  Cip25Asset,
  Cip25ParseResult,
  Cip25ValidationResult
} from './composables/useCip25Parser'

// --- Era detection types + tables ---
export type {
  CardanoEra,
  EraInfo,
  CipReference,
  EraDetectionResult,
  EraMarker,
  MarkerType,
  EraReference,
  TransactionInfo,
  CertificateType,
  ScriptType
} from './types/cardano-eras'

export {
  TRANSACTION_BODY_FIELDS,
  CERTIFICATE_TYPE_INDICES,
  ERA_INFO,
  ERA_REQUIRED_FIELDS,
  ERA_ORDER,
  compareEras,
  getMinimumEra
} from './types/cardano-eras'
