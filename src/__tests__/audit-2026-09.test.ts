import { describe, it, expect } from 'vitest'
import { decode, decodeWithSourceMap, decodeLossless, encodeLossless, encode, fromDiagnostic, decodeToDiagnostic, nodeToCborJson, cborSemanticEqual, useCborParser, useCardanoHelpers, typedArrayView, decodeObjectIdentifier, cborJsonToValue } from '../index'

describe('September audit: shared RFC 8949 decoding', () => {
  for (const api of [decode, decodeWithSourceMap]) for (const asBytes of [false, true]) {
    const read = (hex: string, options?: Parameters<typeof decode>[1]) => api(asBytes ? Uint8Array.from(hex.match(/../g) ?? [], h => parseInt(h, 16)) : hex, options)
    it(`${api.name}/${asBytes ? 'bytes' : 'hex'} rejects missing breaks, including empty strings`, () => {
      for (const hex of ['5f', '7f', '5f4101', '7f6161', '9f', 'bf', 'bf01ff']) expect(() => read(hex)).toThrow()
    })
    it(`${api.name}/${asBytes} preserves BOM, validates original tag types and trailing data`, () => {
      expect(read('63efbbbf').value).toBe('\ufeff')
      expect(read('c24101', { validateTagSemantics: true }).value).toEqual({ tag: 2, value: 1n })
      expect(() => read('c482f9000001', { validateTagSemantics: true })).toThrow(/exponent/)
      expect(() => read('c25f420100ff', { limits: { maxBignumBytes: 1 } })).toThrow(/Bignum/)
      expect(() => read('0102', { allowTrailingData: false })).toThrow(/Trailing/)
      expect(read('d9d9f701', { unwrapSelfDescribed: true }).value).toBe(1)
      for (const hex of ['980100', 'a202000100']) expect(() => read(hex, { validateCanonical: true })).toThrow(/canonical/)
    })
    it(`${api.name}/${asBytes} shares resource budgets across tags and collections`, () => {
      expect(() => read('81d86481d8648100', { limits: { maxDepth: 2, maxTagDepth: 2 } })).toThrow(/depth/)
      expect(() => read('4401020304', { limits: { maxOutputSize: 1 } })).toThrow(/Output/)
      expect(() => read('8100', { limits: { maxArrayLength: 0 } })).toThrow(/limit/)
      expect(() => read('4100', { limits: { maxStringLength: 0 } })).toThrow(/limit/)
    })
    it(`${api.name}/${asBytes} applies structural key equivalence without JS coercion`, () => {
      for (const hex of ['a2a1010100a1010201', 'a28167612c7374723a6200826161616201', 'a2f97e0000f9fe0001', 'a20100f93c0001', 'a2f93c00000101']) {
        expect((read(hex, { dupMapKeyMode: 'reject' }).value as Map<unknown, unknown>).size).toBe(2)
      }
      for (const hex of ['a26161007f6161ff01', 'a2f97e0000fa7fc0000001', 'a2f9000000f9800001']) expect(() => read(hex, { dupMapKeyMode: 'reject' })).toThrow(/Duplicate/)
    })
  }
  it('rejects all widened finite binary16 encodings in deterministic mode (independent bit oracle)', () => {
    const f32 = new Uint8Array(5); f32[0] = 0xfa
    const view = new DataView(f32.buffer)
    let count = 0
    for (let bits = 0; bits < 65536; bits++) {
      const sign = bits & 0x8000 ? -1 : 1, exponent = bits >> 10 & 31, mantissa = bits & 1023
      if (exponent === 31) continue
      const value = sign * (exponent === 0 ? mantissa * 2 ** -24 : (1024 + mantissa) * 2 ** (exponent - 25))
      view.setFloat32(1, value)
      let rejected = false
      try { decode(f32, { validateCanonical: true }) } catch { rejected = true }
      if (!rejected) throw new Error(`Accepted widened binary16 ${bits.toString(16)}`)
      count++
    }
    expect(count).toBe(63488)
  })
  it('retains wire types, duplicate map entries, chunks, and uint64 tag numbers', () => {
    for (const hex of ['a201010102', 'bf0101ff', 'f93c00', 'f9fe01', 'c25f4101ff', 'dbfffffffffffffffff6', '7f60ff']) {
      expect(encodeLossless(decodeLossless(hex).node).hex).toBe(hex)
    }
    expect(encode(decodeWithSourceMap('a201000001').value as any, { canonical: true }).hex).toBe('a200010100')
    expect(encodeLossless(decodeLossless('9ff93c00ff').node, { canonical: true }).hex).toBe('81f93c00')
    expect(encode(decode('f82a').value as any).hex).toBe('f82a')
    expect(nodeToCborJson(decodeLossless('a20100613101').node)).toEqual({ type: 'map', value: [[{ type: 'integer', value: '1' }, { type: 'integer', value: '0' }], [{ type: 'text', value: '1' }, { type: 'integer', value: '1' }]] })
    expect(cborSemanticEqual(decodeLossless('00').node, decodeLossless('f90000').node)).toBe(false)
    expect(cborSemanticEqual(decodeLossless('f90000').node, decodeLossless('f98000').node)).toBe(false)
  })
  it('uses unique source paths and absolute sequence offsets', () => {
    const entries = decodeWithSourceMap('a3010061310163612e6202').sourceMap
    expect(new Set(entries.map(e => e.path)).size).toBe(entries.length)
    const { parseSequence, parseSequenceWithSourceMap } = useCborParser()
    expect(parseSequence('0102', { strict: true })).toEqual([1, 2])
    const sequence = parseSequenceWithSourceMap('014101', { strict: true })
    expect(sequence.sourceMaps[1]![0]).toMatchObject({ start: 1, end: 2, headerEnd: 2 })
    for (const fn of [parseSequence, parseSequenceWithSourceMap]) expect(() => fn('0102', { limits: { maxInputSize: 1 } })).toThrow(/Input/)
  })
  it('checks semantic tag content and recursive Cardano Plutus data', () => {
    for (const hex of ['d81800', 'd81841ff', 'd818420102', 'd8216141', 'd82262413d', 'd879816161', 'd879815841' + '00'.repeat(65)]) {
      expect(() => decode(hex, { validateTagSemantics: true, validatePlutusSemantics: true })).toThrow()
    }
    expect(decode('d866821b002000000000000080', { validatePlutusSemantics: true }).value).toMatchObject({ plutus: { constructor: 9007199254740992n } })
    // RFC 8949 §3.4.2 leaves non-finite epoch times application-defined.
    expect(() => decode('c1f97c00', { profile: 'rfc8949' })).not.toThrow()
    expect(() => decode('d8184101', { profile: 'rfc8949' })).not.toThrow()
  })
  it('renders wire diagnostics and reads base32 and empty chunks', () => {
    expect(decodeToDiagnostic('c24101')).toBe("2(h'01')")
    expect(decodeToDiagnostic('f93c00')).toBe('1.0')
    expect(encode(fromDiagnostic('1.0', { preserveFloatType: true }) as any).hex).toBe('f93c00')
    expect(encode(fromDiagnostic("h''_") as any).hex).toBe('5fff')
    expect(encode(fromDiagnostic('""_') as any).hex).toBe('7fff')
    expect(fromDiagnostic("b32'CI2FM6A='")).toEqual(new Uint8Array([0x12, 0x34, 0x56, 0x78]))
  })
  it('distinguishes Shelley envelopes and normalizes tagged Conway witness sets', () => {
    const helpers = useCardanoHelpers()
    const tx = helpers.parseTransaction('83a40080018002000300a0a10102')
    expect(tx.isValid).toBeUndefined()
    expect(tx.auxiliaryData).toEqual(new Map([[1, 2]]))
    expect(helpers.parseWitnessSet(decode('a103d90102814100').value).plutusV1Scripts).toEqual([new Uint8Array([0])])
  })
  it('preserves signed NaN payloads under core deterministic encoding', () => {
    for (const hex of ['f9fe01', 'fa7fc00001', 'fbfff8000000000001']) {
      expect(() => decode(hex, { profile: 'deterministic' })).not.toThrow()
      expect(encodeLossless(decodeLossless(hex).node, { canonical: true }).hex).toBe(hex)
    }
    expect(() => decode('faffc00000', { profile: 'deterministic' })).toThrow(/shorter/)
    expect(encodeLossless(decodeLossless('faffc00000').node, { canonical: true }).hex).toBe('f9fe00')
  })
  it('validates RFC 8746 typed-array alignment and dimensions', () => {
    const node = decodeLossless('d8454401000001', { validateRegisteredTags: true }).node
    const view = typedArrayView(node)
    expect([view.at(0), view.at(1)]).toEqual([1, 256])
    for (const hex of ['d8414101', 'd84c40', 'd8288282000280', 'd8288281028101']) {
      expect(() => decode(hex, { validateRegisteredTags: true })).toThrow()
    }
    // RFC 8746 Figure 1: a 2 × 3 array of big-endian uint16.
    expect(() => decode('d82882820203d8414c000200040008000400100100', { validateRegisteredTags: true })).not.toThrow()
  })
  it('validates RFC 9090 OIDs and RFC 8943 calendar dates', () => {
    expect(decodeObjectIdentifier(new Uint8Array([0x60, 0x86, 0x48, 1, 0x65, 3, 4, 2, 1]))).toEqual([2n, 16n, 840n, 1n, 101n, 3n, 4n, 2n, 1n])
    expect(decodeObjectIdentifier(new Uint8Array(), 112)).toEqual([1n, 3n, 6n, 1n, 4n, 1n])
    for (const hex of ['d86f40', 'd86e428000', 'd86e4181', 'd903ec6a323032332d30322d3239', 'd864f90000']) expect(() => decode(hex, { validateRegisteredTags: true })).toThrow()
    expect(() => decode('d903ec6a323032342d30322d3239', { validateRegisteredTags: true })).not.toThrow()
  })
  it('encodes typed JSON without losing integral floats or typed map keys', () => {
    const original = decodeLossless('a20100f93c0001').node
    const encoded = encode(cborJsonToValue(nodeToCborJson(original), true) as any)
    expect(cborSemanticEqual(original, decodeLossless(encoded.bytes).node)).toBe(true)
    expect(() => cborJsonToValue({ type: 'float', value: 'hello' })).toThrow()
    expect(() => cborJsonToValue({ type: 'tag', tag: '-1', value: { type: 'simple', value: 22 } })).toThrow()
    expect(() => encode('a'.repeat(1000), { maxOutputSize: 1 })).toThrow(/size/)
    expect(() => encode(0, { maxOutputSize: 0 })).toThrow(/size/)
    for (const maxDepth of [NaN, Infinity, -1, 1.5]) expect(() => encode(0, { maxDepth })).toThrow(/depth limit/)
  })
})
