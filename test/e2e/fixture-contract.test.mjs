import test from 'node:test';
import assert from 'node:assert/strict';
import { createSalahFixture, CITY, MYQURAN_CITY } from './salah-api.mjs';
import { DEFAULT_SETTINGS, SOURCES, METHODS, GEOCODING_PROVIDERS } from '../../core.js';

// Public API contract tests against the fixture's REAL SalahService. No browser,
// DOM, React, Host storage, environment credentials, or provider network exists.
test('browser fixture rejects missing-key commercial selection atomically, like production service', async t => {
  const fixture = createSalahFixture(); t.after(() => fixture.close());
  const before = (await fixture.request({ action: 'status' })).body.value;
  assert.deepEqual(before.settings, DEFAULT_SETTINGS);
  assert.deepEqual(before.sources, SOURCES); assert.deepEqual(before.methods, METHODS);
  assert.deepEqual(before.geocoding.providers, GEOCODING_PROVIDERS);
  const result = await fixture.request({ action: 'configure', patch: { geocodingProvider: 'open-meteo-commercial' } });
  assert.equal(result.status, 400);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.error.code, 'GEOCODING_KEY_REQUIRED');
  assert.deepEqual((await fixture.request({ action: 'status' })).body.value.settings, before.settings);
  assert.deepEqual(fixture.writes, []);
});

test('previously configured commercial mode survives synthetic key deletion and requires explicit public recovery', async t => {
  const fixture = createSalahFixture(); t.after(() => fixture.close());
  fixture.credentials.setConfigured(true);
  assert.equal((await fixture.request({ action: 'configure', patch: { geocodingProvider: 'open-meteo-commercial' } })).body.ok, true);
  fixture.credentials.setConfigured(false);
  const status = (await fixture.request({ action: 'status' })).body.value;
  assert.equal(status.settings.geocodingProvider, 'open-meteo-commercial');
  assert.equal(status.geocoding.keyConfigured, false);
  const search = await fixture.request({ action: 'search', query: 'Jakarta' });
  assert.equal(search.body.error.code, 'GEOCODING_KEY_REQUIRED');
  assert.equal(fixture.engineCalls.filter(call => call.action === 'search').length, 0, 'No hidden public/provider request');
  assert.equal((await fixture.request({ action: 'configure', patch: { geocodingProvider: 'open-meteo-public' } })).body.ok, true);
  assert.deepEqual((await fixture.request({ action: 'search', query: 'Jakarta' })).body.value.results, [CITY]);
  assert.doesNotMatch(JSON.stringify(status), /synthetic-browser-regression-not-a-real-key/);
});

test('race and pending-retry controls still execute production service reads and schedules', { timeout: 5000 }, async t => {
  const fixture = createSalahFixture(); t.after(() => fixture.close());
  await fixture.request({ action: 'configure', patch: { locationMode: 'manual', location: CITY } });
  fixture.beforeNext('status', () => fixture.hostConfigure({ method: 'Singapore' }));
  assert.equal((await fixture.request({ action: 'status' })).body.value.settings.method, 'Singapore');
  const gate = fixture.holdNext('times');
  const result = fixture.request({ action: 'times' });
  await gate.started;
  assert.equal(gate.isStarted, true);
  assert.equal(fixture.engineCalls.filter(call => call.action === 'times').length, 0, 'Pending request cannot prematurely calculate/fulfill.');
  gate.release();
  assert.equal((await result).body.value.schedule.method, 'Singapore');
  assert.equal(fixture.engineCalls.filter(call => call.action === 'times').length, 1);
  const writes = fixture.writes.length;
  const seed = { ...fixture.settings(), source: 'myquran', method: 'Singapore', school: 'hanafi', location: MYQURAN_CITY };
  delete seed.geocodingProvider;
  await fixture.seed(seed);
  const legacy = (await fixture.request({ action: 'status' })).body.value.settings;
  assert.equal(legacy.source, 'myquran'); assert.equal(legacy.method, 'Singapore'); assert.equal(legacy.school, 'hanafi');
  assert.equal(fixture.writes.length, writes, 'Loading a legacy snapshot must not configure/save default choices.');
});

test('generic city cannot masquerade as MyQuran directory identity', async t => {
  const fixture = createSalahFixture(); t.after(() => fixture.close());
  const generic = (await fixture.request({ action: 'search', query: 'Jakarta', source: 'aladhan' })).body.value.results[0];
  assert.equal(Object.hasOwn(generic, 'myquranId'), false);
  await fixture.request({ action: 'configure', patch: { locationMode: 'manual', location: generic, source: 'myquran' } });
  assert.equal((await fixture.request({ action: 'times' })).body.error.code, 'MYQURAN_CITY_REQUIRED');
  const directory = (await fixture.request({ action: 'search', query: 'Jakarta', source: 'myquran' })).body.value.results[0];
  assert.deepEqual(directory, MYQURAN_CITY);
  await fixture.request({ action: 'configure', patch: { locationMode: 'manual', location: directory } });
  const schedule = (await fixture.request({ action: 'times' })).body.value.schedule;
  assert.equal(schedule.actualSource, 'myquran'); assert.equal(schedule.method, 'MyQuran'); assert.equal(schedule.school, 'provider');
});

test('closing owned fixture releases held requests before production service closes', { timeout: 5000 }, async () => {
  const fixture = createSalahFixture();
  const gate = fixture.holdNext('status');
  const pending = fixture.request({ action: 'status' });
  await gate.started;
  await fixture.close();
  const response = await pending;
  assert.ok(response.body.ok || response.body.error.code === 'CLOSED' || response.body.error.code === 'ABORTED');
});
