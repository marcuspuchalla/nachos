/** One bounded traversal for decoding, source maps, and lossless inspection. */
import type { CborValue, ParseOptions, SourceMapEntry, TaggedValue, CborByteString } from './types'
import { DEFAULT_OPTIONS, DEFAULT_LIMITS, INDEFINITE_SYMBOL, ALL_ENTRIES_SYMBOL } from './types'
import { hexToBytes, readBigUint, validateCanonicalInteger, compareMapKeys, serializeValueForComparison } from './utils'
import { useCborInteger } from './composables/useCborInteger'
import { useCborString } from './composables/useCborString'
import { useCborFloat } from './composables/useCborFloat'
import { useCborTag } from './composables/useCborTag'
import { validateRegisteredTag } from './extensions'
import { logger } from '../utils/logger'

/** Wire representation: children retain map entries, float types, chunks and tags. */
export interface CborNode {
  majorType: number
  additionalInfo: number
  start: number
  headerEnd: number
  end: number
  raw: Uint8Array
  value: CborValue
  children: CborNode[]
}

export function resolveOptions(input: ParseOptions = {}): Required<ParseOptions> {
  const profile = input.profile ?? 'permissive'
  const valid = profile !== 'permissive'
  const canonical = input.validateCanonical ?? (input.strict || profile === 'deterministic' || false)
  const options = {
    ...DEFAULT_OPTIONS, ...input, profile,
    validateCanonical: canonical,
    canonicalNaN: input.canonicalNaN ?? (profile !== 'deterministic'),
    allowIndefinite: input.allowIndefinite ?? !(canonical || input.strict),
    dupMapKeyMode: input.dupMapKeyMode ?? (valid || canonical || input.strict ? 'reject' : DEFAULT_OPTIONS.dupMapKeyMode),
    validateUtf8Strict: input.validateUtf8Strict ?? (valid || !!input.strict),
    validateTagSemantics: input.validateTagSemantics ?? (valid || !!input.strict),
    validatePlutusSemantics: input.validatePlutusSemantics ?? (profile === 'cardano' || !!input.strict),
    validateSetUniqueness: input.validateSetUniqueness ?? (valid || !!input.strict),
    allowTrailingData: input.allowTrailingData ?? !(valid || input.strict),
    mapKeyOrder: input.mapKeyOrder ?? (profile === 'deterministic' ? 'bytewise' : DEFAULT_OPTIONS.mapKeyOrder),
    limits: { ...DEFAULT_LIMITS, ...input.limits }
  } as Required<ParseOptions>
  for (const [name, limit] of Object.entries(options.limits)) {
    if (typeof limit !== 'number' || !Number.isFinite(limit) || limit < 0) throw new Error(`Invalid parser limit ${name}`)
  }
  return options
}

export function inputBytes(input: string | Uint8Array, options: ParseOptions): Uint8Array {
  const size = input instanceof Uint8Array ? input.length : input.replace(/\s/g, '').length / 2
  if (size > (options.limits?.maxInputSize ?? DEFAULT_LIMITS.maxInputSize)) throw new Error(`Input size ${size} bytes exceeds limit of ${options.limits?.maxInputSize} bytes`)
  // Own one buffer: views in lossless nodes must not change when callers reuse input.
  return input instanceof Uint8Array ? input.slice() : hexToBytes(input.replace(/\s/g, ''))
}

