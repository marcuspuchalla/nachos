import { decode, decodeWithSourceMap, encode, encodeToHex, toDiagnostic } from '../dist/index.js'
let pass=0, fail=0
const check=(label,cond,detail='')=>{ if(cond){pass++;console.log(`✓ ${label}`)}else{fail++;console.log(`✗ FAIL ${label} ${detail}`)} }
const threw=(fn)=>{try{fn();return null}catch(e){return e}}

// H1: decodeWithSourceMap now guarded
const deepTag='c2'.repeat(60000)+'00'
const e1=threw(()=>decodeWithSourceMap(deepTag,{limits:{maxTagDepth:100}}))
check('H1 decodeWithSourceMap rejects deep tags cleanly (no RangeError)',
  e1 && e1.constructor.name==='Error' && /Tag nesting depth/.test(e1.message), e1 && e1.constructor.name+':'+e1.message.slice(0,40))

// H2: mapKeyOrder option
const m=new Map([['aa',1],[1000000,2]])
check('H2 default canonical = length-first', encodeToHex(m,{canonical:true}).slice(2,4)==='62')
check('H2 mapKeyOrder:bytewise reorders to §4.2.1', encodeToHex(m,{canonical:true,mapKeyOrder:'bytewise'}).slice(2,4)==='1a')
// decoder accepts matching order, rejects mismatched
const lenFirst='a2'+'626161'+'01'+'1a000f4240'+'02'
const byteWise='a2'+'1a000f4240'+'02'+'626161'+'01'
check('H2 decoder length-first accepts len-first', threw(()=>decode(lenFirst,{validateCanonical:true}))===null)
check('H2 decoder bytewise accepts bytewise', threw(()=>decode(byteWise,{validateCanonical:true,mapKeyOrder:'bytewise'}))===null)
check('H2 decoder bytewise rejects len-first', threw(()=>decode(lenFirst,{validateCanonical:true,mapKeyOrder:'bytewise'}))!==null)

// M1: trailing data
check('M1 default still lenient (bytesRead<len ok)', decode('000102').bytesRead===1)
check('M1 allowTrailingData:false rejects trailing', threw(()=>decode('000102',{allowTrailingData:false}))!==null)
check('M1 strict rejects trailing', threw(()=>decode('000102',{strict:true}))!==null)
check('M1 strict accepts exact single item', decode('00',{strict:true}).value===0)

// M2: encoder depth across tags
let v=0; for(let i=0;i<300;i++) v={tag:6,value:v}
check('M2 encoder rejects 300 nested tags (maxDepth)', threw(()=>encode(v))!==null)
let v2=0; for(let i=0;i<10;i++) v2={tag:6,value:v2}
check('M2 encoder still allows shallow nested tags', threw(()=>encode(v2))===null)

// M3: dup keys now warn (non-silent) by default — still parses
check('M3 dup keys still decode (collapse in Map view)', [...decode('a201010102').value.entries()].length===1)

// M4: canonical rejects non-shortest tag number
check('M4 canonical rejects non-shortest tag (d80100)', threw(()=>decode('d80100',{validateCanonical:true}))!==null)
check('M4 canonical accepts shortest tag (c100)', threw(()=>decode('c100',{validateCanonical:true}))===null)

// M5: float16 subnormal now shortest + self-canonical
const h=encodeToHex(5.960464477539063e-8)
check('M5 encode(2^-24) uses float16 (f9...)', h.startsWith('f9'), '=> '+h)
check('M5 encoder output passes its own validateCanonical', threw(()=>decode(h,{validateCanonical:true}))===null)

// L5: diagnostic for indefinite + simple value
check('L5 diagnostic indefinite array', toDiagnostic(decode('9f0102ff').value)==='[_ 1, 2]', '=> '+toDiagnostic(decode('9f0102ff').value))
check('L5 diagnostic simple value', toDiagnostic(decode('f820').value)==='simple(32)', '=> '+toDiagnostic(decode('f820').value))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
