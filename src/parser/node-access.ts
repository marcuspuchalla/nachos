/** Wire-type accessors shared by semantic validators. */
import type { CborNode } from './scanner'
import type { TaggedValue } from './types'

export const nodeTag = (node: CborNode): bigint | undefined => node.majorType === 6 ? BigInt((node.value as TaggedValue).tag) : undefined
export function nodeBytes(node: CborNode): Uint8Array {
  if (node.majorType !== 2) throw new Error('Expected a CBOR byte string')
  return node.value instanceof Uint8Array ? node.value : (node.value as { bytes: Uint8Array }).bytes
}
export function nodeText(node: CborNode): string {
  if (node.majorType !== 3) throw new Error('Expected a CBOR text string')
  return typeof node.value === 'string' ? node.value : (node.value as { text: string }).text
}
export function nodeInteger(node: CborNode): bigint {
  if (node.majorType > 1) throw new Error('Expected a CBOR integer')
  return BigInt(node.value as number | bigint)
}
export function nodeMap(node: CborNode): Array<[CborNode, CborNode]> {
  if (node.majorType !== 5) throw new Error('Expected a CBOR map')
  const entries: Array<[CborNode, CborNode]> = []
  for (let i = 0; i < node.children.length; i += 2) entries.push([node.children[i]!, node.children[i + 1]!])
  return entries
}
