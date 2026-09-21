import { decode, encodeToHex } from '../dist/index.js'
const ok=(l,f)=>{try{const v=f();console.log(`PASS ${l}: ${typeof v==='object'?JSON.stringify(v,(k,x)=>typeof x==='bigint'?x+'n':x):v}`)}catch(e){console.log(`THROW ${l}: ${e.message.slice(0,70)}`)}}
// Well-formedness / reserved
ok('reserved AI28 int (1c)',()=>decode('1c').value)
ok('break 0xff at top level',()=>decode('ff').value)
ok('simple val 1-byte f818 (<32, ill-formed)',()=>decode('f818').value)
ok('simple val f820 (=32, ok)',()=>JSON.stringify(decode('f820').value))
ok('indefinite array w/ validateCanonical',()=>decode('9f01ff',{validateCanonical:true}).value)
ok('non-shortest int 1818=24 w/ validateCanonical',()=>decode('1818',{validateCanonical:true}).value)
ok('non-shortest int 1817 (24 wrongly? 0x18 0x17=23) validateCanonical',()=>decode('1817',{validateCanonical:true}).value)
// Floats
ok('f93c00 -> 1.0',()=>decode('f93c00').value)
ok('f97bff -> 65504',()=>decode('f97bff').value)
ok('fa47c35000 -> 100000 (f32)',()=>decode('fa47c35000').value)
ok('fb7e37e43c8800759c (1e300 f64)',()=>decode('fb7e37e43c8800759c').value)
ok('f90000 -> 0',()=>decode('f90000').value)
ok('f98000 -> -0',()=>Object.is(decode('f98000').value,-0)?'-0 (Object.is)':decode('f98000').value)
// Bignum
ok('c249010000000000000000 (tag2 bignum 2^72)',()=>decode('c249010000000000000000').value)
ok('c349010000000000000000 (tag3 neg bignum)',()=>decode('c349010000000000000000').value)
// Tag 0 date string default (no validation)
ok('c074...date default',()=>JSON.stringify(decode('c0743230').value))
// Map key ordering on decode w/ validateCanonical (out-of-order keys a2 02 .. 01 ..)
ok('map keys out-of-order w/ validateCanonical (a202000101)',()=>JSON.stringify([...decode('a2020001 01'.replace(/ /g,''),{validateCanonical:true}).value.entries()]))
// Encoder: half-float shortest for 1.5
ok('encode(1.5) shortest',()=>encodeToHex(1.5))
ok('encode(100000)',()=>encodeToHex(100000))
ok('encode(1.1) (not f16/f32 repr)',()=>encodeToHex(1.1))
// duplicate keys default allow
ok('dup keys default a201 0102 (a2 0101 0102)',()=>JSON.stringify([...decode('a201010102'.replace(/ /g,'')).value.entries()]))
