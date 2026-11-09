import { createHmac, randomBytes } from 'node:crypto';
import { Coordinates, PrayerTimes, CalculationMethod, Madhab, PolarCircleResolution } from 'adhan';

// Only these fixed HTTPS origins and paths are contacted. No IP geolocation.
const ALADHAN = 'https://api.aladhan.com/v1';
const MYQURAN = 'https://api.myquran.com/v2/sholat';
const GEOCODERS = Object.freeze({
  'open-meteo-public': 'https://geocoding-api.open-meteo.com/v1/search',
  'open-meteo-commercial': 'https://customer-geocoding-api.open-meteo.com/v1/search',
});
const HTTP_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_CACHE_ENTRIES = 64;
const PRAYER_NAMES = Object.freeze(['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);
const MYQURAN_NAMES = ['subuh', 'terbit', 'dzuhur', 'ashar', 'maghrib', 'isya'];
const HOUR = 3600000;

export const DEFAULT_SETTINGS = Object.freeze({
  source: 'aladhan', method: 'MuslimWorldLeague', school: 'standard', locationMode: 'current', location: null,
  geocodingProvider: 'open-meteo-public',
});
export const GEOCODING_PROVIDERS = Object.freeze([
  Object.freeze({ id: 'open-meteo-public', label: 'Open-Meteo Public', description: 'Public city search for non-commercial use, subject to Open-Meteo rate limits and attribution terms. No API key required.', requiresKey: false }),
  Object.freeze({ id: 'open-meteo-commercial', label: 'Open-Meteo Commercial', description: 'Licensed commercial city search using the customer endpoint. Requires an active Open-Meteo subscription and a Host-managed API key.', requiresKey: true }),
]);
export const SOURCES = Object.freeze([
  Object.freeze({ id: 'aladhan', label: 'AlAdhan', description: 'Calculated prayer times for locations worldwide. Falls back to Adhan with the selected method and Asr convention if unavailable.' }),
  Object.freeze({ id: 'myquran', label: 'MyQuran', description: 'Published Indonesian city schedules with provider-controlled method and Asr convention. Select a MyQuran city. If unavailable, Adhan uses the selected method and Asr convention.' }),
  Object.freeze({ id: 'offline', label: 'Adhan', description: 'Prayer times calculated on the Host with the selected method and Asr convention, without prayer-time network requests. City search still uses online services.' }),
]);
export const METHODS = Object.freeze([
  ['MuslimWorldLeague', 'Muslim World League', 3],
  ['Singapore', 'Singapore', 11],
  ['NorthAmerica', 'North America (ISNA)', 2],
  ['Egyptian', 'Egyptian General Authority of Survey', 5],
  ['Karachi', 'University of Islamic Sciences, Karachi', 1],
  ['UmmAlQura', 'Umm al-Qura, Makkah', 4],
  ['Dubai', 'Dubai', 16],
  ['Qatar', 'Qatar', 10],
  ['Kuwait', 'Kuwait', 9],
  ['MoonsightingCommittee', 'Moonsighting Committee Worldwide', 15],
  ['Turkey', 'Turkey', 13],
  ['Tehran', 'University of Tehran', 7],
].map(([id, label, aladhan]) => Object.freeze({ id, label, aladhan })));

const engineErrors = new WeakSet();
function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  engineErrors.add(error);
  return error;
}
function plain(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function object(value, label) {
  if (!plain(value)) throw fail('INVALID_INPUT', `${label} must be an object.`);
  return value;
}
function keys(value, allowed, label) {
  object(value, label);
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw fail('INVALID_INPUT', `${label} contains an unknown field.`);
}
function text(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
    throw fail('INVALID_INPUT', `${label} must be non-empty text of at most ${max} characters.`);
  }
  return value.trim();
}
function choice(value, options, label) {
  if (!options.includes(value)) throw fail('INVALID_INPUT', `Unsupported ${label}.`);
  return value;
}
function coordinate(value, max, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > max) throw fail('INVALID_INPUT', `${label} must be a finite number between ${-max} and ${max}.`);
  return value;
}
function providerCoordinate(value, max, label) {
  if (typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) value = Number(value);
  return coordinate(value, max, label);
}
function timezone(value) {
  const zone = text(value, 'Time zone', 100);
  // Intl accepts UTC and IANA aliases. Reject offset-only identifiers even on newer runtimes.
  if (zone !== 'UTC' && !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(zone)) throw fail('INVALID_INPUT', 'Enter an IANA time zone, such as Asia/Jakarta.');
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(0); }
  catch { throw fail('INVALID_INPUT', 'Enter a supported IANA time zone, such as Asia/Jakarta.'); }
  return zone;
}
function location(value) {
  keys(value, ['label', 'latitude', 'longitude', 'timezone', 'myquranId'], 'Location');
  const result = {
    label: text(value.label, 'Location label'),
    latitude: coordinate(value.latitude, 90, 'Latitude'),
    longitude: coordinate(value.longitude, 180, 'Longitude'),
    timezone: timezone(value.timezone),
  };
  if (Object.hasOwn(value, 'myquranId')) {
    if (typeof value.myquranId !== 'string' || !/^\d{4}$/.test(value.myquranId)) throw fail('INVALID_INPUT', 'MyQuran city ID must be four digits.');
    result.myquranId = value.myquranId;
  }
  return result;
}

