import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { DEFAULT_SETTINGS, SOURCES, METHODS, validateSettings, SalahEngine, nextPrayer } from '../core.js';

const JAKARTA = { label: 'Jakarta, Indonesia', latitude: -6.21462, longitude: 106.84513, timezone: 'Asia/Jakarta' };
const NEW_YORK = { label: 'New York, United States', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' };
const NOW = Date.parse('2026-11-05T10:00:00Z');
const NAMES = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const CLOCKS = { Fajr: '04:14', Sunrise: '05:26', Dhuhr: '11:36', Asr: '14:55', Maghrib: '17:47', Isha: '18:55' };
const settings = (extra = {}) => ({ ...DEFAULT_SETTINGS, location: { ...JAKARTA }, ...extra });
const response = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
function aladhan(date, { zone = 'Asia/Jakarta', clocks = CLOCKS, method = 3, school = 'STANDARD' } = {}) {
  return { code: 200, status: 'OK', data: { timings: { ...clocks }, date: { gregorian: { date: date.split('-').reverse().join('-') } }, meta: { timezone: zone, method: { id: method }, school } } };
}
function myquran(date, id = 1301) {
  return { status: true, data: { id, lokasi: 'KOTA JAKARTA', daerah: 'DKI JAKARTA', jadwal: { date, subuh: '04:08', terbit: '05:23', dzuhur: '11:40', ashar: '14:57', maghrib: '17:50', isya: '19:02' } } };
}
function isoApiDate(url) { return new URL(url).pathname.split('/').at(-1).split('-').reverse().join('-'); }
function isoMyquranDate(url) { return new URL(url).pathname.split('/').slice(-3).join('-'); }
function mockEngine(handler, now = NOW) {
  const calls = [];
  const engine = new SalahEngine({ now: () => typeof now === 'function' ? now() : now, fetchImpl: async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  } });
  return { engine, calls };
}
function zonedDate(epoch, zone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(epoch);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function zonedClock(epoch, zone) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(epoch);
}

// Tests intentionally mock HTTP. The verified live samples are encoded above;
// network availability or changes in an external timetable must not break CI.
test('settings default to AlAdhan and Muslim World League, metadata is defensive', () => {
  assert.deepEqual(validateSettings({}), DEFAULT_SETTINGS);
  assert.deepEqual(SOURCES.map(({ id }) => id), ['aladhan', 'myquran', 'offline']);
  assert.equal(METHODS.find(({ id }) => id === 'Singapore').aladhan, 11);
  const engine = new SalahEngine();
  const metadata = engine.metadata();
  metadata.sources[0].id = 'bad';
  metadata.defaults.source = 'bad';
  assert.equal(engine.metadata().sources[0].id, 'aladhan');
  assert.equal(engine.metadata().defaults.source, 'aladhan');
});

test('strict full/partial settings validation rejects malformed and unknown input', () => {
  assert.deepEqual(validateSettings({ school: 'hanafi' }, { partial: true }), { school: 'hanafi' });
  assert.deepEqual(validateSettings({}, { partial: true }), {});
  for (const invalid of [null, [], 'bad', { source: 'other' }, { source: undefined }, { method: 'Other' }, { school: 'Shafi' }, { locationMode: 'IP' }, { dynamicUrl: 'https://evil.test' }, JSON.parse('{"__proto__":{}}')]) {
    assert.throws(() => validateSettings(invalid), { code: 'INVALID_INPUT' });
  }
  for (const extra of [
    { latitude: 91 }, { longitude: -181 }, { latitude: NaN }, { longitude: Infinity }, { latitude: '-6.2' },
    { timezone: 'not/a-zone' }, { timezone: '+07:00' }, { timezone: 'GMT+7' }, { label: '' }, { label: 'bad\nlabel' },
    { myquranId: '1' }, { myquranId: 1301 }, { endpoint: 'https://evil.test' },
  ]) assert.throws(() => validateSettings(settings({ location: { ...JAKARTA, ...extra } })), { code: 'INVALID_INPUT' });
  assert.equal(validateSettings(settings()).location.timezone, 'Asia/Jakarta');
  assert.equal(validateSettings(settings({ location: { ...JAKARTA, timezone: 'UTC' } })).location.timezone, 'UTC');
});

test('unresolved current location rejects without host IP or any network request', async () => {
  const { engine, calls } = mockEngine(() => { throw new Error('Must not fetch'); });
  await assert.rejects(engine.times(DEFAULT_SETTINGS), { code: 'LOCATION_REQUIRED' });
  await assert.rejects(engine.times(settings({ source: 'myquran' })), { code: 'MYQURAN_CITY_REQUIRED' });
  assert.equal(calls.length, 0);
});

test('offline today/tomorrow, canonical order, epoch times and zero network', async () => {
  const { engine, calls } = mockEngine(() => { throw new Error('Must not fetch'); });
  const result = await engine.times(settings({ source: 'offline' }));
  assert.deepEqual(result.days.map(({ date }) => date), ['2026-11-05', '2026-11-06']);
  assert.equal(result.actualSource, 'offline');
  assert.equal(result.requestedSource, 'offline');
  assert.equal(result.fallbackReason, null);
  assert.equal(result.timezone, JAKARTA.timezone);
  assert.equal(result.fetchedAt, NOW);
  assert.equal(result.method, 'MuslimWorldLeague');
  assert.equal(result.school, 'standard');
  assert.deepEqual(result.days[0].prayers.map(({ name }) => name), NAMES);
  for (const day of result.days) for (const [index, prayer] of day.prayers.entries()) {
    assert.ok(Number.isFinite(prayer.time));
    assert.equal(zonedDate(prayer.time, result.timezone), day.date);
    if (index) assert.ok(prayer.time > day.prayers[index - 1].time);
  }
  assert.equal(calls.length, 0);
});

