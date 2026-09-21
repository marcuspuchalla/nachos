/** Rebuild the optional WASM backend from a pinned, locally patched upstream. */
import { mkdtemp, readFile, writeFile, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const specs = join(root, 'specs/roadmap-2026-09');
const { cddl } = JSON.parse(await readFile(join(specs, 'sources.json'), 'utf8'));
const cwd = await mkdtemp(join(tmpdir(), 'nachos-cddl-'));
const response = await fetch(`https://api.github.com/repos/anweiss/cddl/tarball/${cddl.revision}`);
if (!response.ok) throw new Error(`Source download failed: ${response.status}`);
await writeFile(join(cwd, 'source.tgz'), new Uint8Array(await response.arrayBuffer()));
execFileSync('tar', ['-xzf', 'source.tgz', '--strip-components=1'], { cwd, stdio: 'inherit' });
await copyFile(join(specs, cddl.lockfile), join(cwd, 'Cargo.lock'));
execFileSync('patch', ['-p1', '-i', join(specs, cddl.patch)], { cwd, stdio: 'inherit' });
execFileSync('wasm-pack', ['build', '--target', 'web', '--release', '--out-dir', 'pkg', '--', '--locked'], { cwd, stdio: 'inherit' });
for (const file of ['cddl.js', 'cddl.d.ts', 'cddl_bg.wasm']) await copyFile(join(cwd, 'pkg', file), join(root, 'src/cddl/vendor', file));
console.log(`Rebuilt ${cddl.engine} ${cddl.version} in ${cwd}. Run all roadmap tests before accepting the artifact.`);
