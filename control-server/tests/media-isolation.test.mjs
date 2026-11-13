import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { d1MediaStore } from '../server/d1-media.mjs';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';
import { proofJpeg } from './fixtures/photo.mjs';

async function fixture() {
  const sqlite=new DatabaseSync(':memory:');
  for (const file of ['d1-media.sql','d1-media-hardening.sql','d1-media-capacity.sql','d1-media-isolation.sql']) {
    sqlite.exec(await readFile(new URL('../server/'+file,import.meta.url),'utf8'));
  }
  const db={prepare(sql) {
    const statement=sqlite.prepare(sql);
    return {bind(...args) { return {sql,args,first:async()=>statement.get(...args)??null,
      run:async()=>({meta:{changes:Number(statement.run(...args).changes)}})};},
      first:async()=>statement.get()??null};
  },async batch(statements) {
    sqlite.exec('BEGIN');
    try {
      const results=statements.map(({sql,args=[]})=>{
        const statement=sqlite.prepare(sql);
        return /^\s*SELECT/i.test(sql)?{results:statement.all(...args)}:{meta:{changes:Number(statement.run(...args).changes)}};
      });
      sqlite.exec('COMMIT');return results;
    } catch(error) {sqlite.exec('ROLLBACK');throw error;}
  }};
  return {sqlite,store:d1MediaStore(db)};
}
const options=(owner='worker-a',site='site-a')=>({httpMetadata:{contentType:'image/jpeg'},
  customMetadata:{proofOwner:owner,proofSite:site}});
const bytes=new Uint8Array([1,2,3,4,5,6]); // Eight stored base64 bytes.

test('one photo owner cannot consume the shared budget and another assigned owner can still upload',async()=>{
  const {sqlite,store}=await fixture();
  await store.put('work-captures/first',bytes,options());
  sqlite.prepare("UPDATE media_proof_usage SET stored_bytes=69999992 WHERE kind='owner' AND scope_id='production:worker-a'").run();
  await store.put('work-captures/last',bytes,options());
  await assert.rejects(store.put('work-captures/blocked',bytes,options()),/photo_owner_limit/);
  assert.equal(await store.head('work-captures/blocked'),null);
  await store.put('work-captures/other',bytes,options('worker-b','site-b'));
  assert.ok(await store.head('work-captures/other'));
  const usage=await store.proofUsage({ownerId:'worker-a',siteId:'site-a'});
  assert.equal(usage.owner.used,70000000);assert.equal(usage.owner.remaining,0);
  assert.ok(usage.global.remaining>0);
  sqlite.close();
});

