import { validMailbox } from './addresses.mjs';
import { handleSignup } from './signup.mjs';
import { handleOperations } from './operations.mjs';
import { handleAppLogin, readAppLoginIdentity, usesAppLogin } from './app-login.mjs';

const roleRank = { viewer: 1, cleaner: 1, editor: 2, admin: 3, owner: 4 };
const memberRoles = ['viewer', 'cleaner', 'editor', 'admin'];
const siteStatuses = ['pending', 'delayed', 'done'];
const maxSites = 1000;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
  });
}

function emailAddress(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

async function identity(request, env) {
  if (usesAppLogin(env)) return await readAppLoginIdentity(request,env) ?? { signedIn:false,role:null,nativeLogin:true };
  const id = request.headers.get('oai-authenticated-user-id');
  const email = emailAddress(request.headers.get('oai-authenticated-user-email'));
  if (!id || !email) return { signedIn: false, role: null };
  const fieldMode = request.headers.get('X-Bonyeon-Work-Mode') === 'cleaner';
  if (email === emailAddress(env.BONYEON_OWNER_EMAIL)) {
    return { signedIn: true, role: fieldMode ? 'cleaner' : 'owner', id, email, name: '본연 관리자', canSwitchMode: true };
  }
  let member = await env.DB.prepare('SELECT email, name, role, active FROM members WHERE user_id = ?').bind(id).first();
  if (!member) {
    await env.DB.prepare('UPDATE members SET user_id = ? WHERE email = ? AND user_id IS NULL AND active = 1')
      .bind(id, email).run();
    member = await env.DB.prepare('SELECT email, name, role, active FROM members WHERE user_id = ?').bind(id).first();
  }
  const matchesRegistration = member?.email === email;
  const role = matchesRegistration && member.active ? member.role : null;
  return { signedIn: true, id, email, name: matchesRegistration ? member.name : '',
    role: fieldMode && role === 'admin' ? 'cleaner' : role, ...(role === 'admin' ? { canSwitchMode: true } : {}) };
}

function requireRole(account, role) {
  if (!account.signedIn) throw new HttpError(401, '본연 사이트에 로그인해 주세요.');
  if (!account.role || roleRank[account.role] < roleRank[role]) {
    throw new HttpError(403, '이 작업을 할 권한이 없습니다.');
  }
}

async function readJson(request, env, limit = 900_000) {
  const origin = request.headers.get('Origin');
  if (!origin || ![new URL(request.url).origin, env.BONYEON_SITE_ORIGIN].includes(origin)) {
    throw new HttpError(403, '사이트 화면에서 다시 시도해 주세요.');
  }
  if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') {
    throw new HttpError(415, 'JSON 데이터가 필요합니다.');
  }
  if (Number(request.headers.get('Content-Length')) > limit) throw new HttpError(413, '업로드 데이터가 너무 큽니다.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, '요청 내용이 비어 있습니다.');
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > limit) {
        await reader.cancel();
        throw new HttpError(413, '업로드 데이터가 너무 큽니다.');
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, '요청 데이터를 읽을 수 없습니다.');
  } finally {
    reader.releaseLock();
  }
}

function readMember(body, account, ownerEmail) {
  const email = emailAddress(body?.email);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const role = body?.role;
  if (!validMailbox(body?.email) || !name || name.length > 80
    || !memberRoles.includes(role) || typeof body.active !== 'boolean') {
    throw new HttpError(400, '이메일, 이름, 권한과 활성 상태를 확인해 주세요.');
  }
  if (email === ownerEmail || email === account.email || (role === 'admin' && account.role !== 'owner')) {
    throw new HttpError(403, '이 사용자의 권한을 변경할 수 없습니다.');
  }
  return { email, name, role, active: Number(body.active) };
}

