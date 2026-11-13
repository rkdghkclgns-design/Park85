import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

const origin = 'https://approval.example.invalid';
const mailbox = 'central@example.invalid';
const worker = 'worker@example.invalid';
const stamp = new Date().toISOString();
const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

async function fixture({ completed = true, status = 'submitted' } = {}) {
  const db = await createPreviewDb();
  const secret = 'isolated-approval-mail-test'.repeat(2);
  const env = { DB: db, BONYEON_OWNER_EMAIL: mailbox, BONYEON_SITE_ORIGIN: origin,
    BONYEON_GMAIL_FROM: mailbox, BONYEON_REPORT_START_DATE: today, BONYEON_REPORT_RUN_SECRET: secret };
  async function call(path, method = 'GET', body, expected = 200, email = mailbox) {
    const runner = path.startsWith('control/gmail/');
    const response = await handleApi(new Request(origin + '/api/' + path, {
      method, headers: { Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(runner ? { Authorization: 'Bearer ' + secret }
          : { 'oai-authenticated-user-id': email, 'oai-authenticated-user-email': email }) },
      body: body ? JSON.stringify(body) : undefined,
    }), env, handleControl, handleWorkflows);
    const data = await response.json();
    assert.equal(response.status, expected, path + ': ' + JSON.stringify(data));
    return data;
  }
  const runner = (action, body = {}) => call('control/gmail/' + action, 'POST', body);
  await runner('activate');
  await db.prepare('INSERT INTO control_settings(id,admin_email) VALUES(1,?)').bind(mailbox).run();
  await db.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES (?,?,'작업자','cleaner',1,?)")
    .bind(worker, worker, stamp).run();
  await db.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date,planned_units) VALUES('site','승인 검증 현장','검증 주소',37,127,'pending',?,?,1)")
    .bind(stamp, today).run();
  await db.prepare(`INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,
    units,exterior,interior,notes,status,updated_at,completion_reported_at,approved_at,planned_units)
    VALUES('report','site',? ,?,'작업자','승인 검증 현장','검증 주소',1,1,0,'검증용 보고',?,?,?,?,1)`)
    .bind(today, worker, status, stamp, completed ? stamp : null, status === 'approved' ? stamp : null).run();
  await db.prepare(`INSERT INTO charger_evidence(id,site_id,work_date,asset_code,author_id,author_name,
    exterior,interior,safety_checked,issue,created_at) VALUES('evidence','site',?,'ONE',?,'작업자',1,0,1,'',?)`)
    .bind(today, worker, stamp).run();
  const approve = () => call('control/review', 'PATCH', { id: 'report', action: 'approve' });
  const queue = () => db.prepare("SELECT * FROM report_mail WHERE kind='completion' AND reference='report' AND canceled_at IS NULL").all();
  return { db, env, call, runner, approve, queue };
}