/** RFC 8949 §5.6.1, including verified erratum 8589 (NaN sign). */
export function nodeKey(node: CborNode, preserveZero = false): string {
  const { majorType: mt, value, children } = node
  if (mt === 4) return JSON.stringify(['array', children.map(child => nodeKey(child, preserveZero))])
  if (mt === 5) {
    const pairs: string[][] = []
    for (let i = 0; i < children.length; i += 2) pairs.push([nodeKey(children[i]!), nodeKey(children[i + 1]!, preserveZero)])
    return JSON.stringify(['map', pairs.map(pair => JSON.stringify(pair)).sort()])
  }
  if (mt === 6) return JSON.stringify(['tag', String((value as TaggedValue).tag), nodeKey(children[0]!, preserveZero)])
  if (mt === 7 && node.additionalInfo >= 25) {
    if (!Number.isNaN(value)) return `float:${preserveZero && Object.is(value, -0) ? '-0' : value}` // +0 and -0 are equivalent keys
    const n = node.raw.length - 1
    let bits = 0n
    for (const byte of node.raw.subarray(1)) bits = (bits << 8n) | BigInt(byte)
    const precision = n === 2 ? 10n : n === 4 ? 23n : 52n
    return `nan:${bits >> BigInt(n * 8 - 1)}:${(bits & ((1n << precision) - 1n)) << (64n - precision)}`
  }
  return serializeValueForComparison(value)
}

