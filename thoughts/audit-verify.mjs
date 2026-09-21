import { decode, decodeWithSourceMap, encode, encodeToHex } from '../dist/index.js'

const out = []
const log = (...a) => out.push(a.join(' '))

// ---- F1: trailing data not rejected by decode() ----
try {
  const r = decode('000102')  // three separate integers 0,1,2 fed to a single decode
  log('F1 trailing-data:', JSON.stringify({ value: r.value, bytesRead: r.bytesRead }),
      '-> decode silently ignored', (3 - r.bytesRead), 'trailing byte(s)')
} catch (e) { log('F1 threw:', e.message) }

// ---- F2: O(N^2) scaling decoding an array of small integers ----
function arrHex(n) {
  // definite array header for n (use 4-byte length to be safe) + n * 0x01
  const header = '9a' + n.toString(16).padStart(8, '0')
  return header + '01'.repeat(n)
}
function timeDecode(n) {
  const hex = arrHex(n)
  const bytes = Uint8Array.from(hex.match(/../g).map(b => parseInt(b, 16)))
  const lim = { limits: { maxArrayLength: 1e7, maxInputSize: 1e9 } }
  const t0 = process.hrtime.bigint()
  const r = decode(bytes, lim)
  const t1 = process.hrtime.bigint()
  return { n, len: r.value.length, ms: Number(t1 - t0) / 1e6 }
}
const a = timeDecode(20000)
const b = timeDecode(60000)
log(`F2 perf: n=20000 -> ${a.ms.toFixed(1)}ms ; n=60000 -> ${b.ms.toFixed(1)}ms ; ` +
    `size x3 -> time x${(b.ms / a.ms).toFixed(1)} (linear≈3, quadratic≈9)`)

// ---- F3: decodeWithSourceMap deep-tag recursion vs decode() ----
const deepTag = 'c2'.repeat(60000) + '00'  // 60k nested tag 2, then integer 0
try {
  decode(deepTag, { limits: { maxTagDepth: 100 } })
  log('F3a decode(): NO error (unexpected)')
} catch (e) {
  log('F3a decode() with maxTagDepth=100:', e.message.slice(0, 60))
}
try {
  decodeWithSourceMap(deepTag, { limits: { maxTagDepth: 100 } })
  log('F3b decodeWithSourceMap(): NO error (unexpected)')
} catch (e) {
  log('F3b decodeWithSourceMap():', e.constructor.name + ':', e.message.slice(0, 60))
}

// ---- F4: canonical map key ordering (RFC 8949 §4.2.1 bytewise vs length-first) ----
// key "aa" -> 0x62 61 61 (len3) ; key 1000000 -> 0x1a 00 0f 42 40 (len5)
// §4.2.1 core bytewise: 0x1a < 0x62  => 1000000 first
// length-first (RFC7049/§4.2.3): len3 < len5 => "aa" first
const m = new Map(); m.set('aa', 1); m.set(1000000, 2)
const hex = encodeToHex(m, { canonical: true })
const firstKey = hex.startsWith('a2' + '62') ? '"aa" (length-first ordering)'
              : hex.startsWith('a2' + '1a') ? '1000000 (bytewise §4.2.1)'
              : 'unknown(' + hex + ')'
log('F4 canonical map order: first key =', firstKey)

// ---- F5: encoder maxDepth not enforced across tag boundary ----
let nested = 0
let v = nested
for (let i = 0; i < 300; i++) v = { tag: 6, value: v }  // 300 nested tags, default maxDepth=64
try {
  const r = encode(v)
  log('F5 encoder deep tags(300): encoded OK, ' + r.bytes.length + ' bytes (maxDepth=64 NOT enforced across tags)')
} catch (e) {
  log('F5 encoder deep tags(300):', e.constructor.name + ':', e.message.slice(0, 50))
}

// ---- F6: float16 NaN/round-trip & negative zero ----
log('F6 encode(-0):', encodeToHex(-0), '(expect f98000)')
log('F6 decode(f97e00) NaN:', String(decode('f97e00').value))

console.log(out.join('\n'))
