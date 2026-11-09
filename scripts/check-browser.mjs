#!/usr/bin/env node
// Connect only to an explicitly authorized, already-open Chromium browser.
// Never launches Chromium, reads profiles/cookies, or starts a replacement Harness.
import { pathToFileURL } from 'node:url';

export const DEFAULT_BASE_URL = 'http://127.0.0.1:3080/';

export function preflight(env = process.env) {
  let base;
  try {
    base = new URL(env.SALAH_BASE_URL || DEFAULT_BASE_URL);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error();
  } catch {
    return { status: 'INVALID_CONFIGURATION', browserTestsRun: false, message: 'SALAH_BASE_URL must be a clean HTTP(S) Harness origin/mount path without credentials, query, or fragment.' };
  }
  if (!env.SALAH_CDP_URL?.trim()) return {
    status: 'NEEDS_BROWSER', browserTestsRun: false, baseURL: base.href,
    message: 'Set SALAH_CDP_URL to an explicitly user-provided endpoint controlling an already-open authorized browser. No browser was launched, no ports were scanned, and no browser tests ran.',
  };
  try {
    const endpoint = new URL(env.SALAH_CDP_URL);
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(endpoint.protocol) || endpoint.username || endpoint.password || !endpoint.hostname) throw new Error();
  } catch {
    return { status: 'INVALID_CONFIGURATION', browserTestsRun: false, baseURL: base.href, message: 'SALAH_CDP_URL must be the explicitly user-provided HTTP(S) or WS(S) CDP endpoint without embedded credentials.' };
  }
  return { status: 'READY', browserTestsRun: false, baseURL: base.href };
}

export async function main(env = process.env) {
  const ready = preflight(env);
  if (ready.status !== 'READY') return ready;
  let chromium;
  try { ({ chromium } = await import('playwright-core')); }
  catch {
    return { ...ready, status: 'NEEDS_DEPENDENCY', message: 'Install the playwright-core devDependency with --ignore-scripts. No browser package, download, or launch is required.' };
  }
  const { runBrowserRegression } = await import('../test/e2e/real-harness.mjs');
  return runBrowserRegression({ chromium, cdpURL: env.SALAH_CDP_URL, baseURL: ready.baseURL, hostThemeJSON: env.SALAH_HOST_THEME_CONTRACT, allowHostThemeChanges: env.SALAH_ALLOW_HOST_THEME_CHANGES === '1' });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let report;
  try { report = await main(); }
  catch (error) {
    // Do not print connection URLs, tokens, or browser/network payloads.
    report = { status: 'FAILED', browserTestsRun: false, message: `Browser runner failed (${error?.name || 'Error'}). No pass is inferred.` };
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`, () => {
    // A CDP transport can keep Node alive. Exiting this owned process disconnects
    // its transport; intentionally NEVER call browser.close()/context.close().
    process.exit(report.status === 'PASSED' ? 0 : report.status === 'NEEDS_BROWSER' ? 2 : 1);
  });
}
