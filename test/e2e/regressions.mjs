import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { exerciseHostThemes } from './host-theme.mjs';
import { MYQURAN_CITY } from './salah-api.mjs';

export const MANDATORY_CHECKS = Object.freeze([
  'device geolocation is never requested before an explicit user action',
  'permission denial is recoverable through manual city selection',
  'synthetic device location is transient and late GPS cannot override changed manual source settings',
  'setup review requires source, location/timezone, and calculation acknowledgement before confirmation',
  'SHA-256 browser acknowledgement survives reload only for matching saved settings',
  'fresh confirmation rejects a shared-settings A-to-B status race and resets acknowledgement',
  'seeded legacy MyQuran Singapore Hanafi preferences require review without automatic configuration',
  'MyQuran labels calculation choices as offline fallback and requires provider-aware review',
  'provider failure, offline fallback, and source changes never retain misleading provenance',
  'refresh-failed provenance remains latched while a successful retry is pending',
  'commercial geocoding without a Host key cannot search or silently switch providers',
  'widget exposes source/freshness and its real timer advances after review',
  'floating widget supports pointer drag, keyboard movement, keyboard hide, and reopening',
  'narrow viewport stays usable under both CSS color-scheme preferences',
  'schedule timezone and midnight rollover follow the owned-page clock rather than UTC date',
  'actual Host light/dark themes render correctly and original theme is restored',
]);

export function coverageStatus(checks, unverified) {
  if (!Array.isArray(checks) || !Array.isArray(unverified) || unverified.length) return 'INCOMPLETE';
  if (checks.length !== MANDATORY_CHECKS.length || checks.some((item, index) => item.name !== MANDATORY_CHECKS[index] || item.status !== 'PASSED')) return 'INCOMPLETE';
  return 'PASSED';
}

function expectedReviewHash(settings) {
  const location = settings.locationMode === 'manual' ? settings.location : null;
  const projection = {
    source: settings.source, method: settings.method, school: settings.school,
    locationMode: settings.locationMode, geocodingProvider: settings.geocodingProvider,
    location: location ? { label: location.label, latitude: location.latitude, longitude: location.longitude, timezone: location.timezone, myquranId: location.myquranId } : null,
  };
  return createHash('sha256').update(JSON.stringify(projection)).digest('hex');
}

export async function acknowledge(panel, { myquran = false } = {}) {
  const review = panel.getByRole('region', { name: 'Review your prayer-time setup', exact: true });
  await review.waitFor({ state: 'visible' });
  await review.getByRole('checkbox', { name: /I reviewed the prayer-time source/ }).check();
  await review.getByRole('checkbox', { name: /I reviewed the location and time zone/ }).check();
  await review.getByRole('checkbox', { name: myquran ? /I reviewed MyQuran’s timetable and the offline fallback settings/ : /I reviewed the calculation method and Asr convention/ }).check();
  await review.getByRole('button', { name: 'Confirm reviewed setup', exact: true }).click();
  await review.waitFor({ state: 'hidden' });
}

