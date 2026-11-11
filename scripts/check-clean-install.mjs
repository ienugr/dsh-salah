/* Verify a release checkout without installing into or modifying a Harness profile. */
import assert from 'node:assert/strict';
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { npmCommand } from './node-cli.mjs';
import { createIsolatedNpmEnvironment } from './npm-environment.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryPrefix = 'salah-clean-install-';
const releaseFiles = [
  'package.json', 'package-lock.json', '.gitignore', '.gitattributes',
  'index.js', 'service.js', 'core.js', 'client.js', 'build-ui.mjs', 'ui.css', 'styles.css',
  'cordis.patch.yml', 'icon.svg', 'locale/en.json', 'locale/id.json',
  'README.md', 'LICENSE', 'PRIVACY.md', 'SECURITY.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md',
  'docs/RELEASE_REVIEW.md', 'docs/PUBLISHING.md', 'docs/NPM_RELEASE_REVIEW.md', 'docs/HOST_THEME_CONTRACT.json', 'docs/BROWSER_RESULTS.json', 'docs/images/salah-widget.webp', 'docs/images/salah-dashboard.webp',
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

function processTable() {
  // Native metadata only: never inspect command lines, environments or profiles.
  const result = spawnSync('/bin/ps', ['-e', '-o', 'pid=', '-o', 'ppid=', '-o', 'pgid='], {
    env: {}, encoding: 'utf8', timeout: 1000, maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'], shell: false,
  });
  assert.equal(result.status, 0, 'Cannot inspect owned subprocess PID/PPID/PGID metadata.');
  const table = new Map();
  for (const line of result.stdout.split('\n')) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s*$/);
    if (match) { const [pid, ppid, pgid] = match.slice(1).map(Number); table.set(pid, { pid, ppid, pgid }); }
  }
  assert.ok(table.has(process.pid), 'Incomplete subprocess metadata.');
  return table;
}

function ownedProcesses(table, rootPid) {
  const root = table.get(rootPid);
  if (root) assert.ok(root.ppid === process.pid && root.pgid === rootPid, 'Refusing to signal a replaced subprocess owner.');
  const owned = new Map();
  // The process group was created by this exact spawn, never supplied by env.
  for (const entry of table.values()) if (entry.pgid === rootPid) owned.set(entry.pid, entry);
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of table.values()) if (!owned.has(entry.pid) && owned.has(entry.ppid)) {
      owned.set(entry.pid, entry); changed = true;
    }
  }
  assert.ok(!owned.has(process.pid), 'Refusing to signal the runner itself.');
  return owned;
}

