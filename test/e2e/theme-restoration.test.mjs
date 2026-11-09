import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { withRestoredHostTheme, parseHostThemeContract, exerciseHostThemes, ensureObservedThemeNavigation, matchThemeWrite, readThemeWriteAck, readThemeDescribeAck, commitObservedThemeSelection, observeThemeRpc, verifyFreshHostThemeRestoration, inThemePhase, requireTheme, createHostThemeAdapter, settleObservedThemeSelection } from './host-theme.mjs';

test('generated settings mutate named wire matches exact fields and rejects obsolete positional array arguments', () => {
  // Generated Typert descriptor: direct/unary, wires ns/ops/expectedRevision?.
  const args = { ns: 'ui-theme', ops: [{ op: 'set', path: ['preference'], value: 'dark' }], expectedRevision: 7 };
  const body = { type: 'client-request', rpcId: 'owned-named-rpc', method: 'settings/mutate', payload: { args } };
  assert.deepEqual(matchThemeWrite(body, 'dark'), { rpcId: 'owned-named-rpc', target: 'dark', expectedRevision: 7 });
  assert.equal(matchThemeWrite({ ...body, payload: { args: [args.ns, args.ops, args.expectedRevision] } }, 'dark'), null);
  assert.equal(matchThemeWrite({ ...body, payload: { args: { ...args, ns: 'other' } } }, 'dark'), null);
  assert.equal(matchThemeWrite({ ...body, payload: { args: { ...args, unknown: true } } }, 'dark'), null);
});

test('omitted optional named revision still requires a loaded authoritative floor and rejects stale accepted ACKs', () => {
  const body = { type: 'client-request', rpcId: 'owned-optional-rpc', method: 'settings/mutate', payload: { args: { ns: 'ui-theme', ops: [{ op: 'set', path: ['preference'], value: 'dark' }] } } };
  const request = matchThemeWrite(body, 'dark');
  assert.deepEqual(request, { rpcId: 'owned-optional-rpc', target: 'dark' });
  const response = revision => ({ type: 'server-response', rpcId: body.rpcId, result: { ok: true, value: { ns: 'ui-theme', value: { preference: 'dark' }, revision } } });
  assert.deepEqual(readThemeWriteAck(response(7), request, 7), { preference: 'dark', revision: 7 });
  assert.throws(() => readThemeWriteAck(response(6), request, 7), error => error.themeCode === 'RESPONSE_REVISION_LOWER_BOUND');
  assert.throws(() => readThemeWriteAck(response(8), request), error => error.themeCode === 'RESPONSE_REVISION_FLOOR_REQUIRED');
  assert.throws(() => readThemeWriteAck(response(8), { ...request, expectedRevision: 7 }), error => error.themeCode === 'RESPONSE_REVISION_FLOOR_REQUIRED');
  assert.throws(() => readThemeWriteAck(response(7), { ...request, expectedRevision: 8 }, 7), error => error.themeCode === 'RESPONSE_REVISION_LOWER_BOUND');
  assert.throws(() => readThemeWriteAck(response(8), { ...request, expectedRevision: 7 }, 9), error => error.themeCode === 'RESPONSE_REVISION_LOWER_BOUND');
  for (const invalid of [null, undefined, '7', -1, 1.5, Infinity]) assert.equal(matchThemeWrite({ ...body, payload: { args: { ...body.payload.args, expectedRevision: invalid } } }, 'dark'), null);
});

test('selection passes its loaded revision floor to observation and raises it before post-ACK UI failure', async () => {
  let watchedFloor, floorDuringUi, clicked = false;
  const adapter = {
    minimumRevision: 9, readSetting: async () => 'light',
    watchPersistence(target, floor) { watchedFloor = floor; return { wait: async () => ({ preference: 'dark', revision: 10 }), cancel() {} }; },
    async clickSetting() { clicked = true; },
    async waitForSelected() { floorDuringUi = adapter.minimumRevision; throw new Error('Selected UI failed after accepted revision.'); },
  };
  await assert.rejects(commitObservedThemeSelection(adapter, 'dark'), /Selected UI failed/);
  assert.equal(watchedFloor, 9);
  assert.equal(floorDuringUi, 10);
  assert.equal(adapter.minimumRevision, 10);
  assert.equal(clicked, true);
  delete adapter.minimumRevision; clicked = false;
  await assert.rejects(commitObservedThemeSelection(adapter, 'dark'), error => error.themeCode === 'RESPONSE_REVISION_FLOOR_REQUIRED');
  assert.equal(clicked, false, 'No loaded authoritative floor means no UI mutation.');
});

test('completed exact ACK is retained even when the dispatched click promise later rejects, while the run still fails', async () => {
  const events = new EventEmitter(), accepted = [], clickFailure = new Error('Click rejected after dispatch and accepted ACK.');
  const body = { type: 'client-request', rpcId: 'owned-click-rpc', method: 'settings/mutate', payload: { args: { ns: 'ui-theme', ops: [{ op: 'set', path: ['preference'], value: 'dark' }], expectedRevision: 7 } } };
  const adapter = {
    minimumRevision: 7, readSetting: async () => 'light',
    watchPersistence: (target, floor) => observeThemeRpc(events, 'http://harness.example.test', 'write', target, 1000, undefined, floor),
    onPersistenceAccepted: value => accepted.push(value),
    async clickSetting() {
      events.emit('response', {
        url: () => 'http://harness.example.test/api/settings/mutate', status: () => 200,
        request: () => ({ method: () => 'POST', postDataJSON: () => body }), finished: async () => null,
        json: async () => ({ type: 'server-response', rpcId: body.rpcId, result: { ok: true, value: { ns: 'ui-theme', value: { preference: 'dark' }, revision: 8 } } }),
      });
      await new Promise(resolve => setImmediate(resolve));
      throw clickFailure;
    },
    async waitForSelected() { assert.fail('Rejected click must never become a passing selection.'); },
  };
  await assert.rejects(commitObservedThemeSelection(adapter, 'dark'), error => error === clickFailure);
  assert.equal(adapter.minimumRevision, 8);
  assert.deepEqual(accepted, [{ preference: 'dark', revision: 8 }]);
  assert.equal(events.listenerCount('response'), 0);
});

