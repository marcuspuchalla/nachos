import { ALL_ENTRIES_SYMBOL } from '../parser/types'

/** Check a lower bound before allocating the encoded buffers. The final exact check remains authoritative. */
export function checkEncodingBudget(value: unknown, maxBytes: number, maxDepth: number): void {
  if (!Number.isFinite(maxBytes) || maxBytes < 0) throw new Error('Invalid encoder output size limit')
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 0) throw new Error('Invalid encoder nesting depth limit')
  let size = 0
  const add = (bytes: number) => {
    size += bytes
    if (size > maxBytes) throw new Error(`Encoded output exceeds maximum size: ${size} bytes exceeds limit of ${maxBytes} bytes`)
  }
  const visit = (item: unknown, depth: number): void => {
    if (depth > maxDepth) throw new Error(`Maximum nesting depth exceeded (limit ${maxDepth})`)
    add(1)
    if (typeof item === 'string') {
      for (let i = 0; i < item.length; i++) {
        const code = item.charCodeAt(i)
        if (code < 128) add(1)
        else if (code < 2048) add(2)
        else if (code >= 0xd800 && code <= 0xdbff && i + 1 < item.length && item.charCodeAt(i + 1) >= 0xdc00 && item.charCodeAt(i + 1) <= 0xdfff) { add(4); i++ }
        else add(3)
      }
    } else if (item instanceof Uint8Array) add(item.length)
    else if (Array.isArray(item)) for (const child of item) visit(child, depth + 1)
    else if (item && typeof item === 'object') {
      if ('tag' in item && 'value' in item) visit(item.value, depth + 1)
      else if ('type' in item && item.type === 'cbor-byte-string' && 'bytes' in item) add((item.bytes as Uint8Array).length)
      else if ('type' in item && item.type === 'cbor-text-string' && 'text' in item) { size--; visit(item.text, depth) }
      else if ('type' in item && item.type === 'cbor-float') add(2)
      else if (!('simpleValue' in item)) {
        const entries = item instanceof Map ? ((item as Map<unknown, unknown> & { [ALL_ENTRIES_SYMBOL]?: [unknown, unknown][] })[ALL_ENTRIES_SYMBOL] ?? item.entries()) : Object.entries(item)
        for (const [key, val] of entries) { visit(key, depth + 1); visit(val, depth + 1) }
      }
    }
  }
  visit(value, 0)
}
