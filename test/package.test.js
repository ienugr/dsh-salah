/* Distribution contracts use built-ins; no browser, React, or Host activation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const text = name => readFile(new URL(name, root), 'utf8');
const packageName = '@icanhcorpse/dsh-salah';

test('npm metadata validator rejects mismatched identity, private/access, exports and registry metadata', async () => {
  const { validateManifest } = await import('../scripts/check-package.mjs');
  const manifest = JSON.parse(await text('package.json'));
  validateManifest(manifest);
  for (const mutation of [
    { name: '@local/dsh-salah' }, { version: '1.2.1' }, { private: true },
    { publishConfig: { access: 'restricted', registry: 'https://registry.npmjs.org' } },
    { publishConfig: { access: 'public', registry: 'https://example.test' } },
    { repository: { type: 'git', url: 'file:private' } },
    { exports: { ...manifest.exports, './icon': './missing.svg' } },
    { scripts: { ...manifest.scripts, postinstall: 'node build-ui.mjs' } },
  ]) assert.throws(() => validateManifest({ ...manifest, ...mutation }), /package|version|private|public|registry|repository|export|lifecycle/i);
});

test('public npm package identity agrees with the inert Client registration and bundle patch', async () => {
  const manifest = JSON.parse(await text('package.json'));
  assert.equal(manifest.name, packageName);
  assert.equal(manifest.version, '1.2.0');
  assert.equal(manifest.private, false);
  assert.equal(manifest.publishConfig?.access, 'public');
  assert.equal(manifest.repository?.type, 'git');
  assert.match(manifest.repository?.url || '', /^(?:git\+)?https:\/\/github\.com\/[^/]+\/[^/]+(?:\.git)?$/);
  const registrations = [];
  vm.runInNewContext(await text('client.js'), { window: { __ModuleLoader__: { load: registration => registrations.push(registration) } } }, { timeout: 1000 });
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].id, packageName);
  assert.equal(typeof registrations[0].factory, 'function');
  assert.match(await text('cordis.patch.yml'), /id: dsh-salah\s+name: ['"]?@icanhcorpse\/dsh-salah['"]?\s+config: \{\}/);
});

test('packed inventory rejects missing assets, private inputs, traversal and implausible size metadata', async () => {
  const { validatePackInventory, REQUIRED_FILES } = await import('../scripts/check-package.mjs');
  const files = REQUIRED_FILES.map(path => ({ path, size: 10, mode: 420 }));
  const valid = { name: packageName, version: '1.2.0', id: `${packageName}@1.2.0`, filename: 'icanhcorpse-dsh-salah-1.2.0.tgz', size: 100, unpackedSize: files.length * 10, entryCount: files.length, files };
  assert.ok(validatePackInventory([valid]).has('client.js'));
  for (const mode of [0o600, 0o666]) assert.ok(validatePackInventory([{ ...valid, files: files.map(file => ({ ...file, mode })) }]).has('client.js'), 'accept owner-readable Unix/Windows mode metadata');
  for (const mutation of [
    { name: '@local/dsh-salah' }, { filename: '../escape.tgz' }, { size: 0 }, { size: 64 * 1024 * 1024 },
    { entryCount: 1 }, { unpackedSize: 0 },
    ...['icon.svg', 'client.js', 'cordis.patch.yml', 'locale/en.json', 'docs/PUBLISHING.md', 'docs/NPM_RELEASE_REVIEW.md'].map(path => ({ files: files.filter(file => file.path !== path), entryCount: files.length - 1, unpackedSize: (files.length - 1) * 10 })),
    ...['.env', '.npmrc', 'node_modules/private.js', '.git/config', 'docs/.env.production', 'runtime-state.json', 'docs/credentials.json', '../escape', 'docs/../escape', 'docs\\escape', '/absolute', 'artifact.tgz'].map(path => ({ files: [...files, { path, size: 10, mode: 420 }], entryCount: files.length + 1, unpackedSize: (files.length + 1) * 10 })),
    { files: [...files, files[0]], entryCount: files.length + 1, unpackedSize: (files.length + 1) * 10 },
  ]) assert.throws(() => validatePackInventory([{ ...valid, ...mutation }]), /package|packed|inventory|entry|size|filename/i);
});

test('isolated npm subprocess environment excludes inherited credentials, config, preload and profile state', async () => {
  const { createIsolatedNpmEnvironment } = await import('../scripts/check-package.mjs');
  const owned = resolve(tmpdir(), 'owned fixture with spaces');
  const env = createIsolatedNpmEnvironment(owned, {
    PATH: '/portable/node', SystemRoot: 'C:\\Windows',
    HOME: '/private/home', USERPROFILE: '/private/profile', DSH_PROFILE_DIR: '/private/dsh',
    NPM_CONFIG_USERCONFIG: '/private/npmrc', npm_config_globalconfig: '/private/global',
    NODE_AUTH_TOKEN: 'do-not-forward', NPM_TOKEN: 'do-not-forward', npm_config__authToken: 'do-not-forward',
    NODE_OPTIONS: '--require /private/preload.js', NODE_PATH: '/private/node_modules', HTTPS_PROXY: 'https://user:password@example.test',
  });
  assert.equal(env.PATH, '/portable/node');
  assert.equal(env.SystemRoot, 'C:\\Windows');
  assert.equal(env.HOME, join(owned, 'home'));
  assert.equal(env.USERPROFILE, env.HOME);
  for (const key of ['npm_config_userconfig', 'npm_config_globalconfig', 'npm_config_cache', 'npm_config_logs_dir']) assert.ok(env[key].startsWith(owned + sep), key);
  assert.equal(env.npm_config_registry, 'https://registry.npmjs.org');
  const values = JSON.stringify(env);
  assert.doesNotMatch(values, /do-not-forward|\/private\/|password|preload/);
  for (const name of ['NODE_AUTH_TOKEN', 'NPM_TOKEN', 'NODE_OPTIONS', 'NODE_PATH', 'DSH_PROFILE_DIR', 'HTTPS_PROXY', 'NPM_CONFIG_USERCONFIG']) assert.equal(Object.hasOwn(env, name), false, name);
});

test('artifact resources agree with package identity and reject missing exports, registration or prebuilt CSS', async () => {
  const { validatePackageDirectory, REQUIRED_FILES } = await import('../scripts/check-package.mjs');
  const temporaryRoot = await realpath(tmpdir());
  const prefix = 'salah package test ';
  const fixture = await mkdtemp(join(temporaryRoot, prefix));
  try {
    for (const path of REQUIRED_FILES) {
      await mkdir(dirname(join(fixture, path)), { recursive: true });
      await copyFile(fileURLToPath(new URL(path, root)), join(fixture, path));
    }
    await validatePackageDirectory(fixture);
    for (const path of ['icon.svg', 'locale/id.json', 'client.js', 'cordis.patch.yml']) {
      const original = join(fixture, path), missing = join(fixture, path + '.missing-fixture');
      assert.ok(original.startsWith(fixture + sep) && missing.startsWith(fixture + sep));
      await rename(original, missing);
      await assert.rejects(validatePackageDirectory(fixture), /missing.*packed resource/i, path);
      await rename(missing, original);
    }
    for (const [path, transform, pattern] of [
      ['client.js', value => value.replace(packageName, '@local/dsh-salah'), /registration/i],
      ['client.js', value => value.replace(/const CSS = [^\n]+;/, 'const CSS = "";'), /prebuilt|stylesheet/i],
      ['client.js', value => value.replace("id: 'salah-floating'", "id: 'changed-floating'"), /stable|slot/i],
      ['client.js', value => value.replaceAll('dsh.salah.review.v1', 'changed.review.v1'), /storage/i],
      ['cordis.patch.yml', value => value.replace(packageName, '@local/dsh-salah'), /patch/i],
      ['index.js', value => value.replace('salah_preferences', 'changed_preferences'), /storage/i],
      ['locale/en.json', () => '{"meta":{"title":"","description":""}}', /metadata/i],
      ['icon.svg', () => 'not an icon', /icon/i],
      ['core.js', value => `${value}\nimport './not-packed.js';`, /relative import/i],
    ]) {
      const original = await readFile(join(fixture, path), 'utf8');
      await writeFile(join(fixture, path), transform(original));
      await assert.rejects(validatePackageDirectory(fixture), pattern, path);
      await writeFile(join(fixture, path), original);
    }
    await assert.rejects(validatePackageDirectory(fixture, { expectedManifest: { ...JSON.parse(await text('package.json')), description: 'not the packed manifest' } }), /manifest/i);
  } finally {
    const target = resolve(fixture);
    assert.equal(dirname(target), temporaryRoot);
    assert.ok(basename(target).startsWith(prefix) && target.startsWith(temporaryRoot + sep));
    assert.equal(await realpath(target), target);
    assert.ok((await lstat(target)).isDirectory());
    await rm(target, { recursive: true, force: true, maxRetries: 3 });
  }
});

test('packed Markdown links reject checkout-only targets even when files exist and preserve packed directories and anchors', async () => {
  const { validatePackageDirectory, REQUIRED_FILES } = await import('../scripts/check-package.mjs');
  const temporaryRoot = await realpath(tmpdir());
  const prefix = 'salah package links test ';
  const fixture = await mkdtemp(join(temporaryRoot, prefix));
  try {
    for (const path of REQUIRED_FILES) {
      await mkdir(dirname(join(fixture, path)), { recursive: true });
      await copyFile(fileURLToPath(new URL(path, root)), join(fixture, path));
    }
    // Both targets exist in a checkout but neither belongs to the npm artifact.
    await writeFile(join(fixture, 'package-lock.json'), '{}');
    await mkdir(join(fixture, '.github', 'workflows'), { recursive: true });
    await writeFile(join(fixture, '.github', 'workflows', 'checks.yml'), 'name: checkout-only');
    for (const [path, destination, pattern] of [
      ['README.md', 'package-lock.json', /documentation.*not packed/i],
      ['docs/PUBLISHING.md', '../.github/workflows/checks.yml', /documentation.*not packed/i],
      ['README.md', 'missing.md', /documentation.*not packed/i],
      ['README.md', 'docs/missing/', /documentation.*not packed/i],
      ['README.md', '../outside.md', /documentation.*leaves/i],
      ['README.md', '%2e%2e/outside.md', /documentation.*leaves/i],
      ['README.md', '/absolute.md', /documentation.*(?:unsafe|leaves)/i],
    ]) {
      const original = await readFile(join(fixture, path), 'utf8');
      await writeFile(join(fixture, path), `${original}\n[Fixture link](${destination})\n`);
      await assert.rejects(validatePackageDirectory(fixture), pattern, destination);
      await writeFile(join(fixture, path), original);
    }
    const readme = await readFile(join(fixture, 'README.md'), 'utf8');
    await writeFile(join(fixture, 'README.md'), readme + '\n[Docs](docs/) [Image directory](docs/images) [Self](#heading) [Readme](README.md#heading) [Encoded](docs/PUBLISHING%2Emd#heading) [External](https://example.test/not-packed)\n');
    await validatePackageDirectory(fixture);
  } finally {
    const target = resolve(fixture);
    assert.equal(dirname(target), temporaryRoot);
    assert.ok(basename(target).startsWith(prefix) && target.startsWith(temporaryRoot + sep));
    assert.equal(await realpath(target), target);
    assert.ok((await lstat(target)).isDirectory());
    await rm(target, { recursive: true, force: true, maxRetries: 3 });
  }
});

test('historical browser evidence accepts only the known local snapshot and never claims npm UI verification', async () => {
  const { validateHistoricalEvidence } = await import('../scripts/check-package.mjs');
  const record = JSON.parse(await text('docs/BROWSER_RESULTS.json'));
  const provenance = validateHistoricalEvidence(record);
  assert.equal(provenance.package, '@local/dsh-salah');
  assert.equal(provenance.verifiedOn, '2026-11-08');
  assert.equal(provenance.currentNpmPackageBrowserRetested, false);
  for (const mutation of [{ package: packageName }, { package: '@other/dsh-salah' }, { version: '1.2.1' }, { verifiedOn: '2026-11-09' }, { status: 'FAILED' }, { checks: [] }, { environment: { ...record.environment, harness: 'unknown' } }]) {
    assert.throws(() => validateHistoricalEvidence({ ...record, ...mutation }), /historical|recorded|snapshot/i);
  }
});
