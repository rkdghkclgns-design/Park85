import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';
import { planOccursInMonth, requireAssignedFloor } from '../server/worker-field.mjs';

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
