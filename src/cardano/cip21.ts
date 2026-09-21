/** Serialized-transaction restrictions from CIP-21, applied after CDDL validation. */
import type { CborNode } from '../parser/scanner'
import { nodeKey } from '../parser/scanner'
import { nodeBytes, nodeInteger, nodeMap, nodeTag } from '../parser/node-access'

export interface Cip21Issue { rule: string; path: string; message: string }
export interface Cip21Options {
  /** Catalyst registration is the exceptional auxiliary-data signing workflow. */
  catalystRegistration?: boolean
}
export interface Cip21Validation {
  valid: boolean
  scope: 'transaction' | 'body'
  issues: Cip21Issue[]
  /** Schema/serialization compatibility does not establish ledger validity or device support. */
  specification: string
}
export const CIP21_SPECIFICATION = 'https://cips.cardano.org/cip/CIP-0021'

/** Cheap cardinality checks run before the more expensive schema evaluation. */
export function cip21CountIssues(root: CborNode): Cip21Issue[] {
  const issues: Cip21Issue[] = []
  const unwrap = (n: CborNode) => nodeTag(n) === 258n ? n.children[0]! : n
  const size = (n: CborNode) => { n = unwrap(n); return n.majorType === 5 ? n.children.length / 2 : n.majorType === 4 ? n.children.length : 0 }
  const check = (n: CborNode | undefined, path: string) => { if (n && size(n) > 65535) issues.push({ rule: 'element-count', path, message: 'Element count exceeds UINT16_MAX (65535)' }) }
  const field = (n: CborNode | undefined, key: number) => n?.majorType === 5 ? nodeMap(n).find(([k]) => k.majorType === 0 && k.value === key)?.[1] : undefined
  const body = root.majorType === 5 ? root : root.children[0]
  for (const key of [0, 1, 4, 5, 9, 13, 14, 18]) check(field(body, key), `body/${key}`)
  const assets = (n: CborNode | undefined, path: string) => {
    check(n, path)
    if (n?.majorType === 5) for (const [, tokens] of nodeMap(n)) check(tokens, `${path}/tokens`)
  }
  assets(field(body, 9), 'body/9')
  const outputs = field(body, 1), collateral = field(body, 16)
  if (!issues.length) for (const [i, out] of [...(outputs?.majorType === 4 ? outputs.children : []), ...(collateral ? [collateral] : [])].entries()) {
    const amount = out.majorType === 5 ? field(out, 1) : out.children[1]
    if (amount?.majorType === 4) assets(amount.children[1], `outputs/${i}/assets`)
  }
  const certs = field(body, 4)
  if (certs) for (const [i, cert] of unwrap(certs).children.entries()) if (cert.children[0]?.value === 3) {
    check(cert.children[7], `body/4/${i}/owners`); check(cert.children[8], `body/4/${i}/relays`)
  }
  const witnesses = root.majorType === 4 ? root.children[1] : undefined
  if (witnesses?.majorType === 5 && nodeMap(witnesses).reduce((n, [, v]) => n + size(v), 0) > 65535) issues.push({ rule: 'witness-count', path: 'witnesses', message: 'Total witness count exceeds UINT16_MAX (65535)' })
  return issues
}

