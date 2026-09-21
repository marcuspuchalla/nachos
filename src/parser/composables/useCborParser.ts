/** Unified public decoding entry points. */
import type { ParseOptions, ParseResult, ParseResultWithMap, TaggedValue } from '../types'
import { createScanner, inputBytes, resolveOptions, sourceMapFor } from '../scanner'

export function useCborParser() {
  const read = (input: string | Uint8Array, options?: ParseOptions, sequence = false) => {
    const resolved = resolveOptions(options)
    const bytes = inputBytes(input, resolved)
    if (!sequence && !bytes.length) throw new Error('Empty hex string / Empty input')
    const scanner = createScanner(bytes, resolved)
    const nodes = []
    let offset = 0
    while (offset < bytes.length) {
      const node = scanner.scan(offset)
      nodes.push(node)
      offset = node.end
      if (!sequence) break
    }
    if (!sequence && !resolved.allowTrailingData && offset !== bytes.length) throw new Error(`Trailing data: ${bytes.length - offset} byte(s) remain after the top-level CBOR item. Use parseSequence to decode multiple items.`)
    return { nodes, resolved }
  }
  const unwrap = (value: ParseResult['value'], options: ParseOptions) => options.unwrapSelfDescribed && value && typeof value === 'object' && 'tag' in value && value.tag === 55799 ? (value as TaggedValue).value : value
  const parse = (input: string | Uint8Array, options?: ParseOptions): ParseResult => {
    const { nodes, resolved } = read(input, options)
    return { value: unwrap(nodes[0]!.value, resolved), bytesRead: nodes[0]!.end }
  }
  const parseWithSourceMap = (input: string | Uint8Array, options?: ParseOptions): ParseResultWithMap => {
    const { nodes, resolved } = read(input, options)
    return { value: unwrap(nodes[0]!.value, resolved), bytesRead: nodes[0]!.end, sourceMap: sourceMapFor(nodes[0]!) }
  }
  const parseSequence = (input: string | Uint8Array, options?: ParseOptions) => {
    const { nodes, resolved } = read(input, options, true)
    return nodes.map(node => unwrap(node.value, resolved))
  }
  const parseSequenceWithSourceMap = (input: string | Uint8Array, options?: ParseOptions) => {
    const { nodes, resolved } = read(input, options, true)
    return { values: nodes.map(node => unwrap(node.value, resolved)), sourceMaps: nodes.map(sourceMapFor) }
  }
  return { parse, parseWithSourceMap, parseSequence, parseSequenceWithSourceMap }
}
