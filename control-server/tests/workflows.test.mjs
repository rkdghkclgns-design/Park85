import { proofJpeg } from './fixtures/photo.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

test('recurring assignments, private evidence, locked close, and scheduled mail boundaries', async t => {
  const db = await createPreviewDb();
  const files = new Map();
  const origin = 'https://bonyeon.example';
  const owner = 'admin@bonyeon.example';
  const worker = 'worker@bonyeon.example';
  const other = 'other@bonyeon.example';
  const viewer = 'viewer@bonyeon.example';
  const env = {
    DB: db, BONYEON_OWNER_EMAIL: owner, BONYEON_SITE_ORIGIN: origin, BONYEON_VERIFICATION_MODE: true,
    BUCKET: {
      async put(key, body) { files.set(key, body); },
      async get(key) { return files.has(key) ? { body: files.get(key) } : null; },
      async delete(key) { files.delete(key); },
    },
  };
  const kst = new Date(Date.now() + 9 * 3600_000);
  const now = kst.toISOString().slice(0, 10);
  const earlier = days => new Date(+kst - days * 86_400_000).toISOString().slice(0, 10);
  const priorDay = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 0)).toISOString().slice(0, 10);
  const priorMonth = priorDay.slice(0, 7);
  const call = (path, method = 'GET', body, email = owner, headers = {}) => {
    const form = body instanceof FormData;
    return handleApi(new Request(origin + '/api/' + path, {
      method,
      headers: { Origin: origin, ...(body && !form ? { 'Content-Type': 'application/json' } : {}),
        ...(email ? { 'oai-authenticated-user-id': email, 'oai-authenticated-user-email': email } : {}), ...headers },
      body: form ? body : body ? JSON.stringify(body) : undefined,
    }), env, handleControl, handleWorkflows);
  };
  async function request(path, method, body, email, expected = 200, headers) {
    const response = await call(path, method, body, email, headers);
    const json = await response.json();
    assert.equal(response.status, expected, path + ': ' + JSON.stringify(json));
    return json;
  }

  for (const [email, name, role] of [[worker, '김 작업자', 'cleaner'], [other, '이 작업자', 'cleaner'], [viewer, '조회 계정', 'viewer']]) {
    await request('users', 'POST', { email, name, role, active: true }, owner, 201);
  }
  const makeSite = (id, dueDate, status = 'pending', details = {}) =>
    ({ id, name: id, address: '테스트 주소', lat: 37.56, lng: 126.97, dueDate, status, ...details });
  await request('sites/import', 'POST', { rows: [
    makeSite('assigned', priorDay, 'pending', { plannedUnits:1 }), makeSite('pending', now, 'pending', { assignee: '박 작업자', workNote: '출입구' }),
    makeSite('imported-done', priorDay, 'done', { completedDate: priorDay, workNote: '청소 완료' }),
  ] });
  await request('work/plan', 'PUT', { siteId: 'assigned', workerEmail: worker, startDate: priorDay, repeatDays: 90, instructions: '관리실 방문' });
  await request('work/delay', 'PATCH', { siteId: 'assigned', dueDate: priorDay, reason: '출입 일정 변경' }, other, 409);
  await request('work/delay', 'PATCH', { siteId: 'assigned', dueDate: priorDay, reason: '출입 일정 변경' }, worker);
  let map = (await request('sites')).sites;
  assert.deepEqual(map.map(site => site.status).sort(), ['delayed', 'done', 'pending']);
  const delayed = map.find(site => site.id === 'assigned');
  assert.equal(delayed.assignee, '김 작업자');
  assert.equal(delayed.delayReason, '출입 일정 변경');
  assert.equal(delayed.delayDays, Math.round((Date.parse(now) - Date.parse(priorDay)) / 86_400_000));
  assert.equal(map.find(site => site.id === 'imported-done').completedDate, priorDay);
  assert.equal(map.find(site => site.id === 'pending').workNote, '출입구');
  assert.ok(!(await request('work/overview', 'GET', undefined, other)).sites.some(site => site.id === 'assigned'));
  await request('work/overview', 'GET', undefined, viewer, 403);

  await request('control/site', 'PATCH', { siteId: 'assigned', region: '서울특별시', contractorEmail: 'contractor@bonyeon.example' });
  for (const [kind, price] of [['contract', 21000], ['worker', 9000]]) {
    await request('charger-regions/price', 'PATCH', { region: '서울특별시', kind, price, previousPrice: null });
  }
  const field = { siteId: 'assigned', workDate: priorDay, units: 1, exterior: 1, interior: 1, notes: '내부 메모' };
  await request('control/report', 'POST', field, other, 409);
  await request('control/report', 'POST', field, worker, 409);
  const provisionalEvidence=crypto.randomUUID();
  await db.prepare(`INSERT INTO charger_evidence(id,site_id,work_date,asset_code,author_id,author_name,exterior,interior,safety_checked,issue,created_at)
    VALUES (?,'assigned',?,'PROVISIONAL',?,'김 작업자',1,1,1,'',?)`).bind(provisionalEvidence,priorDay,worker,new Date().toISOString()).run();
  await request('control/report', 'POST', field, worker);
  const { reports } = await request('control/overview?month=' + priorMonth, 'GET', undefined, worker);
  const report = reports[0];
  assert.equal(report.contractPrice, undefined);
  assert.ok(report.completionReportedAt);
  const detail = (kind, id) => 'control/detail?' + new URLSearchParams({ kind, id, month: priorMonth });
  assert.equal((await request(detail('site', 'assigned'), 'GET', undefined, worker)).reports[0].id, report.id);
  assert.equal((await request(detail('worker', worker))).reports[0].id, report.id);
  await request(detail('site', 'assigned'), 'GET', undefined, other, 404);
  await request(detail('worker', worker), 'GET', undefined, other, 404);
  await request(detail('report', report.id), 'GET', undefined, other, 404);
  // Simulate evidence being removed after submission: approval must recheck the current rows.
  await db.prepare('DELETE FROM charger_evidence WHERE id=?').bind(provisionalEvidence).run();
  await request('control/review', 'PATCH', { id: report.id, action: 'approve' }, owner, 409);
  await request('work/settlement/close', 'POST', { month: priorMonth }, owner, 409);

  const jpeg = proofJpeg;
  const proof = new FormData();
  for (const [key, value] of Object.entries({ siteId: 'assigned', workDate: priorDay, assetCode: ' test-01 ',
    exterior: '1', interior: '1', safety: '1', issue: '커버 손상', chargerType: 'fast', canopy: 'included' })) proof.set(key, value);
  for (const slot of ['exteriorBefore', 'exteriorAfter', 'interiorBefore', 'interiorAfter']) {
    proof.set(slot, new Blob([jpeg], { type: 'image/jpeg' }), slot + '.jpg');
  }
  await request('work/evidence', 'POST', proof, other, 403);
  const { version,assignmentDue } = await request('work/guidance?siteId=assigned','GET',undefined,worker);
  await request('work/guidance','PUT',{ siteId:'assigned',version,assignmentDue,confirmed:true },worker);
  const checklist = { access:true,equipment:true,condition:true,power:true };
  proof.set('safetyChecklist',JSON.stringify(checklist));
  await request('work/evidence','POST',proof,worker,400);
  proof.set('safetyChecklist',JSON.stringify({ ...checklist,isolation:true }));
  const { id } = await request('work/evidence', 'POST', proof, worker, 201);
  await request('work/evidence', 'POST', proof, worker, 409);
  assert.equal(files.size, 4);
  const photoPath = 'work/photo?id=' + id + '&slot=interiorAfter';
  assert.equal((await call(photoPath, 'GET', undefined, viewer)).status, 403);
  assert.equal((await call(photoPath, 'GET', undefined, other)).status, 404);
  const photo = await call(photoPath, 'GET', undefined, worker);
  const stored = await request(detail('report', report.id), 'GET', undefined, worker);
  assert.equal(stored.devices[0].charger_type, 'fast');
  assert.equal(stored.devices[0].canopy, 'included');
  assert.equal(stored.reports[0].contractPrice, undefined);
  assert.equal(photo.headers.get('Cache-Control'), 'private, no-store');
  assert.deepEqual(new Uint8Array(await photo.arrayBuffer()), jpeg);
  await request('work/issue', 'PATCH', { id, status: 'resolved', owner: '관리자', note: '교체 확인' });
  await request('control/review', 'PATCH', { id: report.id, action: 'approve' });
  await request('work/evidence', 'DELETE', { id }, worker, 409);
  map = (await request('sites')).sites;
  const done = map.find(site => site.id === 'assigned');
  assert.equal(done.status, 'done');
  assert.equal(done.completedDate, priorDay);
  assert.equal(done.evidenceCount, 1);
  assert.equal(done.interior, 1);
  assert.ok(done.nextDue > now);
  assert.equal(done.reportWorker, '김 작업자');
  await request('work/settlement/close', 'POST', { month: priorMonth });
  await request('control/report', 'POST', { ...field, siteId: 'pending' }, worker, 409);
  await request('work/settlement?month=' + priorMonth, 'GET', undefined, worker, 403);
  await request('work/settlement/payments', 'PATCH', { id: report.id, paymentVersion:0, billed: 21000, received: 13000, paid: 9000, billingRef: 'T-1' }, owner, 409);
  await request('work/settlement/payments', 'PATCH', { id: report.id, paymentVersion:0, billed: 21000, received: 13000, paid: 9000, billingRef: 'T-1', changeReason: '마감 후 첫 입금 확인' });
  const workerPayment = { email: other, units: 1, paid: 7000, paidDate: priorDay };
  const payment = { id: report.id, paymentVersion:1, billed: 21000, received: 13000, paid: 7000, vat: 2000, billingRef: 'T-1', changeReason: '실제 지급 내역 반영' };
  await request('work/settlement/payments', 'PATCH', { ...payment, vat: 22000 }, owner, 400);
  await request('work/settlement/payments', 'PATCH', { ...payment, workers: [{ ...workerPayment, units: 2 }] }, owner, 409);
  await request('work/settlement/payments', 'PATCH', { ...payment, workers: [workerPayment] });
  await request('work/settlement/payments', 'PATCH', { ...payment, paymentVersion:2, billed:23000, workers:[workerPayment] }, owner, 409);
  await request('work/settlement/payments', 'PATCH', { ...payment, paymentVersion:2, vat:2100, workers:[workerPayment] }, owner, 409);
  await request('work/evidence/classification', 'PATCH', { id, chargerType:'slow',canopy:'included' }, owner, 409);
  const ledger = await request('work/settlement?month=' + priorMonth);
  assert.ok(ledger.close.closedAt);
  assert.equal(ledger.rows[0].received, 13000);
  assert.equal(ledger.rows[0].vat, 2000);
  assert.equal(ledger.rows[0].workerBreakdown[0].email, other);
  const frozen = await request('work/settlement/export?month=' + priorMonth);
  assert.equal(frozen.legacy, false);
  assert.equal(frozen.rows[0].received, 0);
  const history = await request('control/analytics?kind=payment');
  assert.ok(history.events.some(event => event.detail.includes('실제 지급 내역 반영') && event.actor));
  await request('work/settlement/export?month=' + priorMonth, 'GET', undefined, worker, 403);
  await request('control/analytics', 'GET', undefined, worker, 403);
  const settlement = await request('control/mail?kind=settlement&reference=' + priorMonth);
  assert.match(settlement.text, /월 마감 완료/);
  assert.match(settlement.text, /마감 당시 확정 금액/);
  assert.match(settlement.text, /미수 0원/);
  assert.match(settlement.html, /공급가액/);
  assert.match(settlement.html, /실제 작업자 미입력 승인 보고 1건/);
  assert.doesNotMatch(settlement.html, /19,000원|이 작업자|7,000원/);
  assert.match(settlement.html, /급속 충전기/);
  const daily = await request('control/mail?kind=daily&reference=' + priorDay);
  assert.match(daily.html, /TEST-01/);
  assert.match(daily.html, /캐노피 포함/);
  assert.match(daily.html, /19,000원/);
  assert.match(daily.html, /이 작업자/);
  assert.match(daily.html, /미지급액/);
  const contractor = await request('control/mail?kind=contractor&reference=' + report.id);
  assert.match(contractor.text, /실작업 1기/);
  assert.doesNotMatch(contractor.text, /내부 메모|커버 손상|21,000|9,000/);
  assert.match(contractor.html, /TEST-01/);
  assert.match(contractor.html, /급속 충전기/);
  assert.doesNotMatch(contractor.html, /이 작업자|공급가액|미지급액|커버 손상|내부 메모|7,000원/);
  assert.equal(contractor.mailReady, false);

  const headers = { Authorization: 'Bearer ' + 'x'.repeat(48) };
  await request('control/run', 'POST', undefined, null, 403, headers);
  env.BONYEON_REPORT_RUN_SECRET = 'x'.repeat(48);
  await request('control/run', 'POST', undefined, null, 503, headers);
  env.BONYEON_REPORT_FROM = 'reports@bonyeon.example';
  env.BONYEON_RESEND_API_KEY = 'test-double';
  env.BONYEON_REPORT_START_DATE = earlier(2);
  const sent = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    sent.push(JSON.parse(options.body));
    return Response.json({ id: 'receipt-' + sent.length });
  });
  await request('control/run', 'POST', undefined, null, 200, headers);
  await request('control/run', 'POST', undefined, null, 200, headers);
  assert.equal(sent.length, 3);
  assert.deepEqual(sent.map(mail => mail.to[0]).sort(), [owner, owner, 'contractor@bonyeon.example']);
  assert.equal((await request('control/overview?month=' + priorMonth)).deliveries.length, 3);
});

