import { bytesToHex, hexToBytes } from '../parser/utils'
import { useCborEncoder } from '../encoder/composables/useCborEncoder'
import { describe, it, expect } from 'vitest'
import { decodeLossless, decodeIpAddress, formatIpAddress, decodeExtendedTime, createSequenceDecoder, decodeSequenceStream, encode, fromDiagnostic, nodeToCborJson } from '../index'

const node = (diagnostic: string) => decodeLossless(encode(fromDiagnostic(diagnostic, { preserveFloatType: true }) as never).bytes).node
const registered = (diagnostic: string) => decodeLossless(encode(fromDiagnostic(diagnostic, { preserveFloatType: true }) as never).bytes, { validateRegisteredTags: true })

describe('RFC 9164', () => {
  it.each([
    ["52(h'c0000201')", '192.0.2.1'],
    ["52([24, h'c00002'])", '192.0.2.0/24'],
    ["54([44, h'20010db81230'])", '2001:db8:1230::/44'],
    ["54([128, h''])", '::/128'],
    ["54([h'fe800000000000000000000000000001', null, \"eth0\"])", 'fe80::1%eth0'],
    ["52([h'c0000201', 24, 2])", '192.0.2.1%2/24'],
    ["52([h'00000000', null])", '0.0.0.0'],
  ])('formats %s', (input, text) => {
    expect(formatIpAddress(decodeIpAddress(node(input)))).toBe(text)
    expect(() => registered(input)).not.toThrow()
  })
  it.each([
    "52(h'010203')", "54(h'01020304')", "52([33,h''])", "54([129,h''])",
    "52([-1,h''])", "52([24.0,h'c00002'])", "54([44,h'20010db81233'])",
    "54([44,h'20010db8123012'])", "52([24,h'c0000200'])", "52([0,h'01'])",
    "52([24,h'c00002',1])", "52([h'c0000201',24,-1])", "52([h'c0000201',24,true])",
    "52([h'c0000201'])", "52([h'c0000201',null,0,0])",
  ])('rejects %s', input => expect(() => registered(input)).toThrow())
  it('retains unknown tags and invalid extension content when extension validation is disabled', () => {
    expect(node("52(h'')").majorType).toBe(6)
  })
})

describe('RFC 9581', () => {
  it('retains uint64 fractions exactly, including values greater than one second', () => {
    const time = decodeExtendedTime(node('1001({1:-1,-18:18446744073709551615})'))
    expect(time.kind === 'time' && time.seconds).toEqual({ kind: 'integer', seconds: -1n, fraction: { exponent: -18, coefficient: 18446744073709551615n } })
  })
  it('preserves decimal/binary mantissas and arbitrary exponents without allocating powers', () => {
    expect(decodeExtendedTime(node('1002({4:[-18,18446744073709551616]})'))).toMatchObject({ kind: 'duration', seconds: { radix: 10, exponent: -18n, mantissa: 18446744073709551616n } })
    expect(decodeExtendedTime(node('1001({5:[18446744073709551615,-3]})'))).toMatchObject({ seconds: { radix: 2, exponent: 18446744073709551615n, mantissa: -3n } })
  })
  it.each([
    '1001({1:1697724754,-6:873294,-7:{1:0,-6:1000}})',
    '1001({1:1697724754,-6:873294,-7:{1:0,-3:1}})',
    '1001({1:1697724754,-6:873294,-7:{1:0.001}})',
    '1001({1:851042397,-10:"America/Los_Angeles",-11:{"u-ca":"hebrew"}})',
    '1001({1:0,13:1,10:"+23:59",11:{"u-ca":["islamic","civil"]}})',
    '1001({1:0,-2:255,-4:254,-5:65535,-8:0.002,-999:"ignored","experimental":false})',
    '1001({1:Infinity})', '1001({1:NaN})', '1001({1:0,-13:"experiment"})',
    '1003([{1:0},{1:1}])', '1003([{1:0},null,{1:1}])', '1003([null,{1:1},{1:1}])',
  ])('accepts %s', input => expect(() => registered(input)).not.toThrow())
  it.each([
    '1001([])', '1001({})', '1001({1:0,4:[0,1]})', '1001({1:0,0:0})',
    '1001({1:0,99:0})', '1001({1:0,1:1})', '1001({1:0,true:1})',
    '1001({1:0,-3:1,-6:1})', '1001({1:0.0,-3:1})', '1001({4:[0,1],-3:1})',
    '1001({1:0,-3:-1})', '1001({1:0,-1:0,13:1})', '1001({1:0,-13:-1})',
    '1001({4:[0.0,1]})', '1001({5:[0,1.0]})', '1001({4:[0]})',
    '1001({1:0,-2:256})', '1001({1:0,-5:65536})', '1001({1:0,-7:"0"})',
    '1001({1:0,10:"+24:00"})', '1001({1:0,10:"a/.."})', '1001({1:0,10:"+01:60"})',
    '1001({1:0,10:"UTC",-10:"UTC"})', '1001({1:0,11:{"u-ca":"x"},-11:{"u-ca":"x"}})',
    '1001({1:0,11:{"Upper":"x"}})', '1001({1:0,11:{"u-ca":["x"]}})',
    '1003([null,null,{1:1}])', '1003([{1:0},{1:1},{1:1}])', '1003([{1:0},null])',
    '1003([{1:0},null,null])', '1003([1001({1:0}),{1:1}])',
  ])('rejects %s', input => expect(() => registered(input)).toThrow())
})

