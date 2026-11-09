/* Real build CLI checks: no shell, fake compiler, or private-function mocks. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'salah build test ';

test('build CLI works in a path with spaces without executable wrappers and is deterministic', { timeout: 150000 }, async () => {
  const temporaryRoot = await realpath(tmpdir());
  const fixture = await mkdtemp(join(temporaryRoot, prefix));
  try {
    for (const name of ['package.json', 'build-ui.mjs', 'client.js', 'ui.css', 'styles.css']) {
      await copyFile(join(root, name), join(fixture, name));
    }
    const installedCli = join(root, 'node_modules', '@tailwindcss', 'cli');
    const fixtureCli = join(fixture, 'node_modules', '@tailwindcss', 'cli');
    const cliManifest = JSON.parse(await readFile(join(installedCli, 'package.json'), 'utf8'));
    await mkdir(join(fixtureCli, 'dist'), { recursive: true });
    for (const name of ['package.json', 'dist/index.mjs']) await copyFile(join(installedCli, name), join(fixtureCli, name));
    // The real CLI's own path contains spaces, not just its cwd/input paths.
    // Junctions work without symlink privileges on native Windows; omit .bin.
    const dependencies = new Set(['tailwindcss', 'daisyui', 'postcss', 'postcss-prefix-selector', ...Object.keys(cliManifest.dependencies)]);
    for (const name of dependencies) {
      const target = join(fixture, 'node_modules', name);
      await mkdir(dirname(target), { recursive: true });
      await symlink(join(root, 'node_modules', name), target, process.platform === 'win32' ? 'junction' : 'dir');
    }
    const original = await readFile(join(fixture, 'client.js'), 'utf8');
    const build = () => {
      const result = spawnSync(process.execPath, [join(fixture, 'build-ui.mjs')], {
        cwd: fixture, encoding: 'utf8', timeout: 65000, maxBuffer: 2 * 1024 * 1024,
      });
      assert.equal(result.status, 0, `Build exit ${result.status}; ${result.error?.message || ''}\n${result.stderr}`);
      assert.match(result.stdout, /scoped, host-themed daisyUI CSS/);
    };
    build();
    const first = await readFile(join(fixture, 'client.js'), 'utf8');
    build();
    assert.ok(await readFile(join(fixture, 'client.js'), 'utf8') === first, 'two fresh compiler invocations produce identical output');
    assert.ok(first === original, `The committed artifact matches the current locked compiler (committed ${Buffer.byteLength(original)} bytes, rebuilt ${Buffer.byteLength(first)} bytes); rebuild and review client.js after changing source classes.`);
    const encoded = first.match(/const CSS = ("[^\n]*");/);
    assert.ok(encoded, 'the client contains an embedded stylesheet');
    const css = JSON.parse(encoded[1]);
    assert.match(css, /tailwindcss[^\n]*MIT License/);
    assert.match(css, /\.salah/);
    assert.match(css, /var\(--dsw-alias-/);
  } finally {
    const target = resolve(fixture);
    assert.equal(dirname(target), temporaryRoot, 'cleanup must stay directly inside the owned temporary root');
    assert.ok(basename(target).startsWith(prefix) && target.startsWith(temporaryRoot + sep), 'cleanup requires the unique owned basename');
    await rm(target, { recursive: true, force: true, maxRetries: 3 });
  }
});

test('npm command executes the installed JavaScript CLI without a shell wrapper', { timeout: 15000 }, async () => {
  const { npmCommand } = await import('../scripts/node-cli.mjs');
  const command = npmCommand(['--version']);
  assert.equal(command.file, process.execPath);
  assert.equal(command.args[0].endsWith('npm-cli.js'), true);
  assert.deepEqual(command.args.slice(1), ['--version']);
  const temporaryRoot = await realpath(tmpdir());
  const fixture = await mkdtemp(join(temporaryRoot, prefix));
  try {
    const userconfig = join(fixture, 'npmrc');
    await writeFile(userconfig, '');
    const result = spawnSync(command.file, [...command.args, '--cache', join(fixture, 'cache'), '--userconfig', userconfig, '--logs-dir', join(fixture, 'logs'), '--update-notifier=false'], {
      encoding: 'utf8', timeout: 10000, shell: false,
    });
    assert.equal(result.status, 0, `npm exit ${result.status}; ${result.error?.message || result.stderr}`);
    assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+/);
  } finally {
    const target = resolve(fixture);
    assert.equal(dirname(target), temporaryRoot);
    assert.ok(basename(target).startsWith(prefix) && target.startsWith(temporaryRoot + sep));
    await rm(target, { recursive: true, force: true, maxRetries: 3 });
  }
});

test('bounded verification reports the failed stage and exit code without credentials', { timeout: 15000 }, async () => {
  const { runBoundedStage } = await import('../scripts/check-clean-install.mjs');
  await assert.rejects(runBoundedStage('sample release check', {
    file: process.execPath,
    args: ['-e', "process.stderr.write('https://private-token@example.test/ sensitive-value'); process.exit(9)"],
  }, { env: { ...process.env, BUILD_AUTH_TOKEN: 'sensitive-value' }, timeoutMs: 10000 }), error => {
    assert.match(error.message, /\[sample release check\] failed: exit 9/);
    assert.match(error.message, /redacted/);
    assert.doesNotMatch(error.message, /private-token|sensitive-value/);
    return true;
  });
});

test('bounded verification terminates a stage that exceeds its timeout', { timeout: 15000 }, async () => {
  const { runBoundedStage } = await import('../scripts/check-clean-install.mjs');
  await assert.rejects(runBoundedStage('hung build', {
    file: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'],
  }, { timeoutMs: 100 }), /\[hung build\] failed: exit .*timed out after 100ms/);
});

test('release checkout includes only explicit sources, assets, scripts and tests', { timeout: 15000 }, async () => {
  const { copyReleaseCheckout } = await import('../scripts/check-clean-install.mjs');
  const temporaryRoot = await realpath(tmpdir());
  const fixture = await mkdtemp(join(temporaryRoot, prefix));
  try {
    const source = join(fixture, 'source');
    await copyReleaseCheckout(root, source);
    const excluded = ['.env', '.env.production', 'runtime-state.json', 'node_modules/private.js', '.git/config', 'scripts/.env', 'test/runtime.json', 'test/e2e/.env', 'test/e2e/private.mjs', 'docs/images/private.webp'];
    for (const name of excluded) {
      const path = join(source, name);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, 'do-not-copy');
    }
    const destination = join(fixture, 'release checkout');
    const inventory = await copyReleaseCheckout(source, destination);
    for (const name of ['package.json', 'package-lock.json', 'client.js', 'scripts/check-clean-install.mjs', 'scripts/node-cli.mjs', 'test/build.test.js', 'test/e2e/preflight.test.mjs', 'test/e2e/fixture-contract.test.mjs', 'test/e2e/theme-restoration.test.mjs', 'test/e2e/real-harness.mjs', 'test/e2e/salah-api.mjs', 'test/e2e/regressions.mjs', 'test/e2e/host-theme.mjs', 'docs/images/salah-widget.webp', 'docs/BROWSER_RESULTS.json', '.github/workflows/checks.yml']) {
      assert.ok(inventory.includes(name), `Release input is present: ${name}`);
      assert.deepEqual(await readFile(join(destination, name)), await readFile(join(source, name)));
    }
    for (const name of excluded) assert.equal(await stat(join(destination, name)).catch(() => null), null, `Private/runtime input must not be copied: ${name}`);
    assert.equal(await stat(join(destination, 'node_modules')).catch(() => null), null);
    assert.equal(await stat(join(destination, '.git')).catch(() => null), null);
  } finally {
    const target = resolve(fixture);
    assert.equal(dirname(target), temporaryRoot);
    assert.ok(basename(target).startsWith(prefix) && target.startsWith(temporaryRoot + sep));
    await rm(target, { recursive: true, force: true, maxRetries: 3 });
  }
});

// The clean-install verifier is intentionally NOT invoked here: it runs this
// test suite itself, and CI/maintainers invoke that expensive verification once.
