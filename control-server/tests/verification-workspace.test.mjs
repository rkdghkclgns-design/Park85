import { proofJpeg } from './fixtures/photo.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl, queueVerificationCompletion } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';
import { handleVerification } from '../server/verification.mjs';

test('owner-only verification gives each worker a separate authenticated view and preserves production', async () => {
  const db = await createPreviewDb();
  const owner = 'admin@bonyeon.example';
  const worker = 'test-worker@example.invalid';
  const other = 'test-other@example.invalid';
  const origin = 'https://bonyeon.example';
  const mailbox = 'central@bonyeon.example';
  const secret = 'verification-test-only'.repeat(2);
  const localDay = new Date(Date.now() + 9 * 3600_000);
  const day = new Date(Date.UTC(localDay.getUTCFullYear(), localDay.getUTCMonth(), 0)).toISOString().slice(0, 10);
  const today = localDay.toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const objects = new Map();
  const env = { DB: db, BONYEON_OWNER_EMAIL: owner, BONYEON_SITE_ORIGIN: origin, BONYEON_GMAIL_FROM: mailbox,
    BONYEON_REPORT_RUN_SECRET: secret, BONYEON_REPORT_START_DATE: today,
    BUCKET: { async put(key, value) { objects.set(key, value); }, async get(key) { return objects.has(key) ? { body: objects.get(key) } : null; },
      async delete(key) { objects.delete(key); } } };
  const runner = (request, bindings) => handleApi(request, bindings, handleControl, handleWorkflows);
  async function call(path, { method = 'GET', data, cookie, authorized = true, status = 200 } = {}) {
    const form = data instanceof FormData;
    const request = new Request(origin + path, {
      method, headers: { Origin: origin, ...(authorized ? { 'oai-authenticated-user-id': 'owner', 'oai-authenticated-user-email': owner } : {}),
        ...(cookie ? { Cookie: cookie } : {}), ...(data && !form ? { 'Content-Type': 'application/json' } : {}),
        ...(path.startsWith('/api/control/gmail/') ? { Authorization: 'Bearer ' + secret } : {}) },
      body: form ? data : data ? JSON.stringify(data) : undefined,
    });
    const response = path.startsWith('/verification') ? await handleVerification(request, env, () => new Response('ok'), runner, queueVerificationCompletion)
      : await runner(request, env);
    assert.equal(response.status, status, path);
    return { data: response.headers.get('Content-Type')?.startsWith('application/json') ? await response.json() : new Uint8Array(await response.arrayBuffer()),
      cookie: response.headers.get('Set-Cookie')?.split(';')[0] };
  }
  const admin = (path, options) => call('/verification/api/' + path, options);
  const asWorker = (cookie, path, options = {}) => call('/verification/worker/api/' + path, { cookie, ...options });
  const write = (method, data, status) => ({ method, data, status });

  await call('/verification/', { authorized: false, status: 404 });
  await asWorker(null, 'work/overview', { status: 401 });
  for (const [email, name] of [[worker, '검증 작업자'], [other, '비교 작업자']]) {
    await admin('users', write('POST', { email, name, role: 'cleaner', active: true }, 201));
  }
  assert.equal((await call('/api/users')).data.users.length, 1);
  const codes = async email => (await admin('verification/code', write('POST', { email }))).data.code;
  const code = await codes(worker);
  const login = (email, codeValue, status) => asWorker(null, 'verification/login', write('POST', { email, code: codeValue }, status));
  await login(other, code, 401);
  const { cookie } = await login(worker, code);
  const { cookie: second } = await login(other, await codes(other));
  await login(worker, code, 401);
  assert.equal((await asWorker(cookie, 'session')).data.role, 'cleaner');
  assert.equal((await asWorker(cookie, 'session')).data.email, worker);
  await asWorker(cookie, 'users', { status: 403 });

  const site = (id, name) => ({ id, name, address: '검증용 주소', lat: 37, lng: 127, dueDate: day, status: 'pending' });
  await admin('sites/import', write('POST', { rows: [site('a', '본인 현장'), site('b', '타 작업자 현장'), site('c', '미배정 현장')] }));
  await admin('control/site', write('PATCH', { siteId: 'a', region: '서울특별시', contractorEmail: '' }));
  await admin('charger-regions/price', write('PATCH', { region: '서울특별시', kind: 'contract', price: 40000, previousPrice: null }));
  await admin('charger-regions/price', write('PATCH', { region: '서울특별시', kind: 'worker', price: 18000, previousPrice: null }));
  for (const [siteId, workerEmail] of [['a', worker], ['b', other]]) {
    await admin('work/plan', write('PUT', { siteId, workerEmail, startDate: day, repeatDays: 30, instructions: '가상 증빙 검증' }));
  }
  assert.deepEqual((await asWorker(cookie, 'sites')).data.sites.map(item => item.id), ['a']);
  assert.deepEqual((await asWorker(second, 'sites')).data.sites.map(item => item.id), ['b']);
  assert.equal((await call('/api/sites')).data.sites.length, 0);
  await asWorker(cookie, 'control/detail?kind=site&id=b', { status: 404 });
  await asWorker(cookie, 'control/detail?kind=site&id=c', { status: 404 });

  const proof = new FormData();
  for (const [key, value] of Object.entries({ siteId: 'a', workDate: day, assetCode: 'QA-001', exterior: '1', safety: '1', chargerType: 'slow', canopy: 'included' })) proof.set(key, value);
  const jpeg = proofJpeg;
  for (const slot of ['exteriorBefore', 'exteriorAfter']) proof.set(slot, new Blob([jpeg], { type: 'image/jpeg' }), slot + '.jpg');
  const { version,assignmentDue } = (await asWorker(cookie,'work/guidance?siteId=a')).data;
  await asWorker(cookie,'work/guidance',write('PUT',{ siteId:'a',version,assignmentDue,confirmed:true }));
  proof.set('safetyChecklist',JSON.stringify({ access:true,equipment:true,condition:true,power:true }));
  const uploaded = (await asWorker(cookie, 'work/evidence', write('POST', proof, 201))).data;
  assert.ok([...objects.keys()].every(key => key.startsWith('verification/work-evidence/')));
  const photo = 'work/photo?id=' + uploaded.id + '&slot=exteriorAfter';
  assert.deepEqual((await asWorker(cookie, photo)).data, jpeg);
  await asWorker(second, photo, { status: 404 });
  await call('/api/' + photo, { status: 404 });
  await asWorker(cookie, 'control/report', write('POST', { siteId: 'a', workDate: day, units: 1, exterior: 1, interior: 0 }));
  const report = (await admin('control/overview?month=' + month)).data.reports[0];
  await admin('control/review', write('PATCH', { id: report.id, action: 'approve' }));
  await admin('work/settlement/payments', write('PATCH', { id: report.id, paymentVersion:0, billed: 44000, vat: 4000, received: 44000, paid: 15000,
    billingRef: '가상', workers: [{ email: worker, units: 1, paid: 15000, paidDate: day }] }));
  const { zone } = (await admin('work/zones',write('POST',{ siteId:'a',name:'검증 구역' }))).data;
  await admin('work/evidence/zone',write('PATCH',{ id:uploaded.id,fromZoneId:null,zoneId:zone.id }));
  const moved = (await admin('control/detail?' + new URLSearchParams({ kind:'report',id:report.id,month }))).data.devices[0];
  assert.equal(moved.zoneName,zone.name);
  await admin('work/settlement/close', write('POST', { month }));
  await admin('work/evidence/zone',write('PATCH',{ id:uploaded.id,fromZoneId:zone.id,zoneId:zone.id },403));
  assert.deepEqual((await asWorker(cookie,photo)).data,jpeg);
  const own = (await asWorker(cookie, 'session')).data;
  const otherAccount = (await asWorker(second, 'session')).data;
  const ownDetail = 'control/detail?' + new URLSearchParams({ kind: 'worker', id: own.id, month });
  const otherDetail = 'control/detail?' + new URLSearchParams({ kind: 'worker', id: otherAccount.id, month });
  assert.equal((await asWorker(cookie, ownDetail)).data.payouts[0].paid, 15000);
  await asWorker(cookie, otherDetail, { status: 404 });
  await asWorker(cookie, 'work/settlement?month=' + month, { status: 403 });
  await call('/api/control/gmail/activate', write('POST', {}));
  await asWorker(cookie, 'verification/completion-mail', write('POST', { id: report.id }, 404));
  const queued = (await admin('verification/completion-mail', write('POST', { id: report.id }))).data;
  assert.match(queued.subject, /작업 완료 보고.*검증 테스트/);
  const { message } = (await call('/api/control/gmail/claim', write('POST', { requestId: crypto.randomUUID() }))).data;
  assert.equal(message.to, mailbox);
  assert.match(message.html, /verification\/#control-detail\/report\//);
  await asWorker(cookie, 'verification/logout', write('POST', {}));
  await asWorker(cookie, 'work/overview', { status: 401 });
});
