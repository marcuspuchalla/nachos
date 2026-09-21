/**
 * Run from Nachos with Node >= 20. Regenerates TACO vectors only in a temporary
 * copy, reports drift and linter output as JSON, and deletes the temporary copy.
 */
import { build } from 'esbuild';
import { mkdtemp, cp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const taco = process.env.TACO_ROOT || resolve(root, '../taco');
const temp = await mkdtemp(join(tmpdir(), 'taco-generator-audit-'));
const changed = [];
try {
  await cp(join(taco, 'tests'), join(temp, 'tests'), { recursive: true });
  await mkdir(join(temp, 'scripts'), { recursive: true });
  for (const name of ['generate-all-tests', 'generate-cardano-tests', 'generate-edge-cases']) {
    const output = join(temp, 'src/generators', `${name}.cjs`);
    await build({ entryPoints: [join(taco, `src/generators/${name}.ts`)], bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent' });
    execFileSync(process.execPath, [output], { timeout: 15000 });
  }
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) { await walk(path); continue; }
      if (!path.endsWith('.json')) continue;
      const relative = path.slice(join(temp, 'tests').length + 1);
      const generated = JSON.parse(await readFile(path, 'utf8'));
      let existing;
      try { existing = JSON.parse(await readFile(join(taco, 'tests', relative), 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (JSON.stringify(existing) === JSON.stringify(generated)) continue;
      const oldTests = existing?.testCases || [], newTests = generated.testCases || [];
      changed.push({
        file: relative, currentCount: oldTests.length, generatedCount: newTests.length,
        currentAnyOf: oldTests.filter(t => t.anyOf).length,
        generatedAnyOf: newTests.filter(t => t.anyOf).length,
        changedIds: newTests.filter(t => JSON.stringify(oldTests.find(v => v.id === t.id)) !== JSON.stringify(t)).map(t => t.id),
      });
    }
  }
  await walk(join(temp, 'tests'));
  await cp(join(taco, 'scripts/lint-vectors.mjs'), join(temp, 'scripts/lint-vectors.mjs'));
  let lint;
  try {
    lint = execFileSync(process.execPath, [join(temp, 'scripts/lint-vectors.mjs')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 });
  } catch (error) {
    lint = { exitCode: error.status, stdout: error.stdout, stderr: error.stderr };
  }
  process.stdout.write(JSON.stringify({
    generatedAt: new Date().toISOString(),
    method: 'Copied current TACO tests to a temporary directory; bundled and ran all three source generators there; then ran the existing vector linter. Original tests were not changed.',
    changed, lint,
  }, null, 2) + '\n');
} finally {
  await rm(temp, { recursive: true, force: true });
}
