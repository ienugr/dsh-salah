import assert from 'node:assert/strict';

const THEME_PHASES = new Set(['initial.authority', 'theme.open', 'theme.baseline', 'light.select', 'light.panel', 'light.review', 'dark.select', 'dark.panel', 'dark.review', 'theme.compare', 'restore.ui', 'restore.fresh']);
const THEME_FAILURE_CODES = new Set(['POST_ACK_NAVIGATION', 'POST_ACK_SELECTED', 'POST_ACK_INDICATOR', 'REVIEW_CHECKBOX_CHECKED', 'REVIEW_CHECKBOX_FOCUS', 'REVIEW_CHECKBOX_PAINT', 'REVIEW_METHOD_FOCUS', 'REVIEW_CONFIRM_ENABLED', 'REVIEW_PENDING_STATUS', 'REVIEW_CHECKBOX_DISABLED', 'REVIEW_METHOD_DISABLED', 'REVIEW_ASR_DISABLED', 'REVIEW_CONFIRM_DISABLED', 'REVIEW_METHOD_REENABLED', 'RPC_HTTP_STATUS', 'RPC_FINISH', 'RPC_JSON', 'RESPONSE_ENVELOPE', 'RESPONSE_RPC_ID', 'RESPONSE_LOGICAL_OK', 'RESPONSE_NAMESPACE', 'RESPONSE_PREFERENCE', 'RESPONSE_REVISION', 'RESPONSE_TARGET', 'RESPONSE_REVISION_LOWER_BOUND', 'RESPONSE_REVISION_FLOOR_REQUIRED', 'RESPONSE_NAMESPACES', 'RPC_NOT_OBSERVED', 'RPC_CANCELLED']);
function themeFailureCode(error) {
  for (let depth = 0; error && depth < 4; depth++, error = error.cause) {
    if (THEME_FAILURE_CODES.has(error.themeCode)) return error.themeCode;
    if (error.code === 'ERR_ASSERTION') return 'UI_ASSERTION_FAILED';
    if (error.name === 'TimeoutError') return 'UI_TIMEOUT';
  }
  return 'UI_OPERATION_FAILED';
}
export async function inThemePhase(diagnostics, phase, run) {
  assert.ok(THEME_PHASES.has(phase), 'Only fixed theme diagnostic phases are allowed.');
  if (diagnostics) diagnostics.phase = phase;
  try { return await run(); }
  catch (error) {
    if (diagnostics) {
      diagnostics.failedPhase ??= phase;
      diagnostics.failures ??= [];
      if (diagnostics.failures.length < 8) diagnostics.failures.push({ phase, code: themeFailureCode(error) });
    }
    if (error && typeof error === 'object') error.themePhase ??= phase;
    throw error; // Preserve the actual failure/cause, never serialize its message.
  }
}
export function requireTheme(condition, code, message) {
  assert.ok(THEME_FAILURE_CODES.has(code), 'Only fixed theme predicate codes are allowed.');
  try { assert.ok(condition, message); }
  catch (error) { error.themeCode = code; throw error; }
}

