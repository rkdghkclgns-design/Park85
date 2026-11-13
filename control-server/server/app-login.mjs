import { validMailbox } from './addresses.mjs';

const appLoginCookie = '__Host-bonyeon_session';
const portalLoginCookie = '__Host-bonyeon_portal';
const appSessionSeconds = 7 * 24 * 60 * 60;
const appLoginEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const appLoginHex = bytes => Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
const appLoginRandom = size => appLoginHex(crypto.getRandomValues(new Uint8Array(size)));
const appLoginHash = async value => appLoginHex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));
const usesFrontendToken = (request,env) => Boolean(env.BONYEON_FRONTEND_ORIGIN)
  && request.headers.get('Origin')===env.BONYEON_FRONTEND_ORIGIN;
const cookieToken = (request,name) => request.headers.get('Cookie')?.split(';').map(value=>value.trim())
  .find(value=>value.startsWith(name+'='))?.slice(name.length+1);
const appLoginToken = (request,env) => usesFrontendToken(request,env)
  ? request.headers.has('X-Bonyeon-Session') ? request.headers.get('X-Bonyeon-Session') : cookieToken(request,portalLoginCookie)
  : cookieToken(request,appLoginCookie);
const validAppSessionToken = token => typeof token==='string' && /^[a-f0-9]{64}$/.test(token);
const appLoginCookieHeader = (token,seconds,frontend=false) => `${frontend ? portalLoginCookie : appLoginCookie}=${token}; Path=/; HttpOnly; Secure; SameSite=${frontend ? 'None; Partitioned' : 'Lax'}; Max-Age=${seconds}`;
export const usesAppLogin = env => env.BONYEON_APP_LOGIN_REQUIRED==='1';
const hasAdminPin = env => /^[a-f0-9]{64}$/.test(env.BONYEON_ADMIN_PIN_HASH || '') && Boolean(env.BONYEON_ADMIN_PIN_PEPPER);

export async function createAppLoginKey() {
  const raw = appLoginRandom(16);
  return { key:raw.match(/.{8}/g).join('-'),keyHash:await appLoginHash(raw) };
}

function matchesAppLoginHash(actual,expected) {
  if (typeof expected!=='string' || expected.length!==actual.length) return false;
  let difference=0;
  for (let i=0;i<actual.length;i++) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference===0;
}

export async function readAppLoginIdentity(request,env,token=appLoginToken(request,env)) {
  if (!validAppSessionToken(token)) return null;
  const row = await env.DB.prepare(`
    SELECT k.email,k.key_hash AS keyHash,COALESCE(m.user_id,k.user_id) AS id,m.name,m.role,m.active
    FROM app_login_sessions s JOIN app_login_keys k ON k.email=s.email AND k.key_hash=s.key_hash
    LEFT JOIN members m ON m.email=k.email
    WHERE s.token_hash=? AND s.expires_at>? AND k.invite_verified=1
  `).bind(await appLoginHash(token),new Date().toISOString()).first();
  if (!row) return null;
  const owner = row.email===appLoginEmail(env.BONYEON_OWNER_EMAIL);
  if (owner && hasAdminPin(env) && !matchesAppLoginHash(row.keyHash,env.BONYEON_ADMIN_PIN_HASH)) return null;
  if (!owner && row.active===0) return null;
  const canSwitchMode = owner || row.role==='admin';
  const fieldMode = canSwitchMode && request.headers.get('X-Bonyeon-Work-Mode')==='cleaner';
  return {
    signedIn:true,nativeLogin:true,email:row.email,id:row.id,name:owner ? '본연 관리자' : row.name || '',
    role:fieldMode ? 'cleaner' : owner ? 'owner' : row.role ?? null,
    ...(canSwitchMode ? { canSwitchMode:true } : {}),
    ...(owner && hasAdminPin(env) ? { adminPassword:true } : {}),
  };
}

function appLoginResponse(json,data,token,frontend) {
  if (!token) return json(data);
  return json(frontend ? { ...data,sessionToken:token } : data,200,
    { 'Set-Cookie':appLoginCookieHeader(token,appSessionSeconds,frontend) });
}

