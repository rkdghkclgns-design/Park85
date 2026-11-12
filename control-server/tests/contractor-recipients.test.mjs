import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';
import { clientRecipients, normalizeClientRecipients } from '../server/client-recipients.mjs';

test('client mailbox parsing rejects malformed lists and normalizes supported separators', () => {
  assert.deepEqual(normalizeClientRecipients('One@example.invalid; two@example.invalid\none@example.invalid'), ['one@example.invalid', 'two@example.invalid']);
  assert.deepEqual(normalizeClientRecipients(''), []);
  for (const value of [null, {}, [123], Array(101).fill('a@example.invalid'), ['not-an-email']]) assert.equal(normalizeClientRecipients(value), null);
  assert.deepEqual(clientRecipients(), []);
  assert.deepEqual(clientRecipients({ contractor_emails: 'broken' }), []);
  assert.deepEqual(clientRecipients({ contractor_emails: '{}', contractor_email: 'legacy@example.invalid' }), []);
  assert.deepEqual(clientRecipients({ contractor_emails: '["invalid"]' }), []);
});

async function harness() {
  const DB = await createPreviewDb();
  const origin = 'https://bonyeon.example';
  const stamp = new Date().toISOString();
  const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const env = { DB, BONYEON_SITE_ORIGIN: origin, BONYEON_OWNER_EMAIL: 'owner@example.invalid',
    BONYEON_GMAIL_FROM: 'bonyeon85@gmail.com', BONYEON_REPORT_START_DATE: today, BONYEON_REPORT_RUN_SECRET: 's'.repeat(48) };
  for (const [email, role] of [['admin@example.invalid', 'admin'], ['cleaner@example.invalid', 'cleaner']]) {
    await DB.prepare('INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES(?,?,?,?,1,?)')
      .bind(email, email, role, role, stamp).run();
  }
  await DB.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,planned_units,updated_at,due_date) VALUES('site','고객 현장','가상 주소',37,127,'pending',2,?,'')").bind(stamp).run();
  await DB.prepare("INSERT INTO site_reporting(site_id,contractor_email) VALUES('site','legacy@example.invalid')").bind().run();
  await DB.prepare("INSERT INTO work_plans(site_id,worker_email,start_date,repeat_days,instructions,updated_at) VALUES('site','cleaner@example.invalid',?,30,'',?)").bind(today, stamp).run();
  async function call(path, { method = 'GET', body, role = 'owner', status = 200, runner = false } = {}) {
    const email = role === 'owner' ? env.BONYEON_OWNER_EMAIL : role + '@example.invalid';
    const response = await handleApi(new Request(origin + '/api/' + path, { method,
      headers: { Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(runner ? { Authorization: 'Bearer ' + env.BONYEON_REPORT_RUN_SECRET }
          : { 'oai-authenticated-user-id': email, 'oai-authenticated-user-email': email }) },
      ...(body ? { body: JSON.stringify(body) } : {}) }), env, handleControl, handleWorkflows);
    const data = await response.json();
    assert.equal(response.status, status, JSON.stringify(data));
    return data;
  }
  const save = (contractorEmails, options = {}) => call('control/site', { method: 'PATCH',
    body: { siteId: 'site', region: null, contractorEmails }, ...options });
  const runner = (action, body = {}) => call('control/gmail/' + action, { method: 'POST', body, runner: true });
  const claim = async () => (await runner('claim', { requestId: crypto.randomUUID() })).message;
  const ack = message => runner('complete', { id: message.id, claim: message.claim });
  const seed = (status = 'approved', units = 2) => DB.prepare(`INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,
    units,exterior,interior,notes,status,updated_at,approved_at,planned_units,contract_price,worker_price)
    VALUES('report','site',?,'cleaner@example.invalid','가상 작업자','고객 현장','가상 주소',?,?,0,'비공개 내부 메모',?,?,?,2,50000,20000)`)
    .bind(today, units, units, status, stamp, status === 'approved' ? new Date().toISOString() : null).run();
  await runner('activate');
  return { DB, env, today, stamp, call, save, runner, claim, ack, seed };
}

