/**
 * useCborDiagnostic - RFC 8949 Appendix B Diagnostic Notation
 *
 * Converts CBOR values to human-readable diagnostic notation as defined
 * in RFC 8949 (Concise Binary Object Representation).
 *
 * @example
 * ```typescript
 * const { toDiagnostic } = useCborDiagnostic()
 *
 * toDiagnostic(100)                    // "100"
 * toDiagnostic(new Uint8Array([1,2]))  // "h'0102'"
 * toDiagnostic([1, 2, 3])              // "[1, 2, 3]"
 * toDiagnostic({a: 1})                 // '{"a": 1}'
 * ```
 */

import { INDEFINITE_SYMBOL, ALL_ENTRIES_SYMBOL } from '../types'
import type { SourceMapEntry } from '../types'

/** Detect the indefinite-length marker attached by the parser to a value. */
function isIndefiniteValue(value: unknown): boolean {
  return typeof value === 'object' && value !== null && (value as any)[INDEFINITE_SYMBOL] === true
}

/**
 * Options for diagnostic notation output
 */
export interface DiagnosticOptions {
  /** Pretty print with indentation (default: false) */
  pretty?: boolean
  /** Indentation string for pretty printing (default: '  ') */
  indent?: string
  /** Maximum depth for nested structures (default: 100) */
  maxDepth?: number
  /** Mark as indefinite-length (default: false) */
  indefinite?: boolean
  /**
   * Show byte offsets as comments (default: false).
   *
   * Only effective for source-map-aware entry points (`decodeToDiagnostic`),
   * which annotate each value with its byte span, e.g. `100 /* 0-2 *​/`.
   * `toDiagnostic` on a plain value has no offset information and ignores it.
   */
  showOffsets?: boolean
}

/**
 * Tagged value interface (CBOR Major Type 6)
 */
interface TaggedValue {
  tag: number | bigint
  value: unknown
}

/**
 * Check if value is a tagged value
 */
function isTaggedValue(value: unknown): value is TaggedValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tag' in value &&
    'value' in value &&
    (typeof (value as TaggedValue).tag === 'number' || typeof (value as TaggedValue).tag === 'bigint')
  )
}

/**
 * Check if value is a plain object (not array, not special type)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Uint8Array) &&
    !(value instanceof Map) &&
    !(value instanceof Set) &&
    !isTaggedValue(value) &&
    value.constructor === Object
  )
}

/**
 * Escape string for diagnostic notation (JSON-style escaping)
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/[\x00-\x1f\x7f-\x9f]/g, (char) => {
      const code = char.charCodeAt(0)
      return `\\u${code.toString(16).padStart(4, '0')}`
    })
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Composable for CBOR diagnostic notation
 */
