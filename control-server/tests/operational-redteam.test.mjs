import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

async function setup() {
  const DB=await createPreviewDb();
  const origin='https://bonyeon.example';
  const now=new Date().toISOString();
  const day=new Date(Date.now()+9*3600_000).toISOString().slice(0,10);
  const env={DB,BONYEON_SITE_ORIGIN:origin,BONYEON_OWNER_EMAIL:'owner@example.invalid',
    BONYEON_GMAIL_FROM:'bonyeon85@gmail.com',BONYEON_REPORT_START_DATE:day,BONYEON_REPORT_RUN_SECRET:'t'.repeat(48)};
  await DB.prepare("INSERT INTO work_sites(id,name,address,lat,lng,status,planned_units,updated_at,due_date) VALUES('site','고객 현장','가상주소',37,127,'done',1,?,'')").bind(now).run();
  await DB.prepare("INSERT INTO site_reporting(site_id,contractor_email) VALUES('site','old@example.invalid')").bind().run();
  await DB.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES('worker@example.invalid','worker','작업자','cleaner',1,?)").bind(now).run();
  await DB.prepare(`INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,units,exterior,interior,notes,status,updated_at,approved_at,planned_units)
    VALUES('report','site',?,'worker','작업자','고객 현장','가상주소',1,1,0,'','approved',?,?,1)`).bind(day,now,now).run();
  async function call(path,{method='GET',body,status=200,worker=false,runner=false}={}) {
    const r=await handleApi(new Request(origin+'/api/'+path,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),
      ...(runner?{Authorization:'Bearer '+env.BONYEON_REPORT_RUN_SECRET}:{'oai-authenticated-user-id':worker?'worker':'owner','oai-authenticated-user-email':worker?'worker@example.invalid':env.BONYEON_OWNER_EMAIL})},
      ...(body?{body:JSON.stringify(body)}:{})}),env,handleControl,handleWorkflows);
    const result=await r.json();assert.equal(r.status,status,JSON.stringify(result));return result;
  }
  const runner=(action,body={})=>call('control/gmail/'+action,{method:'POST',body,runner:true});
  const claim=async requestId=>(await runner('claim',{requestId:requestId||crypto.randomUUID()})).message;
  const ack=m=>runner('complete',{id:m.id,claim:m.claim});
  const save=emails=>call('control/site',{method:'PATCH',body:{siteId:'site',region:null,contractorEmails:emails}});
  await runner('activate');
  return {DB,env,day,call,runner,claim,ack,save};
}

test('new client addresses never automatically receive historical approvals; explicit consent is audited',async t=>{
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-12T07:00:00Z')});
  const h=await setup();
  const original=await h.claim();assert.equal(original.to,'old@example.invalid');await h.ack(original);
  t.mock.timers.tick(1000);
  await h.save(['old@example.invalid','new@example.invalid']);
  assert.equal(await h.claim(),null);
  const preview=await h.call('control/mail?kind=contractor&reference=report');
  assert.deepEqual(preview.historicalRecipients,['new@example.invalid']);
  assert.equal(preview.requiresHistoricalConsent,true);
  const body={kind:'contractor',reference:'report',recipient:preview.recipient,previewToken:preview.previewToken};
  await h.call('control/mail',{method:'POST',body,status:409});
  await h.call('control/mail',{method:'POST',body:{...body,allowHistorical:true}});
  const manual=await h.claim();assert.equal(manual.to,'new@example.invalid');await h.ack(manual);
  const delivery=await h.DB.prepare("SELECT historical_consent_at,requested_by FROM report_mail WHERE recipient='new@example.invalid'").first();
  assert.ok(delivery.historical_consent_at);assert.equal(delivery.requested_by,'owner');
  const history=await h.call('control/analytics?kind=mail_settings');
  assert.ok(history.events.some(e=>e.actor&&e.detail.includes('new@example.invalid')));
});

test('unchanged clients retain their effective date; removed and re-added addresses cannot replay old reservations',async t=>{
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-12T07:00:00Z')});
  const h=await setup();
  const requestId=crypto.randomUUID();const first=await h.claim(requestId);assert.equal(first.to,'old@example.invalid');
  t.mock.timers.tick(1000);await h.save([]);
  t.mock.timers.tick(1000);await h.save(['old@example.invalid']);
  assert.equal(await h.claim(requestId),null);assert.equal(await h.claim(),null);
  await h.DB.prepare("UPDATE field_reports SET approved_at=? WHERE id='report'").bind(new Date().toISOString()).run();
  const fresh=await h.claim();assert.equal(fresh.to,'old@example.invalid');
  await h.ack(fresh);t.mock.timers.tick(1000);await h.save(['old@example.invalid']);assert.equal(await h.claim(),null);
});

