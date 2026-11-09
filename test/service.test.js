import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, SOURCES, METHODS, GEOCODING_PROVIDERS } from '../core.js';
import { SalahService, SalahServiceError, createSalahRoute, createSalahTool, toolParameters, publicError, validateStoredSettings, MAX_REQUEST_BYTES, MAX_SEARCH_RESULTS } from '../service.js';
import { apply, inject, persistedSchema } from '../index.js';

const clone = value => structuredClone(value);
const publicGeocoding = { providers: GEOCODING_PROVIDERS, provider: 'open-meteo-public', keyConfigured: false, credentialRef: 'SALAH_OPEN_METEO_API_KEY' };
const jakarta = { label: 'Jakarta, Indonesia', latitude: -6.2088, longitude: 106.8456, timezone: 'Asia/Jakarta', myquranId: '1301' };
const schedule = { days: [{ date: '2026-11-05', prayers: [{ name: 'Fajr', time: 1793831400000 }] }], timezone: 'Asia/Jakarta', location: jakarta, requestedSource: 'aladhan', actualSource: 'offline', fallbackReason: 'Provider unavailable; using offline calculation.', fetchedAt: 1793865600000, method: 'MuslimWorldLeague', school: 'standard' };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture({ settings = DEFAULT_SETTINGS, save, engine, credentials } = {}) {
  let value = clone(settings);
  let closed = false;
  const saved = [];
  const domain = {
    global: { get: () => clone(value), async set(next) { if (closed) throw new Error('Domain already closed'); await save?.(next); value = clone(next); saved.push(clone(next)); } },
    async close() { closed = true; },
  };
  const calls = [];
  const mock = engine ?? {
    async search(query, options) { calls.push(['search', query, options]); return [jakarta]; },
    async times(settings, signal) { calls.push(['times', clone(settings), signal]); return clone(schedule); },
  };
  return { domain, service: new SalahService({ domain, engine: mock, getCredentials: () => credentials }), calls, saved, value: () => clone(value), closed: () => closed };
}
const owner = { admit: () => ({ peer: { principal: { kind: 'owner' } } }) };
function post(value, headers = {}) {
  return new Request('http://localhost/api/salah', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof value === 'string' ? value : JSON.stringify(value) });
}
async function rejected(promise, code) {
  await assert.rejects(promise, error => error instanceof SalahServiceError && error.code === code);
}

test('status returns saved settings and full source/method metadata with isolated copies', async () => {
  const f = fixture();
  await f.service.initialize();
  const result = await f.service.execute({ action: 'status' });
  assert.deepEqual(result, { settings: DEFAULT_SETTINGS, sources: SOURCES, methods: METHODS, geocoding: publicGeocoding });
  result.settings.source = 'offline'; result.sources[0].label = 'Changed';
  assert.equal((await f.service.execute({ action: 'status' })).settings.source, 'aladhan');
  assert.equal(SOURCES[0].label, 'AlAdhan');
  assert.deepEqual(f.saved, []);
});

test('public geocoding is the unchanged default and exposes safe provider options in status and times', async () => {
  const f = fixture();
  const status = await f.service.execute({ action: 'status' });
  assert.equal(status.geocoding.provider, 'open-meteo-public');
  assert.equal(status.geocoding.keyConfigured, false);
  assert.equal(status.geocoding.credentialRef, 'SALAH_OPEN_METEO_API_KEY');
  assert.deepEqual(status.geocoding.providers.map(({ id, requiresKey }) => ({ id, requiresKey })), [
    { id: 'open-meteo-public', requiresKey: false }, { id: 'open-meteo-commercial', requiresKey: true },
  ]);
  assert.match(status.geocoding.providers[0].description, /non-commercial/i);
  assert.match(status.geocoding.providers[1].description, /subscription/i);
  const times = await f.service.execute({ action: 'times', location: jakarta });
  assert.deepEqual(times.geocoding, status.geocoding);
  await f.service.execute({ action: 'search', query: 'Jakarta' });
  assert.equal(f.calls.at(-1)[2].geocodingProvider, 'open-meteo-public');
  assert.equal(f.calls.at(-1)[2].apiKey, undefined);
});

