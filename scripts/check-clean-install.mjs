/* Verify a release checkout without installing into or modifying a Harness profile. */
import assert from 'node:assert/strict';
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { npmCommand } from './node-cli.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryPrefix = 'salah-clean-install-';
const releaseFiles = [
  'package.json', 'package-lock.json', '.gitignore', '.gitattributes',
  'index.js', 'service.js', 'core.js', 'client.js', 'build-ui.mjs', 'ui.css', 'styles.css',
  'cordis.patch.yml', 'icon.svg', 'locale/en.json', 'locale/id.json',
  'README.md', 'LICENSE', 'PRIVACY.md', 'SECURITY.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md',
  'docs/RELEASE_REVIEW.md', 'docs/HOST_THEME_CONTRACT.json', 'docs/BROWSER_RESULTS.json', 'docs/images/salah-widget.webp', 'docs/images/salah-dashboard.webp',
  '.github/workflows/checks.yml',
  'test/e2e/preflight.test.mjs', 'test/e2e/fixture-contract.test.mjs', 'test/e2e/theme-restoration.test.mjs',
  'test/e2e/real-harness.mjs', 'test/e2e/salah-api.mjs', 'test/e2e/regressions.mjs', 'test/e2e/host-theme.mjs',
];

// A deliberately narrow release allowlist, not a recursive workspace copy.
// Public for inexpensive inventory tests without triggering a network install.
export async function copyReleaseCheckout(source, destination) {
  const sourceRoot = await realpath(source);
  const destinationRoot = resolve(destination);
  assert.ok(destinationRoot !== sourceRoot && !destinationRoot.startsWith(sourceRoot + sep), 'The release copy must be outside the source checkout.');
  const files = [...releaseFiles];
  for (const [directory, pattern] of [['scripts', /^[^.][^/]*\.mjs$/], ['test', /^[^.][^/]*\.test\.js$/]]) {
    const entries = await readdir(join(sourceRoot, directory), { withFileTypes: true });
    for (const entry of entries) if (pattern.test(entry.name)) {
      assert.ok(entry.isFile() && !entry.isSymbolicLink(), `Release source must be a regular file: ${directory}/${entry.name}`);
      files.push(`${directory}/${entry.name}`);
    }
  }
  files.sort();
  assert.ok(files.length <= 512, 'Unexpectedly large release file inventory.');
  let bytes = 0;
  for (const name of files) {
    let sourcePath = sourceRoot;
    for (const part of name.split('/')) {
      sourcePath = join(sourcePath, part);
      assert.ok(!(await lstat(sourcePath)).isSymbolicLink(), `Symlinks are not release inputs: ${name}`);
    }
    const info = await lstat(sourcePath);
    assert.ok(info.isFile(), `Release source must be a regular file: ${name}`);
    bytes += info.size;
    assert.ok(bytes <= 32 * 1024 * 1024, 'Unexpectedly large release source payload.');
    const target = join(destinationRoot, name);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(sourcePath, target);
  }
  return files;
}

function redact(output, env) {
  let safe = output.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/(https?:\/\/)[^\s/@]+@/gi, '$1[redacted]@')
    .replace(/\b(?:npm_[A-Za-z0-9]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, '[redacted]')
    .replace(/(authorization\s*[:=]\s*(?:bearer|basic)\s+)\S+/gi, '$1[redacted]')
    .replace(/((?:_authToken|password|token)\s*[:=]\s*)[^\s]+/gi, '$1[redacted]');
  for (const [name, value] of Object.entries(env)) {
    if (/(?:token|password|secret|credential|api[_-]?key|auth)/i.test(name) && typeof value === 'string' && value.length >= 6) safe = safe.split(value).join('[redacted]');
  }
  return safe;
}

