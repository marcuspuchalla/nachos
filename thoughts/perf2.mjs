import { decode } from '../dist/index.js'
const lim = { limits: { maxArrayLength: 1e8, maxInputSize: 1e9 } }
function t(n){
  const hex='9a'+n.toString(16).padStart(8,'0')+'01'.repeat(n)
  const bytes=Uint8Array.from(hex.match(/../g).map(b=>parseInt(b,16)))
  const a=process.hrtime.bigint(); decode(bytes,lim); const b=process.hrtime.bigint()
  return Number(b-a)/1e6
}
for(const n of [50000,100000,200000,400000]){
  const ms=t(n); console.log(`n=${n}\t${ms.toFixed(1)}ms\t${(ms/n*1000).toFixed(3)}us/elem`)
}