async function saveMember(db, request, env, account) {
  requireRole(account, 'admin');
  const ownerEmail = emailAddress(env.BONYEON_OWNER_EMAIL);
  const { email, name, role, active } = readMember(await readJson(request, env), account, ownerEmail);
  const updated = new Date().toISOString();
  if (request.method === 'POST') {
    const result = await db.prepare('INSERT INTO members (email, name, role, active, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING')
      .bind(email, name, role, active, updated).run();
    if (!result.meta.changes) throw new HttpError(409, '이미 등록된 이메일입니다.');
    return json({ ok: true }, 201);
  }
  const result = await db.prepare("UPDATE members SET name = ?, role = ?, active = ?, updated_at = ? WHERE email = ? AND (role <> 'admin' OR ? = 'owner')")
    .bind(name, role, active, updated, email, account.role).run();
  if (!result.meta.changes) throw new HttpError(404, '수정할 사용자를 찾을 수 없습니다.');
  return json({ ok: true });
}

function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date + 'T00:00:00Z');
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === date;
}

function koreaDate() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function saveCleaningPrice(db, request, env, account) {
  requireRole(account, 'admin');
  const { region, kind, price, previousPrice } = (await readJson(request, env)) ?? {};
  const validPrice = value => value === null || (Number.isSafeInteger(value) && value >= 0);
  if (typeof region !== 'string' || !['contract', 'worker'].includes(kind)
    || !validPrice(price) || !validPrice(previousPrice)) {
    throw new HttpError(400, '구역과 원 단위 청소단가를 확인해 주세요.');
  }
  const column = kind === 'contract' ? 'contract_price' : 'worker_price';
  const result = await db.prepare(`
    UPDATE charger_regions SET ${column} = ?
    WHERE region_name = ? AND ${column} IS ?
  `).bind(price, region, previousPrice).run();
  if (result.meta.changes !== 1) {
    throw new HttpError(409, '구역 또는 단가가 바뀌었습니다. 화면을 새로고침하고 다시 저장해 주세요.');
  }
  return json({ region, kind, price });
}

async function saveChargerCounts(db, request, env, account) {
  requireRole(account, 'admin');
  const { sourceDate, regions } = (await readJson(request, env)) ?? {};
  if (typeof sourceDate !== 'string' || !validDate(sourceDate) || sourceDate > koreaDate() || !Array.isArray(regions)) {
    throw new HttpError(400, '누리집에 표시된 집계 기준일과 공식 집계 파일을 확인해 주세요.');
  }
  const { results } = await db.prepare('SELECT region_name FROM charger_regions').all();
  const remaining = new Set(results.map(row => row.region_name));
  if (!remaining.size || regions.length !== remaining.size) {
    throw new HttpError(400, '공식 집계의 전체 구역이 포함된 파일을 선택해 주세요.');
  }
  const counts = regions.map(region => {
    if (!remaining.delete(region?.name) || !Number.isSafeInteger(region.count) || region.count < 0) {
      throw new HttpError(400, '집계 파일의 지역명과 등록 충전기 수량을 확인해 주세요.');
    }
    return { name: region.name, count: region.count };
  });
  const result = await db.prepare(`
    UPDATE charger_regions
    SET charger_count = incoming.value ->> 'count', source_date = ?
    FROM json_each(?) AS incoming
    WHERE region_name = incoming.value ->> 'name'
      AND (SELECT MAX(source_date) FROM charger_regions) <= ?
  `).bind(sourceDate, JSON.stringify(counts), sourceDate).run();
  if (result.meta.changes !== counts.length) {
    throw new HttpError(409, '현재 집계와 같거나 더 최근의 기준일을 입력해 주세요.');
  }
  return json({ sourceDate });
}

