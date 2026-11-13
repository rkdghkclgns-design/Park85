import { displayWorkResults, normalizeWorkResults } from './work-results.mjs';
import { cameraPhotoKey, captureSelectionIds, handleCameraWork, readCaptureSelection, validateProofJpeg, validateWorkZone } from './camera.mjs';
import { internalWorkUnits, readWorkCompletion, workerCanMoveEvidenceZone } from './progress.mjs';

const photoSlots = ['exteriorBefore', 'exteriorAfter', 'interiorBefore', 'interiorAfter'];
const uploadLimit = 5_000_000;
const cleanText = value => typeof value === 'string' ? value.trim() : '';
const hasMonth = (month, validDate) => typeof month === 'string' && validDate(month + '-01');
const isUuid = id => typeof id === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id);
const objectKey = (id, slot) => 'work-evidence/' + id + '/' + slot;
const nowIso = () => new Date().toISOString();
const chargerTypes = ['slow', 'fast', 'unknown'];
const canopyScopes = ['included', 'excluded', 'unknown'];
const basicSafetyChecks = ['access','equipment','condition','power'];
const fieldGuideVersion = '2026-11-guidance-1';

async function siteGuidance(db,siteId,account,context) {
  if (typeof siteId !== 'string' || !siteId || siteId.length>80) throw new context.HttpError(400,'배정 현장을 선택해 주세요.');
  const row = await db.prepare(`
    SELECT p.next_due AS assignmentDue,COALESCE(NULLIF(p.instructions,''),w.work_note,'') AS instructions
    FROM work_plan_cycles p JOIN work_sites w ON w.id=p.site_id WHERE p.site_id=? AND p.worker_email=?
  `).bind(siteId,account.email).first();
  if (!row) throw new context.HttpError(404,'본인에게 배정된 현장을 찾을 수 없습니다.');
  const input = JSON.stringify([fieldGuideVersion,row.instructions]);
  const version = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input))),
    byte=>byte.toString(16).padStart(2,'0')).join('');
  const receipt = await db.prepare('SELECT confirmed_at AS confirmedAt FROM work_guidance_receipts WHERE site_id=? AND author_id=? AND assignment_due=? AND version=?')
    .bind(siteId,account.id,row.assignmentDue,version).first();
  return { ...row,version,confirmedAt:receipt?.confirmedAt ?? null };
}

function readGuidedChecklist(form,interior,HttpError) {
  let checklist;
  try { checklist=JSON.parse(form.get('safetyChecklist') || 'null'); } catch {}
  const keys = interior ? [...basicSafetyChecks,'isolation'] : basicSafetyChecks;
  if (!checklist || !keys.every(key=>checklist[key]===true)) throw new HttpError(400,'충전기 기본 안전 점검을 모두 완료해 주세요.');
  return Object.fromEntries(keys.map(key=>[key,true]));
}

async function readWorkflows(db, month, account, admin, ownerEmail) {
  const siteQuery = db.prepare(`
    SELECT w.id, w.name, w.address, p.worker_name AS workerName, p.next_due AS nextDue,w.work_note AS siteNote,
           w.planned_units AS configuredUnits,COALESCE(g.planned_units,w.planned_units) AS plannedUnits,g.units AS progressUnits,
           p.start_date AS startDate, p.repeat_days AS repeatDays, p.instructions,
           CASE WHEN p.delay_date = p.next_due THEN p.delay_reason ELSE '' END AS delayReason,
           (SELECT r.status FROM field_reports r WHERE r.site_id=w.id AND r.assignment_due=p.next_due
             ORDER BY r.work_date DESC LIMIT 1) AS currentReportStatus
           ${admin ? ', p.worker_email AS workerEmail' : ''}
    FROM work_sites w LEFT JOIN work_plan_cycles p ON p.site_id = w.id LEFT JOIN work_progress g ON g.site_id=w.id
    ${admin ? '' : "WHERE p.worker_email = ?"}
    ORDER BY w.name, w.id
  `);
  const sites = await (admin ? siteQuery : siteQuery.bind(account.email)).all();
  const photos = await db.prepare(`
    SELECT e.id, e.site_id AS siteId, w.name AS siteName, e.work_date AS workDate, e.asset_code AS assetCode,
           COALESCE('충전기 ' || e.device_number,e.asset_code) AS assetLabel,
           e.author_name AS authorName, e.exterior, e.interior, e.safety_checked AS safetyChecked,
           e.charger_type AS chargerType, e.canopy, e.result_detail,e.safety_checklist AS safetyChecklist,
           e.zone_id AS zoneId,e.zone_name_snapshot AS zoneName,(${openEvidencePeriod} AND (? OR (${workerCanMoveEvidenceZone}))) AS canMoveZone,
           (SELECT json_group_array(json_object('id', p.id, 'slot', p.slot)) FROM (
             SELECT id, slot FROM work_camera_photos WHERE evidence_id = e.id ORDER BY created_at, id
           ) p) AS capturedPhotos,
           e.issue, e.followup_owner AS followupOwner, e.followup_status AS followupStatus, e.followup_note AS followupNote,
           EXISTS (SELECT 1 FROM field_reports r WHERE r.site_id = e.site_id AND e.work_date BETWEEN COALESCE(r.progress_from,r.work_date) AND r.work_date
                     AND r.status = 'approved') AS approved,
           NOT (${openEvidencePeriod}) AS closed
    FROM charger_evidence e JOIN work_sites w ON w.id = e.site_id LEFT JOIN work_zones z ON z.id = e.zone_id
    WHERE e.work_date LIKE ? ${admin ? '' : 'AND e.author_id = ?'}
    ORDER BY e.work_date DESC, w.name, e.asset_code LIMIT 201
  `).bind(Number(admin),account.id,account.email,month + '-%', ...(admin ? [] : [account.id])).all();
  const data = { sites: sites.results, evidence: photos.results.slice(0, 200).map(({ capturedPhotos,safetyChecklist, ...row }) => ({ ...row,
    photos: JSON.parse(capturedPhotos), safetyChecklist:JSON.parse(safetyChecklist), workResults: displayWorkResults(row).items })),
    evidenceOverflow: photos.results.length > 200 };
  if (admin) {
    const workers = await db.prepare("SELECT email,name,role='admin' AS internal FROM members WHERE active=1 AND role IN ('cleaner','admin') AND email<>? ORDER BY name,email")
      .bind(ownerEmail).all();
    data.workers = [{ email:ownerEmail,name:'본연 관리자',internal:1 },...workers.results];
  } else {
    const { results } = await db.prepare(`
      WITH devices AS (
        SELECT e.site_id AS siteId, e.zone_id AS zoneId, z.name AS zoneName, e.asset_code AS assetCode,
          COALESCE('충전기 ' || e.device_number,e.asset_code) AS assetLabel,
          e.charger_type AS chargerType, e.canopy, e.work_date AS workDate,
          row_number() OVER (PARTITION BY e.site_id,e.asset_code ORDER BY e.work_date DESC, e.id DESC) AS recency
        FROM charger_evidence e JOIN work_plans p ON p.site_id=e.site_id
        LEFT JOIN work_zones z ON z.id=e.zone_id WHERE p.worker_email = ?
      )
      SELECT siteId,zoneId,zoneName,assetCode,assetLabel,chargerType,canopy,workDate FROM devices
      WHERE recency=1 ORDER BY workDate DESC, assetCode LIMIT 500
    `).bind(account.email).all();
    data.devices = results;
  }
  return data;
}

