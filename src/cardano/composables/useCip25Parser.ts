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
 *
 * IMPORTANT: The Nachos base decoder returns CBOR maps as real `Map`
 * instances (with the metadata label as the integer key 721, policy IDs /
 * asset names potentially as byte strings in CIP-25 version 2). This parser
 * is therefore Map-aware at every level, while still accepting plain objects
 * (JSON-shaped metadata) for backward compatibility.
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
  /** Non-fatal issues (e.g. suspicious mediaType values) */
  warnings: string[]
}

/**
 * CIP-25 validation result
 */
export interface Cip25ValidationResult {
  isValid: boolean
  errors: string[]
  /** Non-fatal issues (e.g. suspicious mediaType values) */
  warnings: string[]
}

/** Lenient MIME-type shape check: "type/subtype" with reasonable characters */
const MIME_TYPE_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9!#$&^_.+-]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&^_.+;=-]*$/

/**
 * CIP-25 NFT Metadata Parser Composable
 *
 * Provides functions to parse and validate Cardano NFT metadata. Accepts
 * both decoder output (Map instances, integer label 721, byte-string keys)
 * and plain JSON-shaped objects.
 *
 * @example
 * ```ts
 * const { parseCip25Metadata, extractCip25FromCbor } = useCip25Parser()
 *
 * // Directly from the CBOR decoder:
 * const decoded = decode(metadataHex).value
 * const result = extractCip25FromCbor(decoded)
 * // result: { isValid: true, version: "1.0", assets: [...], errors: [], warnings: [] }
 * ```
 */