test('offline respects worldwide civil-date rollover including International Date Line', async () => {
  const locations = [
    { ...NEW_YORK, timezone: 'America/Los_Angeles', latitude: 34.05, longitude: -118.25 },
    { label: 'Kiritimati', latitude: 1.8721, longitude: -157.4278, timezone: 'Pacific/Kiritimati' },
    { label: 'Auckland', latitude: -36.85, longitude: 174.76, timezone: 'Pacific/Auckland' },
    { label: 'Honolulu', latitude: 21.3069, longitude: -157.8583, timezone: 'Pacific/Honolulu' },
  ];
  const now = Date.parse('2026-01-01T11:30:00Z');
  for (const location of locations) {
    const { engine } = mockEngine(() => assert.fail('offline must not fetch'), now);
    const result = await engine.times(settings({ source: 'offline', location }));
    assert.equal(result.days[0].date, zonedDate(now, location.timezone));
    for (const day of result.days) assert.equal(zonedDate(day.prayers.find(({ name }) => name === 'Dhuhr').time, location.timezone), day.date);
  }
});

test('offline is independent of host timezone, including DST host zones', () => {
  const script = `import {SalahEngine} from './core.js'; const e=new SalahEngine({now:()=>${NOW}}); console.log(JSON.stringify(await e.times(${JSON.stringify(settings({ source: 'offline', location: NEW_YORK }))})));`;
  const results = ['UTC', 'Pacific/Auckland', 'America/Los_Angeles', 'Asia/Jakarta'].map((TZ) => {
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { cwd: new URL('..', import.meta.url), env: { ...process.env, TZ }, encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr);
    return JSON.parse(child.stdout);
  });
  for (const result of results.slice(1)) assert.deepEqual(result, results[0]);
});

test('offline DST spring and autumn transitions return absolute, not fixed-offset dates', async () => {
  for (const [instant, today, tomorrow] of [
    ['2026-03-08T04:30:00Z', '2026-03-07', '2026-03-08'],
    ['2026-11-01T03:30:00Z', '2026-10-31', '2026-11-01'],
  ]) {
    const now = Date.parse(instant);
    const { engine } = mockEngine(() => assert.fail('offline must not fetch'), now);
    const result = await engine.times(settings({ source: 'offline', location: NEW_YORK }));
    assert.deepEqual(result.days.map(({ date }) => date), [today, tomorrow]);
    const firstNoon = result.days[0].prayers.find(({ name }) => name === 'Dhuhr').time;
    const secondNoon = result.days[1].prayers.find(({ name }) => name === 'Dhuhr').time;
    // Solar transit remains ~24h apart, while displayed clocks change by ~1h.
    assert.ok(Math.abs(secondNoon - firstNoon - 86400000) < 120000);
    const clockMinutes = (epoch) => { const [h, m] = zonedClock(epoch, NEW_YORK.timezone).split(':').map(Number); return h * 60 + m; };
    assert.ok(Math.abs(Math.abs(clockMinutes(secondNoon) - clockMinutes(firstNoon)) - 60) < 3);
  }
});

test('offline method and Hanafi school independently affect their relevant prayers', async () => {
  const { engine } = mockEngine(() => assert.fail('offline must not fetch'));
  const standard = await engine.times(settings({ source: 'offline' }));
  const hanafi = await engine.times(settings({ source: 'offline', school: 'hanafi' }));
  const singapore = await engine.times(settings({ source: 'offline', method: 'Singapore' }));
  assert.ok(hanafi.days[0].prayers[3].time > standard.days[0].prayers[3].time);
  assert.equal(hanafi.days[0].prayers[0].time, standard.days[0].prayers[0].time);
  assert.ok(singapore.days[0].prayers[0].time < standard.days[0].prayers[0].time);
});

test('offline polar day cannot silently substitute a different location', async () => {
  const { engine } = mockEngine(() => assert.fail('offline must not fetch'), Date.parse('2026-06-21T12:00:00Z'));
  const location = { label: 'Longyearbyen', latitude: 78.2232, longitude: 15.6267, timezone: 'Arctic/Longyearbyen' };
  await assert.rejects(engine.times(settings({ source: 'offline', location })), { code: 'CALCULATION_UNAVAILABLE' });
});

test('countdown skips Sunrise, advances after Isha, excludes elapsed/exact prayer', async () => {
  const { engine } = mockEngine(() => assert.fail('offline must not fetch'));
  const { days } = await engine.times(settings({ source: 'offline' }));
  const [today, tomorrow] = days;
  const fajr = today.prayers[0];
  assert.equal(nextPrayer(days, fajr.time - 1).name, 'Fajr');
  assert.equal(nextPrayer(days, fajr.time).name, 'Dhuhr');
  assert.equal(nextPrayer(days, today.prayers[1].time - 1).name, 'Dhuhr');
  const afterIsha = nextPrayer(days, today.prayers[5].time + 1);
  assert.equal(afterIsha.name, 'Fajr');
  assert.equal(afterIsha.date, tomorrow.date);
  assert.equal(afterIsha.time, tomorrow.prayers[0].time);
  assert.equal(afterIsha.remainingMs, tomorrow.prayers[0].time - today.prayers[5].time - 1);
  assert.equal(nextPrayer(days, tomorrow.prayers[5].time), null);
  assert.equal(nextPrayer([], NOW), null);
  assert.throws(() => nextPrayer(days, NaN), { code: 'INVALID_INPUT' });
});

test('AlAdhan parses live-shaped clock data and uses only fixed explicit HTTPS endpoints', async () => {
  const { engine, calls } = mockEngine((url) => response(aladhan(isoApiDate(url))));
  const result = await engine.times(settings());
  assert.equal(result.actualSource, 'aladhan');
  assert.equal(result.fallbackReason, null);
  assert.equal(result.days[0].prayers[0].time, Date.parse('2026-11-04T21:14:00Z'));
  assert.equal(result.days[0].prayers[5].time, Date.parse('2026-11-05T11:55:00Z'));
  assert.equal(calls.length, 2);
  for (const { url, init } of calls) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://api.aladhan.com');
    assert.equal(parsed.searchParams.get('method'), '3');
    assert.equal(parsed.searchParams.get('school'), '0');
    assert.equal(parsed.searchParams.has('timezonestring'), false);
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.Accept, 'application/json');
    assert.ok(init.signal instanceof AbortSignal);
  }
});

