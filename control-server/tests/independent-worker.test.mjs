import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createPreviewDb } from '../server/local-db.mjs';
import worker from '../server/independent-worker.mjs';

test('GitHub Pages receives scoped app sessions and protected report links', async () => {
  const origin = 'https://bonyeonclean.com';
  const pin = 'test-admin-pin';
  const pepper = 'unit-test-pepper';
  const env = { DB:await createPreviewDb(),BONYEON_FRONTEND_ORIGIN:origin,BONYEON_APP_LOGIN_REQUIRED:'1',
    BONYEON_OWNER_EMAIL:'owner@example.invalid',BONYEON_OWNER_ACCOUNT_ID:'owner-id',
    BONYEON_ADMIN_PIN_PEPPER:pepper,BONYEON_ADMIN_PIN_HASH:createHash('sha256').update(pepper+'\0'+pin).digest('hex') };
  const call = (path, { method='GET', token, source=origin, body } = {}) =>
    worker.fetch(new Request('https://test.workers.dev'+path,{method,
      headers:{Origin:source,...(token?{'X-Bonyeon-Session':token}:{}),...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{})}),env);
  const guests = await call('/api/work/overview');
  assert.equal(guests.status,401);
  assert.equal(guests.headers.get('Access-Control-Allow-Origin'),origin);
  assert.equal((await call('/api/session',{source:'https://untrusted.example'})).status,403);
  const qaGuest = await call('/verification/api/session');
  assert.equal(qaGuest.status,401);
  assert.match((await qaGuest.json()).error,/로그인/);
  assert.equal((await call('/verification/worker/api/session')).status,401);
  assert.equal((await call('/verification/api/control/overview')).status,404);
  assert.equal((await call('/verification/api/session',{ method:'POST' })).status,404);
  const login = await call('/api/auth/login',{method:'POST',body:{email:'admin',key:pin}});
  assert.equal(login.status,200);
  assert.equal(login.headers.get('Set-Cookie'),null);
  const { sessionToken } = await login.json();
  assert.match(sessionToken,/^[a-f0-9]{64}$/);
  assert.equal((await (await call('/api/session',{token:sessionToken})).json()).role,'owner');
  assert.equal((await call('/verification/api/session',{token:sessionToken})).status,200);
  assert.equal((await call('/api/auth/logout',{method:'POST',token:sessionToken,body:{}})).status,200);
  assert.equal((await call('/api/work/overview',{token:sessionToken})).status,401);
});

test('public consultation stores one receipt and claims it through the configured Gmail sender', async t => {
  const frontend = 'https://bonyeonclean.com';
  const backend = 'https://test.workers.dev';
  const DB = await createPreviewDb();
  const env = { DB,BONYEON_FRONTEND_ORIGIN:frontend,BONYEON_APP_LOGIN_REQUIRED:'1',
    BONYEON_OWNER_EMAIL:'owner@example.invalid',BONYEON_GMAIL_FROM:'sender@example.invalid',
    BONYEON_CONSULTATION_EMAIL:'consultations@example.invalid',BONYEON_REPORT_START_DATE:new Date().toISOString().slice(0,10),
    BONYEON_REPORT_RUN_SECRET:'test-secret-'.repeat(5),
    BONYEON_TURNSTILE_SITE_KEY:'test-site-key',BONYEON_TURNSTILE_SECRET_KEY:'test-secret-key-for-unit-test' };
  t.mock.method(globalThis,'fetch',async (url)=>{
    assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    return Response.json({ success:true,hostname:new URL(frontend).hostname,action:'consultation',challenge_ts:new Date().toISOString() });
  });
  const post = (path, data, origin=frontend, runner=false) => worker.fetch(new Request(backend+path,{
    method:'POST',headers:{ Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.10',
      ...(runner ? { Authorization:'Bearer '+env.BONYEON_REPORT_RUN_SECRET } : {}) },
    body:JSON.stringify(data),
  }),env);
  const submission = { submissionId:crypto.randomUUID(),name:'검증 신청자',contact:'010-0000-0000',services:['충전기 청소'],challengeToken:crypto.randomUUID() };
  assert.equal((await post('/api/consultation',submission,'https://outside.invalid')).status,403);
  assert.equal((await post('/api/consultation',submission)).status,503);
  await post('/api/control/gmail/activate',{},backend,true);
  assert.equal((await post('/api/consultation',{ ...submission,name:' ' })).status,400);
  const first = await post('/api/consultation',submission);
  assert.equal(first.status,201);
  assert.deepEqual(await first.json(),{ accepted:true,submissionId:submission.submissionId });
  assert.equal((await post('/api/consultation',submission)).status,200);
  assert.equal((await post('/api/consultation',{ ...submission,name:'다른 이름' })).status,409);
  const requestId = crypto.randomUUID();
  const claim = async () => (await (await post('/api/control/gmail/claim',{ requestId },backend,true)).json()).message;
  const message = await claim();
  assert.equal(message.to,env.BONYEON_CONSULTATION_EMAIL);
  assert.match(message.subject,/^\[본연\] 간편상담 접수/);
  assert.match(message.body,/충전기 청소/);
  assert.deepEqual(await claim(),message);
  assert.equal((await post('/api/control/gmail/complete',{ id:message.id,claim:message.claim },backend,true)).status,200);
  assert.equal(await claim(),null);
});