export function createScanner(buffer: Uint8Array, input: ParseOptions = {}) {
  const options = resolveOptions(input)
  const limits = { ...DEFAULT_LIMITS, ...options.limits }
  const startTime = Date.now()
  let outputSize = 0
  const integer = useCborInteger().parseIntegerFromBuffer
  const strings = useCborString()
  const float = useCborFloat().parseFromBuffer
  const tags = useCborTag()
  const check = (allocated = 0) => {
    if (Date.now() - startTime > limits.maxParseTime) throw new Error(`Parse timeout: exceeded ${limits.maxParseTime}ms limit`)
    outputSize += allocated
    if (outputSize > limits.maxOutputSize) throw new Error(`Output size ${outputSize} bytes exceeds limit of ${limits.maxOutputSize} bytes`)
  }
  const scan = (offset: number, depth = 0, tagDepth = 0, bytes = buffer): CborNode => {
    check()
    const initial = bytes[offset]
    if (initial === undefined) throw new Error(`Unexpected end of buffer at offset ${offset}`)
    const mt = initial >> 5
    const ai = initial & 31
    if (ai >= 28 && ai <= 30) throw new Error(mt >= 2 && mt <= 5 ? `Invalid additional info: ${ai}` : `Reserved additional info ${ai} for major type ${mt}`)
    if (ai === 31 && (mt < 2 || mt > 5)) throw new Error(mt === 6 ? 'Invalid additional info 31 for tags' : 'Unexpected break marker or invalid indefinite-length item')
    if (ai === 31 && !options.allowIndefinite) throw new Error('Indefinite-length encoding is not allowed (strict/canonical mode)')
    const width = ai < 24 || ai === 31 ? 0 : 2 ** (ai - 24)
    let argument: number | bigint = ai
    if (width) {
      const big = readBigUint(bytes, offset + 1, width)
      argument = big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big
    }
    if (options.validateCanonical && mt !== 7 && ai !== 31) {
      try { validateCanonicalInteger(argument, ai) }
      catch (error) { throw new Error(mt >= 2 && mt <= 5 ? `Non-canonical length encoding: ${(error as Error).message}` : (error as Error).message) }
    }
    const headerEnd = offset + 1 + width
    let end = headerEnd
    let value: CborValue
    const children: CborNode[] = []
    if (mt === 0 || mt === 1) {
      value = integer(bytes, offset, options).value
      check(8)
    } else if (mt === 7) {
      value = float(bytes, offset, options).value
      check(8)
    } else if (mt === 2 || mt === 3) {
      if (ai !== 31) {
        if (argument > limits.maxStringLength) throw new Error(`String length ${argument} exceeds limit of ${limits.maxStringLength} bytes`)
        if (argument > bytes.length - headerEnd) throw new Error(`Insufficient data: expected ${argument} bytes at offset ${headerEnd}`)
        check(Number(argument) * (mt === 3 ? 2 : 1))
        const result = mt === 2 ? strings.parseByteString(bytes, offset, options) : strings.parseTextString(bytes, offset, options)
        value = result.value
        end = offset + result.bytesRead
      } else {
        let length = 0
        while (bytes[end] !== 255) {
          check()
          if (bytes[end] === undefined) throw new Error('Incomplete indefinite string: missing break marker')
          if ((bytes[end]! >> 5) !== mt || (bytes[end]! & 31) === 31) throw new Error('Indefinite string must contain only definite-length chunks of the same type')
          const child = scan(end, depth, tagDepth, bytes)
          length += child.end - child.headerEnd
          if (length > limits.maxStringLength) throw new Error(`String length ${length} exceeds limit of ${limits.maxStringLength} bytes`)
          children.push(child)
          end = child.end
        }
        end++
        check(length * (mt === 3 ? 2 : 1))
        if (mt === 2) {
          const joined = new Uint8Array(length)
          let pos = 0
          for (const child of children) { joined.set(child.value as Uint8Array, pos); pos += (child.value as Uint8Array).length }
          value = { type: 'cbor-byte-string', bytes: joined, chunks: children.map(c => c.value as Uint8Array), [INDEFINITE_SYMBOL]: true }
        } else value = { type: 'cbor-text-string', text: children.map(c => c.value).join(''), chunks: children.map(c => c.value as string), [INDEFINITE_SYMBOL]: true }
      }
    } else if (mt === 4 || mt === 5) {
      if (depth >= limits.maxDepth) throw new Error(`Maximum nesting depth ${limits.maxDepth} exceeded`)
      const limit = mt === 4 ? limits.maxArrayLength : limits.maxMapSize
      if (ai !== 31 && argument > limit) throw new Error(`${mt === 4 ? 'Array length' : 'Map size'} ${argument} exceeds limit of ${limit}`)
      const count = ai === 31 ? Infinity : Number(argument)
      const seen = new Set<string>()
      let previous: CborNode | undefined
      const entries: [CborValue, CborValue][] = []
      for (let i = 0; i < count; i++) {
        check()
        if (ai === 31 && bytes[end] === 255) { end++; break }
        if (bytes[end] === undefined) throw new Error(ai === 31 ? 'Incomplete indefinite collection: missing break marker' : `Unexpected end of buffer while parsing ${mt === 4 ? 'array element' : 'map entry'} ${i}/${count}`)
        if (i >= limit) throw new Error(`${mt === 4 ? 'Array length' : 'Map size'} exceeds limit of ${limit}`)
        check(mt === 4 ? 8 : 16)
        const child = scan(end, depth + 1, tagDepth, bytes)
        children.push(child)
        end = child.end
        if (mt === 5) {
          const key = nodeKey(child)
          if (seen.has(key)) {
            if (options.dupMapKeyMode === 'reject') throw new Error('Duplicate map key detected')
            if (options.dupMapKeyMode === 'warn') logger.warn('Duplicate map key detected; all entries preserved in ALL_ENTRIES_SYMBOL')
          }
          seen.add(key)
          if (options.validateCanonical && previous && compareMapKeys(previous.raw, child.raw, options.mapKeyOrder) >= 0) throw new Error('Map keys not in canonical order')
          previous = child
          if (bytes[end] === undefined) throw new Error(`Unexpected end of buffer while parsing map value for entry ${i}/${count}`)
          const item = scan(end, depth + 1, tagDepth, bytes)
          children.push(item)
          entries.push([child.value, item.value])
          end = item.end
        }
      }
      value = mt === 4 ? children.map(child => child.value) : new Map<CborValue, CborValue>()
      if (value instanceof Map) {
        const numericKeys = new Map<number, CborNode>()
        for (let i = 0; i < entries.length; i++) {
          const [key, val] = entries[i]!
          const keyNode = children[i * 2]!
          const previousNode = typeof key === 'number' ? numericKeys.get(key) : undefined
          if (previousNode && nodeKey(previousNode) !== nodeKey(keyNode)) {
            if (keyNode.majorType === 7) value.set({ type: 'cbor-float', value: key as number, bytes: keyNode.raw.slice() }, val)
            else {
              const oldValue = value.get(key)
              value.delete(key)
              value.set({ type: 'cbor-float', value: key as number, bytes: previousNode.raw.slice() }, oldValue)
              value.set(key, val)
              numericKeys.set(key as number, keyNode)
            }
          } else {
            value.set(key, val)
            if (typeof key === 'number') numericKeys.set(key, keyNode)
          }
          // Entry metadata is also used by the encoder: preserve float key type.
          if (keyNode.majorType === 7 && keyNode.additionalInfo >= 25) entries[i] = [{ type: 'cbor-float', value: key as number, bytes: keyNode.raw.slice() }, val]
        }
      }
      if (mt === 5) Object.defineProperty(value, ALL_ENTRIES_SYMBOL, { value: entries, configurable: true })
      if (ai === 31) Object.defineProperty(value, INDEFINITE_SYMBOL, { value: true, configurable: true })
    } else {
      if (tagDepth >= limits.maxTagDepth) throw new Error(`Tag nesting depth exceeds limit of ${limits.maxTagDepth}`)
      if (bytes[end] === undefined) throw new Error(`Unexpected end of buffer after tag ${argument}`)
      const child = scan(end, depth, tagDepth + 1, bytes)
      children.push(child)
      end = child.end
      // Validate the wire content before converting bignums to convenience values.
      tags.validateTagSemantics(argument, child.value, { ...options, validateSetUniqueness: false })
      if (options.validateTagSemantics && (argument === 4 || argument === 5)) {
        const [exponent, mantissa] = child.children
        if (!exponent || exponent.majorType > 1) throw new Error(`Tag ${argument} exponent must be an integer`)
        if (!mantissa || !(mantissa.majorType <= 1 || (mantissa.majorType === 6 && [2, 3].includes(Number((mantissa.value as TaggedValue).tag))))) throw new Error(`Tag ${argument} mantissa must be an integer or bignum`)
      }
      if (options.validateTagSemantics && argument === 24) {
        if (child.majorType !== 2) throw new Error('Tag 24 must contain a byte string')
        const embedded = byteContent(child.value)
        const item = scan(0, depth + 1, tagDepth + 1, embedded)
        if (item.end !== embedded.length) throw new Error('Tag 24 must contain exactly one encoded CBOR data item')
      }
      let content = child.value
      if ((argument === 2 || argument === 3) && child.majorType === 2) {
        const data = byteContent(content)
        if (data.length > limits.maxBignumBytes) throw new Error(`Bignum (tag ${argument}) size ${data.length} bytes exceeds limit of ${limits.maxBignumBytes} bytes`)
        let big = 0n
        for (const byte of data) { check(); big = (big << 8n) | BigInt(byte) }
        content = argument === 2 ? big : -1n - big
      }
      const plutus = tags.decodePlutusConstructor(argument, child.value)
      value = { tag: argument, value: content, ...(plutus ? { plutus } : {}) }
      if (options.validatePlutusSemantics && plutus) validatePlutusNode(child, argument === 102)
      if (options.validateSetUniqueness && argument === 258 && child.majorType === 4) {
        const keys = child.children.map(item => nodeKey(item))
        if (new Set(keys).size !== keys.length) throw new Error('Duplicate items in set (tag 258)')
      }
      check(16)
    }
    const node = { majorType: mt, additionalInfo: ai, start: offset, headerEnd, end, raw: bytes.subarray(offset, end), value, children }
    if (mt === 6 && options.validateRegisteredTags) validateRegisteredTag(node)
    return node
  }
  return { scan, options }
}

