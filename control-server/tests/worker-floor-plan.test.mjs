import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';
import { planOccursInMonth, requireAssignedFloor, workerMonthMap } from '../server/worker-field.mjs';
import { proofJpeg } from './fixtures/photo.mjs';

test('month map scopes floors and recurring work to the assigned cleaner', async () => {
  const DB = await createPreviewDb();
  const owner='owner@example.invalid', worker='worker@example.invalid', other='other@example.invalid';
  const origin='https://field.example.invalid';
  const env={DB,BUCKET:{},BONYEON_OWNER_EMAIL:owner,BONYEON_SITE_ORIGIN:origin};
  async function call(path,{method='GET',body,email=owner,status=200}={}) {
    const form=body instanceof FormData;
    const r=await handleApi(new Request(origin+'/api/'+path,{method,headers:{
      Origin:origin,...(form?{}:{'Content-Type':'application/json'}),'oai-authenticated-user-email':email,'oai-authenticated-user-id':email,
    },body:form?body:body?JSON.stringify(body):undefined}),env,handleControl,handleWorkflows);
    const result=await r.json();
    assert.equal(r.status,status,path+': '+JSON.stringify(result));
    return result;
  }
  for (const email of [worker,other]) await call('users',{method:'POST',body:{email,name:email,role:'cleaner',active:true},status:201});
  await call('sites/import',{method:'POST',body:{rows:['own','other'].map(id=>({id,name:id,address:'검증 주소',lat:37.5,lng:127,status:'pending',plannedUnits:3}))}});
  const current = new Date(Date.now()+9*3600_000).toISOString().slice(0,10);
  const month = current.slice(0,7);
  for (const [siteId,workerEmail] of [['own',worker],['other',other]]) {
    await call('work/plan',{method:'PUT',body:{siteId,workerEmail,startDate:current,repeatDays:30,instructions:'관리실 방문'}});
  }
  const floor={siteId:'own',name:'지하 1층',units:2,chargerType:'fast',housing:'enclosure',canopy:'excluded',scope:'both',repair:true};
  const {zone}=await call('work/floor-plan',{method:'PUT',body:floor});
  await call('work/floor-plan',{method:'PUT',body:{...floor,name:'지상',units:2},status:409});
  await call('work/floor-plan',{method:'PUT',body:{...floor,zoneId:zone.id,name:'지하 1층 배정'},email:worker,status:403});
  await call('work/zones',{method:'DELETE',body:{siteId:'own',zoneId:zone.id},email:worker,status:403});
  await call('work/site-quantity',{method:'PATCH',body:{siteId:'own',plannedUnits:1},status:409});
  await call('sites/import',{method:'POST',status:409,body:{rows:[
    {id:'other',name:'변경 시도',lat:37.5,lng:127,status:'pending'},
    {id:'own',name:'변경 시도',lat:37.5,lng:127,status:'pending',plannedUnits:1},
  ]}});
  assert.equal((await DB.prepare("SELECT name FROM work_sites WHERE id='other'").first()).name,'other');
  const result=await call('work/map?month='+month,{email:worker});
  assert.deepEqual(result.sites.map(s=>s.id),['own']);
  assert.equal(result.sites[0].status,'pending');
  assert.deepEqual(result.sites[0].floors,[{id:zone.id,name:floor.name,units:2,chargerType:'fast',housing:'enclosure',canopy:'excluded',scope:'both',repair:1}]);
  assert.equal((await call('work/overview',{email:worker})).sites[0].floors[0].id,zone.id);
  const street=(await call('work/floor-plan',{method:'PUT',body:{
    ...floor,name:'지상',units:1,chargerType:'slow',scope:'exterior',
  }})).zone;
  const attempt={siteId:'own',zoneId:null,chargerType:'fast',canopy:'excluded',exterior:true,interior:true};
  class TestHttpError extends Error {
    constructor(status,message) { super(message); this.status=status; }
  }
  await assert.rejects(requireAssignedFloor(DB,attempt,TestHttpError),{status:409,message:/모든 설비가 층별로 배정/});
  await requireAssignedFloor(DB,{...attempt,zoneId:zone.id},TestHttpError);
  async function proof(asset,type,zoneId,interior) {
    const id=crypto.randomUUID();
    await DB.prepare(`INSERT INTO charger_evidence(id,site_id,work_date,asset_code,author_id,author_name,
      exterior,interior,safety_checked,issue,created_at,charger_type,canopy,zone_id)
      VALUES(?,'own',?,?,?,'작업자',1,?,1,'',?,?, 'excluded',?)`)
      .bind(id,current,asset,worker,interior,current+'T00:00:00Z',type,zoneId).run();
    return id;
  }
  await proof('ZONE-STREET','slow',street.id,0);
  const slow=await proof('UNASSIGNED-SLOW','slow',null,0);
  const fast=await proof('UNASSIGNED-FAST','fast',null,1);
  const move=(id,zoneId,status)=>call('work/evidence/zones',{method:'PATCH',body:{zoneId,moves:[{id,fromZoneId:null}]},status});
  await move(slow,street.id,409);
  await move(slow,zone.id,409);
  await move(fast,zone.id,200);
  assert.equal((await DB.prepare('SELECT zone_id FROM charger_evidence WHERE id=?').bind(slow).first()).zone_id,null);
  assert.equal((await DB.prepare('SELECT zone_id FROM charger_evidence WHERE id=?').bind(fast).first()).zone_id,zone.id);
  await call('work/site-quantity',{method:'PATCH',body:{siteId:'own',plannedUnits:4}});
  const general=(await call('work/zones',{method:'POST',body:{siteId:'own',name:'기타 구역'}})).zone;
  await move(slow,general.id,200);
  await call('work/evidence/zones',{method:'PATCH',body:{zoneId:general.id,moves:[{id:fast,fromZoneId:zone.id}]},status:409});
  assert.equal((await DB.prepare('SELECT zone_id FROM charger_evidence WHERE id=?').bind(fast).first()).zone_id,zone.id);
  const pending=[];
  for (const slot of ['exteriorBefore','exteriorAfter']) {
    const id=crypto.randomUUID();
    await DB.prepare(`INSERT INTO work_camera_photos(id,site_id,work_date,asset_code,zone_id,author_id,slot,created_at)
      VALUES(?,'own',?,'EXCESS',?,?,?,?)`).bind(id,current,general.id,owner,slot,current+'T00:00:00Z').run();
    pending.push(id);
  }
  const payload=new FormData();
  for (const [name,value] of Object.entries({siteId:'own',workDate:current,assetCode:'EXCESS',zoneId:general.id,
    exterior:'1',safety:'1',chargerType:'slow',canopy:'excluded',captureIds:JSON.stringify(pending)})) payload.set(name,value);
  await call('work/evidence',{method:'POST',body:payload,status:409});
  assert.equal((await DB.prepare("SELECT COUNT(*) AS n FROM work_camera_photos WHERE asset_code='EXCESS' AND evidence_id IS NULL").first()).n,2);
  await call('work/map?month=2026-99',{email:worker,status:400});
  await call('work/map?month='+month,{status:403});
  const history='2025-12-31';
  await DB.prepare(`INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,units,exterior,interior,notes,status,updated_at)
    VALUES('historical','own',?,?,'작업자','own','검증 주소',1,1,0,'개인 작업 메모','approved',?)`)
    .bind(history,worker,history+'T00:00:00Z').run();
  const prior=(await call('work/map?month=2025-12',{email:worker})).sites;
  assert.deepEqual(prior.map(s=>[s.id,s.status,s.completedDate]),[['own','done',history]]);
  assert.equal(prior[0].notes,undefined);
  assert.equal((await call('work/map?month=2025-12',{email:other})).sites.length,0);
});

