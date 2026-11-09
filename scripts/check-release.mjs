/* Read-only release validation. Does not publish, install, or modify the profile. */
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { npmCommand } from './node-cli.mjs';
import vm from 'node:vm';
import { MANDATORY_CHECKS } from '../test/e2e/regressions.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const text = path => readFile(resolve(root, path), 'utf8');
const manifest = JSON.parse(await text('package.json'));
const lock = JSON.parse(await text('package-lock.json'));
assert.equal(lock.version, manifest.version, 'Lockfile version must match the manifest.');
assert.equal(lock.packages[''].version, manifest.version, 'Root lock entry must match the manifest.');
assert.equal(manifest.license, 'MIT');
assert.equal(manifest.private, true, 'This release is a private npm package distributed as a local GitHub bundle.');
assert.equal(manifest.name, '@local/dsh-salah');
assert.ok(manifest.engines.dsh && manifest.engines.node, 'Declare Harness and Node compatibility.');

const packCommand = npmCommand(['pack', '--dry-run', '--json', '--ignore-scripts']);
const packed = spawnSync(packCommand.file, packCommand.args, { cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024, shell: false });
assert.equal(packed.status, 0, packed.error?.message || packed.stderr || 'Package preview failed.');
const [inventory] = JSON.parse(packed.stdout);
const files = new Set(inventory.files.map(file => file.path));
const required = ['index.js', 'service.js', 'core.js', 'client.js', 'cordis.patch.yml', 'locale/en.json', 'locale/id.json', 'icon.svg', 'README.md', 'LICENSE', 'PRIVACY.md', 'SECURITY.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md', 'docs/RELEASE_REVIEW.md', 'docs/HOST_THEME_CONTRACT.json', 'docs/BROWSER_RESULTS.json', 'docs/images/salah-widget.webp', 'docs/images/salah-dashboard.webp', 'scripts/check-release.mjs', 'scripts/node-cli.mjs', 'scripts/check-clean-install.mjs', 'scripts/check-browser.mjs', 'test/e2e/preflight.test.mjs', 'test/e2e/fixture-contract.test.mjs', 'test/e2e/theme-restoration.test.mjs', 'test/e2e/real-harness.mjs', 'test/e2e/salah-api.mjs', 'test/e2e/regressions.mjs', 'test/e2e/host-theme.mjs'];
for (const path of required) assert.ok(files.has(path), `Missing packed resource: ${path}`);
// Validate the recorded evidence, not a new browser execution or certification.
const browserRecord = JSON.parse(await text('docs/BROWSER_RESULTS.json'));
assert.equal(browserRecord.package, manifest.name);
assert.equal(browserRecord.version, manifest.version, 'Browser record must identify this package version.');
assert.equal(browserRecord.status, 'PASSED');
assert.equal(browserRecord.browserTestsRun, true);
assert.equal(browserRecord.exitCode, 0);
assert.deepEqual(browserRecord.checks.map(item => item.name), MANDATORY_CHECKS, 'Recorded browser evidence must include every mandatory case exactly once.');
assert.ok(browserRecord.checks.every(item => item.status === 'PASSED'));
assert.deepEqual(browserRecord.unverifiedMandatoryCases, []);
for (const key of ['capturedCurrentSavedChoiceBeforeChanges', 'httpResponsesFinishedSuccessfully', 'rpcCorrelationAndLogicalSuccessVerified', 'namespacePreferenceAndRevisionFloorsVerified', 'independentFreshReadAfterOriginalTabClosed', 'savedAndSelectedSourceRestored', 'htmlIndicatorAndBodyThemeStateRestored']) assert.equal(browserRecord.themeVerification[key], true, `Missing recorded restoration proof: ${key}`);
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
let links = 0;
const reviewFiles = new Set([...files, 'package-lock.json', '.github/workflows/checks.yml']);
for (const path of reviewFiles) {
  if (!['.js', '.mjs', '.json', '.md', '.yml', '.yaml', '.css'].includes(extname(path))) continue;
  const content = await text(path);
  assert.ok(!pathLeak.test(content), `Machine-specific path in release content: ${path}`);
  assert.ok(!secret.test(content), `Credential-like content requires review: ${path}`);
  // Tests may contain subprocess source strings resolved against a fixture cwd;
  // validate the shipped runtime/build/browser helpers rather than those strings.
  if (['.js', '.mjs'].includes(extname(path)) && !/\.test\.(?:js|mjs)$/.test(path)) {
    for (const match of content.matchAll(/(?:from\s*|import\s*\()\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const imported = resolve(root, dirname(path), match[1]);
      assert.ok(imported.startsWith(root + sep), `Relative import leaves release package: ${path}`);
      const relative = imported.slice(root.length + 1).split(sep).join('/');
      assert.ok(files.has(relative), `Relative import is not packed: ${path} -> ${match[1]}`);
    }
  }
  if (!path.endsWith('.md')) continue;
  for (const match of content.matchAll(/!?\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g)) {
    const destination = match[1] || match[2];
    if (/^(?:https?:|mailto:|#)/i.test(destination)) continue;
    const local = decodeURIComponent(destination.split('#')[0]);
    if (!local) continue;
    const absolute = resolve(root, dirname(path), local);
    assert.ok(absolute === root || absolute.startsWith(root + sep), `Documentation link leaves the project: ${path}`);
    assert.ok(await stat(absolute).catch(() => null), `Broken link in ${path}: ${destination}`);
    links++;
  }
}
console.log(`Release checks passed: ${manifest.name}@${manifest.version}, ${files.size} packed files, ${links} local documentation links, ${Object.keys(dictionaries.EN).length} translated interface keys.`);
console.log('This is a release-content check, not a security certification or proof of external API availability.');
