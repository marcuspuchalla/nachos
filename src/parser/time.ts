/** RFC 9581 extended time. Numeric components stay exact; no lossy Date coercion. */
import type { CborNode } from './scanner'
import { nodeBytes, nodeInteger, nodeMap, nodeTag, nodeText } from './node-access'

export type ExactTimeSeconds =
  | { kind: 'integer'; seconds: bigint; fraction?: { coefficient: bigint; exponent: number } }
  | { kind: 'float'; seconds: number }
  | { kind: 'scaled'; radix: 2 | 10; exponent: bigint; mantissa: bigint }
export interface ExtendedTime {
  kind: 'time' | 'duration'
  seconds: ExactTimeSeconds
  timescale: number | bigint | string
  timescaleCritical: boolean
  timeZone?: { value: string; critical: boolean }
  suffixes: Array<{ key: string; values: string[]; critical: boolean }>
  clockQuality: Map<number, number | ExtendedTime>
  /** Unknown elective information is retained, without assigning it semantics. */
  elective: Array<[CborNode, CborNode]>
}
export interface ExtendedPeriod { kind: 'period'; start: ExtendedTime | null; end: ExtendedTime | null; duration?: ExtendedTime }

const numeric = (node: CborNode) => node.majorType <= 1 || (node.majorType === 7 && node.additionalInfo >= 25 && node.additionalInfo <= 27)
function bigInteger(node: CborNode): bigint {
  if (node.majorType <= 1) return nodeInteger(node)
  const tag = nodeTag(node)
  if (tag !== 2n && tag !== 3n) throw new Error('Time mantissa must be an integer or bignum')
  let value = 0n
  for (const byte of nodeBytes(node.children[0]!)) value = value * 256n + BigInt(byte)
  return tag === 2n ? value : -1n - value
}