test('workers receive only assigned region prices while public counts and administrator prices remain complete',async()=>{
  const h=await setup();
  await h.DB.prepare("INSERT INTO charger_regions(region_name,charger_count,source_date,worker_price,contract_price) VALUES('배정구역',10,'2026-11-12',10000,30000),('미배정구역',20,'2026-11-12',25000,70000)").bind().run();
  let worker=await h.call('charger-regions',{worker:true});
  assert.ok(worker.regions.every(r=>r.workerPrice==null&&r.contractPrice===undefined));
  await h.DB.prepare("UPDATE site_reporting SET region_name='배정구역' WHERE site_id='site'").bind().run();
  await h.DB.prepare("INSERT INTO work_plans(site_id,worker_email,start_date,repeat_days,instructions,updated_at) VALUES('site','worker@example.invalid',?,30,'',?)").bind(h.day,new Date().toISOString()).run();
  worker=await h.call('charger-regions',{worker:true});
  assert.equal(worker.regions.find(r=>r.name==='배정구역').workerPrice,10000);
  assert.equal(worker.regions.find(r=>r.name==='미배정구역').workerPrice,undefined);
  assert.equal(worker.regions.find(r=>r.name==='미배정구역').count,20);
  assert.equal((await h.call('charger-regions')).regions.find(r=>r.name==='미배정구역').contractPrice,70000);
});

test('late draft autosaves cannot recreate an already submitted report draft',async()=>{
  const h=await setup();
  await h.DB.prepare("UPDATE field_reports SET status='submitted' WHERE id='report'").bind().run();
  await h.DB.prepare("INSERT INTO work_plans(site_id,worker_email,start_date,repeat_days,instructions,updated_at) VALUES('site','worker@example.invalid',?,30,'',?)").bind(h.day,new Date().toISOString()).run();
  await h.call('control/report-draft',{method:'PUT',worker:true,status:409,body:{siteId:'site',workDate:h.day,units:1,exterior:1,interior:0,completionMode:'full',notes:'늦은 자동저장'}});
  assert.equal((await h.call('control/overview',{worker:true})).drafts.length,0);
});

test('drafts from an earlier assignment remain preserved but cannot restore into a new assignment',async()=>{
  const h=await setup();
  await h.DB.prepare("UPDATE field_reports SET status='revision' WHERE id='report'").bind().run();
  await h.DB.prepare("INSERT INTO work_plans(site_id,worker_email,start_date,repeat_days,instructions,updated_at) VALUES('site','worker@example.invalid',?,30,'',?)").bind(h.day,new Date().toISOString()).run();
  const payload={siteId:'site',workDate:h.day,assignmentDue:h.day,units:1,exterior:1,interior:0,completionMode:'full',notes:'보존할 메모'};
  await h.call('control/report-draft',{method:'PUT',worker:true,body:payload});
  const tomorrow=new Date(Date.parse(h.day+'T00:00:00Z')+86400_000).toISOString().slice(0,10);
  await h.DB.prepare("UPDATE work_plans SET start_date=? WHERE site_id='site'").bind(tomorrow).run();
  await h.call('control/report-draft',{method:'PUT',worker:true,status:409,body:payload});
  assert.equal((await h.call('control/overview',{worker:true})).drafts.length,0);
  assert.equal((await h.call('work/completion-counts?siteId=site&workDate='+h.day,{worker:true})).draft,null);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM work_report_drafts').first()).n,1);
});

test('central recipient and automation changes retain administrator and before/after audit values',async()=>{
  const h=await setup();
  await h.call('control/settings',{method:'PATCH',body:{email:'bonyeon85@gmail.com',taxEmail:'tax@example.invalid',workerMailEnabled:false,officeAutoEnabled:true}});
  await h.call('control/settings',{method:'PATCH',body:{email:'bonyeon85@gmail.com',taxEmail:'new-tax@example.invalid',workerMailEnabled:false,officeAutoEnabled:true}});
  const history=await h.call('control/analytics?kind=mail_settings');
  assert.ok(history.events.some(e=>e.actor&&e.detail.includes('tax@example.invalid')&&e.detail.includes('new-tax@example.invalid')));
  await h.call('control/analytics?kind=mail_settings',{worker:true,status:403});
});

test('an unattempted provider row can accept fresh explicit consent after recipient re-registration',async t=>{
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-12T07:00:00Z')});
  const h=await setup();
  const recipient='old@example.invalid';
  const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(['contractor','report',recipient])))),b=>b.toString(16).padStart(2,'0')).join('');
  await h.DB.prepare("INSERT INTO report_mail(id,kind,reference,recipient,sender,subject,body,html,created_at,recipient_policy_at) VALUES(?,'contractor','report',?,'reports@example.invalid','이전','이전','',?,'1970-01-01T00:00:00.000Z')").bind(id,recipient,new Date().toISOString()).run();
  t.mock.timers.tick(1000);await h.save([]);t.mock.timers.tick(1000);await h.save([recipient]);
  delete h.env.BONYEON_GMAIL_FROM;h.env.BONYEON_REPORT_FROM='reports@example.invalid';h.env.BONYEON_RESEND_API_KEY='test-provider-key';
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({id:'receipt'});});
  const preview=await h.call('control/mail?kind=contractor&reference=report');
  await h.call('control/mail',{method:'POST',body:{kind:'contractor',reference:'report',recipient,previewToken:preview.previewToken,allowHistorical:true}});
  assert.equal(calls,1);
});