// Source-confirmed public wire contract: connection client-request/server-response
// envelopes with NAMED payload.args:{ns,ops,expectedRevision?}. The generated
// Gateway constructs a plain object; positional business arguments are NOT wire.
// Only settings/mutate for ui-theme.preference may satisfy an owned write.
const plainRecord = value => value !== null && typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function themeWritePredicateCode(body, target) {
  if (body?.type !== 'client-request') return 'REQUEST_ENVELOPE';
  if (body.method !== 'settings/mutate') return 'REQUEST_METHOD';
  if (typeof body.rpcId !== 'string' || !body.rpcId) return 'REQUEST_RPC_ID';
  const args = body.payload?.args;
  if (!plainRecord(body.payload) || Reflect.ownKeys(body.payload).length !== 1 || !plainRecord(args) || !Object.hasOwn(args, 'ns') || !Object.hasOwn(args, 'ops') || Reflect.ownKeys(args).some(key => !['ns', 'ops', 'expectedRevision'].includes(key))) return 'REQUEST_ARGUMENTS';
  if (args.ns !== 'ui-theme') return 'REQUEST_NAMESPACE';
  if (Object.hasOwn(args, 'expectedRevision') && (!Number.isSafeInteger(args.expectedRevision) || args.expectedRevision < 0)) return 'REQUEST_REVISION';
  const ops = args.ops;
  if (!Array.isArray(ops) || ops.length !== 1) return 'REQUEST_OPERATION_COUNT';
  if (ops[0]?.op !== 'set') return 'REQUEST_OPERATION';
  if (!Array.isArray(ops[0].path) || ops[0].path.length !== 1 || ops[0].path[0] !== 'preference') return 'REQUEST_PATH';
  if (ops[0].value !== target) return 'REQUEST_TARGET';
  return 'MATCHED';
}
export function matchThemeWrite(body, target) {
  if (themeWritePredicateCode(body, target) !== 'MATCHED') return null;
  return { rpcId: body.rpcId, target, ...Object.hasOwn(body.payload.args, 'expectedRevision') ? { expectedRevision: body.payload.args.expectedRevision } : {} };
}
function successfulResult(body, request) {
  requireTheme(body?.type === 'server-response', 'RESPONSE_ENVELOPE', 'Actual Host response envelope is required.');
  requireTheme(body.rpcId === request.rpcId, 'RESPONSE_RPC_ID', 'Theme response must correlate to the exact owned UI request.');
  requireTheme(body.result?.ok === true, 'RESPONSE_LOGICAL_OK', 'HTTP success without logical RPC success is not persistence.');
  return body.result.value;
}
function themeNamespace(view) {
  requireTheme(view?.ns === 'ui-theme', 'RESPONSE_NAMESPACE', 'Only the actual theme namespace may satisfy persistence.');
  requireTheme(['light', 'dark', 'system'].includes(view.value?.preference), 'RESPONSE_PREFERENCE', 'Accepted theme preference must be a built-in choice.');
  requireTheme(Number.isSafeInteger(view.revision) && view.revision >= 0, 'RESPONSE_REVISION', 'Host theme revision must be a nonnegative safe integer.');
  return { preference: view.value.preference, revision: view.revision };
}
export function readThemeWriteAck(body, request, minimumRevision) {
  requireTheme(Number.isSafeInteger(minimumRevision) && minimumRevision >= 0, 'RESPONSE_REVISION_FLOOR_REQUIRED', 'A loaded authoritative Host revision floor is required before any write acknowledgement.');
  const expectedRevision = Object.hasOwn(request, 'expectedRevision') ? request.expectedRevision : minimumRevision;
  requireTheme(Number.isSafeInteger(expectedRevision) && expectedRevision >= 0, 'RESPONSE_REVISION_LOWER_BOUND', 'A supplied concurrency token must be a valid Host revision.');
  const accepted = themeNamespace(successfulResult(body, request));
  requireTheme(accepted.preference === request.target, 'RESPONSE_TARGET', 'Durable Host value must equal the selected theme.');
  requireTheme(accepted.revision >= Math.max(minimumRevision, expectedRevision), 'RESPONSE_REVISION_LOWER_BOUND', 'Acknowledgement cannot predate its loaded Host floor or supplied concurrency token.');
  return accepted;
}
export function readThemeDescribeAck(body, request) {
  const value = successfulResult(body, request);
  requireTheme(Array.isArray(value?.namespaces), 'RESPONSE_NAMESPACES', 'Fresh Host settings description is required.');
  // Only inspect namespace names until the exact theme entry is found. Never
  // traverse, copy, print or inspect values of any other settings namespace.
  return themeNamespace(value.namespaces.find(entry => entry.ns === 'ui-theme'));
}
const shapeType = value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
function safeShape(value, allowedKeys) {
  const keys = value && typeof value === 'object' ? Object.keys(value) : [];
  const known = allowedKeys.filter(key => keys.includes(key));
  return { type: shapeType(value), keys: known, otherKeyCount: keys.length - known.length };
}
function themeRequestDiagnostic(diagnostics, body, operation, target, count) {
  const args = body?.payload?.args;
  // No values or key names from unrelated namespaces may enter diagnostics.
  const namespace = plainRecord(args) && ['ui-theme', 'include:ui-theme'].includes(args.ns) ? args.ns : null;
  if (!diagnostics || !namespace || count >= 4) return;
  diagnostics.rpcs ??= [];
  if (diagnostics.rpcs.length >= 12) return;
  const changes = operation === 'settings/update' ? args.patch : operation === 'settings/replace' ? args.section : args.ops;
  const first = Array.isArray(changes) ? changes[0] : null;
  const record = {
    phase: THEME_PHASES.has(diagnostics.phase) ? diagnostics.phase : 'unscoped', operation,
    target: ['light', 'dark', 'system'].includes(target) ? target : 'other',
    requestCode: themeWritePredicateCode(body, target), namespace,
    envelopeShape: safeShape(body, ['type', 'method', 'rpcId', 'payload']),
    payloadShape: safeShape(body?.payload, ['args']),
    argumentShape: safeShape(args, ['ns', 'ops', 'expectedRevision', 'patch', 'section']),
    argumentCount: Reflect.ownKeys(args).length,
    argumentTypes: Object.fromEntries(['ns', 'ops', 'expectedRevision', 'patch', 'section'].filter(key => Object.hasOwn(args, key)).map(key => [key, shapeType(args[key])])),
    changeShape: safeShape(changes, ['preference']), operationCount: Array.isArray(changes) ? changes.length : null,
    op: ['set', 'unset'].includes(first?.op) ? first.op : 'other',
    path: Array.isArray(first?.path) && first.path.length === 1 && first.path[0] === 'preference' ? 'preference' : 'other',
    preference: ['light', 'dark', 'system'].includes(first?.value) ? first.value : 'other',
    patchPreference: !Array.isArray(changes) && ['light', 'dark', 'system'].includes(changes?.preference) ? changes.preference : 'other',
    revisionType: shapeType(args.expectedRevision), revisionSafeInteger: Number.isSafeInteger(args.expectedRevision) && args.expectedRevision >= 0,
  };
  diagnostics.rpcs.push(record);
  return record;
}
function themeResponseDiagnostic(body, request) {
  const result = body?.result, view = result?.value;
  const summary = {
    envelopeShape: safeShape(body, ['type', 'rpcId', 'result']), resultShape: safeShape(result, ['ok', 'value', 'error']),
    rpcIdMatches: typeof body?.rpcId === 'string' && body.rpcId === request?.rpcId,
    logicalOk: typeof result?.ok === 'boolean' ? result.ok : shapeType(result?.ok),
    viewShape: safeShape(view, ['ns', 'value', 'revision']), namespaceIsTheme: view?.ns === 'ui-theme',
  };
  if (summary.namespaceIsTheme) {
    summary.preference = ['light', 'dark', 'system'].includes(view.value?.preference) ? view.value.preference : 'other';
    summary.revisionType = shapeType(view.revision);
    summary.revisionSafeInteger = Number.isSafeInteger(view.revision) && view.revision >= 0;
  }
  return summary;
}
export function observeThemeRpc(page, origin, kind, target, timeout = 15000, diagnostics, minimumRevision) {
  if (kind === 'write') requireTheme(Number.isSafeInteger(minimumRevision) && minimumRevision >= 0, 'RESPONSE_REVISION_FLOOR_REQUIRED', 'A loaded authoritative revision floor is required before observing a UI write.');
  const endpoint = kind === 'write' ? 'settings/mutate' : 'settings/describe';
  let resolve, reject, settled = false, claimed = false, diagnosticCount = 0;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  promise.catch(() => {}); // A click failure must not create an unhandled timeout.
  const finish = (error, value) => {
    if (settled) return; settled = true; clearTimeout(timer); page.off('response', onResponse);
    if (error) reject(error); else resolve(value);
  };
  const onResponse = async response => {
    if (claimed || settled) return;
    const request = response.request();
    const url = new URL(response.url());
    if (request.method() !== 'POST' || url.origin !== origin) return;
    const diagnosticEndpoint = kind === 'write' && ['/api/settings/mutate', '/api/settings/update', '/api/settings/replace'].includes(url.pathname);
    if (!diagnosticEndpoint && url.pathname !== `/api/${endpoint}`) return;
    let body; try { body = request.postDataJSON(); } catch { return; }
    const record = diagnosticEndpoint ? themeRequestDiagnostic(diagnostics, body, url.pathname.slice(5), target, diagnosticCount) : null;
    if (record) diagnosticCount++;
    const expected = url.pathname !== `/api/${endpoint}` ? null : kind === 'write' ? matchThemeWrite(body, target) : body?.type === 'client-request' && body.method === endpoint && typeof body.rpcId === 'string' && body.rpcId ? { rpcId: body.rpcId } : null;
    if (!expected) {
      // Narrow passive shape evidence is NOT an acknowledgement. No endpoint,
      // request predicate, namespace, or response acceptance is broadened.
      if (record) {
        try {
          record.httpStatus = response.status(); record.finished = await response.finished() === null;
          record.response = themeResponseDiagnostic(await response.json(), body);
        } catch { record.projectionUnavailable = true; }
      }
      return;
    }
    claimed = true;
    let code = 'RPC_HTTP_STATUS';
    try {
      const status = response.status(); if (record) record.httpStatus = status;
      requireTheme(status === 200, code, 'Theme RPC HTTP status must succeed.');
      code = 'RPC_FINISH';
      const completed = await response.finished(); if (record) record.finished = completed === null;
      requireTheme(completed === null, code, 'Theme RPC must finish before the owned page may close.');
      code = 'RPC_JSON';
      const envelope = await response.json();
      if (record) record.response = themeResponseDiagnostic(envelope, expected);
      const accepted = kind === 'write' ? readThemeWriteAck(envelope, expected, minimumRevision) : readThemeDescribeAck(envelope, expected);
      if (record) record.accepted = true;
      finish(null, accepted);
    } catch (cause) {
      const error = new Error(`Actual Host ${endpoint} acknowledgement failed; no persistence claim is allowed.`, { cause });
      error.themeCode = THEME_FAILURE_CODES.has(cause?.themeCode) ? cause.themeCode : code;
      if (record) record.failureCode = error.themeCode;
      finish(error);
    }
  };
  const failObservation = (code, message) => { const error = new Error(message); error.themeCode = code; finish(error); };
  const timer = setTimeout(() => failObservation('RPC_NOT_OBSERVED', `Actual Host ${endpoint} acknowledgement was not observed.`), timeout);
  page.on('response', onResponse);
  return { wait: () => promise, cancel: () => failObservation('RPC_CANCELLED', 'Owned theme observation cancelled.') };
}
export function seedThemeRevisionFloor(adapter, revision) {
  requireTheme(Number.isSafeInteger(revision) && revision >= 0, 'RESPONSE_REVISION_FLOOR_REQUIRED', 'A freshly loaded authoritative Host revision is required.');
  requireTheme(adapter.minimumRevision === undefined || Number.isSafeInteger(adapter.minimumRevision) && adapter.minimumRevision >= 0, 'RESPONSE_REVISION_FLOOR_REQUIRED', 'An existing Host revision floor must remain valid.');
  adapter.minimumRevision = Math.max(revision, adapter.minimumRevision ?? revision);
  return adapter.minimumRevision;
}
async function settlementSnapshot(adapter) {
  try {
    const value = await adapter.readSettlementState?.();
    const visible = key => typeof value?.[key] === 'boolean' ? value[key] : 'unavailable';
    // Only already-observed literal colors are exposed; arbitrary CSS token
    // strings (including unexpected text) never enter diagnostic JSON.
    const color = input => ['#fff', '#ffffff', '#0f1115', 'rgb(255, 255, 255)', 'rgb(15, 17, 21)'].includes(input) ? input : 'other';
    return {
      dialogVisible: visible('dialogVisible'), generalVisible: visible('generalVisible'),
      choicesVisible: visible('choicesVisible'), settingsMenuVisible: visible('settingsMenuVisible'),
      source: ['light', 'dark', 'system'].includes(value?.source) ? value.source : 'other',
      backgroundToken: color(value?.backgroundToken), textToken: color(value?.textToken),
      colorScheme: ['light', 'dark', 'normal'].includes(value?.colorScheme) ? value.colorScheme : 'other',
    };
  } catch { return { available: false }; } // Diagnosis can never replace the UI check.
}
// Shared post-ACK interaction seam. Actual adapters read real controls and HTML
// source; test adapters exercise the same lifecycle without a browser or DOM.
// Re-establish live General controls, never click the theme preference again.
export async function settleObservedThemeSelection(adapter, target, eventually) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const diagnostics = adapter.diagnostics;
    let record, checkpoint = 'POST_ACK_NAVIGATION';
    if (diagnostics) {
      diagnostics.settlements ??= [];
      if (diagnostics.settlements.length < 6) {
        record = { phase: THEME_PHASES.has(diagnostics.phase) ? diagnostics.phase : 'unscoped', attempt: attempt + 1, before: await settlementSnapshot(adapter) };
        diagnostics.settlements.push(record);
      }
    }
    try {
      await eventually(async () => {
        checkpoint = 'POST_ACK_NAVIGATION';
        await adapter.ensureOpen(); // AFTER accepted ACK, including every retry.
        checkpoint = 'POST_ACK_SELECTED';
        requireTheme(await adapter.readSetting() === target, checkpoint, 'Only the target actual Host theme option may be selected.');
        checkpoint = 'POST_ACK_INDICATOR';
        requireTheme((await adapter.readHostState()).indicator === target, checkpoint, 'Actual Host source indicator must match the accepted target.');
      }, 'Accepted actual Host theme selection settles');
      if (record) Object.assign(record, { settled: true, after: await settlementSnapshot(adapter) });
      return;
    } catch (cause) {
      if (record) Object.assign(record, { settled: false, checkpoint, causeCode: themeFailureCode(cause), after: await settlementSnapshot(adapter) });
      if (attempt === 1) {
        const error = new Error('Accepted Host theme UI selection did not settle after bounded live-control recovery.', { cause });
        error.themeCode = checkpoint;
        throw error;
      }
    }
  }
}
export async function commitObservedThemeSelection(adapter, target) {
  seedThemeRevisionFloor(adapter, adapter.minimumRevision); // Never invent a zero baseline.
  if (await adapter.readSetting() === target) return { changed: false };
  const acknowledgement = adapter.watchPersistence(target, adapter.minimumRevision); // BEFORE click.
  // Retention is attached BEFORE awaiting the click itself: dispatch may persist
  // successfully even when Playwright later rejects the click's action promise.
  const persistence = acknowledgement.wait().then(accepted => {
    requireTheme(accepted?.preference === target, 'RESPONSE_TARGET', 'Accepted theme must equal the owned UI selection.');
    requireTheme(Number.isSafeInteger(accepted.revision) && accepted.revision >= adapter.minimumRevision, 'RESPONSE_REVISION_LOWER_BOUND', 'Accepted theme revision cannot predate the loaded or last-accepted floor.');
    seedThemeRevisionFloor(adapter, accepted.revision);
    adapter.onPersistenceAccepted?.(accepted);
    return accepted;
  });
  persistence.catch(() => {}); // A pre-dispatch click failure still cancels safely.
  try {
    await adapter.clickSetting(target);
    const accepted = await persistence;
    await adapter.waitForSelected(target);
    return { changed: true, ...accepted };
  } finally { acknowledgement.cancel(); }
}

