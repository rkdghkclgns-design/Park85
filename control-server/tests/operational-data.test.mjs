import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';
import { operationalSql } from '../server/operational-data.mjs';

test('operational reads distinguish SQL identifiers from literals and retain mutation targets',()=>{
  assert.equal(operationalSql("SELECT 'FROM work_sites' AS note FROM work_sites w JOIN field_reports r ON r.site_id=w.id"),
    "SELECT 'FROM work_sites' AS note FROM operational_work_sites w JOIN operational_field_reports r ON r.site_id=w.id");
  assert.equal(operationalSql('DELETE FROM work_plans WHERE site_id IN (SELECT id FROM work_sites)'),
    'DELETE FROM work_plans WHERE site_id IN (SELECT id FROM operational_work_sites AS work_sites)');
  assert.equal(operationalSql('SELECT * FROM settlement_payments WHERE settlement_payments.report_id=?'),
    'SELECT * FROM operational_settlement_payments AS settlement_payments WHERE settlement_payments.report_id=?');
  assert.equal(operationalSql('SELECT * FROM qa_work_sites -- JOIN field_reports\n'),
    'SELECT * FROM qa_work_sites -- JOIN field_reports\n');
});

test('test archive is excluded from maps, daily mail, settlements, analytics and close snapshots while old links survive',async()=>{
  const DB=await createPreviewDb(), origin='https://archive.example.invalid', owner='owner@example.invalid';
  const env={DB,BONYEON_OWNER_EMAIL:owner,BONYEON_SITE_ORIGIN:origin,BUCKET:{get:async()=>({body:new Uint8Array([255,216,255,217])})}};
  const stamp='2025-01-03T00:00:00.000Z', ids={real:crypto.randomUUID(),test:crypto.randomUUID()}, photo=crypto.randomUUID(),evidence=crypto.randomUUID();
  await DB.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES('worker@example.invalid','worker','작업자','cleaner',1,?)").bind(stamp).run();
  for(const key of ['real','test']) {
    await DB.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,due_date,updated_at) VALUES(?,?,'서울',37,127,'done','2025-01-02',?)").bind(key,key,stamp).run();
    await DB.prepare(`INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,units,exterior,interior,notes,status,updated_at,approved_at,contract_price,worker_price,internal_work,internal_units)
      VALUES(?,?,'2025-01-02','owner','관리자',?,'서울',1,1,0,'검증','approved',?,?,100000,0,1,1)`).bind(ids[key],key,key,stamp,stamp).run();
    await DB.prepare("INSERT INTO settlement_payments(report_id,billed,received,paid,billing_ref,note,updated_at,vat,worker_breakdown) VALUES(?,110000,0,0,'계산서','',?,10000,'[]')").bind(ids[key],stamp).run();
  }
  await DB.prepare("INSERT INTO work_camera_photos(id,site_id,work_date,asset_code,author_id,slot,created_at) VALUES(?,'test','2025-01-02','AUTO-TEST','owner','exteriorBefore',?)").bind(photo,stamp).run();
  await DB.prepare("INSERT INTO charger_evidence(id,site_id,work_date,asset_code,author_id,author_name,exterior,interior,safety_checked,issue,created_at) VALUES(?,'test','2025-01-02','LEGACY','owner','관리자',1,0,1,'',?)").bind(evidence,stamp).run();
  await DB.prepare("INSERT INTO report_mail(id,kind,reference,recipient,sender,subject,body,created_at,requested_by) VALUES('old-pending','daily','2025-01-02','owner@example.invalid','owner@example.invalid','예전 검증 집계','원본 보존',?,'owner')").bind(stamp).run();
  await DB.prepare("INSERT INTO report_mail(id,kind,reference,recipient,sender,subject,body,created_at,requested_by) VALUES('old-delay','daily','2025-01-03','owner@example.invalid','owner@example.invalid','다른 날짜 지연 집계','지연 원본',?,'owner')").bind(stamp).run();
  await DB.prepare("INSERT INTO production_test_sites(site_id,reason,archived_at,archived_by) VALUES('test','검증용',?,'owner')").bind(stamp).run();
  assert.ok((await DB.prepare("SELECT hold_at FROM report_mail WHERE id='old-pending'").first()).hold_at);
  assert.equal((await DB.prepare("SELECT body FROM report_mail WHERE id='old-pending'").first()).body,'원본 보존');
  assert.ok((await DB.prepare("SELECT hold_at FROM report_mail WHERE id='old-delay'").first()).hold_at);
  async function call(path,{method='GET',body,worker=false}={}) {
    const response=await handleApi(new Request(origin+'/api/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',
      'oai-authenticated-user-id':worker?'worker':'owner','oai-authenticated-user-email':worker?'worker@example.invalid':owner},body:body?JSON.stringify(body):undefined}),env,handleControl,handleWorkflows);
    return {status:response.status,data:response.headers.get('content-type')?.includes('json')?await response.json():new Uint8Array(await response.arrayBuffer())};
  }
  assert.deepEqual((await call('sites')).data.sites.map(s=>s.id),['real']);
  assert.deepEqual((await call('control/overview?month=2025-01')).data.reports.map(r=>r.id),[ids.real]);
  assert.deepEqual((await call('work/settlement?month=2025-01')).data.rows.map(r=>r.id),[ids.real]);
  for(const [kind,reference] of [['daily','2025-01-02'],['settlement','2025-01']]) {
    const mail=await call('control/mail?'+new URLSearchParams({kind,reference}));
    assert.equal(mail.status,200); assert.ok(!mail.data.text.includes('test (https://'));
    assert.match(mail.data.text,/실작업 1기/);
  }
  const analytics=await call('control/analytics?start=2025-01-01&end=2025-01-31');
  assert.equal(analytics.data.periods[0].units,1);
  const archive=await call('control/test-archive');
  assert.equal(archive.status,200);assert.equal(archive.data.sites.length,1);
  const detail=await call('control/detail?kind=report&id='+ids.test+'&month=2025-01');
  assert.equal(detail.status,200);assert.equal(detail.data.testArchive,true);assert.equal(detail.data.canEditResults,false);
  assert.equal((await call('work/capture?id='+photo)).status,200);
  assert.equal((await call('work/photo?id='+evidence+'&slot=exteriorBefore')).status,200);
  assert.equal((await call('control/test-archive',{worker:true})).status,403);
  assert.equal((await call('work/capture?id='+photo,{worker:true})).status,404);
  assert.equal((await call('work/photo?id='+evidence+'&slot=exteriorBefore',{worker:true})).status,404);
  assert.equal((await call('control/review',{method:'PATCH',body:{id:ids.test,action:'rates'}})).status,409);
  assert.equal((await call('work/settlement/close',{method:'POST',body:{month:'2025-01'}})).status,200);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS count FROM settlement_snapshots').first()).count,1);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS count FROM field_reports').first()).count,2);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS count FROM work_camera_photos').first()).count,1);
});