test('post-ACK disappeared General controls reopen through observed navigation without a second preference write', async () => {
  let view = 'general', selected = 'light', writes = 0, accepted = false, finish;
  const finished = new Promise(resolve => { finish = resolve; });
  const actions = [], diagnostics = { phase: 'dark.select', settlements: [] };
  const navigation = {
    hasControl: async () => view === 'general', hasDialog: async () => view === 'dialog', hasSettingsMenuItem: async () => view === 'menu',
    async clickLauncher() { assert.equal(view, 'closed'); actions.push('launcher'); view = 'menu'; },
    async clickSettingsItem() { actions.push('settings'); view = 'dialog'; },
    async clickGeneral() { actions.push('general'); view = 'general'; }, async waitControl() { assert.equal(view, 'general'); },
  };
  const adapter = {
    minimumRevision: 7, diagnostics,
    ensureOpen: () => ensureObservedThemeNavigation(navigation),
    readSettlementState: async () => ({ dialogVisible: view === 'dialog' || view === 'general', generalVisible: view === 'general', choicesVisible: view === 'general', settingsMenuVisible: view === 'menu', source: selected, backgroundToken: 'PRIVATE-CSS-TOKEN', textToken: '#0f1115', colorScheme: 'dark', private: 'PRIVATE-UI-PAYLOAD' }),
    async readSetting() { if (view !== 'general') throw Object.assign(new Error('Owned General controls disappeared.'), { name: 'TimeoutError' }); return selected; },
    readHostState: async () => ({ indicator: selected }),
    watchPersistence: () => ({
      async wait() { const result = await finished; accepted = true; selected = 'dark'; view = 'closed'; return result; }, cancel() {},
    }),
    async clickSetting() { assert.equal(accepted, false); writes++; finish({ preference: 'dark', revision: 8 }); },
    waitForSelected: target => settleObservedThemeSelection(adapter, target, async check => check()),
  };
  await commitObservedThemeSelection(adapter, 'dark');
  assert.equal(adapter.minimumRevision, 8);
  assert.deepEqual(actions, ['launcher', 'settings', 'general']);
  assert.equal(writes, 1, 'Settlement navigates only; it must never click a preference again.');
  assert.equal(view, 'general'); assert.equal(selected, 'dark');
  assert.equal(diagnostics.settlements[0].before.choicesVisible, false);
  assert.equal(diagnostics.settlements[0].after.choicesVisible, true);
  assert.equal(diagnostics.settlements[0].settled, true);
  assert.equal(diagnostics.settlements[0].before.backgroundToken, 'other');
  assert.doesNotMatch(JSON.stringify(diagnostics), /PRIVATE-/);
});

test('post-ACK controls remounting during selected-state read get one bounded live reopening retry', async () => {
  let view = 'general', reads = 0, opens = 0;
  const diagnostics = { phase: 'dark.select' };
  const adapter = {
    diagnostics,
    async ensureOpen() { opens++; view = 'general'; },
    async readSetting() { if (++reads === 1) { view = 'closed'; throw Object.assign(new Error('Private timeout detail.'), { name: 'TimeoutError' }); } assert.equal(view, 'general'); return 'dark'; },
    readHostState: async () => ({ indicator: 'dark' }),
  };
  await settleObservedThemeSelection(adapter, 'dark', async check => check());
  assert.equal(opens, 2); assert.equal(reads, 2);
  assert.equal(diagnostics.settlements.length, 2);
  assert.equal(diagnostics.settlements[0].settled, false);
  assert.equal(diagnostics.settlements[0].checkpoint, 'POST_ACK_SELECTED');
  assert.equal(diagnostics.settlements[0].causeCode, 'UI_TIMEOUT');
  assert.equal(diagnostics.settlements[1].settled, true);
  assert.doesNotMatch(JSON.stringify(diagnostics), /Private timeout/);
});

test('persistent post-ACK navigation timeout, wrong selected state, or wrong HTML source remains failed with accepted revision retained', async () => {
  for (const checkpoint of ['POST_ACK_NAVIGATION', 'POST_ACK_SELECTED', 'POST_ACK_INDICATOR']) {
    let clicked = false, opens = 0, writes = 0;
    const diagnostics = { phase: 'dark.select', failures: [] }, accepted = [];
    const adapter = {
      diagnostics, minimumRevision: 7,
      async ensureOpen() { opens++; if (checkpoint === 'POST_ACK_NAVIGATION') throw Object.assign(new Error('PRIVATE-NAVIGATION-DETAIL'), { name: 'TimeoutError' }); },
      readSetting: async () => !clicked || checkpoint === 'POST_ACK_SELECTED' ? 'light' : 'dark',
      readHostState: async () => ({ indicator: checkpoint === 'POST_ACK_INDICATOR' ? 'light' : 'dark' }),
      watchPersistence: () => ({ wait: async () => ({ preference: 'dark', revision: 8 }), cancel() {} }),
      onPersistenceAccepted: value => accepted.push(value),
      async clickSetting() { clicked = true; writes++; },
      waitForSelected: target => settleObservedThemeSelection(adapter, target, async check => check()),
    };
    await assert.rejects(inThemePhase(diagnostics, 'dark.select', () => commitObservedThemeSelection(adapter, 'dark')), error => error.themeCode === checkpoint);
    assert.equal(adapter.minimumRevision, 8);
    assert.equal(accepted.length, 1); assert.equal(writes, 1); assert.equal(opens, 2);
    assert.equal(diagnostics.failedPhase, 'dark.select');
    assert.equal(diagnostics.failures[0].code, checkpoint);
    assert.ok(diagnostics.settlements.every(record => record.settled === false));
    assert.doesNotMatch(JSON.stringify(diagnostics), /PRIVATE-/);
  }
});

test('post-ACK settlement diagnostics stay bounded and optional snapshot failure cannot replace actual selection proof', async () => {
  const diagnostics = { phase: 'dark.select' };
  const adapter = {
    diagnostics, async ensureOpen() {}, readSetting: async () => 'dark', readHostState: async () => ({ indicator: 'dark' }),
    async readSettlementState() { throw new Error('PRIVATE-SNAPSHOT-DETAIL'); },
  };
  for (let index = 0; index < 10; index++) await settleObservedThemeSelection(adapter, 'dark', async check => check());
  assert.equal(diagnostics.settlements.length, 6);
  assert.ok(diagnostics.settlements.every(record => record.settled && record.before.available === false));
  assert.doesNotMatch(JSON.stringify(diagnostics), /PRIVATE-/);
});

test('actual adapter construction seeds the supplied authoritative baseline without touching a page', async () => {
  const contract = { control: { kind: 'buttons' } }; // Only lazy closures; no browser or DOM stand-in.
  const seeded = createHostThemeAdapter({ contract, minimumRevision: 7 });
  assert.equal(seeded.minimumRevision, 7);
  const unseeded = createHostThemeAdapter({ contract });
  await assert.rejects(commitObservedThemeSelection(unseeded, 'dark'), error => error.themeCode === 'RESPONSE_REVISION_FLOOR_REQUIRED');
});

