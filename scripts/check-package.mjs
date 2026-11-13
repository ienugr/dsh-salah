/* Public npm artifact validation. Never publishes or activates a Harness plugin. */
import assert from 'node:assert/strict';
import { constants as fsConstants } from 'node:fs';
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, posix, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { npmCommand } from './node-cli.mjs';
import { runBoundedStage, verificationFailureExitCode } from './check-clean-install.mjs';
import { createIsolatedNpmEnvironment } from './npm-environment.mjs';
export { createIsolatedNpmEnvironment };

export const PACKAGE_NAME = '@ienugr/dsh-salah';
export const PACKAGE_VERSION = '1.2.1';

export function validateManifest(manifest) {
  assert.equal(manifest.name, PACKAGE_NAME, 'Unexpected npm package identity.');
  assert.equal(manifest.version, PACKAGE_VERSION, 'Unexpected npm package version.');
  assert.equal(manifest.private, false, 'The npm package must explicitly set private:false.');
  assert.equal(manifest.publishConfig?.access, 'public', 'Declare public npm access.');
  assert.equal(manifest.publishConfig?.registry, 'https://registry.npmjs.org', 'Declare the public npm registry.');
  assert.equal(manifest.repository?.type, 'git', 'Declare the GitHub git repository.');
  assert.match(manifest.repository?.url || '', /^(?:git\+)?https:\/\/github\.com\/[^/]+\/[^/#]+(?:\.git)?$/, 'Declare the public GitHub repository.');
  assert.equal(manifest.license, 'MIT', 'Preserve the package license.');
  assert.equal(manifest.type, 'module', 'Preserve the Node ESM package.');
  assert.ok(manifest.engines?.dsh && manifest.engines?.node, 'Declare package runtime compatibility.');
  assert.deepEqual(manifest.exports, { '.': './index.js', './client': './client.js', './locale/*.json': './locale/*.json', './icon': './icon.svg' }, 'Preserve the package exports.');
  assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml', 'Preserve the package bundle patch.');
  assert.equal(manifest.dsh?.client?.platform, 'web', 'Preserve the package Client platform.');
  for (const name of ['preinstall', 'install', 'postinstall', 'prepare', 'prepack', 'postpack']) {
    assert.ok(!Object.hasOwn(manifest.scripts || {}, name), `Consumer must not require a package lifecycle build: ${name}`);
  }
  return manifest;
}

export const REQUIRED_FILES = Object.freeze([
  'package.json', 'index.js', 'service.js', 'core.js', 'client.js', 'ui.css', 'styles.css', 'build-ui.mjs',
  'cordis.patch.yml', 'locale/en.json', 'locale/id.json', 'icon.svg', 'README.md', 'LICENSE',
  'PRIVACY.md', 'SECURITY.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md',
  'docs/RELEASE_REVIEW.md', 'docs/PUBLISHING.md', 'docs/NPM_RELEASE_REVIEW.md', 'docs/HOST_THEME_CONTRACT.json',
  'docs/BROWSER_RESULTS.json', 'docs/images/salah-widget.webp', 'docs/images/salah-dashboard.webp',
  'scripts/check-release.mjs', 'scripts/check-package.mjs', 'scripts/node-cli.mjs', 'scripts/npm-environment.mjs', 'scripts/check-clean-install.mjs', 'scripts/check-browser.mjs',
  'test/package.test.js', 'test/build.test.js', 'test/e2e/preflight.test.mjs', 'test/e2e/fixture-contract.test.mjs',
  'test/e2e/theme-restoration.test.mjs', 'test/e2e/real-harness.mjs', 'test/e2e/salah-api.mjs', 'test/e2e/regressions.mjs', 'test/e2e/host-theme.mjs',
]);

export function validatePackInventory(records) {
  assert.ok(Array.isArray(records) && records.length === 1, 'Expected exactly one packed inventory.');
  const inventory = records[0];
  assert.equal(inventory.name, PACKAGE_NAME, 'Unexpected packed package identity.');
  assert.equal(inventory.version, PACKAGE_VERSION, 'Unexpected packed package version.');
  assert.equal(inventory.id, `${PACKAGE_NAME}@${PACKAGE_VERSION}`, 'Unexpected packed package id.');
  assert.equal(inventory.filename, `ienugr-dsh-salah-${PACKAGE_VERSION}.tgz`, 'Unexpected packed filename.');
  for (const key of ['size', 'unpackedSize']) assert.ok(Number.isSafeInteger(inventory[key]) && inventory[key] > 0 && inventory[key] <= 32 * 1024 * 1024, `Unexpected packed ${key}.`);
  assert.ok(Array.isArray(inventory.files) && inventory.files.length <= 512, 'Unexpected packed inventory length.');
  assert.equal(inventory.entryCount, inventory.files.length, 'Packed entry count mismatch.');
  const paths = new Set();
  let total = 0;
  const rootFiles = new Set(REQUIRED_FILES.filter(path => !path.includes('/')));
  for (const file of inventory.files) {
    const path = file.path;
    assert.ok(typeof path === 'string' && path.length > 0 && !path.includes('\\') && !path.includes(':') && path.split('/').every(part => part && part !== '..' && !part.startsWith('.')), `Unsafe packed entry: ${path}`);
    assert.ok(!/(?:^|\/)(?:node_modules|coverage|profiles?|state|credentials?)(?:\/|\.|$)|(?:^|\/)(?:runtime[-_]?state|credentials?|secrets?)(?:\.|$)|\.(?:tgz|pem|key|p12)$/i.test(path), `Private packed entry: ${path}`);
    assert.ok(rootFiles.has(path) || /^(?:docs\/[^\r\n]+|scripts\/[^/]+\.mjs|test\/(?:[^/]+\.test\.js|e2e\/[^/]+\.mjs)|locale\/(?:en|id)\.json)$/.test(path), `Unexpected packed package entry: ${path}`);
    assert.ok(!paths.has(path), `Duplicate packed entry: ${path}`);
    assert.ok(Number.isSafeInteger(file.size) && file.size >= 0 && file.size <= 4 * 1024 * 1024, `Unexpected packed entry size: ${path}`);
    // Windows reports writable bits differently; do not impose Unix chmod policy.
    assert.ok(Number.isInteger(file.mode) && file.mode >= 0 && (file.mode & ~0o777) === 0 && (file.mode & 0o400) !== 0, `Unexpected packed entry mode ${file.mode}: ${path}`);
    total += file.size;
    paths.add(path);
  }
  assert.equal(inventory.unpackedSize, total, 'Packed unpacked size mismatch.');
  for (const path of REQUIRED_FILES) assert.ok(paths.has(path), `Missing packed resource: ${path}`);
  return paths;
}

// Package paths use POSIX separators on every platform. A checkout-only file is
// not a valid documentation target merely because it exists beside the sources.
export function validateDocumentationLinks(path, content, files) {
  const packed = files instanceof Set ? files : new Set(files);
  let links = 0;
  for (const match of content.matchAll(/!?\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g)) {
    const destination = match[1] || match[2];
    if (/^(?:https?:|mailto:|#)/i.test(destination)) continue;
    let local;
    assert.doesNotThrow(() => { local = decodeURIComponent(destination.split(/[?#]/)[0]); }, `Malformed documentation link in ${path}: ${destination}`);
    if (!local) continue;
    assert.ok(!local.includes('\\') && !local.includes('\0') && !/^(?:\/|[A-Za-z]:)/.test(local), `Unsafe documentation link leaves the packed package: ${path} -> ${destination}`);
    const normalized = posix.normalize(posix.join(posix.dirname(path), local)).replace(/\/+$/, '');
    assert.ok(normalized !== '..' && !normalized.startsWith('../'), `Documentation link leaves the packed package: ${path} -> ${destination}`);
    const directory = normalized === '.' || [...packed].some(file => file.startsWith(normalized + '/'));
    assert.ok(directory || (!local.endsWith('/') && packed.has(normalized)), `Documentation target is not packed: ${path} -> ${destination}`);
    links++;
  }
  return links;
}

// Validate actual extracted/installed resources without executing the Client factory
// or calling Host apply. The same contract is used by release checks and the probe.
export async function validatePackageDirectory(directory, { expectedManifest, inventory } = {}) {
  const root = await realpath(directory);
  const text = path => readFile(join(root, path), 'utf8');
  const paths = inventory ? [...validatePackInventory([inventory])] : REQUIRED_FILES;
  for (const path of paths) {
    const absolute = join(root, path);
    assert.equal(await realpath(absolute).catch(() => null), absolute, `Missing or symlinked packed resource: ${path}`);
    assert.ok((await lstat(absolute)).isFile(), `Non-file packed resource: ${path}`);
    if (inventory) assert.equal((await lstat(absolute)).size, inventory.files.find(file => file.path === path).size, `Installed packed entry size mismatch: ${path}`);
  }
  const manifest = validateManifest(JSON.parse(await text('package.json')));
  if (expectedManifest) assert.deepEqual(manifest, expectedManifest, 'Installed manifest differs from the source manifest.');
  const patch = await text('cordis.patch.yml');
  assert.match(patch.replace(/\r\n/g, '\n'), /^\s*- insert:\s*\n\s+- id: dsh-salah\s*\n\s+name: ['"]?@ienugr\/dsh-salah['"]?\s*\n\s+config: \{\}\s*$/, 'Bundle patch must preserve its row id and match the npm identity.');
  const client = await text('client.js');
  const registrations = [];
  vm.runInNewContext(client, { window: { __ModuleLoader__: { load: registration => registrations.push(registration) } } }, { timeout: 1000 });
  assert.equal(registrations.length, 1, 'Expected one Client registration.');
  assert.equal(registrations[0].id, manifest.name, 'Client registration must match the npm identity.');
  assert.equal(typeof registrations[0].factory, 'function', 'Expected an inert Client registration factory.');
  // dsh-salah is the stable patch row; the existing panel slot uses salah.
  for (const id of ['salah', 'salah-countdown', 'salah-floating']) assert.ok(client.includes(`id: '${id}'`), `Preserve stable Client slot id: ${id}`);
  for (const key of ['dsh.salah.floating.v1', 'dsh.salah.review.v1']) assert.ok(client.includes(key), `Preserve Client storage key: ${key}`);
  const css = client.match(/const CSS = ("[^\n]*");/);
  assert.ok(css, 'Ship the prebuilt Client stylesheet.');
  const stylesheet = JSON.parse(css[1]);
  assert.ok(stylesheet.length > 1000 && stylesheet.includes('.salah') && stylesheet.includes('var(--dsw-alias-'), 'Ship the scoped prebuilt host-themed stylesheet.');
  assert.ok(!/@(?:import|tailwind|source|plugin)\b/.test(stylesheet), 'Prebuilt stylesheet must not require a consumer build.');
  const host = await text('index.js');
  assert.match(host, /name:\s*'salah_preferences'/, 'Preserve the durable storage domain.');
  for (const locale of ['en', 'id']) {
    const value = JSON.parse(await text(`locale/${locale}.json`));
    assert.ok(typeof value.meta?.title === 'string' && value.meta.title.trim() && typeof value.meta?.description === 'string' && value.meta.description.trim(), `Missing ${locale} display metadata.`);
  }
  const icon = await readFile(join(root, 'icon.svg'));
  assert.ok(icon.length > 0 && icon.length <= 256 * 1024 && icon.toString().includes('<svg'), 'Export a valid-size SVG icon.');
  let documentationLinks = 0;
  const packed = new Set(paths);
  for (const path of paths) {
    if (path.endsWith('.md')) documentationLinks += validateDocumentationLinks(path, await text(path), packed);
    if (!['.js', '.mjs'].includes(extname(path)) || /\.test\.(?:js|mjs)$/.test(path)) continue;
    for (const match of (await text(path)).matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const imported = resolve(root, dirname(path), match[1]);
      assert.ok(imported.startsWith(root + sep), `Relative import leaves the packed package: ${path}`);
      const relative = imported.slice(root.length + 1).split(sep).join('/');
      assert.ok(paths.includes(relative), `Relative import is not packed: ${path} -> ${match[1]}`);
    }
  }
  const provenance = validateHistoricalEvidence(JSON.parse(await text('docs/BROWSER_RESULTS.json')));
  return { manifest, provenance, documentationLinks };
}

// This intentionally accepts only the historical pre-rename browser snapshot.
// A shared version number is not evidence that the new npm identity was tested.
export function validateHistoricalEvidence(record) {
  assert.equal(record.package, '@local/dsh-salah', 'Unknown historical browser record identity.');
  assert.equal(record.version, '1.2.0', 'Unknown historical browser snapshot version.');
  assert.equal(record.verifiedOn, '2026-11-08', 'Unknown historical browser snapshot date.');
  assert.equal(record.status, 'PASSED', 'Historical recorded browser checks must have passed.');
  assert.equal(record.browserTestsRun, true, 'Historical recorded browser tests must have run.');
  assert.equal(record.exitCode, 0, 'Historical recorded browser execution must have succeeded.');
  assert.equal(record.checks?.length, 16, 'Historical recorded browser checks must include all 16 cases.');
  // Pin the complete known JSON snapshot, including case names, restoration
  // proofs, environment and verification limits, without loading browser helpers
  // or business dependencies. This is NOT a digest of the current npm release.
  assert.equal(createHash('sha256').update(JSON.stringify(record)).digest('hex'), 'a49ec533af91d1d3aae8e8c715e2a1c030d56673755e2c8d564b991665fe8732', 'Unknown historical browser evidence snapshot.');
  return Object.freeze({ package: record.package, version: record.version, verifiedOn: record.verifiedOn, currentNpmPackageBrowserRetested: false });
}

const temporaryPrefix = 'salah npm package ';

export async function removeOwnedPackageDirectory(path, temporaryRoot) {
  const target = resolve(path);
  assert.ok(dirname(target) === temporaryRoot && target.startsWith(temporaryRoot + sep), 'Refusing package cleanup outside the owned temporary root.');
  assert.ok(basename(target).startsWith(temporaryPrefix) && basename(target).length >= temporaryPrefix.length + 6, 'Refusing package cleanup without the unique owned basename.');
  assert.equal(await realpath(target), target, 'Refusing package cleanup of a replaced temporary symlink.');
  assert.ok((await lstat(target)).isDirectory(), 'Refusing package cleanup of a non-directory.');
  await rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}

// Executed as a real ESM program in the isolated consumer. It imports the npm
// scope by name; resolving paths alone would not test runtime dependencies.
const consumerProbe = `
import assert from 'node:assert/strict';
import { readFile, lstat, realpath } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import * as plugin from '${PACKAGE_NAME}';
const consumer = dirname(fileURLToPath(import.meta.url));
const root = dirname(fileURLToPath(import.meta.resolve('${PACKAGE_NAME}')));
assert.equal(root, join(consumer, 'node_modules', '@ienugr', 'dsh-salah'));
const { expectedManifest, inventory } = JSON.parse(await readFile(join(consumer, 'expected-artifact.json'), 'utf8'));
const { validatePackageDirectory } = await import(pathToFileURL(join(root, 'scripts', 'check-package.mjs')));
await validatePackageDirectory(root, { expectedManifest, inventory });
assert.deepEqual(Object.keys(plugin).sort(), ['apply', 'inject', 'persistedSchema']);
assert.equal(typeof plugin.apply, 'function'); // Never call apply against any context.
assert.deepEqual(plugin.inject, ['storageDomain', 'tools', 'connection']);
const { SalahService, DEFAULT_SETTINGS } = await import(pathToFileURL(join(root, 'service.js')));
assert.equal(typeof SalahService, 'function');
assert.equal(plugin.persistedSchema.safeParse(DEFAULT_SETTINGS).success, true);
assert.equal(plugin.persistedSchema.safeParse({ source: 'not-a-source' }).success, false);
const require = createRequire(import.meta.url);
for (const [subpath, target] of [['client', 'client.js'], ['icon', 'icon.svg'], ['locale/en.json', 'locale/en.json'], ['locale/id.json', 'locale/id.json']]) {
  assert.equal(require.resolve('${PACKAGE_NAME}/' + subpath), join(root, ...target.split('/')));
}
const runtimeRequire = createRequire(join(root, 'index.js'));
for (const name of Object.keys(expectedManifest.dependencies || {})) {
  const resolved = await realpath(runtimeRequire.resolve(name));
  assert.ok(resolved.startsWith(join(consumer, 'node_modules') + sep), 'Runtime dependency must come from this consumer: ' + name);
}
for (const name of Object.keys(expectedManifest.devDependencies || {})) {
  for (const directory of [join(consumer, 'node_modules'), join(root, 'node_modules')]) {
    assert.equal(await lstat(join(directory, ...name.split('/'))).catch(() => null), null, 'Consumer must not install build/dev dependency: ' + name);
  }
}
assert.equal(await lstat(join(consumer, 'package-lock.json')).catch(() => null), null);
console.log('Real consumer Node import, runtime exports/dependencies, resources, registration ID and prebuilt CSS passed; no Host apply or Client factory executed.');
`;

// Read-only inventory preview for check:release. The full artifact install probe
// runs only in check:package, once as a clean-install stage, never inside npm test.
export async function previewPackageInventory(projectRoot) {
  const temporaryRoot = await realpath(tmpdir());
  const owned = await mkdtemp(join(temporaryRoot, temporaryPrefix));
  let cleanupSafe = true;
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    const env = createIsolatedNpmEnvironment(owned);
    for (const path of [env.HOME, env.TMPDIR]) await mkdir(path, { recursive: true });
    for (const path of [env.npm_config_userconfig, env.npm_config_globalconfig]) await writeFile(path, '', { flag: 'wx' });
    const result = await runBoundedStage('release inventory preview', npmCommand(['pack', '--dry-run', '--json', '--ignore-scripts', resolve(projectRoot)]), { cwd: owned, env, timeoutMs: 90000, signal: controller.signal });
    const records = JSON.parse(result.stdout);
    validatePackInventory(records);
    return records[0];
  } catch (error) {
    if (error.cleanupUnsafe) cleanupSafe = false;
    throw error;
  } finally {
    try {
      if (cleanupSafe) await removeOwnedPackageDirectory(owned, temporaryRoot);
      else console.error(`Cleanup unconfirmed; retained owned package preview for inspection: ${owned}`);
    } finally {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
    }
  }
}

async function assertEmptyArtifactDirectory(destinationDirectory, projectRoot) {
  const sourceRoot = await realpath(resolve(projectRoot));
  const output = resolve(destinationDirectory);
  assert.ok(output !== sourceRoot && !output.startsWith(sourceRoot + sep), 'Release artifacts must be written outside the source package.');
  assert.equal(await realpath(output), output, 'Release artifact directory must not be a symlink.');
  assert.ok((await lstat(output)).isDirectory(), 'Release artifact output must be a directory.');
  assert.deepEqual(await readdir(output), [], 'Release artifact output must start empty.');
  return output;
}

export async function preserveValidatedPackageArtifact({ sourceArchive, destinationDirectory, projectRoot, inventory } = {}) {
  assert.ok(typeof sourceArchive === 'string' && typeof destinationDirectory === 'string' && typeof projectRoot === 'string', 'An exact source archive, output directory and source root are required.');
  const output = await assertEmptyArtifactDirectory(destinationDirectory, projectRoot);
  validatePackInventory([inventory]);

  const filename = inventory.filename;
  assert.equal(basename(filename), filename, 'Packed archive filename must not escape the artifact directory.');
  const source = resolve(sourceArchive);
  assert.equal(await realpath(source), source, 'Validated source archive must not be a symlink.');
  assert.ok((await lstat(source)).isFile(), 'Validated source archive must be a regular file.');
  const bytes = await readFile(source);
  assert.equal(bytes.length, inventory.size, 'Validated source archive size mismatch.');
  assert.equal(createHash('sha1').update(bytes).digest('hex'), inventory.shasum, 'Validated source archive SHA-1 mismatch.');
  assert.equal(`sha512-${createHash('sha512').update(bytes).digest('base64')}`, inventory.integrity, 'Validated source archive SHA-512 mismatch.');

  const target = join(output, filename);
  assert.equal(dirname(target), output);
  // Write the already verified bytes, never reopen the source after hashing it.
  await writeFile(target, bytes, { flag: 'wx' });
  assert.equal(await realpath(target), target, 'Copied release archive must not be a symlink.');
  assert.ok((await lstat(target)).isFile(), 'Copied release archive must be a regular file.');
  const copied = await readFile(target);
  assert.deepEqual(copied, bytes, 'Preserved release archive must exactly match the validated bytes.');
  const sha256 = createHash('sha256').update(copied).digest('hex');
  await writeFile(join(output, 'SHA256SUMS'), `${sha256}  ${filename}\n`, { flag: 'wx' });
  return { path: target, checksumPath: join(output, 'SHA256SUMS'), sha256 };
}

export async function verifyPackedPackage({ projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..'), outputDirectory } = {}) {
  // Fail before any npm/network work for an invalid checkout or unsafe artifact output path.
  const sourceRoot = resolve(projectRoot);
  const { manifest } = await validatePackageDirectory(sourceRoot);
  if (outputDirectory !== undefined) await assertEmptyArtifactDirectory(outputDirectory, sourceRoot);
  const temporaryRoot = await realpath(tmpdir());
  const owned = await mkdtemp(join(temporaryRoot, temporaryPrefix));
  let cleanupSafe = true;
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    const consumer = join(owned, 'consumer with spaces');
    const destination = join(owned, 'packed artifacts with spaces');
    const env = createIsolatedNpmEnvironment(owned);
    for (const path of [consumer, destination, env.HOME, env.TMPDIR]) await mkdir(path, { recursive: true });
    for (const path of [env.npm_config_userconfig, env.npm_config_globalconfig]) await writeFile(path, '', { flag: 'wx' });
    await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'salah-artifact-consumer', version: '0.0.0', private: true, type: 'module' }), { flag: 'wx' });
    // npm runs from an owned directory, so no checkout .npmrc is consulted.
    console.log('[npm pack] actual archive, scripts disabled; isolated anonymous npm configuration.');
    const packed = await runBoundedStage('npm pack', npmCommand(['pack', '--ignore-scripts', '--json', '--pack-destination', destination, resolve(projectRoot)]), { cwd: owned, env, timeoutMs: 90000, signal: controller.signal });
    const records = JSON.parse(packed.stdout);
    const paths = validatePackInventory(records);
    const [inventory] = records;
    const tarball = join(destination, inventory.filename);
    assert.equal(dirname(tarball), destination, 'Packed filename must stay in the owned artifact directory.');
    assert.equal(await realpath(tarball), tarball, 'Packed archive must not be a symlink.');
    assert.ok((await lstat(tarball)).isFile(), 'Packed archive must be a regular file.');
    const bytes = await readFile(tarball);
    assert.equal(bytes.length, inventory.size, 'Actual archive size must match npm inventory.');
    assert.equal(createHash('sha1').update(bytes).digest('hex'), inventory.shasum, 'Packed archive shasum mismatch.');
    assert.equal('sha512-' + createHash('sha512').update(bytes).digest('base64'), inventory.integrity, 'Packed archive integrity mismatch.');
    console.log('[npm install] production-only tarball consumer; public registry; lifecycle scripts disabled.');
    await runBoundedStage('tarball consumer install', npmCommand(['install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--registry=https://registry.npmjs.org', tarball]), { cwd: consumer, env, timeoutMs: 240000, signal: controller.signal });
    await writeFile(join(consumer, 'expected-artifact.json'), JSON.stringify({ expectedManifest: manifest, inventory }), { flag: 'wx' });
    const probe = join(consumer, 'verify-installed.mjs');
    await writeFile(probe, consumerProbe, { flag: 'wx' });
    const result = await runBoundedStage('real Node consumer import', { file: process.execPath, args: [probe] }, { cwd: consumer, env, timeoutMs: 60000, signal: controller.signal });
    console.log(result.stdout.trim());
    const releaseArtifact = outputDirectory === undefined ? undefined : await preserveValidatedPackageArtifact({ sourceArchive: tarball, destinationDirectory: outputDirectory, projectRoot: sourceRoot, inventory });
    if (releaseArtifact) console.log(`Preserved the exact consumer-validated npm archive; SHA-256 ${releaseArtifact.sha256}.`);
    console.log(`Package checks passed: ${manifest.name}@${manifest.version}; ${paths.size} packed files; ${inventory.size} archive bytes; actual production-only consumer install/import.`);
    console.log('Browser provenance: historical @local/dsh-salah@1.2.0, 2026-11-08 only. The current npm identity/runtime/UI was not live-retested. No publication or live Harness/profile changes.');
    return { name: manifest.name, version: manifest.version, files: paths.size, size: inventory.size, consumerImported: true, currentNpmPackageBrowserRetested: false, releaseArtifact };
  } catch (error) {
    if (error.cleanupUnsafe) cleanupSafe = false;
    throw error;
  } finally {
    try {
      if (cleanupSafe) await removeOwnedPackageDirectory(owned, temporaryRoot);
      else console.error(`Cleanup unconfirmed; retained owned package consumer for inspection: ${owned}`);
    }
    finally {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
    }
  }
}

export function parsePackageCheckArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    assert.ok(index + 1 < args.length && args[index + 1] && !args[index + 1].startsWith('--'), `Missing value for ${option}.`);
    const value = args[++index];
    if (option === '--project-dir') options.projectRoot = resolve(value);
    else if (option === '--output-dir') options.outputDirectory = resolve(value);
    else assert.fail(`Unknown package check option: ${option}.`);
  }
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await verifyPackedPackage(parsePackageCheckArguments(process.argv.slice(2))); }
  catch (error) { console.error(error.message); process.exitCode = verificationFailureExitCode(error); }
}
