import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleVerification } from '../server/verification.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

test('native login preserves member IDs, limits access, and revokes old credentials',async t=>{
  const owner='owner@example.test';
  const worker='worker@example.test';
  const applicant='applicant@example.test';
  const ownerKey='a'.repeat(32);
  const origin='https://bonyeon.example.test';
  const DB=await createPreviewDb();
  const env={ DB,BONYEON_OWNER_EMAIL:owner,BONYEON_SITE_ORIGIN:origin,BONYEON_APP_LOGIN_REQUIRED:'1',
    BONYEON_OWNER_ACCOUNT_ID:'original-owner',BONYEON_OWNER_LOGIN_HASH:createHash('sha256').update(ownerKey).digest('hex'),
    BONYEON_TURNSTILE_SITE_KEY:'test-site-key',BONYEON_TURNSTILE_SECRET_KEY:'test-secret-key-for-unit-test' };
  t.mock.method(globalThis,'fetch',async (url,options)=>{
    assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.match(JSON.parse(options.body).response,/^signup-/);
    return Response.json({ success:true,hostname:new URL(origin).hostname,action:'signup_invite',challenge_ts:new Date().toISOString() });
  });
  await DB.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES (?,?,'작업자','cleaner',1,?)")
    .bind(worker,'original-worker',new Date().toISOString()).run();
  const api=(request,settings=env)=>handleApi(request,settings,handleControl,handleWorkflows);
  const forged={ 'oai-authenticated-user-id':'fake-owner','oai-authenticated-user-email':owner };
  async function call(path,{ body,cookie='',headers={},status=200,method=body ? 'POST' : 'GET' }={}) {
    const form=body instanceof FormData;
    const response=await api(new Request(origin+'/api/'+path,{
      method,
      headers:{ Cookie:cookie,Origin:origin,...(body&&!form ? { 'Content-Type':'application/json' } : {}),...headers },
      body:form ? body : body ? JSON.stringify(body) : undefined,
    }));
    assert.equal(response.status,status,path);
    return response;
  }
  const login=async (email,key,headers={})=>{
    const result=await call('auth/login',{ body:{ email,key },headers });
    const cookie=result.headers.get('Set-Cookie');
    assert.match(cookie,/^__Host-bonyeon_session=[a-f0-9]{64}; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800$/);
    return cookie.split(';')[0];
  };
  assert.equal((await (await call('session',{ headers:forged })).json()).signedIn,false);
  await call('work/overview',{ headers:forged,status:401 });
  await call('auth/key',{ headers:forged,body:{ email:owner },status:401 });
  await call('auth/login',{ body:{ email:owner,key:ownerKey },headers:{ Origin:'https://external.example.test' },status:403 });
  const ownerCookie=await login(owner,ownerKey);
  assert.equal((await (await call('session',{ cookie:ownerCookie })).json()).id,'original-owner');
  const qa=await handleVerification(new Request(origin+'/verification/api/session',{ headers:{ Cookie:ownerCookie } }),
    env,()=>new Response(null),api);
  assert.equal((await qa.json()).role,'owner');
  const qaForged=await handleVerification(new Request(origin+'/verification/api/session',{ headers:forged }),env,()=>new Response(null),api);
  assert.equal(qaForged.status,404);

  async function issue(email,extra={}) {
    const response=await call('auth/key',{ cookie:ownerCookie,body:{ email,...extra } });
    return (await response.json()).key;
  }
  const key=await issue(worker);
  const workerCookie=await login(worker,key);
  const workerIdentity=await (await call('session',{ cookie:workerCookie })).json();
  assert.equal(workerIdentity.id,'original-worker');
  assert.equal(workerIdentity.role,'cleaner');
  await call('work/overview',{ cookie:workerCookie });
  await call('users',{ cookie:workerCookie,status:403 });
  await call('auth/key',{ cookie:workerCookie,body:{ email:owner },status:403 });
  const rotated=await issue(worker);
  await call('work/overview',{ cookie:workerCookie,status:401 });
  await call('auth/login',{ body:{ email:worker,key },status:401 });
  const current=await login(worker,rotated);
  await DB.prepare('UPDATE members SET active=0 WHERE email=?').bind(worker).run();
  await call('work/overview',{ cookie:current,status:401 });
  await call('auth/login',{ body:{ email:worker,key:rotated },status:401 });
  await DB.prepare('UPDATE members SET active=1 WHERE email=?').bind(worker).run();
  await call('auth/login',{ body:{ email:worker,key:rotated },status:401 });
  const reissued=await issue(worker);
  const reissuedCookie=await login(worker,reissued);
  await call('work/overview',{ cookie:reissuedCookie });
  await call('users',{ cookie:ownerCookie,method:'PATCH',body:{ email:worker,name:'작업 관리자',role:'admin',active:true } });
  await call('users',{ cookie:reissuedCookie,status:401 });
  await call('auth/login',{ body:{ email:worker,key:reissued },status:401 });
  const promotedCookie=await login(worker,await issue(worker));
  await call('users',{ cookie:promotedCookie });
  await call('users',{ cookie:ownerCookie,method:'PATCH',body:{ email:worker,name:'작업자',role:'cleaner',active:true } });
  await call('users',{ cookie:promotedCookie,status:401 });

  const applicantCookie=await login(applicant,await issue(applicant,{ applicant:true }));
  await call('work/overview',{ cookie:applicantCookie,status:403 });
  const application=new FormData();
  application.set('name','신규 작업자');
  application.set('kind','individual');
  await call('signup',{ cookie:applicantCookie,body:application,status:201 });
  const { applications }=await (await call('signup/admin',{ cookie:ownerCookie })).json();
  await call('signup/admin',{ cookie:ownerCookie,method:'PATCH',body:{ id:applications[0].id,status:'approved' } });
  assert.equal((await (await call('session',{ cookie:applicantCookie })).json()).role,'cleaner');
  await call('auth/logout',{ body:{},cookie:applicantCookie });
  await call('work/overview',{ cookie:applicantCookie,status:401 });

  const pin='0385';
  env.BONYEON_ADMIN_PIN_PEPPER='fixture-pepper';
  env.BONYEON_ADMIN_PIN_HASH=createHash('sha256').update(env.BONYEON_ADMIN_PIN_PEPPER+'\0'+pin).digest('hex');
  await call('users',{ cookie:ownerCookie,status:401 });
  await call('auth/login',{ body:{ email:owner,key:ownerKey },status:401 });
  for (let attempt=0;attempt<5;attempt++) {
    await call('auth/login',{ body:{ email:'admin',key:'0000' },status:401 });
  }
  await call('auth/login',{ body:{ email:'admin',key:pin },status:429 });
  const pinCookie=await login('admin',pin,{ 'CF-Connecting-IP':'203.0.113.45' });
  const pinOwner=await (await call('session',{ cookie:pinCookie })).json();
  assert.equal(pinOwner.id,'original-owner');
  assert.equal(pinOwner.role,'owner');
  assert.equal(pinOwner.adminPassword,true);
  await call('auth/key',{ cookie:pinCookie,body:{ email:owner },status:403 });

  const settings=async (enabled,cookie=pinCookie,status=200)=>call('signup/settings',{ method:'PATCH',body:{ enabled },cookie,status });
  const publicEmail='public@example.test';
  const registration=email=>{
    const form=new FormData();
    form.set('email',email);
    form.set('name','공개 접수 작업자');
    form.set('kind','individual');
    return form;
  };
  await settings(false,'',401);
  await settings(false);
  assert.equal((await (await call('signup/settings')).json()).enabled,false);
  const invite = email => ({ email, name:'초대 요청 작업자',challengeToken:'signup-'+crypto.randomUUID() });
  await call('signup/register',{ body:invite(publicEmail),status:201 });
  assert.equal(await DB.prepare('SELECT 1 FROM signup_invite_requests WHERE email=?').bind(publicEmail).first(),null);
  await settings(true);
  await call('signup/register',{ body:registration(publicEmail),status:415 });
  const newRegistration=await call('signup/register',{ body:invite(publicEmail),status:201 });
  assert.deepEqual(await newRegistration.json(),{ ok:true });
  assert.equal(await DB.prepare('SELECT 1 FROM app_login_keys WHERE email=?').bind(publicEmail).first(),null);
  assert.ok((await (await call('signup/admin',{ cookie:pinCookie })).json()).invites.some(row=>row.email===publicEmail));
  const issueInvite = async email => (await (await call('auth/key',{ cookie:pinCookie,body:{ email,applicant:true } })).json()).key;
  const publicKey = await issueInvite(publicEmail);
  const pending=await login(publicEmail,publicKey);
  await call('signup',{ cookie:pending,body:registration(publicEmail),status:201 });
  await call('work/overview',{ cookie:pending,status:403 });
  const deniedEmail='denied@example.test';
  const deniedKey=await issueInvite(deniedEmail);
  const deniedCookie=await login(deniedEmail,deniedKey);
  await call('signup',{ cookie:deniedCookie,body:registration(deniedEmail),status:201 });
  const review=await (await call('signup/admin',{ cookie:pinCookie })).json();
  await settings(false);
  await call('signup/admin',{ cookie:pinCookie,method:'PATCH',
    body:{ id:review.applications.find(row=>row.email===publicEmail).id,status:'approved' } });
  await call('signup/admin',{ cookie:pinCookie,method:'PATCH',
    body:{ id:review.applications.find(row=>row.email===deniedEmail).id,status:'rejected',reason:'검증용 반려' } });
  assert.equal((await (await call('session',{ cookie:pending })).json()).role,'cleaner');
  await call('work/overview',{ cookie:pending });
  await call('work/overview',{ cookie:await login(deniedEmail,deniedKey),status:403 });
  await settings(true);
  await call('signup',{ cookie:deniedCookie,body:registration(deniedEmail),status:201 });
});