async function saveWorkPlan(db, body, account, ownerEmail, { HttpError, validDate, emailAddress }) {
  const { siteId, startDate, repeatDays } = body ?? {};
  const workerEmail = emailAddress(body?.workerEmail);
  const instructions = cleanText(body?.instructions);
  if (typeof siteId !== 'string' || !validDate(startDate) || !Number.isInteger(repeatDays)
    || repeatDays < 1 || repeatDays > 365 || instructions.length > 500 || !workerEmail) {
    throw new HttpError(400, '현장, 담당 작업자, 첫 작업일과 반복 주기를 확인해 주세요.');
  }
  if (workerEmail === ownerEmail) {
    await db.prepare(`INSERT INTO members(email,user_id,name,role,active,updated_at)
      SELECT ?,?,?,'admin',1,? FROM work_sites WHERE id=?
      ON CONFLICT(email) DO UPDATE SET user_id=COALESCE(members.user_id,excluded.user_id),role='admin',active=1`)
      .bind(ownerEmail,account.email === ownerEmail ? account.id : null,'본연 관리자',nowIso(),siteId).run();
  }
  const result = await db.prepare(`
    INSERT INTO work_plans (site_id, worker_email, start_date, repeat_days, instructions, updated_at, history_actor)
    SELECT w.id, m.email, ?, ?, ?, ?, ? FROM work_sites w JOIN members m
    WHERE w.id = ? AND m.email = ? AND m.role IN ('cleaner','admin') AND m.active = 1
    ON CONFLICT(site_id) DO UPDATE SET worker_email = excluded.worker_email, start_date = excluded.start_date,
      repeat_days = excluded.repeat_days, instructions = excluded.instructions, updated_at = excluded.updated_at, history_actor = excluded.history_actor,
      delay_date = CASE WHEN work_plans.start_date = excluded.start_date AND work_plans.repeat_days = excluded.repeat_days
                    THEN work_plans.delay_date ELSE NULL END
  `).bind(startDate, repeatDays, instructions, nowIso(), account.name || account.email, siteId, workerEmail).run();
  if (!result.meta.changes) throw new HttpError(404, '현장 또는 활성 상태의 청소 작업자를 찾을 수 없습니다.');
}

async function saveWorkDelay(db, body, account, admin, { HttpError, validDate, koreaDate }) {
  const { siteId, dueDate } = body ?? {};
  const reason = cleanText(body?.reason);
  if (typeof siteId !== 'string' || !validDate(dueDate) || dueDate >= koreaDate()
    || typeof body?.reason !== 'string' || reason.length > 500) {
    throw new HttpError(400, '지연된 작업의 예정일과 사유를 확인해 주세요.');
  }
  const result = await db.prepare(`
    UPDATE work_plans SET delay_date = ?, delay_reason = ?, updated_at = ?, history_actor = ?
    WHERE site_id = ? AND (? OR worker_email = ?)
      AND EXISTS (SELECT 1 FROM work_plan_cycles p WHERE p.site_id = work_plans.site_id AND p.next_due = ?)
  `).bind(dueDate, reason, nowIso(), account.name || account.email, siteId, Number(admin), account.email, dueDate).run();
  if (!result.meta.changes) throw new HttpError(409, '담당 작업이 아니거나 지연된 작업이 바뀌었습니다. 목록을 다시 확인해 주세요.');
}

async function readEvidenceForm(request, env, { HttpError }) {
  const origin = request.headers.get('Origin');
  if (!origin || ![new URL(request.url).origin, env.BONYEON_SITE_ORIGIN].includes(origin)) {
    throw new HttpError(403, '사이트 화면에서 다시 시도해 주세요.');
  }
  const type = request.headers.get('Content-Type');
  if (!type?.startsWith('multipart/form-data;')) throw new HttpError(415, '사진과 작업 정보를 함께 선택해 주세요.');
  if (Number(request.headers.get('Content-Length')) > uploadLimit) throw new HttpError(413, '사진을 합해 5MB 미만으로 올려 주세요.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, '작업 증빙이 비어 있습니다.');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > uploadLimit) {
        await reader.cancel();
        throw new HttpError(413, '사진을 합해 5MB 미만으로 올려 주세요.');
      }
      chunks.push(value);
    }
    return await new Response(new Blob(chunks), { headers: { 'Content-Type': type } }).formData();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, '사진과 작업 정보를 읽지 못했습니다.');
  } finally {
    reader.releaseLock();
  }
}

async function saveWorkEvidence(request, env, account, admin, context) {
  const { HttpError, validDate, koreaDate } = context;
  const { DB: db, BUCKET: bucket } = env;
  if (!bucket) throw new HttpError(503, '증빙 사진 저장소가 아직 연결되지 않았습니다.');
  const form = await readEvidenceForm(request, env, context);
  const siteId = cleanText(form.get('siteId'));
  const workDate = cleanText(form.get('workDate'));
  const assetCode = cleanText(form.get('assetCode')).normalize('NFKC').toUpperCase();
  const issue = cleanText(form.get('issue'));
  const exterior = form.get('exterior') === '1';
  const interior = form.get('interior') === '1';
  const safety = form.get('safety') === '1';
  const chargerType = form.get('chargerType') ?? 'unknown';
  const canopy = form.get('canopy') ?? 'unknown';
  const workResults = normalizeWorkResults(Object.fromEntries(form));
  if (!siteId || siteId.length > 80 || !validDate(workDate) || workDate > koreaDate()
    || !assetCode || assetCode.length > 100 || issue.length > 800 || (!exterior && !interior) || !safety
    || !chargerTypes.includes(chargerType) || !canopyScopes.includes(canopy) || !workResults) {
    throw new HttpError(400, '현장, 작업일, 충전기 식별 코드, 청소 범위와 안전 점검을 확인해 주세요.');
  }
  const priorRegistration=await db.prepare('SELECT 1 FROM charger_evidence WHERE site_id=? AND work_date=? AND asset_code=? AND author_id=?')
    .bind(siteId,workDate,assetCode,account.id).first();
  let guidance=null;
  if(!priorRegistration) {
  const canSubmit = await db.prepare(`
    SELECT w.id FROM work_sites w WHERE w.id = ?
      AND (? OR EXISTS (SELECT 1 FROM work_plans p WHERE p.site_id = w.id AND p.worker_email = ?))
  `).bind(siteId, Number(admin), account.email).first();
  if (!canSubmit) throw new HttpError(403, '배정받은 현장에만 작업 증빙을 등록할 수 있습니다.');
  guidance = admin ? null : await siteGuidance(db,siteId,account,context);
  if (guidance && !guidance.confirmedAt) throw new HttpError(409, '현장의 최신 청소 안내를 먼저 확인해 주세요.');
  }
  const safetyChecklist = admin ? {} : readGuidedChecklist(form,interior,HttpError);
  const zoneId=cleanText(form.get('zoneId')) || null;
  const activeSlots = photoSlots.filter(slot => slot.startsWith('exterior') ? exterior : interior);
  const usesCamera = !env.BONYEON_VERIFICATION_MODE || form.has('captureIds');
  const captured = usesCamera ? captureSelectionIds(form.get('captureIds'),HttpError) : [];
  const photos = [];
  if (!usesCamera) for (const slot of activeSlots) photos.push([slot, await validateProofJpeg(form.get(slot), HttpError, env.JPEG_VALIDATE)]);
  const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',value)),byte=>byte.toString(16).padStart(2,'0')).join('');
  const fileHashes=await Promise.all(photos.map(async([slot,bytes])=>[slot,await digest(bytes)]));
  const signature=(values)=>JSON.stringify([siteId,workDate,assetCode,account.id,...values]);
  const internalWork=Number(account.role==='cleaner' && account.canSwitchMode===true);
  const requestText=signature([zoneId,Number(exterior),Number(interior),issue,chargerType,canopy,workResults,safetyChecklist,
    internalWork,captured.toSorted(),fileHashes]);
  const submissionHash=await digest(new TextEncoder().encode(requestText));
  async function registered() {
    const previous=await db.prepare('SELECT * FROM charger_evidence WHERE site_id=? AND work_date=? AND asset_code=? AND author_id=?')
      .bind(siteId,workDate,assetCode,account.id).first();
    if (!previous) return null;
    const legacy=previous.submission_hash===null && usesCamera && signature([previous.zone_id,previous.exterior,previous.interior,
      previous.issue,previous.charger_type,previous.canopy,normalizeWorkResults(JSON.parse(previous.result_detail)),JSON.parse(previous.safety_checklist),
      previous.internal_work,JSON.parse(previous.capture_ids).toSorted(),[]])===requestText;
    if (previous.submission_hash!==submissionHash && !legacy) throw new HttpError(409,'이미 저장된 충전기입니다. 등록 내용이 달라 다시 저장할 수 없습니다. 작업 이력에서 저장된 증빙을 확인해 주세요.');
    return previous.id;
  }
  const existing=await registered();
  if (existing) return existing;
  await validateWorkZone(db,siteId,zoneId,HttpError);
  if (usesCamera) try {
    await readCaptureSelection(db,form.get('captureIds'),[siteId,workDate,assetCode,zoneId,account.id],activeSlots,HttpError);
  } catch(error) {
    const concurrent=await registered();
    if(concurrent)return concurrent;
    throw error;
  }
  const captureJson = JSON.stringify(captured);
  const id = crypto.randomUUID();
  try {
    const saved = await Promise.allSettled(photos.map(([slot, bytes]) =>
      bucket.put(objectKey(id, slot), bytes, { httpMetadata: { contentType: 'image/jpeg' } })));
    if (saved.some(item => item.status === 'rejected')) throw new HttpError(502, '증빙 사진을 저장하지 못했습니다.');
    const result = await db.prepare(`
      INSERT INTO charger_evidence (id, site_id, work_date, asset_code, author_id, author_name,
                                    exterior, interior, safety_checked, issue, created_at, charger_type, canopy, result_detail, zone_id, capture_ids, history_actor,device_number,internal_work,safety_checklist,submission_hash)
      SELECT ?, w.id, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?,
        CASE WHEN ? LIKE 'AUTO-%' THEN COALESCE(
          (SELECT device_number FROM charger_evidence WHERE site_id=w.id AND asset_code=? AND device_number IS NOT NULL LIMIT 1),
          (SELECT COALESCE(MAX(device_number),0)+1 FROM charger_evidence WHERE site_id=w.id)) END,?,?,?
      FROM work_sites w LEFT JOIN work_progress g ON g.site_id=w.id
      LEFT JOIN work_plan_cycles cycle ON cycle.site_id=w.id WHERE w.id = ?
        AND (? OR EXISTS (SELECT 1 FROM work_plan_cycles p WHERE p.site_id=w.id AND p.worker_email=?
          AND p.next_due=? AND COALESCE(NULLIF(p.instructions,''),w.work_note,'')=?))
        AND (? IS NULL OR EXISTS (SELECT 1 FROM work_zones z WHERE z.id=? AND z.site_id=w.id AND z.deleted_at IS NULL))
        AND NOT EXISTS (SELECT 1 FROM settlement_months WHERE month = substr(?, 1, 7))
        AND NOT EXISTS (SELECT 1 FROM field_reports r WHERE r.site_id=w.id AND ? BETWEEN COALESCE(r.progress_from,r.work_date) AND r.work_date AND r.status='approved')
        AND ? >= COALESCE(g.first_date,cycle.evidence_from,?)
        AND NOT EXISTS (SELECT 1 FROM charger_evidence prior
          WHERE prior.site_id=w.id AND upper(trim(prior.asset_code))=?
            AND prior.work_date>=COALESCE(g.first_date,cycle.evidence_from,?)
            AND (g.site_id IS NOT NULL OR cycle.site_id IS NOT NULL OR prior.work_date=?))
        AND (SELECT COUNT(*) FROM work_camera_photos p WHERE p.id IN (SELECT value FROM json_each(?))
          AND p.site_id = w.id AND p.work_date = ? AND p.asset_code = ? AND p.zone_id IS ? AND p.author_id = ? AND p.evidence_id IS NULL) = ?
      ON CONFLICT(site_id, work_date, asset_code) DO NOTHING
    `).bind(id, workDate, assetCode, account.id, account.name || '본연 작업자', Number(exterior),
      Number(interior), issue, nowIso(), chargerType, canopy, JSON.stringify(workResults), zoneId, captureJson, account.name || account.email,
      assetCode,assetCode,internalWork,JSON.stringify(safetyChecklist),submissionHash,
      siteId,Number(admin),account.email,guidance?.assignmentDue ?? null,guidance?.instructions ?? null,zoneId,zoneId,
      workDate,workDate,workDate,workDate,assetCode,workDate,workDate,captureJson,workDate,assetCode,zoneId,account.id,captured.length).run();
    if (!result.meta.changes) {
      const concurrent=await registered();
      if (concurrent) {await Promise.allSettled(photos.map(([slot])=>bucket.delete(objectKey(id,slot))));return concurrent;}
      throw new HttpError(409, '이미 등록된 충전기이거나, 승인·마감된 작업 또는 배정이 변경된 현장입니다.');
    }
  } catch (error) {
    const receipt=await db.prepare('SELECT submission_hash FROM charger_evidence WHERE id=? AND author_id=?')
      .bind(id,account.id).first().catch(()=>undefined);
    if (receipt?.submission_hash===submissionHash) return id;
    if (receipt===null) await Promise.allSettled(photos.map(([slot]) => bucket.delete(objectKey(id, slot))));
    throw error;
  }
  return id;
}

async function removeWorkEvidence(db, env, body, account, admin, { HttpError }) {
  const { id } = body ?? {};
  if (!isUuid(id)) throw new HttpError(400, '삭제할 작업 증빙을 선택해 주세요.');
  const { results: captures } = await db.prepare('SELECT id FROM work_camera_photos WHERE evidence_id = ?').bind(id).all();
  const result = await db.prepare(`
    DELETE FROM charger_evidence AS e WHERE e.id = ? AND (? OR e.author_id = ?)
      AND NOT EXISTS (SELECT 1 FROM settlement_months WHERE month = substr(e.work_date, 1, 7))
      AND NOT EXISTS (SELECT 1 FROM field_reports r WHERE r.site_id=e.site_id AND e.work_date BETWEEN COALESCE(r.progress_from,r.work_date) AND r.work_date AND r.status='approved')
  `).bind(id, Number(admin), account.id).run();
  if (!result.meta.changes) throw new HttpError(409, '삭제할 수 있는 승인 전 증빙이 아닙니다.');
  if (env.BUCKET) await Promise.allSettled([
    ...photoSlots.map(slot => env.BUCKET.delete(objectKey(id, slot))),
    ...captures.map(photo => env.BUCKET.delete(cameraPhotoKey(photo.id))),
  ]);
}

async function moveWorkEvidenceZones(db,{ zoneId,moves },account,admin,{ HttpError }) {
  if (!isUuid(zoneId) || !Array.isArray(moves) || moves.length<1 || moves.length>200
    || moves.some(move=>!isUuid(move?.id) || (move.fromZoneId!==null && !isUuid(move.fromZoneId)))) {
    throw new HttpError(400,'이동할 작업 기록과 새 구역을 선택해 주세요.');
  }
  if (new Set(moves.map(move=>move.id)).size!==moves.length) throw new HttpError(400,'같은 작업 기록을 두 번 선택할 수 없습니다.');
  const selected = JSON.stringify(moves.map(({ id,fromZoneId })=>({ id,fromZoneId })));
  const { results: current } = await db.prepare(`
    SELECT e.id,e.site_id AS siteId,e.zone_id AS zoneId,(${openEvidencePeriod} AND (? OR (${workerCanMoveEvidenceZone}))) AS canMove
    FROM charger_evidence e JOIN json_each(?) item ON e.id=json_extract(item.value,'$.id')
    WHERE (? OR e.author_id=?)
  `).bind(Number(admin),account.id,account.email,selected,Number(admin),account.id).all();
  if (current.length!==moves.length) throw new HttpError(404,'선택한 작업 기록을 모두 찾을 수 없습니다.');
  if (current.some(row=>!row.canMove)) {
    throw new HttpError(403,'마감된 증빙은 이동할 수 없습니다. 승인된 증빙이나 배정이 끝난 증빙은 관리자에게 문의해 주세요.');
  }
  const { siteId } = current[0];
  if (current.some(row=>row.siteId!==siteId)) throw new HttpError(400,'같은 현장의 작업 기록만 함께 옮길 수 있습니다.');
  const target = await db.prepare('SELECT name FROM work_zones WHERE id=? AND site_id=? AND deleted_at IS NULL')
    .bind(zoneId,siteId).first();
  if (!target) throw new HttpError(400,'이 현장에 등록된 구역을 선택해 주세요.');
  const { results:changed } = await db.prepare(`
    WITH eligible AS (
      SELECT e.id FROM charger_evidence e JOIN json_each(?) item ON e.id=json_extract(item.value,'$.id')
      WHERE (e.zone_id IS json_extract(item.value,'$.fromZoneId') OR e.zone_id=?)
        AND ${openEvidencePeriod} AND (? OR (${workerCanMoveEvidenceZone}))
        AND EXISTS (SELECT 1 FROM work_zones z WHERE z.id=? AND z.site_id=e.site_id AND z.deleted_at IS NULL)
    )
    UPDATE charger_evidence AS e SET zone_id=?,history_actor=CASE WHEN e.zone_id IS NOT ? THEN ? ELSE e.history_actor END
    WHERE e.id IN (SELECT id FROM eligible) AND (SELECT COUNT(*) FROM eligible)=?
    RETURNING id
  `).bind(selected,zoneId,Number(admin),account.id,account.email,zoneId,zoneId,zoneId,account.name || account.email,moves.length).all();
  if (changed.length!==moves.length) {
    throw new HttpError(409,'작업 기록이나 구역이 변경되었습니다. 최신 내역을 열어 다시 시도해 주세요.');
  }
  return { zoneId,zoneName:target.name };
}

async function readWorkPhoto(env, id, slot, account, admin, { HttpError }) {
  if (!isUuid(id) || !photoSlots.includes(slot)) throw new HttpError(404, '사진을 찾을 수 없습니다.');
  const access = await env.DB.prepare('SELECT exterior, interior FROM charger_evidence WHERE id = ? AND (? OR author_id = ?)')
    .bind(id, Number(admin), account.id).first();
  if (!access || (slot.startsWith('exterior') ? !access.exterior : !access.interior)) {
    throw new HttpError(404, '사진을 찾을 수 없습니다.');
  }
  let photo = await env.BUCKET?.get(objectKey(id, slot));
  if (!photo && env.BUCKET) {
    const capture = await env.DB.prepare('SELECT id FROM work_camera_photos WHERE evidence_id = ? AND slot = ? ORDER BY created_at, id LIMIT 1').bind(id, slot).first();
    if (capture) photo = await env.BUCKET.get(cameraPhotoKey(capture.id));
  }
  if (!photo) throw new HttpError(404, '사진을 찾을 수 없습니다.');
  return new Response(photo.body, { headers: {
    'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store',
    'Content-Security-Policy': "default-src 'none'; sandbox", 'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin',
  } });
}

async function updateWorkIssue(db, body, account, { HttpError }) {
  const { id, status } = body ?? {};
  const owner = cleanText(body?.owner);
  const note = cleanText(body?.note);
  if (!isUuid(id) || !['open', 'assigned', 'resolved'].includes(status) || owner.length > 80 || note.length > 500
    || (status !== 'open' && !owner) || (status === 'resolved' && !note)) {
    throw new HttpError(400, '후속 조치 상태, 담당자, 처리 내용을 확인해 주세요.');
  }
  const result = await db.prepare(`UPDATE charger_evidence SET followup_status = ?, followup_owner = ?, followup_note = ?, history_actor = ?
    WHERE id = ? AND (issue <> '' OR json_extract(result_detail,'$.faultStatus')='issue')`)
    .bind(status, owner, note, account.name || account.email, id).run();
  if (!result.meta.changes) throw new HttpError(404, '후속 조치가 필요한 이상 사항을 찾을 수 없습니다.');
}

const incompleteSettlement = `r.status<>'approved' OR r.contract_price IS NULL
  OR (r.worker_price IS NULL AND r.units>r.internal_units) OR p.report_id IS NULL
  OR (p.billed>0 AND p.vat IS NULL)
  OR (json_array_length(p.worker_breakdown)=0 AND r.units>r.internal_units)
  OR (json_array_length(p.worker_breakdown)>0 AND (
    (SELECT SUM(json_extract(value,'$.units')) FROM json_each(p.worker_breakdown))<>r.units
    OR (SELECT SUM(json_extract(value,'$.paid')) FROM json_each(p.worker_breakdown))<>p.paid
    OR (SELECT COALESCE(SUM(CASE WHEN json_extract(value,'$.internal')=1 THEN json_extract(value,'$.units') ELSE 0 END),0)
      FROM json_each(p.worker_breakdown))<>r.internal_units))
  OR EXISTS(SELECT 1 FROM json_each(p.worker_breakdown)
    WHERE json_extract(value,'$.paid')>0 AND COALESCE(json_extract(value,'$.paidDate'),'')='')`;

async function readSettlementLedger(db, month, ownerEmail) {
  const close = await db.prepare('SELECT closed_at AS closedAt, closed_by AS closedBy FROM settlement_months WHERE month = ?')
    .bind(month).first();
  const { results: rows } = await db.prepare(`
    SELECT r.id, r.site_name AS siteName, r.author_name AS authorName, r.work_date AS workDate, r.units, r.status,
           r.contract_price AS contractPrice, r.worker_price AS workerPrice,r.internal_work AS internalWork,r.internal_units AS recordedInternalUnits,
           COALESCE(p.billed, 0) AS billed, COALESCE(p.received, 0) AS received, COALESCE(p.paid, 0) AS paid,
           COALESCE(p.billing_ref, '') AS billingRef, COALESCE(p.note, '') AS note,
           p.vat, COALESCE(p.worker_breakdown, '[]') AS workerBreakdown,
           m.email AS reportWorkerEmail,m.name AS reportWorkerName,m.role AS reportWorkerRole,
            COALESCE(p.payment_version, 0) AS paymentVersion,(${incompleteSettlement}) AS closeBlocked
    FROM field_reports r LEFT JOIN settlement_payments p ON p.report_id = r.id
    LEFT JOIN members m ON m.user_id=r.author_id AND m.role IN ('cleaner','admin')
    WHERE r.work_date LIKE ? ORDER BY r.work_date, r.site_name, r.id
  `).bind(month + '-%').all();
  const { results: workers } = await db.prepare("SELECT email,name,role='admin' AS internal FROM members WHERE role IN ('cleaner','admin') ORDER BY name,email").all();
  if (ownerEmail && !workers.some(worker => worker.email===ownerEmail)) workers.unshift({ email:ownerEmail,name:'본연 관리자',internal:1 });
  return { close, workers, rows: rows.map(row => {
    const workerBreakdown = JSON.parse(row.workerBreakdown);
    const suggestedWorker = !workerBreakdown.length && row.reportWorkerEmail && row.recordedInternalUnits===0
      && row.reportWorkerRole==='cleaner';
    const displayWorkers = suggestedWorker ? [{ email:row.reportWorkerEmail,name:row.reportWorkerName,
      units:row.units,paid:row.paid,paidDate:'' }] : workerBreakdown;
    return { ...row,workerBreakdown:displayWorkers,suggestedWorker:Boolean(suggestedWorker),internalUnits:internalWorkUnits(row,workerBreakdown) };
  }) };
}

async function closeSettlement(db, month, account, { HttpError, koreaDate, validDate }) {
  if (!hasMonth(month, validDate) || month >= koreaDate().slice(0, 7)) {
    throw new HttpError(400, '이미 지난 달만 결산 마감할 수 있습니다.');
  }
  const result = await db.prepare(`
    INSERT INTO settlement_months (month, closed_at, closed_by)
    SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM field_reports WHERE work_date LIKE ?)
      AND NOT EXISTS (SELECT 1 FROM field_reports r LEFT JOIN settlement_payments p ON p.report_id=r.id
        WHERE r.work_date LIKE ? AND (${incompleteSettlement}))
    ON CONFLICT(month) DO NOTHING
  `).bind(month, nowIso(), account.name || account.email, month + '-%', month + '-%').run();
  if (!result.meta.changes) throw new HttpError(409, '마감 전 승인·단가·청구 금액·부가세·실제 작업자 배분·지급일을 확인해 주세요. 금액이 없는 건도 0원으로 저장해야 합니다. 이미 마감된 달은 다시 마감할 수 없습니다.');
}

async function saveSettlementPayments(db, body, account, ownerEmail, { HttpError, validDate, koreaDate, emailAddress }) {
  const { id, billed, received, paid, vat, workers, paymentVersion } = body ?? {};
  const billingRef = cleanText(body?.billingRef);
  const note = cleanText(body?.note);
  const reason = cleanText(body?.changeReason);
  const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
  if (!isUuid(id) || ![billed, received, paid].every(nonnegative)
    || (vat != null && (!nonnegative(vat) || vat > billed))
    || received > billed || billingRef.length > 100 || note.length > 400 || reason.length > 400) {
    throw new HttpError(400, '원 단위 금액을 확인해 주세요. 입금액과 부가세는 청구 합계를 넘을 수 없습니다.');
  }
  if (!nonnegative(paymentVersion)) {
    throw new HttpError(400, '정산 내역의 버전을 확인해 주세요.');
  }
  const expectedVersion = paymentVersion;
  const source = await db.prepare(`
    SELECT r.units,r.internal_units,r.author_id,m.email,m.name,m.role,p.worker_breakdown,p.paid
    FROM field_reports r LEFT JOIN members m ON m.user_id=r.author_id AND m.role IN ('cleaner','admin')
    LEFT JOIN settlement_payments p ON p.report_id=r.id WHERE r.id=?
  `).bind(id).first();
  if (!source) throw new HttpError(404,'정산할 보고를 찾을 수 없습니다.');
  const existingWorkers = JSON.parse(source.worker_breakdown || '[]');
  let requestedWorkers = workers;
  if (requestedWorkers===undefined && existingWorkers.length) requestedWorkers=existingWorkers;
  if (requestedWorkers === undefined && !existingWorkers.length && paid>0
    && source.role==='cleaner' && source.internal_units===0) {
    requestedWorkers=[{ email:source.email,units:source.units,paid,paidDate:'' }];
  }
  if (Array.isArray(requestedWorkers) && requestedWorkers.length===0 && (existingWorkers.length || paid>0)) {
    throw new HttpError(409,'실제 작업자 귀속을 비울 수 없습니다. 작업자별 수량과 지급액을 입력해 주세요.');
  }
  if (requestedWorkers===undefined && !existingWorkers.length && paid>0 && source.paid!==paid) {
    throw new HttpError(409,'지급할 실제 작업자를 입력해 주세요. 기존 내역은 보고 작성자를 확인해 배정할 수 있습니다.');
  }
  let breakdown = null;
  let allocatedUnits = null;
  let allocatedInternal = null;
  if (requestedWorkers !== undefined) {
    if (!Array.isArray(requestedWorkers) || requestedWorkers.length > 100) throw new HttpError(400, '실제 작업자 내역을 확인해 주세요.');
    const names = new Map(existingWorkers.map(row => [row.email, { name:row.name,internal:Boolean(row.internal) }]));
    const { results } = await db.prepare("SELECT email,name,role='admin' AS internal FROM members WHERE role IN ('cleaner','admin')").all();
    for (const member of results) if (!names.has(member.email)) names.set(member.email,member);
    if (ownerEmail) names.set(ownerEmail,{ name:'본연 관리자',internal:true });
    const seen = new Set();
    let totalInternal = 0n;
    let totalUnits = 0n;
    let totalPaid = 0n;
    const entries = requestedWorkers.map(row => {
      const email = emailAddress(row?.email);
      const { units, paid: amount, paidDate = '' } = row ?? {};
      if (!email || !names.has(email) || seen.has(email) || !nonnegative(units) || units < 1
        || !nonnegative(amount) || typeof paidDate !== 'string' || (paidDate && (!validDate(paidDate) || paidDate > koreaDate()))) {
        throw new HttpError(400, '등록된 실제 작업자, 중복 여부, 실작업 수량, 지급액과 지급일을 확인해 주세요.');
      }
      const worker = names.get(email);
      if (worker.internal && (amount > 0 || paidDate)) throw new HttpError(400,'관리자 직접 작업에는 지급액과 지급일을 입력할 수 없습니다.');
      seen.add(email);
      totalUnits += BigInt(units);
      if (worker.internal) totalInternal += BigInt(units);
      totalPaid += BigInt(amount);
      return { email,name:worker.name,units,paid:amount,paidDate,...(worker.internal ? { internal:true } : {}) };
    });
    if (entries.length && (totalPaid !== BigInt(paid) || totalUnits > BigInt(Number.MAX_SAFE_INTEGER))) {
      throw new HttpError(400, '작업자별 지급액의 합계와 전체 지급액을 맞춰 주세요.');
    }
    breakdown = JSON.stringify(entries);
    allocatedUnits = entries.length ? Number(totalUnits) : null;
    allocatedInternal = entries.length ? Number(totalInternal) : null;
  }
  const result = await db.prepare(`
    INSERT INTO settlement_payments (report_id, billed, received, paid, billing_ref, note, updated_at, vat, worker_breakdown, history_actor, history_reason)
    SELECT id, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, '[]'), ?, ? FROM field_reports WHERE id = ? AND status = 'approved'
      AND (internal_units<units OR ?=0)
      AND (? IS NULL OR units = ?)
      AND (? IS NULL OR internal_units = ?)
      AND ? = COALESCE((SELECT payment_version FROM settlement_payments WHERE report_id = field_reports.id), 0)
      AND (? <> '' OR NOT EXISTS (SELECT 1 FROM settlement_months WHERE month = substr(field_reports.work_date,1,7)))
      AND (EXISTS(SELECT 1 FROM settlement_payments WHERE report_id=field_reports.id)
        OR NOT EXISTS(SELECT 1 FROM settlement_months WHERE month=substr(field_reports.work_date,1,7))
        OR EXISTS(SELECT 1 FROM settlement_snapshots s WHERE s.report_id=field_reports.id
          AND s.month=substr(field_reports.work_date,1,7) AND json_extract(s.data,'$.billed')=?
          AND COALESCE(json_extract(s.data,'$.billingRef'),'')=?
          AND (?=0 OR json_extract(s.data,'$.vat') IS NULL OR json_extract(s.data,'$.vat') IS ?)))
    ON CONFLICT(report_id) DO UPDATE SET billed = excluded.billed, received = excluded.received,
      paid = excluded.paid, billing_ref = excluded.billing_ref, note = excluded.note, updated_at = excluded.updated_at,
      history_actor = excluded.history_actor, history_reason = excluded.history_reason,
      vat = CASE WHEN ? THEN excluded.vat ELSE settlement_payments.vat END,
      worker_breakdown = COALESCE(?, settlement_payments.worker_breakdown),
      payment_version = settlement_payments.payment_version + 1
    WHERE (? IS NOT NULL OR json_array_length(settlement_payments.worker_breakdown) = 0 OR settlement_payments.paid = excluded.paid)
      AND (? OR settlement_payments.vat IS NULL OR settlement_payments.vat <= excluded.billed)
      AND (NOT EXISTS (SELECT 1 FROM field_reports r JOIN settlement_months c ON c.month=substr(r.work_date,1,7)
             WHERE r.id=settlement_payments.report_id)
        OR (settlement_payments.billed=excluded.billed AND settlement_payments.billing_ref=excluded.billing_ref
          AND (?=0 OR settlement_payments.vat IS NULL OR settlement_payments.vat IS excluded.vat)))
  `).bind(billed, received, paid, billingRef, note, nowIso(), vat ?? null, breakdown, account.name || account.email, reason, id,paid,allocatedUnits,
    allocatedUnits, allocatedInternal, allocatedInternal, expectedVersion, reason,billed,billingRef,Number(vat!==undefined),vat??null,
    Number(vat !== undefined), breakdown, breakdown,
    Number(vat !== undefined), Number(vat !== undefined)).run();
  if (result.meta.changes) return;
  const saved = await db.prepare('SELECT payment_version AS version FROM settlement_payments WHERE report_id = ?').bind(id).first();
  if ((saved?.version ?? 0) !== expectedVersion) {
    throw new HttpError(409, '다른 곳에서 이 정산 내역을 변경했습니다. 정산 새로고침 후 최신 금액을 확인해 주세요.');
  }
  if (!reason && await db.prepare(`SELECT 1 FROM field_reports r JOIN settlement_months c ON c.month=substr(r.work_date,1,7)
    WHERE r.id=?`).bind(id).first()) throw new HttpError(409, '마감 후 입금·지급을 변경하려면 사유를 입력해 주세요.');
  throw new HttpError(409, '승인 상태, 관리자 직접 작업 수량, 마감된 청구 내역과 작업자별 지급액을 확인해 주세요.');
}

const openEvidencePeriod = `NOT EXISTS (
  SELECT 1 FROM settlement_months c WHERE c.month=substr(e.work_date,1,7)
    OR EXISTS (SELECT 1 FROM field_reports r WHERE r.site_id=e.site_id AND c.month=substr(r.work_date,1,7)
      AND e.work_date BETWEEN COALESCE(r.progress_from,r.work_date) AND r.work_date)
)`;

export async function handleWorkflows(path, request, env, account, context) {
  const { requireRole, readJson, json, HttpError, validDate, koreaDate } = context;
  const db = env.DB;
  const method = request.method;
  const admin = ['owner', 'admin'].includes(account.role);
  requireRole(account, 'viewer');
  if (!admin && account.role !== 'cleaner') throw new HttpError(403, '현장 작업 권한이 없습니다.');
  const url = new URL(request.url);
  if (path === '/api/work/guidance' && ['GET','PUT'].includes(method)) {
    if (account.role !== 'cleaner') throw new HttpError(403,'작업자 화면에서 확인해 주세요.');
    if (method === 'GET') return json(await siteGuidance(db,url.searchParams.get('siteId'),account,context));
    const { siteId,version,assignmentDue,confirmed } = (await readJson(request,env)) ?? {};
    const guidance = await siteGuidance(db,siteId,account,context);
    if (confirmed !== true || version !== guidance.version || assignmentDue !== guidance.assignmentDue) {
      throw new HttpError(409,'현장 안내가 변경되었습니다. 다시 열어 확인해 주세요.');
    }
    await db.prepare(`
      INSERT INTO work_guidance_receipts (site_id,author_id,assignment_due,version,confirmed_at)
      SELECT p.site_id,?,?,?,? FROM work_plan_cycles p JOIN work_sites w ON w.id=p.site_id
      WHERE p.site_id=? AND p.worker_email=? AND p.next_due=? AND COALESCE(NULLIF(p.instructions,''),w.work_note,'')=?
      ON CONFLICT(site_id,author_id,assignment_due,version) DO NOTHING
    `).bind(account.id,assignmentDue,version,nowIso(),siteId,account.email,assignmentDue,guidance.instructions).run();
    const saved = await siteGuidance(db,siteId,account,context);
    if (saved.version !== version || saved.assignmentDue !== assignmentDue || !saved.confirmedAt) {
      throw new HttpError(409,'현장 안내가 변경되었습니다. 다시 열어 확인해 주세요.');
    }
    return json(saved);
  }
  if (['/api/work/zones', '/api/work/captures', '/api/work/capture'].includes(path)) {
    return handleCameraWork(path, request, env, account, admin, context, readEvidenceForm);
  }
  if (path === '/api/work/completion-counts' && method === 'GET') {
    return json(await readWorkCompletion(db,url.searchParams.get('siteId'),url.searchParams.get('workDate'),account,context));
  }
  if (path === '/api/work/overview' && method === 'GET') {
    const month = url.searchParams.get('month') || koreaDate().slice(0, 7);
    if (!hasMonth(month, validDate)) throw new HttpError(400, '조회할 월을 확인해 주세요.');
    return json({ ...await readWorkflows(db,month,account,admin,context.emailAddress(env.BONYEON_OWNER_EMAIL)),photoReady:Boolean(env.BUCKET) });
  }
  if (path === '/api/work/delay' && method === 'PATCH') {
    await saveWorkDelay(db, await readJson(request, env), account, admin, context);
    return json({ ok: true });
  }
  if (path === '/api/work/evidence' && method === 'POST') {
    return json({ id: await saveWorkEvidence(request, env, account, admin, context) }, 201);
  }
  if (path === '/api/work/evidence' && method === 'DELETE') {
    await removeWorkEvidence(db, env, await readJson(request, env), account, admin, context);
    return json({ ok: true });
  }
  if (path === '/api/work/evidence/zone' && method === 'PATCH') {
    const body = (await readJson(request,env)) ?? {};
    return json(await moveWorkEvidenceZones(db,{ zoneId:body.zoneId,moves:[body] },account,admin,context));
  }
  if (path === '/api/work/evidence/zones' && method === 'PATCH') {
    const body = (await readJson(request,env)) ?? {};
    const result = await moveWorkEvidenceZones(db,body,account,admin,context);
    return json({ ...result,count:body.moves.length });
  }
  if (path === '/api/work/photo' && method === 'GET') {
    return await readWorkPhoto(env, url.searchParams.get('id'), url.searchParams.get('slot'), account, admin, context);
  }
  requireRole(account, 'admin');
  if (path === '/api/work/site-quantity' && method === 'PATCH') {
    const { siteId, plannedUnits } = (await readJson(request,env)) ?? {};
    if (typeof siteId !== 'string' || !siteId || siteId.length > 80 || !Number.isInteger(plannedUnits) || plannedUnits < 1 || plannedUnits > 10000) {
      throw new HttpError(400, '현장과 배정 설비 수량을 1~10,000기 사이로 입력해 주세요.');
    }
    const result = await db.prepare('UPDATE work_sites SET planned_units=?,history_actor=? WHERE id=?')
      .bind(plannedUnits,account.name || account.email,siteId).run();
    if (!result.meta.changes) throw new HttpError(404, '현장을 찾을 수 없습니다.');
    return json({ ok: true });
  }
  if (path === '/api/work/evidence/result' && method === 'PATCH') {
    const body = (await readJson(request, env)) ?? {};
    const values = normalizeWorkResults(body);
    if (!isUuid(body.id) || !values) throw new HttpError(400, '네 항목의 작업 결과를 확인해 주세요. 이상 발견 시 메모가 필요합니다.');
    const saved = await db.prepare(`UPDATE charger_evidence AS e SET result_detail = ?, history_actor = ? WHERE id = ? AND ${openEvidencePeriod}`)
      .bind(JSON.stringify(values), account.name || account.email, body.id).run();
    if (!saved.meta.changes) throw new HttpError(409, '수정 가능한 미마감 작업 증빙을 확인해 주세요.');
    return json({ ok: true });
  }
  if (path === '/api/work/evidence/classification' && method === 'PATCH') {
    const { id, chargerType, canopy } = (await readJson(request, env)) ?? {};
    if (!isUuid(id) || !chargerTypes.includes(chargerType) || !canopyScopes.includes(canopy)) {
      throw new HttpError(400, '기기 유형과 캐노피 포함 여부를 확인해 주세요.');
    }
    const result = await db.prepare(`UPDATE charger_evidence AS e SET charger_type = ?, canopy = ?, history_actor = ? WHERE id = ? AND ${openEvidencePeriod}`)
      .bind(chargerType, canopy, account.name || account.email, id).run();
    if (!result.meta.changes) throw new HttpError(409, '수정 가능한 미마감 작업 증빙을 확인해 주세요.');
    return json({ ok: true });
  }
  if (path === '/api/work/plan' && method === 'PUT') {
    await saveWorkPlan(db,await readJson(request,env),account,context.emailAddress(env.BONYEON_OWNER_EMAIL),context);
    return json({ ok: true });
  }
  if (path === '/api/work/plan' && method === 'DELETE') {
    const { siteId } = (await readJson(request, env)) ?? {};
    if (typeof siteId !== 'string') throw new HttpError(400, '현장을 선택해 주세요.');
    await db.prepare('DELETE FROM work_plans WHERE site_id = ?').bind(siteId).run();
    return json({ ok: true });
  }
  if (path === '/api/work/issue' && method === 'PATCH') {
    await updateWorkIssue(db, await readJson(request, env), account, context);
    return json({ ok: true });
  }
  if (path === '/api/work/settlement' && method === 'GET') {
    const month = url.searchParams.get('month');
    if (!hasMonth(month, validDate)) throw new HttpError(400, '조회할 결산 월을 확인해 주세요.');
    return json(await readSettlementLedger(db, month, context.emailAddress(env.BONYEON_OWNER_EMAIL)));
  }
  if (path === '/api/work/settlement/export' && method === 'GET') {
    const month = url.searchParams.get('month');
    if (!hasMonth(month, validDate)) throw new HttpError(400, '내려받을 결산 월을 확인해 주세요.');
    const close = await db.prepare('SELECT closed_at AS closedAt, closed_by AS closedBy FROM settlement_months WHERE month=?').bind(month).first();
    if (!close) return json(await readSettlementLedger(db, month, context.emailAddress(env.BONYEON_OWNER_EMAIL)));
    const { results } = await db.prepare('SELECT data,legacy FROM settlement_snapshots WHERE month=? ORDER BY report_id').bind(month).all();
    if (!results.length) throw new HttpError(409, '마감 시점에 저장된 정산 자료가 없습니다.');
    return json({ close, legacy: results.some(row => row.legacy), rows: results.map(({data}) => {
      const row = JSON.parse(data);
      return { ...row,internalUnits:internalWorkUnits(row,row.workerBreakdown) };
    }) });
  }
  if (path === '/api/work/settlement/close' && method === 'POST') {
    await closeSettlement(db, (await readJson(request, env))?.month, account, context);
    return json({ ok: true });
  }
  if (path === '/api/work/settlement/payments' && method === 'PATCH') {
    await saveSettlementPayments(db, await readJson(request, env), account, context.emailAddress(env.BONYEON_OWNER_EMAIL), context);
    return json({ ok: true });
  }
  throw new HttpError(404, '요청한 현장 관제 기능을 찾을 수 없습니다.');
}
