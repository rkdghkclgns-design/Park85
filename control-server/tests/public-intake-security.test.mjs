import assert from 'node:assert/strict';
import test from 'node:test';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

const origin='https://bonyeon.example.test';
const secret='synthetic-turnstile-secret-for-tests';

async function intakeFixture() {
  const DB=await createPreviewDb();
  const env={ DB,BONYEON_OWNER_EMAIL:'owner@example.test',BONYEON_SITE_ORIGIN:origin,BONYEON_APP_LOGIN_REQUIRED:'1',
    BONYEON_TURNSTILE_SITE_KEY:'test-site-key',BONYEON_TURNSTILE_SECRET_KEY:secret,
    BONYEON_GMAIL_FROM:'sender@example.test',BONYEON_CONSULTATION_EMAIL:'office@example.test' };
  await DB.prepare('INSERT INTO gmail_report_runner(id,activated_at,last_seen_at) VALUES(1,?,?)')
    .bind(new Date().toISOString(),new Date().toISOString()).run();
  const call=async (path,body,ip='203.0.113.5')=>{
    const response=await handleApi(new Request(origin+'/api/'+path,{
      method:body ? 'POST' : 'GET',headers:{ Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':ip },
      body:body ? JSON.stringify(body) : undefined,
    }),env,handleControl,handleWorkflows);
    return { status:response.status,body:await response.json() };
  };
  const count=async table=>(await DB.prepare('SELECT COUNT(*) AS count FROM '+table).first()).count;
  const signup=(email='new@example.test',challengeToken=crypto.randomUUID())=>({ email,name:'가입 요청자',challengeToken });
  const consultation=(challengeToken=crypto.randomUUID())=>({ submissionId:crypto.randomUUID(),name:'상담 요청자',
    contact:'010-0000-0000',services:['충전기 청소'],challengeToken });
  return { DB,env,call,count,signup,consultation };
}

function siteverify(t,override=()=>({})) {
  return t.mock.method(globalThis,'fetch',async(url,options)=>{
    assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const body=JSON.parse(options.body);
    assert.equal(body.secret,secret);
    assert.match(body.idempotency_key,/^[a-f0-9-]{36}$/);
    return Response.json({ success:true,hostname:new URL(origin).hostname,action:'signup_invite',
      challenge_ts:new Date().toISOString(),...override(body) });
  });
}

test('public intake fails closed before allocating slots or mail when challenge is missing, invalid or unavailable',async t=>{
  const { env,call,count,signup,consultation }=await intakeFixture();
  const remote=siteverify(t,()=>({ success:false }));
  const settings=await call('public-intake/settings');
  assert.deepEqual(settings.body,{ configured:true,siteKey:'test-site-key',actions:{ signup:'signup_invite',consultation:'consultation' } });
  assert.equal((await call('signup/register',signup('new@example.test',''))).status,403);
  assert.equal(remote.mock.callCount(),0);
  for(let index=0;index<60;index++) {
    const ip='203.0.113.'+(index+1);
    assert.equal((await call('signup/register',signup('fake-'+index+'@example.test'),ip)).status,403);
    assert.equal((await call('consultation',consultation(),ip)).status,403);
  }
  assert.equal(await count('signup_invite_requests'),0);
  assert.equal(await count('report_mail'),0);
  assert.equal(await count('app_request_limits'),0);
  assert.equal(await count('public_challenge_uses'),0);
  env.BONYEON_TURNSTILE_SECRET_KEY='';
  assert.deepEqual((await call('public-intake/settings')).body,{ configured:false,siteKey:'',actions:{ signup:'signup_invite',consultation:'consultation' } });
  assert.equal((await call('signup/register',signup())).status,503);
  assert.equal((await call('consultation',consultation())).status,503);
});

test('Turnstile hostname, action and freshness are checked and concurrent token reuse consumes one slot',async t=>{
  const { call,count,signup }=await intakeFixture();
  const invalid={
    wrongHost:{ hostname:'attacker.example.test' },wrongAction:{ action:'consultation' },
    expired:{ challenge_ts:new Date(Date.now()-301000).toISOString() },
    future:{ challenge_ts:new Date(Date.now()+31000).toISOString() },
    missingTime:{ challenge_ts:undefined },
  };
  siteverify(t,body=>invalid[body.response] || {});
  for(const token of Object.keys(invalid)) assert.equal((await call('signup/register',signup('new@example.test',token))).status,403);
  assert.equal(await count('signup_invite_requests'),0);
  const token=crypto.randomUUID();
  const pair=await Promise.all([call('signup/register',signup('one@example.test',token),'203.0.113.1'),
    call('signup/register',signup('two@example.test',token),'203.0.113.2')]);
  assert.deepEqual(pair.map(result=>result.status).sort(),[201,403]);
  assert.equal(await count('signup_invite_requests'),1);
  assert.equal(await count('public_challenge_uses'),1);
});

test('public signup replies do not identify owner, membership, pending invitations or full capacity',async t=>{
  const { DB,call,count,signup }=await intakeFixture();
  siteverify(t);
  await DB.prepare("INSERT INTO members(email,name,role,active,updated_at) VALUES('known@example.test','기존 작업자','cleaner',1,?)")
    .bind(new Date().toISOString()).run();
  for(let index=0;index<200;index++) await DB.prepare('INSERT INTO signup_invite_requests(email,name,requested_at) VALUES(?,?,?)')
    .bind('pending-'+index+'@example.test','대기 요청',new Date().toISOString()).run();
  const addresses=['owner@example.test','known@example.test','pending-1@example.test','fresh@example.test'];
  for(const [index,email] of addresses.entries()) assert.deepEqual(await call('signup/register',signup(email),'203.0.113.'+(index+40)),{ status:201,body:{ ok:true } });
  assert.equal(await count('signup_invite_requests'),200);
  await DB.prepare('UPDATE app_signup_settings SET enabled=0 WHERE id=1').bind().run();
  for(const [index,email] of addresses.entries()) assert.deepEqual(await call('signup/register',signup(email),'203.0.113.'+(index+50)),{ status:201,body:{ ok:true } });
  assert.equal(await count('signup_invite_requests'),200);
});

test('a verified consultation queues once and exact receipt retries require no second challenge',async t=>{
  const { call,count,consultation }=await intakeFixture();
  const remote=siteverify(t,()=>({ action:'consultation' }));
  const form=consultation();
  assert.deepEqual(await call('consultation',form),{ status:201,body:{ accepted:true,submissionId:form.submissionId } });
  const repeated=await call('consultation',{ ...form,challengeToken:'' });
  assert.deepEqual(repeated,{ status:200,body:{ accepted:true,submissionId:form.submissionId } });
  assert.equal(remote.mock.callCount(),1);
  assert.equal(await count('report_mail'),1);
  assert.equal((await call('consultation',{ ...form,name:'다른 요청' })).status,409);
  assert.equal(await count('report_mail'),1);
});

test('verification transport failures leave public requests unallocated',async t=>{
  const { call,count,signup }=await intakeFixture();
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('temporary verification failure');});
  assert.equal((await call('signup/register',signup())).status,503);
  assert.equal(await count('signup_invite_requests'),0);
  assert.equal(await count('public_challenge_uses'),0);
});