test('explicit commercial selection persists through the shared tool and exposes configured-only metadata', async () => {
  const refs = [];
  const credentials = {
    async describe(ref) { refs.push(ref); return { configured: true, source: '/private/credential-file', writable: true }; },
    async resolve(ref) { refs.push(ref); return { value: 'RUNTIME_SECRET', source: '/private/credential-file' }; },
  };
  const f = fixture({ credentials });
  const tool = createSalahTool(f.service);
  const result = await tool.execute({ action: 'configure', patch: { geocodingProvider: 'open-meteo-commercial' } }, { signal: new AbortController().signal });
  assert.equal(result.settings.geocodingProvider, 'open-meteo-commercial');
  assert.equal(result.settings.source, 'aladhan');
  assert.equal(result.geocoding.provider, 'open-meteo-commercial');
  assert.equal(result.geocoding.keyConfigured, true);
  assert.deepEqual(f.value(), result.settings);
  const times = await f.service.execute({ action: 'times', location: jakarta });
  assert.deepEqual(times.geocoding, result.geocoding);
  assert.deepEqual((await fixture({ settings: f.value(), credentials }).service.execute({ action: 'status' })).settings, result.settings);
  assert.ok(refs.length > 0 && refs.every(ref => ref === 'SALAH_OPEN_METEO_API_KEY'));
  assert.doesNotMatch(JSON.stringify({ result, times, saved: f.saved }), /RUNTIME_SECRET|credential-file|writable|"source":"\/private/);
  assert.deepEqual(tool.parameters.properties.patch.properties.geocodingProvider.enum, ['open-meteo-public', 'open-meteo-commercial']);
});

test('missing commercial credentials reject configuration atomically and never silently search public', async () => {
  for (const credentials of [undefined, { async describe() { return { configured: true }; }, async resolve() { return undefined; } }]) {
    const f = fixture({ credentials });
    const route = createSalahRoute(owner, f.service);
    const response = await route.fetch(post({ action: 'configure', patch: { source: 'offline', geocodingProvider: 'open-meteo-commercial' } }));
    assert.equal(response.status, 400);
    const failure = await response.json();
    assert.equal(failure.error.code, 'GEOCODING_KEY_REQUIRED');
    assert.match(failure.error.message, /SALAH_OPEN_METEO_API_KEY/);
    assert.match(failure.error.message, /subscription/i);
    assert.deepEqual(f.value(), DEFAULT_SETTINGS);
    assert.deepEqual(f.saved, []);
    assert.deepEqual(f.calls, []);
    await f.service.execute({ action: 'configure', patch: { source: 'offline' } });
    assert.equal(f.value().geocodingProvider, 'open-meteo-public');
    const commercial = fixture({ settings: { ...DEFAULT_SETTINGS, geocodingProvider: 'open-meteo-commercial' }, credentials });
    assert.equal((await commercial.service.execute({ action: 'status' })).settings.geocodingProvider, 'open-meteo-commercial');
    await rejected(commercial.service.execute({ action: 'search', query: 'Jakarta' }), 'GEOCODING_KEY_REQUIRED');
    assert.deepEqual(commercial.calls, []);
  }
});

test('an existing commercial selection without a key can explicitly switch to public without resolving credentials', async () => {
  let resolves = 0;
  const credentials = {
    async resolve() { resolves++; return undefined; },
    async describe(ref) { assert.equal(ref, 'SALAH_OPEN_METEO_API_KEY'); return { configured: false, writable: true }; },
  };
  const settings = { source: 'myquran', method: 'Singapore', school: 'hanafi', locationMode: 'manual', location: jakarta, geocodingProvider: 'open-meteo-commercial' };
  const f = fixture({ settings, credentials });
  await f.service.initialize();
  const initial = await f.service.execute({ action: 'status' });
  assert.deepEqual(initial.settings, settings);
  assert.equal(initial.geocoding.keyConfigured, false);
  assert.deepEqual(f.saved, []);
  const tool = createSalahTool(f.service);
  const result = await tool.execute({ action: 'configure', patch: { geocodingProvider: 'open-meteo-public' } }, { signal: new AbortController().signal });
  const expected = { ...settings, geocodingProvider: 'open-meteo-public' };
  assert.deepEqual(result.settings, expected);
  assert.equal(result.geocoding.provider, 'open-meteo-public');
  assert.equal(result.geocoding.keyConfigured, false);
  assert.deepEqual(f.value(), expected);
  assert.deepEqual(f.saved, [expected]);
  await f.service.execute({ action: 'search', query: 'Jakarta' });
  assert.equal(f.calls[0][2].source, 'myquran');
  assert.equal(f.calls[0][2].geocodingProvider, 'open-meteo-public');
  assert.equal(f.calls[0][2].apiKey, undefined);
  assert.equal(resolves, 0, 'recovering to public must not require the missing commercial credential');
});

test('invalid or failing Host credentials cannot commit commercial mode or leak credential-provider paths', async () => {
  for (const value of ['bad\nkey', 'x'.repeat(4097)]) {
    const f = fixture({ credentials: { async resolve() { return { value, source: '/private/key-file' }; } } });
    await rejected(f.service.execute({ action: 'configure', patch: { geocodingProvider: 'open-meteo-commercial' } }), 'GEOCODING_KEY_REQUIRED');
    assert.deepEqual(f.saved, []);
    assert.deepEqual(f.value(), DEFAULT_SETTINGS);
  }
  const credentials = {
    async describe() { throw new Error('SECRET /private/key-file'); },
    async resolve() { throw new Error('SECRET /private/key-file'); },
  };
  const f = fixture({ credentials });
  assert.equal((await f.service.execute({ action: 'status' })).geocoding.keyConfigured, false);
  assert.deepEqual((await f.service.execute({ action: 'search', query: 'Jakarta' })).results, [jakarta]);
  const response = await createSalahRoute(owner, f.service).fetch(post({ action: 'configure', patch: { geocodingProvider: 'open-meteo-commercial' } }));
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, 'GEOCODING_CREDENTIAL_UNAVAILABLE');
  assert.doesNotMatch(JSON.stringify(body), /SECRET|private\/key-file/);
  assert.deepEqual(f.saved, []);
});