test('approval atomically queues one completion message; only the scheduled runner prepares and sends it', async () => {
  const h = await fixture();
  assert.equal((await h.queue()).results.length, 0);
  assert.equal((await h.runner('claim', { requestId: crypto.randomUUID() })).message, null, 'submission alone cannot send');
  await h.call('control/review', 'PATCH', { id: 'report', action: 'approve' }, 403, worker);
  assert.equal((await h.queue()).results.length, 0);
  await h.approve();
  const [pending] = (await h.queue()).results;
  assert.ok(pending, 'approval itself registers an outbox row without a mail endpoint');
  assert.equal(pending.recipient, mailbox);
  assert.equal(pending.provider_id, null);
  assert.equal(pending.sent_at, null);
  assert.ok(pending.requested_by);
  await h.call('control/review', 'PATCH', { id: 'report', action: 'approve' }, 409);
  await h.call('control/review', 'PATCH', { id: 'report', action: 'rates' });
  assert.equal((await h.queue()).results.length, 1, 'duplicate approvals and rate changes cannot add another message');
  const requestId = crypto.randomUUID();
  const message = (await h.runner('claim', { requestId })).message;
  assert.equal(message.id, pending.id);
  assert.equal(message.to, mailbox);
  assert.match(message.subject, /^\[본연\] 작업 완료 보고/);
  assert.match(message.body, /승인/);
  assert.match(message.html, /#control-detail\/report\/report/);
  assert.deepEqual((await h.runner('claim', { requestId })).message, message, 'lost claim replies replay the same reservation');
  await h.runner('complete', { id: message.id, claim: message.claim });
  assert.equal((await h.runner('claim', { requestId: crypto.randomUUID() })).message, null);
  assert.ok((await h.queue()).results[0].sent_at);
});

test('administrator completion reports also queue on approval, and existing approvals are not backfilled', async () => {
  const admin = await fixture({ completed: false });
  await admin.approve();
  assert.ok((await admin.db.prepare("SELECT completion_reported_at FROM field_reports WHERE id='report'").first()).completion_reported_at);
  assert.equal((await admin.queue()).results.length, 1);
  const historical = await fixture({ status: 'approved' });
  assert.equal((await historical.queue()).results.length, 0);
  assert.equal((await historical.runner('claim', { requestId: crypto.randomUUID() })).message, null);
  await historical.call('control/review', 'PATCH', { id: 'report', action: 'rates' });
  assert.equal((await historical.queue()).results.length, 0, 'rate edits cannot resend an old approval');
});

test('an outbox failure rolls back approval, while revision and legacy unapproved mail cannot send', async () => {
  const h = await fixture();
  await h.db.prepare(`CREATE TRIGGER fail_completion_outbox BEFORE INSERT ON report_mail
    WHEN NEW.kind='completion' BEGIN SELECT RAISE(ABORT,'outbox unavailable'); END`).bind().run();
  await h.call('control/review', 'PATCH', { id: 'report', action: 'approve' }, 500);
  assert.equal((await h.db.prepare("SELECT status FROM field_reports WHERE id='report'").first()).status, 'submitted');
  assert.equal((await h.queue()).results.length, 0);
  await h.db.prepare('DROP TRIGGER fail_completion_outbox').bind().run();
  await h.call('control/review', 'PATCH', { id: 'report', action: 'revise', note: '사진 보완' });
  assert.equal((await h.queue()).results.length, 0);
  await h.db.prepare(`INSERT INTO report_mail(id,kind,reference,recipient,sender,subject,body,html,created_at,requested_by)
    VALUES('legacy','completion','report',?,?,'예전 미승인 메일','발송하면 안 됨','',?,'owner')`)
    .bind(mailbox, mailbox, stamp).run();
  assert.equal((await h.runner('claim', { requestId: crypto.randomUUID() })).message, null);
  assert.ok((await h.db.prepare("SELECT canceled_at FROM report_mail WHERE id='legacy'").first()).canceled_at);
});

test('concurrent scheduled claims reserve one approval message, and an uncertain send is never repeated', async () => {
  const h = await fixture();
  await h.approve();
  const claimed = await Promise.all([1, 2].map(() => h.runner('claim', { requestId: crypto.randomUUID() })));
  const messages = claimed.map(row => row.message).filter(Boolean);
  assert.equal(messages.length, 1);
  await h.runner('hold', { id: messages[0].id, claim: messages[0].claim });
  assert.equal((await h.runner('claim', { requestId: crypto.randomUUID() })).message, null);
  assert.equal((await h.queue()).results.length, 1);
});

function interruptWrite(h, matches, afterCommit) {
  let interrupted = false;
  h.env.DB = { prepare(sql) {
    const wrap = statement => ({
      bind: (...args) => wrap(statement.bind(...args)),
      first: (...args) => statement.first(...args),
      all: (...args) => statement.all(...args),
      run: async (...args) => {
        if (!interrupted && matches(sql)) {
          interrupted = true;
          if (afterCommit) await statement.run(...args);
          throw Error('isolated interrupted outbox write');
        }
        return statement.run(...args);
      },
    });
    return wrap(h.db.prepare(sql));
  } };
}

test('an interrupted preparation and later administrator address change preserves the unsent approval message', async () => {
  const h = await fixture();
  await h.approve();
  interruptWrite(h,sql=>sql.startsWith('UPDATE report_mail SET recipient='),true);
  await h.call('control/gmail/claim','POST',{ requestId:crypto.randomUUID() },500);
  const nextAddress = 'new-admin@example.invalid';
  await h.call('control/settings','PATCH',{ email:nextAddress });
  const message = (await h.runner('claim',{ requestId:crypto.randomUUID() })).message;
  assert.equal(message.to,nextAddress);
  assert.equal((await h.queue()).results.length,1);
  assert.equal((await h.queue()).results[0].canceled_at,null);
});

for (const afterCommit of [false,true]) {
  test('approval storage recovery survives a write interruption '+(afterCommit ? 'after' : 'before')+' commit',async()=>{
    const h = await fixture();
    await h.approve();
    await h.db.prepare(`UPDATE report_mail SET body=?,html='',hold_at=?,provider_id='gmail:storage:test',claim_request_id=NULL
      WHERE kind='completion'`).bind('보고 분량이 발송 저장 한도를 초과했습니다. 관제에서 해당 보고 기간의 상세 내역을 확인해 주세요.',stamp).run();
    interruptWrite(h,sql=>sql.startsWith('UPDATE report_mail SET recipient=') && sql.includes('hold_at=NULL'),afterCommit);
    const requestId = crypto.randomUUID();
    await h.call('control/gmail/claim','POST',{ requestId },500);
    assert.equal((await h.queue()).results.length,1,'the original outbox row must never be canceled before its replacement is durable');
    await h.db.prepare("UPDATE report_mail SET lease_until=NULL WHERE kind='completion'").bind().run();
    const message = (await h.runner('claim',{ requestId })).message;
    assert.ok(message);
    assert.equal(message.id,(await h.queue()).results[0].id);
    await h.runner('complete',{ id:message.id,claim:message.claim });
    assert.equal((await h.runner('claim',{ requestId:crypto.randomUUID() })).message,null);
  });
}
