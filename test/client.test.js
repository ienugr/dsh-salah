/* Pure client logic only: no DOM, React emulation, or mock visual renderer. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');
const first = source.indexOf('    function getNext(');
const last = source.indexOf('\n    return {\n      inject:', first);
assert.ok(first > 0 && last > first, 'pure client helper block is available');
const functions = source.slice(first, last);
const { getNext, getCurrent, clampFloating, civilDate, countdown, compactCountdown, validSchedule, reviewSettings, reviewFingerprint, widgetStatus, dockState, clientMetadata, reconcileReview, canConfirmReview } = vm.runInNewContext(`const PRAYERS = ['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'];\n${functions}\n({getNext,getCurrent,clampFloating,civilDate,countdown,compactCountdown,validSchedule,reviewSettings,reviewFingerprint,widgetStatus,dockState,clientMetadata,reconcileReview,canConfirmReview})`, { crypto: (await import('node:crypto')).webcrypto, TextEncoder });
const dictionaries = vm.runInNewContext(`${source.slice(source.indexOf('    const EN = {'), source.indexOf('    const PRAYERS ='))}\n({ en: EN, id: ID })`);
test('English and Indonesian expose the same complete UI and package locale vocabulary', async () => {
  assert.deepEqual(Object.keys(dictionaries.en).sort(), Object.keys(dictionaries.id).sort());
  for (const dictionary of Object.values(dictionaries)) for (const value of Object.values(dictionary)) assert.equal(typeof value === 'string' && value.trim().length > 0, true);
  const resources = await Promise.all(['en', 'id'].map(async locale => JSON.parse(await readFile(new URL(`../locale/${locale}.json`, import.meta.url), 'utf8'))));
  assert.deepEqual(Object.keys(resources[0].meta).sort(), Object.keys(resources[1].meta).sort());
});
const names = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const day = (date, offset) => ({ date, prayers: names.map((name, index) => ({ name, time: offset + index * 3600000 })) });
const schedule = { timezone: 'Asia/Jakarta', days: [day('2026-11-05', 1000000), day('2026-11-06', 87400000)] };

test('review fingerprints bind saved choices without retaining transient GPS or unrelated metadata', async () => {
  const saved = { source: 'myquran', method: 'Singapore', school: 'standard', locationMode: 'manual', geocodingProvider: 'open-meteo-public', location: { label: 'Tangerang', latitude: -6.18, longitude: 106.63, timezone: 'Asia/Jakarta', myquranId: '1501' } };
  const fingerprint = await reviewFingerprint(saved);
  assert.match(fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(await reviewFingerprint({ ...saved, extra: 'ignored', location: { ...saved.location, transient: 'ignored' } }), fingerprint);
  for (const patch of [{ source: 'offline' }, { method: 'Karachi' }, { school: 'hanafi' }, { geocodingProvider: 'open-meteo-commercial' }, { location: { ...saved.location, timezone: 'Asia/Makassar' } }]) assert.notEqual(await reviewFingerprint({ ...saved, ...patch }), fingerprint);
  const current = { ...saved, locationMode: 'current', location: { latitude: 12.34, longitude: 56.78 } };
  assert.equal(reviewSettings(current).location, null);
  assert.equal(await reviewFingerprint(current), await reviewFingerprint({ ...current, location: { latitude: 90, longitude: 180 } }));
  assert.equal(saved.method, 'Singapore', 'review does not select or change a method');
});

test('compact provenance distinguishes online, intentional offline and fallback, and never calls exhausted data current', () => {
  const now = Date.parse('2026-11-05T00:00:00Z');
  const value = { actualSource: 'myquran', timezone: 'Asia/Jakarta', fetchedAt: now - 1000, days: [day('2026-11-05', now + 10000), day('2026-11-06', now + 86400000)] };
  assert.equal(widgetStatus(value, now).sourceKind, 'public');
  assert.equal(widgetStatus(value, now).freshness, 'fresh');
  assert.equal(widgetStatus({ ...value, actualSource: 'offline' }, now).sourceKind, 'intentional-offline');
  assert.equal(widgetStatus({ ...value, actualSource: 'offline', fallbackReason: 'unavailable' }, now).sourceKind, 'fallback');
  assert.equal(widgetStatus(value, now, true).freshness, 'refresh-failed');
  assert.equal(widgetStatus({ ...value, fetchedAt: now - 1800001 }, now).freshness, 'stale');
  assert.equal(widgetStatus({ ...value, fetchedAt: undefined }, now).freshness, 'unknown');
  assert.equal(widgetStatus(value, now + 3 * 86400000).freshness, 'exhausted');
  assert.equal(widgetStatus(value, now + 3 * 86400000, true).freshness, 'exhausted');
  assert.equal(widgetStatus(null, now).freshness, 'missing');
});

test('dock state keeps review and failure gates while exposing compact stale and fallback warnings', () => {
  const now = Date.parse('2026-11-05T00:00:00Z');
  const value = { actualSource: 'myquran', timezone: 'Asia/Jakarta', fetchedAt: now, days: [day('2026-11-05', now + 10000), day('2026-11-06', now + 86400000)] };
  const model = { settings: {}, schedule: value, now, reviewed: true, busy: false, locating: false, error: '', geoError: '', refreshFailed: false };
  const ready = dockState(model);
  assert.equal(ready.kind, 'countdown');
  assert.equal(ready.next.time, getNext(value, now).time);
  assert.equal(ready.warnings.length, 0);
  const review = dockState({ ...model, reviewed: false });
  assert.equal(review.kind, 'review');
  assert.equal(review.next, null);
  assert.equal(dockState({ ...model, reviewed: false, settings: null, busy: true }).kind, 'loading');
  assert.equal(dockState({ ...model, error: 'failed' }).kind, 'error');
  assert.equal(dockState({ ...model, reviewed: false, error: 'failed' }).kind, 'error', 'first-run failures remain visible without unlocking countdown');
  assert.equal(dockState({ ...model, error: 'failed' }).next, null);
  assert.equal(dockState({ ...model, locating: true }).kind, 'locating');
  const fallback = dockState({ ...model, refreshFailed: true, schedule: { ...value, actualSource: 'offline', fallbackReason: 'unavailable' } });
  assert.deepEqual(Array.from(fallback.warnings), ['stale', 'fallback']);
  assert.equal(fallback.kind, 'countdown', 'retained preview countdown is explicitly marked stale');
  assert.equal(dockState({ ...model, now: now + 3 * 86400000 }).kind, 'exhausted');
  assert.equal(dockState({ ...model, schedule: null }).kind, 'location');
});

const geocoding = { providers: [{ id: 'open-meteo-public', label: 'Public', description: 'Non-commercial', requiresKey: false }, { id: 'open-meteo-commercial', label: 'Commercial', description: 'Paid license', requiresKey: true }], provider: 'open-meteo-public', keyConfigured: false, credentialRef: 'SALAH_OPEN_METEO_API_KEY' };
test('client metadata preserves validated geocoding choices and credential availability without accepting raw keys', () => {
  const value = { settings: { source: 'myquran', geocodingProvider: 'open-meteo-public' }, sources: [], methods: [], geocoding };
  const metadata = clientMetadata(value);
  assert.equal(metadata.geocoding.provider, 'open-meteo-public');
  assert.equal(metadata.geocoding.keyConfigured, false);
  const changed = clientMetadata({ ...value, geocoding: { ...geocoding, keyConfigured: true } });
  assert.notEqual(JSON.stringify(metadata), JSON.stringify(changed));
  assert.throws(() => clientMetadata({ ...value, geocoding: { ...geocoding, keyConfigured: 'yes' } }));
  assert.throws(() => clientMetadata({ ...value, geocoding: { ...geocoding, provider: 'surprise' } }));
  assert.throws(() => clientMetadata({ ...value, geocoding: { ...geocoding, credentialRef: 'raw-secret' } }));
  assert.equal(clientMetadata({ ...value, geocoding: { ...geocoding, apiKey: 'never-return-this' } }).geocoding.apiKey, undefined);
});

test('review state requires an initial explicit review, preserves unchanged choices and invalidates observed remote changes', () => {
  const settings = { source: 'myquran', method: 'Singapore', school: 'standard', locationMode: 'manual', location: { label: 'Tangerang', latitude: -6.18, longitude: 106.63, timezone: 'Asia/Jakarta', myquranId: '1501' }, geocodingProvider: 'open-meteo-public' };
  const first = reconcileReview({ reviewIdentity: null, reviewed: false, reviewOpen: true }, settings);
  assert.equal(first.reviewed, false);
  assert.equal(first.reviewOpen, true);
  const confirmed = { ...first, reviewed: true, reviewOpen: false };
  assert.equal(reconcileReview(confirmed, { ...settings }), confirmed);
  for (const patch of [{ source: 'offline' }, { method: 'Karachi' }, { school: 'hanafi' }, { geocodingProvider: 'open-meteo-commercial' }, { locationMode: 'current' }, { location: { ...settings.location, label: 'Other city' } }]) {
    const changed = reconcileReview(confirmed, { ...settings, ...patch });
    assert.equal(changed.reviewed, false);
    assert.equal(changed.reviewOpen, true);
  }
  assert.equal(settings.location.label, 'Tangerang');
});

test('review confirmation requires all three explicit checks, a location and supported unchanged settings', () => {
  const model = { settings: { source: 'myquran', method: 'Singapore', school: 'standard' }, sources: [{ id: 'myquran' }], methods: [{ id: 'Singapore' }], busy: false, locating: false };
  const checked = { source: true, location: true, method: true };
  assert.equal(canConfirmReview(model, checked, true), true);
  for (const name of ['source', 'location', 'method']) assert.equal(canConfirmReview(model, { ...checked, [name]: false }, true), false);
  assert.equal(canConfirmReview(model, checked, false), false);
  assert.equal(canConfirmReview({ ...model, busy: true }, checked, true), false);
  assert.equal(canConfirmReview({ ...model, locating: true }, checked, true), false);
  assert.equal(canConfirmReview({ ...model, methods: [] }, checked, true), false);
  assert.equal(canConfirmReview({ ...model, settings: { ...model.settings, school: 'unknown' } }, checked, true), false);
});

test('client chooses an obligatory prayer and excludes Sunrise', () => {
  const firstFajr = schedule.days[0].prayers[0].time;
  assert.equal(getNext(schedule, firstFajr - 1).name, 'Fajr');
  assert.equal(getNext(schedule, firstFajr).name, 'Dhuhr');
});
test('client rolls to tomorrow after Isha and never invents a next-day timestamp', () => {
  const next = getNext(schedule, schedule.days[0].prayers[5].time);
  assert.equal(next.name, 'Fajr');
  assert.equal(next.date, '2026-11-06');
  assert.equal(next.time, schedule.days[1].prayers[0].time);
  assert.equal(getNext(schedule, schedule.days[1].prayers[5].time), null);
});
test('client includes a preceding solar-day Isha after civil midnight', () => {
  const value = { ...schedule, precedingPrayer: { name: 'Isha', time: 900000, date: '2026-11-04' } };
  assert.equal(getNext(value, 800000).name, 'Isha');
  assert.equal(getNext(value, 900000).name, 'Fajr');
  const tied = { ...value, precedingPrayer: { ...value.precedingPrayer, time: schedule.days[0].prayers[0].time } };
  assert.equal(getNext(tied, 800000).name, 'Isha');
  assert.equal(validSchedule(value), value);
  assert.throws(() => validSchedule({ ...value, precedingPrayer: { name: 'Sunrise', time: 900000, date: '2026-11-04' } }));
});
test('civil dates and day headings follow the selected zone across midnight and DST', () => {
  const instant = Date.parse('2026-11-05T17:00:01Z');
  assert.equal(civilDate(instant, 'Asia/Jakarta'), '2026-11-06');
  assert.equal(civilDate(instant, 'America/New_York'), '2026-11-05');
  const date = civilDate(instant, 'Asia/Jakarta');
  assert.equal(schedule.days.find(day => day.date === date).date, '2026-11-06');
  assert.equal(civilDate(Date.parse('2026-11-01T05:30:00Z'), 'America/New_York'), '2026-11-01');
  assert.equal(civilDate(Date.parse('2026-11-01T06:30:00Z'), 'America/New_York'), '2026-11-01');
});
test('client countdown uses wall-clock delta and rounds safely', () => {
  assert.equal(countdown(3661000, 0), '01:01:01');
  assert.equal(countdown(3661000, 1000), '01:01:00');
  assert.equal(countdown(3661000, 3000000), '00:11:01');
  assert.equal(countdown(1, 0), '00:00:01');
  assert.equal(countdown(1, 2), '00:00:00');
});
test('dock countdown drops only leading empty units and preserves rounded wall-clock boundaries', () => {
  for (const [remaining, expected] of [[4367000, '1:12:47'], [767000, '12:47'], [3600000, '1:00:00'], [3599999, '1:00:00'], [3599000, '59:59'], [60000, '1:00'], [59999, '1:00'], [59000, '0:59'], [1001, '0:02'], [1000, '0:01'], [0.25, '0:01'], [0, '0:00'], [-1, '0:00'], [90061000, '25:01:01'], [360061000, '100:01:01']]) assert.equal(compactCountdown(10000 + remaining, 10000), expected);
  assert.equal(compactCountdown(1000.25, 0.5), '0:01');
  assert.equal(countdown(4367000, 0), '01:12:47', 'full widget display remains unchanged');
});
test('current prayer changes exactly at prayer starts and stops showing Fajr at Sunrise', () => {
  const [fajr, sunrise, dhuhr, asr, maghrib, isha] = schedule.days[0].prayers;
  assert.equal(getCurrent(schedule, fajr.time).name, 'Fajr');
  assert.equal(getCurrent(schedule, sunrise.time - 1).name, 'Fajr');
  assert.equal(getCurrent(schedule, sunrise.time), null);
  for (const prayer of [dhuhr, asr, maghrib, isha]) assert.equal(getCurrent(schedule, prayer.time).name, prayer.name);
  assert.equal(getCurrent(schedule, schedule.days[1].prayers[5].time), null, 'exhausted schedule is not silently current');
});
test('current prayer uses overnight history and distinguishes future Isha', () => {
  const history = { ...schedule, previousPrayer: { name: 'Isha', time: 700000, date: '2026-11-04' } };
  assert.equal(getCurrent(history, 800000).name, 'Isha');
  const futureIsha = { ...schedule, previousPrayer: { name: 'Maghrib', time: 700000, date: '2026-11-04' }, precedingPrayer: { name: 'Isha', time: 900000, date: '2026-11-04' } };
  assert.equal(getCurrent(futureIsha, 800000).name, 'Maghrib');
  assert.equal(getNext(futureIsha, 800000).name, 'Isha');
  assert.equal(getCurrent(futureIsha, 900000).name, 'Isha');
  assert.equal(validSchedule(futureIsha), futureIsha);
  const tie = { ...history, previousPrayer: { ...history.previousPrayer, time: schedule.days[0].prayers[0].time } };
  assert.equal(getCurrent(tie, schedule.days[0].prayers[0].time).name, 'Fajr');
  assert.equal(getCurrent(null, 800000), null);
});
test('floating widget position clamps to visible viewport and rejects corrupt saved values', () => {
  const equal = (value, expected) => assert.equal(JSON.stringify(value), JSON.stringify(expected));
  equal(clampFloating(null, { width: 1200, height: 800 }), { x: 912, y: 88 });
  equal(clampFloating({ x: -500, y: -200 }, { width: 1200, height: 800 }), { x: 12, y: 12 });
  equal(clampFloating({ x: 9000, y: 9000 }, { width: 1200, height: 800 }), { x: 924, y: 592 });
  equal(clampFloating({ x: NaN, y: Infinity }, { width: 1200, height: 800 }), { x: 912, y: 88 });
  equal(clampFloating({ x: 1000, y: 500 }, { width: 320, height: 240 }), { x: 44, y: 32 });
  equal(clampFloating(null, { width: 0, height: 0 }), { x: 0, y: 0 });
});
test('floating registration is root-scoped and controls can reopen or reset without changing settings', () => {
  assert.ok(source.includes("ctx.slots.inject('shell.overlay'"));
  assert.ok(source.includes("id: 'salah-floating'"));
  assert.ok(source.includes('setFloating(!model.floatingVisible)'));
  assert.ok(source.includes('setFloating(true, null)'));
  assert.ok(source.includes("window.removeEventListener('resize', resize)"));
  assert.ok(source.includes('observer?.disconnect()'));
  assert.ok(source.includes('onPointerCancel: finishMove'));
  assert.ok(source.includes('onKeyDown: keyboardMove'));
});
test('client schedule validator accepts two complete days and rejects bad data', () => {
  assert.equal(validSchedule(schedule), schedule);
  assert.throws(() => validSchedule({ ...schedule, timezone: 'No/Such_Zone' }));
  assert.throws(() => validSchedule({ ...schedule, days: [schedule.days[0]] }));
  assert.throws(() => validSchedule({ ...schedule, days: [{ ...schedule.days[0], prayers: [{ name: 'Fajr', time: NaN }] }, schedule.days[1]] }));
  const wrongOrder = structuredClone(schedule);
  wrongOrder.days[0].prayers.reverse();
  assert.throws(() => validSchedule(wrongOrder));
});
