/* Pure bootstrap helper: Node built-ins only, no package/runtime imports. */
import { join } from 'node:path';

// Pass only process-launch essentials. Inherited npm config/auth, proxy credentials,
// NODE_OPTIONS/NODE_PATH, .env and Harness profile state are never forwarded.
export function createIsolatedNpmEnvironment(owned, parent = process.env) {
  const env = {};
  for (const name of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'PATHEXT', 'LANG', 'LC_ALL', 'LC_CTYPE']) {
    if (typeof parent[name] === 'string') env[name] = parent[name];
  }
  return Object.assign(env, {
    HOME: join(owned, 'home'), USERPROFILE: join(owned, 'home'),
    XDG_CONFIG_HOME: join(owned, 'home', '.config'),
    TEMP: join(owned, 'tmp'), TMP: join(owned, 'tmp'), TMPDIR: join(owned, 'tmp'),
    npm_config_userconfig: join(owned, 'npm-user-config'),
    npm_config_globalconfig: join(owned, 'npm-global-config'),
    npm_config_cache: join(owned, 'npm-cache'), npm_config_logs_dir: join(owned, 'npm-logs'),
    npm_config_registry: 'https://registry.npmjs.org', npm_config_update_notifier: 'false',
    npm_config_audit: 'false', npm_config_fund: 'false', npm_config_progress: 'false',
    npm_config_fetch_retries: '1', npm_config_fetch_timeout: '45000', npm_config_ignore_scripts: 'true',
  });
}