export async function appSessionResponse(account,request,env,json) {
  const token=request.headers.get('X-Bonyeon-Session');
  if (!usesAppLogin(env) || !account.signedIn || !usesFrontendToken(request,env) || !validAppSessionToken(token)) return json(account);
  const row=await env.DB.prepare('SELECT expires_at FROM app_login_sessions WHERE token_hash=?')
    .bind(await appLoginHash(token)).first();
  const remaining=row ? Math.floor((Date.parse(row.expires_at)-Date.now())/1000) : 0;
  return json(account,200,remaining>0 ? { 'Set-Cookie':appLoginCookieHeader(token,Math.min(remaining,appSessionSeconds),true) } : {});
}

export async function appRequestSource(request, env) {
  const address = request.headers.get('CF-Connecting-IP') || 'unknown';
  return appLoginHash((env.BONYEON_ADMIN_PIN_PEPPER || '')+'\0'+address.slice(0,64));
}

export async function consumeAppLimit(db, scope, source, max, windowMs, now = new Date()) {
  const time = now.toISOString();
  return db.prepare(`
    INSERT INTO app_request_limits(scope,source,attempts,reset_at) VALUES (?,?,1,?)
    ON CONFLICT(scope,source) DO UPDATE SET
      attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END,
      reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END
    WHERE reset_at<=? OR attempts<?
    RETURNING attempts
  `).bind(scope,source,new Date(+now+windowMs).toISOString(),time,time,time,max).first();
}

export function publicIntakeSettings(env) {
  const siteKey = typeof env.BONYEON_TURNSTILE_SITE_KEY==='string' ? env.BONYEON_TURNSTILE_SITE_KEY : '';
  const configured = /^[a-z0-9_-]{8,200}$/i.test(siteKey) && typeof env.BONYEON_TURNSTILE_SECRET_KEY==='string'
    && env.BONYEON_TURNSTILE_SECRET_KEY.length>=20;
  return { configured,siteKey:configured ? siteKey : '',actions:{ signup:'signup_invite',consultation:'consultation' } };
}

