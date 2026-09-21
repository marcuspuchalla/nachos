/**
 * Cardano Layer Audit Regression Tests — July 2026
 *
 * Locks in the Cardano-layer fixes from the 2026-07-01 audit:
 * - B2 (audit #2): CIP-25 parser works against REAL decoder output (Maps,
 *   integer label 721, byte-string keys) + single CIP-25 implementation
 * - B7: pointer addresses (header types 4/5) parsed per CIP-19
 * - B8: Byron era detection requires actual Byron structure for confidence
 * - B9: Alonzo markers for tx body fields 14/15
 * - B10: tag-258 (set) unwrapping in parseTransactionBody
 * - B11: Cardano decoder wraps base-parser errors with context
 * - B12: CIP-25 files[].mediaType lenient MIME validation (warning)
 */

import { describe, it, expect } from 'vitest'
import { encode, decode, decodeWithSourceMap } from '../../index'
import { useCip25Parser } from '../composables/useCip25Parser'
import { useCardanoHelpers } from '../composables/useCardanoHelpers'
import { useCardanoEraDetector } from '../composables/useCardanoEraDetector'
import { useCardanoCborDecoder } from '../composables/useCardanoCborDecoder'

/** Build a CIP-25 metadata structure as Maps (decoder-shaped) */
function buildCip25Maps(options?: {
  policyKey?: unknown
  assetKey?: unknown
  mediaType?: string
  files?: unknown
  version?: string
}) {
  const assetMetadata = new Map<unknown, unknown>([
    ['name', 'My NFT'],
    ['image', 'ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'],
    ['description', 'An NFT'],
  ])
  if (options?.mediaType) assetMetadata.set('mediaType', options.mediaType)
  if (options?.files) assetMetadata.set('files', options.files)

  const policyMap = new Map<unknown, unknown>([
    [options?.assetKey ?? 'MyToken', assetMetadata],
  ])

  const label = new Map<unknown, unknown>([
    [options?.policyKey ?? 'd5e6bf0500378d4f0da4e8dde6becec7621cd8cbf5cbb9b87013d4cc', policyMap],
  ])
  if (options?.version) label.set('version', options.version)

  return new Map<unknown, unknown>([[721, label]])
}

