import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

async function fixture({ closed = true } = {}) {
  const DB = await createPreviewDb();
  const origin = 'https://delivery-review.example.invalid';
  const owner = 'owner@example.invalid';
  const worker = 'worker@example.invalid';
  const now = new Date();
  const today = new Date(+now + 9 * 3600_000).toISOString().slice(0, 10);
  const previous = new Date(today.slice(0, 7) + '-01T00:00:00Z');
  previous.setUTCDate(0);
  const day = previous.toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const env = { DB, BONYEON_OWNER_EMAIL: owner, BONYEON_SITE_ORIGIN: origin,
    BONYEON_GMAIL_FROM: owner, BONYEON_REPORT_START_DATE: today,
    BONYEON_REPORT_RUN_SECRET: 'isolated-delivery-regression'.repeat(2) };
  await DB.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES(?,?,'작업자','cleaner',1,?)")
    .bind(worker, worker, now.toISOString()).run();
  await DB.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,due_date,updated_at,planned_units) VALUES('site','현장 A','가상주소',37,127,'done',?,?,1)")
    .bind(day, now.toISOString()).run();
  await DB.prepare(`INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,
    units,exterior,interior,notes,status,updated_at,approved_at,planned_units,contract_price,worker_price)
    VALUES('report','site',?,?,'작업자','현장 A','가상주소',1,1,0,'','approved',?,?,1,100000,10000)`)
    .bind(day, worker, now.toISOString(), now.toISOString()).run();
  await DB.prepare(`INSERT INTO settlement_payments(report_id,billed,received,paid,billing_ref,note,updated_at,vat,worker_breakdown)
    VALUES('report',110000,110000,5000,'가상청구','',?,10000,?)`)
    .bind(now.toISOString(), JSON.stringify([{ email: worker, name: '작업자', units: 1, paid: 5000, paidDate: day }])).run();
  if (closed) await DB.prepare("INSERT INTO settlement_months(month,closed_at,closed_by) VALUES(?,?,'관리자')")
    .bind(month, now.toISOString()).run();
  const settings = { email: owner, taxEmail: owner, workerMailEnabled: true };
  async function call(path, { method = 'GET', body, status = 200 } = {}) {
    const runner = path.startsWith('control/gmail/');
    const response = await handleApi(new Request(origin + '/api/' + path, { method,
      headers: { Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(runner ? { Authorization: 'Bearer ' + env.BONYEON_REPORT_RUN_SECRET }
          : { 'oai-authenticated-user-id': owner, 'oai-authenticated-user-email': owner }) },
      ...(body ? { body: JSON.stringify(body) } : {}) }), env, handleControl, handleWorkflows);
    const data = await response.json();
    assert.equal(response.status, status, path + ': ' + JSON.stringify(data));
    return data;
  }
  const configure = enabled => call('control/settings', { method: 'PATCH', body: { ...settings, officeAutoEnabled: enabled } });
  const runner = (action, body = {}) => call('control/gmail/' + action, { method: 'POST', body });
  const claim = async requestId => (await runner('claim', { requestId })).message;
  const preview = (kind, reference) => call('control/mail?' + new URLSearchParams({ kind, reference }));
  const queue = (kind, reference, message) => call('control/mail', { method: 'POST', body: {
    kind, reference, recipient: message.recipient, previewToken: message.previewToken,
  } });
  await configure(false);
  await runner('activate');
  return { DB, env, call, configure, claim, preview, queue, day, month, worker };
}

for (const kind of ['worker', 'tax']) test('turning automatic ' + kind + ' mail off cancels a lost claim replay without losing the signal', async () => {
  const h = await fixture();
  if (kind === 'tax') await h.DB.prepare(`INSERT INTO office_mail_progress(kind,reference,signal_id)
    SELECT kind,reference,MAX(id) FROM office_mail_signals WHERE kind='worker' GROUP BY kind,reference`).bind().run();
  await h.configure(true);
  const requestId = crypto.randomUUID();
  const first = await h.claim(requestId);
  assert.ok(first.id.startsWith('gmail:office:'));
  const reserved = await h.DB.prepare('SELECT kind,office_signal_id FROM report_mail WHERE id=?').bind(first.id).first();
  assert.equal(reserved.kind, kind);
  assert.ok(reserved.office_signal_id);
  // No send/ack occurred: the runner lost its first claim response.
  await h.configure(false);
  assert.equal(await h.claim(requestId), null);
  assert.ok((await h.DB.prepare('SELECT canceled_at FROM report_mail WHERE id=?').bind(first.id).first()).canceled_at);
  await h.configure(true);
  const resumed = await h.claim(crypto.randomUUID());
  assert.ok(resumed);
  assert.notEqual(resumed.id, first.id);
});

