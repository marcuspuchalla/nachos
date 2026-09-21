import { encodeToHex, decode } from '../dist/index.js'
// Find a value the encoder emits as f16 but decoder validateCanonical might flag, or vice versa.
// Test several values: encode shortest, then decode that exact hex with validateCanonical.
for (const v of [1.5, 0.1, 65504, 5.960464477539063e-8, 2.9802322e-8, 1.0009765625]) {
  const h = encodeToHex(v)
  let verdict
  try { decode(h, { validateCanonical: true }); verdict='accepted' }
  catch(e){ verdict='REJECTED: '+e.message.slice(0,45) }
  console.log(`encode(${v}) = ${h}  -> decode(validateCanonical): ${verdict}`)
}