function byteContent(value: CborValue): Uint8Array {
  return value instanceof Uint8Array ? value : (value as CborByteString).bytes
}

function validatePlutusNode(content: CborNode, alternative: boolean) {
  const validate = (node: CborNode): void => {
    if (node.majorType <= 1) return
    if (node.majorType === 2) {
      if (node.additionalInfo === 31) { node.children.forEach(validate); return }
      if (node.end - node.headerEnd <= 64) return
      throw new Error('Plutus byte string chunks must be at most 64 bytes')
    }
    if (node.majorType === 4 || node.majorType === 5) { node.children.forEach(validate); return }
    if (node.majorType === 6) {
      const tag = (node.value as TaggedValue).tag
      if ((tag === 2 || tag === 3) && node.children[0]?.majorType === 2) { validate(node.children[0]); return }
      if ((node.value as TaggedValue).plutus) return // already recursively checked by scanner
    }
    throw new Error('Invalid Plutus data: expected integer, bytes, list, map, or constructor')
  }
  if (alternative) {
    if (content.children[0]?.majorType !== 0) throw new Error('Plutus constructor index must be an unsigned integer')
    content.children[1]!.children.forEach(validate)
  } else content.children.forEach(validate)
}

/** Linear traversal; map paths use entry indices whenever a display key is ambiguous. */
export function sourceMapFor(root: CborNode): SourceMapEntry[] {
  const entries: SourceMapEntry[] = []
  const visit = (node: CborNode, path: string, parent?: string) => {
    const mt = node.majorType
    const container = mt >= 2 && mt <= 6
    const entry: SourceMapEntry = { path, start: node.start, end: container ? node.headerEnd : node.end, majorType: mt, type: '' }
    if (parent !== undefined) entry.parent = parent
    if (container) Object.assign(entry, { isHeader: true, headerEnd: node.headerEnd, children: [] })
    entries.push(entry)
    if (mt === 0 || mt === 1) entry.type = mt === 0 ? 'Unsigned Integer' : 'Negative Integer'
    else if (mt === 7) entry.type = node.additionalInfo >= 25 ? `Float${2 ** (node.additionalInfo - 21)}` : node.additionalInfo >= 20 && node.additionalInfo <= 23 ? `Simple: ${String(node.value)}` : `Simple Value ${typeof node.value === 'object' && node.value ? (node.value as { simpleValue: number }).simpleValue : node.additionalInfo}`
    else if (mt === 2 || mt === 3) {
      const length = mt === 2 ? byteContent(node.value).length : typeof node.value === 'string' ? node.value.length : (node.value as { text: string }).text.length
      entry.type = `${mt === 2 ? 'bytes' : 'text'}(${length})`
      if (node.additionalInfo === 31) {
        node.children.forEach((child, i) => { const p = `${path}#chunk${i}`; entry.children!.push(p); visit(child, p, path) })
      } else if (length) {
        entry.contentPath = `${path}#content`
        entry.children!.push(entry.contentPath)
        entries.push({ path: entry.contentPath, start: node.headerEnd, end: node.end, majorType: mt, type: mt === 2 ? `→ ${length} bytes` : `→ "${node.value}"`, isContent: true, parent: path })
      }
    } else if (mt === 4) {
      entry.type = `array(${node.additionalInfo === 31 ? '*' : node.children.length})`
      node.children.forEach((child, i) => { const p = `${path}[${i}]`; entry.children!.push(p); visit(child, p, path) })
    } else if (mt === 5) {
      entry.type = `map(${node.additionalInfo === 31 ? '*' : node.children.length / 2})`
      const labels = node.children.filter((_, i) => i % 2 === 0).map(n => String(n.value))
      const counts = new Map<string, number>()
      labels.forEach(label => counts.set(label, (counts.get(label) ?? 0) + 1))
      for (let i = 0; i < node.children.length; i += 2) {
        const key = node.children[i]!
        const label = labels[i / 2]!
        const p = counts.get(label) === 1 && key.majorType <= 3 && /^[\w-]+$/.test(label) ? `${path}.${label}` : `${path}#entry${i / 2}.value`
        const kp = `${path}#key${i / 2}`
        entry.children!.push(p)
        visit(key, kp, path)
        visit(node.children[i + 1]!, p, path)
      }
    } else {
      entry.type = `tag(${(node.value as TaggedValue).tag})`
      const p = `${path}.value`
      entry.children!.push(p)
      visit(node.children[0]!, p, path)
    }
    if (entry.children?.length === 0 && (mt === 4 || mt === 5)) delete entry.children
  }
  visit(root, '')
  return entries
}
