import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const runner = new URL('../../scripts/check-browser.mjs', import.meta.url);

test('requested real-browser execution fails NEEDS_BROWSER without explicit authorization endpoint', () => {
  const env = { ...process.env };
  delete env.SALAH_CDP_URL;
  delete env.SALAH_BASE_URL;
  const result = spawnSync(process.execPath, [fileURLToPath(runner)], { env, encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 2, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'NEEDS_BROWSER');
  assert.equal(report.browserTestsRun, false);
  assert.equal(report.baseURL, 'http://127.0.0.1:3080/');
  assert.match(report.message, /SALAH_CDP_URL/);
  assert.match(report.message, /already.open authorized browser/);
});

test('invalid configuration cannot be mistaken for a browser pass', async () => {
  const { preflight } = await import('../../scripts/check-browser.mjs');
  assert.equal(preflight({ SALAH_BASE_URL: 'file:///not-a-Harness-page' }).status, 'INVALID_CONFIGURATION');
  for (const suffix of ['?token=sensitive-startup-material', '#token=sensitive-startup-material']) {
    const rejected = preflight({ SALAH_BASE_URL: `https://harness.example.test/${suffix}` });
    assert.equal(rejected.status, 'INVALID_CONFIGURATION');
    assert.doesNotMatch(JSON.stringify(rejected), /sensitive-startup-material|token=/, 'Rejected base URL must not be echoed.');
  }
  assert.equal(preflight({ SALAH_CDP_URL: 'file:///not-an-authorized-browser' }).status, 'INVALID_CONFIGURATION');
  assert.equal(preflight({ SALAH_CDP_URL: 'https://user:secret@authorized.example.test/' }).status, 'INVALID_CONFIGURATION');
  const ready = preflight({ SALAH_BASE_URL: 'https://harness.example.test/session/owned', SALAH_CDP_URL: 'wss://authorized.example.test/devtools/browser/explicit' });
  assert.equal(ready.status, 'READY');
  assert.equal(ready.browserTestsRun, false, 'URL validation alone is never browser verification');
  assert.equal(ready.baseURL, 'https://harness.example.test/session/owned');
  assert.equal(Object.hasOwn(ready, 'cdpURL'), false, 'reports must not echo browser connection material');
});

test('coverage reporting cannot green a missing, skipped, duplicated, or unverified mandatory browser case', async () => {
  const { MANDATORY_CHECKS, coverageStatus } = await import('./regressions.mjs');
  assert.equal(typeof coverageStatus, 'function');
  const complete = MANDATORY_CHECKS.map(name => ({ name, status: 'PASSED' }));
  assert.equal(coverageStatus(complete, []), 'PASSED', 'reporter unit data only, NOT browser execution');
  assert.equal(coverageStatus(complete.slice(0, -1), []), 'INCOMPLETE');
  assert.equal(coverageStatus([...complete, complete[0]], []), 'INCOMPLETE');
  assert.equal(coverageStatus(complete.map((item, index) => index ? item : { ...item, status: 'SKIPPED' }), []), 'INCOMPLETE');
  assert.equal(coverageStatus(complete, ['Host theme contract unavailable']), 'INCOMPLETE');
});

test('actual Host theme adapter requires observed controls and a real state indicator', async () => {
  const { parseHostThemeContract } = await import('./host-theme.mjs');
  assert.equal(parseHostThemeContract(), null, 'absence is handled as mandatory unverified coverage, not a passing theme test');
  assert.throws(() => parseHostThemeContract('{}'));
  assert.throws(() => parseHostThemeContract('{"open":[],"close":[]}'));
});

// These are runner/preflight tests, not browser/UI test execution.
// The browser suite is only run by scripts/check-browser.mjs against a supplied CDP URL.
