import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

test('automates confirmed worker changes and the first complete tax month with private snapshot links', async () => {
  const db = await createPreviewDb();
  const origin = 'https://bonyeon.example';
  const owner = 'owner@bonyeon.example';
  const mailbox = 'central@bonyeon.example';
  const worker = 'cleaner@bonyeon.example';
  const peer = 'peer@bonyeon.example';
  const seoul = new Date(Date.now() + 9 * 3600_000);
  const today = seoul.toISOString().slice(0, 10);
  const workDate = new Date(Date.UTC(seoul.getUTCFullYear(), seoul.getUTCMonth(), 0)).toISOString().slice(0, 10);
  const month = workDate.slice(0, 7);
  const old = workDate + 'T10:00:00.000Z';
  const secret = 'office-auto-test'.repeat(4);
  const env = { DB: db, BONYEON_SITE_ORIGIN: origin, BONYEON_OWNER_EMAIL: owner,
    BONYEON_GMAIL_FROM: mailbox, BONYEON_REPORT_START_DATE: today, BONYEON_REPORT_RUN_SECRET: secret };
  async function request(path, method = 'GET', body, actor = owner, status = 200) {
    const auth = path.startsWith('control/gmail/') ? { Authorization: 'Bearer ' + secret }
      : actor ? { 'oai-authenticated-user-id': actor, 'oai-authenticated-user-email': actor } : {};
    const response = await handleApi(new Request(origin + '/api/' + path, { method, headers: { Origin: origin, ...auth,
      ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, handleControl, handleWorkflows);
    const data = await response.json();
    assert.equal(response.status, status, path + ': ' + JSON.stringify(data));
    return data;
  }
  const runner = (action, body = {}) => request('control/gmail/' + action, 'POST', body);
  const claim = async () => (await runner('claim')).message;
  const complete = ({ id, claim }) => runner('complete', { id, claim });
  const mailKey = message => /#control-detail\/mail\/([a-f0-9]{64})/.exec(message.html)?.[1];
  const detail = (key, actor = owner, status = 200) =>
    request('control/detail?' + new URLSearchParams({ kind: 'mail', id: key }), 'GET', undefined, actor, status);
  const plan = (instructions, repeatDays = 30) => request('work/plan', 'PUT', {
    siteId: 'auto-site', workerEmail: worker, startDate: today, repeatDays, instructions,
  });
  const record = (paid, paidDate, vat, paymentVersion) => request('work/settlement/payments', 'PATCH', {
    id: '00000000-0000-4000-8000-000000000001', billed: 55000, received: 44000, paid, vat, paymentVersion,
    billingRef: '자동-검증', changeReason: '검증 금액 및 증빙 입력', workers: [{ email: worker, units: 2, paid, paidDate }],
  });

  for (const [email, name] of [[worker, '자동 작업자'], [peer, '다른 작업자']]) {
    await db.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES (?,?,?,'cleaner',1,?)")
      .bind(email, email, name, old).run();
  }
  await db.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date) VALUES ('auto-site','자동 검증 현장','서울',37,127,'pending',?,?)")
    .bind(old, today).run();
  await runner('activate');
  await plan('첫 배정');
  assert.equal(await claim(), null);
  await request('control/settings', 'PATCH', { email: owner, taxEmail: mailbox, workerMailEnabled: false, officeAutoEnabled: true });
  assert.equal((await request('control/overview')).mailSettings.officeAutoEnabled, true);
  const first = await claim();
  assert.equal(first.to, mailbox);
  assert.match(first.html, /첫 배정|작업 배정·지급 상세 보기/);
  const firstKey = mailKey(first);
  assert.ok(firstKey);
  assert.match((await detail(firstKey)).html, /첫 배정/);
  await detail(firstKey, worker, 404);
  await detail(firstKey, peer, 404);
  await detail(firstKey, null, 401);
  await complete(first);
  await plan('첫 배정');
  assert.equal(await claim(), null);
  await plan('첫 배정', 45);
  const changed = await claim();
  assert.match(changed.html, /45일마다/);
  await complete(changed);
  await plan('첫 배정');
  const restored = await claim();
  assert.match(restored.html, /30일마다/);
  assert.notEqual(mailKey(restored), firstKey);
  await complete(restored);
  assert.equal(await claim(), null);

  await db.prepare(`
    INSERT INTO field_reports (id,site_id,work_date,author_id,author_name,site_name,site_address,
      units,exterior,interior,notes,status,updated_at,approved_at,contract_price,worker_price)
    VALUES ('00000000-0000-4000-8000-000000000001','auto-site',?,?,'자동 작업자','자동 검증 현장','서울',2,2,1,'','approved',?,?,23000,10000)
  `).bind(workDate, worker, old, old).run();
  await record(15000, '', null, 0);
  await db.prepare("INSERT INTO settlement_months(month,closed_at,closed_by) VALUES (?,?,'관리자')").bind(month, old).run();
  assert.equal(await claim(), null);
  await record(15000, workDate, 5000, 1);
  const both = [];
  for (let i = 0; i < 2; i++) {
    const job = await claim();
    assert.ok(job, 'Both confirmed office messages are due');
    both.push(job);
    await complete(job);
  }
  const workerMail = both.find(job => job.subject.includes('작업자 작업·지급 안내'));
  const tax = both.find(job => job.subject.includes('세무 비용 처리 자료'));
  assert.equal(workerMail.to, mailbox);
  assert.equal(tax.to, mailbox);
  assert.match(workerMail.html, /15,000원/);
  assert.doesNotMatch(workerMail.html, /55,000원/);
  assert.match(tax.html, /세무 비용 자료 상세 보기/);
  assert.match(tax.html, /50,000원/);
  assert.match(tax.html, /5,000원/);
  assert.match((await detail(mailKey(tax))).html, /15,000원/);
  await detail(mailKey(tax), worker, 404);
  assert.equal(await claim(), null);
  await record(17000, workDate, 5000, 2);
  const updatedWorker = await claim();
  assert.match(updatedWorker.subject, /작업자 작업·지급 안내/);
  assert.match(updatedWorker.html, /17,000원/);
  await complete(updatedWorker);
  assert.equal(await claim(), null);
  assert.match((await detail(mailKey(tax))).html, /15,000원/);
  assert.doesNotMatch((await detail(mailKey(tax))).html, /17,000원/);

  await request('control/settings', 'PATCH', { email: owner, workerMailEnabled: true });
  await plan('본인 직접 수신 확인');
  const direct = await claim();
  assert.equal(direct.to, worker);
  const directKey = mailKey(direct);
  await detail(directKey, worker, 404);
  await complete(direct);
  assert.match((await detail(directKey, worker)).html, /본인 직접 수신 확인/);
  await detail(directKey, peer, 404);

  const nextPair = async () => {
    const pair = new Map();
    for (let i = 0; i < 2; i++) {
      const job = await claim();
      assert.ok(job);
      pair.set(job.to, job.html);
      await complete(job);
    }
    assert.equal(await claim(), null);
    return pair;
  };
  await request('work/plan', 'PUT', { siteId: 'auto-site', workerEmail: peer, startDate: today, repeatDays: 30, instructions: '새 담당자만 읽는 지시' });
  const reassigned = await nextPair();
  assert.match(reassigned.get(worker), /이전 작업 배정 해제/);
  assert.doesNotMatch(reassigned.get(worker), /새 담당자만 읽는 지시/);
  assert.match(reassigned.get(peer), /새 담당자만 읽는 지시/);

  await request('work/settlement/payments', 'PATCH', {
    id: '00000000-0000-4000-8000-000000000001', billed: 55000, received: 44000, paid: 18000, vat: 5000, paymentVersion:3,
    billingRef: '자동-검증', changeReason: '실제 작업자 재확정', workers: [{ email: peer, units: 2, paid: 18000, paidDate: workDate }],
  });
  const reallocated = await nextPair();
  assert.match(reallocated.get(worker), /이전 지급 대상에서 제외/);
  assert.doesNotMatch(reallocated.get(worker), /18,000원/);
  assert.match(reallocated.get(peer), /18,000원/);

  await request('work/plan', 'PUT', { siteId: 'auto-site', workerEmail: peer, startDate: today, repeatDays: 30, instructions: '받지 않은 안내' });
  const requestId = crypto.randomUUID();
  const pending = (await runner('claim', { requestId })).message;
  assert.match(pending.html, /받지 않은 안내/);
  await request('work/plan', 'PUT', { siteId: 'auto-site', workerEmail: peer, startDate: today, repeatDays: 30, instructions: '최신 확정 안내' });
  assert.equal((await runner('claim', { requestId })).message, null);
  const latest = await claim();
  assert.match(latest.html, /최신 확정 안내/);
  assert.doesNotMatch(latest.html, /받지 않은 안내/);
  await complete(latest);

  const future = new Date(Date.UTC(seoul.getUTCFullYear(), seoul.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  await db.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date) VALUES ('future-site','추가 테스트 현장','서울',37,127,'pending',?,?)")
    .bind(old, future).run();
  const futurePlan = workerEmail => request('work/plan', 'PUT', {
    siteId: 'future-site', workerEmail, startDate: future, repeatDays: 30, instructions: '다음 달 배정',
  });
  await futurePlan(worker);
  const lostId = crypto.randomUUID();
  assert.equal((await runner('claim', { requestId: lostId })).message.to, worker);
  await futurePlan(peer);
  assert.equal((await runner('claim', { requestId: lostId })).message, null);
  const onlyNew = await claim();
  assert.equal(onlyNew.to, peer);
  await complete(onlyNew);
  assert.equal(await claim(), null);
});
