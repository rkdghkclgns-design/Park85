import { validMailbox } from './addresses.mjs';
import { appRequestSource, consumeAppLimit, requirePublicChallenge, usesAppLogin } from './app-login.mjs';

const signupDocumentLimit = 5_000_000;
const signupUploadLimit = 10_100_000;
const signupDocuments = { businessCertificate: { column: 'business_mime', name: 'business-registration' },
  bankCopy: { column: 'bank_mime', name: 'bank-account-copy' } };
const signupExtensions = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };
const signupObject = (id, kind) => 'signup-documents/' + id + '/' + kind;
const signupString = value => typeof value === 'string' ? value.trim() : '';
const signupId = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);

async function signupForm(request, env, { HttpError }) {
  const type = request.headers.get('Content-Type');
  if (![new URL(request.url).origin,env.BONYEON_FRONTEND_ORIGIN].includes(request.headers.get('Origin')) || !type?.startsWith('multipart/form-data;') || !request.body) {
    throw new HttpError(403, '회원가입 화면에서 다시 시도해 주세요.');
  }
  if (Number(request.headers.get('Content-Length')) > signupUploadLimit) throw new HttpError(413, '첨부 파일은 각각 5MB 이하여야 합니다.');
  const reader = request.body.getReader();
  const parts = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > signupUploadLimit) {
        await reader.cancel();
        throw new HttpError(413, '첨부 파일은 각각 5MB 이하여야 합니다.');
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try { return await new Response(new Blob(parts), { headers: { 'Content-Type': type } }).formData(); }
  catch { throw new HttpError(400, '가입 신청과 첨부 파일을 확인해 주세요.'); }
}

