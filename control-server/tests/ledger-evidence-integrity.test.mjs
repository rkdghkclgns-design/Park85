import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile,readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

async function fixture() {
  const DB=await createPreviewDb();
  const owner='owner@ledger.invalid';
  const worker='worker@ledger.invalid';
  const origin='https://ledger.invalid';
  const env={ DB,BONYEON_OWNER_EMAIL:owner,BONYEON_SITE_ORIGIN:origin,
    BUCKET:{ put:async()=>{},get:async()=>null,delete:async()=>{} } };
  await DB.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES (?,?,'테스트 작업자','cleaner',1,'2025-01-01')")
    .bind(worker,worker).run();
  await DB.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES ('admin@ledger.invalid','admin-id','테스트 관리자','admin',1,'2025-01-01')")
    .bind().run();
  async function request(path,method='GET',body,actor=owner,status=200) {
    const form=body instanceof FormData;
    const response=await handleApi(new Request(origin+'/api/'+path,{ method,headers:{ Origin:origin,
      'oai-authenticated-user-id':actor,'oai-authenticated-user-email':actor,
      ...(body&&!form?{'Content-Type':'application/json'}:{}) },body:form?body:body?JSON.stringify(body):undefined }),env,handleControl,handleWorkflows);
    const data=await response.json();
    if (Array.isArray(status)) {
      assert.ok(status.includes(response.status),path+': '+JSON.stringify(data));
      return {...data,status:response.status};
    }
    assert.equal(response.status,status,path+': '+JSON.stringify(data));
    return data;
  }
  async function site(id) {
    await DB.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date,planned_units) VALUES (?,?,'서울',37,127,'pending','2025-01-01','2025-01-01',2)")
      .bind(id,id).run();
    await request('work/plan','PUT',{siteId:id,workerEmail:worker,startDate:'2025-01-01',repeatDays:30,instructions:'검증 안내'});
    const guidance=await request('work/guidance?'+new URLSearchParams({siteId:id}),'GET',undefined,worker);
    await request('work/guidance','PUT',{siteId:id,version:guidance.version,assignmentDue:guidance.assignmentDue,confirmed:true},worker);
  }
  async function captures(siteId,workDate,assetCode) {
    const ids=[];
    for(const slot of ['exteriorBefore','exteriorAfter']) {
      const id=crypto.randomUUID();
      await DB.prepare('INSERT INTO work_camera_photos(id,site_id,work_date,asset_code,author_id,slot,created_at) VALUES (?,?,?,?,?,?,?)')
        .bind(id,siteId,workDate,assetCode,worker,slot,workDate+'T09:00:00.000Z').run();
      ids.push(id);
    }
    return ids;
  }
  async function proof(siteId,workDate,assetCode,status=201) {
    const guidance=await request('work/guidance?'+new URLSearchParams({siteId}),'GET',undefined,worker);
    if (!guidance.confirmedAt) await request('work/guidance','PUT',{siteId,version:guidance.version,
      assignmentDue:guidance.assignmentDue,confirmed:true},worker);
    const ids=await captures(siteId,workDate,assetCode);
    const form=new FormData();
    const fields={siteId,workDate,assetCode,exterior:'1',safety:'1',captureIds:JSON.stringify(ids),
      safetyChecklist:JSON.stringify({access:true,equipment:true,condition:true,power:true})};
    for(const [key,value] of Object.entries(fields))form.set(key,value);
    return request('work/evidence','POST',form,worker,status);
  }
  return {DB,owner,worker,request,site,captures,proof};
}

test('one device cannot be counted twice in either date order before partial progress exists',async()=>{
  const {DB,worker,request,site,proof}=await fixture();
  await site('normal-order');
  await proof('normal-order','2025-01-01','DEVICE-1');
  await proof('normal-order','2025-01-02','DEVICE-1',409);
  await site('reverse-order');
  await proof('reverse-order','2025-01-02','DEVICE-1');
  await proof('reverse-order','2025-01-01','DEVICE-1',409);
  await site('concurrent');
  const statements=await Promise.all([proof('concurrent','2025-01-01','DEVICE-1',[201,409]),proof('concurrent','2025-01-02','DEVICE-1',[201,409])]);
  assert.deepEqual(statements.map(item=>item.status).sort(),[201,409]);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM charger_evidence WHERE site_id=?').bind('concurrent').first()).n,1);
  const counts=await request('work/completion-counts?'+new URLSearchParams({siteId:'normal-order',workDate:'2025-01-01'}),'GET',undefined,worker);
  assert.equal(counts.units,1);
  assert.equal(Boolean(counts.duplicateEvidence),false);
  await proof('normal-order','2025-01-01','DEVICE-2');
  await request('control/report','POST',{siteId:'normal-order',workDate:'2025-01-01',units:2,exterior:2,interior:0},worker);
  const completed=await DB.prepare('SELECT id FROM field_reports WHERE site_id=?').bind('normal-order').first();
  await request('control/review','PATCH',{id:completed.id,action:'approve'});
  await proof('normal-order','2025-01-31','DEVICE-1');
});

