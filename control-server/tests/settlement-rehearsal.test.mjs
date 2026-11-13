import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewDb} from '../server/local-db.mjs';
import {handleApi} from '../server/api.mjs';
import {handleControl,queueVerificationCompletion} from '../server/control.mjs';
import {handleWorkflows} from '../server/workflows.mjs';
import {handleVerification} from '../server/verification.mjs';

test('isolated priced rehearsal validates partial wages, VAT, close and immutable close figures through real APIs',async()=>{
  const DB=await createPreviewDb(),origin='https://rehearsal.example.invalid',owner='owner@example.invalid',report=crypto.randomUUID(),stamp='2025-02-20T00:00:00.000Z';
  const env={DB,BONYEON_OWNER_EMAIL:owner,BONYEON_SITE_ORIGIN:origin};
  for(const [email,name] of [['a@example.invalid','검증 A'],['b@example.invalid','검증 B']])await DB.prepare("INSERT INTO qa_members(email,user_id,name,role,active,updated_at) VALUES(?,?,?,'cleaner',1,?)").bind(email,email,name,stamp).run();
  await DB.prepare("INSERT INTO qa_work_sites(id,name,address,lat,lng,status,due_date,updated_at) VALUES('finance','검증 금액 현장','실제 계약 아님',37,127,'done','2025-02-20',?)").bind(stamp).run();
  await DB.prepare(`INSERT INTO qa_field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,units,exterior,interior,notes,status,updated_at,approved_at,contract_price,worker_price,internal_units)
    VALUES(?,'finance','2025-02-20','owner','관리자','검증 금액 현장','실제 계약 아님',4,4,0,'금액 검증','approved',?,?,100000,30000,1)`).bind(report,stamp,stamp).run();
  const run=(r,e)=>handleApi(r,e,handleControl,handleWorkflows);
  async function call(path,method='GET',body){const r=await handleVerification(new Request(origin+'/verification/api/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json','oai-authenticated-user-id':'owner','oai-authenticated-user-email':owner},body:body?JSON.stringify(body):undefined}),env,()=>new Response(''),run,queueVerificationCompletion);return {status:r.status,data:await r.json()};}
  const workers=[{email:'a@example.invalid',units:2,paid:40000,paidDate:'2025-02-20'},{email:'b@example.invalid',units:1,paid:0,paidDate:''},{email:owner,units:1,paid:0,paidDate:''}];
  const payment={id:report,billed:440000,vat:null,received:220000,paid:40000,paymentVersion:0,workers,billingRef:'QA-ONLY'};
  assert.equal((await call('work/settlement/payments','PATCH',{...payment,paid:45000})).status,400);
  assert.equal((await call('work/settlement/payments','PATCH',payment)).status,200);
  assert.equal((await call('work/settlement/close','POST',{month:'2025-02'})).status,409);
  assert.equal((await call('work/settlement/payments','PATCH',{...payment,vat:40000,paymentVersion:1})).status,200);
  assert.equal((await call('work/settlement/payments','PATCH',{...payment,vat:40000,paymentVersion:1})).status,409);
  const ledger=(await call('work/settlement?month=2025-02')).data;
  assert.equal(ledger.reconciliation.issues.length,0);
  assert.deepEqual(ledger.reconciliation.amounts,{supply:'400000',vat:'40000',billed:'440000',received:'220000',receivable:'220000',expectedWages:'90000',paid:'40000',unpaid:'50000',overpaid:'0'});
  assert.equal((await call('work/settlement/close','POST',{month:'2025-02'})).status,200);
  const frozen=(await call('work/settlement/export?month=2025-02')).data;
  assert.equal(frozen.rows[0].paid,40000);assert.equal(frozen.rows[0].vat,40000);
  assert.equal((await call('work/settlement/payments','PATCH',{...payment,vat:40000,paymentVersion:2,billed:450000,changeReason:'마감 후 청구 변경'})).status,409);
  assert.equal((await call('work/settlement/payments','PATCH',{...payment,vat:40000,paymentVersion:2,received:440000,paid:90000,changeReason:'마감 후 입금·지급',workers:[{...workers[0],paid:60000},{...workers[1],paid:30000,paidDate:'2025-02-21'},workers[2]]})).status,200);
  assert.equal((await call('work/settlement?month=2025-02')).data.reconciliation.amounts.unpaid,'0');
  assert.deepEqual((await call('work/settlement/export?month=2025-02')).data,frozen);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS total FROM field_reports').first()).total,0);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS total FROM settlement_payments').first()).total,0);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS total FROM settlement_months').first()).total,0);
});
