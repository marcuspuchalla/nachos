/**
 * CBOR Main Parser Composable
 * Orchestrates all CBOR parsers and provides a unified parse interface
 * Auto-detects major type and dispatches to appropriate parser
 */

import type { ParseResult, ParseResultWithMap, SourceMapEntry, ParseOptions, CborContext, CborValue, TaggedValue } from '../types'
import { DEFAULT_OPTIONS, DEFAULT_LIMITS } from '../types'
import { hexToBytes, readByte, readUint, readBigUint, extractCborHeader, serializeValueForComparison, validateCanonicalInteger } from '../utils'
import { useCborInteger } from './useCborInteger'
import { useCborString } from './useCborString'
import { useCborCollection } from './useCborCollection'
import { useCborTag } from './useCborTag'
import { useCborFloat } from './useCborFloat'
import { logger } from '../../utils/logger'

/**
 * Main CBOR parser composable
 * Provides a unified interface for parsing any CBOR data
 *
 * @returns Object with parse function
 *
 * @example
 * ```ts
 * const { parse } = useCborParser()
 * const result = parse('1864') // { value: 100, bytesRead: 2 }
 * ```
 */
export function useCborParser() {
  /**
   * Merges user options with defaults
   */
  const mergeOptions = (options?: ParseOptions): Required<ParseOptions> => {
    if (!options) return DEFAULT_OPTIONS

    // Determine if canonical validation is enabled
    const isCanonical = options.validateCanonical ?? (options.strict ? true : false)

    return {
      strict: options.strict ?? DEFAULT_OPTIONS.strict,
      validateCanonical: isCanonical,
      // RFC 8949 Section 4.2: Deterministic encoding MUST NOT use indefinite-length
      allowIndefinite: options.allowIndefinite ?? (isCanonical || options.strict ? false : DEFAULT_OPTIONS.allowIndefinite),
      // Auto-enable duplicate key rejection for canonical or strict mode
      dupMapKeyMode: options.dupMapKeyMode ?? (isCanonical || options.strict ? 'reject' : DEFAULT_OPTIONS.dupMapKeyMode),
      validateUtf8Strict: options.validateUtf8Strict ?? (options.strict ? true : DEFAULT_OPTIONS.validateUtf8Strict),
      validateSetUniqueness: options.validateSetUniqueness ?? (options.strict ? true : DEFAULT_OPTIONS.validateSetUniqueness),
      validateTagSemantics: options.validateTagSemantics ?? (options.strict ? true : DEFAULT_OPTIONS.validateTagSemantics),
      validatePlutusSemantics: options.validatePlutusSemantics ?? (options.strict ? true : DEFAULT_OPTIONS.validatePlutusSemantics),
      mapKeyOrder: options.mapKeyOrder ?? DEFAULT_OPTIONS.mapKeyOrder,
      // Strict mode rejects trailing data after the top-level item (well-formedness).
      allowTrailingData: options.allowTrailingData ?? (options.strict ? false : DEFAULT_OPTIONS.allowTrailingData),
      limits: {
        maxInputSize: options.limits?.maxInputSize ?? DEFAULT_LIMITS.maxInputSize,
        maxOutputSize: options.limits?.maxOutputSize ?? DEFAULT_LIMITS.maxOutputSize,
        maxStringLength: options.limits?.maxStringLength ?? DEFAULT_LIMITS.maxStringLength,
        maxArrayLength: options.limits?.maxArrayLength ?? DEFAULT_LIMITS.maxArrayLength,
        maxMapSize: options.limits?.maxMapSize ?? DEFAULT_LIMITS.maxMapSize,
        maxDepth: options.limits?.maxDepth ?? DEFAULT_LIMITS.maxDepth,
        maxTagDepth: options.limits?.maxTagDepth ?? DEFAULT_LIMITS.maxTagDepth,
        maxBignumBytes: options.limits?.maxBignumBytes ?? DEFAULT_LIMITS.maxBignumBytes,
        maxParseTime: options.limits?.maxParseTime ?? DEFAULT_LIMITS.maxParseTime
      }
    }
  }

  /**
   * Checks if max parse time has been exceeded
   */
  const checkTimeout = (ctx: CborContext): void => {
    if (!ctx.startTime || !ctx.options?.limits?.maxParseTime) return

    const elapsed = Date.now() - ctx.startTime
    if (elapsed > ctx.options.limits.maxParseTime) {
      throw new Error(`Parse timeout: exceeded ${ctx.options.limits.maxParseTime}ms limit (elapsed: ${elapsed}ms)`)
    }
  }

  const { parseInteger, parseIntegerFromBuffer: integerFromBuffer } = useCborInteger()
  const { parseString, parseByteString: byteStringFromBuffer, parseTextString: textStringFromBuffer } = useCborString()
  const { parseArray, parseMap } = useCborCollection()
  const { parseTag, validateTagSemantics, decodePlutusConstructor } = useCborTag()
  const { parse: parseFloatOrSimple, parseFromBuffer: floatOrSimpleFromBuffer } = useCborFloat()

  /**
   * Parses a CBOR hex string, auto-detecting the type
   *
   * @param hexString - CBOR data as hex string
   * @param options - Parser options (optional)
   * @returns Parsed value and bytes read
   *
   * @example
   * ```ts
   * parse('00')              // 0
   * parse('6449455446')      // "IETF"
   * parse('83010203')        // [1, 2, 3]
   * parse('a16161 01')       // { a: 1 }
   * parse('c11a514b67b0')    // { tag: 1, value: 1363896240 }
   * parse('f5')              // true
   *
   * // With options
   * parse('1864', { validateCanonical: true })
   * parse('6449455446', { strict: true })
   * ```
   */
  const parse = (input: string | Uint8Array, options?: ParseOptions): ParseResult => {
    // Merge options with defaults
    const mergedOptions = mergeOptions(options)

    // Uint8Array fast path: skip hex conversion entirely
    if (input instanceof Uint8Array) {
      if (input.length === 0) {
        throw new Error('Empty input')
      }

      // Check input size limit
      if (mergedOptions.limits?.maxInputSize && input.length > mergedOptions.limits.maxInputSize) {
        throw new Error(`Input size ${input.length} bytes exceeds limit of ${mergedOptions.limits.maxInputSize} bytes`)
      }

      const bufResult = dispatchFromBuffer(input, 0, mergedOptions)
      checkTrailingData(bufResult.bytesRead, input.length, mergedOptions)
      return bufResult
    }

    // Hex string path
    const cleanHex = input.replace(/\s+/g, '')

    // Validate hex string
    if (!cleanHex || cleanHex.length === 0) {
      throw new Error('Empty hex string')
    }

    if (cleanHex.length % 2 !== 0) {
      throw new Error('Hex string must have even length')
    }

    if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
      throw new Error(`Invalid hex character in: ${cleanHex}`)
    }

    // Check input size limit
    const inputSize = cleanHex.length / 2 // Convert hex chars to bytes
    if (mergedOptions.limits?.maxInputSize && inputSize > mergedOptions.limits.maxInputSize) {
      throw new Error(`Input size ${inputSize} bytes exceeds limit of ${mergedOptions.limits.maxInputSize} bytes`)
    }

    // Convert to buffer and extract major type
    const buffer = hexToBytes(cleanHex)
    const initialByte = readByte(buffer, 0)
    const { majorType } = extractCborHeader(initialByte)

    // Dispatch to appropriate parser based on major type
    let result: ParseResult
    switch (majorType) {
      case 0: // Unsigned integer
      case 1: // Negative integer
        result = parseInteger(cleanHex, mergedOptions)
        break

      case 2: // Byte string
      case 3: // Text string
        result = parseString(cleanHex, mergedOptions)
        break

      case 4: // Array
        result = parseArray(cleanHex, mergedOptions)
        break

      case 5: // Map
        result = parseMap(cleanHex, mergedOptions)
        break

      case 6: // Tagged value
        result = parseTag(cleanHex, mergedOptions)
        break

      case 7: // Floating-point or simple value
        result = parseFloatOrSimple(cleanHex, mergedOptions)
        break

      default:
        throw new Error(`Unknown major type: ${majorType}`)
    }

    checkTrailingData(result.bytesRead, buffer.length, mergedOptions)
    return result
  }

  /**
   * Rejects trailing bytes after the top-level data item when
   * allowTrailingData is false (RFC 8949 well-formedness for a single item).
   */
  const checkTrailingData = (
    bytesRead: number,
    totalLength: number,
    opts: Required<ParseOptions>
  ): void => {
    if (!opts.allowTrailingData && bytesRead < totalLength) {
      throw new Error(
        `Trailing data: ${totalLength - bytesRead} byte(s) remain after the top-level CBOR item ` +
        `(bytesRead=${bytesRead}, length=${totalLength}). Use parseSequence to decode multiple items.`
      )
    }
  }

  /**
   * Parses CBOR with source map generation for visualization
   *
   * @param hexString - CBOR data as hex string
   * @param options - Parser options (optional)
   * @returns Parsed value, bytes read, and source map
   */
  const parseWithSourceMap = (input: string | Uint8Array, options?: ParseOptions): ParseResultWithMap => {
    // Merge options with defaults
    const mergedOptions = mergeOptions(options)

    let buffer: Uint8Array

    if (input instanceof Uint8Array) {
      if (input.length === 0) {
        throw new Error('Empty input')
      }

      // Check input size limit
      if (mergedOptions.limits?.maxInputSize && input.length > mergedOptions.limits.maxInputSize) {
        throw new Error(`Input size ${input.length} bytes exceeds limit of ${mergedOptions.limits.maxInputSize} bytes`)
      }

      buffer = input
    } else {
      const cleanHex = input.replace(/\s+/g, '')

      // Validate hex string
      if (!cleanHex || cleanHex.length === 0) {
        throw new Error('Empty hex string')
      }
      if (cleanHex.length % 2 !== 0) {
        throw new Error('Hex string must have even length')
      }
      if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
        throw new Error(`Invalid hex character in: ${cleanHex}`)
      }

      // Check input size limit
      const inputSize = cleanHex.length / 2
      if (mergedOptions.limits?.maxInputSize && inputSize > mergedOptions.limits.maxInputSize) {
        throw new Error(`Input size ${inputSize} bytes exceeds limit of ${mergedOptions.limits.maxInputSize} bytes`)
      }

      buffer = hexToBytes(cleanHex)
    }

    const sourceMap: SourceMapEntry[] = []

    // Create context with tracking
    const ctx: CborContext = {
      buffer,
      offset: 0,
      sourceMap,
      currentDepth: 0,
      startTime: Date.now(),
      bytesAllocated: 0,
      options: mergedOptions
    }

    // Parse with source map tracking
    const result = parseValueWithMap(ctx, 0, '', sourceMap)

    return {
      value: result.value,
      bytesRead: result.bytesRead,
      sourceMap
    }
  }

  /**
   * Internal recursive parser that builds source map
   */
  const parseValueWithMap = (
    ctx: CborContext,
    offset: number,
    path: string,
    sourceMap: SourceMapEntry[]
  ): ParseResult => {
    // Check timeout periodically
    checkTimeout(ctx)

    const initialByte = readByte(ctx.buffer, offset)
    const { majorType, additionalInfo } = extractCborHeader(initialByte)
    const startOffset = offset

    let result: ParseResult
    let typeDescription: string

    switch (majorType) {
      case 0: // Unsigned integer
        typeDescription = 'Unsigned Integer'
        result = parseIntegerFromBuffer(ctx.buffer, offset, ctx.options)
        // Add entry for simple values
        sourceMap.push({
          path,
          start: startOffset,
          end: startOffset + result.bytesRead,
          majorType,
          type: typeDescription
        })
        break

      case 1: // Negative integer
        typeDescription = 'Negative Integer'
        result = parseIntegerFromBuffer(ctx.buffer, offset, ctx.options)
        sourceMap.push({
          path,
          start: startOffset,
          end: startOffset + result.bytesRead,
          majorType,
          type: typeDescription
        })
        break

      case 2: // Byte string
        {
          result = parseStringFromBuffer(ctx.buffer, offset, ctx.options)
          // Track bytes allocated
          if (ctx.bytesAllocated !== undefined && result.value instanceof Uint8Array) {
            ctx.bytesAllocated += result.value.length
            if (ctx.options?.limits?.maxOutputSize && ctx.bytesAllocated > ctx.options.limits.maxOutputSize) {
              throw new Error(`Output size ${ctx.bytesAllocated} bytes exceeds limit of ${ctx.options.limits.maxOutputSize} bytes`)
            }
          }

          // Calculate header length (type byte + length encoding)
          const headerBytes = additionalInfo < 24 ? 1 :
                             additionalInfo === 24 ? 2 :
                             additionalInfo === 25 ? 3 :
                             additionalInfo === 26 ? 5 :
                             additionalInfo === 27 ? 9 : 1
          const headerEnd = startOffset + headerBytes
          const contentLength = result.value instanceof Uint8Array ? result.value.length : 0

          // Add header entry
          typeDescription = `bytes(${contentLength})`
          sourceMap.push({
            path,
            start: startOffset,
            end: headerEnd,
            majorType,
            type: typeDescription,
            isHeader: true,
            headerEnd,
            contentPath: contentLength > 0 ? `${path}#content` : undefined,
            children: contentLength > 0 ? [`${path}#content`] : []
          })

          // Add content entry (if non-empty)
          if (contentLength > 0) {
            sourceMap.push({
              path: `${path}#content`,
              start: headerEnd,
              end: startOffset + result.bytesRead,
              majorType: 2,
              type: `→ ${contentLength} bytes`,
              isContent: true,
              parent: path
            })
          }
        }
        break

      case 3: // Text string
        {
          result = parseStringFromBuffer(ctx.buffer, offset, ctx.options)
          // Track bytes allocated
          if (ctx.bytesAllocated !== undefined && typeof result.value === 'string') {
            ctx.bytesAllocated += result.value.length
            if (ctx.options?.limits?.maxOutputSize && ctx.bytesAllocated > ctx.options.limits.maxOutputSize) {
              throw new Error(`Output size ${ctx.bytesAllocated} bytes exceeds limit of ${ctx.options.limits.maxOutputSize} bytes`)
            }
          }

          // Calculate header length (type byte + length encoding)
          const headerBytes = additionalInfo < 24 ? 1 :
                             additionalInfo === 24 ? 2 :
                             additionalInfo === 25 ? 3 :
                             additionalInfo === 26 ? 5 :
                             additionalInfo === 27 ? 9 : 1
          const headerEnd = startOffset + headerBytes
          const contentLength = typeof result.value === 'string' ? result.value.length : 0

          // Add header entry
          typeDescription = `text(${contentLength})`
          sourceMap.push({
            path,
            start: startOffset,
            end: headerEnd,
            majorType,
            type: typeDescription,
            isHeader: true,
            headerEnd,
            contentPath: contentLength > 0 ? `${path}#content` : undefined,
            children: contentLength > 0 ? [`${path}#content`] : []
          })

          // Add content entry (if non-empty)
          if (contentLength > 0) {
            sourceMap.push({
              path: `${path}#content`,
              start: headerEnd,
              end: startOffset + result.bytesRead,
              majorType: 3,
              type: `→ "${result.value}"`,
              isContent: true,
              parent: path
            })
          }
        }
        break

      case 4: // Array
        typeDescription = 'Array'
        // For arrays and maps, the recursive function handles source map entries
        result = parseArrayWithMap(ctx, offset, path, sourceMap)
        break

      case 5: // Map
        typeDescription = 'Map'
        result = parseMapWithMap(ctx, offset, path, sourceMap)
        break

      case 6: // Tag
        // parseTagWithMap handles source map creation internally (with parent/child relationships)
        result = parseTagWithMap(ctx, offset, path, sourceMap)
        break

      case 7: // Float/Simple
        typeDescription = getSimpleTypeDescription(additionalInfo)
        result = parseFloatFromBuffer(ctx.buffer, offset, ctx.options)
        sourceMap.push({
          path,
          start: startOffset,
          end: startOffset + result.bytesRead,
          majorType,
          type: typeDescription
        })
        break

      default:
        throw new Error(`Unknown major type: ${majorType}`)
    }

    return result
  }

  /**
   * Dispatches CBOR parsing from buffer by major type
   * Used by parseSequence and parseValueWithMap helpers
   *
   * @param buffer - Data buffer
   * @param offset - Current offset
   * @param options - Parser options
   * @returns Parsed value and bytes read
   */
  const dispatchFromBuffer = (buffer: Uint8Array, offset: number, options?: ParseOptions): ParseResult => {
    const initialByte = readByte(buffer, offset)
    const { majorType } = extractCborHeader(initialByte)

    switch (majorType) {
      case 0: // Unsigned integer
      case 1: // Negative integer
        return integerFromBuffer(buffer, offset, options)

      case 2: // Byte string
        return byteStringFromBuffer(buffer, offset, options)

      case 3: // Text string
        return textStringFromBuffer(buffer, offset, options)

      case 4: // Array
        {
          // Use parseArray via hex for now - arrays/maps already use buffer internally
          const hexString = Array.from(buffer.slice(offset))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
          return parseArray(hexString, options)
        }

      case 5: // Map
        {
          const hexString = Array.from(buffer.slice(offset))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
          return parseMap(hexString, options)
        }

      case 6: // Tag
        {
          const hexString = Array.from(buffer.slice(offset))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
          return parseTag(hexString, options)
        }

      case 7: // Float/Simple
        return floatOrSimpleFromBuffer(buffer, offset, options)

      default:
        throw new Error(`Unknown major type: ${majorType}`)
    }
  }

  /**
   * Helper to parse integer from buffer (delegates to buffer-native implementation)
   */
  const parseIntegerFromBuffer = (buffer: Uint8Array, offset: number, options?: ParseOptions): ParseResult => {
    return integerFromBuffer(buffer, offset, options)
  }

  /**
   * Helper to parse string from buffer
   * Dispatches to byte string or text string based on major type
   */
  const parseStringFromBuffer = (buffer: Uint8Array, offset: number, options?: ParseOptions): ParseResult => {
    const initialByte = readByte(buffer, offset)
    const { majorType } = extractCborHeader(initialByte)
    if (majorType === 2) {
      return byteStringFromBuffer(buffer, offset, options)
    }
    return textStringFromBuffer(buffer, offset, options)
  }

  /**
   * Helper to parse float/simple from buffer (delegates to buffer-native implementation)
   */
  const parseFloatFromBuffer = (buffer: Uint8Array, offset: number, options?: ParseOptions): ParseResult => {
    return floatOrSimpleFromBuffer(buffer, offset, options)
  }

  /**
   * Parse array with source map tracking
   */
  const parseArrayWithMap = (
    ctx: CborContext,
    offset: number,
    path: string,
    sourceMap: SourceMapEntry[]
  ): ParseResult => {
    const previousDepth = ctx.currentDepth ?? 0
    const maxDepth = ctx.options?.limits?.maxDepth
    if (maxDepth !== undefined && previousDepth >= maxDepth) {
      throw new Error(`Maximum nesting depth ${maxDepth} exceeded`)
    }
    ctx.currentDepth = previousDepth + 1

    const startOffset = offset
    const initialByte = readByte(ctx.buffer, offset)
    const { additionalInfo } = extractCborHeader(initialByte)

    let currentOffset = offset + 1
    const items: any[] = []

    // Determine array length
    let length: number
    let isIndefinite = false

    if (additionalInfo < 24) {
      length = additionalInfo
    } else if (additionalInfo === 24) {
      length = readByte(ctx.buffer, currentOffset)
      currentOffset += 1
    } else if (additionalInfo === 25) {
      length = readUint(ctx.buffer, currentOffset, 2)
      currentOffset += 2
    } else if (additionalInfo === 26) {
      length = readUint(ctx.buffer, currentOffset, 4)
      currentOffset += 4
    } else if (additionalInfo === 27) {
      const bigLength = readBigUint(ctx.buffer, currentOffset, 8)
      if (bigLength > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error('Array length exceeds maximum safe integer')
      }
      length = Number(bigLength)
      currentOffset += 8
    } else if (additionalInfo === 31) {
      const isIndefiniteAllowed = ctx.options?.allowIndefinite ?? !(ctx.options?.validateCanonical || ctx.options?.strict)
      if (!isIndefiniteAllowed) {
        throw new Error('Indefinite-length encoding is not allowed (strict/canonical mode)')
      }
      isIndefinite = true
      length = 0
    } else {
      throw new Error(`Invalid additional info: ${additionalInfo}`)
    }

    // Calculate header length (where content starts)
    const headerEnd = currentOffset

    // Add header entry for array
    const arrayEntryIndex = sourceMap.length
    sourceMap.push({
      path,
      start: startOffset,
      end: headerEnd,
      majorType: 4,
      type: isIndefinite ? 'array(indefinite)' : `array(${length})`,
      isHeader: true,
      headerEnd
    })

    try {
      // Parse array elements
      const childPaths: string[] = []
      if (isIndefinite) {
        let index = 0
        let foundBreak = false
        while (currentOffset < ctx.buffer.length) {
          const nextByte = readByte(ctx.buffer, currentOffset)
          if (nextByte === 0xff) {
            currentOffset++
            foundBreak = true
            break
          }
          if (ctx.options?.limits?.maxArrayLength && index >= ctx.options.limits.maxArrayLength) {
            throw new Error(`Array length exceeds limit of ${ctx.options.limits.maxArrayLength}`)
          }
          const elementPath = `${path}[${index}]`
          childPaths.push(elementPath)
          const elementResult = parseValueWithMap(ctx, currentOffset, elementPath, sourceMap)
          items.push(elementResult.value)
          currentOffset += elementResult.bytesRead

          // Mark element as child of this array
          const elementEntry = sourceMap.find(e => e.path === elementPath)
          if (elementEntry) {
            elementEntry.parent = path
          }

          index++
        }
        if (!foundBreak) {
          throw new Error('Indefinite-length array missing break code (0xFF)')
        }
      } else {
        if (ctx.options?.limits?.maxArrayLength && length > ctx.options.limits.maxArrayLength) {
          throw new Error(`Array length ${length} exceeds limit of ${ctx.options.limits.maxArrayLength}`)
        }
        for (let i = 0; i < length; i++) {
          const elementPath = `${path}[${i}]`
          childPaths.push(elementPath)
          const elementResult = parseValueWithMap(ctx, currentOffset, elementPath, sourceMap)
          items.push(elementResult.value)
          currentOffset += elementResult.bytesRead

          // Mark element as child of this array
          const elementEntry = sourceMap.find(e => e.path === elementPath)
          if (elementEntry) {
            elementEntry.parent = path
          }
        }
      }

      const bytesRead = currentOffset - offset

      // Only set children if array is non-empty
      if (childPaths.length > 0 && sourceMap[arrayEntryIndex]) {
        sourceMap[arrayEntryIndex].children = childPaths
      }

      return {
        value: items,
        bytesRead
      }
    } finally {
      ctx.currentDepth = previousDepth
    }
  }

  /**
   * Parse map with source map tracking
   */
  const parseMapWithMap = (
    ctx: CborContext,
    offset: number,
    path: string,
    sourceMap: SourceMapEntry[]
  ): ParseResult => {
    const previousDepth = ctx.currentDepth ?? 0
    const maxDepth = ctx.options?.limits?.maxDepth
    if (maxDepth !== undefined && previousDepth >= maxDepth) {
      throw new Error(`Maximum nesting depth ${maxDepth} exceeded`)
    }
    ctx.currentDepth = previousDepth + 1

    const startOffset = offset
    const initialByte = readByte(ctx.buffer, offset)
    const { additionalInfo } = extractCborHeader(initialByte)

    let currentOffset = offset + 1
    const map = new Map()

    // Determine map length
    let length: number
    let isIndefinite = false

    if (additionalInfo < 24) {
      length = additionalInfo
    } else if (additionalInfo === 24) {
      length = readByte(ctx.buffer, currentOffset)
      currentOffset += 1
    } else if (additionalInfo === 25) {
      length = readUint(ctx.buffer, currentOffset, 2)
      currentOffset += 2
    } else if (additionalInfo === 26) {
      length = readUint(ctx.buffer, currentOffset, 4)
      currentOffset += 4
    } else if (additionalInfo === 27) {
      const bigLength = readBigUint(ctx.buffer, currentOffset, 8)
      if (bigLength > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error('Map length exceeds maximum safe integer')
      }
      length = Number(bigLength)
      currentOffset += 8
    } else if (additionalInfo === 31) {
      const isIndefiniteAllowed = ctx.options?.allowIndefinite ?? !(ctx.options?.validateCanonical || ctx.options?.strict)
      if (!isIndefiniteAllowed) {
        throw new Error('Indefinite-length encoding is not allowed (strict/canonical mode)')
      }
      isIndefinite = true
      length = 0
    } else {
      throw new Error(`Invalid additional info: ${additionalInfo}`)
    }

    // Calculate header length (where content starts)
    const headerEnd = currentOffset

    // Add header entry for map
    const mapEntryIndex = sourceMap.length
    sourceMap.push({
      path,
      start: startOffset,
      end: headerEnd,
      majorType: 5,
      type: isIndefinite ? 'map(indefinite)' : `map(${length})`,
      isHeader: true,
      headerEnd
    })

    try {
      // Parse map entries
      const childPaths: string[] = []
      const seenKeys = new Set<string>()

      if (isIndefinite) {
        let count = 0
        let foundBreak = false
        while (currentOffset < ctx.buffer.length) {
          const nextByte = readByte(ctx.buffer, currentOffset)
          if (nextByte === 0xff) {
            currentOffset++
            foundBreak = true
            break
          }
          if (ctx.options?.limits?.maxMapSize && count >= ctx.options.limits.maxMapSize) {
            throw new Error(`Map size exceeds limit of ${ctx.options.limits.maxMapSize}`)
          }

          // Parse key with path suffix to indicate it's a key
          const keyPath = `${path}${path ? '.' : ''}#key`
          const keyResult = parseValueWithMap(ctx, currentOffset, keyPath, sourceMap)
          currentOffset += keyResult.bytesRead

          // For duplicate detection, use semantic comparison (RFC 8949 Section 5.6)
          const keyForDupCheck = serializeValueForComparison(keyResult.value)
          // For path generation, use display-friendly stringification
          const keyString = keyResult.value instanceof Uint8Array
            ? Array.from(keyResult.value).map(b => b.toString(16).padStart(2, '0')).join('')
            : String(keyResult.value)

          // Check for duplicate keys based on dupMapKeyMode
          if (seenKeys.has(keyForDupCheck)) {
            const mode = ctx.options?.dupMapKeyMode || 'allow'
            if (mode === 'reject') {
              throw new Error(`Duplicate map key detected: ${keyString} at offset ${currentOffset}`)
            } else if (mode === 'warn') {
              logger.warn(`Duplicate map key detected: ${keyString} at offset ${currentOffset}`)
            }
          }
          seenKeys.add(keyForDupCheck)

          // Parse value
          const valuePath = path ? `${path}.${keyString}` : `.${keyString}`
          childPaths.push(valuePath)
          const valueResult = parseValueWithMap(ctx, currentOffset, valuePath, sourceMap)
          map.set(keyResult.value, valueResult.value)
          currentOffset += valueResult.bytesRead

          // Mark value entry as child of this map
          const valueEntry = sourceMap.find(e => e.path === valuePath)
          if (valueEntry) {
            valueEntry.parent = path
          }

          count++
        }
        if (!foundBreak) {
          throw new Error('Indefinite-length map missing break code (0xFF)')
        }
      } else {
        if (ctx.options?.limits?.maxMapSize && length > ctx.options.limits.maxMapSize) {
          throw new Error(`Map size ${length} exceeds limit of ${ctx.options.limits.maxMapSize}`)
        }
        for (let i = 0; i < length; i++) {
          // Parse key with path suffix to indicate it's a key
          const keyPath = `${path}${path ? '.' : ''}#key${i}`
          const keyResult = parseValueWithMap(ctx, currentOffset, keyPath, sourceMap)
          currentOffset += keyResult.bytesRead

          // For duplicate detection, use semantic comparison (RFC 8949 Section 5.6)
          const keyForDupCheck = serializeValueForComparison(keyResult.value)
          // For path generation, use display-friendly stringification
          const keyString = keyResult.value instanceof Uint8Array
            ? Array.from(keyResult.value).map(b => b.toString(16).padStart(2, '0')).join('')
            : String(keyResult.value)

          // Check for duplicate keys based on dupMapKeyMode
          if (seenKeys.has(keyForDupCheck)) {
            const mode = ctx.options?.dupMapKeyMode || 'allow'
            if (mode === 'reject') {
              throw new Error(`Duplicate map key detected: ${keyString} at offset ${currentOffset}`)
            } else if (mode === 'warn') {
              logger.warn(`Duplicate map key detected: ${keyString} at offset ${currentOffset}`)
            }
          }
          seenKeys.add(keyForDupCheck)

          // Parse value
          const valuePath = path ? `${path}.${keyString}` : `.${keyString}`
          childPaths.push(valuePath)
          const valueResult = parseValueWithMap(ctx, currentOffset, valuePath, sourceMap)
          map.set(keyResult.value, valueResult.value)
          currentOffset += valueResult.bytesRead

          // Mark value entry as child of this map
          const valueEntry = sourceMap.find(e => e.path === valuePath)
          if (valueEntry) {
            valueEntry.parent = path
          }
        }
      }

      const bytesRead = currentOffset - offset

      // Set children for the map entry
      if (sourceMap[mapEntryIndex]) {
        sourceMap[mapEntryIndex].children = childPaths
      }

      return {
        value: map,
        bytesRead
      }
    } finally {
      ctx.currentDepth = previousDepth
    }
  }

  /**
   * Helper to parse tag number from buffer
   */
  const parseTagNumberHelper = (
    buffer: Uint8Array,
    offset: number,
    ai: number
  ): { tagNumber: number, bytesConsumed: number } => {
    if (ai < 24) {
      // Direct encoding (tags 0-23)
      return { tagNumber: ai, bytesConsumed: 0 }
    } else if (ai === 24) {
      // 1 byte follows (tags 24-255)
      const tagNumber = readByte(buffer, offset)
      return { tagNumber, bytesConsumed: 1 }
    } else if (ai === 25) {
      // 2 bytes follow (tags 256-65535)
      const tagNumber = readUint(buffer, offset, 2)
      return { tagNumber, bytesConsumed: 2 }
    } else if (ai === 26) {
      // 4 bytes follow (tags 65536-4294967295)
      const tagNumber = readUint(buffer, offset, 4)
      return { tagNumber, bytesConsumed: 4 }
    } else if (ai === 27) {
      // 8 bytes follow (very large tag numbers)
      const tagBigInt = readBigUint(buffer, offset, 8)
      if (tagBigInt <= BigInt(Number.MAX_SAFE_INTEGER)) {
        return { tagNumber: Number(tagBigInt), bytesConsumed: 8 }
      } else {
        throw new Error(`Tag number ${tagBigInt} exceeds maximum safe integer`)
      }
    } else if (ai >= 28 && ai <= 30) {
      throw new Error(`Reserved additional info ${ai} for major type 6`)
    } else {
      throw new Error(`Invalid additional info ${ai} for tags`)
    }
  }

  /**
   * Parse tag with source map tracking (RECURSIVE)
   * Creates source map entries for both the tag and its nested value
   */
  const parseTagWithMap = (
    ctx: CborContext,
    offset: number,
    path: string,
    sourceMap: SourceMapEntry[]
  ): ParseResult => {
    // Enforce tag nesting depth (RUSTSEC-2019-0025). The source-map path
    // previously lacked this guard, allowing a deeply nested tag chain to
    // overflow the call stack with an uncatchable RangeError instead of a
    // clean error — matching the decode() path's behaviour here.
    const previousTagDepth = ctx.currentTagDepth ?? 0
    const maxTagDepth = ctx.options?.limits?.maxTagDepth ?? DEFAULT_LIMITS.maxTagDepth
    if (previousTagDepth >= maxTagDepth) {
      throw new Error(`Tag nesting depth ${previousTagDepth} exceeds limit of ${maxTagDepth}`)
    }
    ctx.currentTagDepth = previousTagDepth + 1

    const startOffset = offset
    const initialByte = readByte(ctx.buffer, offset)
    const { additionalInfo } = extractCborHeader(initialByte)

    // Parse tag number
    const { tagNumber, bytesConsumed } = parseTagNumberHelper(
      ctx.buffer,
      offset + 1,
      additionalInfo
    )

    // Enforce canonical (shortest-form) tag number encoding when requested.
    if (ctx.options?.validateCanonical) {
      validateCanonicalInteger(tagNumber, additionalInfo)
    }

    let currentOffset = offset + 1 + bytesConsumed
    const headerEnd = currentOffset

    // Add header entry for this tag
    const tagEntryIndex = sourceMap.length
    sourceMap.push({
      path,
      start: startOffset,
      end: headerEnd,
      majorType: 6,
      type: `tag(${tagNumber})`,
      isHeader: true,
      headerEnd,
      children: []
    })

    // Parse the tagged value WITH source map tracking (RECURSIVE CALL)
    const valuePath = `${path}.value`
    const valueResult = parseValueWithMap(ctx, currentOffset, valuePath, sourceMap)
    currentOffset += valueResult.bytesRead

    // Set child path for the tag
    if (sourceMap[tagEntryIndex]) {
      sourceMap[tagEntryIndex].children = [valuePath]
    }

    // Mark value entry as child of this tag
    const valueEntry = sourceMap.find(e => e.path === valuePath)
    if (valueEntry) {
      valueEntry.parent = path
    }

    // Build TaggedValue directly from already-parsed value (no re-parsing)
    // This avoids O(D^2) complexity for nested tags (Task 2-B fix)
    let finalValue = valueResult.value

    // Handle bignum conversion (tags 2 and 3) - mirrors parseTagFromBuffer logic
    if ((tagNumber === 2 || tagNumber === 3) && finalValue instanceof Uint8Array) {
      const maxBignumBytes = ctx.options?.limits?.maxBignumBytes ?? DEFAULT_LIMITS.maxBignumBytes
      if (finalValue.length > maxBignumBytes) {
        throw new Error(
          `Bignum (tag ${tagNumber}) size ${finalValue.length} bytes exceeds limit of ${maxBignumBytes} bytes`
        )
      }

      // Convert bytes to BigInt (big-endian)
      let bigintValue = 0n
      for (let i = 0; i < finalValue.length; i++) {
        bigintValue = (bigintValue << 8n) | BigInt(finalValue[i]!)
      }

      // Tag 2: Positive bignum, Tag 3: Negative bignum (-1 - n)
      finalValue = tagNumber === 2 ? bigintValue : -1n - bigintValue
    }

    // Validate semantic constraints for specific tags
    validateTagSemantics(tagNumber, finalValue, ctx.options)

    // Decode Plutus constructor if applicable
    const plutusConstr = decodePlutusConstructor(tagNumber, finalValue)

    const taggedValue: TaggedValue = {
      tag: tagNumber,
      value: finalValue,
      ...(plutusConstr && { plutus: plutusConstr })
    }

    // Restore tag depth so sibling tags don't accumulate against the limit.
    ctx.currentTagDepth = previousTagDepth

    return {
      value: taggedValue,
      bytesRead: currentOffset - startOffset
    }
  }

  /**
   * Get simple type description
   */
  const getSimpleTypeDescription = (ai: number): string => {
    if (ai === 20) return 'Simple: false'
    if (ai === 21) return 'Simple: true'
    if (ai === 22) return 'Simple: null'
    if (ai === 23) return 'Simple: undefined'
    if (ai === 25) return 'Float16'
    if (ai === 26) return 'Float32'
    if (ai === 27) return 'Float64'
    if (ai < 20) return `Simple Value ${ai}`
    return 'Simple Value'
  }

  /**
   * Parses a CBOR Sequence (RFC 8742)
   * A CBOR sequence is a concatenation of zero or more CBOR data items
   *
   * @param hexString - CBOR sequence data as hex string
   * @param options - Parser options (optional)
   * @returns Array of parsed CBOR values
   *
   * @example
   * ```ts
   * const { parseSequence } = useCborParser()
   * parseSequence('010203')        // [1, 2, 3] - three separate integers
   * parseSequence('83010203 05')   // [[1,2,3], 5] - array followed by integer
   * parseSequence('')              // [] - empty sequence
   * ```
   */
  const parseSequence = (input: string | Uint8Array, options?: ParseOptions): CborValue[] => {
    const mergedOptions = mergeOptions(options)
    let buffer: Uint8Array

    if (input instanceof Uint8Array) {
      // Empty sequence is valid
      if (input.length === 0) {
        return []
      }
      buffer = input
    } else {
      const cleanHex = input.replace(/\s+/g, '')

      // Empty sequence is valid
      if (!cleanHex || cleanHex.length === 0) {
        return []
      }

      if (cleanHex.length % 2 !== 0) {
        throw new Error('Hex string must have even length')
      }

      if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
        throw new Error(`Invalid hex character in: ${cleanHex}`)
      }

      buffer = hexToBytes(cleanHex)
    }

    const results: CborValue[] = []
    let offset = 0

    // Track start time for timeout enforcement across the entire sequence
    const sequenceStartTime = mergedOptions.limits?.maxParseTime ? Date.now() : 0

    while (offset < buffer.length) {
      // Check timeout on each sequence item
      if (sequenceStartTime > 0 && mergedOptions.limits?.maxParseTime) {
        const elapsed = Date.now() - sequenceStartTime
        if (elapsed > mergedOptions.limits.maxParseTime) {
          throw new Error(`Parse timeout: exceeded ${mergedOptions.limits.maxParseTime}ms limit`)
        }
      }

      // Check for break code outside indefinite context (invalid in sequence)
      const byte = readByte(buffer, offset)
      if (byte === 0xff) {
        throw new Error(`Unexpected break code (0xff) at offset ${offset} - not inside indefinite-length item`)
      }

      // Parse next item directly from buffer (no hex conversion)
      const result = dispatchFromBuffer(buffer, offset, mergedOptions)
      results.push(result.value)
      offset += result.bytesRead
    }

    return results
  }

  /**
   * Parses a CBOR Sequence with source maps for each item
   *
   * @param hexString - CBOR sequence data as hex string
   * @param options - Parser options (optional)
   * @returns Object with values array and sourceMaps array
   */
  const parseSequenceWithSourceMap = (hexString: string, options?: ParseOptions): {
    values: CborValue[]
    sourceMaps: SourceMapEntry[][]
  } => {
    const cleanHex = hexString.replace(/\s+/g, '')

    if (!cleanHex || cleanHex.length === 0) {
      return { values: [], sourceMaps: [] }
    }

    if (cleanHex.length % 2 !== 0) {
      throw new Error('Hex string must have even length')
    }

    if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
      throw new Error(`Invalid hex character in: ${cleanHex}`)
    }

    const mergedOptions = mergeOptions(options)
    const buffer = hexToBytes(cleanHex)
    const values: CborValue[] = []
    const sourceMaps: SourceMapEntry[][] = []
    let offset = 0

    while (offset < buffer.length) {
      const byte = readByte(buffer, offset)
      if (byte === 0xff) {
        throw new Error(`Unexpected break code (0xff) at offset ${offset}`)
      }

      // Zero-copy view of the remaining bytes (parseWithSourceMap accepts
      // Uint8Array). Avoids the previous O(N^2) per-item hex re-encode that
      // re-stringified the whole tail of the buffer on every sequence item.
      const result = parseWithSourceMap(buffer.subarray(offset), mergedOptions)

      // Adjust source map offsets to account for sequence position
      const adjustedSourceMap = result.sourceMap.map(entry => ({
        ...entry,
        start: entry.start + offset,
        end: entry.end + offset
      }))

      values.push(result.value)
      sourceMaps.push(adjustedSourceMap)
      offset += result.bytesRead
    }

    return { values, sourceMaps }
  }

  return {
    parse,
    parseWithSourceMap,
    parseSequence,
    parseSequenceWithSourceMap
  }
}