test('map recurrence crosses years and only projects future months', () => {
  assert.equal(planOccursInMonth('2026-12-18',30,'2027-01','2026-12-20'),'2027-01-17');
  assert.equal(planOccursInMonth('2026-12-18',30,'2026-12','2026-12-20'),'2026-12-18');
  assert.equal(planOccursInMonth('2026-09-18',30,'2026-11','2026-12-20'),'');
  assert.equal(planOccursInMonth('2027-03-01',30,'2027-02','2026-12-20'),'');
});

test('current map retains overdue visits and approval history while respecting assignment privacy',async()=>{
  const db=await createPreviewDb();
  const worker={id:'cleaner-id',email:'cleaner@example.invalid',name:'작업자'};
  const owner={...worker,id:'prior-id',email:'prior@example.invalid'};
  for (const person of [worker,owner]) {
    await db.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES (?,?,?,'cleaner',1,'2026-01-01')")
      .bind(person.email,person.id,person.name).run();
  }
  for (const [site,due] of [['overdue','2026-10-31'],['pending-review','2026-11-16'],['multiple','2026-11-01']]) {
    await db.prepare("INSERT INTO work_sites(id,name,address,status,lat,lng,updated_at,due_date) VALUES (?,?,'주소','pending',37,127,?,?)")
      .bind(site,site,due,due).run();
    await db.prepare("INSERT INTO work_plans(site_id,worker_email,start_date,repeat_days,instructions,updated_at) VALUES (?,?,?,21,'',?)")
      .bind(site,worker.email,due,due).run();
  }
  for (const [site,due,status,author] of [['pending-review','2026-11-16','submitted',owner],['multiple','2026-11-01','approved',worker]]) {
    await db.prepare(`INSERT INTO field_reports(id,site_id,work_date,assignment_due,author_id,author_name,site_name,site_address,units,exterior,interior,notes,status,updated_at)
      VALUES (?,?,?,?,?,?,?,'주소',1,1,0,'비공개 메모',?,?)`).bind(site,site,due,due,author.id,author.name,site,status,due).run();
  }
  const visits=await workerMonthMap(db,worker,'2026-11','2026-11-19');
  assert.deepEqual(visits.map(row=>[row.visitId,row.status,row.delayDays,row.carriedOver,row.reportId]),[
    ['overdue:2026-10-31','delayed',19,true,null],
    ['multiple:2026-11-01','done',0,false,'multiple'],
    ['pending-review:2026-11-16','review',0,false,null],
    ['multiple:2026-11-22','pending',0,false,null],
  ]);
  assert.ok(visits.every(row=>row.notes===undefined));
});

