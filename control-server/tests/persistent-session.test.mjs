import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import worker from '../server/independent-worker.mjs';
import { createPreviewDb } from '../server/local-db.mjs';

async function fixture() {
  const origin='https://bonyeonclean.com',pin='fixture-pin',pepper='fixture-pepper';
  const DB=await createPreviewDb();
  const env={DB,BONYEON_FRONTEND_ORIGIN:origin,BONYEON_APP_LOGIN_REQUIRED:'1',
    BONYEON_OWNER_EMAIL:'owner@example.invalid',BONYEON_OWNER_ACCOUNT_ID:'owner-id',
    BONYEON_ADMIN_PIN_PEPPER:pepper,BONYEON_ADMIN_PIN_HASH:createHash('sha256').update(pepper+'\0'+pin).digest('hex')};
  const call=(path,{method='GET',body,token,cookie,account,source=origin}={})=>worker.fetch(new Request('https://test.workers.dev'+path,{
    method,headers:{Origin:source,...(body?{'Content-Type':'application/json'}:{}),
      ...(token!==undefined?{'X-Bonyeon-Session':token}:{}),...(cookie?{Cookie:cookie}:{}),
      ...(account?{'X-Bonyeon-Account':account}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);
  const login=async()=>{const response=await call('/api/auth/login',{method:'POST',body:{email:'admin',key:pin}});
    assert.equal(response.status,200);return {response,...await response.json()};};
  return {DB,env,call,login,origin};
}

test('persistent frontend cookie survives loss of tab storage and remains origin and account scoped',async()=>{
  const h=await fixture(),login=await h.login(),header=login.response.headers.get('Set-Cookie');
  assert.match(header,/^__Host-bonyeon_portal=[a-f0-9]{64};/);
  for(const flag of ['HttpOnly','Secure','SameSite=None','Partitioned','Max-Age=604800','Path=/'])assert.ok(header.includes(flag),flag);
  assert.ok(!header.includes('Domain='));
  assert.equal(login.response.headers.get('Access-Control-Allow-Credentials'),'true');
  const preflight=await h.call('/api/work/captures',{method:'OPTIONS'});
  assert.equal(preflight.headers.get('Access-Control-Allow-Credentials'),'true');
  assert.match(preflight.headers.get('Access-Control-Allow-Headers'),/X-Bonyeon-Account/);
  const cookie=header.split(';')[0];
  assert.equal((await(await h.call('/api/session',{cookie})).json()).id,'owner-id');
  assert.equal((await h.call('/api/work/overview',{cookie,account:'owner-id'})).status,200);
  assert.equal((await h.call('/api/work/overview',{cookie,account:'another-worker'})).status,401);
  assert.equal((await h.call('/api/auth/logout',{method:'POST',body:{},cookie,account:'another-worker'})).status,401);
  assert.equal((await h.call('/api/work/overview',{cookie,account:'owner-id'})).status,200);
  assert.equal((await h.call('/api/auth/logout',{method:'POST',body:{},cookie,source:'https://outside.invalid'})).status,403);
  assert.equal((await(await h.call('/api/session',{cookie,token:'invalid'})).json()).signedIn,false);
  const legacyCookie='__Host-bonyeon_session='+login.sessionToken;
  assert.equal((await(await h.call('/api/session',{cookie:legacyCookie})).json()).signedIn,false);
  const logout=await h.call('/api/auth/logout',{method:'POST',body:{},cookie,account:'owner-id'});
  assert.match(logout.headers.get('Set-Cookie'),/Max-Age=0/);
  assert.match(logout.headers.get('Set-Cookie'),/Partitioned/);
  assert.equal((await h.call('/api/work/overview',{cookie})).status,401);
  assert.equal((await h.call('/api/work/overview',{token:login.sessionToken})).status,401);
});

test('legacy session migration never extends server expiry and logout clears a newer same-account cookie',async()=>{
  const h=await fixture(),a=await h.login(),b=await h.login();
  const tokenHash=createHash('sha256').update(a.sessionToken).digest('hex');
  const expiresAt=new Date(Date.now()+120000).toISOString();
  await h.DB.prepare('UPDATE app_login_sessions SET expires_at=? WHERE token_hash=?').bind(expiresAt,tokenHash).run();
  const migration=await h.call('/api/session',{token:a.sessionToken});
  assert.equal((await migration.json()).signedIn,true);
  const maxAge=Number(migration.headers.get('Set-Cookie')?.match(/Max-Age=(\d+)/)?.[1]);
  assert.ok(maxAge>0&&maxAge<=120);
  assert.equal((await h.DB.prepare('SELECT expires_at FROM app_login_sessions WHERE token_hash=?').bind(tokenHash).first()).expires_at,expiresAt);
  const otherCookie=b.response.headers.get('Set-Cookie').split(';')[0];
  const logout=await h.call('/api/auth/logout',{method:'POST',body:{},token:a.sessionToken,cookie:otherCookie,account:'owner-id'});
  assert.match(logout.headers.get('Set-Cookie'),/Max-Age=0/);
  assert.equal((await h.call('/api/work/overview',{cookie:otherCookie})).status,401);
  await h.DB.prepare('UPDATE app_login_sessions SET expires_at=?').bind('2000-01-01T00:00:00.000Z').run();
  assert.equal((await h.call('/api/work/overview',{cookie:otherCookie})).status,401);
  assert.equal((await h.call('/api/session',{token:b.sessionToken})).headers.get('Set-Cookie'),null);
});

test('logging out a legacy tab does not revoke another account in the same browser',async()=>{
  const h=await fixture(),owner=await h.login(),email='another@example.invalid',key='c'.repeat(32);
  await h.DB.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES (?,?,'다른 작업자','cleaner',1,?)")
    .bind(email,'other-id',new Date().toISOString()).run();
  await h.DB.prepare('INSERT INTO app_login_keys(email,user_id,key_hash,issued_at,invite_verified) VALUES (?,?,?,?,1)')
    .bind(email,'other-id',createHash('sha256').update(key).digest('hex'),new Date().toISOString()).run();
  const other=await h.call('/api/auth/login',{method:'POST',body:{email,key}}),cookie=other.headers.get('Set-Cookie').split(';')[0];
  const logout=await h.call('/api/auth/logout',{method:'POST',body:{},token:owner.sessionToken,cookie,account:'owner-id'});
  assert.equal(logout.headers.get('Set-Cookie'),null);
  assert.equal((await h.call('/api/work/overview',{cookie,account:'other-id'})).status,200);
});

test('persistent cookies still honor worker deactivation and key revocation',async()=>{
  const h=await fixture(),key='a'.repeat(32),email='worker@example.invalid',keyHash=createHash('sha256').update(key).digest('hex');
  await h.DB.prepare("INSERT INTO members(email,user_id,name,role,active,updated_at) VALUES (?,?,'작업자','cleaner',1,?)")
    .bind(email,'worker-id',new Date().toISOString()).run();
  await h.DB.prepare('INSERT INTO app_login_keys(email,user_id,key_hash,issued_at,invite_verified) VALUES (?,?,?,?,1)')
    .bind(email,'worker-id',keyHash,new Date().toISOString()).run();
  const login=await h.call('/api/auth/login',{method:'POST',body:{email,key}}),cookie=login.headers.get('Set-Cookie')?.split(';')[0];
  assert.ok(cookie);assert.equal((await h.call('/api/work/overview',{cookie,account:'worker-id'})).status,200);
  assert.equal((await h.call('/api/work/settlement?month=2026-11',{cookie,account:'worker-id'})).status,403);
  await h.DB.prepare('UPDATE members SET active=0 WHERE email=?').bind(email).run();
  assert.equal((await h.call('/api/work/overview',{cookie})).status,401);
  await h.DB.prepare('UPDATE members SET active=1 WHERE email=?').bind(email).run();
  await h.DB.prepare('UPDATE app_login_keys SET key_hash=? WHERE email=?').bind('b'.repeat(64),email).run();
  assert.equal((await h.call('/api/work/overview',{cookie})).status,401);
});