test('HTTP named write observation rejects stale ACK against the loaded floor even with omitted request token', async () => {
  const events = new EventEmitter();
  assert.throws(() => observeThemeRpc(events, 'http://harness.example.test', 'write', 'dark'), error => error.themeCode === 'RESPONSE_REVISION_FLOOR_REQUIRED');
  assert.equal(events.listenerCount('response'), 0);
  const observer = observeThemeRpc(events, 'http://harness.example.test', 'write', 'dark', 1000, undefined, 8);
  const body = { type: 'client-request', rpcId: 'owned-floor-rpc', method: 'settings/mutate', payload: { args: { ns: 'ui-theme', ops: [{ op: 'set', path: ['preference'], value: 'dark' }] } } };
  const rejected = assert.rejects(observer.wait(), error => error.themeCode === 'RESPONSE_REVISION_LOWER_BOUND');
  events.emit('response', {
    url: () => 'http://harness.example.test/api/settings/mutate', status: () => 200,
    request: () => ({ method: () => 'POST', postDataJSON: () => body }), finished: async () => null,
    json: async () => ({ type: 'server-response', rpcId: body.rpcId, result: { ok: true, value: { ns: 'ui-theme', value: { preference: 'dark' }, revision: 7 } } }),
  });
  await rejected;
  assert.equal(events.listenerCount('response'), 0);
});

test('theme acknowledgements require exact namespace, field, RPC correlation, logical success and numeric revision', () => {
  const request = { type: 'client-request', rpcId: 'owned-test-rpc', method: 'settings/mutate', payload: { args: { ns: 'ui-theme', ops: [{ op: 'set', path: ['preference'], value: 'system' }], expectedRevision: 4 } } };
  const matched = matchThemeWrite(request, 'system');
  assert.ok(matched);
  assert.equal(matchThemeWrite({ ...request, payload: { args: { ...request.payload.args, ns: 'other-namespace' } } }, 'system'), null);
  assert.equal(matchThemeWrite(request, 'dark'), null);
  const response = { type: 'server-response', rpcId: 'owned-test-rpc', result: { ok: true, value: { ns: 'ui-theme', value: { preference: 'system' }, revision: 5 } } };
  assert.deepEqual(readThemeWriteAck(response, matched, 4), { preference: 'system', revision: 5 });
  assert.throws(() => readThemeWriteAck({ ...response, rpcId: 'different-rpc' }, matched, 4));
  assert.throws(() => readThemeWriteAck({ ...response, result: { ok: false, error: {} } }, matched, 4));
  assert.throws(() => readThemeWriteAck({ ...response, result: { ok: true, value: { ...response.result.value, revision: '5' } } }, matched, 4));
  const description = { type: 'server-response', rpcId: 'owned-read-rpc', result: { ok: true, value: { namespaces: [{ ns: 'unrelated', get value() { throw new Error('must not inspect unrelated values'); } }, response.result.value] } } };
  assert.deepEqual(readThemeDescribeAck(description, { rpcId: 'owned-read-rpc' }), { preference: 'system', revision: 5 });
});

