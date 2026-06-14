/**
 * CBOR Encoder Utility Functions
 */

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Concatenate multiple Uint8Arrays
 */
export function concatenateUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLength)

  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }

  return result
}

/**
 * Compare two Uint8Arrays length-first (RFC 7049 §3.9 / Cardano CIP-21 ordering).
 * Shorter keys sort first; equal-length keys are compared bytewise.
 */
export function compareBytes(a: Uint8Array, b: Uint8Array): number {
  // First, compare lengths
  if (a.length !== b.length) {
    return a.length - b.length
  }

  // Then, compare bytewise
  for (let i = 0; i < a.length; i++) {
    const byteA = a[i]
    const byteB = b[i]
    if (byteA === undefined || byteB === undefined) {
      throw new Error(`Unexpected undefined byte at index ${i}`)
    }
    if (byteA !== byteB) {
      return byteA - byteB
    }
  }

  return 0
}

/**
 * Compare two Uint8Arrays in pure bytewise lexicographic order
 * (RFC 8949 §4.2.1 core deterministic encoding). If one is a prefix of the
 * other, the shorter sorts first.
 */
export function compareBytesLexicographic(a: Uint8Array, b: Uint8Array): number {
  const min = Math.min(a.length, b.length)
  for (let i = 0; i < min; i++) {
    const byteA = a[i]!
    const byteB = b[i]!
    if (byteA !== byteB) {
      return byteA - byteB
    }
  }
  return a.length - b.length
}

/**
 * Compare two encoded map keys according to the requested ordering.
 *
 * @param order - 'length-first' (CIP-21 / RFC 7049 §3.9, default) or
 *                'bytewise' (RFC 8949 §4.2.1 core deterministic)
 */
export function compareMapKeys(
  a: Uint8Array,
  b: Uint8Array,
  order: 'length-first' | 'bytewise' = 'length-first'
): number {
  return order === 'bytewise' ? compareBytesLexicographic(a, b) : compareBytes(a, b)
}

/**
 * Write unsigned integer to bytes (big-endian)
 */
export function writeUint(value: number, bytes: number): Uint8Array {
  const result = new Uint8Array(bytes)

  for (let i = bytes - 1; i >= 0; i--) {
    result[i] = value & 0xff
    value = value >>> 8
  }

  return result
}

/**
 * Write BigInt to bytes (big-endian)
 */
export function writeBigUint(value: bigint, bytes: number): Uint8Array {
  const result = new Uint8Array(bytes)

  for (let i = bytes - 1; i >= 0; i--) {
    result[i] = Number(value & 0xffn)
    value = value >> 8n
  }

  return result
}
