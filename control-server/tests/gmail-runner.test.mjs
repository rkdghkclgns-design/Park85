import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const code = await readFile(new URL('../automation/BonyeonReports.gs', import.meta.url), 'utf8');
const stateProperty = 'BONYEON_RUNNER_STATE';
const legacyProperty = 'BONYEON_PENDING_ACK';
const envelope = {
  id: 'gmail:office:test-job',
  claim: '00000000-0000-4000-8000-000000000001',
  to: 'bonyeon85@gmail.com',
  subject: 'Automated test envelope',
  body: 'Sample text',
  html: '<p>Sample text</p>',
};

function makeRunner({ respond, onSend, beforeWrite } = {}) {
  const values = new Map([
    ['BONYEON_INDEPENDENT_LINK', JSON.stringify({ reportSecret: 'test-secret' })],
  ]);
  const calls = [];
  const sent = [];
  const warnings = [];
  let requestNumber = 0;
  const store = {
    getProperty: key => values.get(key),
    deleteProperty: key => values.delete(key),
    setProperty(key, value) {
      beforeWrite?.(key, value);
      values.set(key, value);
    },
  };
  const context = {
    console: { warn: message => warnings.push(message) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'bonyeon85@gmail.com' }) },
    PropertiesService: { getScriptProperties: () => store },
    Utilities: {
      getUuid: () => '00000000-0000-4000-8000-' + String(++requestNumber).padStart(12, '0'),
      newBlob: value => ({ getBytes: () => Buffer.from(value) }),
    },
    MailApp: {
      getRemainingDailyQuota: () => 10,
      sendEmail(mail) {
        onSend?.(mail);
        sent.push(mail);
      },
    },
    UrlFetchApp: {
      fetch(url, options) {
        const action = url.split('/').at(-1);
        const data = JSON.parse(options.payload);
        calls.push({ action, data });
        const result = respond?.(action, data, values) ?? { status: 200, body: {} };
        return { getResponseCode: () => result.status, getContentText: () => JSON.stringify(result.body) };
      },
    },
  };
  runInNewContext(code, context);
  return { run: context.runBonyeonReports, values, calls, sent, warnings };
}

test('a lost claim response retries the persisted request id before attempting mail', () => {
  let attempts = 0;
  const runner = makeRunner({
    respond(action, data, values) {
      if (action !== 'claim') return;
      const saved = JSON.parse(values.get(stateProperty));
      assert.equal(saved.phase, 'requesting');
      assert.equal(saved.requestId, data.requestId);
      attempts++;
      if (attempts === 1) throw new Error('connection interrupted');
      return { status: 200, body: { message: attempts === 2 ? envelope : null } };
    },
  });
  assert.throws(runner.run, /connection interrupted/);
  assert.equal(runner.sent.length, 0);
  runner.run();
  assert.equal(runner.calls[0].data.requestId, runner.calls[1].data.requestId);
  assert.equal(runner.sent.length, 1);
  assert.deepEqual(runner.calls.map(call => call.action), ['claim', 'claim', 'complete', 'claim']);
  assert.equal(runner.values.has(stateProperty), false);
});

test('a crash after Gmail accepts mail holds that job without sending it twice', () => {
  let attempts = 0;
  let failAckWrite = true;
  const runner = makeRunner({
    beforeWrite(key, value) {
      if (key === stateProperty && failAckWrite && JSON.parse(value).phase === 'ack') {
        failAckWrite = false;
        throw new Error('script stopped before storing acknowledgement');
      }
    },
    respond(action) {
      if (action === 'claim') return { status: 200, body: { message: attempts++ === 0 ? envelope : null } };
    },
  });
  assert.throws(runner.run, /script stopped/);
  assert.equal(JSON.parse(runner.values.get(stateProperty)).phase, 'sending');
  runner.run();
  assert.equal(runner.sent.length, 1);
  assert.deepEqual(runner.calls.map(call => call.action), ['claim', 'hold', 'claim']);
  assert.deepEqual(runner.calls[1].data, { id: envelope.id, claim: envelope.claim });
  assert.equal(runner.values.has(stateProperty), false);
});

test('a rejected hold preserves the ambiguous job for the next scheduled run', () => {
  let claims = 0;
  let holds = 0;
  const runner = makeRunner({
    onSend() { throw new Error('Gmail response uncertain'); },
    respond(action) {
      if (action === 'claim') return { status: 200, body: { message: claims++ === 0 ? envelope : null } };
      if (action === 'hold' && holds++ === 0) return { status: 503, body: {} };
    },
  });
  assert.throws(runner.run, /503/);
  assert.equal(JSON.parse(runner.values.get(stateProperty)).phase, 'sending');
  runner.run();
  assert.deepEqual(runner.calls.map(call => call.action), ['claim', 'hold', 'hold', 'claim']);
  assert.equal(runner.sent.length, 0);
  assert.equal(runner.warnings.length, 1);
  assert.equal(runner.values.has(stateProperty), false);
});

test('a terminal legacy acknowledgement does not stop later scheduled jobs', () => {
  const runner = makeRunner({
    respond(action) {
      if (action === 'complete') return { status: 404, body: {} };
      return { status: 200, body: { message: null } };
    },
  });
  runner.values.set(legacyProperty, JSON.stringify({ id: envelope.id, claim: envelope.claim }));
  runner.run();
  assert.deepEqual(runner.calls.map(call => call.action), ['complete', 'claim']);
  assert.equal(runner.values.has(legacyProperty), false);
  assert.equal(runner.warnings.length, 1);
});

for (const status of [404,409]) {
  test('a terminal held reservation ' + status + ' releases later scheduled jobs without resending it', () => {
    const runner = makeRunner({
      respond(action) {
        if (action === 'hold') return { status,body:{} };
        return { status:200,body:{ message:null } };
      },
    });
    runner.values.set(stateProperty,JSON.stringify({ phase:'sending',requestId:'old-request',id:envelope.id,claim:envelope.claim }));
    runner.run();
    assert.deepEqual(runner.calls.map(call=>call.action),['hold','claim']);
    assert.equal(runner.values.has(stateProperty),false);
    assert.equal(runner.sent.length,0);
  });
}