async function signupDocument(file, { HttpError }) {
  if (!(file instanceof File) || file.size < 8 || file.size > signupDocumentLimit || !Object.hasOwn(signupExtensions, file.type)) {
    throw new HttpError(400, '사업자등록증과 통장사본은 PDF, JPG, PNG 형식으로 각각 5MB 이하의 파일을 올려 주세요.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = file.type === 'application/pdf' ? [37, 80, 68, 70, 45]
    : file.type === 'image/jpeg' ? [255, 216, 255] : [137, 80, 78, 71, 13, 10, 26, 10];
  if (!header.every((value, index) => bytes[index] === value)) throw new HttpError(400, '첨부 파일의 실제 형식을 확인해 주세요.');
  return { bytes, type: file.type };
}

async function submitSignup(request, env, account, context) {
  const { HttpError } = context;
  const db = env.DB;
  if (!await db.prepare('SELECT 1 FROM app_signup_settings WHERE id=1 AND enabled=1').first()) {
    throw new HttpError(403,'현재 회원가입 접수가 중지되어 있습니다.');
  }
  const { email, id: userId } = account;
  if (usesAppLogin(env) && !await db.prepare('SELECT 1 FROM app_login_keys WHERE email=? AND user_id=? AND invite_verified=1')
    .bind(email,userId).first()) throw new HttpError(403,'관리자가 발급한 초대 키로 로그인해 주세요.');
  const form = await signupForm(request, env, context);
  if (!validMailbox(email)) throw new HttpError(400,'로그인에 사용할 이메일을 확인해 주세요.');
  if (email===signupString(env.BONYEON_OWNER_EMAIL).toLowerCase() || account.role
    || await db.prepare('SELECT 1 FROM members WHERE email = ? OR user_id = ?').bind(email,userId).first()) {
    throw new HttpError(409, '이미 등록된 계정입니다. 이용 권한은 관리자에게 확인해 주세요.');
  }
  if (await db.prepare("SELECT 1 FROM signup_applications WHERE status = 'pending' AND (email = ? OR user_id = ?)").bind(email,userId).first()) {
    throw new HttpError(409, '이미 접수된 가입 신청이 있습니다.');
  }
  const name = signupString(form.get('name'));
  const kind = signupString(form.get('kind'));
  const businessName = kind === 'business' ? signupString(form.get('businessName')) : '';
  const invoiceEmail = signupString(form.get('invoiceEmail')).toLowerCase();
  if (!name || name.length > 80 || !['individual', 'business'].includes(kind) || businessName.length > 120
    || (kind === 'business' && (!businessName || !invoiceEmail)) || (invoiceEmail && !validMailbox(invoiceEmail))) {
    throw new HttpError(400, '가입 유형, 이름, 사업자명과 계산서 수신 이메일을 확인해 주세요.');
  }
  const id = crypto.randomUUID();
  const files = [];
  if (kind === 'business') {
    if (!env.BUCKET) throw new HttpError(503, '가입 서류 보관함을 확인해 주세요.');
    for (const key of Object.keys(signupDocuments)) files.push([key, await signupDocument(form.get(key), context)]);
  }
  try {
    const writes = await Promise.allSettled(files.map(([key, file]) =>
      env.BUCKET.put(signupObject(id, key), file.bytes, { httpMetadata: { contentType: file.type } })));
    const failed = writes.find(write => write.status === 'rejected');
    if (failed) {
      if (String(failed.reason).includes('signup_media_limit')) throw new HttpError(507,'가입 서류 보관함이 가득 찼습니다. 본연 관리자에게 문의해 주세요.');
      throw new HttpError(502, '가입 서류를 저장하지 못했습니다.');
    }
    const mimes = Object.fromEntries(files.map(([key, file]) => [key, file.type]));
    const saved = await db.prepare(`
      INSERT INTO signup_applications(id,user_id,email,name,kind,business_name,invoice_email,business_mime,bank_mime,created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM members WHERE email = ? OR user_id = ?)
        AND EXISTS (SELECT 1 FROM app_signup_settings WHERE id=1 AND enabled=1)
        AND (?=0 OR EXISTS (SELECT 1 FROM app_login_keys WHERE email=? AND user_id=? AND invite_verified=1))
      ON CONFLICT DO NOTHING
    `).bind(id,userId,email,name,kind,businessName,invoiceEmail,mimes.businessCertificate || null,
      mimes.bankCopy || null,new Date().toISOString(),email,userId,Number(usesAppLogin(env)),email,userId).run();
    if (!saved.meta.changes) {
      if (!await db.prepare('SELECT 1 FROM app_signup_settings WHERE id=1 AND enabled=1').first()) {
        throw new HttpError(403,'현재 회원가입 접수가 중지되어 있습니다.');
      }
      throw new HttpError(409, '이미 등록된 계정이거나 접수된 신청이 있습니다.');
    }
  } catch (error) {
    const persisted = await db.prepare('SELECT id FROM signup_applications WHERE id=?').bind(id).first().catch(() => undefined);
    if (persisted) return;
    if (persisted === null) await Promise.allSettled(files.map(([key]) => env.BUCKET.delete(signupObject(id, key))));
    throw error;
  }
}

export async function handleSignup(path, request, env, account, context) {
  const { HttpError, json, readJson, requireRole } = context;
  const db = env.DB;
  if (path === '/api/signup/settings') {
    if (request.method==='GET') {
      const settings=await db.prepare('SELECT enabled FROM app_signup_settings WHERE id=1').first();
      return json({ enabled:settings?.enabled===1 });
    }
    if (request.method==='PATCH') {
      requireRole(account,'admin');
      const { enabled }=(await readJson(request,env)) ?? {};
      if (typeof enabled!=='boolean') throw new HttpError(400,'회원가입 접수 상태를 확인해 주세요.');
      await db.prepare('UPDATE app_signup_settings SET enabled=? WHERE id=1').bind(Number(enabled)).run();
      return json({ enabled });
    }
  }
  if (path==='/api/signup/register' && request.method==='POST' && usesAppLogin(env)) {
    const body = (await readJson(request,env,4096)) ?? {};
    const name = signupString(body.name);
    const email = signupString(body.email).toLowerCase();
    if (!validMailbox(email) || !name || name.length > 80) throw new HttpError(400,'이름과 이메일을 확인해 주세요.');
    await requirePublicChallenge(request,env,body,'signup_invite',context);
    const source = await appRequestSource(request,env);
    if (!await consumeAppLimit(db,'signup-invite',source,5,3600_000)) {
      throw new HttpError(429,'초대 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
    }
    await db.prepare('DELETE FROM signup_invite_requests WHERE requested_at<=?').bind(new Date(Date.now()-30*86400_000).toISOString()).run();
    await db.prepare(`
      INSERT INTO signup_invite_requests(email,name,requested_at)
      SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM app_signup_settings WHERE id=1 AND enabled=1)
        AND (SELECT COUNT(*) FROM signup_invite_requests WHERE requested_at>?)<200
        AND NOT EXISTS (SELECT 1 FROM members WHERE email=?)
        AND ?<>?
      ON CONFLICT(email) DO NOTHING
    `).bind(email,name,new Date().toISOString(),new Date(Date.now()-30*86400_000).toISOString(),email,
      email,signupString(env.BONYEON_OWNER_EMAIL).toLowerCase()).run();
    return json({ ok:true },201);
  }
  if (!account.signedIn) throw new HttpError(401, '가입용 키로 본연 사이트에 로그인해 주세요.');
  if (path === '/api/signup' && request.method === 'GET') {
    const application = await db.prepare(`
      SELECT status, reason, created_at AS submittedAt FROM signup_applications
      WHERE user_id = ? AND email = ? ORDER BY created_at DESC LIMIT 1
    `).bind(account.id, account.email).first();
    return json({ application });
  }
  if (path === '/api/signup' && request.method === 'POST') {
    await submitSignup(request, env, account, context);
    return json({ ok: true }, 201);
  }
  requireRole(account, 'admin');
  if (path === '/api/signup/admin' && request.method === 'GET') {
    const { results } = await db.prepare(`
      SELECT id, email, name, kind, business_name AS businessName, invoice_email AS invoiceEmail,
        business_mime IS NOT NULL AS hasBusinessCertificate, bank_mime IS NOT NULL AS hasBankCopy, status, reason, created_at AS submittedAt,
        (?=0 OR EXISTS (SELECT 1 FROM app_login_keys k WHERE k.email=signup_applications.email
          AND k.user_id=signup_applications.user_id AND k.invite_verified=1)) AS verified
      FROM signup_applications ORDER BY status <> 'pending', created_at DESC LIMIT 100
    `).bind(Number(usesAppLogin(env))).all();
    const cutoff = new Date(Date.now()-30*86400_000).toISOString();
    const { results: invites } = await db.prepare('SELECT email,name,requested_at AS requestedAt FROM signup_invite_requests WHERE requested_at>? ORDER BY requested_at DESC LIMIT 200').bind(cutoff).all();
    return json({ applications: results, invites });
  }
  if (path === '/api/signup/admin' && request.method === 'PATCH') {
    const body = (await readJson(request, env)) ?? {};
    const reason = signupString(body.reason);
    if (!signupId(body.id) || !['approved', 'rejected'].includes(body.status) || reason.length > 500
      || (body.status === 'rejected' && !reason)) throw new HttpError(400, '가입 처리 내용과 사유를 확인해 주세요.');
    const result = await db.prepare(`
      UPDATE signup_applications SET status = ?, reason = ?, reviewed_at = ?, reviewed_by = ?
      WHERE id = ? AND status = 'pending' AND (? = 'rejected' OR (
        NOT EXISTS (SELECT 1 FROM members m WHERE m.email = signup_applications.email OR m.user_id = signup_applications.user_id)
        AND (?=0 OR EXISTS (SELECT 1 FROM app_login_keys k WHERE k.email=signup_applications.email
          AND k.user_id=signup_applications.user_id AND k.invite_verified=1))
      ))
    `).bind(body.status, reason, new Date().toISOString(), account.id, body.id, body.status,Number(usesAppLogin(env))).run();
    if (!result.meta.changes) throw new HttpError(409, '초대 키 발급 여부와 신청 상태를 확인해 주세요.');
    return json({ ok: true });
  }
  if (path === '/api/signup/document' && request.method === 'GET') {
    const query = new URL(request.url).searchParams;
    const id = query.get('id'), kind = query.get('kind');
    if (!signupId(id) || !Object.hasOwn(signupDocuments, kind)) throw new HttpError(404, '첨부 서류를 찾을 수 없습니다.');
    const { column, name } = signupDocuments[kind];
    const row = await db.prepare(`SELECT ${column} AS mime FROM signup_applications WHERE id = ?`).bind(id).first();
    if (!row?.mime || !Object.hasOwn(signupExtensions, row.mime)) throw new HttpError(404, '첨부 서류를 찾을 수 없습니다.');
    const document = await env.BUCKET?.get(signupObject(id, kind));
    if (!document) throw new HttpError(404, '첨부 서류를 찾을 수 없습니다.');
    return new Response(document.body, { headers: { 'Content-Type': row.mime, 'Content-Disposition': `attachment; filename="${name}.${signupExtensions[row.mime]}"`,
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
  }
  throw new HttpError(404, '요청한 회원가입 기능을 찾을 수 없습니다.');
}
