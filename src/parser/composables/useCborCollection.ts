/** Collection entry points share the bounded CBOR scanner. */
import type { ParseOptions, ParseResult } from '../types'
import { createScanner, inputBytes, resolveOptions } from '../scanner'

export function useCborCollection() {
  const parseBuffer = (buffer: Uint8Array, offset: number, majorType: number, options?: ParseOptions, depth = 0): ParseResult => {
    if ((buffer[offset]! >> 5) !== majorType) throw new Error(`Expected major type ${majorType} (${majorType === 4 ? 'array' : 'map'}), got ${buffer[offset]! >> 5}`)
    const node = createScanner(buffer, options).scan(offset, depth)
    return { value: node.value, bytesRead: node.end - offset }
  }
  const parseArrayFromBuffer = (buffer: Uint8Array, offset = 0, options?: ParseOptions, depth = 0) => parseBuffer(buffer, offset, 4, options, depth)
  const parseMapFromBuffer = (buffer: Uint8Array, offset = 0, options?: ParseOptions, depth = 0) => parseBuffer(buffer, offset, 5, options, depth)
  const parseArray = (hex: string, options?: ParseOptions) => parseArrayFromBuffer(inputBytes(hex, resolveOptions(options)), 0, options)
  const parseMap = (hex: string, options?: ParseOptions) => parseMapFromBuffer(inputBytes(hex, resolveOptions(options)), 0, options)
  return { parseArray, parseMap, parseArrayFromBuffer, parseMapFromBuffer }
}
