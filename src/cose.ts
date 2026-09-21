/** RFC 9052 Sign1/Sign verification using Web Crypto (RFC 9053 signature algorithms). */
import { decodeLossless } from './parser/lossless'
import type { CborNode } from './parser/scanner'
import { nodeBytes, nodeInteger, nodeMap, nodeTag, nodeText } from './parser/node-access'
import { useCborEncoder } from './encoder/composables/useCborEncoder'

export type CoseSignatureAlgorithm = -7 | -35 | -36 | -8 | -9 | -51 | -52 | -19 | -53
export type CoseVerificationKey = CryptoKey | JsonWebKey | Uint8Array | string
export interface CoseVerifyOptions {
  /** Caller-supplied trust policy. Keys are never taken from message headers. */
  algorithms?: CoseSignatureAlgorithm[]
  /** Authenticated out-of-band algorithm; also required for unprotected alg. */
  algorithm?: CoseSignatureAlgorithm
  externalAAD?: Uint8Array
  detachedPayload?: Uint8Array
  subtle?: SubtleCrypto
  /** Called for application-defined critical headers; must validate their meaning. */
  criticalHeaders?: Map<number | bigint | string, (value: CborNode) => void>
}
export interface CoseVerification { verified: boolean; algorithm: CoseSignatureAlgorithm; payload: Uint8Array; keyId?: Uint8Array }
type Headers = { bytes: Uint8Array; values: Map<number | bigint | string, CborNode> }
const isEd = (algorithm: number) => [-8, -19, -53].includes(algorithm)
const requiredCurve: Record<number, string> = { [-9]: 'P-256', [-51]: 'P-384', [-52]: 'P-521', [-19]: 'Ed25519', [-53]: 'Ed448' }
const label = (node: CborNode): number | bigint | string => {
  if (node.majorType === 3) return nodeText(node)
  const n = nodeInteger(node)
  if (n < BigInt(Number.MIN_SAFE_INTEGER) || n > BigInt(Number.MAX_SAFE_INTEGER)) return n
  return Number(n)
}
const map = (node: CborNode) => new Map(nodeMap(node).map(([key, value]) => [label(key), value]))
const b64 = (bytes: Uint8Array): string => {
  let s = ''; for (const byte of bytes) s += String.fromCharCode(byte)
  return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function headers(protectedNode: CborNode, unprotectedNode: CborNode, options: CoseVerifyOptions): Headers {
  const bytes = nodeBytes(protectedNode), protectedMap = bytes.length ? map(decodeLossless(bytes, { profile: 'rfc8949' }).node) : new Map<number | bigint | string, CborNode>()
  const unprotected = map(unprotectedNode), values = new Map(protectedMap)
  for (const [key, value] of unprotected) {
    if (values.has(key)) throw new Error('COSE header occurs in both protected and unprotected maps')
    values.set(key, value)
  }
  if (unprotected.has(2)) throw new Error('COSE crit must be protected')
  if (unprotected.has(1) && options.algorithm === undefined) throw new Error('Unprotected COSE alg requires an authenticated out-of-band algorithm')
  if (values.has(1)) label(values.get(1)!)
  if (values.has(4)) nodeBytes(values.get(4)!)
  if (values.has(3)) {
    const contentType = values.get(3)!
    if (contentType.majorType !== 0 && contentType.majorType !== 3) throw new Error('Invalid COSE content type')
  }
  const crit = protectedMap.get(2)
  if (crit) {
    if (crit.majorType !== 4 || !crit.children.length) throw new Error('COSE crit must be a nonempty array')
    const seen = new Set<number | bigint | string>()
    for (const child of crit.children) {
      const key = label(child)
      if (key === 2 || seen.has(key) || !protectedMap.has(key)) throw new Error('Invalid COSE critical header reference')
      seen.add(key)
      if (![1, 3, 4].includes(key as number)) {
        const handler = options.criticalHeaders?.get(key)
        if (!handler) throw new Error(`Unsupported critical COSE header ${key}`)
        handler(protectedMap.get(key)!)
      }
    }
  }
  return { bytes: protectedMap.size ? bytes : new Uint8Array(), values }
}

// Decompress the optional boolean EC2 y coordinate (RFC 9053 §7.1).
const curves: Record<number, { name: string; size: number; p: bigint; b: bigint }> = {
  1: { name: 'P-256', size: 32, p: 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn, b: 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn },
  2: { name: 'P-384', size: 48, p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000ffffffffn, b: 0xb3312fa7e23ee7e4988e056be3f82d19181d9c6efe8141120314088f5013875ac656398d8a2ed19d2a85c8edd3ec2aefn },
  3: { name: 'P-521', size: 66, p: (1n << 521n) - 1n, b: 0x0051953eb9618e1c9a1f929a21a0b68540eea2da725b99b315f3b8b489918ef109e156193951ec7e937b1652c0bd3bb1bf073573df883d2c34f1ef451fd46b503f00n }
}
const toBig = (bytes: Uint8Array) => { let n = 0n; for (const b of bytes) n = n * 256n + BigInt(b); return n }
function decompress(x: Uint8Array, odd: boolean, curve: typeof curves[number]): Uint8Array {
  const n = toBig(x), p = curve.p
  if (x.length !== curve.size || n >= p) throw new Error('Invalid COSE EC2 x coordinate')
  const rhs = ((n * n % p * n - 3n * n + curve.b) % p + p) % p
  let a = rhs, exponent = (p + 1n) / 4n, y = 1n
  while (exponent) { if (exponent & 1n) y = y * a % p; a = a * a % p; exponent >>= 1n }
  if (y * y % p !== rhs) throw new Error('COSE compressed point is not on the curve')
  if (Boolean(y & 1n) !== odd) y = p - y
  const result = new Uint8Array(curve.size)
  for (let i = result.length - 1; i >= 0; i--) { result[i] = Number(y & 255n); y >>= 8n }
  return result
}

/** Import a trusted public COSE_Key; algorithm and key_ops restrictions are enforced. */
export async function importCoseKey(input: string | Uint8Array, algorithm: CoseSignatureAlgorithm, subtle: SubtleCrypto = globalThis.crypto?.subtle): Promise<CryptoKey> {
  if (!subtle) throw new Error('Web Crypto is unavailable; supply options.subtle')
  const key = map(decodeLossless(input, { profile: 'rfc8949' }).node)
  if (key.has(3) && label(key.get(3)!) !== algorithm) throw new Error('COSE key algorithm mismatch')
  if (key.has(4)) {
    const ops = key.get(4)!
    if (ops.majorType !== 4 || !ops.children.some(v => v.majorType === 0 && v.value === 2)) throw new Error('COSE key_ops does not allow verification')
  }
  const type = key.get(1), crv = key.get(-1), x = key.get(-2)
  if (!type || !crv || !x) throw new Error('Missing COSE key parameters')
  const curveId = Number(nodeInteger(crv))
  let jwk: JsonWebKey
  if (isEd(algorithm)) {
    if (nodeInteger(type) !== 1n || ![6, 7].includes(curveId)) throw new Error('EdDSA requires an Ed25519/Ed448 OKP key')
    const publicBytes = nodeBytes(x)
    if (publicBytes.length !== (curveId === 6 ? 32 : 57)) throw new Error('Invalid EdDSA key length')
    jwk = { kty: 'OKP', crv: curveId === 6 ? 'Ed25519' : 'Ed448', x: b64(publicBytes), key_ops: ['verify'] }
  } else {
    const curve = curves[curveId], y = key.get(-3)
    if (nodeInteger(type) !== 2n || !curve || !y) throw new Error('ECDSA requires a supported EC2 key')
    const xb = nodeBytes(x), yb = typeof y.value === 'boolean' ? decompress(xb, y.value, curve) : nodeBytes(y)
    if (xb.length !== curve.size || yb.length !== curve.size) throw new Error('Invalid EC2 coordinate length')
    jwk = { kty: 'EC', crv: curve.name, x: b64(xb), y: b64(yb), key_ops: ['verify'] }
  }
  return importVerificationKey(jwk, algorithm, subtle)
}
async function importVerificationKey(input: CoseVerificationKey, algorithm: CoseSignatureAlgorithm, subtle: SubtleCrypto): Promise<CryptoKey> {
  if (typeof input === 'string' || input instanceof Uint8Array) return importCoseKey(input, algorithm, subtle)
  let key: CryptoKey
  if ('type' in input && 'algorithm' in input && 'usages' in input) key = input as CryptoKey
  else {
    const jwk = input as JsonWebKey
    const names: Record<number, string> = { [-7]: 'ES256', [-35]: 'ES384', [-36]: 'ES512', [-8]: 'EdDSA', [-9]: 'ES256', [-51]: 'ES384', [-52]: 'ES512', [-19]: 'Ed25519', [-53]: 'Ed448' }
    if (jwk.alg && jwk.alg !== names[algorithm] && !(isEd(algorithm) && (jwk.alg === 'EdDSA' || jwk.alg === jwk.crv))) throw new Error('JWK algorithm mismatch')
    const joseCurve: Record<string, string> = { ES256: 'P-256', ES384: 'P-384', ES512: 'P-521', Ed25519: 'Ed25519', Ed448: 'Ed448' }
    if (jwk.alg && joseCurve[jwk.alg] && joseCurve[jwk.alg] !== jwk.crv) throw new Error('JWK algorithm/curve mismatch')
    if (jwk.key_ops && !jwk.key_ops.includes('verify') || jwk.use && jwk.use !== 'sig') throw new Error('JWK does not allow signature verification')
    if (jwk.d) throw new Error('Provide a public verification key')
    if (isEd(algorithm) ? jwk.kty !== 'OKP' || !['Ed25519', 'Ed448'].includes(jwk.crv ?? '') : jwk.kty !== 'EC' || !Object.values(curves).some(c => c.name === jwk.crv)) throw new Error('Signature algorithm/key type mismatch')
    // The alg policy was checked above. Omit it for runtimes that only know
    // the older JOSE spelling; the explicit Web Crypto curve remains bound.
    const { alg: _alg, ...importJwk } = jwk
    key = await subtle.importKey('jwk', importJwk, isEd(algorithm) ? { name: jwk.crv! } : { name: 'ECDSA', namedCurve: jwk.crv! }, false, ['verify'])
  }
  if (key.type !== 'public' || !key.usages.includes('verify')) throw new Error('A public key permitting verification is required')
  if (isEd(algorithm) ? !['Ed25519', 'Ed448'].includes(key.algorithm.name) : key.algorithm.name !== 'ECDSA' || !Object.values(curves).some(c => c.name === (key.algorithm as EcKeyAlgorithm).namedCurve)) throw new Error('Signature algorithm/key type mismatch')
  const curve = isEd(algorithm) ? key.algorithm.name : (key.algorithm as EcKeyAlgorithm).namedCurve
  if (requiredCurve[algorithm] && requiredCurve[algorithm] !== curve) throw new Error('Signature algorithm/curve mismatch')
  return key
}
function envelope(input: string | Uint8Array, tag: bigint): CborNode[] {
  let node = decodeLossless(input, { profile: 'rfc8949' }).node
  if (node.majorType === 6) { if (nodeTag(node) !== tag) throw new Error('Incorrect COSE message tag'); node = node.children[0]! }
  if (node.majorType !== 4 || node.children.length !== 4) throw new Error('COSE message requires four elements')
  return node.children
}
function payloadOf(node: CborNode, options: CoseVerifyOptions): Uint8Array {
  if (node.value === null) { if (!options.detachedPayload) throw new Error('Detached COSE payload is required'); return options.detachedPayload.slice() }
  if (options.detachedPayload !== undefined) throw new Error('Detached payload supplied for an attached message')
  return nodeBytes(node).slice()
}
async function verify(headers: Headers, signature: CborNode, payload: Uint8Array, structure: unknown[], keyInput: CoseVerificationKey, options: CoseVerifyOptions): Promise<CoseVerification> {
  const supplied = headers.values.get(1), algorithm = (supplied ? label(supplied) : options.algorithm) as CoseSignatureAlgorithm
  if (![-7, -35, -36, -8, -9, -51, -52, -19, -53].includes(algorithm)) throw new Error(`Unsupported COSE signature algorithm ${algorithm}`)
  if (options.algorithm !== undefined && options.algorithm !== algorithm || options.algorithms && !options.algorithms.includes(algorithm)) throw new Error('COSE signature algorithm disallowed by caller')
  const subtle = options.subtle ?? globalThis.crypto?.subtle
  if (!subtle) throw new Error('Web Crypto is unavailable; supply options.subtle')
  const key = await importVerificationKey(keyInput, algorithm, subtle), bytes = nodeBytes(signature)
  const length = isEd(algorithm) ? key.algorithm.name === 'Ed25519' ? 64 : 114 : 2 * Object.values(curves).find(c => c.name === (key.algorithm as EcKeyAlgorithm).namedCurve)!.size
  if (bytes.length !== length) throw new Error('Invalid COSE signature length')
  const params: AlgorithmIdentifier | EcdsaParams = isEd(algorithm) ? key.algorithm.name : { name: 'ECDSA', hash: [-7, -9].includes(algorithm) ? 'SHA-256' : [-35, -51].includes(algorithm) ? 'SHA-384' : 'SHA-512' }
  const data = useCborEncoder().encode(structure as never).bytes
  const verified = await subtle.verify(params, key, bytes, data)
  const kid = headers.values.get(4)
  return { verified, algorithm, payload, ...(kid ? { keyId: nodeBytes(kid).slice() } : {}) }
}

export async function verifyCoseSign1(input: string | Uint8Array, key: CoseVerificationKey, options: CoseVerifyOptions = {}): Promise<CoseVerification> {
  const [p, u, content, signature] = envelope(input, 18n), h = headers(p!, u!, options), payload = payloadOf(content!, options)
  return verify(h, signature!, payload, ['Signature1', h.bytes, options.externalAAD ?? new Uint8Array(), payload], key, options)
}

/** Every signature is checked against the caller's corresponding trusted key. */
export async function verifyCoseSign(input: string | Uint8Array, keys: CoseVerificationKey[], options: CoseVerifyOptions = {}): Promise<{ verified: boolean; signatures: CoseVerification[] }> {
  const [p, u, content, signatures] = envelope(input, 98n), body = headers(p!, u!, options), payload = payloadOf(content!, options)
  if (signatures!.majorType !== 4 || !signatures!.children.length || signatures!.children.length !== keys.length) throw new Error('Provide one trusted key for every COSE signature')
  const results: CoseVerification[] = []
  for (let i = 0; i < signatures!.children.length; i++) {
    const item = signatures!.children[i]!
    if (item.majorType !== 4 || item.children.length !== 3) throw new Error('COSE signature requires three elements')
    const h = headers(item.children[0]!, item.children[1]!, options)
    results.push(await verify(h, item.children[2]!, payload, ['Signature', body.bytes, h.bytes, options.externalAAD ?? new Uint8Array(), payload], keys[i]!, options))
  }
  return { verified: results.every(r => r.verified), signatures: results }
}
