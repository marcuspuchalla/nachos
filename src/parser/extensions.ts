/** Opt-in registered-tag validation. Core decoding always retains unknown tags. */
import type { CborNode } from './scanner'
import type { TaggedValue } from './types'
import { decodeIpAddress } from './ip'
import { decodeExtendedTime } from './time'

const tagOf = (node: CborNode) => node.majorType === 6 ? Number((node.value as TaggedValue).tag) : -1
const bytesOf = (node: CborNode): Uint8Array => {
  if (node.majorType !== 2) throw new Error('Registered tag requires a byte string')
  return node.value instanceof Uint8Array ? node.value : (node.value as { bytes: Uint8Array }).bytes
}
const isTyped = (tag: number) => tag >= 64 && tag <= 87 && tag !== 76
const widthOf = (tag: number) => 2 ** ((tag & 3) + (tag >= 80 ? 1 : 0))

/** Lazy RFC 8746 view: no bulk conversion/allocation; binary128 remains exact bits. */
export function typedArrayView(node: CborNode) {
  const tag = tagOf(node)
  if (!isTyped(tag)) throw new Error('Not a registered RFC 8746 typed array')
  const bytes = bytesOf(node.children[0]!)
  const width = widthOf(tag), littleEndian = !!(tag & 4), floating = tag >= 80, signed = !floating && !!(tag & 8)
  if (bytes.length % width) throw new Error('Typed array payload is not aligned to its element width')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length)
  return {
    length: bytes.length / width, bytesPerElement: width, littleEndian, floating, signed, clamped: tag === 68,
    at(index: number): number | bigint | { binary128: bigint } {
      if (!Number.isInteger(index) || index < 0 || index >= bytes.length / width) throw new RangeError('Typed array index out of bounds')
      const offset = index * width
      if (floating && width === 4) return view.getFloat32(offset, littleEndian)
      if (floating && width === 8) return view.getFloat64(offset, littleEndian)
      let bits = 0n
      for (let i = 0; i < width; i++) bits = (bits << 8n) | BigInt(bytes[offset + (littleEndian ? width - 1 - i : i)]!)
      if (floating && width === 16) return { binary128: bits }
      if (floating) {
        const n = Number(bits), sign = n & 32768 ? -1 : 1, exp = n >> 10 & 31, fraction = n & 1023
        return exp === 31 ? fraction ? NaN : sign * Infinity : sign * (exp === 0 ? fraction * 2 ** -24 : (1024 + fraction) * 2 ** (exp - 25))
      }
      const integer = signed ? BigInt.asIntN(width * 8, bits) : bits
      return width === 8 ? integer : Number(integer)
    }
  }
}

/** RFC 9090, including relative identifiers and the PEN prefix. */
export function decodeObjectIdentifier(bytes: Uint8Array, tag: 110 | 111 | 112 = 111): bigint[] {
  const arcs: bigint[] = []
  let value = 0n, first = true
  for (const byte of bytes) {
    if (first && byte === 128) throw new Error('OID subidentifier has a leading zero')
    value = (value << 7n) | BigInt(byte & 127)
    first = !(byte & 128)
    if (first) { arcs.push(value); value = 0n }
  }
  if (!first) throw new Error('Incomplete OID subidentifier')
  if (tag === 111) {
    if (!arcs.length) throw new Error('Absolute OID cannot be empty')
    const combined = arcs.shift()!
    const initial = combined < 40n ? 0n : combined < 80n ? 1n : 2n
    arcs.unshift(initial, combined - initial * 40n)
  } else if (tag === 112) arcs.unshift(1n, 3n, 6n, 1n, 4n, 1n)
  return arcs
}

export function validateRegisteredTag(node: CborNode): void {
  const tag = tagOf(node), content = node.children[0]!
  if (tag === 52 || tag === 54) { decodeIpAddress(node); return }
  if (tag >= 1001 && tag <= 1003) { decodeExtendedTime(node); return }
  if (isTyped(tag)) { typedArrayView(node); return }
  if (tag === 76) throw new Error('RFC 8746 tag 76 is reserved')
  if (tag === 41 && content.majorType !== 4) throw new Error('Homogeneous array tag 41 requires an array')
  if (tag === 40 || tag === 1040) {
    if (content.majorType !== 4 || content.children.length !== 2) throw new Error('Multidimensional array requires [dimensions, contents]')
    const [dimensions, data] = content.children
    if (dimensions!.majorType !== 4) throw new Error('Dimensions must be an array of unsigned integers')
    let count = 1n
    for (const dimension of dimensions!.children) {
      if (dimension.majorType !== 0 || dimension.value === 0) throw new Error('Dimensions must be nonzero unsigned integers')
      count *= BigInt(dimension.value as number | bigint)
      if (count > 18446744073709551615n) throw new Error('Dimension product exceeds supported array size')
    }
    const dataTag = tagOf(data!)
    const length = data!.majorType === 4 ? data!.children.length : isTyped(dataTag) ? typedArrayView(data!).length : dataTag === 41 && data!.children[0]!.majorType === 4 ? data!.children[0]!.children.length : -1
    if (BigInt(length) !== count) throw new Error('Dimension product does not match array contents')
  }
  if (tag === 100 && content.majorType > 1) throw new Error('Epoch date tag 100 requires an integer')
  if (tag === 1004) {
    const text = typeof content.value === 'string' ? content.value : (content.value as { text?: string })?.text
    const match = typeof text === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
    if (content.majorType !== 3 || !match) throw new Error('Tag 1004 requires an RFC 3339 full-date')
    const year = +match[1]!, month = +match[2]!, day = +match[3]!
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if (month < 1 || month > 12 || day < 1 || day > days[month - 1]!) throw new Error('Invalid calendar date')
  }
  if (tag === 110 || tag === 111 || tag === 112) {
    if (![2, 4, 5].includes(content.majorType)) throw new Error('OID tag requires bytes, array or map')
    const visit = (item: CborNode): void => {
      if (item.majorType === 2) { decodeObjectIdentifier(bytesOf(item), tag); return }
      if (item.majorType === 4) item.children.forEach(visit)
      if (item.majorType === 5) item.children.forEach((child, i) => { if (i % 2 === 0) visit(child) })
    }
    visit(content)
  }
  if (tag === 37 && bytesOf(content).length !== 16) throw new Error('UUID tag requires exactly 16 bytes')
}