function validateSites(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > maxSites) {
    throw new HttpError(400, '파일 한 개에 현장을 1~1,000개 입력해 주세요.');
  }
  const ids = new Set();
  return rows.map((row, index) => {
    const text = key => typeof row?.[key] === 'string' ? row[key].trim() : '';
    const id = text('id');
    const name = text('name');
    const address = text('address');
    const status = text('status');
    const dueDate = row?.dueDate == null ? null : text('dueDate');
    const completedDate = row?.completedDate == null ? null : text('completedDate');
    const plannedUnits = row?.plannedUnits ?? null;
    const detailLimits = { delayReason: 500, assignee: 80, assigneeContact: 100, workNote: 500 };
    const details = {};
    for (const [key, limit] of Object.entries(detailLimits)) {
      const value = row?.[key];
      if (value != null && (typeof value !== 'string' || value.trim().length > limit)) {
        throw new HttpError(400, `${index + 2}행의 지연 사유, 담당자 또는 담당자 연락처를 확인해 주세요.`);
      }
      details[key] = value == null ? null : value.trim();
    }
    if (!id || id.length > 80 || !name || name.length > 120 || address.length > 240
      || !Number.isFinite(row?.lat) || Math.abs(row.lat) > 85
      || !Number.isFinite(row?.lng) || Math.abs(row.lng) > 180
      || !siteStatuses.includes(status) || (row?.dueDate != null && typeof row.dueDate !== 'string')
      || (plannedUnits !== null && (!Number.isInteger(plannedUnits) || plannedUnits < 1 || plannedUnits > 10000))
      || (dueDate && !validDate(dueDate)) || (row?.completedDate != null && typeof row.completedDate !== 'string')
      || (completedDate && (!validDate(completedDate) || completedDate > koreaDate()))) {
      throw new HttpError(400, `${index + 2}행의 현장 ID, 이름, 좌표, 상태 또는 예정일을 확인해 주세요.`);
    }
    if (ids.has(id)) throw new HttpError(400, `${index + 2}행에 중복 현장 ID가 있습니다.`);
    ids.add(id);
    return { id, name, address, lat: row.lat, lng: row.lng, status, dueDate, completedDate, plannedUnits, ...details };
  });
}

async function importSites(db, request, env, account) {
  requireRole(account, 'editor');
  const { rows } = (await readJson(request, env)) ?? {};
  const data = validateSites(rows);
  const updated = new Date().toISOString();
  await db.prepare(`
    INSERT INTO work_sites (id, name, address, lat, lng, status, due_date, updated_at,
                            delay_reason, assignee, assignee_contact, completed_date, work_note, history_actor, planned_units)
    SELECT incoming.value ->> 'id', incoming.value ->> 'name', incoming.value ->> 'address',
           incoming.value ->> 'lat', incoming.value ->> 'lng', incoming.value ->> 'status',
           COALESCE(incoming.value ->> 'dueDate', existing.due_date, ''), ?,
           incoming.value ->> 'delayReason', incoming.value ->> 'assignee', incoming.value ->> 'assigneeContact',
           CASE WHEN incoming.value ->> 'status' = 'done'
                THEN COALESCE(incoming.value ->> 'completedDate', existing.completed_date, '') ELSE '' END,
           COALESCE(incoming.value ->> 'workNote', existing.work_note, ''), ?,
           COALESCE(incoming.value ->> 'plannedUnits',existing.planned_units)
    FROM json_each(?) AS incoming
    LEFT JOIN work_sites AS existing ON existing.id = incoming.value ->> 'id'
    WHERE true
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, address = excluded.address,
      lat = excluded.lat, lng = excluded.lng, status = excluded.status,
      due_date = excluded.due_date, updated_at = excluded.updated_at, history_actor = excluded.history_actor,
      completed_date = excluded.completed_date, work_note = excluded.work_note, planned_units=excluded.planned_units,
      delay_reason = COALESCE(excluded.delay_reason, work_sites.delay_reason),
      assignee = COALESCE(excluded.assignee, work_sites.assignee),
      assignee_contact = COALESCE(excluded.assignee_contact, work_sites.assignee_contact)
  `).bind(updated, account.name || account.email, JSON.stringify(data)).run();
  return json({ count: data.length, updatedAt: updated });
}

