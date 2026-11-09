import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { CITY, MYQURAN_CITY, SYNTHETIC_GPS, createSalahFixture } from './salah-api.mjs';
import { MANDATORY_CHECKS, coverageStatus, runAdditionalChecks } from './regressions.mjs';
import { parseHostThemeContract, observeThemeRpc, createHostThemeAdapter, readHostThemeState, verifyFreshHostThemeRestoration, inThemePhase } from './host-theme.mjs';

const INITIAL_TIME = Date.parse('2026-11-06T04:00:00Z');

// No launch, newContext, setContent, React injection, profile/cookie access, or
// browser/context.close. Every UI interaction below targets the installed page.
export async function eventually(check, message, timeout = 10000) {
  const end = Date.now() + timeout;
  let last;
  do {
    try { await check(); return; } catch (error) { last = error; }
    await delay(50);
  } while (Date.now() < end);
  throw new Error(`${message}: ${last?.message || 'timed out'}`, { cause: last });
}

export async function runBrowserRegression({ chromium, cdpURL, baseURL, hostThemeJSON, allowHostThemeChanges = false }) {
  const report = {
    status: 'FAILED', baseURL, browserTestsRun: false,
    scope: 'Actual installed Salah client inside actual Harness; ONLY /api/salah uses memory fixtures, not full Host/network E2E.',
    checks: [], unverified: [],
  };
  let page, fixture, routeMatch, initialThemeRead;
  const ownedPages = new Set();
  const pageErrors = [];
  const onPageError = error => { pageErrors.push(error.name || 'Error'); };
  async function closeOwnedPage(target) {
    assert.ok(ownedPages.has(target), 'Only this runner’s owned tabs may be closed.');
    target.off('pageerror', onPageError);
    if (!target.isClosed()) await Promise.race([target.close({ runBeforeUnload: false }), delay(5000).then(() => { throw new Error('Owned tab cleanup timed out.'); })]);
    ownedPages.delete(target);
  }
  let step = 'connect to explicitly supplied authorized browser';
  async function check(name, fn) {
    step = name;
    await fn();
    report.checks.push({ name, status: 'PASSED' });
  }
  try {
    step = 'validate observed actual Host theme adapter';
    const themeContract = allowHostThemeChanges ? parseHostThemeContract(hostThemeJSON) : null;
    report.hostThemeChangesAuthorized = allowHostThemeChanges;
    if (themeContract) report.hostThemeDiagnostics = { phase: 'initial.authority', failures: [], rpcs: [] };
    step = 'connect to explicitly supplied authorized browser';
    const browser = await chromium.connectOverCDP(cdpURL, { timeout: 10000 });
    const origin = new URL(baseURL).origin;
    const context = browser.contexts().find(candidate => candidate.pages().some(existing => {
      try { return new URL(existing.url()).origin === origin; } catch { return false; }
    }));
    assert.ok(context, 'NEEDS_BROWSER: supplied browser must already have an authorized Harness tab at the exact SALAH_BASE_URL origin.');
    assert.ok(!context.serviceWorkers().some(worker => new URL(worker.url()).origin === origin), 'NEEDS_BROWSER: an existing same-origin service worker could bypass owned page routing. Use an authorized context without that worker; runner will not unregister user workers.');
    page = await context.newPage(); ownedPages.add(page);
    page.setDefaultTimeout(10000);
    page.on('pageerror', onPageError);
    let clockOffset = INITIAL_TIME - Date.now();
    fixture = createSalahFixture({ now: () => Date.now() + clockOffset });
    const clock = {
      async set(time) {
        assert.ok(Number.isFinite(time), 'Owned page clock accepts a finite timestamp.');
        clockOffset = time - Date.now();
        await page.evaluate(value => window.__salahE2EClock.set(value), time);
      },
      async reload() {
        const before = await page.evaluate(() => Date.now());
        await page.reload({ waitUntil: 'domcontentloaded' });
        const after = await page.evaluate(() => Date.now());
        assert.ok(after >= before, 'Owned-page clock must never jump backwards on reload.');
        assert.ok(Math.abs(after - (Date.now() + clockOffset)) < 5000, 'Reloaded browser and synthetic service clocks remain synchronized.');
        assert.equal(new URL(page.url()).origin, origin, 'Reload remains inside actual Harness origin.');
        assert.equal(await page.evaluate(() => Boolean(window.__DSH_BOOT__ && window.__ModuleLoader__)), true);
        const open = page.getByRole('button', { name: 'Open Salah prayer times', exact: true });
        await open.waitFor({ state: 'visible' }); await open.click();
        await page.getByRole('region', { name: 'Prayer times', exact: true }).waitFor({ state: 'visible' });
      },
    };
    routeMatch = url => url.origin === origin && url.pathname === '/api/salah';
    await page.route(routeMatch, fixture.route);
    function ownedBrowserFixtures({ initialOffset, syntheticGps }) {
      // Explicitly approved owned-PAGE browser Date fixture. Native timers and
      // the existing context/other tabs are untouched; no DOM is emulated.
      const NativeDate = Date;
      const clockKey = '__salah_e2e_owned_clock_offset_v1__', clockStorage = window.sessionStorage;
      const savedOffset = clockStorage.getItem(clockKey);
      let offset = savedOffset === null ? initialOffset : Number(savedOffset);
      if (!Number.isFinite(offset)) throw new TypeError('Invalid owned clock offset.');
      if (savedOffset === null) clockStorage.setItem(clockKey, String(offset));
      const currentTime = () => NativeDate.now() + offset;
      window.Date = new Proxy(NativeDate, {
        apply() { return new NativeDate(currentTime()).toString(); },
        construct(target, args, newTarget) { return Reflect.construct(target, args.length ? args : [currentTime()], newTarget); },
        get(target, key, receiver) { return key === 'now' ? currentTime : Reflect.get(target, key, receiver); },
      });
      Object.defineProperty(window, '__salahE2EClock', { value: Object.freeze({
        set(value) { if (!Number.isFinite(value)) throw new TypeError('Finite test time required.'); offset = value - NativeDate.now(); clockStorage.setItem(clockKey, String(offset)); },
      }) });
      // Browser API fixtures only; no shell/plugin/DOM is fabricated. Denial must
      // take the real plugin's permission-error path without prompting the user.
      let geolocationCalls = 0, geolocationMode = 'denied';
      const pendingGps = [], syntheticPosition = { coords: { ...syntheticGps, accuracy: 25 } };
      Object.defineProperty(window, '__salahE2EGeolocationCalls', { get: () => geolocationCalls });
      Object.defineProperty(window, '__salahE2EGeolocation', { value: Object.freeze({
        setMode(value) { if (!['denied', 'success', 'held'].includes(value)) throw new TypeError('Unknown owned GPS fixture mode.'); geolocationMode = value; },
        get pending() { return pendingGps.length; },
        releaseHeld() { for (const success of pendingGps.splice(0)) queueMicrotask(() => success(syntheticPosition)); },
      }) });
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
        getCurrentPosition(success, failure) {
          geolocationCalls++;
          if (geolocationMode === 'held') pendingGps.push(success);
          else if (geolocationMode === 'success') queueMicrotask(() => success(syntheticPosition));
          else queueMicrotask(() => failure({ code: 1, message: 'Browser regression permission denied' }));
        },
      } });
      // ONLY these two exact localStorage keys redirect into the fresh OWNED
      // tab's sessionStorage. Reloads retain hashes; existing tabs and actual
      // profile localStorage values are never read, copied, or written.
      const own = new Set(['dsh.salah.floating.v1', 'dsh.salah.review.v1']);
      const storage = window.localStorage, owned = window.sessionStorage;
      const get = Storage.prototype.getItem, set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
      if (get.call(owned, 'dsh.salah.floating.v1') === null) set.call(owned, 'dsh.salah.floating.v1', JSON.stringify({ visible: true, position: { x: 50, y: 88 } }));
      Storage.prototype.getItem = function(name) { return this === storage && own.has(String(name)) ? get.call(owned, name) : get.call(this, name); };
      Storage.prototype.setItem = function(name, value) { if (this === storage && own.has(String(name))) set.call(owned, name, value); else set.call(this, name, value); };
      Storage.prototype.removeItem = function(name) { if (this === storage && own.has(String(name))) remove.call(owned, name); else remove.call(this, name); };
    }
    await page.addInitScript(ownedBrowserFixtures, { initialOffset: clockOffset, syntheticGps: SYNTHETIC_GPS });
    await page.setViewportSize({ width: 1280, height: 900 });
    // Never use Playwright page.clock: it mutates the entire existing context.
    report.clock = 'Owned-page Date browser API fixture, with native real timers; no context-wide clock modification.';
    initialThemeRead = themeContract ? observeThemeRpc(page, origin, 'read') : null; // BEFORE navigation/default UI.
    step = 'load actual Harness and installed Salah';
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    assert.equal(new URL(page.url()).origin, origin, 'Owned test tab must remain at real Harness origin.');
    assert.equal(await page.evaluate(() => Boolean(window.__DSH_BOOT__ && window.__ModuleLoader__)), true, 'Actual Harness boot and module loader must exist; no standalone app is accepted.');
    const open = page.getByRole('button', { name: 'Open Salah prayer times', exact: true });
    await open.waitFor({ state: 'visible' });
    await open.click();
    const panel = page.getByRole('region', { name: 'Prayer times', exact: true });
    await panel.waitFor({ state: 'visible' });
    let originalTheme;
    if (initialThemeRead) {
      await inThemePhase(report.hostThemeDiagnostics, 'initial.authority', async () => {
        const durable = await initialThemeRead.wait();
        let state;
        await eventually(async () => { state = await readHostThemeState(page, themeContract); assert.equal(state.indicator, durable.preference); }, 'Initial theme UI settles to authoritative Host value');
        originalTheme = { setting: durable.preference, revision: durable.revision, state, diagnostics: report.hostThemeDiagnostics };
        report.initialHostTheme = { source: durable.preference, revision: durable.revision, state };
      });
    }
    report.browserTestsRun = true;
    await check('device geolocation is never requested before an explicit user action', async () => {
      await eventually(async () => assert.equal(await panel.getByRole('button', { name: 'Use current location', exact: true }).isEnabled(), true), 'Initial actual plugin boot completed');
      assert.ok(fixture.calls.some(call => call.action === 'times'), 'Boot loads service metadata/times without GPS.');
      assert.equal(await page.evaluate(() => window.__salahE2EGeolocationCalls), 0);
      assert.equal(fixture.calls.filter(call => call.action === 'configure').length, 0, 'Boot does not change saved preferences.');
      assert.ok(fixture.calls.filter(call => call.action === 'times').every(call => !Object.hasOwn(call, 'location')), 'No inferred device coordinates are sent.');
    });
    await check('permission denial is recoverable through manual city selection', async () => {
      // Current UI requests GPS only after an explicit user action, never boot.
      await panel.getByRole('button', { name: 'Use current location', exact: true }).click();
      await panel.getByRole('status').filter({ hasText: 'Location access was denied.' }).waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => window.__salahE2EGeolocationCalls), 1, 'Only explicit browser button requested permission.');
      await panel.getByRole('textbox', { name: 'Search for a city', exact: true }).fill('Jakarta');
      await panel.getByRole('button', { name: 'Search', exact: true }).click();
      await panel.getByRole('button', { name: /^Jakarta, Indonesia/ }).click();
      await panel.getByRole('region', { name: 'Next prayer', exact: true }).waitFor({ state: 'visible' });
      assert.equal(fixture.settings().locationMode, 'manual');
      assert.deepEqual(fixture.settings().location, CITY);
      assert.ok(fixture.calls.some(call => call.action === 'search' && call.query === 'Jakarta' && call.source === 'aladhan'));
      assert.equal(await panel.getByRole('status').filter({ hasText: 'Location access was denied.' }).count(), 0);
    });
    await check('synthetic device location is transient and late GPS cannot override changed manual source settings', async () => {
      const previous = fixture.settings(), first = fixture.calls.length;
      await page.evaluate(() => window.__salahE2EGeolocation.setMode('success'));
      await panel.getByRole('button', { name: 'Use current location', exact: true }).click();
      await eventually(async () => assert.ok(fixture.calls.slice(first).some(call => call.action === 'times' && call.location?.latitude === SYNTHETIC_GPS.latitude && call.location?.longitude === SYNTHETIC_GPS.longitude)), 'Explicit synthetic GPS reaches times as transient location');
      await panel.getByRole('region', { name: 'Next prayer', exact: true }).waitFor({ state: 'visible' });
      assert.equal(fixture.settings().locationMode, 'current'); assert.equal(fixture.settings().location, null);
      assert.ok(fixture.calls.slice(first).filter(call => call.action === 'configure').every(call => call.patch.location === null), 'Coordinates are never sent in configure patches.');
      const stored = await page.evaluate(() => [localStorage.getItem('dsh.salah.floating.v1'), localStorage.getItem('dsh.salah.review.v1')]);
      assert.doesNotMatch(JSON.stringify(stored), /1\.3521|103\.8198/, 'Only exact owned Salah keys are inspected; none persist synthetic device coordinates.');
      await page.evaluate(() => window.__salahE2EGeolocation.setMode('held'));
      await panel.getByRole('button', { name: 'Use current location', exact: true }).click();
      await eventually(async () => assert.equal(await page.evaluate(() => window.__salahE2EGeolocation.pending), 1), 'Second explicit device request is held');
      await fixture.hostConfigure({ source: 'myquran', locationMode: 'manual', location: MYQURAN_CITY });
      const late = fixture.calls.length;
      await page.evaluate(() => window.__salahE2EGeolocation.releaseHeld());
      await eventually(async () => {
        assert.equal(await panel.getByLabel('Prayer-time source', { exact: true }).inputValue(), 'myquran');
        assert.ok(fixture.calls.slice(late).some(call => call.action === 'times'));
      }, 'Late GPS refresh observes newly shared manual/MyQuran settings first');
      assert.ok(fixture.calls.slice(late).filter(call => call.action === 'times').every(call => !Object.hasOwn(call, 'location')), 'Late acquired coordinates are not sent after source/manual mode changed.');
      assert.equal(fixture.settings().locationMode, 'manual'); assert.deepEqual(fixture.settings().location, MYQURAN_CITY);
      assert.equal(await page.evaluate(() => window.__salahE2EGeolocationCalls), 3, 'No automatic extra permission requests on source change.');
      await fixture.hostConfigure(previous);
      await panel.getByRole('button', { name: 'Refresh', exact: true }).click();
      await eventually(async () => assert.equal(await panel.getByLabel('Prayer-time source', { exact: true }).inputValue(), previous.source), 'Restore fixture manual settings for subsequent acceptance cases');
      await panel.getByRole('region', { name: 'Next prayer', exact: true }).waitFor({ state: 'visible' });
      await page.evaluate(() => window.__salahE2EGeolocation.setMode('denied'));
    });
    await check('setup review requires source, location/timezone, and calculation acknowledgement before confirmation', async () => {
      const review = panel.getByRole('region', { name: 'Review your prayer-time setup', exact: true });
      await review.waitFor({ state: 'visible' });
      const confirm = review.getByRole('button', { name: 'Confirm reviewed setup', exact: true });
      assert.equal(await confirm.isDisabled(), true);
      assert.equal(await page.getByTestId('salah-floating').getAttribute('data-setup-reviewed'), 'false');
      assert.equal(await page.getByTestId('salah-floating').getByRole('timer').count(), 0, 'Legacy/manual preferences are preview-only until reviewed.');
      assert.match(await review.innerText(), /AlAdhan/);
      assert.match(await review.innerText(), /Jakarta, Indonesia/);
      assert.match(await review.innerText(), /Asia\/Jakarta/);
      assert.match(await review.innerText(), /Muslim World League/);
      assert.match(await review.innerText(), /Standard/);
      await review.getByRole('checkbox', { name: /I reviewed the prayer-time source/ }).check();
      await review.getByRole('checkbox', { name: /I reviewed the location and time zone/ }).check();
      assert.equal(await confirm.isDisabled(), true, 'method acknowledgement is mandatory');
      await review.getByRole('checkbox', { name: /I reviewed the calculation method and Asr convention/ }).check();
      await eventually(async () => assert.equal(await confirm.isEnabled(), true), 'Reviewed setup can be confirmed');
      const writes = fixture.calls.filter(call => call.action === 'configure').length;
      await confirm.click();
      await review.waitFor({ state: 'hidden' });
      assert.equal(fixture.calls.filter(call => call.action === 'configure').length, writes, 'browser acknowledgement must not mutate Host preferences');
      await panel.getByRole('button', { name: 'Review setup again', exact: true }).waitFor({ state: 'visible' });
      await page.getByTestId('salah-floating').getByRole('timer').waitFor({ state: 'visible' });
      assert.equal(await page.getByTestId('salah-floating').getAttribute('data-setup-reviewed'), 'true');
    });
    const verifyRestored = async expected => {
      report.hostThemeRestoration = { originalSource: expected.setting, acknowledgedWrites: expected.acknowledgements, freshVerified: false };
      await closeOwnedPage(page); // Verify AFTER the optimistic old tab is gone.
      await verifyFreshHostThemeRestoration({
        eventually, evidence: report.hostThemeRestoration,
        async openReader() {
          const fresh = await context.newPage(); ownedPages.add(fresh);
          return {
            page: fresh,
            adapter: createHostThemeAdapter({ page: fresh, contract: themeContract, eventually, diagnostics: report.hostThemeDiagnostics }),
            async prepare() {
              fresh.setDefaultTimeout(10000); fresh.on('pageerror', onPageError);
              await fresh.route(routeMatch, fixture.route);
              await fresh.addInitScript(ownedBrowserFixtures, { initialOffset: clockOffset, syntheticGps: SYNTHETIC_GPS });
              await fresh.setViewportSize({ width: 1280, height: 900 });
            },
            observeAuthority: () => observeThemeRpc(fresh, origin, 'read'),
            async load() {
              await fresh.goto(baseURL, { waitUntil: 'domcontentloaded' });
              assert.equal(new URL(fresh.url()).origin, origin);
            },
            waitReady: () => fresh.getByTestId('salah-floating').waitFor({ state: 'visible' }),
          };
        },
        closeReader: reader => closeOwnedPage(reader.page),
      }, expected);
    };
    await runAdditionalChecks({ page, panel, fixture, check, eventually, report, clock, themeContract, allowHostThemeChanges, originalTheme, verifyRestored });
    assert.deepEqual(report.checks.map(item => item.name), MANDATORY_CHECKS, 'Every mandatory regression must execute; no removed/missing case can yield PASSED.');
    assert.deepEqual(fixture.violations, [], 'Every Salah request must match the controlled fixture contract.');
    assert.deepEqual(pageErrors, [], 'Actual Harness/plugin must not raise uncaught page errors.');
    report.status = coverageStatus(report.checks, report.unverified);
    report.message = report.status === 'PASSED' ? 'All mandatory actual-Harness UI checks passed with controlled Salah API responses; not full Host/network E2E.' : 'Mandatory browser coverage remains unverified; this run fails and does not claim a full-suite pass.';
  } catch (error) {
    const needsBrowser = step === 'connect to explicitly supplied authorized browser' || error.message?.includes('NEEDS_BROWSER');
    report.status = needsBrowser ? 'NEEDS_BROWSER' : 'FAILED';
    // Fixed own test diagnostics only; avoid leaking URL/token/provider payloads.
    report.message = needsBrowser ? 'NEEDS_BROWSER: the explicitly supplied CDP endpoint could not connect to an already-open authorized browser/context. Ask the user for the correct endpoint; never scan ports or launch a browser.' : `${step} failed. ${error.name || 'Error'}; no pass is inferred.`;
    if (error.message?.startsWith('NEEDS_')) report.message = error.message;
    report.checks.push({ name: step, status: 'FAILED' });
  } finally {
    initialThemeRead?.cancel();
    fixture?.releasePending();
    // Keep each owned API route until its page is gone; never unroute into the
    // real Host during an in-flight refresh. Includes independent fresh readers.
    for (const target of [...ownedPages]) {
      try { await closeOwnedPage(target); }
      catch { report.status = 'FAILED'; report.message = 'Owned test tab cleanup failed; no pass is inferred.'; }
    }
    try { await fixture?.close(); }
    catch { report.status = 'FAILED'; report.message = 'Synthetic Salah service cleanup failed; no pass is inferred.'; }
    // Closing only our page also removes only its routes and init scripts.
    // Existing tabs, browser/context, workers, cookies, and profile stay untouched.
  }
  return report;
}