test('the Gmail runner claims each report once and only its receipt can acknowledge delivery', async () => {
  const db = await createPreviewDb();
  const now = new Date();
  const kst = new Date(+now + 9 * 3600_000);
  const dueDate = new Date(+kst - (kst.getUTCHours() < 8 ? 2 : 1) * 86_400_000).toISOString().slice(0, 10);
  const workDate = kst.toISOString().slice(0, 10);
  const priorDate = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 0)).toISOString().slice(0, 10);
  const origin = 'https://bonyeon.example';
  const owner = 'owner@bonyeon.example';
  const sender = 'bonyeon85@gmail.com';
  const secret = 't'.repeat(48);
  const env = { DB: db, BONYEON_SITE_ORIGIN: origin, BONYEON_OWNER_EMAIL: owner,
    BONYEON_GMAIL_FROM: sender, BONYEON_REPORT_START_DATE: dueDate, BONYEON_REPORT_RUN_SECRET: secret };
  const call = (action, body = {}, token = secret) => handleApi(new Request(origin + '/api/control/gmail/' + action, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  }), env, handleControl, handleWorkflows);

  await db.prepare("INSERT INTO work_sites(id, name, address, lat, lng, status, updated_at, due_date) VALUES ('site-1', '현장 1', '서울', 37, 127, 'done', ?, '')")
    .bind(now.toISOString()).run();
  await db.prepare("INSERT INTO site_reporting(site_id, contractor_email) VALUES ('site-1', 'partner@bonyeon.example')")
    .bind().run();
  await db.prepare(`
    INSERT INTO field_reports(id, site_id, work_date, author_id, author_name, site_name, site_address,
      units, exterior, interior, notes, status, updated_at, approved_at, contract_price, worker_price)
    VALUES ('report-1', 'site-1', ?, 'worker', '작업자', '현장 1', '서울', 1, 1, 0, '내부 메모', 'approved', ?, ?, 21000, 9000)
  `).bind(priorDate, now.toISOString(), now.toISOString()).run();
  await db.prepare("INSERT INTO settlement_months(month, closed_at, closed_by) VALUES (?, ?, '관리자')")
    .bind(priorDate.slice(0, 7), now.toISOString()).run();

  assert.equal((await call('check', {}, 'untrusted')).status, 403);
  assert.equal((await call('claim')).status, 409);
  assert.deepEqual(await (await call('check')).json(), { sender });
  assert.equal((await call('activate')).status, 200);

  const cleaner = 'cleaner@bonyeon.example';
  await db.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES (?, 'cleaner-id', '완료 작업자', 'cleaner', 1, ?)").bind(cleaner, now.toISOString()).run();
  await db.prepare("INSERT INTO work_plans (site_id,worker_email,start_date,repeat_days,instructions,updated_at) VALUES ('site-1',?,?,30,'',?)")
    .bind(cleaner, workDate, now.toISOString()).run();
  await db.prepare("UPDATE work_sites SET planned_units=1 WHERE id='site-1'").bind().run();
  await db.prepare(`INSERT INTO charger_evidence(id,site_id,work_date,asset_code,author_id,author_name,exterior,interior,safety_checked,issue,created_at)
    VALUES (?,'site-1',?,'CURRENT-CLEANER-EVIDENCE','cleaner-id','완료 작업자',1,0,1,'',?)`).bind(crypto.randomUUID(),workDate,now.toISOString()).run();
  const submit = notes => handleApi(new Request(origin + '/api/control/report', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json',
      'oai-authenticated-user-id': 'cleaner-id', 'oai-authenticated-user-email': cleaner },
    body: JSON.stringify({ siteId: 'site-1', workDate, units: 1, exterior: 1, interior: 0, notes }),
  }), env, handleControl, handleWorkflows);
  assert.equal((await submit('첫 완료 등록')).status, 200);
  assert.equal((await submit('수정한 작업 결과')).status, 200);
  const responses = await Promise.all(Array.from({ length: 5 }, () => call('claim')));
  for (const response of responses) assert.equal(response.status, 200);
  const claimed = (await Promise.all(responses.map(response => response.json()))).map(result => result.message).filter(Boolean);
  assert.deepEqual(claimed.map(job => job.id.split(':')[1]).sort(), ['completion', 'contractor', 'daily', 'settlement']);
  const completion = claimed.find(job => job.id.startsWith('gmail:completion:'));
  assert.equal(completion.to, owner);
  assert.match(completion.subject, /^\[본연\] 작업 완료 보고 · 현장 1 · /);
  assert.match(completion.html, /수정한 작업 결과/);
  assert.match(completion.html, /#control-detail\/site\/site-1/);
  assert.match(completion.html, /#control-detail\/worker\/cleaner-id/);
  assert.match(completion.html, /#control-detail\/report\//);
  assert.doesNotMatch(completion.html, /공급가액|실제 작업자별 지급/);
  const external = claimed.find(job => job.id.startsWith('gmail:contractor:'));
  assert.equal(external.to, 'partner@bonyeon.example');
  assert.doesNotMatch(external.body, /내부 메모|21,000|9,000/);
  assert.match(external.html, /충전기 청소 결과/);
  assert.doesNotMatch(external.html, /공급가액|실제 작업자별 지급/);
  const templateTests = await (await call('template-tests')).json();
  assert.equal(templateTests.messages.length, 3);
  assert.ok(templateTests.messages.every(message => message.to === sender && message.html.includes('예시 데이터')));
  assert.match(templateTests.messages[1].html, /3,000원/);
  const { message: sample } = await (await call('completion-test')).json();
  assert.equal(sample.to, sender);
  assert.match(sample.subject, /작업 완료 보고.*테스트/);
  assert.match(sample.html, /#control-detail\/report\/completion-example/);
  assert.equal((await call('complete', { id: external.id, claim: crypto.randomUUID() })).status, 404);
  for (const { id, claim } of claimed) {
    assert.equal((await call('complete', { id, claim })).status, 200);
    assert.equal((await call('complete', { id, claim })).status, 200);
  }
  assert.equal((await (await call('claim')).json()).message, null);
  const overview = await handleApi(new Request(origin + '/api/control/overview', {
    headers: { 'oai-authenticated-user-id': 'owner', 'oai-authenticated-user-email': owner },
  }), env, handleControl, handleWorkflows);
  const status = await overview.json();
  assert.ok(status.gmailRunner.lastSeenAt);
  assert.equal(status.deliveries.filter(row => row.sentAt).length, 4);
});

test('a multi-megabyte monthly report is stored safely and can be replayed in full', async () => {
  const db = await createPreviewDb();
  const stamp = new Date().toISOString();
  const kst = new Date(Date.now()+9*3600_000);
  const month = new Date(Date.UTC(kst.getUTCFullYear(),kst.getUTCMonth(),0)).toISOString().slice(0,7);
  const origin = 'https://test.example';
  const email = 'office@example.invalid';
  const secret = 'z'.repeat(48);
  const env = { DB:db,BONYEON_SITE_ORIGIN:origin,BONYEON_OWNER_EMAIL:email,
    BONYEON_GMAIL_FROM:email,BONYEON_REPORT_START_DATE:kst.toISOString().slice(0,10),BONYEON_REPORT_RUN_SECRET:secret };
  const post = (action,body={}) => handleApi(new Request(origin+'/api/control/gmail/'+action,{
    method:'POST',headers:{ Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+secret },
    body:JSON.stringify(body),
  }),env,handleControl,handleWorkflows);
  await db.prepare(`
    WITH RECURSIVE sites(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM sites WHERE n<240)
    INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date)
    SELECT 'test-'||n,'검증 현장 '||n,'서울',37,127,'done',?,''
    FROM sites
  `).bind(stamp).run();
  await db.prepare(`
    INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,units,
      exterior,interior,notes,status,updated_at,approved_at,contract_price,worker_price)
    SELECT id,id,?,'worker','검증 작업자',name,address,1,1,0,?,'approved',?,?,20000,10000
    FROM work_sites
  `).bind(month+'-10','세부 현장 작업 기록입니다. '.repeat(93),stamp,stamp).run();
  await db.prepare("INSERT INTO settlement_months(month,closed_at,closed_by) VALUES (?,?,'관리자')").bind(month,stamp).run();
  assert.equal((await post('activate')).status,200);
  const requestId = crypto.randomUUID();
  const claim = async () => {
    const response = await post('claim',{ requestId });
    assert.equal(response.status,200);
    return (await response.json()).message;
  };
  const report = await claim();
  assert.match(report.subject,/월 결산/);
  assert.ok(Buffer.byteLength(report.body)+Buffer.byteLength(report.html)>2_000_000);
  const stored = await db.prepare('SELECT length(body)+length(html) AS size FROM report_mail WHERE id=?').bind(report.id).first();
  assert.ok(stored.size<1_350_000);
  assert.deepEqual(await claim(),report);
});
