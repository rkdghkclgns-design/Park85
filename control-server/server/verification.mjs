import { readAppLoginIdentity, usesAppLogin } from './app-login.mjs';

const verificationRoot = '/verification/';
const verificationWorkerRoot = verificationRoot + 'worker/';
const verificationTables = /\b(?:work_sites|charger_regions|members|site_reporting|control_settings|field_reports|report_mail|work_plans|charger_evidence|settlement_months|settlement_payments|gmail_report_runner|office_mail_signals|office_mail_progress|work_plan_cycles|work_zones|work_camera_photos|operations_tasks|operations_events|settlement_snapshots|work_progress|work_report_drafts|work_guidance_receipts)\b/g;
const verificationCookie = 'bonyeon_verification';
const verificationEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const verificationToken = () => crypto.randomUUID().replaceAll('-', '');
const validVerificationToken = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);

function verificationJson(data, status = 200, extra = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
}

const verificationError = (message, status) => verificationJson({ error: message }, status);

async function hashVerificationToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

async function verificationOwner(request, env) {
  const owner = verificationEmail(env.BONYEON_OWNER_EMAIL);
  if (!owner || !env.DB) return null;
  if (usesAppLogin(env)) {
    const account = await readAppLoginIdentity(request,env);
    return account?.email===owner ? account.id : null;
  }
  return verificationEmail(request.headers.get('oai-authenticated-user-email'))===owner
    ? request.headers.get('oai-authenticated-user-id') : null;
}

function verificationFrontend(request, env) {
  return Boolean(env.BONYEON_FRONTEND_ORIGIN) && request.headers.get('Origin')===env.BONYEON_FRONTEND_ORIGIN;
}

function verificationSessionCookie(request,env) {
  if (verificationFrontend(request,env)) return request.headers.get('X-Bonyeon-Verification');
  return request.headers.get('Cookie')?.split(';').map(part => part.trim())
    .find(part => part.startsWith(verificationCookie + '='))?.slice(verificationCookie.length + 1);
}

