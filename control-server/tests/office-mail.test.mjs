import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

test('office previews isolate worker data and queue verified, immutable tax snapshots', async () => {
  const db = await createPreviewDb();
  const origin = 'https://bonyeon.example';
  const owner = 'owner@bonyeon.example';
  const sender = 'mail@bonyeon.example';
  const tax = 'accountant@bonyeon.example';
  const worker = 'worker@bonyeon.example';
  const other = 'peer@bonyeon.example';
  const now = new Date();
  const seoul = new Date(+now + 9 * 3600_000);
  const date = new Date(Date.UTC(seoul.getUTCFullYear(), seoul.getUTCMonth(), 0)).toISOString().slice(0, 10);
  const month = date.slice(0, 7);
  const secret = 'office-mail-test'.repeat(4);
  const env = { DB: db, BONYEON_SITE_ORIGIN: origin, BONYEON_OWNER_EMAIL: owner, BONYEON_GMAIL_FROM: sender,
    BONYEON_REPORT_START_DATE: seoul.toISOString().slice(0, 10), BONYEON_REPORT_RUN_SECRET: secret };
  const call = async (path, method = 'GET', body, email = owner, status = 200) => {
    const runner = path.startsWith('control/gmail/');
    const headers = { Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(runner ? { Authorization: 'Bearer ' + secret } : { 'oai-authenticated-user-id': email, 'oai-authenticated-user-email': email }) };
    const response = await handleApi(new Request(origin + '/api/' + path, { method, headers,
      body: body ? JSON.stringify(body) : undefined }), env, handleControl, handleWorkflows);
    const data = await response.json();
    assert.equal(response.status, status, path + ': ' + JSON.stringify(data));
    return data;
  };
  const preview = (kind, reference, email = owner, status = 200) =>
    call('control/mail?' + new URLSearchParams({ kind, reference }), 'GET', undefined, email, status);
  const queue = (kind, reference, { recipient, previewToken }, status = 200) =>
    call('control/mail', 'POST', { kind, reference, recipient, previewToken }, owner, status);
  const runner = (action, body = {}) => call('control/gmail/' + action, 'POST', body);
  const settings = (taxEmail, workerMailEnabled = false) =>
    call('control/settings', 'PATCH', { email: owner, taxEmail, workerMailEnabled });

  for (const [email, name] of [[worker, '작업자 A'], [other, '작업자 B']]) {
    await db.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES (?,?,?,'cleaner',1,?)")
      .bind(email, email, name, now.toISOString()).run();
  }
  await db.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date) VALUES ('sample-site','검증 현장','서울',37,127,'done',?,?)")
    .bind(now.toISOString(), date).run();
  await db.prepare(`
    INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,
      units,exterior,interior,notes,status,updated_at,approved_at,contract_price,worker_price)
    VALUES ('office-report','sample-site',?,?,'작업자 A','검증 현장','서울',2,2,1,'비공개 내부 메모','approved',?,?,25000,10000)
  `).bind(date, worker, now.toISOString(), now.toISOString()).run();
  await db.prepare("INSERT INTO settlement_months(month,closed_at,closed_by) VALUES (?,?,'관리자')")
    .bind(month, date + 'T10:00:00.000Z').run();
  const amounts = JSON.stringify([{ email: worker, name: '작업자 A', units: 1, paid: 7000, paidDate: date },
    { email: other, name: '작업자 B', units: 1, paid: 12000, paidDate: date }]);
  await db.prepare(`
    INSERT INTO settlement_payments(report_id,billed,vat,received,paid,billing_ref,note,updated_at,worker_breakdown)
    VALUES ('office-report',55000,5000,44000,19000,'청구-100','비공개 정산 메모',?,?)
  `).bind(now.toISOString(), amounts).run();
  await runner('activate');

  const unconfigured = await preview('tax', month);
  assert.equal(unconfigured.mailReady, false);
  assert.match(unconfigured.blocking.join(' '), /수신 이메일/);
  await call('control/settings', 'PATCH', { email: owner, taxEmail: 'a,b@bonyeon.example' }, owner, 400);
  await settings(tax);
  const centralWorker = await preview('worker', month + ':' + worker);
  assert.equal(centralWorker.recipient, sender);
  assert.match(centralWorker.html, /7,000원/);
  assert.doesNotMatch(centralWorker.html, /작업자 B|12,000원|55,000원|비공개/);
  await preview('worker', month + ':' + other, worker, 403);
  await settings(tax, true);
  const workerPreview = await preview('worker', month + ':' + worker.toUpperCase());
  assert.equal(workerPreview.recipient, worker);
  await queue('worker', month + ':' + worker.toUpperCase(), workerPreview);
  await settings(tax, false);
  assert.equal((await runner('claim')).message, null);
  const canceled = await call('control/overview');
  assert.ok(canceled.deliveries.some(mail => mail.kind === 'worker' && mail.canceledAt && !mail.sentAt));

  const firstTax = await preview('tax', month);
  assert.equal(firstTax.mailReady, true);
  assert.equal(firstTax.recipient, tax);
  assert.match(firstTax.html, /50,000원/);
  assert.match(firstTax.html, /5,000원/);
  assert.match(firstTax.html, /3,000원/);
  assert.match(firstTax.html, /2,000원/);
  assert.doesNotMatch(firstTax.html, /비공개|control-detail/);
  const repeated = await Promise.all([queue('tax', month, firstTax), queue('tax', month, firstTax)]);
  assert.equal(repeated.filter(result => result.alreadyQueued).length, 1);
  await db.prepare("UPDATE settlement_payments SET received = 47000 WHERE report_id = 'office-report'").bind().run();
  await queue('tax', month, firstTax, 409);
  const saved = (await runner('claim')).message;
  assert.equal(saved.to, tax);
  assert.match(saved.html, /44,000원/);
  assert.doesNotMatch(saved.html, /47,000원/);
  await runner('complete', { id: saved.id, claim: saved.claim });
  const updated = await preview('tax', month);
  assert.match(updated.html, /47,000원/);
  assert.equal((await queue('tax', month, updated)).queued, true);
  assert.notEqual(firstTax.subject, updated.subject);
  await db.prepare("UPDATE settlement_payments SET received = 49000 WHERE report_id = 'office-report'").bind().run();
  const corrected = await preview('tax', month);
  assert.equal((await queue('tax', month, corrected)).queued, true);
  const latest = (await runner('claim')).message;
  assert.equal(latest.subject, corrected.subject);
  assert.match(latest.html, /49,000원/);
  assert.ok((await call('control/overview')).deliveries.some(mail => mail.subject === updated.subject && mail.canceledAt));
  const ownDetail = await call('control/detail?' + new URLSearchParams({ kind: 'worker', id: worker, month }), 'GET', undefined, worker);
  assert.equal(ownDetail.payouts.length, 1);
  assert.equal(ownDetail.payouts[0].paid, 7000);
  assert.equal(ownDetail.billing, undefined);
});