export async function runAdditionalChecks({ page, panel, fixture, check, eventually, report, clock, themeContract, allowHostThemeChanges = false, originalTheme, verifyRestored }) {
  const floating = page.getByTestId('salah-floating');
  const provenance = floating.getByTestId('salah-widget-provenance');
  const refresh = () => panel.getByRole('button', { name: 'Refresh', exact: true }).click();
  const waitProvenance = async (kind, freshness = 'fresh') => eventually(async () => {
    assert.equal(await provenance.getAttribute('data-source-kind'), kind);
    assert.equal(await provenance.getAttribute('data-freshness'), freshness);
  }, `Widget provenance becomes ${kind}/${freshness}`);

  const ownedHash = () => page.evaluate(() => localStorage.getItem('dsh.salah.review.v1'));
  await check('SHA-256 browser acknowledgement survives reload only for matching saved settings', async () => {
    assert.equal(await page.evaluate(() => typeof crypto.subtle?.digest), 'function', 'Actual authorized Harness origin must provide WebCrypto.');
    const hashA = await ownedHash();
    assert.match(hashA, /^[a-f0-9]{64}$/);
    assert.equal(hashA, expectedReviewHash(fixture.settings()), 'Actual browser stores SHA-256, not raw settings/GPS or an arbitrary marker.');
    await clock.reload();
    await eventually(async () => assert.equal(await floating.getAttribute('data-setup-reviewed'), 'true'), 'Matching SHA restores reviewed state after genuine Harness reload');
    await floating.getByRole('timer').waitFor({ state: 'visible' });
    assert.equal(await ownedHash(), hashA);
    await fixture.hostConfigure({ method: 'Singapore' });
    await clock.reload();
    await panel.getByRole('region', { name: 'Review your prayer-time setup', exact: true }).waitFor({ state: 'visible' });
    await eventually(async () => assert.equal(await panel.getByLabel('Calculation method', { exact: true }).inputValue(), 'Singapore'), 'Reload observes externally changed settings');
    assert.equal(await floating.getAttribute('data-setup-reviewed'), 'false');
    assert.equal(await floating.getByRole('timer').count(), 0, 'A hash of different saved settings never authorizes countdown.');
    await acknowledge(panel);
    const hashB = await ownedHash();
    assert.equal(hashB, expectedReviewHash(fixture.settings()));
    assert.notEqual(hashB, hashA);
    await clock.reload();
    await eventually(async () => assert.equal(await floating.getAttribute('data-setup-reviewed'), 'true'), 'New reviewed SHA round-trips independently');
  });

  await check('fresh confirmation rejects a shared-settings A-to-B status race and resets acknowledgement', async () => {
    await panel.getByRole('button', { name: 'Review setup again', exact: true }).click();
    const review = panel.getByRole('region', { name: 'Review your prayer-time setup', exact: true });
    await review.getByTestId('salah-review-source').check();
    await review.getByTestId('salah-review-location').check();
    await review.getByTestId('salah-review-method').check();
    const methodB = fixture.settings().method === 'Singapore' ? 'MuslimWorldLeague' : 'Singapore';
    const browserWrites = fixture.calls.filter(call => call.action === 'configure').length;
    let raced = false;
    fixture.beforeNext('status', async () => { await fixture.hostConfigure({ method: methodB }); raced = true; });
    await review.getByRole('button', { name: 'Confirm reviewed setup', exact: true }).click();
    await eventually(async () => {
      assert.equal(raced, true, 'Confirmation performs a fresh production-service status read.');
      assert.equal(await panel.getByLabel('Calculation method', { exact: true }).inputValue(), methodB);
      for (const choice of ['source', 'location', 'method']) assert.equal(await review.getByTestId(`salah-review-${choice}`).isChecked(), false, 'Changed snapshot resets every acknowledgement checkbox.');
      assert.equal(await review.getByRole('button', { name: 'Confirm reviewed setup', exact: true }).isDisabled(), true);
      assert.equal(await floating.getAttribute('data-setup-reviewed'), 'false');
    }, 'Fresh A-to-B confirmation race invalidates old acknowledgement');
    assert.equal(await ownedHash(), null, 'No stale A fingerprint may be persisted by confirmation.');
    assert.equal(await floating.getByRole('timer').count(), 0);
    assert.equal(fixture.calls.filter(call => call.action === 'configure').length, browserWrites, 'Client never rewrites shared choices to win a confirmation race.');
    await acknowledge(panel);
    assert.equal(await ownedHash(), expectedReviewHash(fixture.settings()));
  });

  await check('seeded legacy MyQuran Singapore Hanafi preferences require review without automatic configuration', async () => {
    const previous = fixture.settings(), writes = fixture.writes.length;
    await page.evaluate(() => localStorage.removeItem('dsh.salah.review.v1'));
    const legacy = { ...previous, source: 'myquran', method: 'Singapore', school: 'hanafi', location: MYQURAN_CITY };
    delete legacy.geocodingProvider; // Genuine pre-geocoding saved profile shape.
    await fixture.seed(legacy);
    const firstCall = fixture.calls.length;
    await clock.reload();
    await panel.getByRole('group', { name: 'Offline fallback settings', exact: true }).waitFor({ state: 'visible' });
    assert.equal(await panel.getByLabel('Prayer-time source', { exact: true }).inputValue(), 'myquran');
    assert.equal(await panel.getByLabel('Calculation method', { exact: true }).inputValue(), 'Singapore');
    assert.equal(await panel.getByLabel('Asr convention', { exact: true }).inputValue(), 'hanafi');
    await panel.getByRole('region', { name: 'Next prayer', exact: true }).waitFor({ state: 'visible' });
    assert.equal(fixture.calls.slice(firstCall).filter(call => call.action === 'configure').length, 0);
    assert.equal(fixture.writes.length, writes, 'Loading legacy choices must not auto-configure regional defaults.');
    assert.equal(await page.evaluate(() => window.__salahE2EGeolocationCalls), 0);
    assert.equal(await floating.getAttribute('data-setup-reviewed'), 'false');
    assert.equal(await floating.getByRole('timer').count(), 0);
    assert.match(await panel.getByTestId('salah-review').innerText(), /Singapore/);
    assert.match(await panel.getByTestId('salah-review').innerText(), /Hanafi/);
    await fixture.seed(previous); await clock.reload(); await acknowledge(panel);
  });

  await check('MyQuran labels calculation choices as offline fallback and requires provider-aware review', async () => {
    await panel.getByLabel('Prayer-time source', { exact: true }).selectOption('myquran');
    const fallbackSettings = panel.getByRole('group', { name: 'Offline fallback settings', exact: true });
    await fallbackSettings.waitFor({ state: 'visible' });
    assert.equal(await fallbackSettings.locator('legend').innerText(), 'Offline fallback settings');
    const providerTimetable = panel.getByText('Provider-controlled timetable', { exact: true });
    await providerTimetable.waitFor({ state: 'visible' });
    assert.match(await providerTimetable.getAttribute('title'), /MyQuran sets its own method and Asr convention/);
    const sourceDescription = await panel.getByLabel('Prayer-time source', { exact: true }).getAttribute('aria-description');
    assert.match(sourceDescription, /MyQuran sets its own method and Asr convention/);
    assert.match(sourceDescription, /only if it falls back to Adhan/);
    assert.equal(await panel.getByRole('button', { name: 'Use current location', exact: true }).count(), 0);
    assert.equal(await panel.getByText('Enter coordinates instead', { exact: true }).count(), 0);
    await eventually(async () => assert.equal(await floating.getAttribute('data-setup-reviewed'), 'false'), 'Source changes invalidate browser acknowledgement');
    assert.equal(await floating.getByRole('timer').count(), 0, 'No authoritative widget countdown before re-review');
    await panel.getByRole('alert').filter({ hasText: 'Select an Indonesian city from MyQuran search before loading prayer times.' }).waitFor({ state: 'visible' });
    assert.equal(Object.hasOwn(fixture.settings().location, 'myquranId'), false, 'Global geocoding must not invent MyQuran directory linkage.');
    const incompleteReview = panel.getByTestId('salah-review');
    for (const choice of ['source', 'location', 'method']) await incompleteReview.getByTestId(`salah-review-${choice}`).check();
    assert.equal(await incompleteReview.getByRole('button', { name: 'Confirm reviewed setup', exact: true }).isDisabled(), true, 'All acknowledgements still cannot confirm MyQuran without a directory city.');
    await panel.getByRole('textbox', { name: 'Search for a city', exact: true }).fill('Jakarta');
    await panel.getByRole('button', { name: 'Search', exact: true }).click();
    await panel.getByRole('button', { name: /^Jakarta, Indonesia/ }).click();
    await panel.getByRole('region', { name: 'Next prayer', exact: true }).waitFor({ state: 'visible' });
    assert.deepEqual(fixture.settings().location, MYQURAN_CITY);
    assert.equal(fixture.calls.filter(call => call.action === 'search').at(-1).source, 'myquran');
    await panel.getByLabel('Calculation method', { exact: true }).selectOption('Singapore');
    await panel.getByLabel('Asr convention', { exact: true }).selectOption('hanafi');
    const review = panel.getByRole('region', { name: 'Review your prayer-time setup', exact: true });
    await eventually(async () => {
      const text = await review.innerText();
      assert.match(text, /MyQuran/); assert.match(text, /Offline fallback settings/);
      assert.match(text, /Singapore/); assert.match(text, /Hanafi/);
      assert.match(await review.getByTestId('salah-review-method').locator('..').innerText(), /Offline fallback settings:\s*Singapore\s*·\s*Hanafi/);
    }, 'MyQuran review distinguishes provider timetable from fallback settings');
    await acknowledge(panel, { myquran: true });
    await waitProvenance('public');
    assert.match(await provenance.innerText(), /MyQuran/);
    await floating.getByRole('timer').waitFor({ state: 'visible' });
  });

  await check('provider failure, offline fallback, and source changes never retain misleading provenance', async () => {
    fixture.control.fallback = true;
    await refresh();
    await panel.getByRole('status').filter({ hasText: 'Using offline fallback' }).waitFor({ state: 'visible' });
    await waitProvenance('fallback');
    assert.match(await provenance.innerText(), /Adhan/);
    const fallback = panel.getByRole('status').filter({ hasText: 'Using offline fallback' });
    assert.match(await fallback.innerText(), /Singapore/);
    assert.match(await fallback.innerText(), /Hanafi/);
    fixture.control.failTimes = true;
    await refresh();
    await panel.getByRole('alert').filter({ hasText: 'Prayer times are unavailable.' }).waitFor({ state: 'visible' });
    await waitProvenance('fallback', 'refresh-failed');
    await panel.getByLabel('Prayer-time source', { exact: true }).selectOption('offline');
    await panel.getByRole('group', { name: 'Calculation settings', exact: true }).waitFor({ state: 'visible' });
    await panel.getByRole('alert').filter({ hasText: 'Prayer times are unavailable.' }).waitFor({ state: 'visible' });
    assert.equal(await panel.getByRole('region', { name: 'Next prayer', exact: true }).count(), 0, 'Failed new source must not display prior provider schedule');
    assert.equal(await panel.getByRole('status').filter({ hasText: 'Using offline fallback' }).count(), 0);
    assert.equal(await provenance.count(), 0, 'Failed source switch clears prior fallback provenance');
    fixture.control.failTimes = false; fixture.control.fallback = false;
    await refresh();
    await panel.getByRole('region', { name: 'Next prayer', exact: true }).waitFor({ state: 'visible' });
    await acknowledge(panel);
    await waitProvenance('intentional-offline');
    assert.match(await provenance.innerText(), /Intentional offline/);
    assert.doesNotMatch(await provenance.innerText(), /fallback/i);
    assert.equal(await panel.getByText('Provider-controlled timetable', { exact: true }).count(), 0);
    assert.equal(await panel.getByRole('alert').count(), 0);
  });

  await check('refresh-failed provenance remains latched while a successful retry is pending', async () => {
    fixture.control.failTimes = true;
    await refresh();
    await panel.getByRole('alert').filter({ hasText: 'Prayer times are unavailable.' }).waitFor({ state: 'visible' });
    await waitProvenance('intentional-offline', 'refresh-failed');
    fixture.control.failTimes = false;
    const gate = fixture.holdNext('times');
    try {
      await refresh();
      await eventually(async () => assert.equal(gate.isStarted, true), 'Successful retry reaches held actual-service request');
      await panel.getByRole('button', { name: 'Refreshing…', exact: true }).waitFor({ state: 'visible' });
      assert.equal(await provenance.getAttribute('data-freshness'), 'refresh-failed', 'Starting retry must not claim freshness before a valid response.');
      assert.match(await provenance.getAttribute('aria-label'), /Refresh failed/);
    } finally { gate.release(); }
    await waitProvenance('intentional-offline', 'fresh');
    assert.equal(await panel.getByRole('alert').count(), 0);
  });

  await check('commercial geocoding without a Host key cannot search or silently switch providers', async () => {
    fixture.control.failSearch = true;
    await panel.getByRole('textbox', { name: 'Search for a city', exact: true }).fill('Jakarta');
    await panel.getByRole('button', { name: 'Search', exact: true }).click();
    await panel.getByRole('alert').filter({ hasText: 'City search is unavailable.' }).waitFor({ state: 'visible' });
    const writes = fixture.writes.length;
    await panel.getByLabel('City-search provider', { exact: true }).selectOption('open-meteo-commercial');
    await panel.getByRole('alert').filter({ hasText: 'Commercial geocoding requires an active Open-Meteo subscription.' }).waitFor({ state: 'visible' });
    assert.equal(await panel.getByLabel('City-search provider', { exact: true }).inputValue(), 'open-meteo-public', 'Production service rejects missing-key configuration atomically.');
    assert.equal(fixture.settings().geocodingProvider, 'open-meteo-public');
    assert.equal(fixture.writes.length, writes);
    // Model a PREVIOUSLY valid commercial configuration whose synthetic Host key
    // is subsequently deleted. Never read environment or real credential stores.
    fixture.credentials.setConfigured(true);
    await panel.getByLabel('City-search provider', { exact: true }).selectOption('open-meteo-commercial');
    const help = panel.getByTestId('salah-help');
    const helpWasOpen = await help.getAttribute('open') !== null;
    if (!helpWasOpen) await help.locator('summary').click();
    await help.getByText('Host credential is configured; a paid commercial license is still required.', { exact: true }).waitFor({ state: 'visible' });
    if (!helpWasOpen) await help.locator('summary').click();
    fixture.credentials.setConfigured(false);
    await refresh();
    const missingKeyWarning = panel.getByRole('status').filter({ hasText: 'Add SALAH_OPEN_METEO_API_KEY on the Host, then refresh.' });
    await missingKeyWarning.waitFor({ state: 'visible' });
    assert.match(await missingKeyWarning.getAttribute('title'), /Commercial search is unavailable: configure SALAH_OPEN_METEO_API_KEY on the Host/);
    assert.match(await missingKeyWarning.getAttribute('title'), /No key is entered in this page/);
    if (!helpWasOpen) await help.locator('summary').click();
    await help.getByText(/^Commercial search is unavailable: configure SALAH_OPEN_METEO_API_KEY on the Host/).waitFor({ state: 'visible' });
    if (!helpWasOpen) await help.locator('summary').click();
    const searchCount = fixture.calls.filter(call => call.action === 'search').length;
    assert.equal(await panel.getByRole('button', { name: 'Search', exact: true }).isDisabled(), true);
    assert.equal(await panel.getByLabel('City-search provider', { exact: true }).inputValue(), 'open-meteo-commercial');
    assert.equal(fixture.settings().geocodingProvider, 'open-meteo-commercial');
    assert.equal(await panel.getByRole('alert').filter({ hasText: 'City search is unavailable.' }).count(), 0, 'Accepted provider change clears previous search failure');
    assert.equal(await panel.getByRole('textbox', { name: /API key|credential/i }).count(), 0, 'Keys must never be entered in the client');
    await panel.getByRole('textbox', { name: 'Search for a city', exact: true }).press('Enter');
    assert.equal(fixture.calls.filter(call => call.action === 'search').length, searchCount, 'Missing commercial key must not initiate public fallback search');
    fixture.control.failSearch = false;
    await panel.getByLabel('City-search provider', { exact: true }).selectOption('open-meteo-public');
    await missingKeyWarning.waitFor({ state: 'hidden' });
    await panel.getByRole('button', { name: 'Search', exact: true }).click();
    await panel.getByRole('button', { name: /^Jakarta, Indonesia/ }).waitFor({ state: 'visible' });
    assert.equal(fixture.settings().geocodingProvider, 'open-meteo-public');
    await acknowledge(panel);
    await waitProvenance('intentional-offline');
  });

  await check('widget exposes source/freshness and its real timer advances after review', async () => {
    await floating.getByRole('timer').waitFor({ state: 'visible' });
    const before = await floating.getByRole('timer').innerText();
    await eventually(async () => assert.notEqual(await floating.getByRole('timer').innerText(), before), 'Owned-page clock advances the actual rendered countdown', 4000);
    fixture.control.fetchedAtOffset = 31 * 60000;
    await refresh();
    await waitProvenance('intentional-offline', 'stale');
    assert.match(await provenance.getAttribute('aria-label'), /Needs refresh/);
    assert.match(await provenance.getAttribute('aria-label'), /Asia\/Jakarta/);
    fixture.control.fetchedAtOffset = 0;
    await refresh();
    await waitProvenance('intentional-offline', 'fresh');
    assert.match(await provenance.getAttribute('aria-label'), /Recently fetched/);
    await floating.getByText('Between prayers', { exact: true }).waitFor({ state: 'visible' });
    await floating.getByText('Next prayer · Dhuhr', { exact: true }).waitFor({ state: 'visible' });
  });

  await check('floating widget supports pointer drag, keyboard movement, keyboard hide, and reopening', async () => {
    const handle = floating.getByRole('button', { name: 'Move prayer widget', exact: true });
    const first = await floating.boundingBox(), grip = await handle.boundingBox();
    assert.ok(first && grip, 'Real floating widget and drag handle have rendered boxes.');
    await page.mouse.move(grip.x + 20, grip.y + grip.height / 2);
    await page.mouse.down();
    try { await page.mouse.move(grip.x + 140, grip.y + grip.height / 2 + 70, { steps: 8 }); }
    finally { await page.mouse.up(); }
    await eventually(async () => {
      const moved = await floating.boundingBox();
      assert.ok(Math.abs(moved.x - first.x - 120) <= 2 && Math.abs(moved.y - first.y - 70) <= 2, 'Pointer drag moves actual widget without synthetic DOM events.');
    }, 'Widget pointer drag');
    const dragged = await floating.boundingBox();
    await handle.focus();
    await handle.press('ArrowRight');
    await handle.press('Shift+ArrowDown');
    await eventually(async () => {
      const moved = await floating.boundingBox();
      assert.ok(Math.abs(moved.x - dragged.x - 10) <= 2 && Math.abs(moved.y - dragged.y - 40) <= 2);
    }, 'Widget keyboard movement uses arrow/shift steps');
    const hide = floating.getByRole('button', { name: 'Hide floating widget', exact: true });
    await hide.focus(); await hide.press('Enter');
    await floating.waitFor({ state: 'hidden' });
    const reopen = panel.getByRole('button', { name: 'Show floating widget', exact: true });
    await reopen.focus(); await reopen.press('Enter');
    await floating.waitFor({ state: 'visible' });
    await floating.getByRole('timer').waitFor({ state: 'visible' });
    assert.equal(await floating.getAttribute('data-setup-reviewed'), 'true', 'View controls do not invalidate saved setup acknowledgement.');
  });

  await check('narrow viewport stays usable under both CSS color-scheme preferences', async () => {
    try {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const colorScheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme });
        assert.equal(await page.evaluate(mode => matchMedia(`(prefers-color-scheme: ${mode})`).matches, colorScheme), true);
        await panel.waitFor({ state: 'visible' });
        const layout = await panel.evaluate(element => {
          const box = element.getBoundingClientRect(), style = getComputedStyle(element);
          return { width: box.width, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, background: style.backgroundColor, text: style.color };
        });
        assert.ok(layout.width > 0 && layout.width <= 390, 'Real panel fits narrow viewport.');
        assert.ok(layout.scrollWidth <= layout.clientWidth + 1, 'Plugin must not require horizontal scrolling.');
        assert.notEqual(layout.background, layout.text, 'Rendered text remains distinguishable from background.');
        await eventually(async () => {
          const box = await floating.boundingBox();
          assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 + 1 && box.y + box.height <= 844 + 1, 'Floating widget clamps within actual narrow viewport.');
        }, 'Narrow floating widget fits viewport');
        const search = panel.getByRole('textbox', { name: 'Search for a city', exact: true });
        await search.scrollIntoViewIfNeeded(); await search.focus();
        assert.equal(await search.evaluate(element => document.activeElement === element), true, 'Actual narrow form remains keyboard reachable.');
      }
    } finally {
      await page.emulateMedia({ colorScheme: null });
      await page.setViewportSize({ width: 1280, height: 900 });
    }
    // This check exercises media preferences only. Actual Host light/dark
    // settings are a distinct mandatory check below, never inferred from this.
  });

  await check('schedule timezone and midnight rollover follow the owned-page clock rather than UTC date', async () => {
    // Native timers stay real. Only this owned tab's Date and controlled Salah
    // response dates move; existing authorized tabs/context clock never change.
    await clock.set(Date.parse('2026-11-06T16:58:00Z'));
    await refresh();
    const next = panel.getByRole('region', { name: 'Next prayer', exact: true });
    await eventually(async () => assert.match(await next.innerText(), /Tomorrow/), 'Before Jakarta midnight next Fajr is tomorrow');
    await clock.set(Date.parse('2026-11-06T16:59:58Z'));
    await eventually(async () => assert.match(await next.innerText(), /Tomorrow/), 'Local day remains November 6 immediately before midnight');
    const before = fixture.calls.filter(call => call.action === 'times').length;
    await clock.set(Date.parse('2026-11-06T17:00:02Z'));
    const today = panel.getByRole('region', { name: 'Today', exact: true });
    await eventually(async () => {
      assert.ok(fixture.calls.filter(call => call.action === 'times').length > before, 'Actual plugin automatically requests a new schedule after local midnight.');
      assert.match(await today.innerText(), /November 7, 2026/);
      assert.equal(await today.locator('time').first().getAttribute('datetime'), '2026-11-06T21:30:00.000Z');
    }, 'Automatic Jakarta midnight rollover refreshes actual rendered schedule');
    assert.equal(await page.evaluate(() => new Date().toISOString().slice(0, 10)), '2026-11-06', 'UTC civil day intentionally differs from displayed schedule civil day.');
    assert.match(await next.innerText(), /Asia\/Jakarta/);
    assert.match(await today.innerText(), /04:30/);
    assert.doesNotMatch(await next.innerText(), /Tomorrow/, 'New local day Fajr is no longer tomorrow.');
  });

  if (!allowHostThemeChanges || !themeContract) {
    report.unverified.push(!allowHostThemeChanges ? 'NEEDS_HOST_THEME_PERMISSION: explicit user authorization and SALAH_ALLOW_HOST_THEME_CHANGES=1 are required before temporary shared Host theme changes.' : 'NEEDS_HOST_THEME_CONTRACT: provide SALAH_HOST_THEME_CONTRACT describing observed actual Host theme controls, idempotent recovery, and real DOM/CSS state. CSS media-preference checks are not actual Host-theme verification.');
    report.checks.push({ name: 'actual Host light/dark themes render correctly and original theme is restored', status: 'UNVERIFIED' });
  } else {
    await check('actual Host light/dark themes render correctly and original theme is restored', () => exerciseHostThemes({ page, panel, fixture, contract: themeContract, eventually, authorized: allowHostThemeChanges, originalTheme, verifyRestored }));
  }
}
