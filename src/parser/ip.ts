/** RFC 9164 tags 52 and 54. Prefix bytes are checked before zero expansion. */
import type { CborNode } from './scanner'
import { nodeBytes, nodeInteger, nodeTag, nodeText } from './node-access'

export interface CborIpAddress {
  version: 4 | 6
  kind: 'address' | 'prefix' | 'interface'
  address: Uint8Array
  prefixLength?: number | null
  zone?: string | bigint
}

export function decodeIpAddress(node: CborNode): CborIpAddress {
  const tag = nodeTag(node)
  if (tag !== 52n && tag !== 54n) throw new Error('Expected RFC 9164 tag 52 or 54')
  const version = tag === 52n ? 4 : 6, size = version === 4 ? 4 : 16
  const content = node.children[0]!
  const prefix = (item: CborNode): number => {
    const value = nodeInteger(item)
    if (item.majorType !== 0 || value > BigInt(size * 8)) throw new Error('IP prefix length out of range')
    return Number(value)
  }
  const address = (item: CborNode): Uint8Array => {
    const bytes = nodeBytes(item)
    if (bytes.length !== size) throw new Error(`IPv${version} address requires ${size} bytes`)
    return bytes.slice()
  }
  if (content.majorType === 2) return { version, kind: 'address', address: address(content) }
  if (content.majorType !== 4 || content.children.length < 2 || content.children.length > 3) throw new Error('IP tag requires an address or a 2/3-element array')
  const [first, second, third] = content.children
  if (first!.majorType === 0) {
    if (third) throw new Error('An IP prefix cannot have a zone')
    const prefixLength = prefix(first!), bytes = nodeBytes(second!)
    if (bytes.length > size || bytes[bytes.length - 1] === 0) throw new Error('IP prefix must omit all trailing zero bytes')
    for (let i = 0; i < bytes.length; i++) {
      const available = Math.max(0, Math.min(8, prefixLength - i * 8))
      if (bytes[i]! & (255 >>> available)) throw new Error('IP prefix has nonzero bits beyond its prefix length')
    }
    const expanded = new Uint8Array(size)
    expanded.set(bytes)
    return { version, kind: 'prefix', address: expanded, prefixLength }
  }
  const result: CborIpAddress = { version, kind: 'interface', address: address(first!), prefixLength: second!.value === null ? null : prefix(second!) }
  if (third) {
    if (third.majorType !== 0 && third.majorType !== 3) throw new Error('IP zone must be an unsigned integer or text')
    result.zone = third.majorType === 0 ? nodeInteger(third) : nodeText(third)
  }
  return result
}

/** Stable display, compressing the longest IPv6 zero run (first run wins ties). */
export function formatIpAddress(ip: CborIpAddress): string {
  let text: string
  if (ip.version === 4) text = Array.from(ip.address).join('.')
  else {
    const words = Array.from({ length: 8 }, (_, i) => ((ip.address[i * 2]! << 8) | ip.address[i * 2 + 1]!).toString(16))
    let start = -1, length = 1
    for (let i = 0; i < words.length;) {
      if (words[i] !== '0') { i++; continue }
      let end = i
      while (words[end] === '0') end++
      if (end - i > length) { start = i; length = end - i }
      i = end
    }
    text = start < 0 ? words.join(':') : words.slice(0, start).join(':') + '::' + words.slice(start + length).join(':')
  }
  if (ip.zone !== undefined) text += `%${ip.zone}`
  if (ip.prefixLength !== undefined && ip.prefixLength !== null) text += `/${ip.prefixLength}`
  return text
}