test('AlAdhan Singapore/Hanafi are explicit and not merely display labels', async () => {
  const { engine, calls } = mockEngine((url) => response(aladhan(isoApiDate(url), { method: 11, school: 'HANAFI' })));
  const result = await engine.times(settings({ method: 'Singapore', school: 'hanafi' }));
  assert.equal(result.method, 'Singapore');
  assert.equal(result.school, 'hanafi');
  assert.equal(new URL(calls[0].url).searchParams.get('method'), '11');
  assert.equal(new URL(calls[0].url).searchParams.get('school'), '1');
});

test('AlAdhan timezone is authoritative and corrects today when browser hint crosses date line', async () => {
  const now = Date.parse('2026-11-05T23:00:00Z');
  const { engine, calls } = mockEngine((url) => response(aladhan(isoApiDate(url))), now);
  const result = await engine.times(settings({ location: { ...JAKARTA, timezone: 'America/Los_Angeles' } }));
  assert.equal(result.timezone, 'Asia/Jakarta');
  assert.equal(result.location.timezone, 'Asia/Jakarta');
  assert.deepEqual(result.days.map(({ date }) => date), ['2026-11-06', '2026-11-07']);
  assert.deepEqual(calls.map(({ url }) => isoApiDate(url)), ['2026-11-05', '2026-11-06', '2026-11-07']);
});

test('provider wall times convert across DST spring and fall offset changes', async () => {
  for (const [now, expected] of [
    ['2026-03-08T04:00:00Z', ['2026-03-07T10:00:00Z', '2026-03-08T09:00:00Z']],
    ['2026-11-01T03:00:00Z', ['2026-10-31T09:00:00Z', '2026-11-01T10:00:00Z']],
  ]) {
    const clocks = { Fajr: '05:00', Sunrise: '06:00', Dhuhr: '12:00', Asr: '15:00', Maghrib: '18:00', Isha: '19:00' };
    const { engine } = mockEngine((url) => response(aladhan(isoApiDate(url), { zone: NEW_YORK.timezone, clocks })), Date.parse(now));
    const result = await engine.times(settings({ location: NEW_YORK }));
    assert.equal(result.actualSource, 'aladhan');
    assert.deepEqual(result.days.map((day) => new Date(day.prayers[0].time).toISOString()), expected.map((value) => new Date(value).toISOString()));
  }
});

test('DST ambiguous wall time chooses earliest occurrence; nonexistent time triggers fallback', async () => {
  const repeated = { ...CLOCKS, Fajr: '01:30', Sunrise: '06:00' };
  const { engine } = mockEngine((url) => response(aladhan(isoApiDate(url), { zone: NEW_YORK.timezone, clocks: repeated })), Date.parse('2026-11-01T12:00:00Z'));
  const result = await engine.times(settings({ location: NEW_YORK }));
  assert.equal(result.days[0].prayers[0].time, Date.parse('2026-11-01T05:30:00Z'));
  const skipped = { ...CLOCKS, Fajr: '02:30', Sunrise: '06:00' };
  const { engine: spring } = mockEngine((url) => response(aladhan(isoApiDate(url), { zone: NEW_YORK.timezone, clocks: skipped })), Date.parse('2026-03-08T12:00:00Z'));
  const fallback = await spring.times(settings({ location: NEW_YORK }));
  assert.equal(fallback.actualSource, 'offline');
  assert.match(fallback.fallbackReason, /DST/);
});

test('Isha after midnight belongs to the following civil day without counting Sunrise', async () => {
  const clocks = { Fajr: '03:00', Sunrise: '04:30', Dhuhr: '12:00', Asr: '16:00', Maghrib: '22:00', Isha: '00:30' };
  const { engine } = mockEngine((url) => response(aladhan(isoApiDate(url), { clocks })));
  const result = await engine.times(settings());
  assert.equal(result.actualSource, 'aladhan');
  assert.equal(zonedDate(result.days[0].prayers[5].time, result.timezone), '2026-11-06');
  assert.equal(nextPrayer(result.days, result.days[0].prayers[4].time).name, 'Isha');
});

test('offline countdown includes previous solar-day Isha after civil midnight', async () => {
  const now = Date.parse('2026-06-15T21:10:00Z'); // June 16, 00:10 in Helsinki.
  const location = { label: 'Helsinki', latitude: 60.17, longitude: 24.94, timezone: 'Europe/Helsinki' };
  const { engine, calls } = mockEngine(() => assert.fail('offline must not fetch'), now);
  const result = await engine.times(settings({ source: 'offline', location }));
  assert.equal(result.days[0].date, '2026-06-16');
  assert.equal(result.previousPrayer.name, 'Maghrib');
  assert.equal(result.previousPrayer.date, '2026-06-15');
  assert.ok(result.previousPrayer.time <= now);
  assert.equal(result.precedingPrayer.name, 'Isha');
  assert.equal(result.precedingPrayer.date, '2026-06-15');
  assert.equal(zonedDate(result.precedingPrayer.time, location.timezone), '2026-06-16');
  assert.ok(result.precedingPrayer.time > now);
  assert.equal(nextPrayer(result.days, now, result.precedingPrayer).name, 'Isha');
  assert.equal(calls.length, 0);
  assert.throws(() => nextPrayer(result.days, now, { name: 'Sunrise', time: now + 1, date: '2026-06-16' }), { code: 'INVALID_INPUT' });
});

test('AlAdhan retrieves prior solar-day Isha only before Fajr and selects it first', async () => {
  const now = Date.parse('2026-11-05T17:10:00Z'); // November 6, 00:10 Jakarta.
  const clocks = { Fajr: '03:00', Sunrise: '04:30', Dhuhr: '12:00', Asr: '16:00', Maghrib: '22:00', Isha: '00:30' };
  const { engine, calls } = mockEngine((url) => response(aladhan(isoApiDate(url), { clocks })), now);
  const result = await engine.times(settings());
  assert.deepEqual(calls.map(({ url }) => isoApiDate(url)), ['2026-11-06', '2026-11-07', '2026-11-05']);
  assert.equal(result.precedingPrayer.time, Date.parse('2026-11-05T17:30:00Z'));
  assert.equal(nextPrayer(result.days, now, result.precedingPrayer).name, 'Isha');
  assert.equal(nextPrayer(result.days, now, result.precedingPrayer).remainingMs, 20 * 60000);
  const { engine: afterFajr, calls: afterCalls } = mockEngine((url) => response(aladhan(isoApiDate(url), { clocks })), Date.parse('2026-11-05T21:00:00Z'));
  const after = await afterFajr.times(settings());
  assert.equal(after.precedingPrayer, null);
  assert.equal(afterCalls.length, 2);
});