export async function handleApi(request, env, handleControl, handleWorkflows) {
  try {
    const path = new URL(request.url).pathname;
    const method = request.method;
    const db = env.DB;
    if (!db || !env.BONYEON_OWNER_EMAIL) throw new HttpError(503, '본연 운영 서버 설정을 확인해 주세요.');
    const account = await identity(request, env);
    if (path === '/api/session' && method === 'GET') return json(account);
    if (path.startsWith('/api/auth/')) return await handleAppLogin(path,request,env,account,{ requireRole,readJson,json,HttpError });
    if (path === '/api/signup' || path.startsWith('/api/signup/')) {
      return await handleSignup(path, request, env, account, { requireRole, readJson, json, HttpError });
    }
    if (['/api/control/tasks', '/api/control/analytics'].includes(path)) {
      return await handleOperations(path, request, env, account, { requireRole, readJson, json, HttpError, validDate, koreaDate });
    }
    if (path.startsWith('/api/control/') || path.startsWith('/api/work/')) {
      const handler = path.startsWith('/api/control/') ? handleControl : handleWorkflows;
      return await handler(path, request, env, account, { requireRole, readJson, json, HttpError, validDate, koreaDate, emailAddress });
    }
    if (path === '/api/charger-regions' && method === 'GET') {
      requireRole(account, 'viewer');
      const admin = roleRank[account.role] >= roleRank.admin;
      const prices = admin ? ', contract_price AS contractPrice, worker_price AS workerPrice'
        : account.role === 'cleaner' ? ', worker_price AS workerPrice' : '';
      const { results } = await db.prepare(`
        SELECT region_name AS name, charger_count AS count, source_date AS sourceDate ${prices}
        FROM charger_regions ORDER BY charger_count DESC, region_name
      `).all();
      return json({ regions: results, sourceDate: results[0]?.sourceDate ?? null });
    }
    if (path === '/api/charger-regions/price' && method === 'PATCH') return await saveCleaningPrice(db, request, env, account);
    if (path === '/api/charger-regions/counts' && method === 'PUT') return await saveChargerCounts(db, request, env, account);
    if (path === '/api/sites' && method === 'GET') {
      requireRole(account, 'viewer');
      const today = koreaDate();
      const { results } = await db.prepare(`
        WITH actor(today, role, user_id, email) AS (VALUES (?, ?, ?, ?)), current_sites AS (
          SELECT w.id, w.name, w.address, w.lat, w.lng,
                 CASE WHEN actor.role = 'cleaner' AND p.worker_email <> actor.email THEN ''
                      ELSE COALESCE(p.next_due, w.due_date) END AS nextDue,
                 MAX(w.updated_at, CASE WHEN actor.role = 'cleaner' AND p.worker_email <> actor.email THEN ''
                      ELSE COALESCE(p.updated_at, '') END, COALESCE(visible_report.updated_at, '')) AS updatedAt,
                 CASE WHEN actor.role = 'cleaner' AND p.worker_email <> actor.email THEN ''
                      WHEN p.site_id IS NULL THEN COALESCE(w.delay_reason, '')
                      WHEN p.delay_date = p.next_due THEN p.delay_reason ELSE '' END AS delayReason,
                 CASE WHEN actor.role = 'cleaner' AND p.worker_email <> actor.email THEN COALESCE(visible_report.author_name, '')
                      ELSE COALESCE(p.worker_name, NULLIF(w.assignee, ''), visible_report.author_name, '') END AS assignee,
                 CASE WHEN actor.role IN ('editor', 'admin', 'owner') AND (p.site_id IS NULL OR p.worker_name = w.assignee)
                      THEN COALESCE(w.assignee_contact, '') ELSE '' END AS assigneeContact,
                 CASE WHEN actor.role = 'viewer' OR (actor.role = 'cleaner' AND p.worker_email <> actor.email) THEN ''
                      ELSE COALESCE(p.instructions, w.work_note) END AS workNote,
                 CASE WHEN actor.role <> 'cleaner' OR p.worker_email = actor.email THEN p.repeat_days END AS repeatDays,
                 visible_report.author_name AS reportWorker,
                 visible_report.status AS reportStatus, visible_report.work_date AS reportDate,
                 visible_report.units, visible_report.exterior, visible_report.interior,
                 COALESCE(g.planned_units,w.planned_units) AS plannedUnits,
                 CASE WHEN actor.role <> 'cleaner' OR p.worker_email=actor.email THEN g.units END AS progressUnits,
                 visible_report.assignment_due AS reportDue,
                 CASE WHEN actor.role = 'cleaner' AND p.worker_email <> actor.email THEN visible_report.assignment_due
                      ELSE r.assignment_due END AS completionDue,
                 CASE WHEN visible_report.id IS NULL THEN NULL ELSE (
                   SELECT COUNT(*) FROM charger_evidence e
                   WHERE e.site_id = visible_report.site_id AND e.work_date BETWEEN COALESCE(visible_report.progress_from,visible_report.work_date) AND visible_report.work_date
                     AND (actor.role <> 'cleaner' OR e.author_id = actor.user_id)
                 ) END AS evidenceCount,
                 w.completed_date AS importedCompletion,
                 CASE WHEN visible_report.status = 'approved' THEN visible_report.work_date END AS completionDate,
                 CASE WHEN actor.role = 'cleaner' AND p.worker_email <> actor.email THEN
                   CASE WHEN visible_report.status = 'approved' THEN 'done' ELSE 'pending' END
                 WHEN g.site_id IS NOT NULL THEN 'in_progress'
                 WHEN p.site_id IS NOT NULL THEN
                   CASE WHEN p.next_due < actor.today THEN 'delayed'
                        WHEN p.next_due > actor.today AND p.next_due <> p.start_date THEN 'done'
                        ELSE 'pending' END
                 WHEN r.status = 'approved' AND (w.due_date = '' OR r.work_date >= w.due_date OR r.updated_at >= w.updated_at)
                   AND (w.status = 'done' OR r.updated_at >= w.updated_at) THEN 'done'
                 WHEN w.status = 'pending' AND w.due_date <> '' AND w.due_date < actor.today THEN 'delayed'
                 ELSE w.status END AS status
          FROM work_sites w CROSS JOIN actor LEFT JOIN work_plan_cycles p ON p.site_id = w.id
          LEFT JOIN work_progress g ON g.site_id=w.id AND (actor.role <> 'cleaner' OR p.worker_email=actor.email)
          LEFT JOIN field_reports r ON r.id = COALESCE(
            (SELECT fr.id FROM field_reports fr WHERE fr.site_id = w.id AND fr.assignment_due = p.next_due
             ORDER BY fr.work_date DESC LIMIT 1),
            (SELECT fr.id FROM field_reports fr WHERE fr.site_id = w.id AND fr.status = 'approved'
              AND fr.assignment_due = date(p.next_due, '-' || p.repeat_days || ' days') ORDER BY fr.work_date DESC LIMIT 1),
            (SELECT fr.id FROM field_reports fr WHERE fr.site_id = w.id
             ORDER BY fr.work_date DESC LIMIT 1)
          )
          LEFT JOIN field_reports visible_report ON visible_report.id = CASE
            WHEN actor.role <> 'cleaner' OR r.author_id = actor.user_id THEN r.id
            ELSE (SELECT own.id FROM field_reports own WHERE own.site_id = w.id AND own.author_id = actor.user_id
                  ORDER BY own.work_date DESC LIMIT 1)
          END
          WHERE actor.role <> 'cleaner' OR p.worker_email = actor.email OR visible_report.id IS NOT NULL
        )
        SELECT id, name, address, lat, lng, nextDue, updatedAt, delayReason, assignee, assigneeContact, workNote, repeatDays,
          reportWorker, reportStatus, reportDate, units, exterior, interior, plannedUnits, progressUnits, reportDue, evidenceCount, importedCompletion, status,
          CASE WHEN status = 'done' AND repeatDays IS NOT NULL THEN completionDue ELSE nextDue END AS dueDate,
          CASE WHEN status = 'done' THEN COALESCE(completionDate, importedCompletion) ELSE NULL END AS completedDate,
          CASE WHEN status = 'delayed' AND nextDue <> ''
               THEN MAX(0, CAST(julianday((SELECT today FROM actor)) - julianday(nextDue) AS INTEGER)) ELSE NULL END AS delayDays
        FROM current_sites ORDER BY name, id
      `).bind(today, account.role, account.id, account.email).all();
      return json({ sites: results, checkedAt: new Date().toISOString() });
    }
    if (path === '/api/sites/import' && method === 'POST') return await importSites(db, request, env, account);
    if (path === '/api/users') {
      requireRole(account, 'admin');
      if (method === 'GET') {
        const { results } = await db.prepare('SELECT email, name, role, active FROM members WHERE email<>? ORDER BY name,email')
          .bind(emailAddress(env.BONYEON_OWNER_EMAIL)).all();
        return json({ users: [{ email: emailAddress(env.BONYEON_OWNER_EMAIL), name: '본연 관리자', role: 'owner', active: 1 }, ...results] });
      }
      if (method === 'POST' || method === 'PATCH') return await saveMember(db, request, env, account);
    }
    throw new HttpError(404, '요청한 기능을 찾을 수 없습니다.');
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error('본연 API 오류', error.name);
    return json({ error: '서버에서 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 500);
  }
}
