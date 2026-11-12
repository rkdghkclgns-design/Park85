import assert from 'node:assert/strict';
import test from 'node:test';
import { validMailbox } from '../server/addresses.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

test('member registration and updates accept one plain mailbox and normalize Gmail plus-addresses', async () => {
  const DB = await createPreviewDb();
  const origin = 'https://bonyeon.example';
  const owner = 'owner@example.invalid';
  const env = { DB, BONYEON_OWNER_EMAIL: owner, BONYEON_SITE_ORIGIN: origin };
  const request = (method, body) => handleApi(new Request(origin + '/api/users', {
    method,
    headers: { Origin: origin, 'Content-Type': 'application/json', 'oai-authenticated-user-id': 'test-owner',
      'oai-authenticated-user-email': owner },
    body: body ? JSON.stringify(body) : undefined,
  }), env, handleControl, handleWorkflows);
  const member = { name: '검증용 작업자', role: 'cleaner', active: true };
  const malformed = [
    'first@gmail.com,second@gmail.com', 'first@gmail.com;second@gmail.com', 'first,second@gmail.com',
    'Team <first@gmail.com>', 'first@gmail.com\r\nBcc: second@gmail.com', 'first@gmail.com\n',
    ' first@gmail.com', 'first @gmail.com', 'first\u00a0@gmail.com', 'first..team@gmail.com',
    'first@gmail..com', 'first@-gmail.com', 'first@gmail-.com', 'mailto:first@gmail.com',
    'first@@gmail.com', 'a'.repeat(65) + '@gmail.com', 'first@' + 'a'.repeat(64) + '.com',
  ];
  for (const email of malformed) {
    assert.equal(validMailbox(email), false, JSON.stringify(email));
    for (const method of ['POST', 'PATCH']) {
      assert.equal((await request(method, { ...member, email })).status, 400, method + ' ' + JSON.stringify(email));
    }
  }

  const plusAddress = 'Crew.Test+shift42@GMail.com';
  assert.ok(validMailbox(plusAddress));
  assert.ok(validMailbox('shift+east@ops.xn--3e0b707e.example'));
  assert.equal((await request('POST', { ...member, email: plusAddress })).status, 201);
  assert.equal((await request('PATCH', { ...member, email: plusAddress, active: false })).status, 200);
  const { users } = await (await request('GET')).json();
  assert.deepEqual(users.find(user => user.role === 'cleaner'), { email: plusAddress.toLowerCase(),
    name: member.name, role: member.role, active: 0 });
});

test('an authenticated ID paired with another verified email receives no member access', async () => {
  const DB = await createPreviewDb();
  const origin = 'https://bonyeon.example';
  const owner = 'owner@example.invalid';
  const firstWorker = 'first-worker@example.invalid';
  const secondWorker = 'second-worker@example.invalid';
  const env = { DB, BONYEON_OWNER_EMAIL: owner, BONYEON_SITE_ORIGIN: origin };
  const request = (path, id, email, method = 'GET', body) => handleApi(new Request(origin + '/api/' + path, {
    method,
    headers: { Origin: origin, 'Content-Type': 'application/json', 'oai-authenticated-user-id': id,
      'oai-authenticated-user-email': email },
    body: body ? JSON.stringify(body) : undefined,
  }), env, handleControl, handleWorkflows);
  for (const [id, email, name] of [['first-id', firstWorker, '첫 작업자'], ['second-id', secondWorker, '둘째 작업자']]) {
    assert.equal((await request('users', 'owner-id', owner, 'POST', { email, name, role: 'cleaner', active: true })).status, 201);
    const session = await (await request('session', id, email.toUpperCase())).json();
    assert.equal(session.role, 'cleaner');
    assert.equal(session.name, name);
  }

  for (const [id, email] of [['first-id', secondWorker], ['unknown-id', secondWorker], ['first-id', 'changed@example.invalid']]) {
    const session = await (await request('session', id, email)).json();
    assert.deepEqual(session, { signedIn: true, id, email, name: '', role: null });
    assert.equal((await request('work/overview', id, email)).status, 403);
  }
  assert.equal((await request('work/overview', 'second-id', secondWorker)).status, 200);
  const ownerSession = await (await request('session', 'owner-id', owner)).json();
  assert.equal(ownerSession.role, 'owner');
});