// Only OBSERVED actual Host controls may populate this adapter. No theme tokens,
// classes, DOM, or palette are ever fabricated. Absent contract => INCOMPLETE.
// Required JSON:
// { open:[{role,name}], close:[{role,name}],
//   restoreOpen:{idempotent:true,actions:[{role,name}]},
//   control:{role:'combobox',name}, values:{light:<actual value>,dark:<actual value>},
//   indicator:{selector,attribute,light:<actual state>,dark:<actual state>} }
// Observed button-group alternative: control:{kind:'buttons',scope,choices:
// {light,dark,system}}, navigation:{launcherSelector,dialogSelector,settings:
// {role:'menuitem',name},general:{role:'button',name}}, restoreOpen:{idempotent:
// true}, close:[{role,name}], values:{light:'light',dark:'dark'}, indicator as
// above, cssSelector:'body'. Selection is read from actual aria-pressed buttons.
// restoreOpen MUST be observed to navigate to the real control from partial
// open/close states without toggling it closed; it is never inferred from open.
export function parseHostThemeContract(json) {
  if (!json) return null;
  const value = JSON.parse(json);
  const action = item => item && typeof item.role === 'string' && typeof item.name === 'string' && item.name.length > 0;
  assert.ok(Array.isArray(value.close) && value.close.length && value.close.every(action), 'Theme close actions must describe observed accessible Host controls.');
  assert.ok(value.restoreOpen?.idempotent === true, 'An explicitly observed idempotent restoreOpen contract is required before theme automation.');
  if (value.control?.kind === 'buttons') {
    assert.ok(typeof value.control.scope === 'string' && value.control.scope, 'Observed theme button scope is required.');
    assert.ok(['light', 'dark', 'system'].every(key => typeof value.control.choices?.[key] === 'string' && value.control.choices[key]), 'Observed Light/Dark/System button labels are required.');
    assert.equal(new Set(Object.values(value.control.choices)).size, 3);
    assert.ok(typeof value.navigation?.launcherSelector === 'string' && value.navigation.launcherSelector && typeof value.navigation.dialogSelector === 'string' && value.navigation.dialogSelector, 'Observed launcher slot and Settings dialog selectors are required.');
    assert.ok(action(value.navigation.settings) && value.navigation.settings.role === 'menuitem' && action(value.navigation.general) && value.navigation.general.role === 'button', 'Observed Settings menuitem and General button are required.');
    assert.ok(typeof value.cssSelector === 'string' && value.cssSelector, 'Actual Host CSS token element must be specified independently of the indicator.');
    assert.equal(value.values?.light, 'light'); assert.equal(value.values?.dark, 'dark');
  } else {
    assert.ok(Array.isArray(value.open) && value.open.length && value.open.every(action), 'Theme open actions must describe observed accessible Host controls.');
    assert.ok(Array.isArray(value.restoreOpen.actions) && value.restoreOpen.actions.length && value.restoreOpen.actions.every(action), 'Observed idempotent restore actions are required.');
    assert.ok(action(value.control) && value.control.role === 'combobox', 'Theme adapter requires an observed combobox or button group.');
  }
  assert.ok(['light', 'dark'].every(mode => typeof value.values?.[mode] === 'string' && value.values[mode]), 'Actual Host light/dark option values are required.');
  assert.notEqual(value.values.light, value.values.dark);
  assert.ok(['selector', 'attribute', 'light', 'dark'].every(key => typeof value.indicator?.[key] === 'string' && value.indicator[key]), 'Observed Host theme state indicator is required.');
  assert.notEqual(value.indicator.light, value.indicator.dark);
  return value;
}