test('retains original photos and pays each actual contributor after a same-cycle handover',async()=>{
  const DB=await createPreviewDb();
  const owner='owner@example.invalid',first='first@example.invalid',next='next@example.invalid';
  const origin='https://handoff.example.invalid';
  const files=new Map();
  const env={DB,BONYEON_OWNER_EMAIL:owner,BONYEON_SITE_ORIGIN:origin,
    BUCKET:{put:async(key,bytes)=>files.set(key,bytes),get:async key=>files.has(key)?{body:files.get(key)}:null,delete:async key=>files.delete(key)}};
  async function call(path,options={}) {
    const {method='GET',body,email=owner,status=200}=options;
    const form=body instanceof FormData;
    const r=await handleApi(new Request(origin+'/api/'+path,{method,headers:{
      Origin:origin,...(form?{}:{'Content-Type':'application/json'}),'oai-authenticated-user-email':email,'oai-authenticated-user-id':email,
    },body:form?body:body?JSON.stringify(body):undefined}),env,handleControl,handleWorkflows);
    assert.equal(r.status,status,path+': '+await r.clone().text().then(value=>value.slice(0,300)));
    return r.headers.get('Content-Type')?.includes('json')?r.json():r;
  }
  const write=(path,body,options={})=>call(path,{method:'PUT',body,...options});
  for (const email of [first,next]) await call('users',{method:'POST',body:{email,name:email,role:'cleaner',active:true},status:201});
  const siteId='handover',startDate='2025-02-28',workDate='2025-03-01';
  await call('sites/import',{method:'POST',body:{rows:[{id:siteId,name:siteId,address:'검증 주소',lat:37.5,lng:127,status:'pending',plannedUnits:2}]}});
  await call('control/site',{method:'PATCH',body:{siteId,region:'서울특별시',contractorEmails:[]}});
  await call('charger-regions/price',{method:'PATCH',body:{region:'서울특별시',kind:'worker',price:9000,previousPrice:null}});
  const plan={siteId,workerEmail:first,startDate,repeatDays:30,instructions:''};
  await write('work/plan',plan);
  const floor={siteId,name:'지하 1층',units:1,chargerType:'slow',housing:'standalone',canopy:'excluded',scope:'exterior',repair:false};
  const removed=(await write('work/floor-plan',{...floor,name:'삭제할 구역'})).zone;
  await call('work/zones',{method:'DELETE',body:{siteId,zoneId:removed.id}});
  const a=(await write('work/floor-plan',floor)).zone;
  const b=(await write('work/floor-plan',{...floor,name:'지하 2층',scope:'both'})).zone;
  await call('work/zones',{method:'POST',body:{siteId,name:'삭제할 구역'},status:409});
  await write('work/floor-plan',{...floor,name:'삭제할 구역'},{status:409});
  async function confirm(email) {
    const g=await call('work/guidance?siteId='+siteId,{email});
    await write('work/guidance',{siteId,version:g.version,assignmentDue:g.assignmentDue,confirmed:true},{email});
  }
  const payload=(fields)=>{ const data=new FormData();for(const [key,value] of Object.entries(fields))data.set(key,value);return data; };
  const image=new Blob([proofJpeg],{type:'image/jpeg'});
  async function take(fields,slot,email,status=201) {
    return call('work/captures',{method:'POST',body:payload({...fields,slot,photo:image,uploadId:crypto.randomUUID()}),email,status});
  }
  const aFields={siteId,workDate:startDate,assetCode:'FIRST',zoneId:a.id};
  const bFields={siteId,workDate,assetCode:'SECOND',zoneId:b.id};
  const checks={access:true,equipment:true,condition:true,power:true};
  async function save(fields,interior,checklist,photos,email,status=201) {
    const body=payload({...fields,exterior:'1',interior:interior?'1':'0',safety:'1',chargerType:'slow',canopy:'excluded',
      captureIds:JSON.stringify(photos.map(photo=>photo.id)),safetyChecklist:JSON.stringify(checklist)});
    return call('work/evidence',{method:'POST',body,email,status});
  }
  await confirm(first);
  const aPhotos=[await take(aFields,'exteriorBefore',first)];
  await take({...aFields,assetCode:'EXCESS'},'exteriorBefore',first,409);
  aPhotos.push(await take(aFields,'exteriorAfter',first));
  const aProof=await save(aFields,false,checks,aPhotos,first);
  await call('work/plan',{method:'DELETE',body:{siteId},status:409});
  await write('work/floor-plan',{...floor,zoneId:a.id,scope:'internal'},{status:400});
  await write('work/floor-plan',{...floor,zoneId:a.id,scope:'interior'},{status:409});
  await write('work/plan',{...plan,workerEmail:next,startDate:workDate},{status:409});
  await write('work/plan',{...plan,workerEmail:next});
  assert.equal((await call('work/overview',{email:next})).sites[0].latestEvidenceDate,startDate);
  await call('work/capture?id='+aPhotos[0].id,{email:next,status:404});
  const stored=await call('work/capture?id='+aPhotos[0].id,{email:first});
  assert.deepEqual(new Uint8Array(await stored.arrayBuffer()),proofJpeg);
  await confirm(next);
  const bPhotos=[];
  for (const slot of ['exteriorBefore','interiorBefore','exteriorAfter','interiorAfter']) bPhotos.push(await take(bFields,slot,next));
  await save(bFields,true,checks,bPhotos,next,400);
  const bProof=await save(bFields,true,{...checks,isolation:true},bPhotos,next);
  const counts='work/completion-counts?'+new URLSearchParams({siteId,workDate});
  assert.equal((await call(counts,{email:next})).units,2);
  assert.equal((await call(counts,{email:next})).floorReady,1);
  const reportBody={siteId,workDate,units:2,exterior:2,interior:1,notes:'보고 작성자 메모'};
  const submit=status=>call('control/report',{method:'POST',body:reportBody,email:next,status});
  // Preserve the original records while exercising a mismatch already present in legacy data.
  await DB.prepare("UPDATE work_zones SET charger_type='fast' WHERE id=?").bind(b.id).run();
  assert.equal((await call(counts,{email:next})).floorReady,0);
  await submit(409);
  await DB.prepare("UPDATE work_zones SET charger_type='slow' WHERE id=?").bind(b.id).run();
  await submit(200);
  const report=await DB.prepare('SELECT id FROM field_reports WHERE site_id=?').bind(siteId).first();
  await call('work/site-quantity',{method:'PATCH',body:{siteId,plannedUnits:3},status:409});
  await call('control/review',{method:'PATCH',body:{id:report.id,action:'revise',note:'보완 확인',evidenceId:bProof.id,photoId:bPhotos[0].id}});
  await write('work/plan',plan);
  const active=await call('work/overview',{email:first});
  assert.deepEqual(active.sites[0].revision,{workDate,note:'보완 확인',target:'지하 2층 · SECOND · 외함 작업 전'});
  await call('work/capture?id='+bPhotos[0].id,{email:first,status:404});
  assert.equal((await call('work/overview',{email:next})).sites.length,0);
  await submit(409);
  await call('control/report',{method:'POST',body:reportBody,email:first});
  const approve=status=>call('control/review',{method:'PATCH',body:{id:report.id,action:'approve'},status});
  await DB.prepare("UPDATE work_zones SET canopy_scope='included' WHERE id=?").bind(b.id).run();
  await approve(409);
  await DB.prepare("UPDATE work_zones SET canopy_scope='excluded' WHERE id=?").bind(b.id).run();
  await approve(200);
  assert.deepEqual((await DB.prepare('SELECT id,author_id AS author FROM charger_evidence ORDER BY work_date').all()).results.map(row=>[row.id,row.author]),
    [[aProof.id,first],[bProof.id,next]]);
  await write('work/plan',{...plan,workerEmail:next});
  for (const email of [first,next]) assert.equal((await call('control/overview?month=2025-03',{email})).earnings.approved,'9000');
  const detail=await call('control/detail?'+new URLSearchParams({kind:'report',id:report.id,month:'2025-03'}),{email:first});
  assert.equal(detail.reports[0].units,1);
  assert.equal(detail.reports[0].authorId,first);
  assert.equal(detail.reports[0].notes,'');
  assert.deepEqual(detail.devices.map(device=>device.id),[aProof.id]);
  assert.equal((await call('control/detail?kind=site&id='+siteId+'&month=2025-03',{email:first})).reports[0].units,1);
  assert.equal((await call('control/detail?'+new URLSearchParams({kind:'worker',id:first,month:'2025-03'}),{email:first})).reports[0].units,1);
  assert.equal((await DB.prepare('SELECT author_id FROM field_reports WHERE id=?').bind(report.id).first()).author_id,next);
  const {rows:[row]}=await call('work/settlement?month=2025-03');
  assert.equal(row.handedOver,true);
  assert.deepEqual(row.workerBreakdown,[]);
  await call('work/settlement/payments',{method:'PATCH',body:{id:report.id,paymentVersion:0,billed:20000,received:0,paid:9000},status:409});
  assert.equal(files.size,6);
});

