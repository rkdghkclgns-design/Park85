import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl, portalDetailUrl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

const origin = 'https://mail.example.invalid';
const mailbox = 'central@example.invalid';
const consultation = 'consultation@example.invalid';
const secret = 'isolated-mail-reliability-test'.repeat(2);
const date = new Date(Date.now() + 9 * 3600_000);
const today = date.toISOString().slice(0,10);
const stamp = new Date().toISOString();

async function harness(start = today) {
  const db = await createPreviewDb();
  let queries = 0;
  let ceiling = Infinity;
  const counted = {
    prepare(sql) {
      const wrap = statement => ({
        bind: (...args) => wrap(statement.bind(...args)),
        first: (...args) => { if (++queries > ceiling) throw Error('D1 query ceiling exceeded'); return statement.first(...args); },
        all: (...args) => { if (++queries > ceiling) throw Error('D1 query ceiling exceeded'); return statement.all(...args); },
        run: (...args) => { if (++queries > ceiling) throw Error('D1 query ceiling exceeded'); return statement.run(...args); },
      });
      return wrap(db.prepare(sql));
    },
  };
  const env = { DB:counted,BONYEON_SITE_ORIGIN:origin,BONYEON_OWNER_EMAIL:mailbox,
    BONYEON_GMAIL_FROM:mailbox,BONYEON_CONSULTATION_EMAIL:consultation,
    BONYEON_REPORT_START_DATE:start,BONYEON_REPORT_RUN_SECRET:secret };
  async function runner(action,body={}) {
    const response = await handleApi(new Request(origin+'/api/control/gmail/'+action,{
      method:'POST',headers:{ Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+secret },body:JSON.stringify(body),
    }),env,handleControl,handleWorkflows);
    const data = await response.json();
    assert.equal(response.status,200,JSON.stringify(data));
    return data;
  }
  await runner('activate');
  await db.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date) VALUES ('site','테스트 현장','예시 주소',37,127,'pending',?,?)")
    .bind(stamp,today).run();
  const seedReport = async (id,workDate,notes='',status='submitted',completion=null) => {
    await db.prepare(`
    INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,
      units,exterior,interior,notes,status,updated_at,completion_reported_at,contract_price,worker_price)
    VALUES (?,'site',?,'worker','테스트 작업자','테스트 현장','예시 주소',1,1,0,?,?,?, ?,20000,10000)
  `).bind(id,workDate,notes,status,stamp,completion).run();
    if (completion) await db.prepare("UPDATE field_reports SET status='approved',approved_at=? WHERE id=?")
      .bind(stamp,id).run();
  };
  return { db,env,runner,seedReport,queryCount:()=>queries,resetBudget(limit=50){ queries=0;ceiling=limit; } };
}

test('public consultation backlog follows operational reports and only unreserved inquiries change mailbox',async()=>{
  const { db,env,runner,seedReport } = await harness();
  const old = '2000-01-01T00:00:00.000Z';
  for (let index=0;index<30;index++) {
    await db.prepare(`
      INSERT INTO report_mail(id,kind,reference,recipient,sender,subject,body,html,created_at,requested_by)
      VALUES (?,'consultation',?,'old-inbox@example.invalid',?,'테스트 상담','예시 상담','',?,'public-consultation')
    `).bind('gmail:consultation:'+index,String(index),mailbox,old).run();
  }
  await seedReport('completion',today,'','submitted',stamp);
  const priority = (await runner('claim',{requestId:crypto.randomUUID()})).message;
  assert.match(priority.id,/^gmail:completion:/);
  await runner('complete',{id:priority.id,claim:priority.claim});
  const requestId = crypto.randomUUID();
  const first = (await runner('claim',{requestId})).message;
  assert.match(first.id,/^gmail:consultation:/);
  assert.equal(first.to,consultation);
  assert.deepEqual((await runner('claim',{requestId})).message,first);
  env.BONYEON_CONSULTATION_EMAIL = 'new-inbox@example.invalid';
  assert.equal((await runner('claim',{requestId})).message,null);
  const next = (await runner('claim',{requestId:crypto.randomUUID()})).message;
  assert.equal(next.to,'new-inbox@example.invalid');
  assert.notEqual(next.id,first.id);
});

