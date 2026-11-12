
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';
import { validateProofJpeg } from '../server/camera.mjs';
import { proofJpeg } from './fixtures/photo.mjs';

test('camera proofs reject truncated and marker-only JPEGs while accepting browser photos', async () => {
  class TestError extends Error { constructor(status,message) { super(message); this.status=status; } }
  const file=bytes=>new File([bytes],'photo.jpg',{type:'image/jpeg'});
  assert.deepEqual(await validateProofJpeg(file(proofJpeg),TestError),proofJpeg);
  for (const bytes of [
    new Uint8Array([255,216,255,0,255,217]),
    proofJpeg.slice(0,-4),
    new Uint8Array([...proofJpeg.slice(0,8),...new Uint8Array(400),255,217]),
  ]) await assert.rejects(validateProofJpeg(file(bytes),TestError),error=>error.status===400);
});

test('one assigned device caps invented codes atomically and storage errors preserve retryability', async () => {
  const DB=await createPreviewDb();
  const day=new Date(Date.now()+9*3600_000).toISOString().slice(0,10);
  const origin='https://photo.example.test',worker='worker@photo.invalid';
  const objects=new Map();
  let storageFull=false;
  const env={DB,BONYEON_SITE_ORIGIN:origin,BONYEON_OWNER_EMAIL:'owner@photo.invalid',BUCKET:{
    async put(key,bytes) { if (storageFull) throw new Error('photo_media_limit'); objects.set(key,bytes); },
    async get(key) { return objects.has(key)?{body:objects.get(key)}:null; },
    async delete(key) { objects.delete(key); },
  }};
  await DB.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES (?,?,'작업자','cleaner',1,?)").bind(worker,worker,day).run();
  await DB.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date,planned_units) VALUES ('photo-site','현장','서울',37,127,'pending',?,?,1)").bind(day,day).run();
  await DB.prepare("INSERT INTO work_plans(site_id,worker_email,start_date,repeat_days,instructions,updated_at) VALUES ('photo-site',?,?,30,'',?)").bind(worker,day,day).run();
  async function upload(assetCode,uploadId=crypto.randomUUID(),workDate=day) {
    const form=new FormData();
    for (const [key,value] of Object.entries({siteId:'photo-site',workDate,assetCode,slot:'exteriorBefore',uploadId})) form.set(key,value);
    form.set('photo',new File([proofJpeg],'photo.jpg',{type:'image/jpeg'}));
    return handleApi(new Request(origin+'/api/work/captures',{method:'POST',headers:{Origin:origin,
      'oai-authenticated-user-id':worker,'oai-authenticated-user-email':worker},body:form}),env,handleControl,handleWorkflows);
  }
  const yesterday=new Date(Date.now()+9*3600_000-86400_000).toISOString().slice(0,10);
  assert.equal((await upload('BACKDATED',crypto.randomUUID(),yesterday)).status,409);
  assert.equal(objects.size,0);
  storageFull=true;
  assert.equal((await upload('FIRST')).status,507);
  assert.equal(objects.size,0);
  storageFull=false;
  const repeatedId=crypto.randomUUID();
  const result=await Promise.all([upload('FIRST',repeatedId),upload('SECOND')]);
  assert.deepEqual(result.map(response=>response.status).sort(),[201,409]);
  assert.equal(objects.size,1);
  const saved=(await DB.prepare("SELECT asset_code,upload_id FROM work_camera_photos").first());
  assert.equal((await upload(saved.asset_code,saved.upload_id)).status,200);
  assert.equal((await upload('THIRD')).status,409);
  assert.equal(objects.size,1);
});

test('photo and document capacities leave headroom and roll back partial file inserts', async () => {
  const db=new DatabaseSync(':memory:');
  db.exec(await readFile(new URL('../server/d1-media.sql',import.meta.url),'utf8'));
  db.exec(await readFile(new URL('../server/d1-media-hardening.sql',import.meta.url),'utf8'));
  db.exec(await readFile(new URL('../server/d1-media-capacity.sql',import.meta.url),'utf8'));
  db.exec("INSERT INTO media_files VALUES ('work-captures/first','image/jpeg')");
  db.exec("INSERT INTO media_parts VALUES ('work-captures/first',0,'abc')");
  assert.deepEqual({...db.prepare('SELECT total_bytes,proof_bytes FROM media_storage_usage').get()},{total_bytes:3,proof_bytes:3});
  db.exec("DELETE FROM media_files WHERE key='work-captures/first'");
  assert.equal(db.prepare('SELECT total_bytes FROM media_storage_usage').get().total_bytes,0);
  db.exec("UPDATE media_storage_usage SET total_bytes=349999999,proof_bytes=349999999");
  db.exec("INSERT INTO media_files VALUES ('work-captures/blocked','image/jpeg'),('signup-documents/allowed','application/pdf')");
  assert.throws(()=>db.exec("INSERT INTO media_parts VALUES ('work-captures/blocked',0,'abc')"),/photo_media_limit/);
  db.exec("INSERT INTO media_parts VALUES ('signup-documents/allowed',0,'abc')");
  assert.equal(db.prepare('SELECT proof_bytes FROM media_storage_usage').get().proof_bytes,349999999);
  db.close();
});
