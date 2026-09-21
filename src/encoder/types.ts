/**
 * CBOR Encoder Type Definitions
 * Following RFC 8949 specification
 */

import type { PlutusConstr, CborFloat, CborByteString, CborTextString, MapKeyOrder } from '../parser/types'
import { INDEFINITE_SYMBOL, ALL_ENTRIES_SYMBOL } from '../parser/types'

// Re-export symbols and types for use in encoder
export { INDEFINITE_SYMBOL, ALL_ENTRIES_SYMBOL }
export type { CborByteString, CborTextString, MapKeyOrder }

/**
 * Encoder options for controlling behavior
 */
export interface EncodeOptions {
  /** Enable canonical encoding (shortest form, sorted maps) */
  canonical?: boolean
  /** Allow indefinite-length encoding (false in canonical mode) */
  allowIndefinite?: boolean
  /** Reject duplicate map keys */
  rejectDuplicateKeys?: boolean
  /**
   * Map key ordering used in canonical mode.
   * Defaults to 'length-first' (Cardano CIP-21 / RFC 7049 §3.9).
   * Use 'bytewise' for RFC 8949 §4.2.1 core deterministic order.
   */
  mapKeyOrder?: MapKeyOrder
  /** Maximum nesting depth */
  maxDepth?: number
  /** Maximum output size in bytes */
  maxOutputSize?: number
  /**
   * Maximum bignum content size in bytes for automatic tag 2/3 emission
   * (bigints outside the ±2^64 range). Mirrors the parser's
   * `limits.maxBignumBytes` (CVE-2020-28491 mitigation).
   */
  maxBignumBytes?: number
  /**
   * Wrap the encoded output in tag 55799 (self-described CBOR, RFC 8949 §3.4.6).
   * The output starts with the magic bytes d9d9f7.
   */
  selfDescribed?: boolean
}

/**
 * Default encode options
 */
export const DEFAULT_ENCODE_OPTIONS: Required<EncodeOptions> = {
  canonical: false,
  allowIndefinite: true,
  rejectDuplicateKeys: false,
  mapKeyOrder: 'length-first',
  // Aligned with the parser's DEFAULT_LIMITS.maxDepth (100) so any value the
  // parser can decode can be re-encoded (encode/decode depth symmetry).
  maxDepth: 100,
  maxOutputSize: 100 * 1024 * 1024,  // 100 MB
  maxBignumBytes: 1024,              // 1 KB = 8192 bits (matches parser limit)
  selfDescribed: false
}

/**
 * Result of encoding operation
 */
export interface EncodeResult {
  /** Encoded CBOR bytes */
  bytes: Uint8Array
  /** Hex string representation */
  hex: string
}

/**
 * Values that can be encoded to CBOR
 *
 * Supports both plain objects (for convenience) and Maps (for type preservation).
 * Map<any, any> is preferred for maps with non-string keys (integers, Uint8Arrays, etc.)
 */
export type EncodableValue =
  | number
  | bigint
  | string
  | boolean
  | null
  | undefined
  | Uint8Array
  | EncodableValue[]
  | { [key: string]: EncodableValue }  // Plain object (legacy/convenience)
  | Map<EncodableValue, EncodableValue>  // Map (preserves key types)
  | TaggedValue
  | CborFloat

/**
 * Tagged CBOR value (Major Type 6)
 */
export interface TaggedValue {
  tag: number | bigint
  value: EncodableValue
  plutus?: PlutusConstr
}

/**
 * Encoding context that tracks state during CBOR encoding
 */
export interface EncodeContext {
  /** Current nesting depth */
  depth: number
  /** Encoder options */
  options: Required<EncodeOptions>
}