test('legacy duplicate evidence is preserved, flagged, and blocked from partial or final settlement counts',async()=>{
  const {DB,worker,request,site}=await fixture();
  await site('legacy-duplicates');
  const asset='SAME-ASSET';
  for(const date of ['2025-01-01','2025-01-02']) {
    await DB.prepare(`INSERT INTO charger_evidence(id,site_id,work_date,asset_code,author_id,author_name,exterior,interior,safety_checked,issue,created_at)
      VALUES (?,'legacy-duplicates',?,? ,?,'테스트 작업자',1,0,1,'',?)`)
      .bind(crypto.randomUUID(),date,asset,worker,date+'T10:00:00.000Z').run();
  }
  const counts=await request('work/completion-counts?'+new URLSearchParams({siteId:'legacy-duplicates',workDate:'2025-01-02'}),'GET',undefined,worker);
  assert.equal(counts.units,1);
  assert.equal(Boolean(counts.duplicateEvidence),true);
  assert.equal(counts.exterior,0);
  await request('control/report','POST',{siteId:'legacy-duplicates',workDate:'2025-01-02',units:1,exterior:1,interior:0,completionMode:'partial'},worker,409);
  await request('control/report','POST',{siteId:'legacy-duplicates',workDate:'2025-01-02',units:2,exterior:2,interior:0,completionMode:'full'},worker,409);
});

test('multi-day evidence before the first partial visit is retained for counts and approval',async()=>{
  const {DB,worker,request,site,proof}=await fixture();
  await site('multi-day');
  await proof('multi-day','2025-01-01','DAY-1');
  const counts=await request('work/completion-counts?'+new URLSearchParams({siteId:'multi-day',workDate:'2025-01-02'}),'GET',undefined,worker);
  assert.equal(counts.units,1);
  await request('control/report','POST',{siteId:'multi-day',workDate:'2025-01-02',units:1,exterior:1,interior:0,completionMode:'partial'},worker);
  assert.equal((await DB.prepare('SELECT first_date FROM work_progress WHERE site_id=?').bind('multi-day').first()).first_date,'2025-01-01');
  await proof('multi-day','2025-01-03','DAY-3');
  await request('control/report','POST',{siteId:'multi-day',workDate:'2025-01-03',units:2,exterior:2,interior:0,completionMode:'full'},worker);
  const completed=await DB.prepare('SELECT id,progress_from FROM field_reports WHERE site_id=?').bind('multi-day').first();
  assert.equal(completed.progress_from,'2025-01-01');
  await request('control/review','PATCH',{id:completed.id,action:'approve'});

  await site('multi-day-full');
  await proof('multi-day-full','2025-01-01','FULL-1');
  await proof('multi-day-full','2025-01-02','FULL-2');
  await request('control/report','POST',{siteId:'multi-day-full',workDate:'2025-01-02',units:2,exterior:2,interior:0},worker);
  const full=await DB.prepare('SELECT id,progress_from FROM field_reports WHERE site_id=?').bind('multi-day-full').first();
  assert.equal(full.progress_from,'2025-01-01');
  await request('control/review','PATCH',{id:full.id,action:'approve'});
});