// Observed actual launcher -> Settings menuitem -> General navigation. Every
// branch checks LIVE visibility; an already-open menu is never toggled closed.
export async function ensureObservedThemeNavigation(adapter) {
  if (await adapter.hasControl()) return;
  if (!await adapter.hasDialog()) {
    if (!await adapter.hasSettingsMenuItem()) await adapter.clickLauncher();
    await adapter.clickSettingsItem();
  }
  await adapter.clickGeneral();
  await adapter.waitControl();
}

// Public interaction lifecycle, also tested with a tiny state adapter. This is
// not a fake browser/application: production callers below use real locators.
export async function withRestoredHostTheme(adapter, eventually, run, baseline) {
  assert.equal(typeof adapter.verifyPersisted, 'function', 'Fresh independent Host verification is required before theme changes.');
  let original, hostState;
  await inThemePhase(adapter.diagnostics, 'theme.open', async () => {
    await adapter.ensureOpen();
    await adapter.ensureOpen(); // Must be idempotent BEFORE any global mutation.
    original = baseline?.setting ?? await adapter.readSetting();
    hostState = baseline?.state ?? await adapter.readHostState();
    assert.ok(typeof original === 'string' && original, 'Original Host theme setting is required.');
  });
  try {
    await inThemePhase(adapter.diagnostics, 'theme.baseline', () => eventually(async () => assert.equal(await adapter.readSetting(), original), 'Theme UI settles to authoritative original source before mutation'));
    return await run();
  } finally {
    let failure;
    try {
      await inThemePhase(adapter.diagnostics, 'restore.ui', async () => {
        // No remembered settingsOpen boolean: recover from the LIVE partial state.
        await adapter.ensureOpen();
        await adapter.selectSetting(original); // Exact finished/logically accepted RPC.
        await eventually(async () => {
          assert.equal(await adapter.readSetting(), original, 'Original Host theme option restored.');
          assert.deepEqual(await adapter.readHostState(), hostState, 'Original actual Host indicator AND CSS restored.');
        }, 'Original actual Host theme restored');
      });
    } catch (cause) { failure = cause; }
    try {
      // Always independently verify/repair after a failed acknowledgement too.
      // The actual callback closes the old tab before opening the fresh reader.
      await inThemePhase(adapter.diagnostics, 'restore.fresh', () => adapter.verifyPersisted({ setting: original, state: hostState, minimumRevision: baseline?.revision ?? 0 }));
    } catch (cause) { failure ??= cause; }
    if (failure) throw new Error('Actual Host theme restoration could not be verified; manual restoration may be required. No passing result is permitted.', { cause: failure });
  }
}