/** Internal policy pass; the public CDDL entry point first checks the ledger schema. */
export function checkCip21Node(root: CborNode, options: Cip21Options = {}): Cip21Validation {
  const issues: Cip21Issue[] = [], scope = root.majorType === 5 ? 'body' : 'transaction'
  const fail = (rule: string, path: string, message: string) => { if (issues.length < 100) issues.push({ rule, path, message }) }
  const body = scope === 'body' ? root : root.children[0]!, witnesses = scope === 'transaction' ? root.children[1] : undefined
  const entries = (n: CborNode) => new Map(nodeMap(n).map(([k, v]) => [Number(nodeInteger(k)), v]))
  const fields = entries(body), tagged: boolean[] = []
  const count = (node: CborNode, path: string) => {
    const n = node.majorType === 5 ? node.children.length / 2 : node.children.length
    if (n > 65535) fail('element-count', path, 'Element count exceeds UINT16_MAX (65535)')
  }
  const set = (node: CborNode, path: string, nonempty = false): CborNode => {
    const isTagged = nodeTag(node) === 258n
    tagged.push(isTagged)
    const array = isTagged ? node.children[0]! : node
    if (array.majorType !== 4) { fail('set-type', path, 'Set must be an array, optionally tagged 258'); return array }
    if (nonempty && !array.children.length) fail('nonempty', path, 'Optional sets must not be empty')
    const keys = array.children.map(n => nodeKey(n))
    if (new Set(keys).size !== keys.length) fail('set-duplicates', path, 'Set contains duplicate elements')
    count(array, path)
    return array
  }
  const integerBounds = (node: CborNode, path: string): void => {
    if (node.majorType === 1 && nodeInteger(node) < -(1n << 63n)) fail('integer-range', path, 'Signed integers must fit int64')
    if (nodeTag(node) === 2n || nodeTag(node) === 3n) fail('integer-range', path, 'Bignum serialization is unsupported by hardware wallets')
    node.children.forEach((child, i) => integerBounds(child, `${path}/${i}`))
  }
  integerBounds(root, '')
  for (const id of [6, 20]) if (fields.has(id)) fail('unsupported-body-field', `body/${id}`, `Transaction body field ${id} is unsupported`)
  for (const [id, value] of fields) if (![0, 1].includes(id) && [4, 5].includes(value.majorType) && !value.children.length) fail('optional-empty', `body/${id}`, 'Omit optional empty collections')
  for (const id of [0, 13, 14, 18]) if (fields.has(id)) set(fields.get(id)!, `body/${id}`, id !== 0)
  const assets = (value: CborNode, path: string) => {
    if (!value.children.length) fail('optional-empty', path, 'Omit an empty multiasset map')
    count(value, path)
    for (const [, tokens] of nodeMap(value)) {
      if (!tokens.children.length) fail('nonempty', path, 'Asset groups must contain at least one token')
      count(tokens, `${path}/tokens`)
    }
  }
  if (fields.has(9)) assets(fields.get(9)!, 'body/9')
  if (fields.has(5)) count(fields.get(5)!, 'body/5')
  const outputs = fields.get(1)!.children
  count(fields.get(1)!, 'body/1')
  const allOutputs = [...outputs, ...(fields.has(16) ? [fields.get(16)!] : [])]
  let outputHasDatumOrScript = false
  allOutputs.forEach((output, i) => {
    const path = i < outputs.length ? `body/1/${i}` : 'body/16'
    const map = output.majorType === 5 ? entries(output) : undefined
    const amount = map ? map.get(1)! : output.children[1]!
    if (amount.majorType === 4) assets(amount.children[1]!, `${path}/amount`)
    if (map) {
      for (const id of [2, 3]) if (map.has(id)) {
        outputHasDatumOrScript = true
        const field = map.get(id)!, content = id === 2 ? field.children[1]! : field
        const bytes = nodeTag(content) === 24n ? content.children[0]! : content
        if (bytes.majorType === 2 && !nodeBytes(bytes).length) fail('output-data-empty', `${path}/${id}`, 'Datum and reference script data must not be empty')
      }
    } else if (output.children.length > 2) outputHasDatumOrScript = true
  })
  const certificates = fields.has(4) ? set(fields.get(4)!, 'body/4', true).children : []
  let poolRegistration = false
  certificates.forEach((cert, i) => {
    const type = Number(nodeInteger(cert.children[0]!)), path = `body/4/${i}`
    if ([5, 6, 10, 11, 12, 13].includes(type)) fail('unsupported-certificate', path, `Certificate type ${type} is unsupported`)
    if (type === 3) {
      poolRegistration = true
      set(cert.children[7]!, `${path}/owners`)
      count(cert.children[8]!, `${path}/relays`)
      const margin = cert.children[5]!.children[0]!
      const numerator = nodeInteger(margin.children[0]!), denominator = nodeInteger(margin.children[1]!)
      if (denominator === 0n || numerator > denominator) fail('pool-margin', `${path}/margin`, 'Pool margin must be between zero and one, with a nonzero denominator')
    }
  })
  if (poolRegistration) {
    if (certificates.length !== 1) fail('pool-registration-combination', 'body/4', 'Pool registration must be the only certificate')
    for (const id of [5, 9, 11, 13, 14, 16, 17, 18, 19, 21, 22]) if (fields.has(id)) fail('pool-registration-combination', `body/${id}`, `Field ${id} cannot accompany pool registration`)
    if (outputHasDatumOrScript) fail('pool-registration-combination', 'body/1', 'Outputs accompanying pool registration cannot carry datum, datum hash or reference script')
  }
  if (fields.has(19)) {
    const voters = nodeMap(fields.get(19)!)
    if (voters.length !== 1 || voters.some(([, votes]) => nodeMap(votes).length !== 1)) fail('single-vote', 'body/19', 'Only one voter with one voting procedure is supported')
  }
  if (witnesses) {
    let total = 0
    for (const [id, group] of entries(witnesses)) {
      if (id === 5) total += group.majorType === 5 ? group.children.length / 2 : group.children.length
      else total += set(group, `witnesses/${id}`, true).children.length
    }
    if (total > 65535) fail('witness-count', 'witnesses', 'Total witness count exceeds UINT16_MAX (65535)')
  }
  if (tagged.some(Boolean) && tagged.some(v => !v)) fail('set-tag-consistency', '', 'Tag 258 must be used consistently at all transaction set positions')
  if (options.catalystRegistration) {
    const auxiliary = scope === 'transaction' ? root.children[root.children.length - 1] : undefined
    if (!auxiliary || auxiliary.majorType !== 4 || auxiliary.children.length !== 2 || auxiliary.children[0]!.majorType !== 5 || auxiliary.children[1]!.majorType !== 4 || auxiliary.children[1]!.children.length) fail('catalyst-auxiliary', 'auxiliary', 'Catalyst registration requires [metadata map, empty native-script array]')
  }
  return { valid: issues.length === 0, scope, issues, specification: CIP21_SPECIFICATION }
}