export async function requirePublicChallenge(request, env, body, action, { HttpError }) {
  if (!publicIntakeSettings(env).configured) throw new HttpError(503,'보안 확인을 준비하고 있습니다. 전화 또는 이메일로 문의해 주세요.');
  const token = body?.challengeToken;
  const denied = () => new HttpError(403,'보안 확인이 만료되었거나 완료되지 않았습니다. 다시 확인해 주세요.');
  if (typeof token!=='string' || !token || token.length>2048) throw denied();
  let hostname;
  try { hostname=new URL(env.BONYEON_FRONTEND_ORIGIN || env.BONYEON_SITE_ORIGIN || request.url).hostname.toLowerCase(); }
  catch { throw new HttpError(503,'접수 보안 설정을 확인해 주세요.'); }
  const parameters = { secret:env.BONYEON_TURNSTILE_SECRET_KEY,response:token,idempotency_key:crypto.randomUUID() };
  const ip=request.headers.get('CF-Connecting-IP');
  if (ip && ip.length<=64) parameters.remoteip=ip;
  let validation;
  try {
    const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',headers:{ 'Content-Type':'application/json' },body:JSON.stringify(parameters),
      signal:AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('verification unavailable');
    validation=await response.json();
  } catch { throw new HttpError(503,'보안 확인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
  const now=Date.now();
  const challengeTime=Date.parse(validation?.challenge_ts);
  if (validation?.success!==true || typeof validation.hostname!=='string' || validation.hostname.toLowerCase()!==hostname || validation.action!==action
    || !Number.isFinite(challengeTime) || now-challengeTime>300_000 || challengeTime-now>30_000) throw denied();
  await env.DB.prepare('DELETE FROM public_challenge_uses WHERE expires_at<=?').bind(new Date(now).toISOString()).run();
  const consumed=await env.DB.prepare(`
    INSERT INTO public_challenge_uses(token_hash,expires_at) VALUES (?,?) ON CONFLICT(token_hash) DO NOTHING
  `).bind(await appLoginHash(token),new Date(now+300_000).toISOString()).run();
  if (!consumed.meta.changes) throw denied();
}

async function signInAppAdmin(pin,request,env,{ json,HttpError },frontend) {
  const db=env.DB;
  const now=new Date();
  const time=now.toISOString();
  const source=await appRequestSource(request,env);
  const attempt=await consumeAppLimit(db,'admin',source,5,15*60_000,now);
  if (!attempt) throw new HttpError(429,'로그인 시도가 너무 많습니다. 15분 뒤 다시 시도해 주세요.');
  const pinHash=await appLoginHash(env.BONYEON_ADMIN_PIN_PEPPER+'\0'+pin);
  if (!matchesAppLoginHash(pinHash,env.BONYEON_ADMIN_PIN_HASH)) throw new HttpError(401,'아이디와 비밀번호를 확인해 주세요.');
  const email=appLoginEmail(env.BONYEON_OWNER_EMAIL);
  await db.prepare(`
    INSERT INTO app_login_keys(email,user_id,key_hash,issued_at)
    VALUES (?,COALESCE((SELECT user_id FROM members WHERE email=?),
      (SELECT user_id FROM app_login_keys WHERE email=?),?),?,?)
    ON CONFLICT(email) DO UPDATE SET key_hash=excluded.key_hash,issued_at=excluded.issued_at
    WHERE app_login_keys.key_hash<>excluded.key_hash
  `).bind(email,email,email,env.BONYEON_OWNER_ACCOUNT_ID,pinHash,time).run();
  const token=await createAppLoginSession(db,email,pinHash,now);
  if (!token) throw new HttpError(409,'관리자 로그인 설정이 변경되었습니다. 다시 시도해 주세요.');
  await db.prepare("DELETE FROM app_request_limits WHERE (scope='admin' AND source=?) OR reset_at<=?").bind(source,time).run();
  return appLoginResponse(json,{ ok:true },token,frontend);
}

async function createAppLoginSession(db,email,keyHash,now) {
  const token = appLoginRandom(32);
  const time = now.toISOString();
  await db.prepare('DELETE FROM app_login_sessions WHERE expires_at<=?').bind(time).run();
  const created = await db.prepare(`
    INSERT INTO app_login_sessions(token_hash,email,key_hash,expires_at)
    SELECT ?,email,key_hash,? FROM app_login_keys WHERE email=? AND key_hash=?
  `).bind(await appLoginHash(token),new Date(+now+appSessionSeconds*1000).toISOString(),email,keyHash).run();
  return created.meta.changes ? token : null;
}

async function signInAppUser(body,request,env,{ json,HttpError },frontend) {
  const email = appLoginEmail(body?.email);
  if (email==='admin' && hasAdminPin(env)) {
    return signInAppAdmin(typeof body?.key==='string' && body.key.length<=80 ? body.key : '',request,env,{ json,HttpError },frontend);
  }
  const key = typeof body?.key==='string' && body.key.length<=80 ? body.key.replace(/[\s-]/g,'').toLowerCase() : '';
  const invalid = () => new HttpError(401,'이메일과 로그인 키를 확인해 주세요.');
  if (!validMailbox(email) || !/^[a-f0-9]{32}$/.test(key)) throw invalid();
  const db = env.DB;
  const keyHash = await appLoginHash(key);
  const now = new Date();
  const owner = email===appLoginEmail(env.BONYEON_OWNER_EMAIL);
  if (owner && hasAdminPin(env)) throw invalid();
  if (owner && env.BONYEON_OWNER_ACCOUNT_ID && matchesAppLoginHash(keyHash,env.BONYEON_OWNER_LOGIN_HASH)) {
    await db.prepare(`
      INSERT INTO app_login_keys(email,user_id,key_hash,issued_at)
      VALUES (?,COALESCE((SELECT user_id FROM members WHERE email=?),?),?,?)
      ON CONFLICT(email) DO NOTHING
    `).bind(email,email,env.BONYEON_OWNER_ACCOUNT_ID,keyHash,now.toISOString()).run();
  }
  const member = await db.prepare(`
    SELECT k.user_id AS id FROM app_login_keys k LEFT JOIN members m ON m.email=k.email
    WHERE k.email=? AND k.key_hash=? AND k.invite_verified=1 AND (? OR m.email IS NULL OR m.active=1)
  `).bind(email,keyHash,Number(owner)).first();
  if (!member) throw invalid();
  await db.prepare('UPDATE members SET user_id=? WHERE email=? AND user_id IS NULL')
    .bind(member.id,email).run();
  const token = await createAppLoginSession(db,email,keyHash,now);
  if (!token) throw invalid();
  return appLoginResponse(json,{ ok:true },token,frontend);
}

async function issueAppLoginKey(body,env,account,{ json,HttpError,requireRole },frontend) {
  requireRole(account,'admin');
  const email = appLoginEmail(body?.email);
  if (!validMailbox(email)) throw new HttpError(400,'사용자 이메일을 입력해 주세요.');
  const owner = email===appLoginEmail(env.BONYEON_OWNER_EMAIL);
  if (owner && account.role!=='owner') throw new HttpError(403,'소유자만 본인 로그인 키를 재발급할 수 있습니다.');
  if (owner && hasAdminPin(env)) throw new HttpError(403,'관리자는 비밀번호로 로그인합니다.');
  const db = env.DB;
  const { key,keyHash } = await createAppLoginKey();
  const now = new Date();
  const issued = await db.prepare(`
    INSERT INTO app_login_keys(email,user_id,key_hash,issued_at)
    SELECT ?,COALESCE(?,m.user_id,k.user_id,
      (SELECT a.user_id FROM signup_applications a WHERE a.email=? ORDER BY a.created_at DESC LIMIT 1),?),?,?
    FROM (SELECT 1) LEFT JOIN members m ON m.email=? LEFT JOIN app_login_keys k ON k.email=?
    WHERE ? OR (m.active=1 AND (m.role<>'admin' OR ?)) OR (? AND m.email IS NULL)
    ON CONFLICT(email) DO UPDATE SET user_id=excluded.user_id,key_hash=excluded.key_hash,issued_at=excluded.issued_at,invite_verified=1
  `).bind(email,owner ? account.id : null,email,'bonyeon:'+crypto.randomUUID(),keyHash,now.toISOString(),
    email,email,Number(owner),Number(account.role==='owner'),Number(body?.applicant===true)).run();
  if (!issued.meta.changes) throw new HttpError(403,'이 사용자의 로그인 키를 발급할 수 없습니다. 등록 상태와 권한을 확인해 주세요.');
  await db.prepare('DELETE FROM signup_invite_requests WHERE email=?').bind(email).run();
  const token = email===account.email ? await createAppLoginSession(db,email,keyHash,now) : null;
  return appLoginResponse(json,{ key },token,frontend);
}

export async function handleAppLogin(path,request,env,account,context) {
  const { readJson,json,HttpError } = context;
  if (!usesAppLogin(env) || request.method!=='POST') throw new HttpError(404,'요청한 로그인 기능을 찾을 수 없습니다.');
  const body = await readJson(request,env,4096);
  const frontend = usesFrontendToken(request,env);
  if (path==='/api/auth/login') return signInAppUser(body,request,env,context,frontend);
  if (path==='/api/auth/key') return issueAppLoginKey(body,env,account,context,frontend);
  if (path==='/api/auth/logout') {
    const token = appLoginToken(request,env);
    if (validAppSessionToken(token)) await env.DB.prepare('DELETE FROM app_login_sessions WHERE token_hash=?')
      .bind(await appLoginHash(token)).run();
    const savedCookie=cookieToken(request,portalLoginCookie);
    const cookieAccount=frontend && savedCookie && savedCookie!==token ? await readAppLoginIdentity(request,env,savedCookie) : null;
    const clearCookie=!frontend || !savedCookie || savedCookie===token || (account.signedIn && cookieAccount?.id===account.id);
    if(clearCookie && savedCookie && savedCookie!==token && validAppSessionToken(savedCookie)) {
      await env.DB.prepare('DELETE FROM app_login_sessions WHERE token_hash=?').bind(await appLoginHash(savedCookie)).run();
    }
    return json({ ok:true },200,clearCookie ? { 'Set-Cookie':appLoginCookieHeader('',0,frontend) } : {});
  }
  throw new HttpError(404,'요청한 로그인 기능을 찾을 수 없습니다.');
}
