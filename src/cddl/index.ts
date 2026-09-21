/** Optional RFC 8610 validator backed by pinned cddl-rs WebAssembly. */
import { initSync, validate_cbor_from_slice, validate_cddl_from_str } from './vendor/cddl.js'
import { decodeLossless } from '../parser/lossless'
import type { ParseOptions } from '../parser/types'
import { checkCip21Node, cip21CountIssues, CIP21_SPECIFICATION } from '../cardano/cip21'
import type { Cip21Options, Cip21Validation } from '../cardano/cip21'
import { CONWAY_CDDL } from './conway-schema'
export { CONWAY_CDDL }
const CIP21_CDDL = CONWAY_CDDL + '\nnachos-legacy-transaction = [transaction_body, transaction_witness_set, auxiliary_data / nil]\n'
// These exact immutable schemas are linted by the regression suite. Do not run
// the full schema diagnostic pass again for every transaction before validating
// its data. Arbitrary caller schemas still undergo reference/syntax checks.
const trustedSchemas = new Set(['transaction_body', 'transaction', 'nachos-legacy-transaction'].map(root => `nachos-entry = ${root}\n${CIP21_CDDL}`))
export type { Cip21Options, Cip21Validation, Cip21Issue } from '../cardano/cip21'

export const CDDL_ENGINE = 'cddl-rs 0.10.7 + nachos RFC 8610 repairs'
export interface CddlOptions { root?: string; features?: string[]; maxSchemaBytes?: number; parseOptions?: ParseOptions }
export interface CddlValidation { valid: boolean; errors: string[]; engine: string }
/**
 * Pass the bytes of @marcuspuchalla/nachos/cddl.wasm (or a compiled module).
 * Loading is explicit: the core codec never downloads or initializes WASM.
 * Run untrusted schemas in a terminable worker; size limits cannot bound a
 * recursive schema's running time. The app and TACO use worker deadlines.
 */
export function createCddlValidator(wasm: BufferSource | WebAssembly.Module) {
  initSync({ module: wasm })
  const checkedSchemas = new Set<string>()
  const validator = {
    validate(input: string | Uint8Array, schema: string, options: CddlOptions = {}): CddlValidation {
      try {
        const limit = options.maxSchemaBytes ?? 256 * 1024
        if (!Number.isSafeInteger(limit) || limit < 0) throw new Error('Invalid schema size limit')
        if (new TextEncoder().encode(schema).length > limit) throw new Error('CDDL schema exceeds size limit')
        if (options.root) {
          if (!/^[A-Za-z_$@][A-Za-z0-9_$@.\-]*$/.test(options.root)) throw new Error('Invalid CDDL root rule name')
          let name = 'nachos-entry'
          while (schema.includes(name)) name += '-root'
          schema = `${name} = ${options.root}\n${schema}`
        }
        if (!trustedSchemas.has(schema) && !checkedSchemas.has(schema)) {
          const diagnostics = validate_cddl_from_str(schema, true) as Array<{ msg: string; severity: string }>
          if (diagnostics.length) return { valid: false, errors: diagnostics.map(d => typeof d.msg === 'string' ? d.msg : JSON.stringify(d.msg)), engine: CDDL_ENGINE }
          if (checkedSchemas.size === 16) checkedSchemas.delete(checkedSchemas.values().next().value!)
          checkedSchemas.add(schema)
        }
        const { node } = decodeLossless(input, { profile: 'rfc8949', ...options.parseOptions, allowTrailingData: false })
        validate_cbor_from_slice(schema, node.raw, options.features)
        return { valid: true, errors: [], engine: CDDL_ENGINE }
      } catch (error) {
        if (error instanceof WebAssembly.RuntimeError) throw Object.assign(new Error(`CDDL backend failed: ${error.message}`), { code: 'bridge_error' })
        return { valid: false, errors: [error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error)], engine: CDDL_ENGINE }
      }
    },
    validateCip21(input: string | Uint8Array, options: Cip21Options = {}): Cip21Validation {
      let scope: 'body' | 'transaction' = 'transaction'
      const error = (rule: string, message: string): Cip21Validation => ({ valid: false, scope, specification: CIP21_SPECIFICATION, issues: [{ rule, path: '', message }] })
      try {
        // Canonical constraints apply to serialized CBOR, not opaque embedded
        // script/datum bytes. Their structure is checked by the ledger CDDL.
        const node = decodeLossless(input, { validateCanonical: true, allowIndefinite: false, allowTrailingData: false, dupMapKeyMode: 'reject', validateUtf8Strict: true, mapKeyOrder: 'length-first', limits: { maxArrayLength: 65536, maxMapSize: 65536 } }).node
        scope = node.majorType === 5 ? 'body' : 'transaction'
        const countIssues = cip21CountIssues(node)
        if (countIssues.length) return { valid: false, scope, specification: CIP21_SPECIFICATION, issues: countIssues }
        const legacy = node.majorType === 4 && node.children.length === 3
        const schema = CIP21_CDDL
        const checked = validator.validate(node.raw, schema, { root: scope === 'body' ? 'transaction_body' : legacy ? 'nachos-legacy-transaction' : 'transaction', parseOptions: { validateTagSemantics: false, limits: { maxArrayLength: 65536, maxMapSize: 65536 } } })
        if (!checked.valid) return error('ledger-schema', checked.errors.join('\n'))
        return checkCip21Node(node, options)
      } catch (cause) {
        if (cause instanceof Error && 'code' in cause && cause.code === 'bridge_error') throw cause
        return error('serialization', cause instanceof Error ? cause.message : String(cause))
      }
    },
  }
  return validator
}
