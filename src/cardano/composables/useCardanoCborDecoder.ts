/**
 * Enhanced Cardano CBOR Decoder with Source Mapping
 * Provides human-readable interpretations and Cardano-specific context
 */

import type { SourceMapEntry, CborValue } from '../../parser/types'
import { useCborParser } from '../../parser/composables/useCborParser'

/**
 * Enhanced source map entry with Cardano context
 */
export interface CardanoSourceMapEntry extends SourceMapEntry {
  /** Human-readable description of this value */
  description: string
  /** Cardano-specific interpretation (if applicable) */
  cardanoType?: string
  /** Byte-by-byte breakdown */
  bytesHex: string
  /** Where the CBOR header ends and content begins (for AST tree view) */
  headerEnd?: number
  /** True if this is a header node (type + length indicator) */
  isHeader?: boolean
  /** True if this is a content node (the actual data) */
  isContent?: boolean
  /** For header nodes, path to the corresponding content node */
  contentPath?: string
}

/**
 * Result with enhanced Cardano-specific source mapping
 */
export interface CardanoParseResult {
  /** Decoded CBOR value */
  value: CborValue
  /** Number of bytes consumed */
  bytesRead: number
  /** Enhanced source map with Cardano context */
  sourceMap: CardanoSourceMapEntry[]
  /** Original hex string for reference */
  originalHex: string
}

/**
 * Composable for Cardano CBOR decoding with enhanced visualization
 */