test('incomplete tax groups yield before the Free D1 request ceiling and later due reports still progress',async()=>{
  const { db,runner,seedReport,resetBudget,queryCount } = await harness();
  await db.prepare('INSERT INTO control_settings(id,admin_email,tax_email,office_auto_enabled) VALUES(1,?,?,1)').bind(mailbox,mailbox).run();
  for (let index=0;index<20;index++) {
    const month = new Date(Date.UTC(2020,index,1)).toISOString().slice(0,7);
    await seedReport('tax-'+index,month+'-10','','approved');
    await db.prepare("INSERT INTO settlement_months(month,closed_at,closed_by) VALUES (?,?,'테스트 관리자')").bind(month,month+'-28T00:00:00.000Z').run();
  }
  await seedReport('completion',today,'','submitted',stamp);
  let due;
  for (let attempt=0;attempt<5;attempt++) {
    resetBudget();
    due = (await runner('claim',{requestId:crypto.randomUUID()})).message;
    assert.ok(queryCount()<=50,'entire runner request stays under the D1 Free query ceiling');
    if (due) break;
  }
  assert.match(due.id,/^gmail:completion:/);
});

test('a storage-size hold retries corrected content while an uncertain send remains blocked',async()=>{
  const day = new Date(+date-(date.getUTCHours()<8?2:1)*86400_000).toISOString().slice(0,10);
  const { db,runner } = await harness(day);
  const site = db.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date) VALUES (?,'예시 현장','서울',37,127,'pending',?,'')");
  const report = db.prepare(`
    INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,
      units,exterior,interior,notes,status,updated_at)
    VALUES (?,?,?,'worker','테스트 작업자','예시 현장','서울',1,1,0,?,'submitted',?)
  `);
  for (let index=0;index<1250;index++) {
    const id = 'large-'+index;
    await site.bind(id,stamp).run();
    await report.bind(id,id,day,randomBytes(1100).toString('base64'),stamp).run();
  }
  assert.equal((await runner('claim',{requestId:crypto.randomUUID()})).message,null);
  const held = await db.prepare("SELECT * FROM report_mail WHERE kind='daily'").first();
  assert.ok(held.hold_at);
  assert.equal(held.claim_request_id,null);
  await db.prepare("UPDATE report_mail SET lease_until=NULL WHERE id=?").bind(held.id).run();
  assert.equal((await runner('claim',{requestId:crypto.randomUUID()})).message,null);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM report_mail WHERE kind='daily'").first()).count,1);
  await db.prepare("UPDATE field_reports SET notes='수정한 예시 기록'").bind().run();
  await db.prepare("UPDATE report_mail SET lease_until=NULL WHERE id=?").bind(held.id).run();
  const requestId = crypto.randomUUID();
  const recovered = (await runner('claim',{requestId})).message;
  assert.ok(recovered);
  assert.match(recovered.id,/^gmail:recovered:/);
  assert.match(recovered.body,/수정한 예시 기록/);
  assert.deepEqual((await runner('claim',{requestId})).message,recovered);
  assert.ok((await db.prepare('SELECT canceled_at FROM report_mail WHERE id=?').bind(held.id).first()).canceled_at);
  await runner('hold',{id:recovered.id,claim:recovered.claim});
  await db.prepare("UPDATE field_reports SET notes='추가 수정 기록'").bind().run();
  assert.equal((await runner('claim',{requestId:crypto.randomUUID()})).message,null);
});

test('mail portal links preserve every accepted site identifier through the embedded route',()=>{
  for (const id of ["건물(본관)","site!~*'()",'%odd/id?#']) {
    const url = new URL(portalDetailUrl({BONYEON_PORTAL_LINKS:'1'},'site',id,'2026-11-12'));
    const query = url.hash.slice(url.hash.indexOf('?')+1);
    const view = new URLSearchParams(query).get('view');
    assert.match(view,/^control-detail\/site\/[a-zA-Z0-9%_.+@-]+\?month=2026-11$/);
    assert.equal(decodeURIComponent(view.split('/')[2].split('?')[0]),id);
  }
});
