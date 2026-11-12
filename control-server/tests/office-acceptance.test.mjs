import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';
import { officeAcceptanceData } from '../server/office-mail.mjs';

const origin = 'https://bonyeon.example';
const owner = 'owner@bonyeon.example';
const mailbox = 'central@bonyeon.example';
const secret = 'office-acceptance-only-test'.repeat(2);
const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

async function harness() {
  const db = await createPreviewDb();
  const env = { DB: db, BONYEON_SITE_ORIGIN: origin, BONYEON_OWNER_EMAIL: owner, BONYEON_GMAIL_FROM: mailbox,
    BONYEON_REPORT_START_DATE: today, BONYEON_REPORT_RUN_SECRET: secret };
  async function call(path, method = 'GET', body, actor = owner, status = 200) {
    const auth = path.startsWith('control/gmail/') ? { Authorization: 'Bearer ' + secret }
      : actor ? { 'oai-authenticated-user-id': actor, 'oai-authenticated-user-email': actor } : {};
    const response = await handleApi(new Request(origin + '/api/' + path, {
      method, headers: { Origin: origin, ...auth, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }), env, handleControl, handleWorkflows);
    const data = await response.json();
    assert.equal(response.status, status, path + ' ' + JSON.stringify(data));
    return data;
  }
  await call('control/settings', 'PATCH', { email: owner, taxEmail: mailbox, workerMailEnabled: false, officeAutoEnabled: true });
  await call('control/gmail/activate', 'POST', {});
  return { db, call };
}

test('isolated real workflow creates the example; production-style diagnostic preserves normal ledgers and archives', async () => {
  const fixture = officeAcceptanceData(today);
  const { month, worker, site, payment, allocation, plan } = fixture;
  const { db, call } = await harness();
  await call('users', 'POST', { ...worker, role: 'cleaner', active: true }, owner, 201);
  const siteId = 'acceptance-site';
  await call('sites/import', 'POST', { rows: [{ ...site, id: siteId, lat: 37, lng: 127, status: 'pending', dueDate: payment.work_date, plannedUnits:payment.units }] });
  await call('control/site', 'PATCH', { siteId, region: '서울특별시', contractorEmail: '' });
  for (const [kind, price] of [['contract', 55000], ['worker', payment.worker_price]]) {
    await call('charger-regions/price', 'PATCH', { region: '서울특별시', kind, price, previousPrice: null });
  }
  for (let index=0;index<payment.units;index++) {
    await db.prepare(`INSERT INTO charger_evidence(id,site_id,work_date,asset_code,author_id,author_name,exterior,interior,safety_checked,issue,created_at)
      VALUES (?,?,?,?,?,'검증 관리자',1,?,1,'',?)`).bind(crypto.randomUUID(),siteId,payment.work_date,'ACCEPTANCE-'+index,owner,Number(index===0),payment.work_date+'T09:00:00.000Z').run();
  }
  await call('control/report', 'POST', { siteId, workDate: payment.work_date, units: payment.units, exterior: 2, interior: 1 });
  const { reports } = await call('control/overview?month=' + month);
  assert.equal(reports.length, 1);
  const id = reports[0].id;
  await call('control/review', 'PATCH', { id, action: 'approve' });
  await call('work/plan', 'PUT', { siteId, workerEmail: worker.email, startDate: plan.start_date, repeatDays: plan.repeat_days, instructions: plan.instructions });
  await call('work/settlement/payments', 'PATCH', { id, paymentVersion:0, billed: payment.billed, vat: payment.vat, received: payment.received,
    paid: payment.paid, billingRef: payment.billing_ref, workers: [allocation] });
  await call('work/settlement/close', 'POST', { month });
  const auto = [];
  for (let i = 0; i < 2; i++) {
    const { message } = await call('control/gmail/claim', 'POST', { requestId: crypto.randomUUID() });
    assert.match(message.id, /^gmail:office:/);
    auto.push(message);
    await call('control/gmail/complete', 'POST', { id: message.id, claim: message.claim });
  }
  assert.match(auto[0].html, /30,000원.*25,000원/s);
  assert.match(auto[0].html, /배정 확정/);
  assert.match(auto[1].html, /100,000원.*10,000원/s);

  const staged = await harness();
  await staged.call('control/office-test', 'POST', {}, null, 401);
  const begun = await staged.call('control/office-test', 'POST', {});
  assert.equal(begun.messages.length, 2);
  assert.deepEqual(await staged.call('control/office-test', 'POST', {}), begun);
  assert.equal((await staged.call('sites')).sites.length, 0);
  assert.equal((await staged.call('control/overview?month=' + month)).reports.length, 0);
  assert.equal((await staged.call('control/overview')).deliveries.length, 0);
  for (let i = 0; i < 2; i++) {
    const requestId = crypto.randomUUID();
    const { message } = await staged.call('control/gmail/claim', 'POST', { requestId });
    assert.equal(message.to, mailbox);
    assert.match(message.subject, /자동발송 테스트/);
    assert.deepEqual((await staged.call('control/gmail/claim', 'POST', { requestId })).message, message);
    await staged.call('control/gmail/complete', 'POST', { id: message.id, claim: message.claim });
    assert.equal((await staged.call('control/gmail/claim', 'POST', { requestId })).message, null);
    const match = /#control-detail\/mail\/([a-f0-9]{64})/.exec(message.html);
    assert.ok(match);
    const snapshot = await staged.call('control/detail?kind=mail&id=' + match[1]);
    assert.equal(snapshot.subject, message.subject);
    assert.equal(snapshot.html, message.html);
  }
  assert.equal((await staged.call('control/gmail/claim', 'POST', { requestId: crypto.randomUUID() })).message, null);
  assert.ok((await staged.call('control/office-test')).messages.every(item => item.sentAt));
});

test('claim replay cancels stale addresses and held receipts never replay', async () => {
  const { call } = await harness();
  await call('control/office-test', 'POST', {});
  const requestId = crypto.randomUUID();
  const { message } = await call('control/gmail/claim', 'POST', { requestId });
  await call('control/settings', 'PATCH', { email: owner, taxEmail: 'different@bonyeon.example' });
  assert.equal((await call('control/gmail/claim', 'POST', { requestId })).message, null);
  assert.ok((await call('control/office-test')).messages.find(item => item.subject === message.subject).canceledAt);
  await call('control/settings', 'PATCH', { email: owner, taxEmail: mailbox });
  const secondId = crypto.randomUUID();
  const next = (await call('control/gmail/claim', 'POST', { requestId: secondId })).message;
  assert.ok(next);
  await call('control/gmail/hold', 'POST', { id: next.id, claim: next.claim });
  assert.equal((await call('control/gmail/claim', 'POST', { requestId: secondId })).message, null);
  assert.ok((await call('control/office-test')).messages.find(item => item.subject === next.subject).holdAt);
});