test('only administrators edit bounded, validated per-site client lists; legacy recipients survive', async () => {
  const h = await harness();
  let overview = await h.call('control/overview');
  assert.deepEqual(overview.sites[0].contractorEmails, ['legacy@example.invalid']);
  await h.save([' One@Example.invalid ', 'two@example.invalid', 'one@example.invalid'], { role: 'admin' });
  overview = await h.call('control/overview');
  assert.deepEqual(overview.sites[0].contractorEmails, ['one@example.invalid', 'two@example.invalid']);
  await h.save(['changed@example.invalid'], { role: 'cleaner', status: 403 });
  await h.save(['good@example.invalid', 'bad\r\nBcc: other@example.invalid'], { status: 400 });
  await h.save(Array.from({ length: 21 }, (_, i) => `client${i}@example.invalid`), { status: 400 });
  assert.deepEqual((await h.call('control/overview')).sites[0].contractorEmails, overview.sites[0].contractorEmails);
  const worker = await h.call('control/overview', { role: 'cleaner' });
  assert.equal(worker.sites[0].contractorEmails, undefined);
  assert.equal(worker.sites[0].contractorEmail, undefined);
  await h.call('control/site', { method: 'PATCH', body: { siteId: 'site', region: null, contractorEmail: 'legacy2@example.invalid' } });
  assert.deepEqual((await h.call('control/overview')).sites[0].contractorEmails, ['legacy2@example.invalid']);
});

test('final approved work sends separately to every client exactly once, without internal finance', async () => {
  const h = await harness();
  await h.save(['client1@example.invalid', 'client2@example.invalid']);
  await h.seed('submitted');
  assert.equal(await h.claim(), null);
  await h.DB.prepare("UPDATE field_reports SET status='approved',approved_at=?,units=1 WHERE id='report'").bind(new Date().toISOString()).run();
  assert.equal(await h.claim(), null);
  await h.call('control/mail?kind=contractor&reference=report', { status: 404 });
  await h.DB.prepare("UPDATE field_reports SET units=2 WHERE id='report'").bind().run();
  await h.DB.prepare("UPDATE field_reports SET planned_units=NULL WHERE id='report'").bind().run();
  assert.equal(await h.claim(),null);
  await h.DB.prepare("UPDATE field_reports SET planned_units=2 WHERE id='report'").bind().run();
  const mails = (await Promise.all(Array.from({ length: 4 }, () => h.claim()))).filter(Boolean);
  assert.equal(mails.length, 2);
  assert.deepEqual(mails.map(m => m.to).sort(), ['client1@example.invalid', 'client2@example.invalid']);
  for (const mail of mails) {
    assert.match(mail.subject, /고객 현장 충전기 청소 결과/);
    assert.doesNotMatch(mail.body + mail.html, /비공개 내부 메모|공급가액|작업자 지급|50,000|20,000/);
    assert.equal(mail.to.includes(','), false);
    await h.ack(mail);
    await h.ack(mail);
  }
  assert.equal(await h.claim(), null);
});

test('manual previews bind the whole recipient list and removed queued clients cannot receive', async () => {
  const h = await harness();
  await h.seed();
  await h.save(['one@example.invalid', 'two@example.invalid']);
  const first = await h.call('control/mail?kind=contractor&reference=report');
  assert.deepEqual(first.recipients, ['one@example.invalid', 'two@example.invalid']);
  await h.save(['one@example.invalid', 'three@example.invalid']);
  await h.call('control/mail', { method: 'POST', body: { kind: 'contractor', reference: 'report', recipient: first.recipient, previewToken: first.previewToken }, status: 409 });
  const preview = await h.call('control/mail?kind=contractor&reference=report');
  const request = { kind: 'contractor', reference: 'report', recipient: preview.recipient, previewToken: preview.previewToken,allowHistorical:true };
  await h.call('control/mail', { method: 'POST', body: request });
  await h.call('control/mail', { method: 'POST', body: request });
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS n FROM report_mail WHERE kind='contractor'").first()).n, 2);
  await h.save(['one@example.invalid']);
  const received = await h.claim();
  assert.equal(received.to, 'one@example.invalid');
  await h.ack(received);
  assert.equal(await h.claim(), null);
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS n FROM report_mail WHERE recipient='three@example.invalid' AND canceled_at IS NOT NULL").first()).n, 1);
});