test('late recurring work cannot reuse approved evidence and keeps the original repeating due dates',async()=>{
  const {DB,worker,request,site,proof}=await fixture();
  await site('overdue-repeat');
  for (const asset of ['LATE-1','LATE-2']) await proof('overdue-repeat','2025-02-15',asset);
  await request('control/report','POST',{siteId:'overdue-repeat',workDate:'2025-02-15',units:2,exterior:2,interior:0},worker);
  const first=await DB.prepare('SELECT id FROM field_reports WHERE site_id=?').bind('overdue-repeat').first();
  await request('control/review','PATCH',{id:first.id,action:'approve'});
  assert.deepEqual({...await DB.prepare('SELECT next_due,evidence_from FROM work_plan_cycles WHERE site_id=?').bind('overdue-repeat').first()},
    {next_due:'2025-01-31',evidence_from:'2025-02-16'});
  const counts=await request('work/completion-counts?siteId=overdue-repeat&workDate=2025-02-16','GET',undefined,worker);
  assert.equal(counts.units,0);
  await request('control/report','POST',{siteId:'overdue-repeat',workDate:'2025-02-16',units:2,exterior:2,interior:0},worker,409);
  await proof('overdue-repeat','2025-02-15','LATE-NEW',409);
  await proof('overdue-repeat','2025-02-16','LATE-1');
  await request('control/report','POST',{siteId:'overdue-repeat',workDate:'2025-02-16',units:1,exterior:1,interior:0,completionMode:'partial'},worker);
  await proof('overdue-repeat','2025-02-16','LATE-2');
  await request('control/report','POST',{siteId:'overdue-repeat',workDate:'2025-02-16',units:2,exterior:2,interior:0},worker);
  const second=await DB.prepare('SELECT id,assignment_due,progress_from FROM field_reports WHERE site_id=? AND work_date=?').bind('overdue-repeat','2025-02-16').first();
  assert.equal(second.assignment_due,'2025-01-31');
  assert.equal(second.progress_from,'2025-02-16');
  await request('control/review','PATCH',{id:second.id,action:'approve'});
  assert.deepEqual({...await DB.prepare('SELECT next_due,evidence_from FROM work_plan_cycles WHERE site_id=?').bind('overdue-repeat').first()},
    {next_due:'2025-03-02',evidence_from:'2025-03-02'});
});

test('legacy author allocations remain usable and confirmed payment ownership cannot be cleared',async()=>{
  const {DB,owner,worker,request}=await fixture();
  const id=crypto.randomUUID();
  await DB.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date) VALUES ('payments','정산 현장','서울',37,127,'done','2025-01-01','2025-01-01')").bind().run();
  await DB.prepare(`INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,units,exterior,interior,notes,status,updated_at,approved_at,contract_price,worker_price)
    VALUES (?,'payments','2025-01-01',?,'테스트 작업자','정산 현장','서울',2,2,1,'','approved','2025-01-01','2025-01-01',20000,10000)`).bind(id,worker).run();
  const body={id,paymentVersion:0,billed:44000,received:0,paid:15000,vat:4000,billingRef:'LEGACY'};
  const ledger=await request('work/settlement?month=2025-01');
  assert.equal(ledger.rows[0].suggestedWorker,true);
  assert.equal(ledger.rows[0].workerBreakdown[0].email,worker);
  await request('work/settlement/payments','PATCH',body);
  const stored=await DB.prepare('SELECT payment_version,worker_breakdown FROM settlement_payments WHERE report_id=?').bind(id).first();
  const allocated=JSON.parse(stored.worker_breakdown);
  assert.equal(allocated[0].email,worker);
  assert.equal(allocated[0].paid,15000);
  await request('work/settlement/payments','PATCH',{...body,paymentVersion:stored.payment_version,workers:[]},owner,409);
  await request('work/settlement/payments','PATCH',{...body,paymentVersion:stored.payment_version,paid:0,workers:[]},owner,409);
  await request('work/settlement/payments','PATCH',{...body,paymentVersion:stored.payment_version,paid:0,workers:[{email:owner,units:2,paid:0,paidDate:''}]},owner,409);
  const after=await DB.prepare('SELECT payment_version,worker_breakdown FROM settlement_payments WHERE report_id=?').bind(id).first();
  assert.deepEqual(after,stored);
});