test('current mode requires explicit transient location and never infers GPS', async () => {
  const f = fixture();
  assert.deepEqual(await f.service.execute({ action: 'times' }), { settings: DEFAULT_SETTINGS, sources: SOURCES, methods: METHODS, geocoding: publicGeocoding, schedule: null, needsLocation: true });
  assert.deepEqual(f.calls, []);
  const result = await f.service.execute({ action: 'times', location: jakarta });
  assert.equal(result.needsLocation, false);
  assert.deepEqual(result.schedule, schedule);
  assert.deepEqual(f.calls[0][1].location, jakarta);
  assert.equal(result.settings.location, null);
  assert.equal(f.value().location, null);
  assert.deepEqual(f.saved, []);
  assert.equal((await f.service.execute({ action: 'times' })).needsLocation, true);
});

test('manual location and related preferences commit atomically and drive schedule', async () => {
  const f = fixture();
  const status = await f.service.execute({ action: 'configure', patch: { source: 'myquran', method: 'Singapore', school: 'hanafi', locationMode: 'manual', location: jakarta } });
  assert.equal(f.saved.length, 1);
  assert.deepEqual(status.settings, f.value());
  const result = await f.service.execute({ action: 'times' });
  assert.equal(result.needsLocation, false);
  assert.deepEqual(f.calls[0][1], status.settings);
  await rejected(f.service.execute({ action: 'times', location: jakarta }), 'INVALID_ARGUMENT');
  const reload = fixture({ settings: f.value() });
  assert.deepEqual((await reload.service.execute({ action: 'status' })).settings, status.settings);
});

test('switching to current mode clears persisted exact coordinates', async () => {
  const f = fixture({ settings: { ...DEFAULT_SETTINGS, locationMode: 'manual', location: jakarta } });
  const result = await f.service.execute({ action: 'configure', patch: { locationMode: 'current', location: jakarta } });
  assert.equal(result.settings.location, null);
  assert.equal(f.saved[0].location, null);
});

test('initialization scrubs existing current-mode coordinates durably', async () => {
  const f = fixture({ settings: { ...DEFAULT_SETTINGS, location: jakarta } });
  await f.service.initialize();
  assert.equal(f.value().location, null);
  assert.equal(f.saved.length, 1);
});

