/* Locate npm's JavaScript entry point; never execute npm.cmd, npx, or a shell. */
import { realpathSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, delimiter, dirname, join, resolve } from 'node:path';

export function resolveNpmCli() {
  const candidates = [];
  // npm run supplies this even when Node itself was installed through npx.
  if (process.env.npm_execpath) {
    const inherited = resolve(process.env.npm_execpath);
    candidates.push(inherited, join(dirname(inherited), 'npm-cli.js'));
  }
  try {
    const manifest = createRequire(import.meta.url).resolve('npm/package.json');
    candidates.push(join(dirname(manifest), 'bin', 'npm-cli.js'));
  } catch { /* npm is normally bundled with Node, not a project dependency. */ }
  const directories = [dirname(process.execPath), ...(process.env.PATH || '').split(delimiter).filter(Boolean)];
  for (const directory of directories) {
    candidates.push(
      join(directory, 'node_modules', 'npm', 'bin', 'npm-cli.js'), // Windows
      resolve(directory, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'), // Unix
      join(directory, 'npm'), // Unix symlink to the real JavaScript CLI
    );
  }
  for (const candidate of candidates) {
    try {
      const path = realpathSync(candidate);
      if (basename(path) === 'npm-cli.js' && statSync(path).isFile()) return path;
    } catch { /* Try the next installed layout. */ }
  }
  throw new Error('Cannot locate npm/bin/npm-cli.js. Install npm with Node or invoke this check through npm run; shell wrappers are not supported.');
}

export function npmCommand(args) {
  return { file: process.execPath, args: [resolveNpmCli(), ...args] };
}
