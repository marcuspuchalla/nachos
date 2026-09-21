import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { createCddlValidator } from '../cddl'
import { encode } from '../index'
import { decodeLossless } from '../index'
import { cip21CountIssues } from '../cardano/cip21'

const validator = createCddlValidator(readFileSync(new URL('../cddl/vendor/cddl_bg.wasm', import.meta.url)))
const hash = (size = 32, fill = 0) => new Uint8Array(size).fill(fill)
const credential = [0, hash(28)]
const address = new Uint8Array([0x61, ...hash(28)])
const body = (extra: Array<[number, any]> = []) => new Map<number, any>([[0, [[hash(), 0]]], [1, [[address, 1000000]]], [2, 200000], ...extra])
const canonical = (value: any) => encode(value, { canonical: true, mapKeyOrder: 'length-first', maxDepth: 100 }).bytes
const check = (value: any, catalystRegistration = false) => validator.validateCip21(canonical(value), { catalystRegistration })
const tagged = (value: any) => ({ tag: 258, value })
const pool = () => [3, hash(28), hash(), 0, 340000000, { tag: 30, value: [1, 10] }, hash(29), [hash(28)], [], null]
const vote = (id = 0) => new Map<any, any>([[[0, hash(28, id)], new Map([[[hash(32, id), 0], [1, null]]])]])

