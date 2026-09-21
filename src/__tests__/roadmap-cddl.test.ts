import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { createCddlValidator, CONWAY_CDDL } from '../cddl'
import { encode, fromDiagnostic } from '../index'

const validator = createCddlValidator(readFileSync(new URL('../cddl/vendor/cddl_bg.wasm', import.meta.url)))
const validate = (schema: string, diagnostic: string) => validator.validate(encode(fromDiagnostic(diagnostic, { preserveFloatType: true }) as never).bytes, schema)

describe('RFC 8610 CDDL validation', () => {
  it.each([
    ['root = {name: tstr, age: 0..150, ? active: bool}', '{"name":"Alice","age":42}', '{"name":"Alice","age":151}'],
    ['root = [uint, + tstr]', '[1,"a","b"]', '[1]'],
    ['root = [2*3 uint]', '[1,2,3]', '[1,2,3,4]'],
    ['root = [(* uint, tstr)]', '[1,2,"end"]', '[1,2]'],
    ['root = {+ tstr => uint}', '{"a":1,"b":2}', '{}'],
    ['root = 1 / 2 / tstr', '"x"', '3'],
    ['root = [(uint, tstr) // (tstr, bool)]', '["x",true]', '["x",3]'],
    ['root = pair<uint>\npair<T> = [T, T]', '[1,2]', '[1,"x"]'],
    ['root = {value:uint, ? next: root}', '{"value":1,"next":{"value":2}}', '{"value":1,"next":{"value":-1}}'],
    ['root = [fields]\nfields = (x:uint, y:tstr)', '[1,"x"]', '["x",1]'],
    ['root = &choices\nchoices = (red:1, green:2, blue:3)', '2', '4'],
    ['root = ~tagged\ntagged = #6.32(tstr)', '"https://example.org"', '32("https://example.org")'],
    ['root = #6.123([uint])', '123([1])', '124([1])'],
    ['root = #2', "h'0102'", '"ab"'],
    ['root = uint .size 1', '255', '256'],
    ['root = bstr .size (2..3)', "h'010203'", "h'01'"],
    ['root = tstr .regexp "[a-z]+"', '"abc"', '"ABC"'],
    ['root = bstr .cbor uint', "h'182a'", "h'20'"],
    ['root = bstr .cborseq [* uint]', "h'010203'", "h'0120'"],
    ['root = uint .bits flags\nflags = &(a:0,b:2)', '5', '2'],
    ['root = uint .lt 10', '9', '10'], ['root = uint .le 10', '10', '11'],
    ['root = uint .gt 10', '11', '10'], ['root = uint .ge 10', '10', '9'],
    ['root = uint .eq 10', '10', '9'], ['root = uint .ne 10', '9', '10'],
    ['root = uint .and (1..3)', '2', '4'], ['root = uint .within (1..3)', '2', '4'],
    ['root = {? count: uint .default 0}', '{}', '{"count":-1}'],
    ['root = choice\nchoice = uint\nchoice /= tstr', '"x"', 'false'],
    ['root = [group]\ngroup = (uint)\ngroup //= (tstr)', '["x"]', '[false]'],
    ['root = [$socket]\n$socket /= uint', '[1]', '[false]'],
    ['root = [$$socket]\n$$socket //= (uint,tstr)', '[1,"x"]', '[false]'],
    ['root = {"kind": 1, x:uint} / {"kind":2, y:tstr}', '{"kind":2,"y":"x"}', '{"kind":2,"x":1}'],
    ['root = {tstr ^ => uint, * any => any}', '{"x":1,1:false}', '{"x":false}'],
    ['root = 1...4', '3', '4'],
    ['root = float16', '1.5', '1'],
    ['root = float16', '65504.0', '65505.0'],
    ['root = float32', '1.5', '1.1'],
    ['root = #7.25', '1.5', '1.1'],
    ['root = undefined', 'undefined', 'null'],
    ['root = null', 'null', 'undefined'],
    ['root = ~tagged<uint>\ntagged<T> = #6.32(T)', '1', '32(1)'],
    ['root = [~pair, bool]\npair = [uint,tstr]', '[1,"x",true]', '[1,"x"]'],
    ['root = bstr .cbor uint', "h'01'", "h'0102'"],
    ['root = bstr .cborseq [* uint]', "h''", "h'18'"],
    ['root = 18446744073709551615', '18446744073709551615', '18446744073709551614'],
    ['root = -18446744073709551616', '-18446744073709551616', '-18446744073709551615'],
    ['root = -9223372036854775808..18446744073709551615', '18446744073709551615', '-9223372036854775809'],
    ['root = {* key => uint}\nkey = bytes .size 2', "{h'0102':1}", "{h'01':1}"],
    ['root = {+ key => {+ action => [0..2,null]}}\nkey=[0..4,bstr]\naction=[bstr,uint]', "{[2,h'01']:{[h'02',0]:[1,null]}}", "{[2,h'01']:{[h'02',0]:[3,null]}}"],
    ['root = [metadata,[]]\nmetadata={* uint => datum}\ndatum={*datum=>datum}/[*datum]/uint/bstr', "[{61284:{1:h'00'}},[]]", "[{61284:{1:true}},[]]"],
    ['root = tstr', '"uri"', '32("uri")'],
    ['root = uint', '1', '123(1)'],
    ['root = uint', '1', '{1:true}'],
    ['root = tstr', '"x"', '{"x":true}'],
    ['root = bstr', "h'00'", "{h'00':true}"],
    ['root = bool', 'true', '{true:true}'],
    ['root = float', '1.5', '{1.5:true}'],
    ['root = 1', '1', '{1:true}'],
    ['root = uint .bits flags\nflags = &(high:63)', '9223372036854775808', '0'],
    ['root = uri', '32("https://example.org")', '"https://example.org"'],
    ['root = time', '1(18446744073709551615)', '0'],
  ])('%s', (schema, good, bad) => {
    expect(validate(schema, good), good).toMatchObject({ valid: true, errors: [] })
    expect(validate(schema, bad), bad).toMatchObject({ valid: false })
  })
  it('lints every pinned CIP-21 schema root without relying on the trusted-schema shortcut', () => {
    const schema = CONWAY_CDDL + '\nnachos-legacy-transaction = [transaction_body, transaction_witness_set, auxiliary_data / nil]\n'
    for (const [root, hex] of [['transaction_body','a3008001800200'], ['transaction','84a3008001800200a0f5f6'], ['nachos-legacy-transaction','83a3008001800200a0f6']]) {
      expect(validator.validate(hex!, 'lint-entry = ' + root + '\n' + schema)).toMatchObject({ valid: true, errors: [] })
    }
    expect(validator.validate('01', 'root=uint').valid).toBe(true)
    expect(validator.validate('01', 'root=missing').valid).toBe(false)
  })
  it('selects a named root without changing the schema semantics', () => {
    expect(validator.validate('6161', 'a = uint\nb = tstr', { root: 'b' }).valid).toBe(true)
    expect(validator.validate('6161', 'a = uint\nb = tstr').valid).toBe(false)
  })
  it('returns schema, trailing-data, invalid UTF-8, duplicate-key and size failures', () => {
    for (const [hex, schema] of [['01', 'root = ['], ['01', 'root = missing'], ['0102','root=uint'], ['61ff','root=tstr'], ['a201000101','root={*uint=>uint}']]) expect(validator.validate(hex!, schema!).valid).toBe(false)
    expect(validator.validate('01', 'root=uint', { maxSchemaBytes: 1 }).valid).toBe(false)
    expect(validator.validate('01', 'root=uint', { root: 'root\nother=any' }).valid).toBe(false)
  })
})