function detailed(content: CborNode, kind: 'time' | 'duration'): ExtendedTime {
  const entries = nodeMap(content), keys = new Map<string, CborNode>()
  for (const [key, value] of entries) {
    if (key.majorType > 1 && key.majorType !== 3) throw new Error('Extended time keys must be integers or text')
    const id = key.majorType === 3 ? `text:${nodeText(key)}` : nodeInteger(key).toString()
    if (keys.has(id)) throw new Error('Duplicate extended time key')
    keys.set(id, value)
    if (key.majorType === 0 && !['1', '4', '5', '10', '11', '13'].includes(id)) throw new Error(`Unknown critical time key ${id}`)
  }
  const bases = ['1', '4', '5'].filter(k => keys.has(k))
  if (bases.length !== 1) throw new Error('Extended time requires exactly one base time')
  const baseKey = bases[0]!, base = keys.get(baseKey)!
  let seconds: ExactTimeSeconds
  if (baseKey === '1') {
    if (!numeric(base)) throw new Error('Time key 1 requires an integer or float')
    seconds = base.majorType <= 1 ? { kind: 'integer', seconds: nodeInteger(base) } : { kind: 'float', seconds: base.value as number }
  } else {
    if (base.majorType !== 4 || base.children.length !== 2) throw new Error('Scaled time requires [exponent, mantissa]')
    seconds = { kind: 'scaled', radix: baseKey === '4' ? 10 : 2, exponent: nodeInteger(base.children[0]!), mantissa: bigInteger(base.children[1]!) }
  }
  const fractions = [-3, -6, -9, -12, -15, -18].filter(k => keys.has(String(k)))
  if (fractions.length > 1) throw new Error('At most one time fraction is allowed')
  if (fractions.length) {
    const fraction = keys.get(String(fractions[0]))!
    if (seconds.kind !== 'integer' || fraction.majorType !== 0) throw new Error('Fraction requires integer base key 1 and unsigned coefficient')
    // Coefficients need not be smaller than one second (RFC 9581 §3.3).
    seconds.fraction = { coefficient: nodeInteger(fraction), exponent: fractions[0]! }
  }
  const scales = ['-1', '-13', '13'].filter(k => keys.has(k))
  if (scales.length > 1) throw new Error('At most one timescale key is allowed')
  let timescale: number | bigint | string = 0
  if (scales.length) {
    const scale = keys.get(scales[0]!)!
    if (scale.majorType !== 0 && scale.majorType !== 3) throw new Error('Timescale must be unsigned integer or text')
    timescale = scale.majorType === 0 ? scale.value as number | bigint : nodeText(scale)
  }
  // This API describes the supplied timescale explicitly; it never assumes an
  // unknown/experimental scale is UTC, or converts TAI through a POSIX Date.
  const result: ExtendedTime = { kind, seconds, timescale, timescaleCritical: keys.has('13'), suffixes: [], clockQuality: new Map(), elective: [] }
  if (keys.has('-10') && keys.has('10')) throw new Error('Time zone keys -10 and 10 are mutually exclusive')
  for (const key of ['-10', '10']) if (keys.has(key)) {
    const zone = nodeText(keys.get(key)!)
    const offset = /^([+-])(\d{2}):(\d{2})$/.exec(zone)
    const valid = offset ? +offset[2]! <= 23 && +offset[3]! <= 59 : zone.split('/').every(p => /^[A-Za-z._][A-Za-z0-9._+-]*$/.test(p) && p !== '.' && p !== '..')
    if (!valid) throw new Error('Invalid IXDTF time zone')
    result.timeZone = { value: zone, critical: key === '10' }
  }
  const suffixKeys = new Set<string>()
  for (const key of ['-11', '11']) if (keys.has(key)) {
    for (const [suffix, value] of nodeMap(keys.get(key)!)) {
      const name = nodeText(suffix)
      if (!/^[a-z_][a-z_0-9-]*$/.test(name) || suffixKeys.has(name)) throw new Error('Invalid or repeated IXDTF suffix key')
      suffixKeys.add(name)
      const values = value.majorType === 4 ? value.children.map(nodeText) : [nodeText(value)]
      if ((value.majorType === 4 && values.length < 2) || values.some(v => !/^[a-zA-Z0-9]+$/.test(v))) throw new Error('Invalid IXDTF suffix values')
      result.suffixes.push({ key: name, values, critical: key === '11' })
    }
  }
  for (const key of [-2, -4, -5]) if (keys.has(String(key))) {
    const value = keys.get(String(key))!
    if (value.majorType !== 0 || nodeInteger(value) > (key === -5 ? 65535n : 255n)) throw new Error('Clock quality integer out of range')
    result.clockQuality.set(key, Number(value.value))
  }
  for (const key of [-7, -8]) if (keys.has(String(key))) {
    const value = keys.get(String(key))!
    if (value.majorType === 5) result.clockQuality.set(key, detailed(value, 'duration'))
    else if (numeric(value)) {
      // Retain integer precision even in unwrapped tag-1 quality values.
      result.clockQuality.set(key, { kind: 'duration', seconds: value.majorType <= 1 ? { kind: 'integer', seconds: nodeInteger(value) } : { kind: 'float', seconds: value.value as number }, timescale: 0, timescaleCritical: false, suffixes: [], clockQuality: new Map(), elective: [] })
    } else throw new Error('Time uncertainty/guarantee requires a number or unwrapped duration')
  }
  const known = new Set(['1', '4', '5', '-1', '-13', '13', '-10', '10', '-11', '11', '-2', '-4', '-5', '-7', '-8', ...fractions.map(String)])
  result.elective = entries.filter(([k]) => k.majorType === 3 || !known.has(nodeInteger(k).toString()))
  return result
}

export function decodeExtendedTime(node: CborNode): ExtendedTime | ExtendedPeriod {
  const tag = nodeTag(node), content = node.children[0]!
  if (tag === 1001n || tag === 1002n) return detailed(content, tag === 1001n ? 'time' : 'duration')
  if (tag !== 1003n) throw new Error('Expected RFC 9581 tag 1001, 1002 or 1003')
  if (content.majorType !== 4 || ![2, 3].includes(content.children.length)) throw new Error('Period requires two endpoints or endpoint and duration')
  const [a, b, d] = content.children
  const start = a!.value === null ? null : detailed(a!, 'time'), end = b!.value === null ? null : detailed(b!, 'time')
  if (d ? !!start === !!end : !start || !end) throw new Error('Period requires exactly two non-null elements')
  return { kind: 'period', start, end, ...(d ? { duration: detailed(d, 'duration') } : {}) }
}
