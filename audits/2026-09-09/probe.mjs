/**
 * September audit observations, NOT a replacement conformance suite.
 * Run from Nachos using Node >= 20: node audits/2026-09-09/probe.mjs > observations.json
 * Builds current source in a temporary directory. Never edits production code,
 * starts servers, publishes, or updates existing TACO reports.
 * Sibling paths may be supplied through TACO_ROOT and CBOR_APP_ROOT.
 */
import { build } from 'esbuild';
import { readFile, mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const taco = process.env.TACO_ROOT || resolve(root, '../taco');
const app = process.env.CBOR_APP_ROOT || resolve(root, '../cbor_decoder');
const temp = await mkdtemp(join(tmpdir(), 'nachos-audit-'));
const rows = [];
const warnings = [];
const originalWarn = console.warn;
console.warn = (...args) => warnings.push(args.map(String).join(' '));
const sha256 = data => createHash('sha256').update(data).digest('hex');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const json = value => JSON.stringify(value, (_, v) => {
  if (v === undefined) return { $undefined: true };
  if (typeof v === 'bigint') return { $bigint: String(v) };
  if (typeof v === 'number' && (!Number.isFinite(v) || Object.is(v, -0))) return { $float: Object.is(v, -0) ? '-0' : String(v) };
  if (v instanceof Uint8Array) return { $bytes: Buffer.from(v).toString('hex') };
  if (v instanceof Map) return { $map: [...v] };
  return v;
}, 2);

async function check(id, description, expected, run, accepts) {
  let actual, error;
  try { actual = await run(); } catch (e) { error = String(e.message || e); }
  const met = expected === 'reject' ? error !== undefined : error === undefined && (accepts ? accepts(actual) : true);
  rows.push({ id, description, expected, met, ...(error === undefined ? { actual } : { error }) });
}

try {
  const modulePath = join(temp, 'nachos.mjs');
  const bundle = await build({ entryPoints: [join(root, 'src/index.ts')], bundle: true, platform: 'node', format: 'esm', target: 'es2022', outfile: modulePath, metafile: true, logLevel: 'silent' });
  const n = await import(pathToFileURL(modulePath).href);
  const sourceDigest = createHash('sha256');
  for (const file of Object.keys(bundle.metafile.inputs).sort()) {
    sourceDigest.update(file).update(await readFile(file));
  }
  const core = [
    ['N01-empty-bytes', 'Unterminated indefinite byte string', '5f', {}, 'reject'],
    ['N01-bytes-chunk', 'Unterminated indefinite byte string with chunk', '5f4101', {}, 'reject'],
    ['N01-empty-text', 'Unterminated indefinite text string', '7f', {}, 'reject'],
    ['N01-text-chunk', 'Unterminated indefinite text string with chunk', '7f6161', {}, 'reject'],
    ['N02-bom', 'Preserve U+FEFF at start of text', '63efbbbf', {}, 'U+FEFF', r => r.value === '\ufeff'],
    ['N03-bignum', 'Validate tag 2 before semantic conversion', 'c24101', { validateTagSemantics: true }, 'tag 2 / 1n', r => r.value?.tag === 2 && r.value.value === 1n],
    ['N03-decimal', 'Decimal fraction with bignum mantissa', 'c48200c249010000000000000000', { validateTagSemantics: true }, 'accept'],
    ['N03-float-exponent', 'Tag 4 exponent has the wrong CBOR major type', 'c482f9000001', { validateTagSemantics: true }, 'reject'],
    ['N03-chunk-limit', 'Apply maxBignumBytes to indefinite byte content', 'c25f420100ff', { limits: { maxBignumBytes: 1 } }, 'reject'],
    ['N04-array-length', 'Reject nonpreferred array length in deterministic mode', '980100', { validateCanonical: true }, 'reject'],
    ['N04-map-order', 'Reject unsorted map in deterministic mode', 'a202000100', { validateCanonical: true }, 'reject'],
    ['N04-trailing', 'Enforce explicit single-item consumption option', '0102', { allowTrailingData: false }, 'reject'],
    ['N04-unwrap', 'Honor unwrapSelfDescribed consistently', 'd9d9f701', { unwrapSelfDescribed: true }, '1', r => r.value === 1],
    ['N05-maps', 'Distinct maps used as map keys', 'a2a1010100a1010201', { dupMapKeyMode: 'reject' }, 'two entries', r => r.value.size === 2],
    ['N05-arrays', 'Distinct array keys must not collide through delimiters', 'a28167612c7374723a6200826161616201', { dupMapKeyMode: 'reject' }, 'two entries', r => r.value.size === 2],
    ['N05-text-duplicate', 'Equal text keys with different chunking', 'a26161007f6161ff01', { dupMapKeyMode: 'reject' }, 'reject'],
    ['N05-nan-sign', 'RFC 8949 verified erratum 8589 distinguishes NaN map keys with different signs', 'a2f97e0000f9fe0001', { dupMapKeyMode: 'reject' }, 'two entries', r => r.value.size === 2],
    ['N06-float', '1.5 fits binary16; reject binary32 in deterministic mode', 'fa3fc00000', { validateCanonical: true }, 'reject'],
    ['N08-depth', 'Collection depth must survive intervening tags', '81d86481d8648100', { limits: { maxDepth: 2, maxTagDepth: 2 } }, 'reject'],
    ['N09-tag64', 'Preserve supported CBOR uint64 tag space', 'db0020000000000000f6', {}, 'accept'],
    ['N10-embedded-type', 'Validate tag 24 content type', 'd81800', { validateTagSemantics: true }, 'reject'],
    ['N10-embedded-malformed', 'Validate embedded item under tag 24', 'd81841ff', { validateTagSemantics: true }, 'reject'],
    ['N10-base64', 'Reject impossible one-character base64url', 'd8216141', { validateTagSemantics: true }, 'reject'],
    ['N11-plutus-big-index', 'Tag 102 constructor index is a uint64', 'd866821b002000000000000080', { validatePlutusSemantics: true }, 'accept'],
    ['N11-plutus-text', 'Plutus constructor fields cannot contain text', 'd879816161', { validatePlutusSemantics: true }, 'reject'],
    ['control-uint64', 'Exact uint64 maximum', '1bffffffffffffffff', {}, '18446744073709551615n', r => r.value === 18446744073709551615n],
    ['control-nint64', 'Exact negative integer lower endpoint', '3bffffffffffffffff', {}, '-18446744073709551616n', r => r.value === -18446744073709551616n],
    ['control-indefinite', 'Generic mode accepts valid indefinite array', '9f01ff', {}, '[1]', r => r.value.length === 1 && r.value[0] === 1],
    ['control-simple-malformed', 'Two-byte encoding below simple value 32', 'f800', {}, 'reject'],
    ['control-utf8', 'Configured strict UTF-8 rejects overlong encoding', '62c080', { validateUtf8Strict: true }, 'reject'],
    ['control-float', 'Decode binary16 1.5', 'f93e00', {}, '1.5', r => r.value === 1.5],
  ];
  for (const [id, description, hex, options, expected, accepts] of core) {
    for (const api of ['decode', 'decodeWithSourceMap']) {
      for (const inputType of ['hex', 'bytes']) {
        await check(`${id}/${api}/${inputType}`, description, expected,
          () => { const r = n[api](inputType === 'hex' ? hex : Uint8Array.from(Buffer.from(hex, 'hex')), options); return { hex, options, value: r.value, bytesRead: r.bytesRead }; }, accepts);
      }
    }
  }
  for (const api of ['decode', 'decodeWithSourceMap']) {
    await check(`N07-canonical/${api}`, 'Deterministic encoding must sort decoded map entries', 'a200010100', () => n.encode(n[api]('a201000001').value, { canonical: true }).hex, x => x === 'a200010100');
    await check(`N07-simple/${api}`, 'Unassigned simple value round-trip', 'f82a', () => n.encode(n[api]('f82a').value).hex, x => x === 'f82a');
    await check(`N04-preserve/${api}`, 'Lossless re-encode retains accepted duplicate entries', 'a201010102', () => n.encode(n[api]('a201010102', { dupMapKeyMode: 'allow' }).value).hex, x => x === 'a201010102');
  }
  await check('N04-paths', 'Integer key 1 and string key "1" need distinct source paths', 'unique paths', () => n.decodeWithSourceMap('a20100613101').sourceMap.map(e => e.path), paths => new Set(paths).size === paths.length);
  await check('N08-sequence-size', 'Apply whole-sequence maxInputSize to source-map sequence API', 'reject', () => n.useCborParser().parseSequenceWithSourceMap('0102', { limits: { maxInputSize: 1 } }));
  await check('N08-output', 'Apply declared decoder maxOutputSize consistently', 'reject', () => n.decode('4401020304', { limits: { maxOutputSize: 1 } }));
  await check('N10-date', 'Reject a timezone-free tag-0 date', 'reject', () => n.decode(n.encode({ tag: 0, value: '2026-09-09T12:00:00' }).hex, { validateTagSemantics: true }));
  await check('N12-base32', 'Diagnostic input supports RFC notation base32 bytes', '12345678', () => Buffer.from(n.fromDiagnostic("b32'CI2FM6A'")).toString('hex'), x => x === '12345678');
  await check('N12-empty-chunks', 'Diagnostic input handles empty indefinite byte string', 'accept', () => n.fromDiagnostic("h''_"));
  await check('N12-simple', 'Diagnostic simple value re-encodes as simple value', 'f82a', () => n.encode(n.fromDiagnostic('simple(42)')).hex, x => x === 'f82a');
  await check('N12-bignum-output', 'Diagnostic bignum content remains a byte string', 'contains h\'01\'', () => n.decodeToDiagnostic('c24101'), x => x.includes("h'01'"));
  await check('N11-label', 'Cardano inspector labels Plutus tag 121 correctly', 'constructor description', () => n.useCardanoCborDecoder().decode('d87980').sourceMap[0].description, x => /constr/i.test(x));
  const helpers = n.useCardanoHelpers();
  await check('N11-shelley-envelope', 'Three-element transaction metadata stays in auxiliaryData', 'metadata at auxiliaryData', () => helpers.parseTransaction('83a40080018002000300a0a10102'), tx => tx.auxiliaryData instanceof Map && tx.auxiliaryData.get(1) === 2 && tx.isValid === undefined);
  await check('N11-witness-set', 'Normalize Conway tagged witness collections to typed array field', 'array', () => helpers.parseWitnessSet(n.decode('a103d90102814100').value).plutusV1Scripts, Array.isArray);

  // Independent numeric oracle: enumerate every finite binary16 bit pattern,
  // widen to binary32, and require deterministic decoding to reject the width.
  let finite = 0, incorrectlyAccepted = 0;
  const examples = [];
  for (let bits = 0; bits < 65536; bits++) {
    const exponent = (bits >>> 10) & 31, fraction = bits & 1023;
    if (exponent === 31) continue;
    const sign = bits & 32768 ? -1 : 1;
    const value = sign * (exponent === 0 ? fraction * 2 ** -24 : (1024 + fraction) * 2 ** (exponent - 25));
    const b = new Uint8Array(5); b[0] = 0xfa;
    new DataView(b.buffer).setFloat32(1, value, false);
    finite++;
    try {
      n.decode(b, { validateCanonical: true }); incorrectlyAccepted++;
      if (examples.length < 5) examples.push({ binary16: bits.toString(16).padStart(4, '0'), binary32: Buffer.from(b).toString('hex'), value });
    } catch { /* expected */ }
  }

  // Exercise actual TACO comparison/runner functions with mocked transport.
  // Only imports, import.meta path setup, and the main() call are removed.
  const runnerFile = join(taco, 'docker/runner/runner.js');
  const runnerSource = await readFile(runnerFile, 'utf8');
  const runnable = runnerSource.replace(/^import .*;\r?\n/gm, '').replace(/^const __dirname = .*;\r?\n/m, '').replace(/^main\(\)\.catch\(console\.error\);\s*$/m, '');
  let responder = () => ({ success: false, error: 'unset' });
  const context = vm.createContext({ process: { env: {} }, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, AbortController,
    fetch: async (url, options) => ({ status: 200, json: async () => responder(url, options) }) });
  vm.runInContext(runnable, context, { timeout: 5000, filename: runnerFile });
  await check('T01-bytes-text', 'Comparison distinguishes bytes from hex text', 'false', () => context.deepEqual(context.normalizeResult({ __cbor_bytes__: '01' }), '01'), x => x === false);
  await check('T01-number-text', 'Comparison distinguishes integer from decimal text', 'false', () => context.deepEqual(42, '42'), x => x === false);
  await check('T01-tags', 'Lossless comparison distinguishes different unknown tags', 'false', () => context.deepEqual({ __cbor_tag__: 999, __cbor_value__: 1 }, { __cbor_tag__: 1000, __cbor_value__: 1 }), x => x === false);
  await check('T01-minus-zero', 'Comparison preserves negative zero', 'false', () => context.deepEqual(-0, 0), x => x === false);
  responder = url => url.endsWith('/decode') ? { success: true, result: 1 } : { success: true, hex: 'ff' };
  await check('T02-roundtrip', 'Reject malformed encoder output after correct decode', 'passed:false', () => context.runTest({ host: 'mock', port: 1 }, { id: 'audit', inputHex: '01', shouldSucceed: true, expectedOutput: 1 }), r => r.passed === false);
  responder = () => ({ success: false, error: 'TypeError: broken adapter' });
  await check('T03-anyof', 'anyOf rejection must not accept adapter failure', 'passed:false', () => context.runTest({ host: 'mock', port: 1 }, { id: 'audit', inputHex: '61ff', anyOf: [{ success: false }] }), r => r.passed === false);

  // The actual Nachos adapter, without starting its HTTP server.
  const adapterFile = join(taco, 'docker/containers/node-nachos/server.js');
  const adapterSource = await readFile(adapterFile, 'utf8');
  const adapter = vm.createContext({ decode: n.decode, encode: n.encode, process, Buffer, Uint8Array, Map, console: { log() {}, warn() {}, error() {} } });
  vm.runInContext(adapterSource.replace(/^import .*;\r?\n/gm, '').split('// Start server')[0], adapter, { timeout: 5000, filename: adapterFile });
  await check('T01-map-keys', 'Adapter retains both integer 1 and text "1" keys', 'two entries', () => adapter.toJsonSafe(new Map([[1, 'integer'], ['1', 'text']])), x => Object.keys(x).length === 2);

  const corpus = [];
  async function loadCorpus(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await loadCorpus(path);
      else if (path.endsWith('.json')) {
        const data = JSON.parse(await readFile(path, 'utf8'));
        corpus.push(...(data.testCases || []).map(test => ({ ...test, sourceFile: path.slice(taco.length + 1) })));
      }
    }
  }
  await loadCorpus(join(taco, 'tests'));
  responder = (url, options) => {
    const body = JSON.parse(options.body);
    // Serialize through JSON just as the HTTP bridge does.
    return JSON.parse(JSON.stringify(url.endsWith('/decode') ? adapter.decodeHex(body.hex) : adapter.encodeValue(body.value)));
  };
  const corpusResults = [];
  for (const test of corpus) corpusResults.push(await context.runTest({ host: 'mock', port: 1 }, test));

  for (const filename of ['cborJson', 'cborToJson']) {
    const output = join(temp, `${filename}.mjs`);
    await build({ entryPoints: [join(app, `src/utils/${filename}.ts`)], bundle: true, platform: 'node', format: 'esm', outfile: output, logLevel: 'silent' });
    const util = await import(pathToFileURL(output).href);
    if (filename === 'cborJson') {
      await check('A02-json-map', 'CBOR-aware JSON serializer preserves Maps', 'contains entries', () => util.stringifyCborValue(new Map([[1, 'value']])), x => x.includes('value'));
      await check('A02-json-special', 'CBOR-aware JSON preserves undefined, NaN, negative zero', 'distinct typed values', () => util.stringifyCborValue([undefined, NaN, -0]), x => x !== '[null,null,0]');
    } else {
      await check('A02-display-keys', 'Display retains mixed-type map keys', 'two entries', () => util.cborToJsonObject(new Map([[1, 'integer'], ['1', 'text']])), x => Object.keys(x).length === 2);
      await check('A02-proto-key', 'Display retains literal __proto__ map key', 'own property', () => util.cborToJsonObject(new Map([['__proto__', 'value']])), x => Object.hasOwn(x, '__proto__'));
    }
  }
  const counts = items => items.reduce((acc, key) => ({ ...acc, [key]: (acc[key] || 0) + 1 }), {});
  const report = {
    generatedAt: new Date().toISOString(), node: process.version,
    scope: 'Targeted audit observations; unmet expectations mix correctness defects, API promises, and planned completeness features. Counts are not RFC coverage percentages.',
    provenance: {
      nachos: { head: git(root, 'rev-parse', 'HEAD'), diffSha256: sha256(git(root, 'diff')), bundledSourceSha256: sourceDigest.digest('hex') },
      taco: { head: git(taco, 'rev-parse', 'HEAD'), diffSha256: sha256(git(taco, 'diff')), runnerSha256: sha256(runnerSource), adapterSha256: sha256(adapterSource) },
      app: { head: git(app, 'rev-parse', 'HEAD'), diffSha256: sha256(git(app, 'diff')) },
    },
    summary: { checks: rows.length, met: rows.filter(r => r.met).length, unmet: rows.filter(r => !r.met).length },
    binary16Exhaustive: { finitePatterns: finite, incorrectlyAcceptedAsDeterministicBinary32: incorrectlyAccepted, examples },
    tacoCorpus: {
      note: 'Current source runner and Nachos adapter with in-memory HTTP responses and current Nachos source. NOT a Docker run or a trustworthy library ranking; runner defects are demonstrated above.',
      total: corpus.length, categories: counts(corpus.map(t => t.category)), sectionsPresent: corpus.filter(t => t.rfcSection).length,
      outcomes: counts(corpusResults.map(r => r.category)), failures: corpusResults.filter(r => !r.passed),
    },
    checks: rows, warnings,
  };
  process.stdout.write(json(report) + '\n');
} finally {
  console.warn = originalWarn;
  await rm(temp, { recursive: true, force: true });
}