function signalPid(pid, signal) {
  try { process.kill(pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
}

// Pure result contract; tests exercise known results, not a fake Windows host.
export function validateTaskkillResult(result) {
  if (result?.status === 0 && !result.error && !result.signal) return;
  const failure = new Error('Windows taskkill descendant cleanup is unconfirmed.');
  failure.cleanupUnsafe = true;
  throw failure;
}

async function killProcessTree(child) {
  if (!child.pid) return;
  if (process.platform === 'win32') {
    // taskkill.exe /T includes descendants even when a nested runner exists.
    const taskkill = join(process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows', 'System32', 'taskkill.exe');
    const result = spawnSync(taskkill, ['/PID', String(child.pid), '/T', '/F'], { timeout: 10000, windowsHide: true, stdio: 'ignore', shell: false });
    validateTaskkillResult(result);
    child.kill('SIGKILL');
    return;
  }
  const owned = new Map();
  let stable = false, verifiedGroup = false;
  try {
    // Freeze the actual spawn's group before parents can exit/reparent children.
    // Then freeze detached descendants, resnapshotting to close spawn races.
    for (let round = 0; round < 8; round++) {
      const current = ownedProcesses(processTable(), child.pid);
      if (current.size) { verifiedGroup = true; signalPid(-child.pid, 'SIGSTOP'); }
      const added = [...current.keys()].some(pid => !owned.has(pid));
      for (const entry of current.values()) { owned.set(entry.pid, entry); signalPid(entry.pid, 'SIGSTOP'); }
      if (!added) { stable = true; break; }
    }
    assert.ok(stable, 'Owned subprocess tree did not stabilize within the cleanup bound.');
  } finally {
    const depth = entry => { let count = 0; for (let parent = owned.get(entry.ppid); parent && count < owned.size; parent = owned.get(parent.ppid)) count++; return count; };
    // Children first; all recorded processes are stopped, so they cannot fork.
    for (const entry of [...owned.values()].sort((a, b) => depth(b) - depth(a))) signalPid(entry.pid, 'SIGKILL');
    // Also cover direct-group children that exited between metadata snapshots.
    if (verifiedGroup) signalPid(-child.pid, 'SIGKILL');
  }
  const deadline = Date.now() + 3000;
  while (true) {
    const table = processTable();
    const remaining = [...owned.values()].filter(entry => table.get(entry.pid)?.pgid === entry.pgid);
    if (!remaining.length) return;
    assert.ok(Date.now() < deadline, 'Owned subprocess descendants remain after forced termination.');
    await new Promise(accept => setTimeout(accept, 20));
  }
}

// Reserved verifier protocol: an unconfirmed teardown must survive npm/Node CLI
// boundaries so an outer verifier does not delete an inner retained directory.
export const CLEANUP_UNSAFE_EXIT_CODE = 86;
export function verificationFailureExitCode(error) { return error?.cleanupUnsafe ? CLEANUP_UNSAFE_EXIT_CODE : 1; }

// A real process runner, exported so failure/timeout/redaction can be checked
// without an npm download or mocks of child_process internals.
export function runBoundedStage(name, command, { cwd, env = process.env, timeoutMs = 60000, signal, maxOutputBytes = 4 * 1024 * 1024 } = {}) {
  assert.ok(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 600000, 'A bounded stage timeout is required.');
  return new Promise((accept, reject) => {
    if (signal?.aborted) { reject(new Error(`[${name}] aborted before execution.`)); return; }
    // Fail before spawning if this platform cannot safely enumerate ownership.
    if (process.platform !== 'win32') {
      try { processTable(); } catch { reject(new Error(`[${name}] cannot inspect subprocess ownership before execution.`)); return; }
    }
    const child = spawn(command.file, command.args, { cwd, env, shell: false, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    const output = [], stdout = [], stderr = [];
    let bytes = 0;
    let reason = '';
    let launchError, termination, terminationError;
    const terminate = () => termination ||= killProcessTree(child).catch(error => {
      terminationError = error.message;
      child.kill('SIGKILL');
      // Unconfirmed descendants may retain these pipe FDs. Do not let them
      // prevent the unsafe status from reaching the outer CLI/retention guard.
      child.stdout.destroy();
      child.stderr.destroy();
    });
    const stop = message => {
      if (reason) return;
      reason = message;
      terminate();
    };
    const timer = setTimeout(() => stop(`timed out after ${timeoutMs}ms`), timeoutMs);
    const abort = () => stop('aborted');
    signal?.addEventListener('abort', abort, { once: true });
    const collect = (stream, chunk) => {
      bytes += chunk.length;
      if (bytes > maxOutputBytes) { stop(`output exceeded ${maxOutputBytes} bytes`); return; }
      output.push(chunk);
      stream.push(chunk);
    };
    child.stdout.on('data', chunk => collect(stdout, chunk));
    child.stderr.on('data', chunk => collect(stderr, chunk));
    child.on('error', error => { launchError = error.code || 'spawn error'; });
    child.on('close', async (code, childSignal) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      // Windows taskkill requires a live root; stop() already starts it for
      // cancellation. A normal completed exit needs no taskkill; signals and
      // unknown termination must still attempt it and fail closed if unconfirmed.
      if (reason || childSignal || code === null || (code !== 0 && process.platform !== 'win32')) await terminate();
      const text = redact(Buffer.concat(output).toString('utf8'), env);
      if (reason || launchError || code !== 0 || terminationError) {
        const details = [reason, launchError, terminationError, childSignal && `signal ${childSignal}`].filter(Boolean).join('; ');
        const failure = new Error(`[${name}] failed: exit ${code ?? 'unavailable'}${details ? `; ${details}` : ''}\n${text.slice(-12000) || '(no process output)'}`);
        if (terminationError || code === CLEANUP_UNSAFE_EXIT_CODE) failure.cleanupUnsafe = true;
        reject(failure);
      } else accept({ code, output: text, stdout: redact(Buffer.concat(stdout).toString('utf8'), env), stderr: redact(Buffer.concat(stderr).toString('utf8'), env) });
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
  let cleanupSafe = true;
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    const checkout = join(owned, 'checkout with spaces');
    const files = await copyReleaseCheckout(projectRoot, checkout);
    const manifest = JSON.parse(await readFile(join(checkout, 'package.json'), 'utf8'));
    for (const name of ['check', 'test', 'test:e2e:preflight', 'check:release', 'check:package', 'build:ui']) assert.ok(typeof manifest.scripts?.[name] === 'string', `Missing package script: ${name}`);
    const artifact = await readFile(join(checkout, 'client.js'));
    const env = createIsolatedNpmEnvironment(owned);
    for (const path of [env.HOME, env.TMPDIR]) await mkdir(path, { recursive: true });
    for (const path of [env.npm_config_userconfig, env.npm_config_globalconfig]) await writeFile(path, '', { flag: 'wx' });
    console.log(`Clean-install checkout: ${files.length} allowlisted files; isolated npm state; no Harness profile changes.`);
    const stages = [
      ['npm ci --ignore-scripts', ['ci', '--ignore-scripts', '--include=dev', '--no-audit', '--no-fund'], 240000],
      ['syntax', ['run', 'check'], 60000],
      ['tests', ['test'], 180000],
      // URL/configuration unit tests only; never attach to or launch a browser.
      ['browser preflight unit tests', ['run', 'test:e2e:preflight'], 60000],
      ['release contents', ['run', 'check:release'], 90000],
      ['fresh UI build', ['run', 'build:ui'], 75000],
      // Exactly once; npm test never runs this network/artifact integration.
      ['packed npm artifact', ['run', 'check:package'], 420000],
    ];
    for (const [name, args, timeoutMs] of stages) {
      console.log(`[${name}] starting (timeout ${timeoutMs}ms).`);
      const result = await runBoundedStage(name, npmCommand(args), { cwd: checkout, env, timeoutMs, signal: controller.signal });
      if (name === 'packed npm artifact') console.log(result.stdout.trim());
      console.log(`[${name}] passed: exit 0.`);
    }
    assert.ok(artifact.equals(await readFile(join(checkout, 'client.js'))), '[built artifact] fresh build differs from the committed client.js. Rebuild and review it before release.');
    console.log('[built artifact] byte-for-byte match; clean-install verification passed.');
  } catch (error) {
    if (error.cleanupUnsafe) cleanupSafe = false;
    throw error;
  } finally {
    try {
      if (cleanupSafe) await removeOwnedTemporaryDirectory(owned, temporaryRoot);
      else console.error(`Cleanup unconfirmed; retained owned checkout for inspection: ${owned}`);
    }
    finally {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await verifyCleanInstall(); }
  catch (error) { console.error(error.message); process.exitCode = verificationFailureExitCode(error); }
}