export function useCip25Parser() {
  /** True for container values we can treat as a CIP-25 map level */
  const isMapLike = (value: unknown): boolean => {
    return value instanceof Map ||
      (typeof value === 'object' && value !== null &&
        !Array.isArray(value) && !(value instanceof Uint8Array))
  }

  /** Extract the wrapped string from a CborTextString, else null */
  const textStringOf = (value: unknown): string | null => {
    if (typeof value === 'string') return value
    if (value && typeof value === 'object' && (value as any).type === 'cbor-text-string') {
      return (value as any).text as string
    }
    return null
  }

  /** Extract raw bytes from a Uint8Array or CborByteString, else null */
  const byteStringOf = (value: unknown): Uint8Array | null => {
    if (value instanceof Uint8Array) return value
    if (value && typeof value === 'object' && (value as any).type === 'cbor-byte-string') {
      return (value as any).bytes as Uint8Array
    }
    return null
  }

  const bytesToHex = (bytes: Uint8Array): string =>
    Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

  /** True when every byte is printable ASCII */
  const isPrintableAscii = (bytes: Uint8Array): boolean =>
    bytes.length > 0 && bytes.every(b => b >= 0x20 && b <= 0x7e)

  /**
   * Convert a map key from decoder output to a display string.
   * - text strings pass through
   * - numbers/bigints are stringified
   * - byte strings (CIP-25 v2 policy IDs / asset names) become UTF-8 when
   *   printable, hex otherwise
   */
  const keyToString = (key: unknown): string => {
    const text = textStringOf(key)
    if (text !== null) return text
    const bytes = byteStringOf(key)
    if (bytes !== null) {
      if (isPrintableAscii(bytes)) {
        return new TextDecoder('utf-8').decode(bytes)
      }
      return bytesToHex(bytes)
    }
    return String(key)
  }

  /** Get an entry from a Map (string OR numeric key) or plain object */
  const getEntry = (container: unknown, key: string | number): unknown => {
    if (container instanceof Map) {
      if (container.has(key)) return container.get(key)
      // Try the alternate representation (numeric 721 vs string '721')
      const altKey = typeof key === 'number' ? String(key) : Number(key)
      if (!Number.isNaN(altKey) && container.has(altKey)) return container.get(altKey)
      // Text-string wrapper keys
      for (const [k, v] of container.entries()) {
        if (keyToString(k) === String(key)) return v
      }
      return undefined
    }
    if (typeof container === 'object' && container !== null) {
      return (container as Record<string, unknown>)[String(key)]
    }
    return undefined
  }

  /** Iterate [key, value] pairs of a Map or plain object */
  const entriesOf = (container: unknown): Array<[unknown, unknown]> => {
    if (container instanceof Map) {
      return Array.from(container.entries())
    }
    if (typeof container === 'object' && container !== null) {
      return Object.entries(container as Record<string, unknown>)
    }
    return []
  }

  /**
   * Deep-normalize decoder output into plain JS shapes:
   * Map → object (keys via keyToString), CborTextString → string,
   * CborByteString → Uint8Array, arrays normalized element-wise.
   */
  const normalizeValue = (value: unknown): any => {
    const text = textStringOf(value)
    if (text !== null) return text
    if (value instanceof Uint8Array) return value
    const bytes = byteStringOf(value)
    if (bytes !== null) return bytes
    if (Array.isArray(value)) {
      return value.map(normalizeValue)
    }
    if (value instanceof Map) {
      const obj: Record<string, unknown> = {}
      for (const [k, v] of value.entries()) {
        obj[keyToString(k)] = normalizeValue(v)
      }
      return obj
    }
    if (typeof value === 'object' && value !== null && !('tag' in (value as object))) {
      const obj: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        obj[k] = normalizeValue(v)
      }
      return obj
    }
    return value
  }

  /**
   * Parse CIP-25 metadata from transaction metadata
   *
   * Accepts decoder output (Map with integer key 721) as well as plain
   * objects with a "721" property.
   *
   * @param metadata - Transaction metadata (Map or object)
   * @returns Parsed CIP-25 result with assets, errors, and warnings
   */
  const parseCip25Metadata = (metadata: any): Cip25ParseResult => {
    const result: Cip25ParseResult = {
      isValid: true,
      version: '1.0',
      assets: [],
      errors: [],
      warnings: []
    }

    // Check for 721 label (numeric key from CBOR decode, string key from JSON)
    const cip25Data = getEntry(metadata, 721)
    if (cip25Data === undefined || cip25Data === null || !isMapLike(cip25Data)) {
      result.isValid = false
      result.errors.push('Missing CIP-25 label: 721')
      return result
    }

    // Extract version (defaults to 1.0)
    const version = getEntry(cip25Data, 'version')
    if (version !== undefined && version !== null) {
      result.version = String(normalizeValue(version))
    }

    // Parse each policy
    for (const [rawPolicyKey, policyData] of entriesOf(cip25Data)) {
      const policyKeyString = keyToString(rawPolicyKey)

      // Skip version field
      if (policyKeyString === 'version') continue

      // Policy IDs are 28-byte hashes: byte-string keys render as hex
      const policyBytes = byteStringOf(rawPolicyKey)
      const policyId = policyBytes !== null ? bytesToHex(policyBytes) : policyKeyString

      if (!isMapLike(policyData)) {
        result.isValid = false
        result.errors.push(`Invalid policy entry for policy ${policyId}: expected a map of assets`)
        continue
      }

      // Parse each asset under the policy
      for (const [rawAssetKey, rawAssetMetadata] of entriesOf(policyData)) {
        const assetName = keyToString(rawAssetKey)
        const assetMetadata = normalizeValue(rawAssetMetadata) as Cip25AssetMetadata

        // Validate required fields
        const validation = validateAssetMetadata(assetMetadata)
        result.warnings.push(...validation.warnings)
        if (!validation.isValid) {
          result.isValid = false
          result.errors.push(...validation.errors)
          continue
        }

        // Add to assets
        result.assets.push({
          policyId,
          assetName,
          metadata: assetMetadata
        })
      }
    }

    return result
  }

  /**
   * Validate asset metadata (after normalization to plain objects)
   *
   * @param metadata - Asset metadata to validate
   * @returns Validation result with errors and warnings
   */
  const validateAssetMetadata = (metadata: any): Cip25ValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []

    if (!isMapLike(metadata)) {
      return {
        isValid: false,
        errors: ['Invalid asset metadata: expected a map'],
        warnings
      }
    }

    const name = getEntry(metadata, 'name')
    const image = getEntry(metadata, 'image')
    const mediaType = getEntry(metadata, 'mediaType')
    const files = getEntry(metadata, 'files')

    // Check required field: name
    if (!name || typeof textStringOf(name) !== 'string') {
      errors.push('Missing required field: name')
    }

    // Check required field: image
    if (!image) {
      errors.push('Missing required field: image')
    } else {
      // Image must be a string (URI) or array of strings
      if (textStringOf(image) === null && !Array.isArray(image)) {
        errors.push('Invalid image field: must be string or array')
      }
    }

    // mediaType: must look like a MIME type (lenient check → warning only)
    if (mediaType !== undefined && mediaType !== null) {
      const mediaTypeStr = textStringOf(mediaType)
      if (mediaTypeStr === null) {
        warnings.push(`mediaType should be a string, got ${typeof mediaType}`)
      } else if (!MIME_TYPE_REGEX.test(mediaTypeStr)) {
        warnings.push(`mediaType "${mediaTypeStr}" does not look like a MIME type (expected "type/subtype")`)
      }
    }

    // files[].mediaType: same lenient MIME check (warning only)
    if (Array.isArray(files)) {
      files.forEach((file, index) => {
        if (!isMapLike(file)) return
        const fileMediaType = getEntry(file, 'mediaType')
        if (fileMediaType === undefined || fileMediaType === null) {
          warnings.push(`files[${index}] is missing mediaType`)
          return
        }
        const fileMediaTypeStr = textStringOf(fileMediaType)
        if (fileMediaTypeStr === null) {
          warnings.push(`files[${index}].mediaType should be a string, got ${typeof fileMediaType}`)
        } else if (!MIME_TYPE_REGEX.test(fileMediaTypeStr)) {
          warnings.push(`files[${index}].mediaType "${fileMediaTypeStr}" does not look like a MIME type (expected "type/subtype")`)
        }
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
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
      errors: result.errors,
      warnings: result.warnings
    }
  }

  /**
   * Extract CIP-25 metadata from CBOR-decoded transaction metadata
   *
   * Works directly against decoder output: `extractCip25FromCbor(decode(hex).value)`.
   * Supports Map instances with numeric key 721 (the CBOR reality), Maps with
   * string key '721', and plain objects (backward compatibility).
   *
   * @param cborMetadata - CBOR-decoded metadata (Map or object)
   * @returns Parsed CIP-25 result, or null when no 721 label is present
   */
  const extractCip25FromCbor = (cborMetadata: any): Cip25ParseResult | null => {
    if (!isMapLike(cborMetadata)) {
      return null
    }

    const cip25Data = getEntry(cborMetadata, 721)
    if (cip25Data === undefined || cip25Data === null) {
      return null
    }

    return parseCip25Metadata(cborMetadata)
  }

  return {
    parseCip25Metadata,
    validateCip25,
    validateAssetMetadata,
    extractCip25FromCbor
  }
}
