/**
 * CIP-25 NFT Metadata Parser Composable
 * Parses and validates Cardano NFT metadata following CIP-25 standard
 *
 * CIP-25 specification: https://cips.cardano.org/cip/CIP-25
 *
 * The standard uses transaction metadata label "721" to store NFT metadata.
 * Structure:
 * {
 *   "721": {
 *     "<policy_id>": {
 *       "<asset_name>": {
 *         "name": <string>,        // REQUIRED
 *         "image": <uri | array>,  // REQUIRED
 *         "description": <string>, // OPTIONAL
 *         "mediaType": <string>,   // OPTIONAL
 *         "files": [...],          // OPTIONAL
 *         ... custom properties
 *       }
 *     },
 *     "version": <version_id>      // OPTIONAL, defaults to "1.0"
 *   }
 * }
 */

/**
 * CIP-25 File metadata
 */
export interface Cip25File {
  name?: string
  mediaType: string
  src: string | string[]
}

/**
 * CIP-25 Asset metadata
 */
export interface Cip25AssetMetadata {
  name: string
  image: string | string[]
  description?: string
  mediaType?: string
  files?: Cip25File[]
  [key: string]: any  // Allow custom properties
}

/**
 * Parsed CIP-25 asset with policy and asset name
 */
export interface Cip25Asset {
  policyId: string
  assetName: string
  metadata: Cip25AssetMetadata
}

/**
 * CIP-25 parse result
 */
export interface Cip25ParseResult {
  isValid: boolean
  version: string
  assets: Cip25Asset[]
  errors: string[]
}

/**
 * CIP-25 validation result
 */
export interface Cip25ValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * CIP-25 NFT Metadata Parser Composable
 *
 * Provides functions to parse and validate Cardano NFT metadata.
 *
 * @example
 * ```ts
 * const { parseCip25Metadata, validateCip25 } = useCip25Parser()
 *
 * const metadata = {
 *   "721": {
 *     "policy_id": {
 *       "TokenName": {
 *         "name": "My NFT",
 *         "image": "ipfs://QmX..."
 *       }
 *     },
 *     "version": "1.0"
 *   }
 * }
 *
 * const result = parseCip25Metadata(metadata)
 * // result: { isValid: true, version: "1.0", assets: [...], errors: [] }
 * ```
 */
export function useCip25Parser() {
  /**
   * Parse CIP-25 metadata from transaction metadata
   *
   * @param metadata - Transaction metadata object
   * @returns Parsed CIP-25 result with assets and validation errors
   */
  const parseCip25Metadata = (metadata: any): Cip25ParseResult => {
    const result: Cip25ParseResult = {
      isValid: true,
      version: '1.0',
      assets: [],
      errors: []
    }

    // Check for 721 label
    if (!metadata['721']) {
      result.isValid = false
      result.errors.push('Missing CIP-25 label: 721')
      return result
    }

    const cip25Data = metadata['721']

    // Extract version (defaults to 1.0)
    if (cip25Data.version) {
      result.version = String(cip25Data.version)
    }

    // Parse each policy
    for (const key in cip25Data) {
      // Skip version field
      if (key === 'version') continue

      const policyId = key
      const policyData = cip25Data[key]

      // Parse each asset under the policy
      for (const assetName in policyData) {
        const assetMetadata = policyData[assetName]

        // Validate required fields
        const validation = validateAssetMetadata(assetMetadata)
        if (!validation.isValid) {
          result.isValid = false
          result.errors.push(...validation.errors)
          continue
        }

        // Add to assets
        result.assets.push({
          policyId,
          assetName,
          metadata: assetMetadata as Cip25AssetMetadata
        })
      }
    }

    return result
  }

  /**
   * Validate asset metadata
   *
   * @param metadata - Asset metadata to validate
   * @returns Validation result
   */
  const validateAssetMetadata = (metadata: any): Cip25ValidationResult => {
    const errors: string[] = []

    // Check required field: name
    if (!metadata.name || typeof metadata.name !== 'string') {
      errors.push('Missing required field: name')
    }

    // Check required field: image
    if (!metadata.image) {
      errors.push('Missing required field: image')
    } else {
      // Image must be a string (URI) or array of strings
      if (typeof metadata.image !== 'string' && !Array.isArray(metadata.image)) {
        errors.push('Invalid image field: must be string or array')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate CIP-25 metadata structure
   *
   * @param metadata - Transaction metadata to validate
   * @returns Validation result
   */
  const validateCip25 = (metadata: any): Cip25ValidationResult => {
    const result = parseCip25Metadata(metadata)

    return {
      isValid: result.isValid,
      errors: result.errors
    }
  }

  /**
   * Extract CIP-25 metadata from CBOR-decoded transaction metadata
   *
   * @param cborMetadata - CBOR-decoded metadata map
   * @returns Parsed CIP-25 result
   */
  const extractCip25FromCbor = (cborMetadata: any): Cip25ParseResult | null => {
    // Check if this is a map with numeric key 721
    if (typeof cborMetadata === 'object' && cborMetadata !== null) {
      // Try string key first (for JSON-like structures)
      if (cborMetadata['721']) {
        return parseCip25Metadata(cborMetadata)
      }

      // Try numeric key (for CBOR maps)
      if (cborMetadata[721]) {
        return parseCip25Metadata({ '721': cborMetadata[721] })
      }
    }

    return null
  }

  return {
    parseCip25Metadata,
    validateCip25,
    validateAssetMetadata,
    extractCip25FromCbor
  }
}
