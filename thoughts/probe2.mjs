import { decode, encodeToHex } from '../dist/index.js'
// Map where length-first and bytewise orders DIFFER:
// key "aa"->62 61 61 (len3); key 1000000->1a 00 0f 42 40 (len5)
const m = new Map([['aa',1],[1000000,2]])
const hex = encodeToHex(m, { canonical: true })
console.log('encoder canonical output:', hex)
console.log('  -> first key encoded as', hex.slice(2,4)==='62'?'"aa" (length-first)':'1000000 (bytewise)')
try {
  const r = decode(hex, { validateCanonical: true })
  console.log('decode(validateCanonical) of encoder output: OK ->', JSON.stringify([...r.value.entries()]))
} catch(e){
  console.log('decode(validateCanonical) of encoder output: THROW ->', e.message.slice(0,90))
}
// What order does the DECODER consider canonical? feed both orderings:
const lenFirst = 'a2' + '626161'+'01' + '1a000f4240'+'02'  // "aa" then 1000000
const byteWise = 'a2' + '1a000f4240'+'02' + '626161'+'01'  // 1000000 then "aa"
for (const [name,h] of [['len-first',lenFirst],['bytewise',byteWise]]){
  try{ decode(h,{validateCanonical:true}); console.log(`decoder accepts ${name} order: YES`)}
  catch(e){ console.log(`decoder accepts ${name} order: NO (${e.message.slice(0,50)})`)}
}