test('RPC observer ignores Salah HTTP200 and waits for the exact theme response to finish', { timeout: 3000 }, async () => {
  const events = new EventEmitter(); let finish, completed = false;
  const finished = new Promise(resolve => { finish = resolve; });
  const body = { type: 'client-request', rpcId: 'owned-observer-rpc', method: 'settings/mutate', payload: { args: { ns: 'ui-theme', ops: [{ op: 'set', path: ['preference'], value: 'system' }], expectedRevision: 7 } } };
  const response = pathname => ({
    url: () => `http://harness.example.test${pathname}`, status: () => 200,
    request: () => ({ method: () => 'POST', postDataJSON: () => body }), finished: () => finished,
    async json() { return { type: 'server-response', rpcId: body.rpcId, result: { ok: true, value: { ns: 'ui-theme', value: { preference: 'system' }, revision: 8 } } }; },
  });
  const observer = observeThemeRpc(events, 'http://harness.example.test', 'write', 'system', 1500, undefined, 7);
  const wait = observer.wait().then(value => { completed = true; return value; });
  events.emit('response', response('/api/salah'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(completed, false, 'Generic fixture HTTP200 can never satisfy theme persistence.');
  events.emit('response', response('/api/settings/mutate'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(completed, false, 'Headers/optimistic UI before response.finished are insufficient.');
  finish(null);
  assert.deepEqual(await wait, { preference: 'system', revision: 8 });
  assert.equal(events.listenerCount('response'), 0, 'Only this observer listener is removed after completion.');
  observer.cancel();
});

test('theme selection registers its acknowledgement before click and cannot finish on optimistic UI state', async () => {
  let current = 'light', release, completed = false; const events = [];
  const durable = new Promise(resolve => { release = resolve; });
  const adapter = {
    minimumRevision: 5,
    readSetting: async () => current,
    watchPersistence(value) { events.push('watch'); return { wait: () => durable, cancel() { events.push('cancel'); } }; },
    async clickSetting(value) { assert.deepEqual(events, ['watch']); events.push('click'); current = value; },
    async waitForSelected(value) { assert.equal(current, value); },
  };
  const pending = commitObservedThemeSelection(adapter, 'system').then(result => { completed = true; return result; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(current, 'system'); assert.equal(completed, false, 'Optimistic pressed/CSS state is not durability.');
  release({ preference: 'system', revision: 6 });
  assert.equal((await pending).changed, true); assert.equal(completed, true);
  events.length = 0;
  assert.equal((await commitObservedThemeSelection(adapter, 'system')).changed, false);
  assert.deepEqual(events, [], 'Already-selected target must skip the network wait entirely.');
});

// A safe interaction adapter unit test, NOT a browser or DOM/React renderer.
// Actual Host-theme browser verification remains a separate mandatory case.
const immediate = async check => check();

const themeState = setting => ({ indicator: setting, backgroundToken: `${setting}-background`, textToken: `${setting}-text`, colorScheme: setting });

// Resource/authority/interaction boundary only: no browser, React, or DOM stand-in.
function freshReaderScenario(scripts = [], initial = 'light') {
  let source = initial, revision = 11;
  const readers = [], writes = [], events = [], evidence = { freshVerified: false };
  const expected = { setting: 'dark', state: themeState('dark'), minimumRevision: 10 };
  const lifecycle = {
    evidence, eventually: immediate,
    async openReader() {
      const script = scripts[readers.length] || {}, id = readers.length;
      const reader = { id, closed: 0, cancelled: 0, closeAttempts: 0 };
      readers.push(reader);
      let durable, settled = false;
      Object.assign(reader, {
        async prepare() { events.push([id, 'prepare']); if (script.prepareFailure) throw new Error('Reader preparation failed.'); },
        observeAuthority() {
          events.push([id, 'watch']);
          return {
            async wait() {
              events.push([id, 'authority']);
              if (script.readFailure) throw new Error('Authoritative describe timed out.');
              durable = script.durable || { preference: source, revision };
              return durable;
            },
            cancel() { reader.cancelled++; events.push([id, 'cancel']); if (script.cancelFailure) throw new Error('Observer cancellation failed.'); },
          };
        },
        async load() { assert.deepEqual(events.at(-1), [id, 'watch']); events.push([id, 'load']); },
        async waitReady() {},
        adapter: {
          acknowledgements: [],
          async ensureOpen() { assert.ok(durable, 'UI cannot substitute for authoritative data.'); events.push([id, 'open']); },
          async readSetting() {
            if (script.settleFailure) throw new Error('UI settlement failed.');
            settled = true;
            return durable.preference;
          },
          async readHostState() { return themeState(durable.preference); },
          async selectSetting(target) {
            assert.ok(settled, 'Repair requires authoritative source followed by settled observed UI.');
            if (script.requireSeed) assert.ok(this.minimumRevision >= durable.revision, 'Fresh repair must seed its floor from authority before writing.');
            if (script.selectedNoop) return { changed: false };
            writes.push(target); events.push([id, 'write']);
            source = target; revision++;
            this.acknowledgements.push({ operation: 'settings/mutate', namespace: 'ui-theme', field: 'preference', preference: source, revision, status: 200 });
            if (script.afterAckFailure) throw new Error('Selected UI did not settle after accepted repair.');
            return { changed: true, preference: source, revision };
          },
        },
      });
      return reader;
    },
    async closeReader(reader) {
      reader.closeAttempts++; events.push([reader.id, 'close']);
      if (reader.closeAttempts <= (scripts[reader.id]?.closeFailures || 0)) throw new Error('Owned reader close failed.');
      reader.closed++;
    },
  };
  return { lifecycle, expected, evidence, readers, writes, events, source: () => source };
}

test('first fresh authority timeout reacquires a reader, repairs through settled UI, and independently proves original source', async () => {
  const scenario = freshReaderScenario([{ readFailure: true }]);
  await assert.rejects(verifyFreshHostThemeRestoration(scenario.lifecycle, scenario.expected));
  assert.deepEqual(scenario.writes, ['dark'], 'A failed first reader must not suppress normal UI repair.');
  assert.equal(scenario.source(), 'dark');
  assert.equal(scenario.evidence.freshVerified, false, 'A repaired failed test never becomes a pass.');
  assert.equal(scenario.evidence.repairFreshVerified, true);
  assert.equal(scenario.readers.length, 3, 'Proof is independent of the repaired reader.');
  assert.ok(scenario.readers.every(reader => reader.closed === 1 && reader.cancelled === 1));
});

test('reacquired fresh repair adapter seeds its revision floor from authoritative durable data before UI write', async () => {
  const scenario = freshReaderScenario([{ readFailure: true }, { requireSeed: true }]);
  await assert.rejects(verifyFreshHostThemeRestoration(scenario.lifecycle, scenario.expected), /No passing result/);
  assert.deepEqual(scenario.writes, ['dark']);
  assert.equal(scenario.readers[1].adapter.minimumRevision, 11);
  assert.equal(scenario.evidence.repairRevision, 12);
  assert.equal(scenario.evidence.repairFreshVerified, true);
});

test('UI settlement failure before a full snapshot reacquires authority before any original-source repair', async () => {
  const scenario = freshReaderScenario([{ settleFailure: true }]);
  await assert.rejects(verifyFreshHostThemeRestoration(scenario.lifecycle, scenario.expected), /No passing result/);
  assert.deepEqual(scenario.writes, ['dark']);
  assert.equal(scenario.evidence.repairFreshVerified, true);
  assert.ok(scenario.events.findIndex(([id, event]) => id === 1 && event === 'authority') < scenario.events.findIndex(([, event]) => event === 'write'));
  assert.ok(scenario.readers.every(reader => reader.closed === 1 && reader.cancelled === 1));
});

test('independent repair proof rejects a read predating the newly accepted repair revision', async () => {
  const scenario = freshReaderScenario([{}, {}, { durable: { preference: 'dark', revision: 11 } }]);
  await assert.rejects(verifyFreshHostThemeRestoration(scenario.lifecycle, scenario.expected), /manual restoration/);
  assert.equal(scenario.evidence.repairRevision, 12);
  assert.notEqual(scenario.evidence.repairFreshVerified, true, 'Revision 11 cannot prove repair accepted at revision 12.');
  assert.deepEqual(scenario.writes, ['dark']);
  assert.ok(scenario.readers.every(reader => reader.closed === 1 && reader.cancelled === 1));
});

test('reader cleanup failure retries owned close without converting the failed probe to success', async () => {
  const scenario = freshReaderScenario([{ closeFailures: 1 }], 'dark');
  await assert.rejects(verifyFreshHostThemeRestoration(scenario.lifecycle, scenario.expected), /No passing result/);
  assert.equal(scenario.readers[0].closeAttempts, 2);
  assert.ok(scenario.readers.every(reader => reader.closed === 1 && reader.cancelled === 1));
  assert.equal(scenario.evidence.freshVerified, false);
  assert.equal(scenario.evidence.repairFreshVerified, true);
  assert.deepEqual(scenario.writes, [], 'Cleanup failure cannot justify needless theme writes.');
});

test('accepted repair revision survives a later selected-UI failure and rejects stale independent proof', async () => {
  const scenario = freshReaderScenario([{}, { afterAckFailure: true }, { durable: { preference: 'dark', revision: 11 } }]);
  await assert.rejects(verifyFreshHostThemeRestoration(scenario.lifecycle, scenario.expected), /manual restoration/);
  assert.equal(scenario.evidence.repairRevision, 12);
  assert.equal(scenario.evidence.repairAcknowledged, true);
  assert.notEqual(scenario.evidence.repairFreshVerified, true);
  assert.deepEqual(scenario.writes, ['dark'], 'Never retry a possibly accepted write after UI settlement failure.');
});

test('accepted ACK is retained before selected-UI settlement, even when selection then fails', async () => {
  const acknowledgements = [], accepted = { preference: 'dark', revision: 12 };
  let cancelled = false;
  const adapter = {
    minimumRevision: 11,
    readSetting: async () => 'light', async clickSetting() {},
    watchPersistence: () => ({ wait: async () => accepted, cancel() { cancelled = true; } }),
    onPersistenceAccepted: value => acknowledgements.push(value),
    async waitForSelected() { throw new Error('Selected UI failed after accepted ACK.'); },
  };
  await assert.rejects(commitObservedThemeSelection(adapter, 'dark'), /Selected UI failed/);
  assert.deepEqual(acknowledgements, [accepted]);
  assert.equal(cancelled, true);
});

test('fresh authoritative original source and CSS pass without a needless theme write', async () => {
  const scenario = freshReaderScenario([], 'dark');
  await verifyFreshHostThemeRestoration(scenario.lifecycle, scenario.expected);
  assert.equal(scenario.evidence.freshVerified, true);
  assert.deepEqual(scenario.writes, []);
  assert.equal(scenario.readers.length, 1);
  assert.ok(scenario.readers.every(reader => reader.closed === 1 && reader.cancelled === 1));
});

test('failed first probe remains failed when reacquired saved source is already original, without needless writes', async () => {
  const scenario = freshReaderScenario([{ readFailure: true }], 'dark');
  await assert.rejects(verifyFreshHostThemeRestoration(scenario.lifecycle, scenario.expected), /No passing result/);
  assert.deepEqual(scenario.writes, []);
  assert.equal(scenario.evidence.repairNeeded, false);
  assert.equal(scenario.evidence.repairFreshVerified, true);
  assert.equal(scenario.evidence.freshVerified, false);
});

test('unavailable authority or unsettled UI after bounded reacquisition fails with actionable manual restoration, never a repaired claim', async () => {
  for (const failure of [{ readFailure: true }, { settleFailure: true }]) {
    const scenario = freshReaderScenario(Array.from({ length: 4 }, () => failure));
    await assert.rejects(verifyFreshHostThemeRestoration(scenario.lifecycle, scenario.expected), /manual restoration/);
    assert.equal(scenario.readers.length, 4, 'Initial reader, at most two recovery readers, one independent proof.');
    assert.deepEqual(scenario.writes, [], 'Never write without both authority and settled observed controls.');
    assert.notEqual(scenario.evidence.repairFreshVerified, true);
    assert.equal(scenario.evidence.manualRestorationRequired, true);
    assert.equal(scenario.evidence.manualRestorationSource, 'dark', 'Restoration instruction uses captured current choice, not historical System.');
    assert.match(scenario.evidence.manualRestorationAction, /normal Host Settings/);
    assert.ok(scenario.readers.every(reader => reader.closed === 1 && reader.cancelled === 1));
  }
});

test('partial reader preparation failure still closes its owned resource before reacquisition and repair', async () => {
  const scenario = freshReaderScenario([{ prepareFailure: true }]);
  await assert.rejects(verifyFreshHostThemeRestoration(scenario.lifecycle, scenario.expected), /No passing result/);
  assert.equal(scenario.readers[0].cancelled, 0, 'No observer existed before preparation failed.');
  assert.ok(scenario.readers.every(reader => reader.closed === 1));
  assert.deepEqual(scenario.writes, ['dark']);
  assert.equal(scenario.evidence.repairFreshVerified, true);
});

test('observer cancellation failure cannot prevent owned reader close or convert the failed probe to pass', async () => {
  const scenario = freshReaderScenario([{ cancelFailure: true }], 'dark');
  await assert.rejects(verifyFreshHostThemeRestoration(scenario.lifecycle, scenario.expected), /No passing result/);
  assert.ok(scenario.readers.every(reader => reader.closed === 1 && reader.cancelled === 1));
  assert.equal(scenario.evidence.readerCleanupFailed, true);
  assert.equal(scenario.evidence.freshVerified, false);
  assert.equal(scenario.evidence.repairFreshVerified, true);
  assert.deepEqual(scenario.writes, []);
});

test('uncloseable owned reader aborts additional readers and requires manual restoration rather than false proof', async () => {
  const scenario = freshReaderScenario([{ closeFailures: 2 }], 'dark');
  await assert.rejects(verifyFreshHostThemeRestoration(scenario.lifecycle, scenario.expected), /manual restoration/);
  assert.equal(scenario.readers.length, 1, 'Do not claim independent proof while the old owned reader is still open.');
  assert.equal(scenario.readers[0].closeAttempts, 2);
  assert.equal(scenario.evidence.freshVerified, false);
  assert.notEqual(scenario.evidence.repairFreshVerified, true);
  assert.equal(scenario.evidence.manualRestorationRequired, true);
  assert.deepEqual(scenario.writes, []);
});

test('a selected UI no-op cannot prove repair unless fresh independent authority also equals original', async () => {
  const scenario = freshReaderScenario([{}, { selectedNoop: true }]);
  await assert.rejects(verifyFreshHostThemeRestoration(scenario.lifecycle, scenario.expected), /manual restoration/);
  assert.equal(scenario.evidence.repairAcknowledged, false);
  assert.notEqual(scenario.evidence.repairFreshVerified, true);
  assert.deepEqual(scenario.writes, []);
});

test('main regression failure stays failed after successful fresh independent restoration verification', async () => {
  const scenario = freshReaderScenario([], 'dark'), mainFailure = new Error('Main browser regression failed.');
  const adapter = {
    async ensureOpen() {}, readSetting: async () => 'dark', readHostState: async () => themeState('dark'),
    selectSetting: async () => ({ changed: false }),
    verifyPersisted: expected => verifyFreshHostThemeRestoration(scenario.lifecycle, expected),
  };
  await assert.rejects(withRestoredHostTheme(adapter, immediate, async () => { throw mainFailure; }, { ...scenario.expected, revision: 10 }), error => error === mainFailure);
  assert.equal(scenario.evidence.freshVerified, true, 'Safety proof may succeed while the main regression remains failed.');
  assert.deepEqual(scenario.writes, []);
});

test('theme RPC cancellation rejects pending observation and removes only its own listener', async () => {
  const events = new EventEmitter(), unrelated = () => {};
  events.on('response', unrelated);
  const observer = observeThemeRpc(events, 'http://harness.example.test', 'read', undefined, 1000);
  const rejected = assert.rejects(observer.wait(), /cancelled/);
  observer.cancel(); observer.cancel();
  await rejected;
  assert.deepEqual(events.listeners('response'), [unrelated]);
});

test('failed UI click cancels its exact pending RPC observer without an unhandled timeout', async () => {
  const events = new EventEmitter();
  const adapter = {
    minimumRevision: 4,
    readSetting: async () => 'light',
    watchPersistence: (target, floor) => observeThemeRpc(events, 'http://harness.example.test', 'write', target, 1000, undefined, floor),
    async clickSetting() { throw new Error('Observed control click failed.'); },
  };
  await assert.rejects(commitObservedThemeSelection(adapter, 'dark'), /Observed control click failed/);
  assert.equal(events.listenerCount('response'), 0);
});

test('theme phase diagnostics retain the first failure across UI restoration and fresh proof without raw messages', async () => {
  const diagnostics = { failures: [] }, secret = 'NEVER-REPORT-THIS-USER-PAYLOAD';
  const adapter = {
    diagnostics, async ensureOpen() {}, readSetting: async () => 'light', readHostState: async () => themeState('light'),
    async selectSetting() {}, async verifyPersisted() {},
  };
  await assert.rejects(withRestoredHostTheme(adapter, immediate, () => inThemePhase(diagnostics, 'light.review', async () => { throw new Error(secret); }), { setting: 'light', state: themeState('light'), revision: 3 }));
  assert.equal(diagnostics.phase, 'restore.fresh');
  assert.equal(diagnostics.failedPhase, 'light.review');
  assert.deepEqual(diagnostics.failures, [{ phase: 'light.review', code: 'UI_OPERATION_FAILED' }]);
  assert.doesNotMatch(JSON.stringify(diagnostics), /NEVER-REPORT|Error|stack/);
});

test('theme RPC diagnostics retain an exact ACK predicate code without raw RPC ids, errors, or other namespace values', async () => {
  const events = new EventEmitter(), diagnostics = { phase: 'dark.select', rpcs: [] };
  const body = { type: 'client-request', rpcId: 'PRIVATE-RPC-ID', method: 'settings/mutate', payload: { args: { ns: 'ui-theme', ops: [{ op: 'set', path: ['preference'], value: 'dark' }], expectedRevision: 4 } } };
  const observer = observeThemeRpc(events, 'http://harness.example.test', 'write', 'dark', 1000, diagnostics, 4);
  const rejected = assert.rejects(observer.wait(), error => error.themeCode === 'RESPONSE_LOGICAL_OK');
  events.emit('response', {
    url: () => 'http://harness.example.test/api/settings/mutate', status: () => 200,
    request: () => ({ method: () => 'POST', postDataJSON: () => body }), finished: async () => null,
    json: async () => ({ type: 'server-response', rpcId: body.rpcId, result: { ok: false, error: { message: 'PRIVATE-HOST-ERROR' } } }),
  });
  await rejected;
  assert.equal(diagnostics.rpcs[0]?.phase, 'dark.select');
  assert.equal(diagnostics.rpcs[0]?.failureCode, 'RESPONSE_LOGICAL_OK');
  assert.equal(diagnostics.rpcs[0]?.finished, true);
  assert.doesNotMatch(JSON.stringify(diagnostics), /PRIVATE-RPC|PRIVATE-HOST|message|stack/);
});

test('theme diagnostics bound alternative endpoint shapes and exclude all unrelated namespace values without broadening ACK acceptance', async () => {
  const events = new EventEmitter(), diagnostics = { phase: 'dark.select', rpcs: [] };
  const observer = observeThemeRpc(events, 'http://harness.example.test', 'write', 'dark', 1000, diagnostics, 4);
  let unrelatedRead = false, completed = false;
  const response = (url, body, unrelated = false) => ({
    url: () => url, status: () => 200,
    request: () => ({ method: () => 'POST', postDataJSON: () => body }), finished: async () => null,
    async json() { if (unrelated) unrelatedRead = true; return { type: 'server-response', rpcId: 'PRIVATE-ID', result: { ok: true, value: { ns: 'ui-theme', value: { preference: 'dark' }, revision: 6 } } }; },
  });
  const alternative = { type: 'client-request', rpcId: 'PRIVATE-ID', method: 'settings/update', 'PRIVATE-KEY': 'PRIVATE-VALUE', payload: { args: { ns: 'ui-theme', patch: { preference: 'dark', 'PRIVATE-PATCH-KEY': 'PRIVATE-PATCH-VALUE' } } } };
  const outside = { ...alternative, payload: { args: { ns: 'PRIVATE-OTHER-NAMESPACE', get patch() { throw new Error('Unrelated values must not be inspected.'); } } } };
  events.emit('response', response('http://harness.example.test/api/settings/update', outside, true));
  events.emit('response', response('https://other.example.test/api/settings/update', alternative, true));
  const pending = observer.wait().then(() => { completed = true; });
  pending.catch(() => {});
  for (let index = 0; index < 10; index++) events.emit('response', response('http://harness.example.test/api/settings/update', alternative));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(completed, false, 'Alternative settings response is evidence only, NEVER durable acceptance.');
  assert.equal(unrelatedRead, false);
  assert.equal(diagnostics.rpcs.length, 4, 'At most four shape entries per owned click observer.');
  assert.ok(diagnostics.rpcs.every(entry => entry.operation === 'settings/update' && entry.requestCode === 'REQUEST_METHOD' && entry.argumentCount === 2 && entry.revisionType === 'undefined' && entry.revisionSafeInteger === false));
  assert.doesNotMatch(JSON.stringify(diagnostics), /PRIVATE-|rpcId"\s*:/);
  const rejected = assert.rejects(pending, error => error.themeCode === 'RPC_CANCELLED');
  observer.cancel(); await rejected;
  assert.equal(events.listenerCount('response'), 0);
});

test('phase failure codes survive a wrapped cause and diagnostic arrays stay bounded without accepting arbitrary error codes', async () => {
  const diagnostics = { failures: [] }, cause = Object.assign(new Error('PRIVATE-CAUSE'), { themeCode: 'RESPONSE_RPC_ID' });
  await assert.rejects(inThemePhase(diagnostics, 'dark.select', async () => { throw new Error('PRIVATE-WRAPPER', { cause }); }));
  assert.deepEqual(diagnostics.failures, [{ phase: 'dark.select', code: 'RESPONSE_RPC_ID' }]);
  for (let index = 0; index < 12; index++) await assert.rejects(inThemePhase(diagnostics, 'restore.ui', async () => { throw Object.assign(new Error('PRIVATE-RESTORE'), { themeCode: 'PRIVATE-CODE' }); }));
  assert.equal(diagnostics.failures.length, 8);
  assert.equal(diagnostics.failedPhase, 'dark.select');
  assert.doesNotMatch(JSON.stringify(diagnostics), /PRIVATE-/);
});

test('named optional revision omission is accepted above a loaded floor while invalid-present tokens remain diagnostic-only', async () => {
  const events = new EventEmitter(), diagnostics = { phase: 'dark.select', rpcs: [] };
  const observer = observeThemeRpc(events, 'http://harness.example.test', 'write', 'dark', 1000, diagnostics, 4);
  const ops = [{ op: 'set', path: ['preference'], value: 'dark' }];
  for (const args of [{ ns: 'ui-theme', ops, expectedRevision: null }, { ns: 'ui-theme', ops }]) {
    const body = { type: 'client-request', rpcId: args.expectedRevision === null ? 'PRIVATE-INVALID-ID' : 'PRIVATE-VALID-ID', method: 'settings/mutate', payload: { args } };
    events.emit('response', {
      url: () => 'http://harness.example.test/api/settings/mutate', status: () => 200,
      request: () => ({ method: () => 'POST', postDataJSON: () => body }), finished: async () => null,
      json: async () => ({ type: 'server-response', rpcId: body.rpcId, result: { ok: true, value: { ns: 'ui-theme', value: { preference: 'dark' }, revision: 6 } } }),
    });
  }
  assert.deepEqual(await observer.wait(), { preference: 'dark', revision: 6 });
  assert.deepEqual(diagnostics.rpcs.map(entry => [entry.requestCode, entry.argumentCount, entry.revisionType]), [['REQUEST_REVISION', 3, 'null'], ['MATCHED', 2, 'undefined']]);
  assert.notEqual(diagnostics.rpcs[0].accepted, true);
  assert.equal(diagnostics.rpcs[1].accepted, true);
  assert.deepEqual(diagnostics.rpcs[1].argumentShape.keys, ['ns', 'ops']);
  assert.deepEqual(diagnostics.rpcs[1].argumentTypes, { ns: 'string', ops: 'array' });
  assert.doesNotMatch(JSON.stringify(diagnostics), /PRIVATE-/);
  observer.cancel();
});

test('exact theme response predicate codes distinguish every authoritative acceptance requirement', () => {
  const request = { rpcId: 'PRIVATE-ID', target: 'dark', expectedRevision: 4 };
  const view = { ns: 'ui-theme', value: { preference: 'dark' }, revision: 5 };
  const envelope = value => ({ type: 'server-response', rpcId: request.rpcId, result: { ok: true, value } });
  const invalid = [
    [{ ...envelope(view), type: 'other' }, 'RESPONSE_ENVELOPE'],
    [{ ...envelope(view), rpcId: 'OTHER-PRIVATE-ID' }, 'RESPONSE_RPC_ID'],
    [{ ...envelope(view), result: { ok: false } }, 'RESPONSE_LOGICAL_OK'],
    [envelope({ ns: 'PRIVATE-OTHER-NAMESPACE', get value() { throw new Error('Must not inspect other namespace values.'); } }), 'RESPONSE_NAMESPACE'],
    [envelope({ ...view, value: { preference: 'invalid' } }), 'RESPONSE_PREFERENCE'],
    [envelope({ ...view, revision: '5' }), 'RESPONSE_REVISION'],
    [envelope({ ...view, value: { preference: 'light' } }), 'RESPONSE_TARGET'],
    [envelope({ ...view, revision: 3 }), 'RESPONSE_REVISION_LOWER_BOUND'],
  ];
  for (const [body, code] of invalid) assert.throws(() => readThemeWriteAck(body, request, 4), error => error.themeCode === code);
  assert.throws(() => readThemeDescribeAck(envelope({}), request), error => error.themeCode === 'RESPONSE_NAMESPACES');
});

test('fixed include:ui-theme argument alias is diagnosed without accepting it or printing unknown namespace values', async () => {
  const events = new EventEmitter(), diagnostics = { phase: 'dark.select', rpcs: [] };
  const observer = observeThemeRpc(events, 'http://harness.example.test', 'write', 'dark', 1000, diagnostics, 4);
  for (const namespace of ['include:ui-theme', 'include:PRIVATE-OTHER']) {
    const body = { type: 'client-request', rpcId: 'PRIVATE-ID', method: 'settings/mutate', payload: { args: { ns: namespace, ops: [{ op: 'set', path: ['preference'], value: 'dark' }], expectedRevision: 4 } } };
    events.emit('response', {
      url: () => 'http://harness.example.test/api/settings/mutate', status: () => 200,
      request: () => ({ method: () => 'POST', postDataJSON: () => body }), finished: async () => null,
      json: async () => ({ type: 'server-response', rpcId: body.rpcId, result: { ok: true, value: { ns: namespace, value: { preference: 'dark', private: 'PRIVATE-VALUE' }, revision: 5 } } }),
    });
  }
  await new Promise(resolve => setImmediate(resolve));
  const rejected = assert.rejects(observer.wait(), error => error.themeCode === 'RPC_CANCELLED');
  observer.cancel(); await rejected;
  assert.equal(diagnostics.rpcs.length, 1);
  assert.equal(diagnostics.rpcs[0].namespace, 'include:ui-theme');
  assert.equal(diagnostics.rpcs[0].requestCode, 'REQUEST_NAMESPACE');
  assert.notEqual(diagnostics.rpcs[0].accepted, true, 'Literal alias evidence is not acceptance of an unproven contract.');
  assert.doesNotMatch(JSON.stringify(diagnostics), /PRIVATE-/);
});

test('fixed review assertion codes survive wrapped causes and restoration finally without raw values', async () => {
  const codes = ['REVIEW_CHECKBOX_CHECKED', 'REVIEW_CHECKBOX_FOCUS', 'REVIEW_CHECKBOX_PAINT', 'REVIEW_METHOD_FOCUS', 'REVIEW_CONFIRM_ENABLED', 'REVIEW_PENDING_STATUS', 'REVIEW_CHECKBOX_DISABLED', 'REVIEW_METHOD_DISABLED', 'REVIEW_ASR_DISABLED', 'REVIEW_CONFIRM_DISABLED', 'REVIEW_METHOD_REENABLED'];
  for (const code of codes) {
    const diagnostics = { failures: [] };
    const adapter = {
      diagnostics, async ensureOpen() {}, readSetting: async () => 'light', readHostState: async () => themeState('light'),
      async selectSetting() {}, async verifyPersisted() {},
    };
    await assert.rejects(withRestoredHostTheme(adapter, immediate, () => inThemePhase(diagnostics, 'light.review', async () => {
      try { requireTheme(false, code, 'PRIVATE-RAW-ACTUAL-VALUES'); }
      catch (cause) { throw new Error('PRIVATE-WRAPPER', { cause }); }
    }), { setting: 'light', state: themeState('light'), revision: 3 }));
    assert.equal(diagnostics.phase, 'restore.fresh');
    assert.equal(diagnostics.failedPhase, 'light.review');
    assert.deepEqual(diagnostics.failures, [{ phase: 'light.review', code }]);
    assert.doesNotMatch(JSON.stringify(diagnostics), /PRIVATE-/);
  }
});

test('actual theme exercise caller passes its freshly captured revision to the default adapter boundary before any page access', async () => {
  const sentinel = new Error('Owned adapter factory sentinel.');
  await assert.rejects(exerciseHostThemes({
    authorized: true, originalTheme: { setting: 'light', revision: 7, state: { indicator: 'light' } },
    verifyRestored() {},
    createAdapter(options) { assert.equal(options.minimumRevision, 7); throw sentinel; },
  }), error => error === sentinel);
});

test('theme interaction refuses missing authorization before even accessing a page or adapter factory', async () => {
  let called = false;
  await assert.rejects(exerciseHostThemes({ createAdapter() { called = true; throw new Error('Must not construct an adapter without authorization.'); } }), /explicit user authorization/);
  assert.equal(called, false);
});

test('partial multi-action close failure still restores setting and Host CSS using idempotent actual-control recovery', async () => {
  let view = 'plugin', setting = 'system', css = 'original-host-colors', ensureCalls = 0;
  const adapter = {
    async ensureOpen() { ensureCalls++; view = 'settings'; },
    async readSetting() { assert.equal(view, 'settings'); return setting; },
    async readHostState() { return { indicator: setting, css }; },
    async selectSetting(value) { assert.equal(view, 'settings'); setting = value; css = value === 'system' ? 'original-host-colors' : 'light-host-colors'; },
    async verifyPersisted(expected) { assert.equal(setting, expected.setting); assert.deepEqual({ indicator: setting, css }, expected.state); },
  };
  await assert.rejects(withRestoredHostTheme(adapter, immediate, async () => {
    await adapter.selectSetting('light');
    view = 'partially-closed-between-actions';
    throw new Error('second observed close action failed');
  }), /second observed close action failed/);
  assert.equal(setting, 'system'); assert.equal(css, 'original-host-colors');
  assert.ok(ensureCalls >= 3, 'No stale settingsOpen boolean; restore re-establishes real control visibility.');
});

test('restoration cannot pass on local source/CSS when a fresh durable read still differs', async () => {
  let setting = 'system', css = 'original', durable = 'system', freshRead = false;
  const adapter = {
    async ensureOpen() {}, async readSetting() { return setting; }, async readHostState() { return { css }; },
    async selectSetting(value) { setting = value; css = 'original'; /* deliberately missing durable write */ },
    async verifyPersisted(expected) { freshRead = true; assert.equal(durable, expected.setting); },
  };
  await assert.rejects(withRestoredHostTheme(adapter, immediate, async () => { setting = 'light'; durable = 'light'; css = 'light'; }), /restoration could not be verified/);
  assert.equal(freshRead, true, 'Fresh independent Host state must participate in the final gate.');
});

test('restoration cannot claim success if selected option restores but actual Host CSS does not', async () => {
  let setting = 'dark', css = 'dark-host-colors';
  const adapter = {
    async ensureOpen() {}, async readSetting() { return setting; },
    async readHostState() { return { indicator: setting, css }; },
    async selectSetting(value) { setting = value; /* deliberately broken CSS restoration */ },
    async verifyPersisted(expected) { assert.equal(setting, expected.setting); assert.deepEqual({ indicator: setting, css }, expected.state); },
  };
  await assert.rejects(withRestoredHostTheme(adapter, immediate, async () => { setting = 'light'; css = 'light-host-colors'; }), /restoration could not be verified/);
});

test('theme automation requires an explicitly observed idempotent recovery contract before any mutation', () => {
  const contract = {
    open: [{ role: 'button', name: 'Observed settings opener' }], close: [{ role: 'button', name: 'Observed back control' }],
    control: { role: 'combobox', name: 'Observed theme control' }, values: { light: 'actual-light', dark: 'actual-dark' },
    indicator: { selector: 'html', attribute: 'data-observed-theme', light: 'actual-light', dark: 'actual-dark' },
  };
  assert.throws(() => parseHostThemeContract(JSON.stringify(contract)), /idempotent/);
  contract.restoreOpen = { idempotent: true, actions: [{ role: 'button', name: 'Observed idempotent settings navigation' }] };
  assert.ok(parseHostThemeContract(JSON.stringify(contract)));
});

test('observed actual Host button contract separates source indicator from BODY CSS tokens', () => {
  const contract = {
    control: { kind: 'buttons', scope: '[role="dialog"]', choices: { light: 'Light', dark: 'Dark', system: 'System' } },
    navigation: { launcherSelector: '[data-slot="settings.launcher"] button[aria-haspopup="menu"]', dialogSelector: '[role="dialog"]', settings: { role: 'menuitem', name: 'Settings' }, general: { role: 'button', name: 'General' } },
    close: [{ role: 'button', name: 'Close' }], restoreOpen: { idempotent: true },
    values: { light: 'light', dark: 'dark' }, indicator: { selector: 'html', attribute: 'data-ds-theme-source', light: 'light', dark: 'dark' }, cssSelector: 'body',
  };
  assert.equal(parseHostThemeContract(JSON.stringify(contract)).control.kind, 'buttons');
  delete contract.cssSelector;
  assert.throws(() => parseHostThemeContract(JSON.stringify(contract)), /CSS token element/);
});

test('observed Settings navigation is idempotent from closed, open-menu, other-section, and General states', async () => {
  for (const initial of ['closed', 'menu', 'dialog-other', 'general']) {
    let state = initial; const actions = [];
    const adapter = {
      hasControl: async () => state === 'general', hasDialog: async () => state === 'dialog-other', hasSettingsMenuItem: async () => state === 'menu',
      async clickLauncher() { actions.push('launcher'); assert.equal(state, 'closed', 'Never toggle an already-open menu.'); state = 'menu'; },
      async clickSettingsItem() { actions.push('settings'); assert.equal(state, 'menu'); state = 'dialog-other'; },
      async clickGeneral() { actions.push('general'); assert.equal(state, 'dialog-other'); state = 'general'; },
      async waitControl() { assert.equal(state, 'general'); },
    };
    await ensureObservedThemeNavigation(adapter);
    assert.equal(state, 'general');
    const count = actions.length;
    await ensureObservedThemeNavigation(adapter);
    assert.equal(actions.length, count, 'Second ensure must not toggle/close observed live General controls.');
    if (initial === 'menu') assert.deepEqual(actions, ['settings', 'general']);
    if (initial === 'dialog-other') assert.deepEqual(actions, ['general']);
  }
});
