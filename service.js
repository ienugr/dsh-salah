import { DEFAULT_SETTINGS, SOURCES, METHODS, GEOCODING_PROVIDERS, SalahEngine, validateSettings } from './core.js';

export const GEOCODING_CREDENTIAL_REF = 'SALAH_OPEN_METEO_API_KEY';

export const MAX_REQUEST_BYTES = 8192;
export const MAX_RESULT_BYTES = 65536;
export const MAX_SEARCH_RESULTS = 20;
const clone = value => structuredClone(value);
const sourceIds = SOURCES.map(source => source.id);
const methodIds = METHODS.map(method => method.id);
const geocodingIds = GEOCODING_PROVIDERS.map(provider => provider.id);
const legacySettingKeys = ['source', 'method', 'school', 'locationMode', 'location'];
const settingKeys = [...legacySettingKeys, 'geocodingProvider'];
const encoder = new TextEncoder();

export class SalahServiceError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'SalahServiceError';
    this.code = code;
    this.status = status;
  }
}
const invalid = message => new SalahServiceError('INVALID_ARGUMENT', message);
function object(value, label, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw invalid(`${label} must be an object.`);
  if (Object.keys(value).some(key => !allowed.includes(key))) throw invalid(`${label} contains an unknown field.`);
}
function choice(value, choices, label) {
  if (!choices.includes(value)) throw invalid(`${label} must be one of: ${choices.join(', ')}.`);
}
function boundedString(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) throw invalid(`${label} must be nonempty text of at most ${max} characters.`);
  return value.trim();
}
function jsonSize(value, limit, code = 'INVALID_ARGUMENT') {
  let json;
  try { json = JSON.stringify(value); } catch { throw new SalahServiceError(code, 'The value must be JSON serializable.'); }
  if (typeof json !== 'string' || encoder.encode(json).byteLength > limit) throw new SalahServiceError(code, 'The Salah request or result exceeds the allowed size.', code === 'OUTPUT_TOO_LARGE' ? 502 : 413);
  return json;
}
export function validateLocation(value) {
  object(value, 'location', ['label', 'latitude', 'longitude', 'timezone', 'myquranId']);
  const location = {
    label: boundedString(value.label, 'location.label', 200),
    latitude: value.latitude,
    longitude: value.longitude,
    timezone: boundedString(value.timezone, 'location.timezone', 100),
  };
  for (const [key, limit] of [['latitude', 90], ['longitude', 180]]) {
    if (typeof location[key] !== 'number' || !Number.isFinite(location[key]) || Math.abs(location[key]) > limit) throw invalid(`location.${key} must be a finite number between ${-limit} and ${limit}.`);
  }
  try {
    if (location.timezone !== 'UTC' && !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(location.timezone)) throw new Error('Not IANA');
    new Intl.DateTimeFormat('en', { timeZone: location.timezone });
  } catch { throw invalid('location.timezone must be a valid IANA time zone, such as Asia/Jakarta.'); }
  if (Object.hasOwn(value, 'myquranId')) {
    if (typeof value.myquranId !== 'string' || !/^\d{4}$/.test(value.myquranId)) throw invalid('location.myquranId must contain four digits.');
    location.myquranId = value.myquranId;
  }
  return location;
}
function validatePatch(patch) {
  object(patch, 'patch', settingKeys);
  if (!Object.keys(patch).length) throw invalid('patch must contain at least one setting.');
  const result = { ...patch };
  if (Object.hasOwn(patch, 'source')) choice(patch.source, sourceIds, 'source');
  if (Object.hasOwn(patch, 'geocodingProvider')) choice(patch.geocodingProvider, geocodingIds, 'geocodingProvider');
  if (Object.hasOwn(patch, 'method')) choice(patch.method, methodIds, 'method');
  if (Object.hasOwn(patch, 'school')) choice(patch.school, ['standard', 'hanafi'], 'school');
  if (Object.hasOwn(patch, 'locationMode')) choice(patch.locationMode, ['current', 'manual'], 'locationMode');
  if (Object.hasOwn(patch, 'location') && patch.location !== null) result.location = validateLocation(patch.location);
  return result;
}
function settingsValue(settings) {
  // Core performs source/method-specific validation after the whole patch is merged.
  try { return clone(validateSettings(settings)); }
  catch (error) { throw invalid(String(error?.message ?? 'Invalid Salah settings.').slice(0, 300)); }
}
function validateAction(args) {
  object(args, 'request', ['action', 'query', 'source', 'patch', 'location']);
  choice(args.action, ['status', 'search', 'times', 'configure'], 'action');
  const allowed = { status: ['action'], search: ['action', 'query', 'source'], times: ['action', 'location'], configure: ['action', 'patch'] }[args.action];
  object(args, `${args.action} request`, allowed);
  jsonSize(args, MAX_REQUEST_BYTES);
  if (args.action === 'search') {
    const result = { action: 'search', query: boundedString(args.query, 'query', 120) };
    if (result.query.length < 2) throw invalid('query must contain at least two characters.');
    if (Object.hasOwn(args, 'source')) { choice(args.source, sourceIds, 'source'); result.source = args.source; }
    return result;
  }
  if (args.action === 'configure') return { action: 'configure', patch: validatePatch(args.patch) };
  if (args.action === 'times' && Object.hasOwn(args, 'location')) return { action: 'times', location: validateLocation(args.location) };
  return { action: args.action };
}
function aborted(signal) {
  if (signal?.aborted) throw new SalahServiceError('ABORTED', 'The Salah operation was cancelled.', 499);
}
async function credentialRead(promise, signal) {
  if (!signal) return promise;
  aborted(signal);
  let onAbort;
  const cancelled = new Promise((_, reject) => {
    onAbort = () => reject(new SalahServiceError('ABORTED', 'The Salah operation was cancelled.', 499));
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try { return await Promise.race([promise, cancelled]); }
  finally { signal.removeEventListener('abort', onAbort); }
}
export function publicError(error) {
  if (error instanceof SalahServiceError) return { code: error.code, message: error.message.slice(0, 300) };
  return { code: 'INTERNAL_ERROR', message: 'The Salah operation failed. Please try again.' };
}
function operationError(error, signal) {
  if (error instanceof SalahServiceError) return error;
  if (signal?.aborted || error?.name === 'AbortError') return new SalahServiceError('ABORTED', 'The Salah operation was cancelled.', 499);
  // Fixed public messages never expose provider text, fetch URLs, or storage paths.
  const engineErrors = {
    INVALID_INPUT: ['Check the Salah settings, coordinates, and IANA time zone.', 400],
    LOCATION_REQUIRED: ['Use browser location access or select a city before loading prayer times.', 400],
    MYQURAN_CITY_REQUIRED: ['Select an Indonesian city from MyQuran search before loading prayer times.', 400],
    LOCATION_NOT_FOUND: ['Coordinates and a time zone could not be found. Try another city.', 404],
    HTTP_ERROR: ['The online provider is unavailable. Try again.', 502],
    NETWORK_ERROR: ['The online provider could not be reached. Check your connection and try again.', 502],
    TIMEOUT: ['The online provider timed out. Try again.', 504],
    INVALID_DATA: ['The online provider returned an invalid result. Try again.', 502],
    CALCULATION_UNAVAILABLE: ['Prayer times cannot be calculated for this location and date. Check the coordinates and time zone, or use a local timetable; some polar conditions are unsupported.', 422],
    ABORTED: ['The Salah operation was cancelled.', 499],
  };
  if (Object.hasOwn(engineErrors, error?.code)) {
    const [message, status] = engineErrors[error.code];
    return new SalahServiceError(error.code, message, status);
  }
  return new SalahServiceError('INTERNAL_ERROR', 'The Salah operation failed. Please try again.', 503);
}

/** One profile-wide operation owner shared by browser actions and the agent tool. */
export class SalahService {
  constructor({ domain, engine = new SalahEngine(), getCredentials = () => undefined }) {
    this.domain = domain;
    this.engine = engine;
    this.getCredentials = getCredentials;
    this.controller = new AbortController();
    this.active = new Set();
    this.writes = Promise.resolve();
    this.closing = false;
    this.closePromise = null;
    this.settings = settingsValue(domain.global.get());
  }
  async initialize() {
    // Older state must never keep an exact browser GPS fix in current-location mode.
    if (this.settings.locationMode === 'current' && this.settings.location !== null) {
      const sanitized = settingsValue({ ...this.settings, location: null });
      await this.domain.global.set(clone(sanitized));
      this.settings = sanitized;
    }
  }
  async status(signal, settings = this.settings) {
    settings = clone(settings);
    aborted(signal);
    let keyConfigured = false;
    try { keyConfigured = (await credentialRead(this.getCredentials()?.describe(GEOCODING_CREDENTIAL_REF), signal))?.configured === true; }
    catch { /* Optional credential discovery must not break public mode or expose provider paths. */ }
    aborted(signal);
    return {
      settings, sources: clone(SOURCES), methods: clone(METHODS),
      geocoding: { providers: clone(GEOCODING_PROVIDERS), provider: settings.geocodingProvider, keyConfigured, credentialRef: GEOCODING_CREDENTIAL_REF },
    };
  }
  async geocodingOptions(geocodingProvider, signal) {
    if (geocodingProvider === 'open-meteo-public') return { geocodingProvider };
    let resolved;
    try { resolved = await credentialRead(this.getCredentials()?.resolve(GEOCODING_CREDENTIAL_REF), signal); }
    catch { aborted(signal); throw new SalahServiceError('GEOCODING_CREDENTIAL_UNAVAILABLE', `The Host could not resolve ${GEOCODING_CREDENTIAL_REF}. Check the Host credential configuration and active Open-Meteo subscription.`, 503); }
    aborted(signal);
    if (typeof resolved?.value !== 'string' || !resolved.value.trim()
      || resolved.value.length > 4096 || /[\u0000-\u001f\u007f]/.test(resolved.value)) {
      throw new SalahServiceError('GEOCODING_KEY_REQUIRED', `Commercial geocoding requires an active Open-Meteo subscription. Set ${GEOCODING_CREDENTIAL_REF} in the Host environment or managed credentials, then select commercial mode again.`, 400);
    }
    return { geocodingProvider, apiKey: resolved.value };
  }
  withOperation(callback, { signal } = {}) {
    if (this.closing) return Promise.reject(new SalahServiceError('CLOSED', 'Salah is stopping. Try again once the plugin is running.', 503));
    const combined = signal ? AbortSignal.any([signal, this.controller.signal]) : this.controller.signal;
    const operation = Promise.resolve().then(async () => {
      try { aborted(combined); return await callback(combined); }
      catch (error) { throw operationError(error, combined); }
    });
    this.active.add(operation);
    operation.then(() => this.active.delete(operation), () => this.active.delete(operation));
    return operation;
  }
  execute(args, options = {}) {
    return this.withOperation(async signal => {
      const input = validateAction(args);
      if (input.action === 'configure') return this.configure(input.patch, signal);
      // Reads observe every configuration write admitted before this operation.
      await this.writes;
      aborted(signal);
      let value;
      if (input.action === 'status') value = await this.status(signal);
      if (input.action === 'search') {
        const settings = clone(this.settings);
        const geocoding = await this.geocodingOptions(settings.geocodingProvider, signal);
        aborted(signal);
        const results = await this.engine.search(input.query, { source: input.source ?? settings.source, ...geocoding, signal });
        aborted(signal);
        if (!Array.isArray(results)) throw new SalahServiceError('INVALID_RESULT', 'The location source returned an invalid result.', 502);
        try { value = { results: results.slice(0, MAX_SEARCH_RESULTS).map(validateLocation) }; }
        catch { throw new SalahServiceError('INVALID_RESULT', 'The location source returned an invalid result.', 502); }
      }
      if (input.action === 'times') {
        const snapshot = await this.status(signal);
        if (input.location && snapshot.settings.locationMode !== 'current') throw invalid('Transient location is only accepted in current-location mode. Configure a manual location instead.');
        const location = snapshot.settings.locationMode === 'current' ? input.location ?? null : snapshot.settings.location;
        const needsLocation = location === null;
        const schedule = needsLocation ? null : await this.engine.times(settingsValue({ ...snapshot.settings, location }), signal);
        aborted(signal);
        value = { ...snapshot, schedule, needsLocation };
      }
      jsonSize(value, MAX_RESULT_BYTES, 'OUTPUT_TOO_LARGE');
      return clone(value);
    }, options);
  }
  configure(patch, signal) {
    const operation = this.writes.then(async () => {
      aborted(signal);
      const candidate = { ...this.settings, ...patch };
      // The browser owns permission to obtain GPS; tools cannot grant it or persist its fix.
      if (candidate.locationMode === 'current') candidate.location = null;
      const next = settingsValue(candidate);
      await this.geocodingOptions(next.geocodingProvider, signal);
      const status = await this.status(signal, next);
      aborted(signal);
      await this.domain.global.set(clone(next));
      this.settings = next;
      return status;
    });
    // Failed writes leave the old snapshot intact without poisoning later updates.
    this.writes = operation.then(() => undefined, () => undefined);
    return operation;
  }
  close() {
    if (!this.closePromise) {
      this.closing = true;
      this.controller.abort();
      this.closePromise = Promise.allSettled([...this.active]).then(() => this.writes);
    }
    return this.closePromise;
  }
}

export function createSalahTool(service) {
  return {
    name: 'salah_times',
    description: 'Get prayer schedules and source options, search cities, or update Salah preferences. Does not obtain device location.',
    parameters: toolParameters,
    timeoutMs: 45000,
    output: { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    execute: (args, exec) => service.execute(args, { signal: exec.signal }),
    isConcurrencySafe: args => ['status', 'search', 'times'].includes(args?.action),
  };
}
const locationParameters = {
  type: 'object', additionalProperties: false, required: ['label', 'latitude', 'longitude', 'timezone'],
  properties: {
    label: { type: 'string', description: 'Human-readable location, 1–200 characters.' },
    latitude: { type: 'number', description: 'Latitude from −90 to 90.' },
    longitude: { type: 'number', description: 'Longitude from −180 to 180.' },
    timezone: { type: 'string', description: 'IANA time zone, at most 100 characters.' },
    myquranId: { type: 'string', description: 'Four-digit MyQuran city identifier from search. Required by MyQuran.' },
  },
};
export const toolParameters = {
  type: 'object', additionalProperties: false, required: ['action'],
  properties: {
    action: { type: 'string', enum: ['status', 'search', 'times', 'configure'], description: 'status: saved settings/options; search: up to 20 cities; times: schedule from saved preferences; configure: save a partial patch and return status.' },
    query: { type: 'string', description: 'For search only: city name, 2–120 characters.' },
    source: { type: 'string', enum: sourceIds, description: 'For search only; defaults to the saved source. Offline mode still uses online city search.' },
    location: { ...locationParameters, description: 'For times in current mode only: explicitly supplied coordinates for this request, not saved in preferences. Do not infer device location. Omit in manual mode to use the saved location.' },
    patch: {
      type: 'object', additionalProperties: false, description: 'For configure only; include at least one field. Saved profile-wide. Selecting current mode clears the saved location.',
      properties: {
        source: { type: 'string', enum: sourceIds },
        geocodingProvider: { type: 'string', enum: geocodingIds, description: 'City search provider. Public is non-commercial; commercial requires an active Open-Meteo subscription and the Host credential SALAH_OPEN_METEO_API_KEY, configured outside this tool.' },
        method: { type: 'string', enum: methodIds, description: 'For AlAdhan and Adhan, including offline fallback; does not alter MyQuran schedules.' },
        school: { type: 'string', enum: ['standard', 'hanafi'], description: 'Asr convention for AlAdhan and Adhan, including fallback.' },
        locationMode: { type: 'string', enum: ['current', 'manual'] },
        location: { oneOf: [locationParameters, { type: 'null' }], description: 'Manual location or null. Set locationMode:manual and location together. For MyQuran, select a search result with myquranId.' },
      },
    },
  },
};

async function readJson(request, signal) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) throw new SalahServiceError('UNSUPPORTED_MEDIA_TYPE', 'Use an application/json request.', 415);
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_REQUEST_BYTES)) throw new SalahServiceError('REQUEST_TOO_LARGE', 'The Salah request exceeds 8192 bytes.', 413);
  if (!request.body) throw new SalahServiceError('INVALID_JSON', 'A JSON request body is required.');
  const reader = request.body.getReader();
  const onAbort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', onAbort, { once: true });
  const chunks = [];
  let total = 0;
  try {
    aborted(signal);
    while (true) {
      const { value, done } = await reader.read();
      aborted(signal);
      if (done) break;
      if (!value.byteLength) continue;
      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => {});
        throw new SalahServiceError('REQUEST_TOO_LARGE', 'The Salah request exceeds 8192 bytes.', 413);
      }
      chunks.push(value);
    }
  } finally { signal.removeEventListener('abort', onAbort); reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new SalahServiceError('INVALID_JSON', 'The request body must contain valid UTF-8 JSON.'); }
}
export function createSalahRoute(connection, service) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const failure = error => Response.json({ ok: false, error: publicError(error) }, { status: error.status ?? 503, headers });
  return {
    path: '/api/salah', methods: ['GET', 'POST'], requestBody: 'streaming',
    async fetch(request) {
      try {
        const admission = connection.admit({ headers: request.headers });
        if ('rejection' in admission) throw new SalahServiceError('UNAUTHORIZED', 'An authenticated owner connection is required.', admission.rejection);
        if (admission.peer.principal.kind !== 'owner') throw new SalahServiceError('FORBIDDEN', 'Salah requires the Host owner.', 403);
        if (request.headers.get('sec-fetch-site') === 'cross-site') throw new SalahServiceError('CROSS_SITE', 'Cross-site Salah requests are refused.', 403);
        if (!['GET', 'POST'].includes(request.method)) throw new SalahServiceError('METHOD_NOT_ALLOWED', 'Use GET or POST.', 405);
        const value = await service.withOperation(async signal => {
          const args = request.method === 'POST' ? await readJson(request, signal) : { action: 'status' };
          return service.execute(args, { signal });
        }, { signal: request.signal });
        return Response.json({ ok: true, value }, { headers });
      } catch (error) { return failure(error); }
    },
  };
}
// Exposed for the storage schema without coupling the service tests to zod.
export function validateStoredSettings(value) {
  object(value, 'settings', settingKeys);
  const patch = validatePatch(value);
  if (!legacySettingKeys.every(key => Object.hasOwn(patch, key))) throw invalid('Stored settings must contain every legacy setting.');
  return settingsValue(patch);
}
export { DEFAULT_SETTINGS };
