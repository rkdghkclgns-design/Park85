import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

async function fixture({worker=false}={}) {
  const storage=await createPreviewDb();
  let lose=false;
  const DB={prepare(sql){const statement=storage.prepare(sql);if(!sql.includes('INSERT INTO charger_evidence'))return statement;
    return {bind(...args){return {async run(){const result=await statement.bind(...args).run();
      if(lose&&result.meta.changes){lose=false;throw Error('committed response lost');}return result;}};}};}};
  const owner='owner@example.invalid',origin='https://evidence.example.invalid',day='2025-01-02';
  const actor=worker ? 'worker@example.invalid' : owner;
  const stamp=day+'T01:00:00.000Z';
  const env={DB,BONYEON_OWNER_EMAIL:owner,BONYEON_SITE_ORIGIN:origin,BUCKET:{put:async()=>{},get:async()=>({body:'photo'}),delete:async()=>{}}};
  await storage.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date,planned_units) VALUES('site','현장','서울',37,127,'pending',?,'2025-01-02',1)").bind(stamp).run();
  if(worker) {
    await storage.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES(?,?,'작업자','cleaner',1,?)").bind(actor,actor,stamp).run();
    await storage.prepare("INSERT INTO work_plans(site_id,worker_email,start_date,repeat_days,instructions,updated_at) VALUES('site',?,'2025-01-02',30,'',?)").bind(actor,stamp).run();
    const version=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(['2026-11-guidance-1',''])))),byte=>byte.toString(16).padStart(2,'0')).join('');
    await storage.prepare("INSERT INTO work_guidance_receipts(site_id,author_id,assignment_due,version,confirmed_at) VALUES('site',?,'2025-01-02',?,?)").bind(actor,version,stamp).run();
  }
  const photos=[crypto.randomUUID(),crypto.randomUUID()];
  for(let i=0;i<photos.length;i++)await storage.prepare("INSERT INTO work_camera_photos(id,site_id,work_date,asset_code,author_id,slot,created_at) VALUES(?,'site',?,'AUTO-RETRY',?,?,?)")
    .bind(photos[i],day,actor,['exteriorBefore','exteriorAfter'][i],stamp).run();
  async function call(path,method='GET',changes={}) {
    const form=new FormData();for(const [key,value]of Object.entries({siteId:'site',workDate:day,assetCode:'AUTO-RETRY',exterior:'1',safety:'1',
      safetyChecklist:JSON.stringify({access:true,equipment:true,condition:true,power:true}),captureIds:JSON.stringify(photos),...changes}))form.set(key,value);
    const response=await handleApi(new Request(origin+'/api/work/'+path,{method,headers:{Origin:origin,'oai-authenticated-user-id':actor,'oai-authenticated-user-email':actor},...(method==='POST'?{body:form}:{})}),env,handleControl,handleWorkflows);
    return {status:response.status,body:await response.json()};
  }
  return {storage,photos,call,lose(){lose=true;}};
}

test('committed evidence replies recover once and identical HTTP retries return the original evidence',async()=>{
  const h=await fixture();h.lose();
  const first=await h.call('evidence','POST');
  assert.equal(first.status,201);
  const retry=await h.call('evidence','POST');
  assert.equal(retry.status,201);
  assert.equal(retry.body.id,first.body.id);
  assert.equal((await h.storage.prepare('SELECT COUNT(*) AS count FROM charger_evidence').first()).count,1);
  assert.equal((await h.storage.prepare('SELECT COUNT(*) AS count FROM operations_events WHERE kind=\'evidence\'').first()).count,1);
  assert.equal((await h.call('evidence','POST',{faultNote:'다른 내용'})).status,409);
});

test('capture refresh exposes the registered photos for retry without treating them as unlinked drafts',async()=>{
  const h=await fixture();const saved=await h.call('evidence','POST');assert.equal(saved.status,201);
  const data=await h.call('captures?'+new URLSearchParams({siteId:'site',workDate:'2025-01-02',assetCode:'AUTO-RETRY',zoneId:''}));
  assert.equal(data.status,200);assert.deepEqual(data.body.captures,[]);
  assert.equal(data.body.registration.id,saved.body.id);
  assert.deepEqual(data.body.registration.photos.map(row=>row.id).sort(),h.photos.toSorted());
});

test('concurrent identical submissions have one receipt and one evidence record',async()=>{
  const h=await fixture();const responses=await Promise.all([h.call('evidence','POST'),h.call('evidence','POST')]);
  assert.deepEqual(responses.map(row=>row.status),[201,201]);assert.equal(responses[0].body.id,responses[1].body.id);
  assert.equal((await h.storage.prepare('SELECT COUNT(*) AS count FROM charger_evidence').first()).count,1);
});

test('a worker can recover an exact receipt after guidance changes or reassignment without undoing later edits',async()=>{
  const h=await fixture({worker:true});const saved=await h.call('evidence','POST');assert.equal(saved.status,201);
  await h.storage.prepare("UPDATE work_plans SET instructions='변경된 안내' WHERE site_id='site'").bind().run();
  assert.equal((await h.call('evidence','POST')).body.id,saved.body.id);
  await h.storage.prepare("DELETE FROM work_plans WHERE site_id='site'").bind().run();
  await h.storage.prepare("UPDATE charger_evidence SET issue='관리자가 확인한 후속 기록' WHERE id=?").bind(saved.body.id).run();
  assert.equal((await h.call('evidence','POST')).body.id,saved.body.id);
  assert.equal((await h.storage.prepare('SELECT issue FROM charger_evidence WHERE id=?').bind(saved.body.id).first()).issue,'관리자가 확인한 후속 기록');
  assert.equal((await h.call('evidence','POST',{issue:'바뀐 요청'})).status,409);
});
