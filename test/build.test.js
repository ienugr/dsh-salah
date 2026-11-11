/* Real build CLI checks: no shell, fake compiler, or private-function mocks. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
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
    const { createIsolatedNpmEnvironment } = await import('../scripts/check-package.mjs');
    const env = createIsolatedNpmEnvironment(fixture);
    for (const path of [env.HOME, env.TMPDIR]) await mkdir(path, { recursive: true });
    for (const path of [env.npm_config_userconfig, env.npm_config_globalconfig]) await writeFile(path, '', { flag: 'wx' });
    const result = spawnSync(command.file, command.args, {
      cwd: fixture, env, encoding: 'utf8', timeout: 10000, shell: false,
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

test('taskkill result validation fails closed for errors, timeouts, signals and nonzero status without native Windows claims', async () => {
  const { validateTaskkillResult, verificationFailureExitCode } = await import('../scripts/check-clean-install.mjs');
  assert.doesNotThrow(() => validateTaskkillResult({ status: 0, signal: null }));
  for (const result of [
    { status: 1, signal: null }, { status: null, signal: null },
    { status: 0, signal: 'SIGTERM' }, { status: 0, error: { code: 'ENOENT' } },
    { status: null, error: { code: 'ETIMEDOUT' }, signal: 'SIGTERM' },
  ]) assert.throws(() => validateTaskkillResult(result), error => {
    assert.match(error.message, /taskkill.*unconfirmed/i);
    assert.equal(error.cleanupUnsafe, true);
    assert.equal(verificationFailureExitCode(error), 86);
    return true;
  });
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

test('bounded stages expose separately redacted stdout for npm JSON and diagnostics', async () => {
  const { runBoundedStage } = await import('../scripts/check-clean-install.mjs');
  const result = await runBoundedStage('JSON inventory', {
    file: process.execPath,
    args: ['-e', `process.stdout.write(JSON.stringify({ok:true})); process.stderr.write('token=npm_12345678901234567890');`],
  }, { timeoutMs: 10000 });
  assert.deepEqual(JSON.parse(result.stdout), { ok: true });
  assert.match(result.stderr, /redacted/);
  assert.doesNotMatch(result.output + result.stderr, /npm_12345678901234567890/);
});

test('bounded verification terminates a stage that exceeds its timeout', { timeout: 15000 }, async () => {
  const { runBoundedStage } = await import('../scripts/check-clean-install.mjs');
  await assert.rejects(runBoundedStage('hung build', {
    file: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'],
  }, { timeoutMs: 100 }), /\[hung build\] failed: exit .*timed out after 100ms/);
});

test('unsafe cleanup survives a real nested CLI exit-code boundary without losing stage status', { timeout: 15000 }, async () => {
  const { runBoundedStage } = await import('../scripts/check-clean-install.mjs');
  const runner = new URL('../scripts/check-clean-install.mjs', import.meta.url).href;
  const child = `
    import {runBoundedStage, verificationFailureExitCode} from ${JSON.stringify(runner)};
    try { await runBoundedStage('inner unsafe CLI', {file:process.execPath,args:['-e','process.exit(86)']}, {timeoutMs:5000}); }
    catch (error) { console.error(error.message); process.exitCode=verificationFailureExitCode(error); }
  `;
  await assert.rejects(runBoundedStage('outer unsafe CLI', {
    file: process.execPath, args: ['--input-type=module', '--eval', child],
  }, { env: {}, timeoutMs: 10000 }), error => {
    assert.equal(error.cleanupUnsafe, true);
    assert.match(error.message, /\[outer unsafe CLI\] failed: exit 86/);
    assert.match(error.message, /\[inner unsafe CLI\] failed: exit 86/);
    return true;
  });
});

for (const mode of ['timeout', 'abort']) test(`outer bounded ${mode} removes a nested detached runner before returning`, { timeout: 15000 }, async () => {
  const { runBoundedStage } = await import('../scripts/check-clean-install.mjs');
  const { createIsolatedNpmEnvironment } = await import('../scripts/npm-environment.mjs');
  const temporaryRoot = await realpath(tmpdir());
  const fixture = await mkdtemp(join(temporaryRoot, prefix));
  let ownedPid, abortTimer;
  const controller = new AbortController();
  try {
    const marker = join(fixture, 'owned-leaf-pid.json');
    const runner = new URL('../scripts/check-clean-install.mjs', import.meta.url).href;
    const leaf = `require('node:fs').writeFileSync(${JSON.stringify(marker)}, JSON.stringify({pid:process.pid})); setInterval(() => {}, 1000);`;
    const nested = `const {runBoundedStage}=await import(${JSON.stringify(runner)}); await runBoundedStage('inner interval', {file:process.execPath,args:['-e',${JSON.stringify(leaf)}]}, {timeoutMs:10000});`;
    if (mode === 'abort') abortTimer = setTimeout(() => controller.abort(), 1500);
    await assert.rejects(runBoundedStage('outer nested runner', {
      file: process.execPath, args: ['--input-type=module', '--eval', nested],
    }, { cwd: fixture, env: createIsolatedNpmEnvironment(fixture), timeoutMs: mode === 'timeout' ? 1500 : 10000, signal: controller.signal }), mode === 'timeout' ? /outer nested runner.*timed out after 1500ms/s : /outer nested runner.*aborted/s);
    const record = JSON.parse(await readFile(marker, 'utf8'));
    assert.ok(Number.isSafeInteger(record.pid) && record.pid > 1 && record.pid !== process.pid);
    ownedPid = record.pid;
    assert.throws(() => process.kill(ownedPid, 0), error => error.code === 'ESRCH', 'the owned nested leaf is gone before rejection/cleanup');
  } finally {
    clearTimeout(abortTimer);
    // Fallback only for the deliberately reproduced old leak, never an arbitrary PID.
    if (ownedPid) { try { process.kill(ownedPid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; } }
    const target = resolve(fixture);
    assert.equal(dirname(target), temporaryRoot);
    assert.ok(basename(target).startsWith(prefix) && target.startsWith(temporaryRoot + sep));
    assert.equal(await realpath(target), target);
    await rm(target, { recursive: true, force: true, maxRetries: 3 });
  }
});

test('POSIX preview cancellation drains its owned CLI and restores signal listeners', { timeout: 15000, skip: process.platform === 'win32' }, async () => {
  const { runBoundedStage } = await import('../scripts/check-clean-install.mjs');
  const { createIsolatedNpmEnvironment } = await import('../scripts/npm-environment.mjs');
  const temporaryRoot = await realpath(tmpdir());
  const fixture = await mkdtemp(join(temporaryRoot, prefix));
  const marker = join(fixture, 'owned-preview-pid.json');
  let ownedPid;
  try {
    // Explicitly owned fault-injection CLI: finite, no package/network operations.
    const cli = join(fixture, 'npm-cli.js');
    await writeFile(cli, `require('node:fs').writeFileSync(${JSON.stringify(marker)}, JSON.stringify({pid:process.pid})); setTimeout(() => process.exit(0), 8000);`);
    const env = createIsolatedNpmEnvironment(fixture);
    for (const path of [env.HOME, env.TMPDIR]) await mkdir(path, { recursive: true });
    env.npm_execpath = cli;
    const checker = new URL('../scripts/check-package.mjs', import.meta.url).href;
    const source = `
      import assert from 'node:assert/strict';
      import {readFile, readdir} from 'node:fs/promises';
      import {previewPackageInventory} from ${JSON.stringify(checker)};
      const before = ['SIGINT','SIGTERM'].map(signal => process.listenerCount(signal));
      let signalled = false;
      const timer = setInterval(async () => {
        if (signalled) return;
        const ready = await readFile(${JSON.stringify(marker)}, 'utf8').catch(() => null);
        if (ready && !signalled) { signalled = true; clearInterval(timer); process.kill(process.pid, 'SIGTERM'); }
      }, 20);
      try {
        await assert.rejects(previewPackageInventory(${JSON.stringify(fixture)}), /aborted/);
        assert.deepEqual(['SIGINT','SIGTERM'].map(signal => process.listenerCount(signal)), before);
        const {pid} = JSON.parse(await readFile(${JSON.stringify(marker)}, 'utf8'));
        assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH');
        assert.deepEqual(await readdir(process.env.TMPDIR), []);
        console.log('preview cancellation drained; listeners restored');
      } finally { clearInterval(timer); }
    `;
    const result = await runBoundedStage('preview cancellation CLI', {
      file: process.execPath, args: ['--input-type=module', '--eval', source],
    }, { cwd: fixture, env, timeoutMs: 10000 });
    assert.match(result.stdout, /preview cancellation drained; listeners restored/);
  } finally {
    const record = await readFile(marker, 'utf8').then(JSON.parse).catch(() => null);
    if (record) { assert.ok(Number.isSafeInteger(record.pid) && record.pid > 1 && record.pid !== process.pid); ownedPid = record.pid; }
    if (ownedPid) { try { process.kill(ownedPid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; } }
    const target = resolve(fixture);
    assert.equal(dirname(target), temporaryRoot);
    assert.ok(basename(target).startsWith(prefix) && target.startsWith(temporaryRoot + sep));
    assert.equal(await realpath(target), target);
    await rm(target, { recursive: true, force: true, maxRetries: 3 });
  }
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
    for (const name of ['package.json', 'package-lock.json', 'client.js', 'docs/PUBLISHING.md', 'docs/NPM_RELEASE_REVIEW.md', 'scripts/check-package.mjs', 'scripts/npm-environment.mjs', 'test/package.test.js', 'scripts/check-clean-install.mjs', 'scripts/node-cli.mjs', 'test/build.test.js', 'test/e2e/preflight.test.mjs', 'test/e2e/fixture-contract.test.mjs', 'test/e2e/theme-restoration.test.mjs', 'test/e2e/real-harness.mjs', 'test/e2e/salah-api.mjs', 'test/e2e/regressions.mjs', 'test/e2e/host-theme.mjs', 'docs/images/salah-widget.webp', 'docs/BROWSER_RESULTS.json', '.github/workflows/checks.yml']) {
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

test('fresh release bootstrap imports without dependencies and rejects a runtime-import regression', { timeout: 15000 }, async () => {
  const { copyReleaseCheckout, runBoundedStage } = await import('../scripts/check-clean-install.mjs');
  const { createIsolatedNpmEnvironment } = await import('../scripts/check-package.mjs');
  const temporaryRoot = await realpath(tmpdir());
  const fixture = await mkdtemp(join(temporaryRoot, prefix));
  try {
    const checkout = join(fixture, 'dependencyless checkout with spaces');
    await copyReleaseCheckout(root, checkout);
    assert.equal(await stat(join(checkout, 'node_modules')).catch(() => null), null);
    const env = createIsolatedNpmEnvironment(fixture);
    assert.equal(Object.hasOwn(env, 'NODE_PATH'), false);
    assert.equal(Object.hasOwn(env, 'NODE_OPTIONS'), false);
    const command = {
      file: process.execPath,
      args: ['--input-type=module', '--eval', `
        const { validatePackageDirectory } = await import('./scripts/check-package.mjs');
        await import('./scripts/check-clean-install.mjs');
        await validatePackageDirectory(process.cwd());
        console.log('dependencyless bootstrap ready');
      `],
    };
    const options = { cwd: checkout, env, timeoutMs: 10000 };
    assert.match((await runBoundedStage('dependencyless bootstrap', command, options)).stdout, /dependencyless bootstrap ready/);
    // Mutate only this owned copy: this old edge transitively imports adhan.
    // The real Node child must fail, proving workspace dependencies cannot mask it.
    const checker = join(checkout, 'scripts', 'check-package.mjs');
    const original = await readFile(checker, 'utf8');
    await writeFile(checker, original + "\nimport '../test/e2e/regressions.mjs';\n");
    await assert.rejects(runBoundedStage('dependencyless bootstrap mutant', command, options), error => {
      assert.match(error.message, /failed: exit 1/);
      assert.match(error.message, /ERR_MODULE_NOT_FOUND/);
      assert.match(error.message, /Cannot find package '(?:adhan|zod)'/);
      return true;
    });
  } finally {
    const target = resolve(fixture);
    assert.equal(dirname(target), temporaryRoot);
    assert.ok(basename(target).startsWith(prefix) && target.startsWith(temporaryRoot + sep));
    assert.equal(await realpath(target), target);
    await rm(target, { recursive: true, force: true, maxRetries: 3 });
  }
});

test('dependencyless clean CLI reaches a real bounded npm stage instead of an unsettled import cycle', { timeout: 20000 }, async () => {
  const { copyReleaseCheckout, runBoundedStage } = await import('../scripts/check-clean-install.mjs');
  const { createIsolatedNpmEnvironment } = await import('../scripts/check-package.mjs');
  const { npmCommand } = await import('../scripts/node-cli.mjs');
  const temporaryRoot = await realpath(tmpdir());
  const fixture = await mkdtemp(join(temporaryRoot, prefix));
  try {
    const checkout = join(fixture, 'dependencyless CLI checkout with spaces');
    await copyReleaseCheckout(root, checkout);
    assert.equal(await stat(join(checkout, 'node_modules')).catch(() => null), null);
    // A malformed lock makes the real npm ci reject BEFORE dependency fetching.
    // Do not run the full clean/pack/install integration recursively in npm test.
    const lock = join(checkout, 'package-lock.json');
    await readFile(lock, 'utf8');
    await writeFile(lock, '{');
    const env = createIsolatedNpmEnvironment(fixture);
    for (const path of [env.HOME, env.TMPDIR]) await mkdir(path, { recursive: true });
    env.npm_execpath = npmCommand([]).args[0]; // Trusted actual npm JS CLI, not a fake.
    await assert.rejects(runBoundedStage('dependencyless clean CLI', {
      file: process.execPath, args: [join(checkout, 'scripts', 'check-clean-install.mjs')],
    }, { cwd: checkout, env, timeoutMs: 15000 }), error => {
      assert.match(error.message, /\[npm ci --ignore-scripts\] starting/);
      assert.match(error.message, /\[npm ci --ignore-scripts\] failed: exit 1/);
      assert.doesNotMatch(error.message, /unsettled top-level await|exit 13/i);
      assert.equal(error.cleanupUnsafe, undefined, 'ordinary confirmed failure remains safe to clean');
      return true;
    });
    assert.deepEqual(await readdir(env.TMPDIR), [], 'confirmed failure removes its owned checkout');
  } finally {
    const target = resolve(fixture);
    assert.equal(dirname(target), temporaryRoot);
    assert.ok(basename(target).startsWith(prefix) && target.startsWith(temporaryRoot + sep));
    assert.equal(await realpath(target), target);
    await rm(target, { recursive: true, force: true, maxRetries: 3 });
  }
});

// The full clean-install verifier is intentionally NOT invoked here: it runs this
// test suite itself, and CI/maintainers invoke that expensive verification once.