test('site budgets span owners, simultaneous reservations are atomic, and retries preserve existing media',async()=>{
  const {sqlite,store}=await fixture();
  await store.put('work-captures/first',bytes,options());
  sqlite.prepare("UPDATE media_proof_usage SET stored_bytes=139999992 WHERE kind='site' AND scope_id='production:site-a'").run();
  const results=await Promise.allSettled([
    store.put('work-captures/concurrent-a',bytes,options('worker-b')),
    store.put('work-captures/concurrent-b',bytes,options('worker-c')),
  ]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.match(String(results.find(r=>r.status==='rejected').reason),/photo_site_limit/);
  const original=await store.get('work-captures/first');
  assert.deepEqual(new Uint8Array(await new Response(original.body).arrayBuffer()),bytes);
  await assert.rejects(store.put('work-captures/first',new Uint8Array(9),options()),/photo_site_limit/);
  const retained=await store.get('work-captures/first');
  assert.deepEqual(new Uint8Array(await new Response(retained.body).arrayBuffer()),bytes);
  sqlite.close();
});

test('removal and legacy backfill maintain exact counters without rewriting photo bytes',async()=>{
  const {sqlite,store}=await fixture();
  sqlite.prepare("INSERT INTO media_files VALUES ('work-captures/legacy','image/jpeg')").run();
  sqlite.prepare("INSERT INTO media_parts VALUES ('work-captures/legacy',0,'AQIDBAUG')").run();
  sqlite.prepare("INSERT INTO media_proof_scopes VALUES ('work-captures/legacy','production:worker-a','production:site-a')").run();
  assert.equal((await store.proofUsage({ownerId:'worker-a',siteId:'site-a'})).owner.used,8);
  await store.put('work-captures/new',bytes,options());
  await store.delete('work-captures/new');
  assert.equal((await store.proofUsage({ownerId:'worker-a',siteId:'site-a'})).owner.used,8);
  await store.delete('work-captures/legacy');
  assert.equal((await store.proofUsage({ownerId:'worker-a',siteId:'site-a'})).owner.used,0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM media_proof_scopes').get().n,0);
  sqlite.close();
});

test('capture scope is required and verification usage cannot be attributed to a production identity',async()=>{
  const {sqlite,store}=await fixture();
  await assert.rejects(store.put('work-captures/unscoped',bytes),/photo_scope_required/);
  await assert.rejects(store.put('verification/work-evidence/unscoped/exteriorBefore',bytes),/photo_scope_required/);
  await store.put('work-captures/prod',bytes,options());
  await store.put('verification/work-captures/qa',bytes,options());
  assert.equal((await store.proofUsage({ownerId:'worker-a',siteId:'site-a'})).owner.used,8);
  assert.equal((await store.proofUsage({ownerId:'worker-a',siteId:'site-a',verification:true})).owner.used,8);
  await store.put('verification/work-evidence/qa/exteriorBefore',bytes,options());
  assert.equal((await store.proofUsage({ownerId:'worker-a',siteId:'site-a',verification:true})).owner.used,16);
  await store.put('report-archives/report',bytes);
  await store.put('signup-documents/form',bytes);
  assert.equal((await store.proofUsage({ownerId:'worker-a',siteId:'site-a'})).owner.used,8);
  sqlite.close();
});

test('the capture API derives quotas from the signed-in worker and keeps rejected photos retryable',async()=>{
  const {sqlite,store}=await fixture(),DB=await createPreviewDb();
  const origin='https://quota.example.invalid';
  const day=new Date(Date.now()+9*3600_000).toISOString().slice(0,10);
  const env={DB,BUCKET:store,BONYEON_SITE_ORIGIN:origin,BONYEON_OWNER_EMAIL:'owner@example.invalid'};
  for(const actor of ['a','b']) {
    await DB.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES(?,?,?,'cleaner',1,?)")
      .bind(actor+'@example.invalid','worker-'+actor,actor,day).run();
    await DB.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date,planned_units) VALUES(?,?,'서울',37,127,'pending',?,?,1)")
      .bind('site-'+actor,actor,day,day).run();
    await DB.prepare("INSERT INTO work_plans(site_id,worker_email,start_date,repeat_days,instructions,updated_at) VALUES(?,?,?,30,'',?)")
      .bind('site-'+actor,actor+'@example.invalid',day,day).run();
  }
  const photo=(uploadId)=>{
    const form=new FormData();
    for(const [key,value] of Object.entries({siteId:'site-a',workDate:day,assetCode:'ONE',slot:'exteriorBefore',uploadId,
      proofOwner:'worker-b',proofSite:'site-b'}))form.set(key,value);
    form.set('photo',new File([proofJpeg],'camera.jpg',{type:'image/jpeg'}));return form;
  };
  async function call(path,actor='a',body) {
    return handleApi(new Request(origin+'/api/work/'+path,{method:body?'POST':'GET',headers:{Origin:origin,
      'oai-authenticated-user-id':'worker-'+actor,'oai-authenticated-user-email':actor+'@example.invalid'},...(body?{body}:{})}),
      env,handleControl,handleWorkflows);
  }
  const firstId=crypto.randomUUID();
  const first=await call('captures','a',photo(firstId));assert.equal(first.status,201);
  const saved=await first.json();
  assert.equal(sqlite.prepare('SELECT owner_id FROM media_proof_scopes WHERE key=?').get('work-captures/'+saved.id).owner_id,'production:worker-a');
  sqlite.prepare("UPDATE media_proof_usage SET stored_bytes=70000000 WHERE kind='owner' AND scope_id='production:worker-a'").run();
  const pendingId=crypto.randomUUID();
  const blocked=await call('captures','a',photo(pendingId));assert.equal(blocked.status,507);
  assert.match((await blocked.json()).error,/기기에 보관/);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM work_camera_photos').first()).n,1);
  const fields=new URLSearchParams({siteId:'site-a',workDate:day,assetCode:'ONE'});
  const usage=await (await call('captures?'+fields)).json();assert.equal(usage.storage.owner.remaining,0);
  assert.equal((await call('captures?'+fields,'b')).status,404);
  // The same upload ID can be sent after capacity becomes available; the original is unchanged.
  sqlite.prepare("UPDATE media_proof_usage SET stored_bytes=0 WHERE kind='owner' AND scope_id='production:worker-a'").run();
  const retried=await call('captures','a',photo(pendingId));assert.equal(retried.status,201);
  assert.equal((await call('captures','a',photo(firstId))).status,200);
  const original=await store.get('work-captures/'+saved.id);
  assert.deepEqual(new Uint8Array(await new Response(original.body).arrayBuffer()),proofJpeg);
  sqlite.close();
});