test('unlinked legacy payments require an explicit worker before a new paid amount is saved',async()=>{
  const {DB,worker,request}=await fixture();
  const id=crypto.randomUUID();
  await DB.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date) VALUES ('unlinked','이전 현장','서울',37,127,'done','2025-01-01','2025-01-01')").bind().run();
  await DB.prepare(`INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,units,exterior,interior,notes,status,updated_at,approved_at,contract_price,worker_price)
    VALUES (?,'unlinked','2025-01-01','unregistered-legacy-author','이전 작업자','이전 현장','서울',2,2,1,'','approved','2025-01-01','2025-01-01',20000,10000)`).bind(id).run();
  await DB.prepare(`INSERT INTO settlement_payments(report_id,billed,received,paid,billing_ref,note,updated_at,vat,worker_breakdown)
    VALUES (?,44000,0,15000,'LEGACY','','2025-01-01',4000,'[]')`).bind(id).run();
  const body={id,paymentVersion:1,billed:44000,received:10000,paid:15000,vat:4000,billingRef:'LEGACY'};
  await request('work/settlement/payments','PATCH',body);
  await request('work/settlement/payments','PATCH',{...body,paymentVersion:2,paid:17000},undefined,409);
  await request('work/settlement/payments','PATCH',{...body,paymentVersion:2,paid:17000,
    workers:[{email:worker,units:2,paid:17000,paidDate:'2025-01-01'}]});
  const stored=await DB.prepare('SELECT paid,worker_breakdown FROM settlement_payments WHERE report_id=?').bind(id).first();
  assert.equal(stored.paid,17000);
  assert.equal(JSON.parse(stored.worker_breakdown)[0].email,worker);
});

test('mixed internal and external work preserves the approved internal count on every payment save',async()=>{
  const {DB,owner,worker,request}=await fixture();
  const id=crypto.randomUUID();
  await DB.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date) VALUES ('mixed','혼합 작업','서울',37,127,'done','2025-01-01','2025-01-01')").bind().run();
  await DB.prepare(`INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,units,exterior,interior,notes,status,updated_at,approved_at,contract_price,worker_price,internal_units)
    VALUES (?,'mixed','2025-01-01',?,'테스트 작업자','혼합 작업','서울',2,2,1,'','approved','2025-01-01','2025-01-01',20000,10000,1)`).bind(id,worker).run();
  const body={id,paymentVersion:0,billed:44000,received:0,paid:7000,vat:4000,billingRef:'MIXED'};
  await request('work/settlement/payments','PATCH',{...body,workers:[{email:worker,units:2,paid:7000,paidDate:'2025-01-01'}]},owner,409);
  await request('work/settlement/payments','PATCH',{...body,workers:[{email:owner,units:1,paid:1000,paidDate:'2025-01-01'},
    {email:worker,units:1,paid:6000,paidDate:'2025-01-01'}]},owner,400);
  await request('work/settlement/payments','PATCH',{...body,workers:[{email:owner,units:1,paid:0,paidDate:''},
    {email:worker,units:1,paid:7000,paidDate:'2025-01-01'}]});
  const stored=await DB.prepare('SELECT payment_version,worker_breakdown FROM settlement_payments WHERE report_id=?').bind(id).first();
  assert.equal(JSON.parse(stored.worker_breakdown).find(row=>row.internal).units,1);
  await request('work/settlement/payments','PATCH',{...body,paymentVersion:1,workers:[]},owner,409);
});

test('zone spelling corrections update open evidence and preserve closed evidence snapshots',async()=>{
  const {DB,worker,request,site}=await fixture();
  await site('zone-history');
  const first=crypto.randomUUID(),second=crypto.randomUUID(),evidence=crypto.randomUUID();
  for(const [id,name] of [[first,'등록 당시 구역'],[second,'이동한 구역']]) await DB.prepare('INSERT INTO work_zones(id,site_id,name,created_at,created_by) VALUES (?,\'zone-history\',?,\'2025-01-01\',?)').bind(id,name,worker).run();
  await DB.prepare(`INSERT INTO charger_evidence(id,site_id,work_date,asset_code,author_id,author_name,exterior,interior,safety_checked,issue,created_at,zone_id)
    VALUES (?,'zone-history','2025-01-01','ZONE-1',?,'테스트 작업자',1,0,1,'','2025-01-01',?)`).bind(evidence,worker,first).run();
  await DB.prepare('UPDATE work_zones SET name=? WHERE id=?').bind('나중에 바뀐 구역',first).run();
  const saved=await DB.prepare('SELECT zone_name_snapshot,zone_snapshot_legacy FROM charger_evidence WHERE id=?').bind(evidence).first();
  assert.equal(saved.zone_name_snapshot,'나중에 바뀐 구역');
  assert.equal(saved.zone_snapshot_legacy,0);
  await DB.prepare('UPDATE charger_evidence SET zone_id=? WHERE id=?').bind(second,evidence).run();
  assert.equal((await DB.prepare('SELECT zone_name_snapshot FROM charger_evidence WHERE id=?').bind(evidence).first()).zone_name_snapshot,'이동한 구역');
  await DB.prepare("INSERT INTO settlement_months(month,closed_at,closed_by) VALUES ('2025-01','2025-02-01','관리자')").bind().run();
  await DB.prepare('UPDATE work_zones SET name=? WHERE id=?').bind('마감 후 다음 작업용 구역',second).run();
  assert.equal((await DB.prepare('SELECT zone_name_snapshot FROM charger_evidence WHERE id=?').bind(evidence).first()).zone_name_snapshot,'이동한 구역');
  const overview=await request('work/overview?month=2025-01','GET',undefined,worker);
  assert.equal(overview.evidence.find(row=>row.id===evidence).zoneName,'이동한 구역');
});