// Shared real-reader lifecycle. openReader() returns an owned resource with
// prepare(), observeAuthority(): { wait(), cancel() }, load(), waitReady(), and
// adapter: { ensureOpen(), readSetting(), readHostState(), selectSetting(),
// acknowledgements? }. closeReader(resource) closes only that owned resource.
// observeAuthority must use the validated, read-only actual Host description;
// adapter selection must use normal observed UI with exact persistence ACKs.
// Tests supply resource/interaction callbacks, never a browser or DOM renderer.
export async function verifyFreshHostThemeRestoration({ openReader, closeReader, eventually, evidence }, expected) {
  assert.ok(['light', 'dark', 'system'].includes(expected.setting), 'Freshly captured original theme choice is required.');
  assert.ok(Number.isSafeInteger(expected.minimumRevision) && expected.minimumRevision >= 0, 'Original Host revision is required.');
  let minimumRevision = expected.minimumRevision, resourcesUnclosed = false;
  async function withFreshReader(run) {
    let reader, read;
    try {
      reader = await openReader();
      await reader.prepare();
      read = reader.observeAuthority(); // Always BEFORE load/default UI.
      await reader.load();
      await reader.waitReady();
      const durable = await read.wait();
      const adapter = reader.adapter;
      seedThemeRevisionFloor(adapter, minimumRevision);
      minimumRevision = seedThemeRevisionFloor(adapter, durable.revision); // BEFORE any repair UI.
      await adapter.ensureOpen();
      await eventually(async () => {
        assert.equal(await adapter.readSetting(), durable.preference);
        assert.equal((await adapter.readHostState()).indicator, durable.preference);
      }, 'Fresh UI settles to authoritative saved source, never a startup default');
      return await run({ adapter, durable, state: await adapter.readHostState(), selected: await adapter.readSetting() });
    } finally {
      // Cleanup also owns partial acquisitions; no returned snapshot is needed.
      // Cancellation failure must NEVER prevent owned-resource close. A failed
      // close gets one bounded retry, but its failure remains a failed probe.
      let cleanupError;
      try { read?.cancel(); } catch (error) { cleanupError = error; }
      if (reader) {
        try { await closeReader(reader); }
        catch (error) {
          cleanupError ??= error;
          try { await closeReader(reader); } catch { resourcesUnclosed = true; }
        }
      }
      if (cleanupError) { evidence.readerCleanupFailed = true; throw cleanupError; }
    }
  }
  const prove = snapshot => {
    assert.equal(snapshot.durable.preference, expected.setting, 'Fresh authoritative Host source equals original.');
    assert.ok(snapshot.durable.revision >= minimumRevision, 'Fresh Host read cannot predate accepted writes.');
    assert.equal(snapshot.selected, expected.setting);
    assert.deepEqual(snapshot.state, expected.state, 'Fresh selected source/HTML/BODY equals original snapshot.');
    return { freshSource: snapshot.durable.preference, freshRevision: snapshot.durable.revision, selectedSource: snapshot.selected, state: snapshot.state };
  };
  let failure;
  const manualRestoration = () => {
    Object.assign(evidence, {
      manualRestorationRequired: true, manualRestorationSource: expected.setting,
      manualRestorationAction: 'Use normal Host Settings theme controls to restore the freshly captured original choice, then independently verify the saved source.',
    });
    return new Error('Fresh Host theme restoration could not be independently verified; manual restoration to the freshly captured original choice is required. No passing result is allowed.', { cause: failure });
  };
  try {
    const proof = await withFreshReader(prove);
    Object.assign(evidence, proof, { freshVerified: true });
    return;
  } catch (error) { failure = error; }
  if (resourcesUnclosed) throw manualRestoration();

  // Initial acquisition/settlement can fail before producing ANY snapshot.
  // Reacquire authority + settled UI, bounded to two recovery readers. Once a
  // reader reaches repair, never repeat a possibly accepted but unacked write.
  for (let attempt = 0; attempt < 2; attempt++) {
    let acquired = false;
    try {
      await withFreshReader(async snapshot => {
        acquired = true;
        assert.ok(snapshot.durable.revision >= minimumRevision, 'Repair authority cannot predate accepted writes.');
        if (snapshot.durable.preference === expected.setting) {
          prove(snapshot); // Already original: do NOT cause a needless UI write.
          evidence.repairNeeded = false;
          return;
        }
        evidence.repairAttempted = true;
        evidence.repairAcknowledged = false;
        const retainAcceptedRepair = accepted => {
          assert.equal(accepted.preference, expected.setting);
          assert.ok(Number.isSafeInteger(accepted.revision) && accepted.revision >= snapshot.durable.revision, 'Repair acknowledgement must carry a current accepted revision.');
          minimumRevision = Math.max(minimumRevision, accepted.revision);
          evidence.repairRevision = minimumRevision;
          evidence.repairAcknowledged = true;
        };
        try {
          const accepted = await snapshot.adapter.selectSetting(expected.setting);
          assert.equal(typeof accepted?.changed, 'boolean', 'Normal observed theme selection must report whether it changed.');
          if (accepted.changed) retainAcceptedRepair(accepted);
        } finally {
          // An accepted write stays authoritative even if subsequent UI settling
          // or observation cancellation throws before selectSetting can return.
          minimumRevision = Math.max(minimumRevision, snapshot.adapter.minimumRevision);
          for (const ack of snapshot.adapter.acknowledgements || []) {
            assert.equal(ack.operation, 'settings/mutate'); assert.equal(ack.namespace, 'ui-theme');
            assert.equal(ack.field, 'preference'); assert.equal(ack.status, 200);
            retainAcceptedRepair(ack);
          }
        }
      });
      break;
    } catch {
      if (resourcesUnclosed) throw manualRestoration();
      if (acquired) break;
    }
  }
  try {
    const proof = await withFreshReader(prove); // Independent of every repair UI.
    Object.assign(evidence, { repairFreshVerified: true, repairProof: proof });
  } catch { throw manualRestoration(); }
  // Recovery is safety cleanup, NEVER permission to convert a failed test to PASS.
  throw new Error('Fresh Host theme verification failed; original source independently verified after recovery. No passing result is allowed.', { cause: failure });
}

