import type { ParseOptions, TaggedValue, CborValue } from './types'
import { ALL_ENTRIES_SYMBOL, INDEFINITE_SYMBOL } from './types'
import type { CborNode } from './scanner'
import { createScanner, inputBytes, resolveOptions, nodeKey, sourceMapFor } from './scanner'
import { bytesToHex } from './utils'
import { useCborEncoder } from '../encoder/composables/useCborEncoder'
import type { EncodeOptions, EncodableValue } from '../encoder/types'
import { useCborDiagnostic } from './composables/useCborDiagnostic'

/** Decode a wire tree without losing types, widths, map entries, or chunks. */
export function decodeLossless(input: string | Uint8Array, options?: ParseOptions) {
  const resolved = resolveOptions(options)
  const bytes = inputBytes(input, resolved)
  if (!bytes.length) throw new Error('Empty input')
  const node = createScanner(bytes, resolved).scan(0)
  if (!resolved.allowTrailingData && node.end !== bytes.length) throw new Error('Trailing data after the top-level CBOR item')
  return { node, value: node.value, bytesRead: node.end, sourceMap: sourceMapFor(node) }
}

/** Original encoding from a wire snapshot; ignores changes to convenience values. */
export function encodeLossless(node: CborNode, options?: Partial<EncodeOptions>) {
  if (options?.canonical) return useCborEncoder(options).encode(nodeToValue(node))
  const bytes = node.raw.slice()
  if (bytes.length > (options?.maxOutputSize ?? 100 * 1024 * 1024)) throw new Error('Encoded output size exceeds limit')
  return { bytes, hex: bytesToHex(bytes) }
}

function nodeToValue(node: CborNode): EncodableValue {
  if (node.majorType === 7 && node.additionalInfo >= 25) return { type: 'cbor-float', value: node.value as number, bytes: node.raw }
  if (node.majorType === 6) return { tag: (node.value as TaggedValue).tag, value: nodeToValue(node.children[0]!) }
  if (node.majorType === 4) return node.children.map(nodeToValue)
  if (node.majorType === 5) {
    const entries: [EncodableValue, EncodableValue][] = []
    for (let i = 0; i < node.children.length; i += 2) entries.push([nodeToValue(node.children[i]!), nodeToValue(node.children[i + 1]!)])
    const map = new Map(entries)
    Object.defineProperty(map, ALL_ENTRIES_SYMBOL, { value: entries })
    return map
  }
  if (node.majorType === 2 && node.additionalInfo === 31) return (node.value as { bytes: Uint8Array }).bytes
  if (node.majorType === 3 && node.additionalInfo === 31) return (node.value as { text: string }).text
  return node.value as EncodableValue
}

export function cborSemanticEqual(a: CborNode, b: CborNode): boolean { return nodeKey(a, true) === nodeKey(b, true) }

/** CBOR diagnostic notation from wire types, including integral floats and bignums. */
export function nodeToDiagnostic(node: CborNode, options: { showOffsets?: boolean; pretty?: boolean; indent?: string } = {}): string {
  const plain = useCborDiagnostic().toDiagnostic
  const render = (n: CborNode, depth: number): string => {
    const indefinite = n.additionalInfo === 31
    let text: string
    if (n.majorType === 6) text = `${(n.value as TaggedValue).tag}(${render(n.children[0]!, depth)})`
    else if (n.majorType === 4 || n.majorType === 5) {
      const parts: string[] = []
      for (let i = 0; i < n.children.length; i += n.majorType === 5 ? 2 : 1) parts.push(n.majorType === 5 ? `${render(n.children[i]!, depth + 1)}: ${render(n.children[i + 1]!, depth + 1)}` : render(n.children[i]!, depth + 1))
      const [open, close] = n.majorType === 4 ? ['[', ']'] : ['{', '}']
      const indent = options.indent ?? '  '
      text = options.pretty && parts.length ? `${open}${indefinite ? '_' : ''}\n${indent.repeat(depth + 1)}${parts.join(',\n' + indent.repeat(depth + 1))}\n${indent.repeat(depth)}${close}` : `${open}${indefinite ? '_ ' : ''}${parts.join(', ')}${close}`
    } else if ((n.majorType === 2 || n.majorType === 3) && indefinite) text = n.children.length ? `(_ ${n.children.map(c => render(c, depth)).join(', ')})` : n.majorType === 2 ? "h''_" : '""_'
    else if (n.majorType === 7 && n.additionalInfo >= 25 && Number.isInteger(n.value)) text = Object.is(n.value, -0) ? '-0.0' : `${n.value}.0`
    else text = plain(n.value)
    return options.showOffsets ? `${text} /* ${n.start}-${n.end} */` : text
  }
  return render(node, 0)
}

/** Versioned JSON transport. Every value is typed; user map keys never act as markers. */
export type CborJson =
  | { type: 'integer' | 'float' | 'bytes' | 'text'; value: string }
  | { type: 'simple'; value: number }
  | { type: 'array'; value: CborJson[] }
  | { type: 'map'; value: [CborJson, CborJson][] }
  | { type: 'tag'; tag: string; value: CborJson }

export function nodeToCborJson(node: CborNode): CborJson {
  if (node.majorType === 4) return { type: 'array', value: node.children.map(nodeToCborJson) }
  if (node.majorType === 5) {
    const value: [CborJson, CborJson][] = []
    for (let i = 0; i < node.children.length; i += 2) value.push([nodeToCborJson(node.children[i]!), nodeToCborJson(node.children[i + 1]!)])
    return { type: 'map', value }
  }
  if (node.majorType === 6) return { type: 'tag', tag: String((node.value as TaggedValue).tag), value: nodeToCborJson(node.children[0]!) }
  if (node.majorType === 7 && node.additionalInfo >= 25) return { type: 'float', value: Number.isNaN(node.value) ? nodeKey(node) : Object.is(node.value, -0) ? '-0' : String(node.value) }
  return valueToCborJson(node.value)
}