function killProcessTree(child) {
  if (!child.pid) return;
  if (process.platform === 'win32') {
    // taskkill.exe is a native executable, never a .cmd wrapper or shell string.
    const taskkill = join(process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows', 'System32', 'taskkill.exe');
    spawnSync(taskkill, ['/PID', String(child.pid), '/T', '/F'], { timeout: 10000, windowsHide: true, stdio: 'ignore', shell: false });
    child.kill('SIGKILL');
  } else {
    try { process.kill(-child.pid, 'SIGKILL'); } catch (error) {
      if (error.code !== 'ESRCH') child.kill('SIGKILL');
    }
  }
}

// A real process runner, exported so failure/timeout/redaction can be checked
// without an npm download or mocks of child_process internals.
export function runBoundedStage(name, command, { cwd, env = process.env, timeoutMs = 60000, signal, maxOutputBytes = 4 * 1024 * 1024 } = {}) {
  assert.ok(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 600000, 'A bounded stage timeout is required.');
  return new Promise((accept, reject) => {
    if (signal?.aborted) { reject(new Error(`[${name}] aborted before execution.`)); return; }
    const child = spawn(command.file, command.args, { cwd, env, shell: false, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    const output = [];
    let bytes = 0;
    let reason = '';
    let launchError;
    const stop = message => {
      if (reason) return;
      reason = message;
      killProcessTree(child);
    };
    const timer = setTimeout(() => stop(`timed out after ${timeoutMs}ms`), timeoutMs);
    const abort = () => stop('aborted');
    signal?.addEventListener('abort', abort, { once: true });
    const collect = chunk => {
      bytes += chunk.length;
      if (bytes > maxOutputBytes) { stop(`output exceeded ${maxOutputBytes} bytes`); return; }
      output.push(chunk);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', error => { launchError = error.code || 'spawn error'; });
    child.on('close', (code, childSignal) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      const text = redact(Buffer.concat(output).toString('utf8'), env);
      if (reason || launchError || code !== 0) {
        const details = [reason, launchError, childSignal && `signal ${childSignal}`].filter(Boolean).join('; ');
        reject(new Error(`[${name}] failed: exit ${code ?? 'unavailable'}${details ? `; ${details}` : ''}\n${text.slice(-12000) || '(no process output)'}`));
      } else accept({ code, output: text });
    });
  });
}

async function removeOwnedTemporaryDirectory(path, temporaryRoot) {
  const target = resolve(path);
  assert.ok(target.startsWith(temporaryRoot + sep) && dirname(target) === temporaryRoot, 'Refusing cleanup outside the owned temporary root.');
  assert.ok(basename(target).startsWith(temporaryPrefix) && basename(target).length >= temporaryPrefix.length + 6, 'Refusing cleanup without the unique owned temporary basename.');
  assert.equal(await realpath(target), target, 'Refusing cleanup of a replaced temporary symlink.');
  assert.ok((await lstat(target)).isDirectory(), 'Refusing cleanup of a non-directory.');
  await rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}

export async function verifyCleanInstall() {
  const temporaryRoot = await realpath(tmpdir());
  const owned = await mkdtemp(join(temporaryRoot, temporaryPrefix));
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    const checkout = join(owned, 'checkout with spaces');
    const files = await copyReleaseCheckout(projectRoot, checkout);
    const manifest = JSON.parse(await readFile(join(checkout, 'package.json'), 'utf8'));
    for (const name of ['check', 'test', 'test:e2e:preflight', 'check:release', 'build:ui']) assert.ok(typeof manifest.scripts?.[name] === 'string', `Missing package script: ${name}`);
    const artifact = await readFile(join(checkout, 'client.js'));
    const userconfig = join(owned, 'npmrc');
    await writeFile(userconfig, '', { flag: 'wx' });
    const env = { ...process.env };
    const isolatedConfig = {
      npm_config_cache: join(owned, 'npm-cache'), npm_config_userconfig: userconfig,
      npm_config_logs_dir: join(owned, 'npm-logs'), npm_config_update_notifier: 'false',
      npm_config_audit: 'false', npm_config_fund: 'false', npm_config_progress: 'false',
      npm_config_fetch_retries: '1', npm_config_fetch_timeout: '45000',
      npm_config_ignore_scripts: 'true',
    };
    // npm treats these environment keys case-insensitively, including on Unix.
    for (const name of Object.keys(env)) if (Object.hasOwn(isolatedConfig, name.toLowerCase())) delete env[name];
    Object.assign(env, isolatedConfig);
    console.log(`Clean-install checkout: ${files.length} allowlisted files; isolated npm state; no Harness profile changes.`);
    const stages = [
      ['npm ci --ignore-scripts', ['ci', '--ignore-scripts', '--include=dev', '--no-audit', '--no-fund'], 240000],
      ['syntax', ['run', 'check'], 60000],
      ['tests', ['test'], 180000],
      // URL/configuration unit tests only; never attach to or launch a browser.
      ['browser preflight unit tests', ['run', 'test:e2e:preflight'], 60000],
      ['release contents', ['run', 'check:release'], 90000],
      ['fresh UI build', ['run', 'build:ui'], 75000],
    ];
    for (const [name, args, timeoutMs] of stages) {
      console.log(`[${name}] starting (timeout ${timeoutMs}ms).`);
      await runBoundedStage(name, npmCommand(args), { cwd: checkout, env, timeoutMs, signal: controller.signal });
      console.log(`[${name}] passed: exit 0.`);
    }
    assert.ok(artifact.equals(await readFile(join(checkout, 'client.js'))), '[built artifact] fresh build differs from the committed client.js. Rebuild and review it before release.');
    console.log('[built artifact] byte-for-byte match; clean-install verification passed.');
  } finally {
    try { await removeOwnedTemporaryDirectory(owned, temporaryRoot); }
    finally {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await verifyCleanInstall(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