async function exerciseReviewThemeStates({ page, panel, fixture, eventually }) {
  const reopen = panel.getByRole('button', { name: 'Review setup again', exact: true });
  if (await reopen.isVisible()) await reopen.click();
  const review = panel.getByRole('region', { name: 'Review your prayer-time setup', exact: true });
  await review.waitFor({ state: 'visible' });
  const group = panel.getByRole('group', { name: /^(Calculation settings|Offline fallback settings)$/ });
  await group.waitFor({ state: 'visible' });
  for (const choice of ['source', 'location', 'method']) {
    const checkbox = review.getByTestId(`salah-review-${choice}`);
    await checkbox.waitFor({ state: 'visible' });
    if (await checkbox.isChecked()) await checkbox.uncheck();
    await checkbox.focus(); await checkbox.press('Space');
    requireTheme(await checkbox.isChecked() === true, 'REVIEW_CHECKBOX_CHECKED', 'Keyboard checks actual review controls in each Host theme.');
    const paint = await checkbox.evaluate(element => {
      const style = getComputedStyle(element), box = element.getBoundingClientRect();
      return { active: document.activeElement === element, focusVisible: element.matches(':focus-visible'), outline: parseFloat(style.outlineWidth), outlineStyle: style.outlineStyle, width: box.width, height: box.height, opacity: Number(style.opacity), visibility: style.visibility };
    });
    requireTheme(paint.active && paint.focusVisible && paint.outline > 0 && paint.outlineStyle !== 'none', 'REVIEW_CHECKBOX_FOCUS', 'Actual theme must retain visible checkbox keyboard focus.');
    requireTheme(paint.width >= 12 && paint.height >= 12 && paint.opacity > 0 && paint.visibility === 'visible', 'REVIEW_CHECKBOX_PAINT', 'Actual checked control remains painted and visible.');
  }
  const method = group.getByLabel('Calculation method', { exact: true });
  await method.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  requireTheme(await method.evaluate(element => document.activeElement === element && element.matches(':focus-visible')) === true, 'REVIEW_METHOD_FOCUS', 'Actual calculation fieldset retains keyboard focus under Host theme.');
  requireTheme(await review.getByRole('button', { name: 'Confirm reviewed setup', exact: true }).isEnabled() === true, 'REVIEW_CONFIRM_ENABLED', 'Reviewed confirmation is enabled.');
  const gate = fixture.holdNext('status');
  try {
    await panel.getByRole('button', { name: 'Refresh', exact: true }).click();
    await eventually(async () => requireTheme(gate.isStarted === true, 'REVIEW_PENDING_STATUS', 'Controlled status read has started.'), 'Controlled status read reaches pending state for theme disabled checks');
    for (const choice of ['source', 'location', 'method']) requireTheme(await review.getByTestId(`salah-review-${choice}`).isDisabled() === true, 'REVIEW_CHECKBOX_DISABLED', 'Pending status disables review checkbox.');
    requireTheme(await method.isDisabled() === true, 'REVIEW_METHOD_DISABLED', 'Pending status disables actual calculation fieldset controls.');
    requireTheme(await group.getByLabel('Asr convention', { exact: true }).isDisabled() === true, 'REVIEW_ASR_DISABLED', 'Pending status disables Asr control.');
    requireTheme(await review.getByRole('button', { name: 'Confirm reviewed setup', exact: true }).isDisabled() === true, 'REVIEW_CONFIRM_DISABLED', 'Pending status disables reviewed confirmation.');
  } finally { gate.release(); }
  await eventually(async () => requireTheme(await method.isEnabled() === true, 'REVIEW_METHOD_REENABLED', 'Valid status response enables method control.'), 'Valid status response restores actual fieldset interactivity');
}