test('equal-clock Isha/Fajr at high latitudes rolls Isha to next day and breaks tie in favor of prior Isha', async () => {
  const now = Date.parse('2026-11-05T17:10:00Z');
  const clocks = { Fajr: '03:00', Sunrise: '04:30', Dhuhr: '12:00', Asr: '16:00', Maghrib: '22:00', Isha: '03:00' };
  const { engine } = mockEngine((url) => response(aladhan(isoApiDate(url), { clocks })), now);
  const result = await engine.times(settings());
  assert.equal(result.actualSource, 'aladhan');
  assert.equal(result.precedingPrayer.time, result.days[0].prayers[0].time);
  assert.equal(nextPrayer(result.days, now, result.precedingPrayer).name, 'Isha');
});

test('MyQuran pre-Fajr requests prior day without mixing in AlAdhan', async () => {
  const now = Date.parse('2026-11-05T17:10:00Z');
  const { engine, calls } = mockEngine((url) => response(myquran(isoMyquranDate(url))), now);
  const result = await engine.times(settings({ source: 'myquran', location: { ...JAKARTA, myquranId: '1301' } }));
  assert.equal(result.actualSource, 'myquran');
  assert.equal(result.precedingPrayer, null); // Prior Isha was yesterday at19:02.
  assert.equal(calls.length, 3);
  assert.ok(calls.every(({ url }) => new URL(url).hostname === 'api.myquran.com'));
});

test('offline pre-Fajr previousPrayer retains past Isha, with no history at/after Fajr', async () => {
  let now = Date.parse('2026-11-05T19:00:00Z'); // November 6, 02:00 Jakarta.
  const { engine, calls } = mockEngine(() => assert.fail('offline must not fetch'), () => now);
  const selected = settings({ source: 'offline' });
  const result = await engine.times(selected);
  const priorIsha = engine._offline('2026-11-05', selected).prayers[5];
  assert.deepEqual(result.previousPrayer, { ...priorIsha, date: '2026-11-05' });
  assert.ok(result.previousPrayer.time <= now);
  assert.equal(result.precedingPrayer, null);
  for (const offset of [0, 1]) {
    now = result.days[0].prayers[0].time + offset;
    const after = await engine.times(selected);
    assert.equal(after.previousPrayer, null);
    assert.equal(after.precedingPrayer, null);
  }
  assert.equal(calls.length, 0);
});

test('both online providers expose past pre-Fajr Isha history without additional requests', async () => {
  const now = Date.parse('2026-11-05T19:00:00Z');
  for (const source of ['aladhan', 'myquran']) {
    const { engine, calls } = mockEngine((url) => response(source === 'aladhan' ? aladhan(isoApiDate(url)) : myquran(isoMyquranDate(url))), now);
    const result = await engine.times(settings({ source, location: { ...JAKARTA, myquranId: '1301' } }));
    assert.equal(result.actualSource, source);
    assert.deepEqual(result.previousPrayer, {
      name: 'Isha', date: '2026-11-05',
      time: Date.parse(source === 'aladhan' ? '2026-11-05T11:55:00Z' : '2026-11-05T12:02:00Z'),
    });
    assert.equal(result.precedingPrayer, null);
    assert.equal(calls.length, 3);
  }
});

test('future previous-day Isha keeps elapsed Maghrib history, then becomes history once begun', async () => {
  let now = Date.parse('2026-11-05T17:20:00Z'); // 00:20 local, Isha still future; within the 15-minute cache TTL.
  const clocks = { Fajr: '03:00', Sunrise: '04:30', Dhuhr: '12:00', Asr: '16:00', Maghrib: '22:00', Isha: '00:30' };
  const { engine, calls } = mockEngine((url) => response(aladhan(isoApiDate(url), { clocks })), () => now);
  const future = await engine.times(settings());
  assert.deepEqual(future.previousPrayer, { name: 'Maghrib', time: Date.parse('2026-11-05T15:00:00Z'), date: '2026-11-05' });
  assert.equal(future.precedingPrayer.name, 'Isha');
  now = future.precedingPrayer.time;
  const begun = await engine.times(settings());
  assert.deepEqual(begun.previousPrayer, future.precedingPrayer);
  assert.equal(begun.precedingPrayer, null);
  assert.equal(calls.length, 3); // All three prior responses remain cached.
});

test('both providers retain prior Maghrib alongside future Isha with no extra lookup', async () => {
  const now = Date.parse('2026-11-05T17:10:00Z');
  const clocks = { Fajr: '03:00', Sunrise: '04:30', Dhuhr: '12:00', Asr: '16:00', Maghrib: '22:00', Isha: '00:30' };
  for (const source of ['aladhan', 'myquran']) {
    const { engine, calls } = mockEngine((url) => {
      if (source === 'aladhan') return response(aladhan(isoApiDate(url), { clocks }));
      const data = myquran(isoMyquranDate(url));
      Object.assign(data.data.jadwal, { subuh: '03:00', terbit: '04:30', dzuhur: '12:00', ashar: '16:00', maghrib: '22:00', isya: '00:30' });
      return response(data);
    }, now);
    const result = await engine.times(settings({ source, location: { ...JAKARTA, myquranId: '1301' } }));
    assert.equal(result.actualSource, source);
    assert.deepEqual(result.previousPrayer, { name: 'Maghrib', time: Date.parse('2026-11-05T15:00:00Z'), date: '2026-11-05' });
    assert.equal(result.precedingPrayer.name, 'Isha');
    assert.equal(calls.length, 3);
  }
});

test('prior history selects latest elapsed obligatory row, never Sunrise', async () => {
  const now = Date.parse('2026-11-05T19:00:00Z');
  const { engine } = mockEngine(() => assert.fail('offline must not fetch'), now);
  const original = engine._offline.bind(engine);
  engine._offline = (date, selected) => date === '2026-11-05' ? {
    date, prayers: NAMES.map((name, index) => ({ name, time: now + (index - 1) * 1000 })),
  } : original(date, selected);
  const result = await engine.times(settings({ source: 'offline' }));
  assert.equal(result.previousPrayer.name, 'Fajr'); // Sunrise just elapsed, but is not salah.
  assert.equal(result.previousPrayer.time, now - 1000);
  assert.equal(result.precedingPrayer.name, 'Isha');
});