test('twenty client deliveries queue atomically and clearing a site cancels every unsent address', async () => {
  const h = await harness();
  await h.seed();
  const recipients = Array.from({ length: 20 }, (_, i) => `client${i}@example.invalid`);
  await h.save(recipients);
  const preview = await h.call('control/mail?kind=contractor&reference=report');
  const queued = await h.call('control/mail', { method: 'POST', body: { kind: 'contractor', reference: 'report', recipient: preview.recipient, previewToken: preview.previewToken,allowHistorical:true } });
  assert.equal(queued.queuedCount, 20);
  await h.save([]);
  for (let attempt = 0; attempt < 3; attempt++) assert.equal(await h.claim(), null);
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS n FROM report_mail WHERE kind='contractor' AND canceled_at IS NULL").first()).n, 0);
});

test('provider fallback delivers separately and keeps per-address idempotency', async t => {
  const h = await harness();
  await h.seed();
  await h.save(['one@example.invalid', 'two@example.invalid']);
  delete h.env.BONYEON_GMAIL_FROM;
  h.env.BONYEON_REPORT_FROM = 'reports@example.invalid';
  h.env.BONYEON_RESEND_API_KEY = 'test-provider-key';
  const delivered = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    delivered.push({ ...JSON.parse(options.body), key: options.headers['Idempotency-Key'] });
    return Response.json({ id: 'receipt-' + delivered.length });
  });
  const preview = await h.call('control/mail?kind=contractor&reference=report');
  const body = { kind: 'contractor', reference: 'report', recipient: preview.recipient, previewToken:preview.previewToken,allowHistorical:true };
  await h.call('control/mail', { method: 'POST', body });
  await h.call('control/mail', { method: 'POST', body });
  assert.deepEqual(delivered.map(mail => mail.to), [['one@example.invalid'], ['two@example.invalid']]);
  assert.equal(new Set(delivered.map(mail => mail.key)).size, 2);
});

test('provider fallback also rejects changed previews and a removed recipient during sending', async t => {
  const h = await harness();
  await h.seed();
  await h.save(['one@example.invalid', 'two@example.invalid']);
  delete h.env.BONYEON_GMAIL_FROM;
  h.env.BONYEON_REPORT_FROM = 'reports@example.invalid';
  h.env.BONYEON_RESEND_API_KEY = 'test-provider-key';
  const old = await h.call('control/mail?kind=contractor&reference=report');
  await h.save(['one@example.invalid', 'three@example.invalid']);
  await h.call('control/mail', { method:'POST',status:409,body:{kind:'contractor',reference:'report',recipient:old.recipient,previewToken:old.previewToken} });
  const preview = await h.call('control/mail?kind=contractor&reference=report');
  const sent = [];
  t.mock.method(globalThis,'fetch',async (_,options)=>{
    sent.push(JSON.parse(options.body).to);
    await h.save(['one@example.invalid']);
    return Response.json({id:'receipt-'+sent.length});
  });
  await h.call('control/mail',{method:'POST',status:409,body:{kind:'contractor',reference:'report',recipient:preview.recipient,previewToken:preview.previewToken,allowHistorical:true}});
  assert.deepEqual(sent,[['one@example.invalid']]);
});

test('provider fallback resumes twenty recipients without exceeding the D1 Free request budget', async t => {
  const h = await harness();
  await h.seed();
  const recipients = Array.from({ length:20 },(_,i)=>`client${i}@example.invalid`);
  await h.save(recipients);
  delete h.env.BONYEON_GMAIL_FROM;
  h.env.BONYEON_REPORT_FROM = 'reports@example.invalid';
  h.env.BONYEON_RESEND_API_KEY = 'test-provider-key';
  let queries=0;
  h.env.DB={prepare(sql){
    const wrap=statement=>({bind:(...args)=>wrap(statement.bind(...args)),
      first:()=>{assert.ok(++queries<=50);return statement.first();},
      all:()=>{assert.ok(++queries<=50);return statement.all();},
      run:()=>{assert.ok(++queries<=50);return statement.run();}});
    return wrap(h.DB.prepare(sql));
  }};
  const sent=[];
  t.mock.method(globalThis,'fetch',async(_,options)=>{
    sent.push(JSON.parse(options.body).to[0]);return Response.json({id:'receipt-'+sent.length});
  });
  const preview=await h.call('control/mail?kind=contractor&reference=report');
  const body={kind:'contractor',reference:'report',recipient:preview.recipient,previewToken:preview.previewToken,allowHistorical:true};
  for (let index=0;index<3;index++) {
    queries=0;
    const result=await h.call('control/mail',{method:'POST',body});
    assert.equal(result.partial,index<2);
    assert.ok(queries<=50);
  }
  assert.deepEqual(sent,recipients);
  assert.equal(new Set(sent).size,20);
});