for (const kind of ['worker', 'tax']) {
  test('turning office automation off preserves an explicitly requested ' + kind + ' mail replay', async () => {
    const h = await fixture();
    const reference = kind === 'worker' ? h.month + ':' + h.worker : h.month;
    const message = await h.preview(kind, reference);
    await h.queue(kind, reference, message);
    const requestId = crypto.randomUUID();
    const first = await h.claim(requestId);
    assert.ok(first);
    const row = await h.DB.prepare('SELECT requested_by,office_signal_id FROM report_mail WHERE id=?').bind(first.id).first();
    assert.ok(row.requested_by);
    assert.equal(row.office_signal_id, null);
    await h.configure(false);
    assert.deepEqual(await h.claim(requestId), first);
  });
}

test('a provider claim sends the same immutable snapshot recorded as sent during a concurrent refresh', async t => {
  const h = await fixture({ closed: false });
  const evidenceId = crypto.randomUUID();
  await h.DB.prepare(`INSERT INTO charger_evidence(id,site_id,work_date,asset_code,author_id,author_name,
    exterior,interior,safety_checked,issue,created_at,charger_type,canopy)
    VALUES(?,'site',?,'DEVICE-ONE',?,'작업자',1,0,1,'',?,'slow','excluded')`)
    .bind(evidenceId, h.day, h.worker, new Date().toISOString()).run();
  await h.DB.prepare("INSERT INTO site_reporting(site_id,contractor_email) VALUES('site','client@example.invalid')").bind().run();
  delete h.env.BONYEON_GMAIL_FROM;
  h.env.BONYEON_REPORT_FROM = 'sender@example.invalid';
  h.env.BONYEON_RESEND_API_KEY = 'isolated-provider-test';
  let announceFirst, releaseFirst, releaseSecond;
  const firstStarted = new Promise(resolve => { announceFirst = resolve; });
  const firstGate = new Promise(resolve => { releaseFirst = resolve; });
  const secondGate = new Promise(resolve => { releaseSecond = resolve; });
  let leases = 0;
  h.env.DB = { prepare(sql) {
    const before = async () => {
      if (!sql.includes('UPDATE report_mail SET lease_until = ?')) return;
      if (++leases === 1) { announceFirst(); await firstGate; }
      else { releaseFirst(); await secondGate; }
    };
    const wrap = statement => ({ bind: (...args) => wrap(statement.bind(...args)),
      first: async (...args) => { await before(); return statement.first(...args); },
      all: async (...args) => { await before(); return statement.all(...args); },
      run: async (...args) => { await before(); return statement.run(...args); } });
    return wrap(h.DB.prepare(sql));
  } };
  const sent = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    sent.push(JSON.parse(options.body));
    return Response.json({ id: 'isolated-receipt' });
  });
  const firstPreview = await h.preview('contractor', 'report');
  const first = h.queue('contractor', 'report', firstPreview);
  await firstStarted;
  await h.call('work/evidence/classification', { method: 'PATCH', body: {
    id: evidenceId, chargerType: 'fast', canopy: 'included',
  } });
  const secondPreview = await h.preview('contractor', 'report');
  assert.notEqual(firstPreview.previewToken, secondPreview.previewToken);
  const second = h.call('control/mail', { method: 'POST', status: 409, body: {
    kind: 'contractor', reference: 'report', recipient: secondPreview.recipient, previewToken: secondPreview.previewToken,
  } });
  try { await first; } finally { releaseSecond(); }
  await second;
  const row = await h.DB.prepare("SELECT sender,recipient,subject,body,html,sent_at FROM report_mail WHERE kind='contractor' AND reference='report'").first();
  assert.equal(sent.length, 1);
  assert.ok(row.sent_at);
  assert.equal(sent[0].from, row.sender);
  assert.deepEqual(sent[0].to, [row.recipient]);
  assert.equal(sent[0].subject, row.subject);
  assert.equal(sent[0].text, row.body);
  assert.equal(sent[0].html || '', row.html);
});