test('equal prior Isha/current Fajr boundary clears carryover history without a prior fetch', async () => {
  const now = Date.parse('2026-11-05T20:00:00Z'); // Exactly November 6 03:00 Fajr.
  const clocks = { Fajr: '03:00', Sunrise: '04:30', Dhuhr: '12:00', Asr: '16:00', Maghrib: '22:00', Isha: '03:00' };
  const { engine, calls } = mockEngine((url) => response(aladhan(isoApiDate(url), { clocks })), now);
  const result = await engine.times(settings());
  assert.equal(result.days[0].prayers[0].time, now);
  assert.equal(result.previousPrayer, null);
  assert.equal(result.precedingPrayer, null);
  assert.equal(calls.length, 2);
});

test('failed prior-provider lookup atomically regenerates previousPrayer offline', async () => {
  const now = Date.parse('2026-11-05T19:00:00Z');
  const { engine, calls } = mockEngine((url) => isoApiDate(url) === '2026-11-05' ? response({}, 503) : response(aladhan(isoApiDate(url))), now);
  const result = await engine.times(settings());
  const expected = await engine.times(settings({ source: 'offline' }));
  assert.equal(result.actualSource, 'offline');
  assert.equal(result.requestedSource, 'aladhan');
  assert.match(result.fallbackReason, /AlAdhan unavailable/);
  assert.deepEqual(result.previousPrayer, expected.previousPrayer);
  assert.deepEqual(result.days, expected.days);
  assert.equal(result.precedingPrayer, null);
  assert.ok(result.previousPrayer.time <= now);
  assert.equal(calls.length, 3);
});

test('unavailable prior provider day atomically falls back; unavailable offline prior day rejects', async () => {
  const now = Date.parse('2026-06-15T21:10:00Z');
  const location = { label: 'Helsinki', latitude: 60.17, longitude: 24.94, timezone: 'Europe/Helsinki' };
  const clocks = { Fajr: '03:00', Sunrise: '04:30', Dhuhr: '12:00', Asr: '16:00', Maghrib: '22:00', Isha: '00:30' };
  const { engine } = mockEngine((url) => isoApiDate(url) === '2026-06-15' ? response({}, 503) : response(aladhan(isoApiDate(url), { zone: location.timezone, clocks })), now);
  const result = await engine.times(settings({ location }));
  assert.equal(result.actualSource, 'offline');
  assert.ok(result.precedingPrayer.time > now);
  assert.equal(nextPrayer(result.days, now, result.precedingPrayer).name, 'Isha');
  const offline = engine._offline.bind(engine);
  engine._offline = (date, selected) => {
    if (date === '2026-06-15') throw Object.assign(new Error('Prior day unavailable'), { code: 'CALCULATION_UNAVAILABLE' });
    return offline(date, selected);
  };
  await assert.rejects(engine.times(settings({ source: 'offline', location })), { code: 'CALCULATION_UNAVAILABLE' });
});

test('failed, invalid and malformed AlAdhan data explicitly falls back; never mixes days', async (t) => {
  const variants = [
    ['network', () => { throw new TypeError('untrusted error text'); }],
    ['http', () => response({}, 503)],
    ['invalid JSON', () => new Response('{bad')],
    ['missing data', () => response({ code: 200 })],
    ['wrong date', () => response(aladhan('2026-11-04'))],
    ['bad timezone', (url) => response(aladhan(isoApiDate(url), { zone: 'Invalid/Zone' }))],
    ['bad clock', (url) => response(aladhan(isoApiDate(url), { clocks: { ...CLOCKS, Fajr: '25:88' } }))],
    ['missing clock', (url) => response(aladhan(isoApiDate(url), { clocks: { ...CLOCKS, Isha: null } }))],
    ['wrong method', (url) => response(aladhan(isoApiDate(url), { method: 11 }))],
    ['wrong school', (url) => response(aladhan(isoApiDate(url), { school: 'HANAFI' }))],
    ['out of order', (url) => response(aladhan(isoApiDate(url), { clocks: { ...CLOCKS, Dhuhr: '01:00' } }))],
    ['body too large', () => new Response(' '.repeat(1024 * 1024 + 1))],
    ['declared oversized', () => new Response('{}', { headers: { 'content-length': '2000000' } })],
    ['second day fails', (url) => isoApiDate(url) === '2026-11-05' ? response(aladhan('2026-11-05')) : response({}, 503)],
  ];
  for (const [name, handler] of variants) await t.test(name, async () => {
    const { engine } = mockEngine(handler);
    const result = await engine.times(settings());
    const expected = await engine.times(settings({ source: 'offline' }));
    assert.equal(result.requestedSource, 'aladhan');
    assert.equal(result.actualSource, 'offline');
    assert.match(result.fallbackReason, /AlAdhan unavailable: .+ Using offline calculation\./);
    assert.deepEqual(result.days, expected.days);
  });
});

test('AlAdhan fallback restores selected timezone, not partial provider metadata', async () => {
  const { engine } = mockEngine((url) => isoApiDate(url) === '2026-11-05' ? response(aladhan('2026-11-05', { zone: NEW_YORK.timezone })) : response({}, 500));
  const result = await engine.times(settings());
  assert.equal(result.actualSource, 'offline');
  assert.equal(result.timezone, 'Asia/Jakarta');
  assert.equal(result.location.timezone, 'Asia/Jakarta');
});

test('MyQuran parses independent Indonesian timetable with provider-controlled method/school', async () => {
  const { engine, calls } = mockEngine((url) => response(myquran(isoMyquranDate(url))));
  const result = await engine.times(settings({ source: 'myquran', method: 'Singapore', school: 'hanafi', location: { ...JAKARTA, myquranId: '1301' } }));
  assert.equal(result.actualSource, 'myquran');
  assert.equal(result.requestedSource, 'myquran');
  assert.equal(result.method, 'MyQuran');
  assert.equal(result.school, 'provider');
  assert.equal(result.fallbackReason, null);
  assert.equal(zonedClock(result.days[0].prayers[0].time, 'Asia/Jakarta'), '04:08');
  assert.equal(calls.length, 2);
  for (const { url } of calls) assert.match(url, /^https:\/\/api\.myquran\.com\/v2\/sholat\/jadwal\/1301\/2026\/11\/0[56]$/);
});

