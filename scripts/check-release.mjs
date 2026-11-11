/* Read-only release validation. Does not publish, install, or modify the profile. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { previewPackageInventory, validateManifest, validateHistoricalEvidence, validatePackageDirectory } from './check-package.mjs';
import { verificationFailureExitCode } from './check-clean-install.mjs';

try {

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const text = path => readFile(resolve(root, path), 'utf8');
const manifest = validateManifest(JSON.parse(await text('package.json')));
const lock = JSON.parse(await text('package-lock.json'));
assert.equal(lock.version, manifest.version, 'Lockfile version must match the manifest.');
assert.equal(lock.packages[''].version, manifest.version, 'Root lock entry must match the manifest.');
assert.equal(lock.name, manifest.name, 'Lockfile name must match the npm identity.');
assert.equal(lock.packages[''].name, manifest.name, 'Root lock name must match the npm identity.');
const inventory = await previewPackageInventory(root);
const files = new Set(inventory.files.map(file => file.path));
const { documentationLinks: links } = await validatePackageDirectory(root, { expectedManifest: manifest, inventory });
// This is preserved historical evidence, not a browser execution of the new npm identity.
const provenance = validateHistoricalEvidence(JSON.parse(await text('docs/BROWSER_RESULTS.json')));
for (const path of files) assert.ok(!/(?:^|\/)(?:node_modules|\.git|\.env(?:\.[^/]*)?|coverage)(?:\/|$)|\.tgz$/.test(path), `Unexpected private/generated package entry: ${path}`);
for (const path of Object.values(manifest.exports)) {
  if (!path.includes('*')) assert.ok(files.has(path.replace(/^\.\//, '')), `Missing export: ${path}`);
}
for (const locale of ['en', 'id']) {
  const value = JSON.parse(await text(`locale/${locale}.json`));
  assert.ok(value.meta.title.trim() && value.meta.description.trim(), `Missing ${locale} display metadata.`);
}
const icon = await readFile(resolve(root, 'icon.svg'));
assert.ok(icon.byteLength <= 256 * 1024 && icon.toString().includes('<svg'), 'Export a valid-size SVG icon.');

const client = await text('client.js');
const dictStart = client.indexOf('    const EN = {');
const dictEnd = client.indexOf('    const PRAYERS =', dictStart);
assert.ok(dictStart > 0 && dictEnd > dictStart, 'Locate the interface dictionaries.');
const dictionaries = vm.runInNewContext(`${client.slice(dictStart, dictEnd)}\n({EN, ID})`, {}, { timeout: 1000 });
assert.deepEqual(Object.keys(dictionaries.EN).sort(), Object.keys(dictionaries.ID).sort(), 'English and Indonesian keys must match.');
for (const [locale, dict] of Object.entries(dictionaries)) for (const [key, value] of Object.entries(dict)) assert.ok(typeof value === 'string' && value.trim(), `Empty ${locale} copy: ${key}`);
assert.ok(!client.includes("require('@deepseek-ai/dsh-client-"), 'Do not import internal Harness client packages.');
assert.ok(client.includes("id: 'salah-floating'"), 'Keep the floating-widget registration.');

for (const path of ['docs/images/salah-widget.webp', 'docs/images/salah-dashboard.webp']) {
  const bytes = await readFile(resolve(root, path));
  assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', `Invalid image: ${path}`);
  assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', `Invalid WebP: ${path}`);
  assert.ok(bytes.byteLength < 2 * 1024 * 1024, 'Keep README screenshots lightweight.');
  for (let cursor = 12; cursor + 8 <= bytes.length;) {
    const kind = bytes.subarray(cursor, cursor + 4).toString();
    const size = bytes.readUInt32LE(cursor + 4);
    assert.ok(!['EXIF', 'XMP '].includes(kind), `Review image metadata before publishing: ${path}`);
    assert.ok(cursor + 8 + size <= bytes.length, `Malformed image chunk: ${path}`);
    cursor += 8 + size + size % 2;
  }
}

const pathLeak = /\/(?:Users|Volumes)\//;
const secret = /gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
const reviewFiles = new Set([...files, 'package-lock.json', '.github/workflows/checks.yml']);
for (const path of reviewFiles) {
  if (!['.js', '.mjs', '.json', '.md', '.yml', '.yaml', '.css'].includes(extname(path))) continue;
  const content = await text(path);
  assert.ok(!pathLeak.test(content), `Machine-specific path in release content: ${path}`);
  assert.ok(!secret.test(content), `Credential-like content requires review: ${path}`);
  // Tests may contain subprocess source strings resolved against a fixture cwd;
  // validate the shipped runtime/build/browser helpers rather than those strings.
  if (['.js', '.mjs'].includes(extname(path)) && !/\.test\.(?:js|mjs)$/.test(path)) {
    for (const match of content.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const imported = resolve(root, dirname(path), match[1]);
      assert.ok(imported.startsWith(root + sep), `Relative import leaves release package: ${path}`);
      const relative = imported.slice(root.length + 1).split(sep).join('/');
      assert.ok(files.has(relative), `Relative import is not packed: ${path} -> ${match[1]}`);
    }
  }
}
console.log(`Release checks passed: ${manifest.name}@${manifest.version}, ${files.size} packed files, ${links} local documentation links, ${Object.keys(dictionaries.EN).length} translated interface keys.`);
console.log(`Browser provenance: historical ${provenance.package}@${provenance.version}, ${provenance.verifiedOn} only; current npm package runtime/UI was not live-retested.`);
console.log('This is a release-content check, not a new browser execution, security certification, registry-availability claim or proof of external API availability.');
} catch (error) {
  console.error(error.message);
  process.exitCode = verificationFailureExitCode(error);
}
