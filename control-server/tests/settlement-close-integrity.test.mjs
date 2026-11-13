import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

async function fixture() {
  const DB = await createPreviewDb();
  const origin = 'https://close.example.invalid';
  const owner = 'owner@example.invalid';
  const worker = 'worker@example.invalid';
  const id = crypto.randomUUID();
  const stamp = '2025-01-02T01:00:00.000Z';
  const env = { DB, BONYEON_OWNER_EMAIL: owner, BONYEON_SITE_ORIGIN: origin };
  await DB.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES(?,?,'실작업자','cleaner',1,?)").bind(worker,worker,stamp).run();
  await DB.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,updated_at,due_date) VALUES('site','현장','서울',37,127,'done',?,'2025-01-02')").bind(stamp).run();
  await DB.prepare(`INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,
    units,exterior,interior,notes,status,updated_at,approved_at,contract_price,worker_price)
    VALUES(?,'site','2025-01-02',?,'실작업자','현장','서울',1,1,0,'','approved',?,?,100000,10000)`)
    .bind(id,worker,stamp,stamp).run();
  async function call(path, body) {
    const response = await handleApi(new Request(origin+'/api/work/settlement/'+path, {
      method: path==='close' ? 'POST' : 'PATCH',
      headers: { Origin: origin,'Content-Type':'application/json','oai-authenticated-user-id':'owner','oai-authenticated-user-email':owner },
      body:JSON.stringify(body),
    }),env,handleControl,handleWorkflows);
    return { status:response.status,body:await response.json() };
  }
  const pay = (changes={}) => call('payments',{id,billed:110000,vat:10000,received:0,paid:0,paymentVersion:0,
    workers:[{email:worker,units:1,paid:0,paidDate:''}],...changes});
  return {DB,id,worker,pay,close:()=>call('close',{month:'2025-01'})};
}

test('month close requires explicit amounts, VAT and actual allocations while allowing unpaid balances',async()=>{
  const h=await fixture();
  assert.equal((await h.close()).status,409);
  assert.equal((await h.pay({vat:null,workers:[]})).status,200);
  assert.equal((await h.close()).status,409);
  assert.equal((await h.pay({paymentVersion:1,vat:10000,workers:[]})).status,200);
  assert.equal((await h.close()).status,409);
  assert.equal((await h.pay({paymentVersion:2})).status,200);
  assert.equal((await h.close()).status,200,'unpaid work may close after its allocation and amounts are confirmed');
  const frozen=await h.DB.prepare('SELECT data FROM settlement_snapshots WHERE report_id=?').bind(h.id).first();
  assert.equal(JSON.parse(frozen.data).billed,110000);
  assert.equal((await h.pay({paymentVersion:3,billed:120000,changeReason:'청구 변경'})).status,409);
  assert.equal((await h.pay({paymentVersion:3,received:110000,paid:10000,changeReason:'후속 입금·지급',
    workers:[{email:h.worker,units:1,paid:10000,paidDate:'2025-01-03'}]})).status,200);
  assert.deepEqual(await h.DB.prepare('SELECT data FROM settlement_snapshots WHERE report_id=?').bind(h.id).first(),frozen);
});

test('positive worker payments need a payment date before month close',async()=>{
  const h=await fixture();
  assert.equal((await h.pay({paid:5000,workers:[{email:h.worker,units:1,paid:5000,paidDate:''}]})).status,200);
  assert.equal((await h.close()).status,409);
  assert.equal((await h.pay({paymentVersion:1,paid:5000,workers:[{email:h.worker,units:1,paid:5000,paidDate:'2025-01-03'}]})).status,200);
  assert.equal((await h.close()).status,200);
});

test('legacy closed months cannot insert a different first bill, but can retain their frozen zero bill',async()=>{
  const h=await fixture();
  await h.DB.prepare("INSERT INTO settlement_months(month,closed_at,closed_by) VALUES('2025-01',?,'기존 마감')").bind(new Date().toISOString()).run();
  const frozen=await h.DB.prepare('SELECT data FROM settlement_snapshots WHERE report_id=?').bind(h.id).first();
  assert.equal((await h.pay({changeReason:'늦은 청구 추가'})).status,409);
  assert.equal(await h.DB.prepare('SELECT 1 FROM settlement_payments WHERE report_id=?').bind(h.id).first(),null);
  assert.equal((await h.pay({billed:0,vat:0,changeReason:'기존 0원 확인'})).status,200);
  assert.deepEqual(await h.DB.prepare('SELECT data FROM settlement_snapshots WHERE report_id=?').bind(h.id).first(),frozen);
});
