import { readFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'
import { describe, it, expect } from 'vitest'
import { encode, decode, verifyCoseSign1, verifyCoseSign, importCoseKey } from '../index'
import type { CoseSignatureAlgorithm } from '../cose'

const subtle = webcrypto.subtle as unknown as SubtleCrypto
const bytes = (hex: string) => Uint8Array.from(Buffer.from(hex, 'hex'))
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../../specs/roadmap-2026-09/cose/${name}.json`, import.meta.url), 'utf8'))
const publicKey = (key: any): JsonWebKey => ({ kty: key.kty, crv: key.crv, x: key.x ?? Buffer.from(key.x_hex, 'hex').toString('base64url'), y: key.y ?? (key.y_hex ? Buffer.from(key.y_hex, 'hex').toString('base64url') : undefined) })
const cbor = (value: unknown) => encode(value as never).bytes
const payload = new TextEncoder().encode('authenticated content')

describe('COSE cryptographic verification', () => {
  it('verifies the published CWT Appendix A.3 signature, and detects changes', async () => {
    const f = fixture('CWT-A_3'), key = publicKey(f.input.sign0.key)
    expect((await verifyCoseSign1(f.output.cbor, key, { subtle })).verified).toBe(true)
    const damaged = bytes(f.output.cbor); damaged[damaged.length - 1]! ^= 1
    expect((await verifyCoseSign1(damaged, key, { subtle })).verified).toBe(false)
    expect((await verifyCoseSign1(f.output.cbor, key, { subtle, externalAAD: Uint8Array.of(1) })).verified).toBe(false)
    await expect(verifyCoseSign1(f.output.cbor, key, { subtle, algorithms: [-8] })).rejects.toThrow(/disallowed/)
  })
  it('verifies published external-AAD and empty-protected-map vectors', async () => {
    const external = fixture('sign1-tests-sign-pass-02')
    expect((await verifyCoseSign1(external.output.cbor, publicKey(external.input.sign0.key), { subtle, externalAAD: bytes(external.input.sign0.external) })).verified).toBe(true)
    expect((await verifyCoseSign1(external.output.cbor, publicKey(external.input.sign0.key), { subtle })).verified).toBe(false)
    const empty = fixture('sign1-tests-sign-pass-01')
    expect((await verifyCoseSign1(empty.output.cbor, publicKey(empty.input.sign0.key), { subtle, algorithm: -7 })).verified).toBe(true)
    await expect(verifyCoseSign1(empty.output.cbor, publicKey(empty.input.sign0.key), { subtle })).rejects.toThrow(/out-of-band/)
  })
  it.each([
    [-9, 'P-256', 'SHA-256'], [-51, 'P-384', 'SHA-384'], [-52, 'P-521', 'SHA-512'], [-19, 'Ed25519', ''], [-53, 'Ed448', ''],
    [-7, 'P-256', 'SHA-256'], [-35, 'P-384', 'SHA-384'], [-36, 'P-521', 'SHA-512'], [-8, 'Ed25519', ''], [-8, 'Ed448', ''],
  ] as const)('verifies %s with %s using independent Web Crypto signing', async (alg, curve, hash) => {
    const ed = [-8, -19, -53].includes(alg)
    const params = ed ? { name: curve } : { name: 'ECDSA', namedCurve: curve }
    const keys = await subtle.generateKey(params, true, ['sign', 'verify']) as CryptoKeyPair
    const protectedBytes = cbor(new Map([[1, alg]])), signatureParams = ed ? { name: curve } : { name: 'ECDSA', hash }
    const signature = new Uint8Array(await subtle.sign(signatureParams, keys.privateKey, cbor(['Signature1', protectedBytes, new Uint8Array(), payload])))
    const message = cbor({ tag: 18, value: [protectedBytes, new Map(), payload, signature] })
    expect((await verifyCoseSign1(message, keys.publicKey, { subtle })).verified).toBe(true)
    const detached = cbor([protectedBytes, new Map(), null, signature])
    expect((await verifyCoseSign1(detached, keys.publicKey, { subtle, detachedPayload: payload })).verified).toBe(true)
    expect((await verifyCoseSign1(detached, keys.publicKey, { subtle, detachedPayload: Uint8Array.of(1) })).verified).toBe(false)
    await expect(verifyCoseSign1(detached, keys.publicKey, { subtle })).rejects.toThrow(/required/)
    await expect(verifyCoseSign1(message, keys.publicKey, { subtle, detachedPayload: payload })).rejects.toThrow(/attached/)
    const jwk = await subtle.exportKey('jwk', keys.publicKey)
    if (ed) {
      expect((await verifyCoseSign1(message, { ...jwk, alg: curve }, { subtle })).verified).toBe(true)
      await expect(verifyCoseSign1(message, { ...jwk, alg: curve === 'Ed25519' ? 'Ed448' : 'Ed25519' }, { subtle })).rejects.toThrow(/mismatch/)
    }
    const coseKey = new Map<number, unknown>([[1, ed ? 1 : 2], [3, alg], [4, [2]], [-1, ed ? curve === 'Ed25519' ? 6 : 7 : curve === 'P-256' ? 1 : curve === 'P-384' ? 2 : 3], [-2, Uint8Array.from(Buffer.from(jwk.x!, 'base64url'))]])
    if (jwk.y) coseKey.set(-3, Uint8Array.from(Buffer.from(jwk.y, 'base64url')))
    expect((await verifyCoseSign1(message, cbor(coseKey), { subtle })).verified).toBe(true)
    if (jwk.y) {
      coseKey.set(-3, Boolean(Buffer.from(jwk.y, 'base64url').at(-1)! & 1))
      expect((await verifyCoseSign1(message, cbor(coseKey), { subtle })).verified).toBe(true)
    }
    coseKey.set(4, [1]); await expect(importCoseKey(cbor(coseKey), alg, subtle)).rejects.toThrow(/key_ops/)
    await expect(verifyCoseSign1(message, { ...jwk, alg: 'wrong' }, { subtle })).rejects.toThrow(/mismatch/)
  })
  it('enforces fully specified JOSE key algorithms with legacy COSE ECDSA identifiers', async () => {
    const keys = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-384' }, true, ['sign', 'verify']) as CryptoKeyPair
    const p = cbor(new Map([[1, -7]]))
    const sig = new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, cbor(['Signature1', p, new Uint8Array(), payload])))
    const message = cbor([p, new Map(), payload, sig])
    expect((await verifyCoseSign1(message, keys.publicKey, { subtle })).verified).toBe(true)
    const jwk = await subtle.exportKey('jwk', keys.publicKey)
    await expect(verifyCoseSign1(message, { ...jwk, alg: 'ES256' }, { subtle })).rejects.toThrow(/curve mismatch/)
    const { alg: _alg, ...unrestricted } = jwk
    expect((await verifyCoseSign1(message, unrestricted, { subtle })).verified).toBe(true)
  })
  it('binds the RFC 9864 algorithm to its required curve', async () => {
    for (const [algorithm, curve] of [[-9, 'P-384'], [-51, 'P-256'], [-52, 'P-384'], [-19, 'Ed448'], [-53, 'Ed25519']] as const) {
      const ed = curve.startsWith('Ed')
      const keys = await subtle.generateKey(ed ? { name: curve } : { name: 'ECDSA', namedCurve: curve }, true, ['sign', 'verify']) as CryptoKeyPair
      const message = cbor([cbor(new Map([[1, algorithm]])), new Map(), payload, new Uint8Array(64)])
      await expect(verifyCoseSign1(message, keys.publicKey, { subtle })).rejects.toThrow(/curve mismatch/)
    }
  })
  it('verifies every signer, binding body and signer protected headers', async () => {
    const keys = await subtle.generateKey('Ed25519', true, ['sign', 'verify']) as CryptoKeyPair
    const body = cbor(new Map([[3, 'text/plain']])), signer = cbor(new Map([[1, -8]]))
    const signature = new Uint8Array(await subtle.sign('Ed25519', keys.privateKey, cbor(['Signature', body, signer, new Uint8Array(), payload])))
    const entries = [[signer, new Map(), signature], [signer, new Map(), signature]]
    const message = () => cbor({ tag: 98, value: [body, new Map(), payload, entries] })
    expect((await verifyCoseSign(message(), [keys.publicKey, keys.publicKey], { subtle })).verified).toBe(true)
    entries[1]![2] = signature.slice(); (entries[1]![2] as Uint8Array)[0]! ^= 1
    const result = await verifyCoseSign(message(), [keys.publicKey, keys.publicKey], { subtle })
    expect(result.verified).toBe(false); expect(result.signatures.map(x => x.verified)).toEqual([true, false])
    await expect(verifyCoseSign(message(), [keys.publicKey], { subtle })).rejects.toThrow(/every/)
  })
  it('rejects malformed and unknown critical headers before verification', async () => {
    const f = fixture('CWT-A_3'), key = publicKey(f.input.sign0.key)
    const message = (protectedHex: string, unprotected = new Map()) => cbor([bytes(protectedHex), unprotected, payload, new Uint8Array(64)])
    for (const h of ['a201260126', 'a201260280', 'a3012602811863186300', 'a20126028104', '80', 'a001']) await expect(verifyCoseSign1(message(h), key, { subtle })).rejects.toThrow()
    await expect(verifyCoseSign1(message('a10126', new Map([[1, -7]])), key, { subtle })).rejects.toThrow(/both/)
    await expect(verifyCoseSign1(message('a10126', new Map([[2, [1]]])), key, { subtle })).rejects.toThrow(/protected/)
    await expect(verifyCoseSign1(message('a10127'), key, { subtle })).rejects.toThrow(/type mismatch/)
    await expect(verifyCoseSign1(message('a10100'), key, { subtle })).rejects.toThrow(/Unsupported/)
    await expect(verifyCoseSign1(cbor([bytes('a10126'), new Map(), payload, new Uint8Array(63)]), key, { subtle })).rejects.toThrow(/length/)
    const decoded = (decode(f.output.cbor).value as any).value
    await expect(verifyCoseSign1(cbor({ tag: 98, value: decoded }), key, { subtle })).rejects.toThrow(/tag/)
  })
  it('processes application critical headers and enforces algorithm binding', async () => {
    const keys = await subtle.generateKey('Ed25519', true, ['sign', 'verify']) as CryptoKeyPair
    const p = cbor(new Map<unknown, unknown>([[1, -8], [2, ['network']], ['network', 'test']]))
    const sig = new Uint8Array(await subtle.sign('Ed25519', keys.privateKey, cbor(['Signature1', p, new Uint8Array(), payload])))
    const msg = cbor([p, new Map(), payload, sig])
    await expect(verifyCoseSign1(msg, keys.publicKey, { subtle })).rejects.toThrow(/Unsupported critical/)
    expect((await verifyCoseSign1(msg, keys.publicKey, { subtle, criticalHeaders: new Map([['network', n => { expect(n.value).toBe('test') }]]) })).verified).toBe(true)
    await expect(verifyCoseSign1(msg, keys.publicKey, { subtle, algorithm: -7 as CoseSignatureAlgorithm, criticalHeaders: new Map([['network', () => {}]]) })).rejects.toThrow(/disallowed/)
  })
})