export async function readHostThemeState(page, contract) {
  const css = await page.locator(contract.cssSelector || contract.indicator.selector).evaluate(element => {
    const style = getComputedStyle(element);
    return { backgroundToken: style.getPropertyValue('--dsw-alias-bg-base').trim(), textToken: style.getPropertyValue('--dsw-alias-label-primary').trim(), colorScheme: style.colorScheme };
  });
  const state = { indicator: await page.locator(contract.indicator.selector).getAttribute(contract.indicator.attribute), ...css };
  assert.ok(state.indicator !== null && state.backgroundToken && state.textToken, 'Observed Host state must expose an actual theme indicator AND computed CSS tokens.');
  return state;
}

export function createHostThemeAdapter({ page, contract, eventually, diagnostics, minimumRevision }) {
  const clickActions = async actions => {
    for (const action of actions) await page.getByRole(action.role, { name: action.name, exact: true }).click();
  };
  const indicator = () => page.locator(contract.indicator.selector);
  let adapter;
  if (contract.control.kind === 'buttons') {
    const choices = ['light', 'dark', 'system'];
    const button = key => page.locator(contract.control.scope).getByRole('button', { name: contract.control.choices[key], exact: true });
    const settings = () => page.getByRole(contract.navigation.settings.role, { name: contract.navigation.settings.name, exact: true });
    const general = () => page.locator(contract.navigation.dialogSelector).getByRole(contract.navigation.general.role, { name: contract.navigation.general.name, exact: true });
    const navigation = {
      async hasControl() { for (const key of choices) if (!await button(key).isVisible()) return false; return true; },
      hasDialog: () => page.locator(contract.navigation.dialogSelector).isVisible(),
      hasSettingsMenuItem: () => settings().isVisible(),
      async clickLauncher() { await page.locator(contract.navigation.launcherSelector).click(); await settings().waitFor({ state: 'visible' }); },
      async clickSettingsItem() { await settings().click(); await general().waitFor({ state: 'visible' }); },
      async clickGeneral() { await general().click(); },
      async waitControl() { for (const key of choices) await button(key).waitFor({ state: 'visible' }); },
    };
    adapter = {
      async ensureOpen() {
        // One bounded re-read handles a dialog disappearing during its close
        // animation. Each attempt re-evaluates actual live menu/dialog state.
        for (let attempt = 0; ; attempt++) {
          try { await ensureObservedThemeNavigation(navigation); return; }
          catch (error) { if (attempt === 1) throw error; }
        }
      },
      async readSettlementVisibility() {
        return { dialogVisible: await navigation.hasDialog(), generalVisible: await general().isVisible(), choicesVisible: await navigation.hasControl(), settingsMenuVisible: await navigation.hasSettingsMenuItem() };
      },
      async readSetting() {
        const pressed = [];
        for (const key of choices) if (await button(key).getAttribute('aria-pressed') === 'true') pressed.push(key);
        assert.equal(pressed.length, 1, 'Exactly one actual Host theme button must be selected.');
        return pressed[0];
      },
      async clickSetting(value) {
        assert.ok(choices.includes(value), 'Only observed Host theme choices may be selected.');
        await button(value).click();
      },
    };
  } else {
    const select = () => page.getByRole(contract.control.role, { name: contract.control.name, exact: true });
    adapter = {
      async ensureOpen() { if (!await select().isVisible()) { await clickActions(contract.restoreOpen.actions); await select().waitFor({ state: 'visible' }); } },
      readSetting: () => select().inputValue(), clickSetting: value => select().selectOption(value),
      readSettlementVisibility: async () => ({ choicesVisible: await select().isVisible() }),
    };
  }
  adapter.acknowledgements = [];
  adapter.diagnostics = diagnostics;
  if (minimumRevision !== undefined) seedThemeRevisionFloor(adapter, minimumRevision);
  adapter.watchPersistence = (target, floor) => observeThemeRpc(page, new URL(page.url()).origin, 'write', target, 15000, diagnostics, floor);
  adapter.onPersistenceAccepted = accepted => adapter.acknowledgements.push({ operation: 'settings/mutate', namespace: 'ui-theme', field: 'preference', preference: accepted.preference, revision: accepted.revision, status: 200 });
  adapter.selectSetting = target => commitObservedThemeSelection(adapter, target);
  adapter.readHostState = () => readHostThemeState(page, contract);
  adapter.readSettlementState = async () => {
    const visibility = await adapter.readSettlementVisibility();
    const state = await adapter.readHostState();
    return { ...visibility, source: state.indicator, backgroundToken: state.backgroundToken, textToken: state.textToken, colorScheme: state.colorScheme };
  };
  adapter.waitForSelected = target => settleObservedThemeSelection(adapter, target, eventually);
  return adapter;
}