/** Full validation fills defaults; partial validation returns only supplied keys (caller merges). */
export function validateSettings(input, { partial = false } = {}) {
  keys(input, Object.keys(DEFAULT_SETTINGS), 'Settings');
  const result = partial ? {} : { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(input)) {
    const value = input[key];
    if (key === 'source') result.source = choice(value, SOURCES.map((item) => item.id), 'source');
    if (key === 'geocodingProvider') result.geocodingProvider = choice(value, GEOCODING_PROVIDERS.map((item) => item.id), 'geocoding provider');
    if (key === 'method') result.method = choice(value, METHODS.map((item) => item.id), 'calculation method');
    if (key === 'school') result.school = choice(value, ['standard', 'hanafi'], 'school');
    if (key === 'locationMode') result.locationMode = choice(value, ['current', 'manual'], 'location mode');
    if (key === 'location') result.location = value === null ? null : location(value);
  }
  return result;
}

const formatters = new Map();
function formatter(zone) {
  if (!formatters.has(zone)) {
    if (formatters.size >= MAX_CACHE_ENTRIES) formatters.delete(formatters.keys().next().value);
    formatters.set(zone, new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }));
  }
  return formatters.get(zone);
}
function parts(epoch, zone) {
  return Object.fromEntries(formatter(zone).formatToParts(epoch).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
}
function localDate(epoch, zone) {
  const p = parts(epoch, zone);
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
function dateStamp(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw fail('INVALID_DATA', 'Provider date is invalid.');
  const epoch = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(epoch) || new Date(epoch).toISOString().slice(0, 10) !== date) throw fail('INVALID_DATA', 'Provider date is invalid.');
  return epoch;
}
function addDays(date, amount) {
  return new Date(dateStamp(date) + amount * 24 * HOUR).toISOString().slice(0, 10);
}
function apiDate(date) { return date.split('-').reverse().join('-'); }

// Enumerate actual offsets around the date, not a guessed fixed offset. A repeated
// DST wall time resolves to the earlier occurrence; a skipped wall time is rejected.
function wallEpoch(date, clock, zone) {
  const match = /^(\d{2}):(\d{2})(?:\s+\([A-Za-z0-9_+:/.-]+\))?$/.exec(clock);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw fail('INVALID_DATA', 'Provider prayer time is invalid.');
  const wall = dateStamp(date) + Number(match[1]) * HOUR + Number(match[2]) * 60000;
  const offsets = new Set();
  for (let delta = -36; delta <= 36; delta += 6) {
    const sample = wall + delta * HOUR;
    const p = parts(sample, zone);
    offsets.add(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - sample);
  }
  const candidates = [...offsets].map((offset) => wall - offset).filter((epoch) => {
    const p = parts(epoch, zone);
    return localDate(epoch, zone) === date && p.hour === Number(match[1]) && p.minute === Number(match[2]);
  });
  if (!candidates.length) throw fail('INVALID_DATA', 'The provider returned a prayer time skipped by a daylight saving time (DST) transition.');
  return Math.min(...candidates);
}
function prayerRows(date, clocks, zone) {
  object(clocks, 'Provider prayer times');
  const rows = PRAYER_NAMES.map((name) => {
    if (typeof clocks[name] !== 'string') throw fail('INVALID_DATA', `Provider is missing ${name}.`);
    return { name, time: wallEpoch(date, clocks[name], zone) };
  });
  // Some high-latitude timetables legitimately place Isha after local midnight.
  if (rows[5].time <= rows[4].time && rows[5].time <= rows[0].time) rows[5].time = wallEpoch(addDays(date, 1), clocks.Isha, zone);
  checkRows(rows);
  return rows;
}
function checkRows(rows) {
  if (rows.some((row, index) => !Number.isFinite(row.time) || (index > 0 && row.time <= rows[index - 1].time))) {
    throw fail('INVALID_DATA', 'Prayer times are invalid or out of order.');
  }
  if (rows[5].time - rows[0].time >= 30 * HOUR) throw fail('INVALID_DATA', 'Prayer day is implausibly long.');
}
function abortError(signal) {
  return signal?.reason instanceof Error ? signal.reason : fail('ABORTED', 'Request cancelled.');
}
function checkAbort(signal) { if (signal?.aborted) throw abortError(signal); }
function clone(value) { return structuredClone(value); }
function providerData(callback) {
  try { return callback(); }
  catch (error) {
    if (error.code === 'INVALID_DATA') throw error;
    throw fail('INVALID_DATA', 'Provider returned malformed data.');
  }
}

/** Earliest future obligatory prayer across all supplied days; Sunrise is display-only. */
export function nextPrayer(days, now = Date.now(), precedingPrayer = null) {
  if (!Array.isArray(days) || typeof now !== 'number' || !Number.isFinite(now)) throw fail('INVALID_INPUT', 'Invalid countdown input.');
  if (precedingPrayer !== null && (!plain(precedingPrayer) || precedingPrayer.name !== 'Isha' || !Number.isFinite(precedingPrayer.time) || typeof precedingPrayer.date !== 'string')) {
    throw fail('INVALID_INPUT', 'Invalid preceding prayer.');
  }
  let next = precedingPrayer && precedingPrayer.time > now
    ? { name: 'Isha', time: precedingPrayer.time, date: precedingPrayer.date, remainingMs: precedingPrayer.time - now } : null;
  for (const day of days) {
    if (!plain(day) || !Array.isArray(day.prayers)) throw fail('INVALID_INPUT', 'Invalid prayer day.');
    for (const prayer of day.prayers) {
      if (!PRAYER_NAMES.includes(prayer?.name) || !Number.isFinite(prayer.time)) throw fail('INVALID_INPUT', 'Invalid prayer row.');
      if (prayer.name !== 'Sunrise' && prayer.time > now && (!next || prayer.time < next.time)) {
        next = { name: prayer.name, time: prayer.time, date: day.date, remainingMs: prayer.time - now };
      }
    }
  }
  return next;
}

function latestElapsedPrayer(day, now) {
  let latest = null;
  for (const prayer of day.prayers) {
    if (prayer.name !== 'Sunrise' && prayer.time <= now && (!latest || prayer.time > latest.time)) latest = prayer;
  }
  return latest ? { name: latest.name, time: latest.time, date: day.date } : null;
}

export class SalahEngine {
  #geocodingCacheSalt = randomBytes(32);

  constructor({ fetchImpl = globalThis.fetch, now = () => Date.now() } = {}) {
    if (typeof fetchImpl !== 'function' || typeof now !== 'function') throw fail('INVALID_INPUT', 'fetchImpl and now must be functions.');
    this.fetchImpl = fetchImpl;
    this.now = now;
    this._cache = new Map();
  }

  metadata() { return clone({ sources: SOURCES, methods: METHODS, defaults: DEFAULT_SETTINGS }); }

  _get(key) {
    const entry = this._cache.get(key);
    if (!entry) return null;
    if (entry.expires <= this.now()) { this._cache.delete(key); return null; }
    this._cache.delete(key);
    this._cache.set(key, entry);
    return clone(entry.value);
  }

  _put(key, value, ttl) {
    this._cache.delete(key);
    this._cache.set(key, { value: clone(value), expires: this.now() + ttl });
    while (this._cache.size > MAX_CACHE_ENTRIES) this._cache.delete(this._cache.keys().next().value);
    return value;
  }

  async _json(url, signal) {
    checkAbort(signal);
    // A second guard makes future path changes unable to introduce dynamic hosts.
    const parsed = new URL(url);
    const allowed = (parsed.origin === 'https://api.aladhan.com' && /^\/v1\/timings\/\d{2}-\d{2}-\d{4}$/.test(parsed.pathname))
      || (parsed.origin === 'https://api.myquran.com' && /^\/v2\/sholat\/(?:kota\/semua|jadwal\/\d{4}\/\d{4}\/\d{2}\/\d{2})$/.test(parsed.pathname))
      || (['https://geocoding-api.open-meteo.com', 'https://customer-geocoding-api.open-meteo.com'].includes(parsed.origin) && parsed.pathname === '/v1/search');
    if (!allowed || parsed.username || parsed.password || parsed.hash
      || (parsed.searchParams.has('apikey') && parsed.origin !== 'https://customer-geocoding-api.open-meteo.com')) throw fail('INVALID_INPUT', 'Unapproved provider endpoint.');
    const controller = new AbortController();
    let timer;
    let onAbort;
    const cancelled = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = fail('TIMEOUT', 'Provider request timed out.');
        controller.abort(error);
        reject(error);
      }, HTTP_TIMEOUT_MS);
      onAbort = () => { controller.abort(abortError(signal)); reject(abortError(signal)); };
      signal?.addEventListener('abort', onAbort, { once: true });
    });
    try {
      return await Promise.race([cancelled, (async () => {
        const response = await this.fetchImpl(parsed.toString(), {
          signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' },
        });
        if (!response || response.ok !== true) throw fail('HTTP_ERROR', `Provider HTTP request failed${Number.isInteger(response?.status) ? ` (${response.status})` : ''}.`);
        const declared = Number(response.headers?.get?.('content-length'));
        if (declared > MAX_BODY_BYTES) throw fail('INVALID_DATA', 'Provider response is too large.');
        let body;
        if (response.body?.getReader) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let bytes = 0;
          let output = '';
          try {
            while (true) {
              const chunk = await reader.read();
              if (chunk.done) break;
              bytes += chunk.value.byteLength;
              if (bytes > MAX_BODY_BYTES) { await reader.cancel(); throw fail('INVALID_DATA', 'Provider response is too large.'); }
              output += decoder.decode(chunk.value, { stream: true });
            }
            body = output + decoder.decode();
          } finally { reader.releaseLock(); }
        } else {
          body = await response.text();
          if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) throw fail('INVALID_DATA', 'Provider response is too large.');
        }
        try { return JSON.parse(body); }
        catch { throw fail('INVALID_DATA', 'Provider response is not valid JSON.'); }
      })()]);
    } catch (error) {
      if (signal?.aborted) throw abortError(signal);
      if (engineErrors.has(error) && ['TIMEOUT', 'HTTP_ERROR', 'INVALID_DATA'].includes(error?.code)) throw error;
      throw fail('NETWORK_ERROR', 'Provider request could not be completed.');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      controller.abort();
    }
  }

  async _geocode(query, signal, indonesiaOnly = false, { geocodingProvider = 'open-meteo-public', apiKey } = {}) {
    // Keys never enter caches. A private, engine-local HMAC isolates rotated credentials.
    const scope = geocodingProvider === 'open-meteo-commercial'
      ? createHmac('sha256', this.#geocodingCacheSalt).update(apiKey).digest('hex') : 'public';
    const key = `geo:${geocodingProvider}:${scope}:${indonesiaOnly}:${query.toLocaleLowerCase('en')}`;
    const cached = this._get(key);
    if (cached) return cached;
    const params = new URLSearchParams({ name: query, count: '8', language: 'en', format: 'json' });
    if (indonesiaOnly) params.set('countryCode', 'ID');
    if (geocodingProvider === 'open-meteo-commercial') params.set('apikey', apiKey);
    const data = await this._json(`${GEOCODERS[geocodingProvider]}?${params}`, signal);
    const locations = providerData(() => {
      object(data, 'Geocoder response');
      if (data.error) throw fail('INVALID_DATA', 'Geocoder returned an error.');
      if (data.results === undefined) return [];
      if (!Array.isArray(data.results) || data.results.length > 100) throw fail('INVALID_DATA', 'Geocoder results are invalid.');
      return data.results.filter((item) => !indonesiaOnly || item.country_code === 'ID').slice(0, 8).map((item) => location({
        label: [...new Set([text(item.name, 'City name'), item.admin1, item.country].filter(Boolean).map((value) => text(value, 'Place name')))].join(', '),
        latitude: item.latitude, longitude: item.longitude, timezone: item.timezone,
      }));
    });
    if (geocodingProvider === 'open-meteo-commercial') {
      const forms = [apiKey, encodeURIComponent(apiKey), new URLSearchParams({ apikey: apiKey }).toString().slice('apikey='.length)];
      if (locations.some(item => [item.label, item.timezone].some(value => forms.some(secret => value.includes(secret))))) {
        throw fail('INVALID_DATA', 'Geocoder returned an invalid location.');
      }
    }
    return this._put(key, locations, HOUR);
  }

  async search(query, { source = 'aladhan', geocodingProvider = 'open-meteo-public', apiKey, signal } = {}) {
    query = text(query, 'Search query', 120);
    if (query.length < 2) throw fail('INVALID_INPUT', 'Enter at least two characters to search.');
    choice(source, SOURCES.map((item) => item.id), 'source');
    choice(geocodingProvider, GEOCODING_PROVIDERS.map((item) => item.id), 'geocoding provider');
    checkAbort(signal);
    if (geocodingProvider === 'open-meteo-commercial'
      && (typeof apiKey !== 'string' || !apiKey.trim() || apiKey.length > 4096 || /[\u0000-\u001f\u007f]/.test(apiKey))) {
      throw fail('GEOCODING_KEY_REQUIRED', 'Commercial geocoding requires an active Open-Meteo subscription and the Host credential SALAH_OPEN_METEO_API_KEY.');
    }
    if (source !== 'myquran') return this._geocode(query, signal, false, { geocodingProvider, apiKey });
    let cities = this._get('myquran:cities');
    if (!cities) {
      const data = await this._json(`${MYQURAN}/kota/semua`, signal);
      cities = providerData(() => {
        if (data?.status !== true || !Array.isArray(data.data) || !data.data.length || data.data.length > 2000) throw fail('INVALID_DATA', 'MyQuran city directory is invalid.');
        return data.data.map((item) => ({ id: /^\d{4}$/.test(item.id) && typeof item.id === 'string' ? item.id : (() => { throw fail('INVALID_DATA', 'MyQuran city ID is invalid.'); })(), label: text(item.lokasi, 'City label') }));
      });
      this._put('myquran:cities', cities, 24 * HOUR);
    }
    const normalized = query.toLocaleLowerCase('id');
    const matches = cities.filter((city) => city.label.toLocaleLowerCase('id').includes(normalized)).slice(0, 5);
    const results = await Promise.all(matches.map(async (city) => {
      const name = city.label.replace(/^(?:KOTA|KAB\.)\s+/i, '');
      const found = await this._geocode(name, signal, true, { geocodingProvider, apiKey });
      if (!found.length) throw fail('LOCATION_NOT_FOUND', `Coordinates and a time zone could not be found for ${city.label}. Try another Indonesian city.`);
      return { ...found[0], label: `${city.label}, Indonesia`, myquranId: city.id };
    }));
    checkAbort(signal);
    return results;
  }

  _offline(date, selected) {
    const { latitude, longitude, timezone: zone } = selected.location;
    const params = CalculationMethod[selected.method]();
    params.madhab = selected.school === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
    // Never silently substitute another latitude/date during polar day/night.
    params.polarCircleResolution = PolarCircleResolution.Unresolved;
    let calculationDate = date;
    let calculated;
    for (let attempt = 0; attempt < 3; attempt++) {
      const [year, month, day] = calculationDate.split('-').map(Number);
      // Adhan reads local getFullYear/getMonth/getDate, then returns absolute UTC
      // instants. Set those calendar fields explicitly; do not pass a UTC midnight.
      calculated = new PrayerTimes(new Coordinates(latitude, longitude), new Date(year, month - 1, day, 12), params);
      if (!Number.isFinite(calculated.dhuhr.getTime())) throw fail('CALCULATION_UNAVAILABLE', 'Prayer times cannot be calculated for this date/location (polar day/night or unsupported high-latitude conditions).');
      const actualDate = localDate(calculated.dhuhr.getTime(), zone);
      if (actualDate === date) break;
      // Civil date and solar date can differ across the International Date Line.
      calculationDate = addDays(calculationDate, (dateStamp(date) - dateStamp(actualDate)) / (24 * HOUR));
    }
    if (localDate(calculated.dhuhr.getTime(), zone) !== date) throw fail('CALCULATION_UNAVAILABLE', 'Calculation could not be aligned to the selected timezone.');
    const prayers = PRAYER_NAMES.map((name) => ({ name, time: calculated[name.toLowerCase()].getTime() }));
    try { checkRows(prayers); }
    catch { throw fail('CALCULATION_UNAVAILABLE', 'Prayer times cannot be calculated for this date/location.'); }
    return { date, prayers };
  }

  async _aladhanDay(date, selected, signal) {
    const { latitude, longitude } = selected.location;
    const method = METHODS.find((item) => item.id === selected.method).aladhan;
    const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), method: String(method), school: selected.school === 'hanafi' ? '1' : '0' });
    const key = `aladhan:${date}:${params}`;
    const cached = this._get(key);
    if (cached) return cached;
    const data = await this._json(`${ALADHAN}/timings/${apiDate(date)}?${params}`, signal);
    const normalized = providerData(() => {
      if (data?.code !== 200 || !plain(data.data)) throw fail('INVALID_DATA', 'AlAdhan response is invalid.');
      const info = data.data;
      if (info.date?.gregorian?.date !== apiDate(date)) throw fail('INVALID_DATA', 'AlAdhan returned the wrong date.');
      const zone = timezone(info.meta?.timezone);
      if (info.meta?.method?.id !== method || info.meta?.school !== (selected.school === 'hanafi' ? 'HANAFI' : 'STANDARD')) throw fail('INVALID_DATA', 'AlAdhan returned a different calculation method or school.');
      return { date, prayers: prayerRows(date, info.timings, zone), timezone: zone, fetchedAt: this.now() };
    });
    return this._put(key, normalized, 15 * 60000);
  }

  async _myquranDay(date, selected, signal) {
    const id = selected.location.myquranId;
    const key = `myquran:${id}:${date}:${selected.location.timezone}`;
    const cached = this._get(key);
    if (cached) return cached;
    const data = await this._json(`${MYQURAN}/jadwal/${id}/${date.replaceAll('-', '/')}`, signal);
    const normalized = providerData(() => {
      if (data?.status !== true || !plain(data.data) || String(data.data.id).padStart(4, '0') !== id || data.data.jadwal?.date !== date) throw fail('INVALID_DATA', 'MyQuran returned an invalid city timetable or date.');
      const info = data.data;
      const zone = timezone(selected.location.timezone);
      const clocks = Object.fromEntries(PRAYER_NAMES.map((name, index) => [name, info.jadwal[MYQURAN_NAMES[index]]]));
      const result = { date, prayers: prayerRows(date, clocks, zone), fetchedAt: this.now() };
      // Current v2 does not expose koordinat. Accept coordinates if introduced,
      // but never invent coordinates when absent or accept malformed ones.
      if (info.koordinat !== undefined) {
        object(info.koordinat, 'MyQuran coordinates');
        result.coordinates = {
          latitude: providerCoordinate(info.koordinat.lat, 90, 'MyQuran latitude'),
          longitude: providerCoordinate(info.koordinat.lon, 180, 'MyQuran longitude'),
        };
      }
      return result;
    });
    return this._put(key, normalized, 15 * 60000);
  }

  async times(settings, signal) {
    const selected = validateSettings(settings);
    checkAbort(signal);
    if (!selected.location) throw fail('LOCATION_REQUIRED', 'Provide coordinates or select a city before loading prayer times. The Host server’s location is not used.');
    if (selected.source === 'myquran' && !selected.location.myquranId) throw fail('MYQURAN_CITY_REQUIRED', 'Select an Indonesian city from MyQuran search first.');
    const now = this.now();
    if (typeof now !== 'number' || !Number.isFinite(now)) throw fail('INVALID_INPUT', 'Clock must return epoch milliseconds.');
    let zone = selected.location.timezone;
    let today = localDate(now, zone);
    let days;
    let actualSource = selected.source;
    let fallbackReason = null;
    let precedingPrayer = null;
    let previousPrayer = null;
    let fetchedAt = now;
    let resolvedLocation = { ...selected.location };
    if (selected.source !== 'offline') {
      try {
        let first;
        if (selected.source === 'aladhan') {
          first = await this._aladhanDay(today, selected, signal);
          zone = first.timezone;
          const corrected = localDate(now, zone);
          if (corrected !== today) {
            today = corrected;
            first = await this._aladhanDay(today, selected, signal);
            if (first.timezone !== zone) throw fail('INVALID_DATA', 'AlAdhan timezone is inconsistent.');
          }
          const second = await this._aladhanDay(addDays(today, 1), selected, signal);
          if (second.timezone !== zone) throw fail('INVALID_DATA', 'AlAdhan timezone is inconsistent.');
          days = [first, second];
          resolvedLocation.timezone = zone;
        } else {
          first = await this._myquranDay(today, selected, signal);
          const second = await this._myquranDay(addDays(today, 1), selected, signal);
          days = [first, second];
          if (first.coordinates) resolvedLocation = { ...resolvedLocation, ...first.coordinates };
        }
        fetchedAt = Math.min(...days.map((day) => day.fetchedAt));
        // A previous solar day's Isha can occur after today's civil midnight.
        // It is only still upcoming before today's Fajr, so avoid a third HTTP
        // request during the rest of the day. Failure remains all-or-nothing.
        if (now < days[0].prayers[0].time) {
          const previousDate = addDays(today, -1);
          const previous = selected.source === 'aladhan'
            ? await this._aladhanDay(previousDate, selected, signal)
            : await this._myquranDay(previousDate, selected, signal);
          if (selected.source === 'aladhan' && previous.timezone !== zone) throw fail('INVALID_DATA', 'AlAdhan timezone is inconsistent.');
          const isha = previous.prayers.find((prayer) => prayer.name === 'Isha');
          if (isha.time > now) precedingPrayer = { name: 'Isha', time: isha.time, date: previousDate };
          previousPrayer = latestElapsedPrayer(previous, now);
          fetchedAt = Math.min(fetchedAt, previous.fetchedAt);
        }
      } catch (error) {
        checkAbort(signal);
        if (error?.name === 'AbortError' || error?.code === 'ABORTED') throw error;
        actualSource = 'offline';
        precedingPrayer = null;
        previousPrayer = null;
        const reason = {
          TIMEOUT: 'The request timed out.',
          HTTP_ERROR: 'The provider could not complete the request.',
          INVALID_DATA: 'The provider returned an invalid schedule, date, or time zone/DST value.',
          NETWORK_ERROR: 'The provider could not be reached.',
        }[error?.code] || 'The provider could not be reached.';
        // Never expose arbitrary fetch/OS errors or untrusted remote response text.
        fallbackReason = `${SOURCES.find((source) => source.id === selected.source).label} unavailable: ${reason} Using offline calculation.`;
        // Discard partial provider output rather than mixing sources or timezones.
        zone = selected.location.timezone;
        today = localDate(now, zone);
        resolvedLocation = { ...selected.location };
      }
    }
    checkAbort(signal);
    if (actualSource === 'offline') {
      days = [this._offline(today, selected), this._offline(addDays(today, 1), selected)];
      if (now < days[0].prayers[0].time) {
        const previousDate = addDays(today, -1);
        const previous = this._offline(previousDate, selected);
        const isha = previous.prayers.find((prayer) => prayer.name === 'Isha');
        if (isha.time > now) precedingPrayer = { name: 'Isha', time: isha.time, date: previousDate };
        previousPrayer = latestElapsedPrayer(previous, now);
      }
      fetchedAt = this.now();
    }
    return {
      days: days.map(({ date, prayers }) => ({ date, prayers })),
      timezone: zone, location: resolvedLocation, requestedSource: selected.source, actualSource, fallbackReason, fetchedAt, precedingPrayer, previousPrayer,
      method: actualSource === 'myquran' ? 'MyQuran' : selected.method,
      school: actualSource === 'myquran' ? 'provider' : selected.school,
    };
  }

  async execute(input, settings = DEFAULT_SETTINGS, signal) {
    keys(input, ['action', 'query', 'source'], 'Action');
    choice(input.action, ['status', 'search', 'times'], 'action');
    if (input.action === 'status') return this.metadata();
    if (input.action === 'search') {
      const selected = validateSettings(settings);
      return this.search(input.query, { source: input.source ?? selected.source, geocodingProvider: selected.geocodingProvider, signal });
    }
    if (Object.hasOwn(input, 'query') || Object.hasOwn(input, 'source')) throw fail('INVALID_INPUT', 'Times action only accepts action.');
    return this.times(settings, signal);
  }
}

// Attribution: AlAdhan (https://aladhan.com/prayer-times-api), MyQuran
// (https://api.myquran.com), Open-Meteo geocoding (https://open-meteo.com/en/docs/geocoding-api,
// GeoNames data, CC BY 4.0), and Adhan JS (https://github.com/batoulapps/adhan-js, MIT).
// Calculation methods can differ between providers/local authorities. Umm al-Qura's
// offline 90-minute Isha interval does not automatically add Ramadan's 30 minutes.
// MyQuran method/school are provider controlled; geocoder coordinates are city centers.