test('MyQuran leading-zero city IDs stay intact, optional coordinates respected', async () => {
  const { engine } = mockEngine((url) => {
    const data = myquran(isoMyquranDate(url), 119);
    data.data.koordinat = { lat: '5.55', lon: '95.32' };
    return response(data);
  });
  const result = await engine.times(settings({ source: 'myquran', location: { ...JAKARTA, myquranId: '0119' } }));
  assert.equal(result.actualSource, 'myquran');
  assert.equal(result.location.latitude, 5.55);
  assert.equal(result.location.longitude, 95.32);
});

test('MyQuran failure falls back only to offline, never to AlAdhan', async () => {
  for (const variant of ['http', 'city', 'date', 'clock', 'coordinates']) {
    const { engine, calls } = mockEngine((url) => {
      if (variant === 'http') return response({}, 503);
      const data = myquran(isoMyquranDate(url));
      if (variant === 'city') data.data.id = 9999;
      if (variant === 'date') data.data.jadwal.date = '2026-11-04';
      if (variant === 'clock') data.data.jadwal.subuh = 'bad';
      if (variant === 'coordinates') data.data.koordinat = { lat: 'bad', lon: 0 };
      return response(data);
    });
    const result = await engine.times(settings({ source: 'myquran', location: { ...JAKARTA, myquranId: '1301' } }));
    assert.equal(result.actualSource, 'offline');
    assert.equal(result.method, 'MuslimWorldLeague');
    assert.equal(result.school, 'standard');
    assert.match(result.fallbackReason, /MyQuran unavailable/);
    assert.ok(calls.every(({ url }) => new URL(url).hostname === 'api.myquran.com'));
  }
});

test('MyQuran rejects null/blank/coercible coordinates instead of inventing zero values', async () => {
  for (const latitude of [null, '', '   ', true, [], {}, '0x10']) {
    const { engine } = mockEngine((url) => {
      const data = myquran(isoMyquranDate(url));
      data.data.koordinat = { lat: latitude, lon: 106.8 };
      return response(data);
    });
    const result = await engine.times(settings({ source: 'myquran', location: { ...JAKARTA, myquranId: '1301' } }));
    assert.equal(result.actualSource, 'offline');
    assert.equal(result.location.latitude, JAKARTA.latitude);
  }
});

test('coded low-level network errors cannot leak system details through search or fallback', async () => {
  const { engine } = mockEngine(() => { throw Object.assign(new Error('/private/host/internal/token-file: connection refused'), { code: 'ECONNREFUSED' }); });
  await assert.rejects(engine.search('Jakarta'), { code: 'NETWORK_ERROR', message: 'Provider request could not be completed.' });
  const result = await engine.times(settings());
  assert.doesNotMatch(result.fallbackReason, /private|internal|token-file/);
});

test('global search uses Open-Meteo with timezone/coordinates; offline search still geocodes', async () => {
  const { engine, calls } = mockEngine(() => response({ results: [{ name: 'Jakarta', admin1: 'Jakarta', country: 'Indonesia', country_code: 'ID', latitude: JAKARTA.latitude, longitude: JAKARTA.longitude, timezone: JAKARTA.timezone }] }));
  const result = await engine.search('Jakarta', { source: 'offline' });
  assert.deepEqual(result, [JAKARTA]);
  assert.equal(new URL(calls[0].url).origin, 'https://geocoding-api.open-meteo.com');
  assert.equal(new URL(calls[0].url).searchParams.get('name'), 'Jakarta');
  assert.equal(new URL(calls[0].url).searchParams.has('countryCode'), false);
  assert.equal((await engine.search('Jakarta', { source: 'aladhan' })).length, 1);
  assert.equal(calls.length, 1);
});

test('commercial geocoding sends its runtime key only to the fixed customer search endpoint', async () => {
  const { engine, calls } = mockEngine(() => response({ results: [{ name: 'Jakarta', country: 'Indonesia', country_code: 'ID', latitude: JAKARTA.latitude, longitude: JAKARTA.longitude, timezone: JAKARTA.timezone }] }));
  await engine.search('Jakarta', { apiKey: 'MUST_NOT_SEND_TO_PUBLIC' });
  assert.equal(new URL(calls[0].url).origin, 'https://geocoding-api.open-meteo.com');
  assert.equal(new URL(calls[0].url).searchParams.has('apikey'), false);
  const result = await engine.search('Jakarta', { geocodingProvider: 'open-meteo-commercial', apiKey: 'COMMERCIAL&KEY=?value' });
  assert.deepEqual(result, [JAKARTA]);
  assert.equal(calls.length, 2);
  const url = new URL(calls[1].url);
  assert.equal(url.origin, 'https://customer-geocoding-api.open-meteo.com');
  assert.equal(url.pathname, '/v1/search');
  assert.equal(url.searchParams.get('apikey'), 'COMMERCIAL&KEY=?value');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['apikey', 'count', 'format', 'language', 'name']);
  assert.equal(calls[1].init.redirect, 'error');
  assert.doesNotMatch(JSON.stringify(result), /COMMERCIAL|apikey/);
});