test('building quantity cannot be reduced below active general or assigned floor evidence',async()=>{
  const db=await createPreviewDb();
  await db.prepare("INSERT INTO work_sites(id,name,address,status,lat,lng,updated_at,due_date,planned_units) VALUES ('quantity','quantity','주소','pending',37,127,'2025-01-01','2025-01-01',2)").bind().run();
  const email='owner@example.invalid',origin='https://quantity.example.invalid';
  const env={DB:db,BONYEON_OWNER_EMAIL:email,BONYEON_SITE_ORIGIN:origin};
  async function write(path,method,body,expected=200) {
    const r=await handleApi(new Request(origin+'/api/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',
      'oai-authenticated-user-email':email,'oai-authenticated-user-id':email},body:JSON.stringify(body)}),env,handleControl,handleWorkflows);
    assert.equal(r.status,expected,await r.text());
  }
  await write('work/plan','PUT',{siteId:'quantity',workerEmail:email,startDate:'2025-01-01',repeatDays:30});
  for (const code of ['A','B']) {
    await db.prepare(`INSERT INTO charger_evidence(id,site_id,work_date,asset_code,author_id,author_name,exterior,interior,safety_checked,issue,created_at)
      VALUES (?,'quantity','2025-01-01',?,?,'작업자',1,0,1,'','2025-01-01')`).bind(crypto.randomUUID(),code,email).run();
  }
  await write('work/site-quantity','PATCH',{siteId:'quantity',plannedUnits:1},409);
  const row={name:'검증',address:'주소',lat:37,lng:127,status:'pending'};
  await write('sites/import','POST',{rows:[{...row,id:'untouched'},{...row,id:'quantity',plannedUnits:1}]},409);
  assert.equal((await db.prepare("SELECT planned_units FROM work_sites WHERE id='quantity'").bind().first()).planned_units,2);
  assert.equal(await db.prepare("SELECT id FROM work_sites WHERE id='untouched'").bind().first(),null);
});