describe('complete serialized CIP-21 checks', () => {
  it('accepts bodies and three/four-element transaction envelopes', () => {
    expect(check(body())).toMatchObject({ valid: true, scope: 'body' })
    expect(check([body(), new Map(), true, null])).toMatchObject({ valid: true, scope: 'transaction' })
    expect(check([body(), new Map(), null])).toMatchObject({ valid: true, scope: 'transaction' })
  })
  it('requires valid ledger structures before declaring compatibility', () => {
    for (const value of [new Map(), body([[0, 'not inputs']]), body([[1, [[address, -1]]]]), body([[15, 2]]), body([[0, [[hash(31), 0]]]]), body([[0, [[hash(), 65536]]]]), body([[7, hash(31)]]), body([[999, 1]])]) expect(check(value).valid).toBe(false)
  })
  it('rejects noncanonical lengths/order, indefinite items, duplicate maps and trailing data', () => {
    const b = canonical(body()), hex = Buffer.from(b).toString('hex')
    expect(validator.validateCip21('b803' + hex.slice(2)).valid).toBe(false)
    expect(validator.validateCip21('bf' + hex.slice(2) + 'ff').valid).toBe(false)
    expect(validator.validateCip21(hex + '00').valid).toBe(false)
    expect(validator.validateCip21(encode(new Map([...body()].reverse())).bytes).valid).toBe(false)
  })
  it.each([6, 20])('rejects unsupported field %s', id => expect(check(body([[id, []]])).valid).toBe(false))
  it.each([10, 11, 12, 13])('rejects unsupported certificate %s', id => {
    const cert = id === 10 ? [10, credential, hash(28), [2]] : id === 11 ? [11, credential, hash(28), 0] : id === 12 ? [12, credential, [2], 0] : [13, credential, hash(28), [2], 0]
    expect(check(body([[4, [cert]]]))).toMatchObject({ valid: false, issues: [expect.objectContaining({ rule: 'unsupported-certificate' })] })
  })
  it.each([5, 6])('rejects pre-Conway unsupported certificate %s', id => expect(check(body([[4, [[id]]]])).valid).toBe(false))
  it.each([4, 5, 9, 13, 14, 18, 19])('rejects optional empty collection %s', id => expect(check(body([[id, [5, 9, 19].includes(id) ? new Map() : []]])).valid).toBe(false))
  it('allows required empty input/output containers but rejects empty multiassets', () => {
    expect(check(body([[0, []], [1, []]])).valid).toBe(true)
    expect(check(body([[1, [[address, [1000000, new Map()]]]]])).valid).toBe(false)
    expect(check(body([[1, [new Map([[0, address], [1, [1, new Map()]]])]]])).valid).toBe(false)
  })
  it('checks tag 258 consistency across inputs, certificates, owners and witnesses', () => {
    const b = body([[0, tagged([[hash(), 0]])], [14, tagged([hash(28)])]])
    expect(check([b, new Map([[0, tagged([[hash(), hash(64)]])]]), true, null]).valid).toBe(true)
    expect(check([b, new Map([[0, [[hash(), hash(64)]]]]), true, null])).toMatchObject({ valid: false, issues: [expect.objectContaining({ rule: 'set-tag-consistency' })] })
    const cert = pool(); cert[7] = tagged([hash(28)]) as any
    expect(check(body([[4, [cert]]])).valid).toBe(false)
    expect(check(body([[0, [[hash(), 0], [hash(), 0]]]])).valid).toBe(false)
  })
  it('checks pool registration exclusions individually', () => {
    expect(check(body([[4, [pool()]]])).valid).toBe(true)
    const extras: Array<[number, any]> = [[5, new Map([[hash(29), 1]])], [9, new Map([[hash(28), new Map([[hash(1), 1]])]])], [11, hash()], [13, [[hash(), 0]]], [14, [hash(28)]], [16, [address, 1]], [17, 1], [18, [[hash(), 1]]], [19, vote()], [21, 1], [22, 1]]
    for (const extra of extras) expect(check(body([[4, [pool()]], extra])), `field ${extra[0]}`).toMatchObject({ valid: false, issues: [expect.objectContaining({ rule: 'pool-registration-combination' })] })
    expect(check(body([[4, [pool(), [0, credential]]]])).valid).toBe(false)
    expect(check(body([[4, [pool()]], [1, [[address, 1, hash()]]]])).valid).toBe(false)
    const cert = pool(); cert[5] = { tag: 30, value: [1, 0] }
    expect(check(body([[4, [cert]]])).valid).toBe(false)
  })
  it('allows supported certificates and mixed output formats including inline datum/reference script', () => {
    expect(check(body([[4, [[0, credential], [2, credential, hash(28)], [9, credential, [2]], [16, credential, 500000000, null]]], [1, [[address, 1], new Map([[0, address], [1, 1], [2, [1, { tag: 24, value: canonical({ tag: 121, value: [] }) }]], [3, { tag: 24, value: canonical([0, [0, hash(28)]]) }]])]]]))).toMatchObject({ valid: true })
  })
  it('rejects empty output data and reference scripts', () => {
    for (const extra of [[2, [1, { tag: 24, value: hash(0) }]], [3, { tag: 24, value: hash(0) }]]) expect(check(body([[1, [new Map([[0, address], [1, 1], extra] as any)]]])).valid).toBe(false)
  })
  it('enforces signed int64 bounds while permitting full uint64 coin values', () => {
    expect(check(body([[2, (1n << 64n) - 1n]])).valid).toBe(true)
    const mint = (n: bigint) => body([[9, new Map([[hash(28), new Map([[hash(0), n]])]])]])
    expect(check(mint(-(1n << 63n))).valid).toBe(true)
    expect(check(mint(-(1n << 63n) - 1n)).valid).toBe(false)
    expect(check(body([[2, 1n << 64n]])).valid).toBe(false)
  })
  it('allows exactly one voting procedure', () => {
    expect(check(body([[19, vote()]])).valid).toBe(true)
    expect(check(body([[19, new Map([...vote(), ...vote(1)])]])).valid).toBe(false)
    const votes = vote(); votes.values().next().value!.set([hash(32, 2), 1], [0, null])
    expect(check(body([[19, votes]])).valid).toBe(false)
  })
  it('validates Catalyst auxiliary data only when the exceptional signing workflow is requested', () => {
    const metadata = new Map([[61284, new Map([[1, hash()]])]])
    expect(check([body(), new Map(), true, [metadata, []]], true).valid).toBe(true)
    expect(check([body(), new Map(), true, metadata]).valid).toBe(true)
    expect(check([body(), new Map(), true, metadata], true).valid).toBe(false)
    expect(check([body(), new Map(), true, [metadata, [[0, hash(28)]]]], true).valid).toBe(false)
    expect(check(body(), true).valid).toBe(false)
  })
  it('checks UINT16 count boundaries before schema validation', () => {
    const atLimit = body([[1, Array.from({ length: 65535 }, () => [address, 1])]])
    const node = decodeLossless(canonical(atLimit), { limits: { maxArrayLength: 65536, maxParseTime: 10000 } }).node
    expect(cip21CountIssues(node)).toEqual([])
    const overLimit = body([[1, Array.from({ length: 65536 }, () => [address, 1])]])
    expect(check(overLimit)).toMatchObject({ valid: false, issues: [expect.objectContaining({ rule: 'element-count', path: 'body/1' })] })
    const witnesses = new Map([[0, Array(32768).fill([hash(), hash(64)])], [1, Array(32768).fill([0, hash(28)])]])
    expect(check([body(), witnesses, true, null])).toMatchObject({ valid: false, issues: [expect.objectContaining({ rule: 'witness-count' })] })
  }, 15000)
})