test('geocoding caches never mix public/commercial modes or rotated credentials', async () => {
  const { engine, calls } = mockEngine(url => {
    const parsed = new URL(url);
    const name = parsed.searchParams.get('apikey') === 'ROTATED_SECRET' ? 'Rotated City' : parsed.hostname.startsWith('customer-') ? 'Licensed City' : 'Public City';
    return response({ results: [{ name, latitude: 0, longitude: 0, timezone: 'UTC' }] });
  });
  const publicResult = await engine.search('City');
  const first = await engine.search('City', { geocodingProvider: 'open-meteo-commercial', apiKey: 'FIRST_SECRET' });
  const again = await engine.search('City', { geocodingProvider: 'open-meteo-commercial', apiKey: 'FIRST_SECRET' });
  const rotated = await engine.search('City', { geocodingProvider: 'open-meteo-commercial', apiKey: 'ROTATED_SECRET' });
  assert.equal(publicResult[0].label, 'Public City');
  assert.equal(first[0].label, 'Licensed City');
  assert.deepEqual(again, first);
  assert.equal(rotated[0].label, 'Rotated City');
  assert.equal(calls.length, 3);
  assert.deepEqual(await engine.search('City'), publicResult);
  assert.equal(calls.length, 3);
  assert.doesNotMatch(JSON.stringify({ publicResult, first, again, rotated }), /FIRST_SECRET|ROTATED_SECRET|apikey/i);
  const cacheEntries = [...engine._cache.entries()];
  assert.ok(cacheEntries.length > 0, 'inspect populated Map entries, not JSON.stringify(Map), which is empty');
  const assertPrivateCache = entries => assert.doesNotMatch(JSON.stringify(entries), /FIRST_SECRET|ROTATED_SECRET|apikey|customer-geocoding-api\.open-meteo\.com\/v1\/search/i);
  assertPrivateCache(cacheEntries);
  // Mutation sanity: the same assertion must detect secrets in either a cache key or value.
  assert.throws(() => assertPrivateCache([...cacheEntries, ['geo:FIRST_SECRET:city', { value: [] }]]), assert.AssertionError);
  assert.throws(() => assertPrivateCache([...cacheEntries, ['geo:mutated', { value: 'https://customer-geocoding-api.open-meteo.com/v1/search?name=City&apikey=ROTATED_SECRET' }]]), assert.AssertionError);
});

test('commercial core search requires a runtime key and rejects arbitrary provider URLs before any fetch', async () => {
  const { engine, calls } = mockEngine(() => assert.fail('Invalid options must not fetch'));
  for (const source of ['aladhan', 'myquran', 'offline']) {
    for (const apiKey of [undefined, null, '', '   ', 123, 'bad\nkey']) {
      await assert.rejects(engine.search('Jakarta', { source, geocodingProvider: 'open-meteo-commercial', apiKey }), { code: 'GEOCODING_KEY_REQUIRED' });
    }
  }
  for (const geocodingProvider of ['https://evil.invalid/v1/search', 'http://customer-geocoding-api.open-meteo.com', 'https://customer-geocoding-api.open-meteo.com.evil.invalid/v1/search']) {
    await assert.rejects(engine.search('Jakarta', { geocodingProvider, apiKey: 'SECRET' }), { code: 'INVALID_INPUT' });
  }
  assert.deepEqual(calls, []);
});

test('commercial provider failures never expose keys or URLs, including errors with trusted-looking codes', async () => {
  const secret = 'KEY_SENSITIVE_123';
  for (const handler of [
    () => { throw new Error(`https://customer-geocoding-api.open-meteo.com/v1/search?apikey=${secret} /private/key-file`); },
    () => { throw Object.assign(new Error(`HTTP failed with ${secret} /private/key-file`), { code: 'HTTP_ERROR' }); },
    () => { throw Object.assign(new Error(`Invalid data ${secret}`), { code: 'INVALID_DATA' }); },
    () => response({ error: true, reason: `Invalid key ${secret}` }, 401),
    () => response({ error: true, reason: `Invalid key ${secret}` }),
  ]) {
    const { engine, calls } = mockEngine(handler);
    await assert.rejects(engine.search('Jakarta', { geocodingProvider: 'open-meteo-commercial', apiKey: secret }), error => {
      assert.doesNotMatch(`${error.message} ${error.stack} ${JSON.stringify(error)}`, /KEY_SENSITIVE|apikey=|private\/key-file|https:\/\//);
      return ['NETWORK_ERROR', 'HTTP_ERROR', 'INVALID_DATA'].includes(error.code);
    });
    assert.equal(calls.length, 1, 'provider errors must not retry on the public endpoint');
    assert.equal(new URL(calls[0].url).hostname, 'customer-geocoding-api.open-meteo.com');
  }
});

test('a geocoder reflecting the runtime key cannot place it in results or a cached city', async () => {
  let attempts = 0;
  const secret = 'REFLECTED&SECRET';
  const { engine, calls } = mockEngine(() => response({ results: [{ name: ++attempts === 1 ? `City ${encodeURIComponent(secret)}` : 'Safe City', latitude: 0, longitude: 0, timezone: 'UTC' }] }));
  const options = { geocodingProvider: 'open-meteo-commercial', apiKey: secret };
  await assert.rejects(engine.search('City', options), { code: 'INVALID_DATA' });
  const result = await engine.search('City', options);
  assert.equal(result[0].label, 'Safe City');
  assert.equal(calls.length, 2);
  assert.doesNotMatch(JSON.stringify(result), /REFLECTED|SECRET/);
});

test('MyQuran search uses independent directory plus Indonesia-restricted geocoder', async () => {
  const { engine, calls } = mockEngine((url) => {
    if (new URL(url).hostname === 'api.myquran.com') return response({ status: true, data: [{ id: '1301', lokasi: 'KOTA JAKARTA' }, { id: '1219', lokasi: 'KOTA BANDUNG' }] });
    return response({ results: [
      { name: 'Jakarta Abroad', country_code: 'US', latitude: 0, longitude: 0, timezone: 'UTC' },
      { name: 'Jakarta', country: 'Indonesia', country_code: 'ID', latitude: JAKARTA.latitude, longitude: JAKARTA.longitude, timezone: JAKARTA.timezone },
    ] });
  });
  const result = await engine.search('jakarta', { source: 'myquran' });
  assert.deepEqual(result, [{ ...JAKARTA, label: 'KOTA JAKARTA, Indonesia', myquranId: '1301' }]);
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /api\.myquran\.com\/v2\/sholat\/kota\/semua/);
  assert.equal(new URL(calls[1].url).searchParams.get('countryCode'), 'ID');
  assert.equal(new URL(calls[1].url).searchParams.get('name'), 'JAKARTA');
  assert.deepEqual(await engine.search('no-city-found', { source: 'myquran' }), []);
  assert.equal(calls.length, 2);
});