export function useCardanoCborDecoder() {
  const { parseWithSourceMap } = useCborParser()

  /**
   * Decode CBOR with Cardano-specific interpretations
   */
  const decode = (hexString: string): CardanoParseResult => {
    // Clean hex string
    const cleanHex = hexString.replace(/\s+/g, '')

    // Parse with source map
    const result = parseWithSourceMap(cleanHex)

    // Enhance source map entries with Cardano context
    const enhancedMap: CardanoSourceMapEntry[] = result.sourceMap.map(entry => {
      const bytesHex = cleanHex.substring(entry.start * 2, entry.end * 2)
      const description = generateDescription(entry, result.value)
      const cardanoType = detectCardanoType(entry, result.value)

      return {
        ...entry,
        description,
        cardanoType,
        bytesHex
      }
    })

    return {
      value: result.value,
      bytesRead: result.bytesRead,
      sourceMap: enhancedMap,
      originalHex: cleanHex
    }
  }

  /**
   * Generate human-readable description for a value
   */
  const generateDescription = (entry: SourceMapEntry, rootValue: CborValue): string => {
    // Check if this is a map key (path ends with #key)
    if (entry.path.includes('#key')) {
      const value = getValueAtPath(entry.path, rootValue)
      if (typeof value === 'string') {
        return `map key: "${value}"`
      }
      return `map key: ${value}`
    }

    const value = getValueAtPath(entry.path, rootValue)

    // Handle different types
    if (value === null) return 'null value'
    if (value === undefined) return 'undefined value'
    if (value === true) return 'boolean: true'
    if (value === false) return 'boolean: false'

    if (typeof value === 'number') {
      // Check for float values (non-integers, Infinity, NaN)
      if (!Number.isInteger(value) || !Number.isFinite(value)) {
        return generateFloatDescription(value)
      }
      return generateIntegerDescription(value, entry)
    }

    if (typeof value === 'bigint') {
      return generateIntegerDescription(value, entry)
    }

    if (typeof value === 'string') {
      if (value.length === 0) return 'empty string'
      if (value.length <= 20) return `text: "${value}"`
      return `text: "${value.substring(0, 17)}..." (${value.length} chars)`
    }

    if (value instanceof Uint8Array) {
      return generateByteStringDescription(value)
    }

    if (Array.isArray(value)) {
      return generateArrayDescription(value, entry)
    }

    // Nachos base decodes CBOR maps to real Map instances (preserving integer
    // and non-string key types), so count entries via Map.size here.
    if (value instanceof Map) {
      return `map with ${value.size} entr${value.size === 1 ? 'y' : 'ies'}`
    }

    if (typeof value === 'object' && value !== null) {
      if ('tag' in value && 'value' in value) {
        return generateTagDescription(value as any)
      }
      const keys = Object.keys(value)
      return `map with ${keys.length} entr${keys.length === 1 ? 'y' : 'ies'}`
    }

    return entry.type
  }

  /**
   * Generate description for arrays with element type summary
   */
  const generateArrayDescription = (value: any[], _entry: SourceMapEntry): string => {
    if (value.length === 0) return 'empty array'
    if (value.length === 1) return 'array with 1 element'

    // Analyze element types
    const types = new Set<string>()
    value.forEach(item => {
      if (item === null) types.add('null')
      else if (item === undefined) types.add('undefined')
      else if (typeof item === 'boolean') types.add('bool')
      else if (typeof item === 'number' || typeof item === 'bigint') types.add('int')
      else if (typeof item === 'string') types.add('text')
      else if (item instanceof Uint8Array) types.add('bytes')
      else if (Array.isArray(item)) types.add('array')
      else if (typeof item === 'object') types.add('map')
    })

    const typeList = Array.from(types).join(', ')
    return `array [${value.length}]: ${typeList}`
  }

  /**
   * Generate description for floating-point values
   */
  const generateFloatDescription = (value: number): string => {
    if (Number.isNaN(value)) return 'float: NaN'
    if (value === Infinity) return 'float: Infinity'
    if (value === -Infinity) return 'float: -Infinity'
    if (value === 0 && 1 / value === -Infinity) return 'float: -0.0'
    if (value === 0) return 'float: 0.0'
    return `float: ${value}`
  }

  /**
   * Generate description for integers
   */
  const generateIntegerDescription = (value: number | bigint, _entry: SourceMapEntry): string => {
    const numValue = typeof value === 'bigint' ? value : BigInt(value)

    // Check for common Cardano amounts (lovelace)
    if (numValue === 1000000n) {
      return '1,000,000 lovelace (1 ADA)'
    }
    if (numValue > 1000000n && numValue % 1000000n === 0n) {
      const ada = numValue / 1000000n
      return `${numValue.toLocaleString()} lovelace (${ada} ADA)`
    }
    if (numValue > 1000n) {
      return `${numValue.toLocaleString()} lovelace`
    }

    // Regular integer
    if (numValue < 0n) {
      return `negative integer: ${numValue.toLocaleString()}`
    }
    return `unsigned integer: ${numValue.toLocaleString()}`
  }

  /**
   * Generate description for byte strings
   */
  const generateByteStringDescription = (bytes: Uint8Array): string => {
    // Detect common Cardano sizes
    if (bytes.length === 28) {
      return `${bytes.length} bytes (likely payment key hash)`
    }
    if (bytes.length === 32) {
      return `${bytes.length} bytes (likely tx hash or verification key)`
    }
    if (bytes.length === 57) {
      return `${bytes.length} bytes (likely Shelley address)`
    }
    if (bytes.length === 29) {
      return `${bytes.length} bytes (likely Shelley payment address)`
    }
    if (bytes.length === 64) {
      return `${bytes.length} bytes (likely signature or extended key)`
    }

    // Generic byte string
    if (bytes.length === 0) {
      return 'empty byte string'
    }
    if (bytes.length === 1) {
      return `1 byte: 0x${bytes[0]!.toString(16).padStart(2, '0')}`
    }
    return `byte string (${bytes.length} bytes)`
  }

  /**
   * Generate description for tagged values
   */
  const generateTagDescription = (tagged: { tag: number; value: any }): string => {
    const tagMeanings: { [key: number]: string } = {
      0: 'date/time string',
      1: 'epoch-based date/time',
      2: 'positive bignum',
      3: 'negative bignum',
      4: 'decimal fraction',
      5: 'bigfloat',
      21: 'base64url encoding',
      22: 'base64 encoding',
      23: 'base16 encoding',
      24: 'encoded CBOR data (datum/script)',
      32: 'URI',
      33: 'base64url (no padding)',
      34: 'base64 (no padding)',
      121: 'Cardano: address with network tag',
      122: 'Cardano: witness set',
      258: 'Cardano: set',
      259: 'Cardano: auxiliary data'
    }

    // Special handling for tag 258 (sets) - detect what kind of set
    if (tagged.tag === 258 && Array.isArray(tagged.value)) {
      // Check if this is a set of transaction inputs
      const isTransactionInputSet = tagged.value.every((item: any) =>
        Array.isArray(item) &&
        item.length === 2 &&
        (item[0] instanceof Uint8Array || (Array.isArray(item[0]) && item[0].length === 32)) &&
        typeof item[1] === 'number'
      )

      if (isTransactionInputSet) {
        return `tag 258: Cardano set of ${tagged.value.length} transaction input${tagged.value.length === 1 ? '' : 's'}`
      }

      return `tag 258: Cardano set (${tagged.value.length} element${tagged.value.length === 1 ? '' : 's'})`
    }

    const meaning = tagMeanings[tagged.tag]
    if (meaning) {
      return `tag ${tagged.tag}: ${meaning}`
    }
    return `tag ${tagged.tag}`
  }

  /**
   * Detect Cardano-specific type from context
   */
  const detectCardanoType = (entry: SourceMapEntry, rootValue: CborValue): string | undefined => {
    const value = getValueAtPath(entry.path, rootValue)

    // Check if parent is a tag 258 (set) - get parent value
    const pathParts = entry.path.split(/[\.\[]/)
    let parentPath = ''
    if (pathParts.length > 1) {
      // Build parent path by removing the last segment
      const lastDot = entry.path.lastIndexOf('.')
      const lastBracket = entry.path.lastIndexOf('[')
      const splitIndex = Math.max(lastDot, lastBracket)
      if (splitIndex > 0) {
        parentPath = entry.path.substring(0, splitIndex)
      }
    }
    const parent = parentPath ? getValueAtPath(parentPath, rootValue) : null

    // Detect transaction input array: [hash32, uint] (CDDL: transaction_input)
    if (Array.isArray(value) && value.length === 2) {
      const [first, second] = value
      const isHash32 = first instanceof Uint8Array ? first.length === 32 : (Array.isArray(first) && first.length === 32)
      const isUint = typeof second === 'number' && second >= 0

      if (isHash32 && isUint) {
        // Check if this is in a tag 258 set
        if (parent && typeof parent === 'object' && 'tag' in parent && parent.tag === 258) {
          return 'Transaction Input (CDDL)'
        }
        return 'Transaction Input'
      }
    }

    // Detect transaction input components
    if (entry.path.match(/\.value\[\d+\]\[0\]$/)) {
      if (value instanceof Uint8Array && value.length === 32) {
        return 'Transaction ID (hash32)'
      }
      if (Array.isArray(value) && value.length === 32) {
        return 'Transaction ID (hash32)'
      }
    }

    if (entry.path.match(/\.value\[\d+\]\[1\]$/)) {
      if (typeof value === 'number' && value >= 0) {
        return 'Output Index (uint)'
      }
    }

    // Legacy patterns - address detection
    if (value instanceof Uint8Array) {
      if (value.length === 32) return 'Hash32 (tx id or key)'
      if (value.length === 28) return 'Key Hash (28 bytes)'
      if (value.length === 57) return 'Shelley Address (57 bytes)'
      if (value.length === 29) return 'Payment Address (29 bytes)'
    }

    // Amount detection (only for integers, not floats)
    if (typeof value === 'bigint') {
      if (value >= 1000000n) {
        return 'Amount (lovelace)'
      }
      if (value >= 0n && value < 1000n) {
        return 'Index or Count'
      }
    }
    if (typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value)) {
      const numValue = BigInt(value)
      if (numValue >= 1000000n) {
        return 'Amount (lovelace)'
      }
      if (numValue >= 0n && numValue < 1000n) {
        return 'Index or Count'
      }
    }

    return undefined
  }

  /**
   * Get value at a specific path in the parsed structure
   */
  const getValueAtPath = (path: string, rootValue: CborValue): any => {
    if (!path) return rootValue

    let current: any = rootValue

    // Check if this is a map key path (e.g., "#key0" or "parent.#key1")
    const keyMatch = path.match(/^(.*?)#key(\d+)$/)
    if (keyMatch) {
      const [, parentPath, keyIndex] = keyMatch

      // Navigate to the parent object
      if (parentPath) {
        current = getValueAtPath(parentPath, rootValue)
      }

      // Get the key at the specified index. Nachos base decodes maps to real
      // Map instances, so read keys from Map iteration order when applicable.
      if (current instanceof Map) {
        const keys = Array.from(current.keys())
        const index = parseInt(keyIndex!)
        if (index < keys.length) {
          return keys[index]
        }
        return undefined
      }
      if (typeof current === 'object' && current !== null) {
        const keys = Object.keys(current)
        const index = parseInt(keyIndex!)
        if (index < keys.length) {
          return keys[index]
        }
      }
      return undefined
    }

    // Split path by dots and array brackets
    // Handle both 'key', '.key', '[0]', 'key[0]', 'key.subkey' formats
    const parts = path.match(/\[(\d+)\]|\.?([^.\[#]+)/g) || []

    for (const part of parts) {
      if (part.startsWith('[')) {
        // Array index: [0]
        const index = parseInt(part.slice(1, -1))
        if (Array.isArray(current)) {
          current = current[index]
        } else {
          return undefined
        }
      } else {
        // Object key: .key or key
        const key = part.startsWith('.') ? part.slice(1) : part
        if (current instanceof Map) {
          // Nachos base decodes maps to real Map instances. Path segments are
          // strings; try the string key first, then fall back to a numeric key
          // (Cardano transaction bodies use integer keys 0-22).
          if (current.has(key)) {
            current = current.get(key)
          } else {
            const numKey = Number(key)
            current = !Number.isNaN(numKey) && current.has(numKey)
              ? current.get(numKey)
              : undefined
          }
        } else if (typeof current === 'object' && current !== null) {
          current = current[key]
        } else {
          return undefined
        }
      }
    }

    return current
  }

  /**
   * Format hex string with spaces every 2 characters
   */
  const formatHex = (hex: string): string => {
    return hex.match(/.{1,2}/g)?.join(' ') || hex
  }

  /**
   * Get byte-by-byte breakdown for a source map entry
   * @param entry - The source map entry to break down
   * @param allEntries - Optional: all source map entries (to look up related content)
   */
  const getByteBreakdown = (entry: CardanoSourceMapEntry, allEntries?: CardanoSourceMapEntry[]): Array<{ byte: string; description: string }> => {
    const bytes = entry.bytesHex?.match(/.{1,2}/g) || []
    const breakdown: Array<{ byte: string; description: string }> = []

    if (bytes.length === 0) return breakdown

    // Check if this is a content-only entry (no CBOR header, just data bytes)
    // Content entries have isContent: true and the path ends with #content
    if (entry.isContent) {
      // Determine the content type from the parent entry's type or from the path
      const isTextContent = entry.type?.startsWith('→ "') || entry.path.includes('#content')

      // For text content, try to decode as string first
      if (isTextContent) {
        let fullDecodedString = ''
        try {
          const byteArray = new Uint8Array(bytes.map(b => parseInt(b, 16)))
          fullDecodedString = new TextDecoder('utf-8').decode(byteArray)
        } catch {
          fullDecodedString = bytes.map(b => {
            const charCode = parseInt(b, 16)
            return charCode >= 0x20 && charCode <= 0x7E ? String.fromCharCode(charCode) : '?'
          }).join('')
        }

        // Add summary line for the full decoded text
        if (bytes.length > 0) {
          const displayString = fullDecodedString.length > 50
            ? fullDecodedString.substring(0, 47) + '...'
            : fullDecodedString
          breakdown.push({
            byte: '>>',
            description: `Decoded text: "${displayString}"`
          })
        }

        // Then show individual character bytes
        for (let i = 0; i < bytes.length; i++) {
          const byteValue = parseInt(bytes[i]!, 16)
          const char = String.fromCharCode(byteValue)
          const displayChar = char.match(/[\x20-\x7E]/) ? char : `\\x${bytes[i]}`
          breakdown.push({
            byte: bytes[i]!,
            description: `'${displayChar}' (0x${bytes[i]}) - char ${i + 1}`
          })
        }
      } else {
        // For byte string content, show as data bytes
        const isPrintable = bytes.every(b => {
          const val = parseInt(b, 16)
          return val >= 0x20 && val <= 0x7E
        })

        if (isPrintable && bytes.length > 1) {
          const decodedText = bytes.map(b => String.fromCharCode(parseInt(b, 16))).join('')
          breakdown.push({
            byte: '>>',
            description: `As ASCII: "${decodedText}"`
          })
        }

        for (let i = 0; i < bytes.length; i++) {
          const byteValue = parseInt(bytes[i]!, 16)
          const charRepr = byteValue >= 0x20 && byteValue <= 0x7E
            ? ` '${String.fromCharCode(byteValue)}'`
            : ''
          breakdown.push({
            byte: bytes[i]!,
            description: `Data byte ${i + 1}: ${byteValue} (0x${bytes[i]})${charRepr}`
          })
        }
      }

      return breakdown
    }

    // For header entries: First byte is the CBOR header
    const initialByte = parseInt(bytes[0]!, 16)
    const majorType = (initialByte >> 5) & 0x07
    const additionalInfo = initialByte & 0x1f

    // Get human-readable major type name
    const majorTypeNames: Record<number, string> = {
      0: 'Unsigned Int',
      1: 'Negative Int',
      2: 'Byte String',
      3: 'Text String',
      4: 'Array',
      5: 'Map',
      6: 'Tag',
      7: 'Float/Simple'
    }

    const mtName = majorTypeNames[majorType] || 'Unknown'

    // Explain the additional info
    let aiExplanation = ''
    if (additionalInfo < 24) {
      if (majorType === 4) {
        aiExplanation = ` (${additionalInfo} elements)`
      } else if (majorType === 5) {
        aiExplanation = ` (${additionalInfo} pairs)`
      } else if (majorType === 2 || majorType === 3) {
        aiExplanation = ` (${additionalInfo} bytes)`
      } else {
        aiExplanation = ` (value: ${additionalInfo})`
      }
    } else if (additionalInfo === 24) {
      aiExplanation = ' (1-byte length follows)'
    } else if (additionalInfo === 25) {
      aiExplanation = ' (2-byte length follows)'
    } else if (additionalInfo === 26) {
      aiExplanation = ' (4-byte length follows)'
    } else if (additionalInfo === 27) {
      aiExplanation = ' (8-byte length follows)'
    } else if (additionalInfo === 31) {
      aiExplanation = ' (indefinite length)'
    }

    breakdown.push({
      byte: bytes[0]!,
      description: `CBOR header: Major Type=${majorType} (${mtName}), Additional Info=${additionalInfo}${aiExplanation}`
    })

    // Determine how many bytes are used for length encoding
    let lengthBytes = 0
    let dataStartIndex = 1

    if (additionalInfo >= 24 && additionalInfo <= 27) {
      lengthBytes = 1 << (additionalInfo - 24) // 24→1, 25→2, 26→4, 27→8
      dataStartIndex = 1 + lengthBytes

      // Show length bytes
      for (let i = 1; i <= lengthBytes; i++) {
        breakdown.push({
          byte: bytes[i]!,
          description: `Length byte ${i}`
        })
      }
    }

    // For header entries of text/byte strings, look up content from sibling #content entry
    // This allows showing "Decoded text: ..." when clicking on the header byte
    if (entry.isHeader && (majorType === 2 || majorType === 3) && allEntries) {
      const contentPath = entry.path ? `${entry.path}#content` : '#content'
      const contentEntry = allEntries.find(e => e.path === contentPath)
      if (contentEntry?.bytesHex) {
        const contentHexBytes = contentEntry.bytesHex.match(/.{1,2}/g) || []
        if (contentHexBytes.length > 0) {
          if (majorType === 3) {
            // Text string - decode as UTF-8
            try {
              const byteArray = new Uint8Array(contentHexBytes.map(b => parseInt(b, 16)))
              const fullDecodedString = new TextDecoder('utf-8').decode(byteArray)
              const displayString = fullDecodedString.length > 50
                ? fullDecodedString.substring(0, 47) + '...'
                : fullDecodedString
              breakdown.push({
                byte: '>>',
                description: `Decoded text: "${displayString}"`
              })
            } catch {
              // Fallback to ASCII
              const decodedText = contentHexBytes.map(b => {
                const charCode = parseInt(b, 16)
                return charCode >= 0x20 && charCode <= 0x7E ? String.fromCharCode(charCode) : '?'
              }).join('')
              breakdown.push({
                byte: '>>',
                description: `Decoded text: "${decodedText}"`
              })
            }
          } else {
            // Byte string - show as hex or ASCII if printable
            const isPrintable = contentHexBytes.every(b => {
              const val = parseInt(b, 16)
              return val >= 0x20 && val <= 0x7E
            })
            if (isPrintable) {
              const decodedText = contentHexBytes.map(b => String.fromCharCode(parseInt(b, 16))).join('')
              breakdown.push({
                byte: '>>',
                description: `As ASCII: "${decodedText}"`
              })
            }
          }
        }
      }
      return breakdown
    }

    // For text strings (MT=3), decode each byte as a character and show full decoded string
    if (majorType === 3) {
      // First, try to decode the full string
      const contentBytes = bytes.slice(dataStartIndex)
      let fullDecodedString = ''
      try {
        const byteArray = new Uint8Array(contentBytes.map(b => parseInt(b, 16)))
        fullDecodedString = new TextDecoder('utf-8').decode(byteArray)
      } catch {
        // If decoding fails, build string from individual chars
        fullDecodedString = contentBytes.map(b => {
          const charCode = parseInt(b, 16)
          return charCode >= 0x20 && charCode <= 0x7E ? String.fromCharCode(charCode) : '?'
        }).join('')
      }

      // Add a summary line showing the full decoded text if there are multiple bytes
      if (contentBytes.length > 1) {
        const displayString = fullDecodedString.length > 50
          ? fullDecodedString.substring(0, 47) + '...'
          : fullDecodedString
        breakdown.push({
          byte: '>>',
          description: `Decoded text: "${displayString}"`
        })
      }

      // Then show individual bytes
      for (let i = dataStartIndex; i < bytes.length; i++) {
        const byteValue = parseInt(bytes[i]!, 16)
        const char = String.fromCharCode(byteValue)
        const displayChar = char.match(/[\x20-\x7E]/) ? char : `\\x${bytes[i]}`
        breakdown.push({
          byte: bytes[i]!,
          description: `'${displayChar}' (0x${bytes[i]}) - char ${i - dataStartIndex + 1}`
        })
      }
    } else if (majorType === 2) {
      // For byte strings (MT=2), try to detect if it might be printable text
      const contentBytes = bytes.slice(dataStartIndex)

      // Check if all bytes are printable ASCII
      const isPrintable = contentBytes.every(b => {
        const val = parseInt(b, 16)
        return val >= 0x20 && val <= 0x7E
      })

      if (isPrintable && contentBytes.length > 1) {
        const decodedText = contentBytes.map(b => String.fromCharCode(parseInt(b, 16))).join('')
        const displayString = decodedText.length > 50
          ? decodedText.substring(0, 47) + '...'
          : decodedText
        breakdown.push({
          byte: '>>',
          description: `As ASCII: "${displayString}"`
        })
      }

      // Show individual bytes with hex and decimal values
      for (let i = dataStartIndex; i < bytes.length; i++) {
        const byteValue = parseInt(bytes[i]!, 16)
        const charRepr = byteValue >= 0x20 && byteValue <= 0x7E
          ? ` '${String.fromCharCode(byteValue)}'`
          : ''
        breakdown.push({
          byte: bytes[i]!,
          description: `Data byte ${i - dataStartIndex + 1}: ${byteValue}${charRepr}`
        })
      }
    } else {
      // For other types, show data bytes with their decimal values
      for (let i = dataStartIndex; i < bytes.length; i++) {
        const byteValue = parseInt(bytes[i]!, 16)
        breakdown.push({
          byte: bytes[i]!,
          description: `Data byte ${i - dataStartIndex + 1}: ${byteValue} (0x${bytes[i]})`
        })
      }
    }

    return breakdown
  }

  return {
    decode,
    formatHex,
    getByteBreakdown
  }
}