describe('B2 — CIP-25 parser against real decoder output', () => {
  const { parseCip25Metadata, extractCip25FromCbor } = useCip25Parser()

  it('extractCip25FromCbor works on decode() output (Map with integer key 721)', () => {
    const { hex } = encode(buildCip25Maps())
    const decoded = decode(hex).value

    const result = extractCip25FromCbor(decoded)
    expect(result).not.toBeNull()
    expect(result!.isValid).toBe(true)
    expect(result!.assets).toHaveLength(1)
    expect(result!.assets[0]!.policyId).toBe('d5e6bf0500378d4f0da4e8dde6becec7621cd8cbf5cbb9b87013d4cc')
    expect(result!.assets[0]!.assetName).toBe('MyToken')
    expect(result!.assets[0]!.metadata.name).toBe('My NFT')
    expect(result!.assets[0]!.metadata.image).toMatch(/^ipfs:\/\//)
  })

  it('parseCip25Metadata works on parseWithSourceMap output', () => {
    const { hex } = encode(buildCip25Maps({ version: '1.0' }))
    const { value } = decodeWithSourceMap(hex)

    const result = parseCip25Metadata(value)
    expect(result.isValid).toBe(true)
    expect(result.version).toBe('1.0')
    expect(result.assets).toHaveLength(1)
  })

  it('supports byte-string policy IDs and asset names (CIP-25 v2 shape)', () => {
    const policyBytes = new Uint8Array(28).fill(0xab)
    const assetBytes = new Uint8Array([0x4d, 0x79, 0x41, 0x73, 0x73, 0x65, 0x74]) // "MyAsset"
    const { hex } = encode(buildCip25Maps({ policyKey: policyBytes, assetKey: assetBytes, version: '2.0' }))
    const decoded = decode(hex).value

    const result = extractCip25FromCbor(decoded)
    expect(result).not.toBeNull()
    expect(result!.isValid).toBe(true)
    expect(result!.version).toBe('2.0')
    expect(result!.assets[0]!.policyId).toBe('ab'.repeat(28))
    expect(result!.assets[0]!.assetName).toBe('MyAsset') // printable bytes → UTF-8
  })

  it('non-printable byte-string asset names render as hex', () => {
    const assetBytes = new Uint8Array([0x00, 0x01, 0xff])
    const { hex } = encode(buildCip25Maps({ assetKey: assetBytes }))
    const result = extractCip25FromCbor(decode(hex).value)
    expect(result!.assets[0]!.assetName).toBe('0001ff')
  })

  it("supports Maps with string key '721'", () => {
    const inner = buildCip25Maps().get(721)
    const map = new Map<unknown, unknown>([['721', inner]])
    const result = extractCip25FromCbor(map)
    expect(result).not.toBeNull()
    expect(result!.isValid).toBe(true)
  })

  it('still supports plain objects (backward compatibility)', () => {
    const metadata = {
      '721': {
        policy1: {
          Token1: { name: 'NFT', image: 'ipfs://x' },
        },
        version: '1.0',
      },
    }
    const result = parseCip25Metadata(metadata)
    expect(result.isValid).toBe(true)
    expect(result.assets[0]!.policyId).toBe('policy1')
    expect(result.assets[0]!.assetName).toBe('Token1')
  })

  it('returns null / error for metadata without label 721', () => {
    const { hex } = encode(new Map([[674, new Map([['msg', 'hi']])]]))
    expect(extractCip25FromCbor(decode(hex).value)).toBeNull()

    const result = parseCip25Metadata(decode(hex).value)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Missing CIP-25 label: 721')
  })

  it('reports missing required fields decoded from CBOR', () => {
    const bad = new Map<unknown, unknown>([[721, new Map([
      ['policy1', new Map([['Token1', new Map([['image', 'ipfs://x']])]])],
    ])]])
    const { hex } = encode(bad)
    const result = extractCip25FromCbor(decode(hex).value)
    expect(result!.isValid).toBe(false)
    expect(result!.errors).toContain('Missing required field: name')
  })

  it('nested files arrays decoded as Maps are parsed', () => {
    const files = [
      new Map<unknown, unknown>([
        ['name', 'hi-res'],
        ['mediaType', 'image/png'],
        ['src', 'ipfs://QmFile'],
      ]),
    ]
    const { hex } = encode(buildCip25Maps({ mediaType: 'image/png', files }))
    const result = extractCip25FromCbor(decode(hex).value)
    expect(result!.isValid).toBe(true)
    expect(result!.warnings).toEqual([])
    expect(result!.assets[0]!.metadata.files).toHaveLength(1)
    expect(result!.assets[0]!.metadata.files![0]!.mediaType).toBe('image/png')
  })

  it('useCardanoHelpers.parseCIP25Metadata delegates to the single implementation', () => {
    const { parseCIP25Metadata } = useCardanoHelpers()
    const { hex } = encode(buildCip25Maps())
    const result = parseCIP25Metadata(hex)
    expect(result.isValid).toBe(true)
    expect(result.assets).toHaveLength(1)
    expect(result.assets[0]!.metadata.name).toBe('My NFT')
  })

  it('useCardanoHelpers.parseCIP25Metadata throws without label 721', () => {
    const { parseCIP25Metadata } = useCardanoHelpers()
    const { hex } = encode(new Map([[674, 'x']]))
    expect(() => parseCIP25Metadata(hex)).toThrow(/No CIP-25 metadata found/)
  })
})

describe('B12 — CIP-25 mediaType lenient MIME validation (warnings)', () => {
  const { extractCip25FromCbor } = useCip25Parser()

  it('warns (does not error) on suspicious asset mediaType', () => {
    const { hex } = encode(buildCip25Maps({ mediaType: 'not a mime' }))
    const result = extractCip25FromCbor(decode(hex).value)
    expect(result!.isValid).toBe(true)
    expect(result!.errors).toEqual([])
    expect(result!.warnings.some(w => w.includes('not a mime'))).toBe(true)
  })

  it('warns on invalid files[].mediaType', () => {
    const files = [new Map<unknown, unknown>([['mediaType', 'png'], ['src', 'ipfs://f']])]
    const { hex } = encode(buildCip25Maps({ files }))
    const result = extractCip25FromCbor(decode(hex).value)
    expect(result!.isValid).toBe(true)
    expect(result!.warnings.some(w => w.includes('files[0].mediaType'))).toBe(true)
  })

  it('warns on files[] entries missing mediaType', () => {
    const files = [new Map<unknown, unknown>([['src', 'ipfs://f']])]
    const { hex } = encode(buildCip25Maps({ files }))
    const result = extractCip25FromCbor(decode(hex).value)
    expect(result!.warnings.some(w => w.includes('files[0] is missing mediaType'))).toBe(true)
  })

  it('accepts common MIME types without warnings', () => {
    for (const mediaType of ['image/png', 'video/mp4', 'application/json', 'image/svg+xml']) {
      const { hex } = encode(buildCip25Maps({ mediaType }))
      const result = extractCip25FromCbor(decode(hex).value)
      expect(result!.warnings, `unexpected warning for ${mediaType}`).toEqual([])
    }
  })
})

describe('B7 — pointer address parsing (CIP-19)', () => {
  const { parseAddress } = useCardanoHelpers()

  /** Build an address byte string CBOR hex from header + parts */
  const addressHex = (header: number, ...parts: number[][]): string => {
    const body = [header, ...parts.flat()]
    const lenHeader = body.length <= 23 ? [0x40 | body.length] : [0x58, body.length]
    return [...lenHeader, ...body].map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const paymentHash = Array.from({ length: 28 }, (_, i) => i + 1)
  // Pointer (2498243, 27, 3) per CIP-19 examples:
  // 2498243 → var-nat bytes 81 98 bd 43; 27 → 1b; 3 → 03
  const pointerBytes = [0x81, 0x98, 0xbd, 0x43, 0x1b, 0x03]

  it('parses type 4 (key payment + pointer)', () => {
    const hex = addressHex(0x41, paymentHash, pointerBytes)
    const addr = parseAddress(hex)
    expect(addr.type).toBe('pointer')
    expect(addr.network).toBe('mainnet')
    expect(addr.paymentCredential!.type).toBe('key')
    expect(addr.paymentCredential!.hash).toEqual(new Uint8Array(paymentHash))
    expect(addr.stakeCredential).toEqual({
      type: 'pointer',
      slot: 2498243,
      txIndex: 27,
      certIndex: 3,
    })
  })

  it('parses type 5 (script payment + pointer)', () => {
    const hex = addressHex(0x51, paymentHash, pointerBytes)
    const addr = parseAddress(hex)
    expect(addr.type).toBe('pointer')
    expect(addr.paymentCredential!.type).toBe('script')
    expect((addr.stakeCredential as { slot: number }).slot).toBe(2498243)
  })

  it('parses single-byte pointer values', () => {
    const hex = addressHex(0x40, paymentHash, [0x00, 0x00, 0x00]) // testnet, pointer (0,0,0)
    const addr = parseAddress(hex)
    expect(addr.network).toBe('testnet')
    expect(addr.stakeCredential).toEqual({ type: 'pointer', slot: 0, txIndex: 0, certIndex: 0 })
  })

  it('throws on truncated pointer data', () => {
    const hex = addressHex(0x41, paymentHash, [0x81]) // continuation bit set, then EOF
    expect(() => parseAddress(hex)).toThrow(/truncated/)
  })

  it('types 0-3 keep stake-key hash handling', () => {
    const stakeHash = Array.from({ length: 28 }, (_, i) => 100 + i)
    const hex = addressHex(0x01, paymentHash, stakeHash)
    const addr = parseAddress(hex)
    expect(addr.type).toBe('shelley')
    expect(addr.stakeCredential).toEqual({ type: 'key', hash: new Uint8Array(stakeHash) })
  })

  it('types 6/7 remain enterprise (no pointer data)', () => {
    const addr6 = parseAddress(addressHex(0x61, paymentHash))
    expect(addr6.type).toBe('enterprise')
    expect(addr6.stakeCredential).toBeUndefined()

    const addr7 = parseAddress(addressHex(0x71, paymentHash))
    expect(addr7.type).toBe('enterprise')
    expect(addr7.paymentCredential!.type).toBe('script')
  })
})

describe('B8 — Byron detection requires structural evidence', () => {
  const { detectEra } = useCardanoEraDetector()

  it('does NOT claim Byron for a bare [0, scalar] pair', () => {
    expect(detectEra([0, 5]).era).toBe('unknown')
    expect(detectEra([1, 'hello']).era).toBe('unknown')
  })

  it('gives only low confidence for [0|1, container] without Byron markers', () => {
    const result = detectEra([1, [1, 2, 3]])
    expect(result.era).toBe('byron')
    expect(result.confidence).toBe('low')
    expect(result.markers.every(m => m.confidence === 'low')).toBe(true)
  })

  it('detects Byron with high-confidence marker for CBOR-in-CBOR (tag 24) payloads', () => {
    const result = detectEra([1, [{ tag: 24, value: new Uint8Array([0x82, 0x00]) }]])
    expect(result.era).toBe('byron')
    expect(result.markers.some(m =>
      m.description.includes('Byron block structure') && m.confidence === 'high'
    )).toBe(true)
  })

  it('detects Byron for payloads containing bootstrap-address-like bytes', () => {
    const bootstrapAddress = new Uint8Array(82)
    bootstrapAddress[0] = 0x82
    const result = detectEra([1, [bootstrapAddress]])
    expect(result.era).toBe('byron')
    expect(result.markers.some(m => m.description.includes('Byron block structure'))).toBe(true)
  })
})

describe('B9 — Alonzo markers for tx body fields 14/15', () => {
  const { detectEra } = useCardanoEraDetector()

  const baseBody: Array<[number, unknown]> = [
    [0, [[new Uint8Array(32), 0]]],
    [1, [[new Uint8Array(29), 1000000]]],
    [2, 200000],
  ]

  it('field 14 (required_signers) emits an Alonzo marker', () => {
    const body = new Map<number, unknown>([...baseBody, [14, [new Uint8Array(28)]]])
    const result = detectEra(body as never)
    expect(result.markers.some(m => m.field === 'required_signers' && m.era === 'alonzo')).toBe(true)
    expect(result.era).toBe('alonzo')
  })

  it('field 14 wrapped in tag 258 also emits the marker', () => {
    const body = new Map<number, unknown>([
      ...baseBody,
      [14, { tag: 258, value: [new Uint8Array(28)] }],
    ])
    const result = detectEra(body as never)
    expect(result.markers.some(m => m.field === 'required_signers' && m.era === 'alonzo')).toBe(true)
  })

  it('field 15 (network_id) emits an Alonzo marker', () => {
    const body = new Map<number, unknown>([...baseBody, [15, 1]])
    const result = detectEra(body as never)
    expect(result.markers.some(m => m.field === 'network_id' && m.era === 'alonzo')).toBe(true)
    expect(result.era).toBe('alonzo')
  })
})

describe('B10 — tag-258 set unwrapping in parseTransactionBody', () => {
  const { parseTransactionBody } = useCardanoHelpers()
  const input: [Uint8Array, number] = [new Uint8Array(32).fill(1), 0]

  it('unwraps tag-258 wrapped inputs, collateral, required signers, reference inputs', () => {
    const body = new Map<number, unknown>([
      [0, { tag: 258, value: [input] }],
      [2, 170000],
      [13, { tag: 258, value: [input] }],
      [14, { tag: 258, value: [new Uint8Array(28).fill(2)] }],
      [18, { tag: 258, value: [input] }],
    ])

    const result = parseTransactionBody(body)
    expect(result.inputs).toEqual([input])
    expect(result.collateral).toEqual([input])
    expect(result.requiredSigners).toEqual([new Uint8Array(28).fill(2)])
    expect(result.referenceInputs).toEqual([input])
  })

  it('unwraps tag-258 wrapped certificates and proposal procedures', () => {
    const body = new Map<number, unknown>([
      [0, [input]],
      [4, { tag: 258, value: [[0, [0, new Uint8Array(28)]]] }],
      [20, { tag: 258, value: [['proposal']] }],
    ])
    const result = parseTransactionBody(body)
    expect(Array.isArray(result.certificates)).toBe(true)
    expect(Array.isArray(result.proposalProcedures)).toBe(true)
  })

  it('leaves plain arrays untouched (pre-Conway)', () => {
    const body = new Map<number, unknown>([[0, [input]], [2, 170000]])
    const result = parseTransactionBody(body)
    expect(result.inputs).toEqual([input])
  })

  it('round-trips a Conway-style body through the real encoder/decoder', () => {
    const body = new Map<number, unknown>([
      [0, { tag: 258, value: [[new Uint8Array(32).fill(7), 1]] }],
      [2, 180000],
    ])
    const { hex } = encode(body)
    const decoded = decode(hex).value
    const result = parseTransactionBody(decoded)
    expect(result.inputs).toEqual([[new Uint8Array(32).fill(7), 1]])
    expect(result.fee).toBe(180000)
  })
})

describe('B11 — Cardano decoder error context', () => {
  const { decode: cardanoDecode } = useCardanoCborDecoder()

  it('wraps base-parser errors with Cardano context, preserving the original', () => {
    let caught: (Error & { cause?: Error }) | null = null
    try {
      cardanoDecode('ff') // bare break code — invalid top-level CBOR
    } catch (e) {
      caught = e as Error & { cause?: Error }
    }
    expect(caught).not.toBeNull()
    expect(caught!.message).toMatch(/^Cardano CBOR decode failed \(input 1 bytes/)
    expect(caught!.cause).toBeInstanceOf(Error)
  })

  it('preserves the original parser message in the wrapped error', () => {
    let caught: Error | null = null
    try {
      cardanoDecode('9f0102') // indefinite array missing break
    } catch (e) {
      caught = e as Error
    }
    expect(caught).not.toBeNull()
    expect(caught!.message).toContain('Cardano CBOR decode failed')
    expect(caught!.message).toContain('missing break')
  })

  it('valid input still decodes normally', () => {
    const result = cardanoDecode('83010203')
    expect(result.value).toEqual([1, 2, 3])
  })
})


describe('Real-data era detection regressions', () => {
  const { detectEra } = useCardanoEraDetector()
  it('does not classify output maps or metadata pairs as transaction bodies', () => {
    const output = new Map<number, any>([[0, new Uint8Array(29)], [1, [1, new Map()]], [2, [1, { tag: 24, value: new Uint8Array([0]) }]]])
    expect(detectEra(output).transactionInfo).toBeUndefined()
    expect(detectEra([new Map([[1, 2]]), []]).transactionInfo).toBeUndefined()
  })
  it('handles malformed fee values without throwing during inspection', () => {
    for (const fee of [[], null, 1.5, 'text']) expect(() => detectEra(new Map<number, any>([[0, []], [1, []], [2, fee]]))).not.toThrow()
  })
  it('recognizes Conway certificates inside tag 258 sets', () => {
    const value = new Map<number, any>([[0, []], [1, []], [2, 1], [4, { tag: 258, value: [[18, [0, new Uint8Array(28)], null]] }]])
    expect(detectEra(value).era).toBe('conway')
    expect(detectEra(value).transactionInfo?.hasCertificates).toBe(true)
  })
})