export function useCborDiagnostic() {
  /**
   * Convert a CBOR value to RFC 8949 diagnostic notation
   *
   * @param value - The CBOR value to convert
   * @param options - Formatting options
   * @returns Diagnostic notation string
   */
  const toDiagnostic = (
    value: unknown,
    options: DiagnosticOptions = {}
  ): string => {
    const {
      pretty = false,
      indent = '  ',
      maxDepth = 100,
      indefinite = false
    } = options

    return formatValue(value, 0, pretty, indent, maxDepth, indefinite)
  }

  /**
   * Internal recursive formatter
   */
  const formatValue = (
    value: unknown,
    depth: number,
    pretty: boolean,
    indent: string,
    maxDepth: number,
    indefinite: boolean
  ): string => {
    // Check depth limit
    if (depth > maxDepth) {
      return '...'
    }

    // Handle null/undefined
    if (value === null) {
      return 'null'
    }
    if (value === undefined) {
      return 'undefined'
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false'
    }

    // Handle numbers
    if (typeof value === 'number') {
      // Special float values
      if (Number.isNaN(value)) {
        return 'NaN'
      }
      if (value === Infinity) {
        return 'Infinity'
      }
      if (value === -Infinity) {
        return '-Infinity'
      }
      // Negative zero
      if (Object.is(value, -0)) {
        return '-0.0'
      }
      // Regular numbers
      if (Number.isInteger(value)) {
        return value.toString()
      }
      // Floats - preserve precision
      return value.toString()
    }

    // Handle BigInt
    if (typeof value === 'bigint') {
      return value.toString()
    }

    // Handle strings
    if (typeof value === 'string') {
      return `"${escapeString(value)}"`
    }

    // Handle byte strings (Uint8Array)
    if (value instanceof Uint8Array) {
      return `h'${bytesToHex(value)}'`
    }

    // Handle parser wrapper types for indefinite-length strings
    if (typeof value === 'object' && value !== null && 'type' in value) {
      const t = (value as { type?: string }).type
      if (t === 'cbor-byte-string') {
        const bs = value as unknown as { bytes: Uint8Array }
        return isIndefiniteValue(value) ? `(_ h'${bytesToHex(bs.bytes)}')` : `h'${bytesToHex(bs.bytes)}'`
      }
      if (t === 'cbor-text-string') {
        const ts = value as unknown as { text: string }
        return isIndefiniteValue(value) ? `(_ "${escapeString(ts.text)}")` : `"${escapeString(ts.text)}"`
      }
    }

    // Handle unassigned simple values (Major Type 7): simple(N)
    if (typeof value === 'object' && value !== null && 'simpleValue' in value &&
        typeof (value as { simpleValue?: unknown }).simpleValue === 'number') {
      return `simple(${(value as { simpleValue: number }).simpleValue})`
    }

    // Handle tagged values
    if (isTaggedValue(value)) {
      if ((value.tag === 2 || value.tag === 3) && typeof value.value === 'bigint') {
        const magnitude = value.tag === 2 ? value.value : -1n - value.value
        if (magnitude < 0n) throw new Error('Invalid bignum sign')
        const hex = magnitude === 0n ? '' : magnitude.toString(16).padStart(Math.ceil(magnitude.toString(16).length / 2) * 2, '0')
        return `${value.tag}(h'${hex}')`
      }
      const taggedContent = formatValue(
        value.value,
        depth + 1,
        pretty,
        indent,
        maxDepth,
        false
      )
      return `${value.tag}(${taggedContent})`
    }

    if (value && typeof value === 'object' && 'type' in value && (value as any).type === 'cbor-float') {
      const number = (value as any).value
      return Object.is(number, -0) ? '-0.0' : Number.isInteger(number) ? `${number}.0` : String(number)
    }

    // Handle arrays
    if (Array.isArray(value)) {
      indefinite = indefinite || isIndefiniteValue(value)
      if (value.length === 0) {
        return indefinite ? '[_ ]' : '[]'
      }

      const items = value.map(item =>
        formatValue(item, depth + 1, pretty, indent, maxDepth, false)
      )

      if (pretty) {
        const prefix = indefinite ? '[_ ' : '['
        const lineIndent = indent.repeat(depth + 1)
        const closeIndent = indent.repeat(depth)
        return `${prefix}\n${lineIndent}${items.join(`,\n${lineIndent}`)}\n${closeIndent}]`
      } else {
        const prefix = indefinite ? '[_ ' : '['
        return `${prefix}${items.join(', ')}]`
      }
    }

    // Handle Maps
    if (value instanceof Map) {
      indefinite = indefinite || isIndefiniteValue(value)
      if (value.size === 0) {
        return indefinite ? '{_ }' : '{}'
      }

      const entries: string[] = []
      for (const [k, v] of value) {
        const keyStr = formatValue(k, depth + 1, pretty, indent, maxDepth, false)
        const valueStr = formatValue(v, depth + 1, pretty, indent, maxDepth, false)
        entries.push(`${keyStr}: ${valueStr}`)
      }

      if (pretty) {
        const prefix = indefinite ? '{_ ' : '{'
        const lineIndent = indent.repeat(depth + 1)
        const closeIndent = indent.repeat(depth)
        return `${prefix}\n${lineIndent}${entries.join(`,\n${lineIndent}`)}\n${closeIndent}}`
      } else {
        const prefix = indefinite ? '{_ ' : '{'
        return `${prefix}${entries.join(', ')}}`
      }
    }

    // Handle Sets (convert to array)
    if (value instanceof Set) {
      const items = Array.from(value).map(item =>
        formatValue(item, depth + 1, pretty, indent, maxDepth, false)
      )

      if (pretty) {
        const lineIndent = indent.repeat(depth + 1)
        const closeIndent = indent.repeat(depth)
        return `[\n${lineIndent}${items.join(`,\n${lineIndent}`)}\n${closeIndent}]`
      } else {
        return `[${items.join(', ')}]`
      }
    }

    // Handle plain objects (as CBOR maps with string keys)
    if (isPlainObject(value)) {
      const keys = Object.keys(value)
      if (keys.length === 0) {
        return indefinite ? '{_ }' : '{}'
      }

      const entries = keys.map(key => {
        const keyStr = `"${escapeString(key)}"`
        const valueStr = formatValue(
          value[key],
          depth + 1,
          pretty,
          indent,
          maxDepth,
          false
        )
        return `${keyStr}: ${valueStr}`
      })

      if (pretty) {
        const prefix = indefinite ? '{_ ' : '{'
        const lineIndent = indent.repeat(depth + 1)
        const closeIndent = indent.repeat(depth)
        return `${prefix}\n${lineIndent}${entries.join(`,\n${lineIndent}`)}\n${closeIndent}}`
      } else {
        const prefix = indefinite ? '{_ ' : '{'
        return `${prefix}${entries.join(', ')}}`
      }
    }

    // Fallback for unknown types
    return String(value)
  }

  /**
   * Parse RFC 8949 §8 diagnostic notation back to a CBOR value.
   *
   * Supports the full grammar produced by {@link toDiagnostic}:
   * - Integers (auto-promoted to bigint beyond ±2^53-1), hex integers (0x…)
   * - Floats, including Infinity / -Infinity / NaN / -0.0 and optional
   *   `_N` float-width suffixes (accepted and ignored)
   * - Text strings with JSON-style escapes (\" \\ \/ \b \f \n \r \t \uXXXX)
   * - Byte strings: h'…' (hex, embedded whitespace allowed) and b64'…'
   *   (base64url, padding optional)
   * - Arrays [ … ] and indefinite arrays [_ … ]
   * - Maps { k: v, … } and indefinite maps {_ … } → decoded to Map
   *   (mirrors the decoder, which returns Map instances)
   * - Tagged values n(…) → { tag, value }
   * - simple(n) → { simpleValue: n }
   * - true / false / null / undefined
   * - Indefinite-length strings (_ "a" "b") / (_ h'01' h'02')
   *
   * @param diag - Diagnostic notation string
   * @returns The parsed CBOR value
   * @throws Error on malformed input
   */
  const fromDiagnostic = (diag: string, options: { preserveFloatType?: boolean; maxDepth?: number } = {}): unknown => {
    if (diag.length > 20 * 1024 * 1024) throw new Error('Diagnostic input size exceeds limit')
    let depth = 0
    let pos = 0
    const input = diag

    const error = (msg: string): never => {
      throw new Error(`fromDiagnostic: ${msg} at position ${pos}`)
    }

    const skipWs = (): void => {
      while (pos < input.length && /\s/.test(input[pos]!)) pos++
    }

    const peek = (): string => input[pos] ?? ''

    const expect = (ch: string): void => {
      if (input[pos] !== ch) {
        error(`expected '${ch}', got '${input[pos] ?? 'EOF'}'`)
      }
      pos++
    }

    const parseHexByteString = (): Uint8Array => {
      // at h'
      pos++ // consume h
      expect("'")
      let hex = ''
      while (pos < input.length && input[pos] !== "'") {
        const ch = input[pos]!
        if (/[0-9a-fA-F]/.test(ch)) {
          hex += ch
        } else if (/\s/.test(ch)) {
          // whitespace allowed inside h'' per RFC 8949 §8
        } else {
          error(`invalid hex character '${ch}' in byte string`)
        }
        pos++
      }
      expect("'")
      if (hex.length % 2 !== 0) {
        error('odd number of hex digits in byte string')
      }
      const bytes = new Uint8Array(hex.length / 2)
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
      }
      return bytes
    }

    const B64_LOOKUP: Record<string, number> = {}
    const initB64 = (): void => {
      const std = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      for (let i = 0; i < std.length; i++) B64_LOOKUP[std[i]!] = i
      B64_LOOKUP['-'] = 62; B64_LOOKUP['_'] = 63
      B64_LOOKUP['+'] = 62; B64_LOOKUP['/'] = 63
    }
    initB64()

    const parseB64ByteString = (): Uint8Array => {
      // at b64'
      pos += 3 // consume b64
      expect("'")
      let chars = ''
      while (pos < input.length && input[pos] !== "'") {
        const ch = input[pos]!
        if (ch in B64_LOOKUP) {
          chars += ch
        } else if (ch === '=' || /\s/.test(ch)) {
          // padding / whitespace tolerated
        } else {
          error(`invalid base64 character '${ch}' in byte string`)
        }
        pos++
      }
      expect("'")
      const byteLength = Math.floor((chars.length * 6) / 8)
      const bytes = new Uint8Array(byteLength)
      let bitBuffer = 0
      let bitCount = 0
      let out = 0
      for (const ch of chars) {
        bitBuffer = (bitBuffer << 6) | B64_LOOKUP[ch]!
        bitCount += 6
        if (bitCount >= 8) {
          bitCount -= 8
          bytes[out++] = (bitBuffer >> bitCount) & 0xff
        }
      }
      return bytes
    }

    const parseString = (): string => {
      expect('"')
      let result = ''
      while (pos < input.length && input[pos] !== '"') {
        const ch = input[pos]!
        if (ch === '\\') {
          pos++
          const esc = input[pos]
          if (esc === undefined) error('unterminated escape sequence')
          switch (esc) {
            case '"': result += '"'; break
            case '\\': result += '\\'; break
            case '/': result += '/'; break
            case 'b': result += '\b'; break
            case 'f': result += '\f'; break
            case 'n': result += '\n'; break
            case 'r': result += '\r'; break
            case 't': result += '\t'; break
            case 'u': {
              const hex4 = input.substring(pos + 1, pos + 5)
              if (!/^[0-9a-fA-F]{4}$/.test(hex4)) {
                error(`invalid \\u escape '\\u${hex4}'`)
              }
              result += String.fromCharCode(parseInt(hex4, 16))
              pos += 4
              break
            }
            default:
              error(`unknown escape '\\${esc}'`)
          }
          pos++
        } else {
          result += ch
          pos++
        }
      }
      expect('"')
      return result
    }

    const parseNumberOrTag = (): unknown => {
      const start = pos
      if (peek() === '-') pos++
      // Hex integer (0x…)
      if (input[pos] === '0' && (input[pos + 1] === 'x' || input[pos + 1] === 'X')) {
        pos += 2
        const hexStart = pos
        while (pos < input.length && /[0-9a-fA-F]/.test(input[pos]!)) pos++
        if (pos === hexStart) error('missing hex digits after 0x')
        const negative = input[start] === '-'
        const big = BigInt('0x' + input.substring(hexStart, pos)) * (negative ? -1n : 1n)
        return maybeTagged(bigToNumberIfSafe(big))
      }

      while (pos < input.length && /[0-9]/.test(input[pos]!)) pos++
      let isFloat = false
      if (input[pos] === '.') {
        isFloat = true
        pos++
        while (pos < input.length && /[0-9]/.test(input[pos]!)) pos++
      }
      if (input[pos] === 'e' || input[pos] === 'E') {
        isFloat = true
        pos++
        if (input[pos] === '+' || input[pos] === '-') pos++
        while (pos < input.length && /[0-9]/.test(input[pos]!)) pos++
      }
      const text = input.substring(start, pos)
      if (text === '' || text === '-') error('invalid number')

      // Optional float-width suffix (_1/_2/_3), accepted and ignored
      if (input[pos] === '_' && /[0-3]/.test(input[pos + 1] ?? '')) {
        isFloat = true
        pos += 2
      }

      if (isFloat) {
        const num = Number(text)
        if (Number.isNaN(num)) return error('invalid float')
        if (options.preserveFloatType) return { type: 'cbor-float', value: num }
        return Object.is(num, 0) && text.startsWith('-') ? -0 : num
      }

      const big = BigInt(text)
      return maybeTagged(bigToNumberIfSafe(big))
    }

    const bigToNumberIfSafe = (big: bigint): number | bigint => {
      if (big <= BigInt(Number.MAX_SAFE_INTEGER) && big >= BigInt(-Number.MAX_SAFE_INTEGER)) {
        return Number(big)
      }
      return big
    }

    /** Handle `n(value)` tagged form after an integer was parsed */
    const maybeTagged = (num: number | bigint): unknown => {
      if (peek() === '(') {
        if (num < 0 || num > 18446744073709551615n || (typeof num === 'number' && !Number.isSafeInteger(num))) {
          error(`invalid tag number ${num}`)
        }
        pos++ // consume (
        skipWs()
        const inner = parseValue()
        skipWs()
        expect(')')
        if (!options.preserveFloatType && (num === 2 || num === 3) && inner instanceof Uint8Array) {
          let big = 0n
          for (const byte of inner) big = (big << 8n) | BigInt(byte)
          return { tag: num, value: num === 2 ? big : -1n - big }
        }
        return { tag: num, value: inner }
      }
      return num
    }

    const parseArray = (): unknown[] => {
      expect('[')
      let indefinite = false
      if (peek() === '_') {
        indefinite = true
        pos++
      }
      skipWs()
      const items: unknown[] = []
      if (peek() === ']') {
        pos++
      } else {
        for (;;) {
          skipWs()
          items.push(parseValue())
          skipWs()
          if (peek() === ',') {
            pos++
            continue
          }
          expect(']')
          break
        }
      }
      if (indefinite) {
        ;(items as any)[INDEFINITE_SYMBOL] = true
      }
      return items
    }

    const parseMap = (): Map<unknown, unknown> => {
      expect('{')
      let indefinite = false
      if (peek() === '_') {
        indefinite = true
        pos++
      }
      skipWs()
      const map = new Map<unknown, unknown>()
      const allEntries: [unknown, unknown][] = []
      Object.defineProperty(map, ALL_ENTRIES_SYMBOL, { value: allEntries })
      if (peek() === '}') {
        pos++
      } else {
        for (;;) {
          skipWs()
          const key = parseValue()
          skipWs()
          expect(':')
          skipWs()
          const value = parseValue()
          map.set(key, value)
          allEntries.push([key, value])
          skipWs()
          if (peek() === ',') {
            pos++
            continue
          }
          expect('}')
          break
        }
      }
      if (indefinite) {
        ;(map as any)[INDEFINITE_SYMBOL] = true
      }
      return map
    }

    /** Indefinite-length string chunks: (_ "a" "b") or (_ h'01' h'02') */
    const parseIndefiniteString = (): unknown => {
      expect('(')
      expect('_')
      skipWs()
      const chunks: unknown[] = []
      while (peek() !== ')') {
        chunks.push(parseValue())
        skipWs()
        if (peek() === ',') {
          pos++
          skipWs()
        }
      }
      expect(')')

      if (chunks.every(c => typeof c === 'string')) {
        const text = (chunks as string[]).join('')
        const result = { type: 'cbor-text-string' as const, text, chunks: chunks as string[] }
        ;(result as any)[INDEFINITE_SYMBOL] = true
        return result
      }
      if (chunks.every(c => c instanceof Uint8Array)) {
        const byteChunks = chunks as Uint8Array[]
        const total = byteChunks.reduce((sum, c) => sum + c.length, 0)
        const bytes = new Uint8Array(total)
        let off = 0
        for (const c of byteChunks) {
          bytes.set(c, off)
          off += c.length
        }
        const result = { type: 'cbor-byte-string' as const, bytes, chunks: byteChunks }
        ;(result as any)[INDEFINITE_SYMBOL] = true
        return result
      }
      return error('indefinite-length string chunks must be all text or all byte strings')
    }

    const parseValue = (): unknown => {
      if (++depth > (options.maxDepth ?? 100)) return error('Maximum diagnostic nesting depth exceeded')
      try { return parseValueInner() } finally { depth-- }
    }
    const parseValueInner = (): unknown => {
      skipWs()
      const ch = peek()

      if (ch === '') error('unexpected end of input')

      // Keywords
      if (input.startsWith('true', pos)) { pos += 4; return true }
      if (input.startsWith('false', pos)) { pos += 5; return false }
      if (input.startsWith('null', pos)) { pos += 4; return null }
      if (input.startsWith('undefined', pos)) { pos += 9; return undefined }
      if (input.startsWith('NaN', pos)) { pos += 3; return NaN }
      if (input.startsWith('Infinity', pos)) { pos += 8; return Infinity }
      if (input.startsWith('-Infinity', pos)) { pos += 9; return -Infinity }

      // simple(n)
      if (input.startsWith('simple(', pos)) {
        pos += 7
        skipWs()
        const numStart = pos
        while (pos < input.length && /[0-9]/.test(input[pos]!)) pos++
        const simpleValue = parseInt(input.substring(numStart, pos), 10)
        if (Number.isNaN(simpleValue) || simpleValue > 255 || (simpleValue >= 24 && simpleValue <= 31)) error('invalid simple value')
        skipWs()
        expect(')')
        return { simpleValue }
      }

      if (ch === '[') return parseArray()
      if (ch === '{') return parseMap()
      if (ch === '"') {
        const text = parseString()
        if (peek() === '_' && text === '') { pos++; return { type: 'cbor-text-string', text, chunks: [], [INDEFINITE_SYMBOL]: true } }
        return text
      }
      if (ch === '(') return parseIndefiniteString()
      if (ch === 'h' && input[pos + 1] === "'") {
        const bytes = parseHexByteString()
        if (peek() === '_' && bytes.length === 0) { pos++; return { type: 'cbor-byte-string', bytes, chunks: [], [INDEFINITE_SYMBOL]: true } }
        return bytes
      }
      if (input.startsWith("b32'", pos) || input.startsWith("h32'", pos)) {
        const alphabet = input[pos] === 'b' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567' : '0123456789ABCDEFGHIJKLMNOPQRSTUV'
        pos += 4
        let bits = 0, count = 0
        const bytes: number[] = []
        let padding = false
        while (pos < input.length && peek() !== "'") {
          const ch = input[pos++]!.toUpperCase()
          if (/\s/.test(ch)) continue
          if (ch === '=') { padding = true; continue }
          const digit = alphabet.indexOf(ch)
          if (digit < 0 || padding) return error('invalid base32 byte string')
          bits = (bits << 5) | digit; count += 5
          if (count >= 8) { count -= 8; bytes.push((bits >> count) & 255) }
        }
        expect("'")
        if (count >= 5 || (bits & ((1 << count) - 1)) !== 0) return error('invalid base32 tail')
        return new Uint8Array(bytes)
      }
      if (input.startsWith("b64'", pos)) return parseB64ByteString()
      if (ch === '-' || /[0-9]/.test(ch)) return parseNumberOrTag()

      return error(`unexpected character '${ch}'`)
    }

    const result = parseValue()
    skipWs()
    if (pos < input.length) {
      error(`unexpected trailing content '${input.substring(pos, pos + 10)}'`)
    }
    return result
  }

  /**
   * Format value with type annotation (extended notation)
   */
  const toDiagnosticWithType = (
    value: unknown,
    majorType: number,
    options: DiagnosticOptions = {}
  ): string => {
    const typeNames: Record<number, string> = {
      0: 'uint',
      1: 'nint',
      2: 'bstr',
      3: 'tstr',
      4: 'array',
      5: 'map',
      6: 'tag',
      7: 'simple'
    }

    const typeName = typeNames[majorType] || 'unknown'
    const diag = toDiagnostic(value, options)

    return `${typeName}(${diag})`
  }

  /**
   * Convert a decoded CBOR value to diagnostic notation annotated with byte
   * offsets taken from the decoder's source map (DiagnosticOptions.showOffsets).
   *
   * Each value is suffixed with a `/* start-end *​/` comment giving its byte
   * span in the original input. Containers span their entire encoding.
   *
   * @param value - Decoded CBOR value (from decodeWithSourceMap)
   * @param sourceMap - Source map produced alongside the value
   * @returns Annotated diagnostic notation string
   */
  const toDiagnosticWithOffsets = (
    value: unknown,
    sourceMap: SourceMapEntry[]
  ): string => {
    /** Compute the byte span covered by a path (including all descendants). */
    const spanFor = (path: string): { start: number; end: number } | null => {
      let start = Infinity
      let end = -Infinity
      for (const entry of sourceMap) {
        const isSelfOrDescendant =
          entry.path === path ||
          entry.path.startsWith(`${path}[`) ||
          entry.path.startsWith(`${path}.`) ||
          entry.path.startsWith(`${path}#`)
        if (isSelfOrDescendant) {
          if (entry.start < start) start = entry.start
          if (entry.end > end) end = entry.end
        }
      }
      if (start === Infinity) return null
      return { start, end }
    }

    const annotate = (text: string, path: string): string => {
      const span = spanFor(path)
      if (!span) return text
      return `${text} /* ${span.start}-${span.end} */`
    }

    /** Stringify a map key the same way the source-map builder does. */
    const keyToPathString = (key: unknown): string => {
      if (key instanceof Uint8Array) {
        return Array.from(key).map(b => b.toString(16).padStart(2, '0')).join('')
      }
      return String(key)
    }

    const format = (val: unknown, path: string): string => {
      // Tagged values: annotate tag and recurse into `.value`
      if (isTaggedValue(val)) {
        const inner = format(val.value, `${path}.value`)
        return annotate(`${val.tag}(${inner})`, path)
      }

      if (Array.isArray(val)) {
        const items = val.map((item, i) => format(item, `${path}[${i}]`))
        const prefix = isIndefiniteValue(val) ? '[_ ' : '['
        return annotate(`${prefix}${items.join(', ')}]`, path)
      }

      if (val instanceof Map) {
        const entries: string[] = []
        for (const [k, v] of val) {
          const keyStr = toDiagnostic(k)
          const valueStr = format(v, `${path}.${keyToPathString(k)}`)
          entries.push(`${keyStr}: ${valueStr}`)
        }
        const prefix = isIndefiniteValue(val) ? '{_ ' : '{'
        return annotate(`${prefix}${entries.join(', ')}}`, path)
      }

      // Leaves reuse the plain formatter
      return annotate(toDiagnostic(val), path)
    }

    return format(value, '')
  }

  return {
    toDiagnostic,
    fromDiagnostic,
    toDiagnosticWithType,
    toDiagnosticWithOffsets
  }
}

export default useCborDiagnostic