test('concurrent partial writes serialize without losing either update', async () => {
  const firstStarted = deferred(), release = deferred();
  let writes = 0;
  const f = fixture({ save: async () => { if (++writes === 1) { firstStarted.resolve(); await release.promise; } } });
  const first = f.service.execute({ action: 'configure', patch: { source: 'offline' } });
  await firstStarted.promise;
  const second = f.service.execute({ action: 'configure', patch: { school: 'hanafi' } });
  const status = f.service.execute({ action: 'status' });
  release.resolve();
  const [a, b, c] = await Promise.all([first, second, status]);
  assert.equal(a.settings.source, 'offline');
  assert.equal(b.settings.source, 'offline');
  assert.equal(b.settings.school, 'hanafi');
  assert.deepEqual(c.settings, b.settings);
  assert.equal(f.saved.length, 2);
});

test('failed durable write leaves snapshot unchanged and does not poison later writes', async () => {
  let fail = true;
  const f = fixture({ save: () => { if (fail) { fail = false; throw new Error('/secret/private-storage'); } } });
  await rejected(f.service.execute({ action: 'configure', patch: { source: 'offline' } }), 'INTERNAL_ERROR');
  assert.equal((await f.service.execute({ action: 'status' })).settings.source, 'aladhan');
  const next = await f.service.execute({ action: 'configure', patch: { school: 'hanafi' } });
  assert.equal(next.settings.source, 'aladhan');
  assert.equal(next.settings.school, 'hanafi');
});

test('invalid atomic patch never partially commits valid fields', async () => {
  const f = fixture();
  await rejected(f.service.execute({ action: 'configure', patch: { school: 'hanafi', locationMode: 'manual', location: { ...jakarta, timezone: 'Not/AZone' } } }), 'INVALID_ARGUMENT');
  assert.equal(f.saved.length, 0);
  assert.deepEqual(f.value(), DEFAULT_SETTINGS);
});

test('search uses selected source or explicit override and returns bounded results', async () => {
  const f = fixture({ settings: { ...DEFAULT_SETTINGS, source: 'offline' } });
  const result = await f.service.execute({ action: 'search', query: ' Jakarta ' });
  assert.deepEqual(result, { results: [jakarta] });
  assert.equal(f.calls[0][1], 'Jakarta');
  assert.equal(f.calls[0][2].source, 'offline');
  await f.service.execute({ action: 'search', query: 'Jakarta', source: 'myquran' });
  assert.equal(f.calls[1][2].source, 'myquran');
  const many = fixture({ engine: { async search() { return Array.from({ length: 100 }, () => jakarta); } } });
  assert.equal((await many.service.execute({ action: 'search', query: 'Jakarta' })).results.length, MAX_SEARCH_RESULTS);
});

test('strict action/field validation rejects malformed and irrelevant parameters', async () => {
  const f = fixture();
  for (const args of [null, [], {}, { action: 'unknown' }, { action: 'status', query: 'Jakarta' }, { action: 'times', source: 'offline' }, { action: 'search', query: 'J' }, { action: 'search', query: 'x'.repeat(121) }, { action: 'search', query: 'Jakarta', source: 'https://evil.invalid' }, { action: 'configure', patch: {} }, { action: 'configure', patch: { gpsPermission: true } }, { action: 'configure', patch: { source: 'evil' } }, { action: 'configure', patch: { method: 'evil' } }, { action: 'configure', patch: { school: 'evil' } }, { action: 'configure', patch: { locationMode: 'evil' } }, { action: 'times', location: null }]) {
    await rejected(f.service.execute(args), 'INVALID_ARGUMENT');
  }
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.saved, []);
});

test('location validation rejects invalid coordinates, time zones, IDs and hidden fields', async () => {
  const f = fixture();
  for (const location of [{ ...jakarta, latitude: 91 }, { ...jakarta, longitude: -181 }, { ...jakarta, latitude: NaN }, { ...jakarta, longitude: Infinity }, { ...jakarta, label: '' }, { ...jakarta, label: 'x'.repeat(201) }, { ...jakarta, timezone: '+07:00' }, { ...jakarta, timezone: 'Unknown/Zone' }, { ...jakarta, myquranId: '1' }, { ...jakarta, myquranId: 1301 }, { ...jakarta, url: 'http://evil.invalid' }]) {
    await rejected(f.service.execute({ action: 'times', location }), 'INVALID_ARGUMENT');
  }
});

test('core error codes have safe actionable messages; unknown errors are not exposed', async () => {
  const f = fixture({ engine: { async times() { throw Object.assign(new Error('secret coordinates: -6,106'), { code: 'MYQURAN_CITY_REQUIRED' }); } } });
  await assert.rejects(f.service.execute({ action: 'times', location: jakarta }), error => error.code === 'MYQURAN_CITY_REQUIRED' && /MyQuran search/.test(error.message) && !error.message.includes('secret'));
  const bad = fixture({ engine: { async search() { throw new Error('Bearer SECRET /private/file'); } } });
  await assert.rejects(bad.service.execute({ action: 'search', query: 'Jakarta' }), error => publicError(error).code === 'INTERNAL_ERROR' && !error.message.includes('SECRET'));
  assert.deepEqual(publicError(new Error('secret')), { code: 'INTERNAL_ERROR', message: 'The Salah operation failed. Please try again.' });
});

test('engine result larger than output cap is rejected rather than dumped', async () => {
  const f = fixture({ engine: { async times() { return { ...schedule, fallbackReason: 'x'.repeat(70000) }; } } });
  await rejected(f.service.execute({ action: 'times', location: jakarta }), 'OUTPUT_TOO_LARGE');
});

test('cancellation interrupts pending credential discovery and resolution without exposing provider errors', async () => {
  for (const action of ['status', 'search']) {
    const controller = new AbortController(), started = deferred(), release = deferred();
    const pending = async () => { started.resolve(); return release.promise; };
    const f = fixture({ settings: { ...DEFAULT_SETTINGS, geocodingProvider: 'open-meteo-commercial' }, credentials: { describe: pending, resolve: pending } });
    let outcome = 'pending';
    const operation = f.service.execute(action === 'search' ? { action, query: 'Jakarta' } : { action }, { signal: controller.signal })
      .then(() => { outcome = 'success'; }, error => { outcome = error.code; });
    await started.promise;
    controller.abort(new Error('Provider failure SECRET /private/key-file'));
    await new Promise(resolve => setImmediate(resolve));
    try { assert.equal(outcome, 'ABORTED'); }
    finally { release.resolve(undefined); await operation; await f.service.close(); }
    assert.deepEqual(f.calls, []);
    assert.deepEqual(f.saved, []);
  }
});

test('close drains unresolved credential operations before late resolution without engine calls or saves', { timeout: 2000 }, async () => {
  for (const action of ['search', 'configure']) {
    const started = deferred(), release = deferred();
    let resolves = 0, describes = 0;
    const settings = { ...DEFAULT_SETTINGS, geocodingProvider: 'open-meteo-commercial' };
    const f = fixture({ settings, credentials: {
      async resolve(ref) { assert.equal(ref, 'SALAH_OPEN_METEO_API_KEY'); resolves++; started.resolve(); return release.promise; },
      async describe() { describes++; return { configured: true }; },
    } });
    const args = action === 'search' ? { action, query: 'Jakarta' } : { action, patch: { school: 'hanafi' } };
    const operation = f.service.execute(args);
    const cancellation = rejected(operation, 'ABORTED');
    await started.promise;
    try {
      await f.service.close();
      await cancellation;
      await f.domain.close();
      assert.equal(f.closed(), true, 'shutdown must drain while the external credential read is still pending');
      assert.deepEqual(f.calls, []);
      assert.deepEqual(f.saved, []);
      assert.deepEqual(f.value(), settings);
      await rejected(f.service.execute({ action: 'status' }), 'CLOSED');
    } finally { release.resolve({ value: 'LATE_RESOLVED_SECRET', source: '/private/late-key-file' }); }
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(resolves, 1);
    assert.equal(describes, 0);
    assert.deepEqual(f.calls, [], 'late credential completion must not start engine work after close');
    assert.deepEqual(f.saved, [], 'late credential completion must not restart a cancelled configuration');
    assert.deepEqual(f.value(), settings);
    await f.service.close();
  }
});

test('caller cancellation reaches the engine and prevents a successful result', async () => {
  const controller = new AbortController(), started = deferred();
  const f = fixture({ engine: { search(_query, { signal }) { started.resolve(signal); return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })); } } });
  const operation = f.service.execute({ action: 'search', query: 'Jakarta' }, { signal: controller.signal });
  const signal = await started.promise;
  controller.abort();
  assert.equal(signal.aborted, true);
  await rejected(operation, 'ABORTED');
});

test('close aborts and awaits in-flight engine work before domain may close', async () => {
  const started = deferred(), release = deferred();
  const f = fixture({ engine: { async times(_settings, signal) { started.resolve(signal); await release.promise; return schedule; } } });
  const operation = f.service.execute({ action: 'times', location: jakarta });
  const signal = await started.promise;
  let closed = false;
  const closing = f.service.close().then(async () => { await f.domain.close(); closed = true; });
  assert.equal(signal.aborted, true);
  await Promise.resolve();
  assert.equal(closed, false);
  await rejected(f.service.execute({ action: 'status' }), 'CLOSED');
  release.resolve();
  await rejected(operation, 'ABORTED');
  await closing;
  assert.equal(closed, true);
  await f.service.close();
});

test('close drains a started save and cancels queued saves', async () => {
  const started = deferred(), release = deferred();
  const f = fixture({ save: async () => { started.resolve(); await release.promise; } });
  const first = f.service.execute({ action: 'configure', patch: { source: 'offline' } });
  await started.promise;
  const second = f.service.execute({ action: 'configure', patch: { school: 'hanafi' } });
  await Promise.resolve();
  const close = f.service.close();
  release.resolve();
  await first;
  await rejected(second, 'ABORTED');
  await close;
  assert.equal(f.saved.length, 1);
  assert.equal(f.value().school, 'standard');
});

test('tool definition has explicit optional parameter constraints and delegates to same operations', async () => {
  const f = fixture();
  const tool = createSalahTool(f.service);
  const signal = new AbortController().signal;
  assert.equal(tool.name, 'salah_times');
  assert.equal(tool.parameters, toolParameters);
  assert.deepEqual(tool.parameters.required, ['action']);
  assert.equal(tool.parameters.additionalProperties, false);
  assert.equal(tool.parameters.properties.patch.additionalProperties, false);
  const direct = await f.service.execute({ action: 'search', query: 'Jakarta' });
  const viaTool = await tool.execute({ action: 'search', query: 'Jakarta' }, { signal });
  assert.deepEqual(viaTool, direct);
  assert.deepEqual(JSON.parse(tool.output.render({}, viaTool)[0].text), viaTool);
  assert.equal(tool.isConcurrencySafe({ action: 'configure' }), false);
  assert.equal(tool.isConcurrencySafe({ action: 'times' }), true);
});

test('API status, search, times and configure envelopes match tool/service values', async () => {
  const f = fixture(), route = createSalahRoute(owner, f.service), tool = createSalahTool(f.service);
  assert.equal(route.path, '/api/salah');
  assert.equal(route.requestBody, 'streaming');
  const status = await route.fetch(new Request('http://localhost/api/salah'));
  assert.equal(status.status, 200);
  assert.equal(status.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await status.json(), { ok: true, value: await f.service.execute({ action: 'status' }) });
  for (const args of [{ action: 'search', query: 'Jakarta' }, { action: 'times', location: jakarta }, { action: 'configure', patch: { locationMode: 'manual', location: jakarta } }]) {
    const response = await route.fetch(post(args));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, value: await tool.execute(args, { signal: new AbortController().signal }) });
  }
});

test('API enforces admission and owner authority before processing body', async () => {
  let executed = false;
  const service = { execute: async () => { executed = true; } };
  for (const [admission, status] of [[{ rejection: 401 }, 401], [{ rejection: 403 }, 403], [{ peer: { principal: { kind: 'guest' } } }, 403]]) {
    const route = createSalahRoute({ admit: ({ headers }) => { assert.ok(headers instanceof Headers); return admission; } }, service);
    const response = await route.fetch(post('not json'));
    assert.equal(response.status, status);
    assert.equal((await response.json()).ok, false);
  }
  assert.equal(executed, false);
});

test('API rejects cross-site, wrong media type, malformed JSON, and unknown actions', async () => {
  const route = createSalahRoute(owner, fixture().service);
  const cases = [
    [post({ action: 'status' }, { 'sec-fetch-site': 'cross-site' }), 403, 'CROSS_SITE'],
    [post({ action: 'status' }, { 'content-type': 'text/plain' }), 415, 'UNSUPPORTED_MEDIA_TYPE'],
    [post('{bad'), 400, 'INVALID_JSON'],
    [post({ action: 'bad' }), 400, 'INVALID_ARGUMENT'],
    [new Request('http://localhost/api/salah', { method: 'PUT' }), 405, 'METHOD_NOT_ALLOWED'],
  ];
  for (const [request, status, code] of cases) {
    const response = await route.fetch(request);
    assert.equal(response.status, status);
    const result = await response.json();
    assert.equal(result.ok, false);
    assert.equal(result.error.code, code);
    assert.ok(result.error.message.length <= 300);
  }
});

test('API caps declared size and actual UTF-8 bytes without buffering a huge stream', async () => {
  const route = createSalahRoute(owner, fixture().service);
  const declared = await route.fetch(post({ action: 'status' }, { 'content-length': String(MAX_REQUEST_BYTES + 1) }));
  assert.equal(declared.status, 413);
  const utf8 = await route.fetch(post(JSON.stringify({ action: 'search', query: 'é'.repeat(5000) })));
  assert.equal(utf8.status, 413);
  let cancelled = false, pulls = 0;
  const body = new ReadableStream({ pull(controller) { pulls++; controller.enqueue(new Uint8Array(4096).fill(32)); }, cancel() { cancelled = true; } });
  const streamed = new Request('http://localhost/api/salah', { method: 'POST', duplex: 'half', headers: { 'Content-Type': 'application/json' }, body });
  const response = await route.fetch(streamed);
  assert.equal(response.status, 413);
  assert.equal(cancelled, true);
  assert.ok(pulls <= 4);
});

test('unload aborts an unfinished streaming request body and drains the route', async () => {
  const started = deferred();
  let cancelled = false;
  const body = new ReadableStream({ pull() { started.resolve(); }, cancel() { cancelled = true; } });
  const f = fixture(), route = createSalahRoute(owner, f.service);
  const request = new Request('http://localhost/api/salah', { method: 'POST', duplex: 'half', headers: { 'Content-Type': 'application/json' }, body });
  const response = route.fetch(request);
  await started.promise;
  await Promise.resolve();
  await f.service.close();
  assert.equal(cancelled, true);
  const result = await response;
  assert.equal(result.status, 499);
  assert.equal((await result.json()).error.code, 'ABORTED');
  assert.deepEqual(f.saved, []);
  assert.deepEqual(f.calls, []);
});

test('configure can select MyQuran before a city is chosen', async () => {
  const f = fixture();
  const status = await f.service.execute({ action: 'configure', patch: { source: 'myquran' } });
  assert.equal(status.settings.source, 'myquran');
  assert.equal(status.settings.location, null);
  const result = await f.service.execute({ action: 'times' });
  assert.equal(result.needsLocation, true);
  assert.equal(result.schedule, null);
});

test('invalid location source results are provider errors rather than caller errors', async () => {
  const f = fixture({ engine: { async search() { return [{ ...jakarta, latitude: 91 }]; } } });
  await rejected(f.service.execute({ action: 'search', query: 'Jakarta' }), 'INVALID_RESULT');
});

test('legacy five-field preferences load without resetting prayer or location settings', async () => {
  const legacy = { source: 'myquran', method: 'Singapore', school: 'hanafi', locationMode: 'manual', location: jakarta };
  const expected = { ...legacy, geocodingProvider: 'open-meteo-public' };
  assert.equal(persistedSchema.safeParse(legacy).success, true);
  assert.deepEqual(validateStoredSettings(legacy), expected);
  const f = fixture({ settings: legacy });
  await f.service.initialize();
  assert.deepEqual((await f.service.execute({ action: 'status' })).settings, expected);
  assert.deepEqual(f.value(), legacy, 'loading legacy preferences must not rewrite user settings');
  await f.service.execute({ action: 'configure', patch: { school: 'standard' } });
  assert.deepEqual(f.value(), { ...expected, school: 'standard' });
});

test('storage schema requires exact complete settings and accepts defaults/manual location', () => {
  assert.deepEqual(validateStoredSettings(DEFAULT_SETTINGS), DEFAULT_SETTINGS);
  assert.equal(persistedSchema.safeParse(DEFAULT_SETTINGS).success, true);
  assert.equal(persistedSchema.safeParse({ ...DEFAULT_SETTINGS, locationMode: 'manual', location: jakarta }).success, true);
  for (const value of [{}, { ...DEFAULT_SETTINGS, mystery: true }, { ...DEFAULT_SETTINGS, source: 'evil' }, { ...DEFAULT_SETTINGS, location: { ...jakarta, latitude: 91 } }]) assert.equal(persistedSchema.safeParse(value).success, false);
});

test('Host optional credentials resolve freshly for each commercial operation and never enter public surfaces', async t => {
  let key = 'HOST_SECRET_A', resolves = 0, describes = 0;
  const fetched = [], disposers = [], registered = {};
  const credentials = {
    async resolve(ref) { assert.equal(ref, 'SALAH_OPEN_METEO_API_KEY'); resolves++; return key === null ? undefined : { value: key, source: '/private/credentials.json' }; },
    async describe(ref) { assert.equal(ref, 'SALAH_OPEN_METEO_API_KEY'); describes++; return { configured: key !== null, source: '/private/credentials.json', writable: true }; },
  };
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    fetched.push({ url, init });
    return Response.json({ results: [{ name: 'Jakarta', latitude: jakarta.latitude, longitude: jakarta.longitude, timezone: jakarta.timezone }] });
  });
  const f = fixture();
  const ctx = {
    storageDomain: { async open() { return f.domain; } },
    get(name) { assert.equal(name, 'credentials'); return credentials; },
    effect(factory) { const dispose = factory(); disposers.push(dispose); return dispose; },
    provide(name, service) { registered[name] = service; return () => { delete registered[name]; }; },
    tools: { register(tool) { registered.tool = tool; return () => { delete registered.tool; }; } },
    connection: { ...owner, fetch: { register(route) { registered.route = route; return () => { delete registered.route; }; } } },
  };
  t.after(async () => { for (const dispose of disposers.reverse()) await dispose(); });
  await apply(ctx);
  const service = registered.salah;
  const initial = await service.execute({ action: 'status' });
  assert.equal(initial.geocoding.keyConfigured, true);
  assert.equal(resolves, 0, 'status must describe, not resolve secrets');
  await registered.tool.execute({ action: 'configure', patch: { geocodingProvider: 'open-meteo-commercial' } }, { signal: new AbortController().signal });
  const first = await service.execute({ action: 'search', query: 'Jakarta' });
  assert.equal(new URL(fetched[0].url).searchParams.get('apikey'), 'HOST_SECRET_A');
  key = 'HOST_SECRET_B';
  const second = await service.execute({ action: 'search', query: 'Jakarta' });
  assert.equal(fetched.length, 2, 'rotation must not reuse another credential cache');
  assert.equal(new URL(fetched[1].url).searchParams.get('apikey'), 'HOST_SECRET_B');
  assert.equal(resolves, 3, 'configure plus two searches must each resolve');
  key = null;
  const missing = await service.execute({ action: 'status' });
  assert.equal(missing.geocoding.keyConfigured, false);
  assert.equal((await service.execute({ action: 'times' })).geocoding.keyConfigured, false);
  await rejected(service.execute({ action: 'search', query: 'Jakarta' }), 'GEOCODING_KEY_REQUIRED');
  assert.equal(fetched.length, 2);
  assert.ok(describes >= 4);
  assert.doesNotMatch(JSON.stringify({ initial, first, second, missing, preferences: f.value() }), /HOST_SECRET|private\/credentials|writable/);
});

test('index owns service/tool/route registrations and closes storage on unload', async () => {
  const f = fixture(), disposers = [], registered = {};
  const ctx = {
    storageDomain: { async open(spec) { assert.equal(spec.name, 'salah_preferences'); assert.equal(spec.version, 1); assert.deepEqual(spec.tables, {}); assert.deepEqual(spec.global.initial, DEFAULT_SETTINGS); return f.domain; } },
    effect(factory) { const dispose = factory(); disposers.push(dispose); return dispose; },
    provide(name, service) { registered[name] = service; return () => { delete registered[name]; }; },
    tools: { register(tool) { registered.tool = tool; return () => { delete registered.tool; }; } },
    connection: { ...owner, fetch: { register(route) { registered.route = route; return async () => { delete registered.route; }; } } },
  };
  assert.deepEqual(inject, ['storageDomain', 'tools', 'connection']);
  await apply(ctx);
  assert.equal(registered.tool.name, 'salah_times');
  assert.equal(registered.route.path, '/api/salah');
  const service = registered.salah;
  assert.deepEqual(await service.execute({ action: 'status' }), { settings: DEFAULT_SETTINGS, sources: SOURCES, methods: METHODS, geocoding: publicGeocoding });
  await Promise.all(disposers.reverse().map(dispose => dispose()));
  assert.equal(f.closed(), true);
  assert.deepEqual(registered, {});
  await rejected(service.execute({ action: 'status' }), 'CLOSED');
});