export function valueToCborJson(value: unknown): CborJson {
  if (value === false || value === true || value === null || value === undefined) return { type: 'simple', value: value === false ? 20 : value === true ? 21 : value === null ? 22 : 23 }
  if (typeof value === 'bigint') return { type: 'integer', value: String(value) }
  if (typeof value === 'number') return { type: Number.isSafeInteger(value) && !Object.is(value, -0) ? 'integer' : 'float', value: Object.is(value, -0) ? '-0' : String(value) }
  if (typeof value === 'string') return { type: 'text', value }
  if (value instanceof Uint8Array) return { type: 'bytes', value: bytesToHex(value) }
  if (Array.isArray(value)) return { type: 'array', value: value.map(valueToCborJson) }
  if (value && typeof value === 'object') {
    if ('type' in value && value.type === 'cbor-byte-string' && 'bytes' in value) return valueToCborJson(value.bytes)
    if ('type' in value && value.type === 'cbor-text-string' && 'text' in value) return valueToCborJson(value.text)
    if ('type' in value && value.type === 'cbor-float' && 'value' in value) return { type: 'float', value: Object.is(value.value, -0) ? '-0' : String(value.value) }
    if ('simpleValue' in value) return { type: 'simple', value: Number(value.simpleValue) }
    if ('tag' in value && 'value' in value) return { type: 'tag', tag: String(value.tag), value: valueToCborJson(value.value) }
    const pairs = value instanceof Map ? ((value as Map<CborValue, CborValue> & { [ALL_ENTRIES_SYMBOL]?: [CborValue, CborValue][] })[ALL_ENTRIES_SYMBOL] ?? [...value]) : Object.entries(value)
    return { type: 'map', value: pairs.map(([k, v]) => [valueToCborJson(k), valueToCborJson(v)]) }
  }
  throw new Error(`Unsupported CBOR JSON value: ${typeof value}`)
}

export function cborJsonToValue(json: CborJson, preserveFloatType = false, depth = 0): CborValue {
  if (depth > 100) throw new Error('CBOR JSON nesting depth exceeds limit')
  if (!json || typeof json !== 'object' || !('type' in json)) throw new Error('Invalid CBOR JSON item')
  const next = (item: CborJson, floats = preserveFloatType) => cborJsonToValue(item, floats, depth + 1)
  if (typeof json.value === 'string' && json.value.length > 2 * 1024 * 1024) throw new Error('CBOR JSON string size exceeds limit')
  switch (json.type) {
    case 'integer': { if (!/^-?(0|[1-9][0-9]*)$/.test(json.value)) throw new Error('Invalid CBOR JSON integer'); const big = BigInt(json.value); return big >= BigInt(Number.MIN_SAFE_INTEGER) && big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big }
    case 'float': {
      if (!/^(?:-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:e[+-]?[0-9]+)?|NaN|-?Infinity|nan:[01]:[0-9]+)$/i.test(json.value)) throw new Error('Invalid CBOR JSON float')
      const value = json.value.startsWith('nan:') ? NaN : Number(json.value)
      if (!preserveFloatType) return value
      if (json.value.startsWith('nan:')) {
        const [, sign, payload] = json.value.split(':')
        const significand = BigInt(payload!)
        if (significand <= 0n || significand >= 1n << 64n || (significand & 4095n) !== 0n) throw new Error('Invalid NaN payload')
        const bytes = new Uint8Array(9); bytes[0] = 0xfb
        new DataView(bytes.buffer).setBigUint64(1, (BigInt(sign!) << 63n) | (2047n << 52n) | (significand >> 12n))
        return { type: 'cbor-float', value, bytes }
      }
      return { type: 'cbor-float', value }
    }
    case 'text': return json.value
    case 'bytes': return inputBytes(json.value, {})
    case 'simple': if (!Number.isInteger(json.value) || json.value < 0 || json.value > 255 || (json.value >= 24 && json.value < 32)) throw new Error('Invalid CBOR JSON simple value'); return json.value === 20 ? false : json.value === 21 ? true : json.value === 22 ? null : json.value === 23 ? undefined : { simpleValue: json.value }
    case 'array': if (!Array.isArray(json.value) || json.value.length > 10000) throw new Error('Invalid CBOR JSON array'); return json.value.map(item => next(item))
    case 'map': {
      if (!Array.isArray(json.value) || json.value.length > 10000) throw new Error('Invalid CBOR JSON map')
      const entries: [CborValue, CborValue][] = json.value.map(pair => {
        if (!Array.isArray(pair) || pair.length !== 2) throw new Error('Invalid CBOR JSON map entry')
        return [next(pair[0], true), next(pair[1])]
      })
      const map = new Map(entries)
      Object.defineProperty(map, ALL_ENTRIES_SYMBOL, { value: entries })
      return map
    }
    case 'tag': { if (!/^(0|[1-9][0-9]*)$/.test(json.tag) || json.tag.length > 20) throw new Error('Invalid CBOR JSON tag'); const tag = BigInt(json.tag); if (tag > 18446744073709551615n) throw new Error('Invalid CBOR JSON tag'); return { tag: tag <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(tag) : tag, value: next(json.value) } }
    default: throw new Error('Unknown CBOR JSON type')
  }
}

/** Attach a chunking preference to a value reconstructed from diagnostic notation. */
export function indefiniteValue<T extends object>(value: T): T {
  Object.defineProperty(value, INDEFINITE_SYMBOL, { value: true })
  return value
}