describe('incremental RFC 8742', () => {
  const hex = '18649f01a2616182020361625f4201024103ffffd9010042abcd7f62686960fff93e00f6'
  const bytes = Uint8Array.from(hex.match(/../g)!, b => parseInt(b, 16))
  it('matches the full-buffer decoder at every split, including inside headers and UTF-8', () => {
    const expected = createSequenceDecoder().write(bytes).map(item => nodeToCborJson(item.node))
    for (let split = 0; split <= bytes.length; split++) {
      const decoder = createSequenceDecoder()
      const values = [...decoder.write(bytes.subarray(0, split)), ...decoder.write(bytes.subarray(split))]
      decoder.finish()
      expect(values.map(item => nodeToCborJson(item.node))).toEqual(expected)
      expect(values.map(i => i.index)).toEqual(values.map((_, i) => i))
      expect(values.at(-1)?.end).toBe(bytes.length)
    }
    const d = createSequenceDecoder(), items = [...bytes].flatMap(byte => d.write(Uint8Array.of(byte)))
    expect(items.map(i => nodeToCborJson(i.node))).toEqual(expected)
    d.finish()
  })
  it('owns bytes even when an upstream reader reuses its buffer', () => {
    const d = createSequenceDecoder(), chunk = Uint8Array.of(0x42, 1)
    expect(d.write(chunk)).toEqual([]); chunk.fill(0)
    const [item] = d.write(Uint8Array.of(2)); d.finish()
    expect(Array.from(item!.node.raw)).toEqual([0x42, 1, 2])
  })
  it.each(['18', '1b0000', '430102', '9f01', 'bf0102', 'c0', '7f6261'])('fails truncated input %s at finish', input => {
    const d = createSequenceDecoder(); d.write(Uint8Array.from(input.match(/../g)!, x => parseInt(x, 16)))
    expect(() => d.finish()).toThrow(/Truncated/)
    expect(() => d.write(new Uint8Array())).toThrow(/Truncated/)
  })
  it.each(['ff', 'bf01ff', '5f6161ff', '7f7fffff', '1c', 'df', 'f818'])('rejects malformed sequence %s', input => {
    const d = createSequenceDecoder({ profile: 'rfc8949' })
    expect(() => d.write(Uint8Array.from(input.match(/../g)!, x => parseInt(x, 16)))).toThrow()
  })
  it('checks announced sizes/depth before buffering the body and bounds the stream', () => {
    expect(() => createSequenceDecoder({ limits: { maxStringLength: 2 } }).write(Uint8Array.of(0x43))).toThrow(/limit/)
    expect(() => createSequenceDecoder({ limits: { maxDepth: 2 } }).write(Uint8Array.of(0x81, 0x81, 0x81))).toThrow(/depth/)
    expect(() => createSequenceDecoder({ maxItems: 1 }).write(Uint8Array.of(0, 1))).toThrow(/item limit/)
    expect(() => createSequenceDecoder({ maxSequenceBytes: 1 }).write(Uint8Array.of(0, 1))).toThrow(/byte limit/)
    const d = createSequenceDecoder(); d.finish(); expect(() => d.write(Uint8Array.of(0))).toThrow(/closed/)
  })
  it('handles async input and propagates EOF failure', async () => {
    async function* chunks() { yield Uint8Array.of(0x18); yield Uint8Array.of(100, 1) }
    const results = []; for await (const item of decodeSequenceStream(chunks())) results.push(item.value)
    expect(results).toEqual([100, 1])
    await expect(async () => { for await (const _ of decodeSequenceStream([Uint8Array.of(0x18)])) { /* consume */ } }).rejects.toThrow(/Truncated/)
  })
})


it('converts and encodes large byte values and offset views without changing any byte', () => {
  const bytes = Uint8Array.from({length:1000000}, (_, i) => i & 255)
  const encoder = useCborEncoder()
  for (const view of [bytes, bytes.subarray(255, 8193), bytes.subarray(0, 0)]) {
    const expected = Buffer.from(view).toString('hex')
    expect(bytesToHex(view)).toBe(expected)
    expect(Buffer.from(hexToBytes(expected.toUpperCase())).equals(Buffer.from(view))).toBe(true)
    const encoded = encoder.encode(view)
    expect(encoded.hex).toBe(Buffer.from(encoded.bytes).toString('hex'))
    const decoded = decodeLossless(encoded.bytes).value as Uint8Array
    expect(Buffer.from(decoded).equals(Buffer.from(view))).toBe(true)
    const sequence = encoder.encodeSequence([view, view])
    expect(sequence.hex).toBe(encoded.hex + encoded.hex)
    expect(sequence.hex).toBe(Buffer.from(sequence.bytes).toString('hex'))
  }
})