function verificationCookieHeader(token, age) {
  return `${verificationCookie}=${token}; Path=${verificationWorkerRoot}; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
}

async function verificationCredentials(request,env) {
  if ((!verificationFrontend(request,env) && request.headers.get('Origin') !== new URL(request.url).origin)
    || request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') return null;
  const text = await request.text();
  if (text.length > 1024) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function verificationEnvironment(env, origin) {
  const bucket = env.BUCKET;
  const photoKey = key => 'verification/' + key;
  return {
    BONYEON_OWNER_EMAIL: env.BONYEON_OWNER_EMAIL,
    BONYEON_SITE_ORIGIN: env.BONYEON_FRONTEND_ORIGIN || origin,
    BONYEON_VERIFICATION_MODE: true,
    JPEG_VALIDATE:env.JPEG_VALIDATE,
    DB: { prepare: sql => env.DB.prepare(sql.replace(verificationTables, name => 'qa_' + name)) },
    BUCKET: bucket ? {
      put: (key, body, options) => bucket.put(photoKey(key), body, options),
      get: key => bucket.get(photoKey(key)),
      delete: key => bucket.delete(photoKey(key)),
    } : undefined,
  };
}

async function issueVerificationCode(request, db, env) {
  const body = await verificationCredentials(request,env);
  if (!body) return verificationError('검증 공간에서 다시 시도해 주세요.', 403);
  const email = verificationEmail(body.email);
  const member = await db.prepare("SELECT 1 FROM qa_members WHERE email = ? AND active = 1 AND role = 'cleaner'").bind(email).first();
  if (!member) return verificationError('검증 사용자 관리에서 활성 작업자를 먼저 등록해 주세요.', 404);
  const now = new Date();
  const code = verificationToken();
  await db.prepare('DELETE FROM qa_login_codes WHERE expires_at <= ? OR used_at IS NOT NULL').bind(now.toISOString()).run();
  await db.prepare('INSERT INTO qa_login_codes(code_hash, email, expires_at) VALUES (?, ?, ?)')
    .bind(await hashVerificationToken(code), email, new Date(+now + 15 * 60_000).toISOString()).run();
  return verificationJson({ code });
}

async function signInVerificationWorker(request, db, env) {
  const body = await verificationCredentials(request,env);
  if (!body) return verificationError('검증 공간에서 다시 시도해 주세요.', 403);
  const email = verificationEmail(body.email);
  const code = typeof body.code === 'string' ? body.code.trim().toLowerCase() : '';
  if (!email || !validVerificationToken(code)) return verificationError('작업자 이메일과 로그인 코드를 확인해 주세요.', 400);
  const now = new Date();
  const accepted = await db.prepare(`
    UPDATE qa_login_codes SET used_at = ?
    WHERE code_hash = ? AND email = ? AND expires_at > ? AND used_at IS NULL
      AND EXISTS (SELECT 1 FROM qa_members WHERE email = ? AND role = 'cleaner' AND active = 1)
    RETURNING email
  `).bind(now.toISOString(), await hashVerificationToken(code), email, now.toISOString(), email).first();
  if (!accepted) return verificationError('코드가 사용됐거나 만료되었습니다. 관리자 화면에서 새 코드를 발급해 주세요.', 401);
  const token = verificationToken();
  await db.prepare('DELETE FROM qa_login_sessions WHERE expires_at <= ?').bind(now.toISOString()).run();
  await db.prepare('INSERT INTO qa_login_sessions(token_hash, email, expires_at) VALUES (?, ?, ?)')
    .bind(await hashVerificationToken(token), email, new Date(+now + 2 * 3600_000).toISOString()).run();
  if (verificationFrontend(request,env)) return verificationJson({ ok:true, verificationToken:token });
  return verificationJson({ ok: true }, 200, { 'Set-Cookie': verificationCookieHeader(token, 7200) });
}

async function verificationWorkerIdentity(request, db, env) {
  const token = verificationSessionCookie(request,env);
  if (!validVerificationToken(token)) return null;
  return db.prepare(`
    SELECT m.email, m.user_id FROM qa_login_sessions s JOIN qa_members m ON m.email = s.email
    WHERE s.token_hash = ? AND s.expires_at > ? AND m.active = 1 AND m.role = 'cleaner'
  `).bind(await hashVerificationToken(token), new Date().toISOString()).first();
}

async function signOutVerificationWorker(request, db, env) {
  if (!await verificationCredentials(request,env)) return verificationError('검증 공간에서 다시 시도해 주세요.', 403);
  const token = verificationSessionCookie(request,env);
  if (validVerificationToken(token)) {
    await db.prepare('DELETE FROM qa_login_sessions WHERE token_hash = ?').bind(await hashVerificationToken(token)).run();
  }
  return verificationJson({ ok: true }, 200, { 'Set-Cookie': verificationCookieHeader('', 0) });
}

export async function handleVerification(request, env, serveAsset, runApi, sendCompletion) {
  const ownerId = await verificationOwner(request,env);
  if (!ownerId) return verificationError('사이트 소유자 전용 검증 공간입니다.', 404);
  const url = new URL(request.url);
  if (url.pathname === '/verification' || url.pathname === '/verification/worker') {
    url.pathname += '/';
    return Response.redirect(url, 308);
  }
  const worker = url.pathname.startsWith(verificationWorkerRoot);
  const tail = url.pathname.slice((worker ? verificationWorkerRoot : verificationRoot).length);
  if (!tail.startsWith('api/')) return serveAsset(request, tail ? '/' + tail : '/index.html');
  if (!env.DB) return verificationError('검증 데이터베이스를 확인해 주세요.', 503);
  const qa = verificationEnvironment(env, url.origin);
  if (request.method === 'POST' && tail === 'api/verification/code' && !worker) return issueVerificationCode(request, env.DB, env);
  if (request.method === 'POST' && tail === 'api/verification/login' && worker) return signInVerificationWorker(request, env.DB, env);
  if (request.method === 'POST' && tail === 'api/verification/logout' && worker) return signOutVerificationWorker(request, env.DB, env);
  if (request.method === 'POST' && tail === 'api/verification/completion-mail' && !worker) {
    const body = await verificationCredentials(request,env);
    if (!body || typeof body.id !== 'string' || !/^[a-f0-9-]{36}$/.test(body.id)) {
      return verificationError('승인된 검증 보고서를 선택해 주세요.', 400);
    }
    return sendCompletion(request, env, qa, body.id, ownerId);
  }
  if (tail.startsWith('api/control/gmail/') || tail === 'api/control/run' || tail === 'api/signup' || tail.startsWith('api/signup/')) {
    return verificationError('검증 공간에서 사용할 수 없는 기능입니다.', 404);
  }
  const headers = new Headers(request.headers);
  headers.set('oai-authenticated-user-id',ownerId);
  headers.set('oai-authenticated-user-email',env.BONYEON_OWNER_EMAIL);
  if (worker) {
    headers.delete('oai-authenticated-user-id');
    headers.delete('oai-authenticated-user-email');
    const identity = await verificationWorkerIdentity(request, env.DB, env);
    if (identity) {
      headers.set('oai-authenticated-user-id', identity.user_id || 'verification:' + identity.email);
      headers.set('oai-authenticated-user-email', identity.email);
    }
  }
  url.pathname = '/' + tail;
  const wrapped = new Request(url, { method: request.method, headers,
    ...(request.body ? { body: request.body, duplex: 'half' } : {}) });
  return runApi(wrapped, qa);
}
