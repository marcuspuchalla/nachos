import { decode } from '../dist/index.js'
const t=(l,h)=>{try{decode(h,{validateCanonical:true});console.log(`ACCEPTS ${l} (${h})`)}catch(e){console.log(`REJECTS ${l} (${h}): ${e.message.slice(0,55)}`)}}
// Tag 0 non-shortest: d800xx vs c0xx. Use tag 1 epoch over an int to keep value valid:
t('non-shortest tag1 1-byte d80100', 'd80100')        // tag 1 via AI24 (should be c1)
t('shortest tag1 c100', 'c100')
// Simple value non-shortest? simple 'true'(21) only has 1 form. Float NaN non-canonical:
t('float32 NaN faff800000', 'faff800000')              // NaN as f32 (canonical NaN must be f97e00)
t('float64 NaN', 'fb7ff8000000000000')
// float16 value that round-half-to-even encoder makes f16 but decoder truncation may judge differently
// 1.0009765625 = 1 + 1/1024 exactly representable in f16 -> fine. Try a value near rounding boundary:
