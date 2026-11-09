// Actual production service dispatch; ONLY storage, credentials and provider
// engine are synthetic in-memory dependencies. Real Harness + installed client.
// This is still NOT full Host/provider-network end-to-end coverage.
import { SalahService, SalahServiceError, publicError } from '../../service.js';
import { DEFAULT_SETTINGS } from '../../core.js';
export const CITY = Object.freeze({ label: 'Jakarta, Indonesia', latitude: -6.2, longitude: 106.8167, timezone: 'Asia/Jakarta' });
export const MYQURAN_CITY = Object.freeze({ ...CITY, myquranId: '1301' });
export const SYNTHETIC_GPS = Object.freeze({ latitude: 1.3521, longitude: 103.8198 });
const names = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const hours = ['04:30', '05:45', '12:00', '15:15', '18:00', '19:15'];
const copy = value => structuredClone(value);
const dateInZone = (now, zone) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
function datePlus(date, days) { return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10); }
function syntheticPrayerTime(date, clock, zone) {
  const [year, month, day] = date.split('-').map(Number), [hour, minute] = clock.split(':').map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  const format = new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  let epoch = target;
  for (let attempt = 0; attempt < 5; attempt++) {
    const p = Object.fromEntries(format.formatToParts(epoch).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
    const delta = target - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    if (delta === 0) return epoch;
    epoch += delta;
  }
  throw new Error('Synthetic schedule cannot resolve this local fixture time.');
}

export function createSalahFixture({ now = () => Date.now(), initialSettings = DEFAULT_SETTINGS } = {}) {
  let saved = copy(initialSettings), credentialConfigured = false;
  const calls = [], engineCalls = [], violations = [], writes = [], hooks = [], held = new Set();
  const control = { failTimes: false, fallback: false, failSearch: false, fetchedAtOffset: 0 };
  const credentials = {
    setConfigured(value) { credentialConfigured = value === true; },
    async describe() { return { configured: credentialConfigured }; },
    async resolve() { return credentialConfigured ? { value: 'synthetic-browser-regression-not-a-real-key' } : undefined; },
  };
  const domain = { global: {
    get: () => copy(saved),
    async set(value) { saved = copy(value); writes.push(copy(value)); },
  } };
  const engine = {
    async search(query, { source, geocodingProvider }) {
      engineCalls.push({ action: 'search', query, source, geocodingProvider });
      if (control.failSearch) throw new SalahServiceError('NETWORK_ERROR', 'City search is unavailable. Try again.', 503);
      return [copy(source === 'myquran' ? MYQURAN_CITY : CITY)];
    },
    async times(settings) {
      engineCalls.push({ action: 'times', settings: copy(settings) });
      if (settings.source === 'myquran' && !settings.location.myquranId) throw new SalahServiceError('MYQURAN_CITY_REQUIRED', 'Select an Indonesian city from MyQuran search before loading prayer times.', 400);
      if (control.failTimes) throw new SalahServiceError('NETWORK_ERROR', 'Prayer times are unavailable. Try again.', 503);
      const date = dateInZone(now(), settings.location.timezone), previous = datePlus(date, -1);
      const prayer = (day, index) => ({ name: names[index], time: syntheticPrayerTime(day, hours[index], settings.location.timezone) });
      const actualSource = control.fallback ? 'offline' : settings.source;
      return {
        requestedSource: settings.source, actualSource,
        ...(control.fallback ? { fallbackReason: 'Synthetic provider unavailable' } : {}),
        method: actualSource === 'myquran' ? 'MyQuran' : settings.method,
        school: actualSource === 'myquran' ? 'provider' : settings.school,
        timezone: settings.location.timezone, location: copy(settings.location), fetchedAt: now() - control.fetchedAtOffset,
        days: [date, datePlus(date, 1)].map(day => ({ date: day, prayers: names.map((_, index) => prayer(day, index)) })),
        previousPrayer: { ...prayer(previous, 5), date: previous },
      };
    },
  };
  const makeService = () => new SalahService({ domain, engine, getCredentials: () => credentials });
  let service = makeService();
  async function request(args) {
    calls.push(copy(args));
    try {
      const index = hooks.findIndex(item => item.action === args?.action);
      if (index >= 0) await hooks.splice(index, 1)[0].run();
      const value = await service.execute(args);
      return { status: 200, body: { ok: true, value } };
    } catch (error) {
      if (!(error instanceof SalahServiceError)) violations.push('Unexpected fixture dependency failure.');
      return { status: error instanceof SalahServiceError ? error.status : 500, body: { ok: false, error: publicError(error) } };
    }
  }
  async function route(route) {
    let response;
    try {
      if (route.request().method() !== 'POST') throw new Error('Only POST Salah requests are allowed.');
      response = await request(route.request().postDataJSON());
    } catch {
      violations.push('Unexpected Salah transport contract.');
      response = { status: 500, body: { ok: false, error: { code: 'FIXTURE_CONTRACT', message: 'Unexpected Salah transport; test must fail.' } } };
    }
    // Never continue/fetch: this route cannot reach real Host settings/providers.
    await route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.body) });
  }
  function beforeNext(action, run) { hooks.push({ action, run }); }
  function holdNext(action) {
    let release, started, isStarted = false;
    const wait = new Promise(resolve => { release = resolve; });
    const gate = { started: new Promise(resolve => { started = resolve; }), get isStarted() { return isStarted; }, release: () => { release(); held.delete(gate); } };
    held.add(gate);
    beforeNext(action, async () => { isStarted = true; started(); await wait; });
    return gate;
  }
  return {
    request, route, calls, engineCalls, violations, writes, control, credentials, beforeNext, holdNext,
    settings: () => copy(saved),
    // Simulate another genuine client/tool writing shared service preferences.
    hostConfigure: patch => service.execute({ action: 'configure', patch }),
    // Seed legacy saved preferences for a new real page load; no configure action.
    async seed(settings) { await service.close(); saved = copy(settings); service = makeService(); },
    releasePending() { for (const gate of held) gate.release(); },
    async close() { for (const gate of held) gate.release(); await service.close(); },
  };
}