test('closing a report also protects its prior-month zone names',async()=>{
  const {DB,worker,site}=await fixture();
  await site('cross-month-zone');
  const zone=crypto.randomUUID(),evidence=crypto.randomUUID();
  await DB.prepare("INSERT INTO work_zones(id,site_id,name,created_at,created_by) VALUES (?,'cross-month-zone','이전달 구역','2025-01-31',?)").bind(zone,worker).run();
  await DB.prepare(`INSERT INTO charger_evidence(id,site_id,work_date,asset_code,author_id,author_name,exterior,interior,safety_checked,issue,created_at,zone_id)
    VALUES (?,'cross-month-zone','2025-01-31','CROSS-1',?,'작업자',1,0,1,'','2025-01-31',?)`).bind(evidence,worker,zone).run();
  await DB.prepare(`INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,units,exterior,interior,notes,status,updated_at,progress_from)
    VALUES (?,'cross-month-zone','2025-02-01',?,'작업자','현장','서울',1,1,0,'','approved','2025-02-01','2025-01-31')`).bind(crypto.randomUUID(),worker).run();
  await DB.prepare("INSERT INTO settlement_months(month,closed_at,closed_by) VALUES ('2025-02','2025-03-01','관리자')").bind().run();
  await DB.prepare('UPDATE work_zones SET name=? WHERE id=?').bind('다음달에 바뀐 구역',zone).run();
  assert.equal((await DB.prepare('SELECT zone_name_snapshot FROM charger_evidence WHERE id=?').bind(evidence).first()).zone_name_snapshot,'이전달 구역');
});

test('integrity migration keeps existing duplicate records and marks backfilled zone names as legacy',async()=>{
  const database=new DatabaseSync(':memory:');
  const directory=new URL('../drizzle/',import.meta.url);
  const migrations=(await readdir(directory)).filter(name=>name.endsWith('.sql')&&name<'0026_ledger_evidence_integrity.sql').sort();
  for(const name of migrations)database.exec(await readFile(new URL(name,directory),'utf8'));
  database.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date) VALUES ('old','이전 현장','서울',37,127,'done','2025-01-01','2025-01-01')").run();
  database.prepare("INSERT INTO work_zones(id,site_id,name,created_at,created_by) VALUES ('old-zone','old','기존 구역','2025-01-01','worker')").run();
  const insert=database.prepare(`INSERT INTO charger_evidence(id,site_id,work_date,asset_code,author_id,author_name,exterior,interior,safety_checked,issue,created_at,zone_id)
    VALUES (?,'old',?,'OLD-DEVICE','worker','이전 작업자',1,0,1,'','2025-01-01','old-zone')`);
  insert.run('old-evidence-a','2025-01-01');
  insert.run('old-evidence-b','2025-01-02');
  database.prepare("INSERT INTO settlement_months(month,closed_at,closed_by) VALUES ('2025-01','2025-02-01','관리자')").run();
  await database.exec(await readFile(new URL('0026_ledger_evidence_integrity.sql',directory),'utf8'));
  const rows=database.prepare('SELECT id,zone_name_snapshot,zone_snapshot_legacy FROM charger_evidence ORDER BY id').all();
  assert.equal(rows.length,2);
  assert.ok(rows.every(row=>row.zone_name_snapshot==='기존 구역'&&row.zone_snapshot_legacy===1));
  database.prepare("UPDATE work_zones SET name='현재 이름' WHERE id='old-zone'").run();
  assert.equal(database.prepare("SELECT zone_name_snapshot FROM charger_evidence WHERE id='old-evidence-a'").get().zone_name_snapshot,'기존 구역');
  database.close();
});