export async function exerciseHostThemes({ page, panel, fixture, contract, eventually, authorized = false, originalTheme, verifyRestored, createAdapter = createHostThemeAdapter }) {
  assert.equal(authorized, true, 'Actual Host theme changes require explicit user authorization.');
  assert.ok(originalTheme && ['light', 'dark', 'system'].includes(originalTheme.setting) && Number.isSafeInteger(originalTheme.revision), 'Authoritative initial Host theme read is required before mutation.');
  assert.equal(typeof verifyRestored, 'function', 'Fresh owned-tab durable verification is mandatory.');
  const adapter = createAdapter({ page, contract, eventually, diagnostics: originalTheme.diagnostics, minimumRevision: originalTheme.revision });
  adapter.verifyPersisted = expected => verifyRestored({ ...expected, minimumRevision: Math.max(expected.minimumRevision, adapter.minimumRevision, ...adapter.acknowledgements.map(ack => ack.revision)), acknowledgements: adapter.acknowledgements });
  const indicator = () => page.locator(contract.indicator.selector);
  const observed = {};
  await withRestoredHostTheme(adapter, eventually, async () => {
    for (const mode of ['light', 'dark']) {
      await inThemePhase(adapter.diagnostics, `${mode}.select`, async () => {
        await adapter.ensureOpen();
        await adapter.selectSetting(contract.values[mode]);
        await eventually(async () => assert.equal(await indicator().getAttribute(contract.indicator.attribute), contract.indicator[mode]), `Actual Host theme becomes ${mode}`);
      });
      await inThemePhase(adapter.diagnostics, `${mode}.panel`, async () => {
        // A failure in ANY close action now enters live-state restoration above.
        for (const action of contract.close) await page.getByRole(action.role, { name: action.name, exact: true }).click();
        await page.getByRole('button', { name: 'Open Salah prayer times', exact: true }).click();
        await panel.waitFor({ state: 'visible' });
        observed[mode] = await panel.evaluate(element => {
          const style = getComputedStyle(element);
          return { background: style.backgroundColor, text: style.color, token: style.getPropertyValue('--dsw-alias-bg-base').trim() };
        });
        assert.ok(observed[mode].token, 'Salah must inherit an actual Host theme token.');
        assert.notEqual(observed[mode].background, observed[mode].text);
        await panel.getByRole('button', { name: 'Reset widget position', exact: true }).click();
      });
      await inThemePhase(adapter.diagnostics, `${mode}.review`, () => exerciseReviewThemeStates({ page, panel, fixture, eventually }));
    }
    await inThemePhase(adapter.diagnostics, 'theme.compare', async () => assert.notDeepEqual(observed.light, observed.dark, 'Actual Host theme switch changes rendered Salah appearance.'));
  }, originalTheme);
  // Restoration closes the old owned tab and verifies an authoritative Host
  // read plus selected source/HTML/BODY in a fresh owned tab before returning.
}