test('MyQuran city coordinates use the selected commercial geocoder without sending its key to MyQuran', async () => {
  const { engine, calls } = mockEngine(url => new URL(url).hostname === 'api.myquran.com'
    ? response({ status: true, data: [{ id: '1301', lokasi: 'KOTA JAKARTA' }] })
    : response({ results: [{ name: 'Jakarta', country: 'Indonesia', country_code: 'ID', latitude: JAKARTA.latitude, longitude: JAKARTA.longitude, timezone: JAKARTA.timezone }] }));
  const results = await engine.search('Jakarta', { source: 'myquran', geocodingProvider: 'open-meteo-commercial', apiKey: 'ONLY_GEOCODER_SECRET' });
  assert.deepEqual(results, [{ ...JAKARTA, label: 'KOTA JAKARTA, Indonesia', myquranId: '1301' }]);
  assert.equal(calls.length, 2);
  const directory = new URL(calls[0].url), geocoder = new URL(calls[1].url);
  assert.equal(directory.origin, 'https://api.myquran.com');
  assert.equal(directory.searchParams.has('apikey'), false);
  assert.equal(geocoder.origin, 'https://customer-geocoding-api.open-meteo.com');
  assert.equal(geocoder.searchParams.get('countryCode'), 'ID');
  assert.equal(geocoder.searchParams.get('apikey'), 'ONLY_GEOCODER_SECRET');
  assert.ok(calls.every(({ init }) => init.redirect === 'error'));
});

test('search never invents coordinates for missing or malformed city/geocoder data', async () => {
  for (const data of [{ error: true }, { results: {} }, { results: [{ name: 'Bad', latitude: 0, longitude: 0, timezone: 'Bad/Zone' }] }, { results: [{ name: 'Missing', longitude: 10, timezone: 'UTC' }] }]) {
    const { engine } = mockEngine(() => response(data));
    await assert.rejects(engine.search('test'), { code: 'INVALID_DATA' });
  }
  const { engine } = mockEngine((url) => new URL(url).hostname === 'api.myquran.com'
    ? response({ status: true, data: [{ id: '1301', lokasi: 'KOTA JAKARTA' }] }) : response({ results: [] }));
  await assert.rejects(engine.search('Jakarta', { source: 'myquran' }), { code: 'LOCATION_NOT_FOUND' });
  for (const query of ['', 'a', null, 'x'.repeat(121)]) await assert.rejects(engine.search(query), { code: 'INVALID_INPUT' });
  await assert.rejects(engine.search('Jakarta', { source: 'evil' }), { code: 'INVALID_INPUT' });
});

test('malicious search input stays an encoded query on fixed allowlisted origin', async () => {
  const { engine, calls } = mockEngine(() => response({}));
  const query = 'https://evil.test/path?x=1&latitude=0#frag';
  assert.deepEqual(await engine.search(query), []);
  const url = new URL(calls[0].url);
  assert.equal(url.origin, 'https://geocoding-api.open-meteo.com');
  assert.equal(url.searchParams.get('name'), query);
  assert.equal(url.searchParams.has('latitude'), false);
  await assert.rejects(engine._json('https://evil.test/v1/search'), { code: 'INVALID_INPUT' });
});

test('bounded cache preserves fetch timestamps, clones results and expires', async () => {
  let now = NOW;
  const { engine, calls } = mockEngine((url) => response(aladhan(isoApiDate(url))), () => now);
  const first = await engine.times(settings());
  first.days[0].prayers[0].time = -1;
  now += 10000;
  const second = await engine.times(settings());
  assert.equal(calls.length, 2);
  assert.equal(second.fetchedAt, NOW);
  assert.ok(second.days[0].prayers[0].time > 0);
  now += 16 * 60000;
  await engine.times(settings());
  assert.equal(calls.length, 4);
  for (let index = 0; index < 100; index++) engine._put(`test-${index}`, index, 1000);
  assert.equal(engine._cache.size, 64);
  assert.equal(engine._get('test-0'), null);
  assert.equal(engine._get('test-99'), 99);
});

test('cancelled requests propagate without offline failover, including ignored fetch signals', async () => {
  const { engine, calls } = mockEngine(() => new Promise(() => {}));
  const controller = new AbortController();
  const operation = engine.times(settings(), controller.signal);
  controller.abort();
  await assert.rejects(operation, { name: 'AbortError' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.signal.aborted, true);
  const already = new AbortController();
  already.abort(new Error('User stopped'));
  await assert.rejects(engine.times(settings(), already.signal), /User stopped/);
  assert.equal(calls.length, 1);
});

test('HTTP timeout is bounded even when fetch ignores AbortSignal', { timeout: 11000 }, async () => {
  const { engine, calls } = mockEngine(() => new Promise(() => {}));
  const started = Date.now();
  const result = await engine.times(settings());
  assert.equal(result.actualSource, 'offline');
  assert.match(result.fallbackReason, /timed out/);
  assert.ok(Date.now() - started < 10000);
  assert.equal(calls[0].init.signal.aborted, true);
});

test('engine action search honors persisted geocoding selection instead of silently selecting public', async () => {
  const { engine, calls } = mockEngine(() => response({}));
  await assert.rejects(engine.execute({ action: 'search', query: 'Jakarta' }, settings({ geocodingProvider: 'open-meteo-commercial' })), { code: 'GEOCODING_KEY_REQUIRED' });
  assert.deepEqual(calls, []);
  assert.equal((await engine.times(settings({ source: 'offline', geocodingProvider: 'open-meteo-commercial' }))).actualSource, 'offline');
  assert.deepEqual(calls, [], 'prayer calculation does not require a geocoding credential');
});

test('execute dispatches metadata/search/times and rejects unknown actions/fields', async () => {
  const { engine } = mockEngine(() => response({}));
  assert.deepEqual(await engine.execute({ action: 'status' }), engine.metadata());
  assert.deepEqual(await engine.execute({ action: 'search', query: 'Jakarta' }), []);
  assert.equal((await engine.execute({ action: 'times' }, settings({ source: 'offline' }))).actualSource, 'offline');
  await assert.rejects(engine.execute({ action: 'other' }), { code: 'INVALID_INPUT' });
  await assert.rejects(engine.execute({ action: 'times', source: 'offline' }, settings()), { code: 'INVALID_INPUT' });
  await assert.rejects(engine.execute({ action: 'status', endpoint: 'https://evil.test' }), { code: 'INVALID_INPUT' });
});
