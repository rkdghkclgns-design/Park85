const progressText = value => typeof value === 'string' ? value.trim() : '';
const progressNumber = value => Number.isSafeInteger(value) && value >= 0 && value <= 10000;
const progressAdmin = account => ['owner', 'admin'].includes(account.role);

export const workerCanMoveEvidenceZone = `
  e.author_id=? AND EXISTS (SELECT 1 FROM work_plans p WHERE p.site_id=e.site_id AND p.worker_email=?)
  AND NOT EXISTS (SELECT 1 FROM settlement_months c WHERE c.month=substr(e.work_date,1,7))
  AND NOT EXISTS (SELECT 1 FROM field_reports r WHERE r.site_id=e.site_id AND r.status='approved'
    AND e.work_date BETWEEN COALESCE(r.progress_from,r.work_date) AND r.work_date)
`;

export function internalWorkUnits(row, workers = JSON.parse(row.worker_breakdown || '[]')) {
  return row.internal_units ?? row.recordedInternalUnits ?? (workers.length
    ? workers.reduce((sum,worker) => sum+(worker.internal ? worker.units : 0),0)
    : row.internal_work || row.internalWork ? row.units : 0);
}

export async function readWorkerEarnings(db,month,account) {
  const [{ results: planned },{ results: approved }] = await Promise.all([
    db.prepare(`SELECT COALESCE(g.planned_units,w.planned_units) AS units,c.worker_price AS rate
      FROM work_plans p JOIN work_sites w ON w.id=p.site_id LEFT JOIN work_progress g ON g.site_id=w.id
      LEFT JOIN site_reporting s ON s.site_id=w.id LEFT JOIN charger_regions c ON c.region_name=s.region_name
      WHERE p.worker_email=?`).bind(account.email).all(),
    db.prepare(`
      SELECT r.worker_price AS rate,r.units,r.internal_work AS internal,r.internal_units,r.author_id,
        COALESCE(p.worker_breakdown,'[]') AS workers,
        (SELECT COUNT(*) FROM charger_evidence e WHERE e.site_id=r.site_id AND e.author_id=? AND e.internal_work=1
          AND e.work_date BETWEEN COALESCE(r.progress_from,r.work_date) AND r.work_date) AS ownInternal
      FROM field_reports r LEFT JOIN settlement_payments p ON p.report_id=r.id
      WHERE r.status='approved' AND r.work_date LIKE ? AND (r.author_id=? OR EXISTS (
        SELECT 1 FROM json_each(p.worker_breakdown) b WHERE json_extract(b.value,'$.email')=?) OR EXISTS(
        SELECT 1 FROM charger_evidence e WHERE e.site_id=r.site_id AND e.author_id=? AND e.internal_work=1
          AND e.work_date BETWEEN COALESCE(r.progress_from,r.work_date) AND r.work_date))
    `).bind(account.id,month+'-%',account.id,account.email,account.id).all(),
  ]);
  const amount = rows => rows.reduce((sum,row) => row.units == null || row.rate == null ? sum : sum + BigInt(row.units)*BigInt(row.rate),0n).toString();
  const allocated = approved.flatMap(row => {
    const workers = JSON.parse(row.workers);
    const own = workers.find(worker => worker.email === account.email);
    if (own) return [{ units:own.units,rate:row.rate,internal:Boolean(own.internal) }];
    if (workers.length) return [];
    const ownInternal = row.ownInternal || (row.author_id===account.id && row.internal ? row.internal_units : 0);
    return [...(ownInternal ? [{ units:ownInternal,internal:true }] : []),
      ...(!row.internal && row.author_id===account.id && row.units>row.internal_units ? [{ units:row.units-row.internal_units,rate:row.rate,internal:false }] : [])];
  });
  const external = allocated.filter(row => !row.internal);
  return {
    expected:account.canSwitchMode ? '0' : amount(planned), approved:amount(external),
    unpriced:account.canSwitchMode ? 0 : planned.filter(row => row.rate == null || row.units == null).length,
    unapproved:external.filter(row => row.rate == null).length,
    internalUnits:allocated.filter(row => row.internal).reduce((sum,row) => sum+row.units,0),
    internalPlanned:account.canSwitchMode ? planned.reduce((sum,row) => sum+(row.units || 0),0) : 0,
  };
}

function validateProgressContext(siteId, day, { HttpError, validDate, koreaDate }) {
  if (typeof siteId !== 'string' || !siteId || siteId.length > 80 || !validDate(day) || day > koreaDate()) {
    throw new HttpError(400, '작업 현장과 작업일을 확인해 주세요.');
  }
}

export async function readWorkCompletion(db, siteId, day, account, context) {
  validateProgressContext(siteId, day, context);
  const admin = Number(progressAdmin(account));
  const row = await db.prepare(`
    SELECT COALESCE(g.planned_units,w.planned_units) AS plannedUnits,p.next_due AS assignmentDue, g.units AS previousUnits,
      g.exterior AS previousExterior,g.interior AS previousInterior,g.last_date AS progressDate,
      CASE WHEN ? OR g.author_id=? THEN g.notes ELSE '' END AS progressNotes,
      COUNT(DISTINCT upper(trim(e.asset_code))) AS units,
      COUNT(e.id)<>COUNT(DISTINCT upper(trim(e.asset_code))) AS duplicateEvidence,
      CASE WHEN COUNT(e.id)=COUNT(DISTINCT upper(trim(e.asset_code))) THEN COALESCE(SUM(e.exterior),0) ELSE 0 END AS exterior,
      CASE WHEN COUNT(e.id)=COUNT(DISTINCT upper(trim(e.asset_code))) THEN COALESCE(SUM(e.interior),0) ELSE 0 END AS interior
    FROM work_sites w LEFT JOIN work_plan_cycles p ON p.site_id=w.id
    LEFT JOIN work_progress g ON g.site_id=w.id
    LEFT JOIN charger_evidence e ON e.site_id=w.id AND e.work_date BETWEEN COALESCE(g.first_date,p.evidence_from,?) AND ?
      AND (g.site_id IS NOT NULL OR ? OR e.author_id=?)
    WHERE w.id=? AND (? OR p.worker_email=?) GROUP BY w.id
  `).bind(admin,account.id,day,day,admin,account.id,siteId,admin,account.email).first();
  if (!row) throw new context.HttpError(404, '배정된 현장을 찾을 수 없습니다.');
  const draft = await db.prepare('SELECT data,updated_at AS updatedAt FROM work_report_drafts WHERE site_id=? AND work_date=? AND author_id=?')
    .bind(siteId,day,account.id).first();
  const saved=draft && JSON.parse(draft.data);
  const current=saved && (!row.assignmentDue || (saved.assignmentDue ? saved.assignmentDue===row.assignmentDue : day>=row.assignmentDue));
  return { ...row, draft: current ? { ...saved, updatedAt: draft.updatedAt } : null };
}

export async function readReportDraftList(db, account) {
  const { results } = await db.prepare(`
    SELECT d.site_id AS siteId,w.name AS siteName,d.work_date AS workDate,d.updated_at AS updatedAt
    FROM work_report_drafts d JOIN work_sites w ON w.id=d.site_id LEFT JOIN work_plan_cycles p ON p.site_id=d.site_id
    WHERE d.author_id=? AND (? OR p.worker_email=?)
      AND NOT EXISTS(SELECT 1 FROM field_reports r WHERE r.site_id=d.site_id AND r.work_date=d.work_date AND r.status IN ('submitted','approved'))
      AND (p.site_id IS NULL OR (d.work_date>=p.next_due AND (json_extract(d.data,'$.assignmentDue') IS NULL OR json_extract(d.data,'$.assignmentDue')=p.next_due)))
      ORDER BY d.updated_at DESC LIMIT 100
  `).bind(account.id,Number(progressAdmin(account)),account.email).all();
  return results;
}

export async function saveReportDraft(db, body, account, context) {
  const { siteId, workDate, units, exterior, interior, completionMode } = body ?? {};
  validateProgressContext(siteId,workDate,context);
  const notes = progressText(body?.notes);
  const assignmentDue=body?.assignmentDue || null;
  if (![units,exterior,interior].every(value => value == null || progressNumber(value)) || notes.length > 1500
    || !['full','partial'].includes(completionMode) || (assignmentDue!==null && !context.validDate(assignmentDue))) {
    throw new context.HttpError(400, '임시저장할 수량과 메모를 확인해 주세요.');
  }
  const data = JSON.stringify({ units: units ?? null, exterior: exterior ?? null, interior: interior ?? null, completionMode, notes });
  const admin = Number(progressAdmin(account));
  const updatedAt = new Date().toISOString();
  const result = await db.prepare(`
    INSERT INTO work_report_drafts(site_id,work_date,author_id,data,updated_at)
    SELECT w.id,?,?,json_set(?,'$.assignmentDue',p.next_due),? FROM work_sites w LEFT JOIN work_plan_cycles p ON p.site_id=w.id
    WHERE w.id=? AND (? OR p.worker_email=?)
      AND (? IS NULL OR p.next_due=?)
      AND (? OR ?>=p.next_due)
      AND NOT EXISTS(SELECT 1 FROM settlement_months WHERE month=substr(?,1,7))
      AND NOT EXISTS(SELECT 1 FROM field_reports r WHERE r.site_id=w.id AND r.work_date=? AND r.status IN ('submitted','approved'))
    ON CONFLICT(site_id,work_date,author_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at
  `).bind(workDate,account.id,data,updatedAt,siteId,admin,account.email,assignmentDue,assignmentDue,
    admin,workDate,workDate,workDate).run();
  if (!result.meta.changes) throw new context.HttpError(409, '임시저장할 수 있는 배정 현장과 작업일을 확인해 주세요.');
  return { updatedAt };
}

export async function savePartialWork(db, body, account, context) {
  const { siteId, workDate, units, exterior, interior } = body;
  validateProgressContext(siteId,workDate,context);
  const notes = progressText(body.notes);
  if (![units,exterior,interior].every(progressNumber) || units < 1 || units < Math.max(exterior,interior)
    || units > exterior + interior || notes.length > 1500) {
    throw new context.HttpError(400, '현재까지 완료한 충전기 수량과 작업 범위를 확인해 주세요.');
  }
  const admin = Number(progressAdmin(account));
  const now = new Date().toISOString();
  const result = await db.prepare(`
    INSERT INTO work_progress(site_id,first_date,last_date,planned_units,units,exterior,interior,notes,author_id,author_name,updated_at)
    SELECT w.id,COALESCE(g.first_date,p.evidence_from,?),?,COALESCE(g.planned_units,w.planned_units),?,?,?,?,?,?,?
    FROM work_sites w LEFT JOIN work_plan_cycles p ON p.site_id=w.id LEFT JOIN work_progress g ON g.site_id=w.id
    WHERE w.id=? AND ? < COALESCE(g.planned_units,w.planned_units)
      AND ((p.site_id IS NULL AND ?) OR ((? OR p.worker_email=?) AND ?>=p.next_due))
      AND (? OR EXISTS (SELECT COUNT(*) FROM charger_evidence e WHERE e.site_id=w.id
        AND e.work_date BETWEEN COALESCE(g.first_date,p.evidence_from,?) AND ? AND (g.site_id IS NOT NULL OR e.author_id=?)
        HAVING COUNT(*)=COUNT(DISTINCT upper(trim(e.asset_code)))
          AND COUNT(*)>=? AND COALESCE(SUM(e.exterior),0)>=? AND COALESCE(SUM(e.interior),0)>=?))
      AND NOT EXISTS (SELECT 1 FROM charger_evidence e WHERE e.site_id=w.id
        AND e.work_date BETWEEN COALESCE(g.first_date,p.evidence_from,?) AND ?
        GROUP BY upper(trim(e.asset_code)) HAVING COUNT(*)>1)
      AND NOT EXISTS(SELECT 1 FROM settlement_months WHERE month=substr(?,1,7))
      AND NOT EXISTS(SELECT 1 FROM field_reports r WHERE r.site_id=w.id AND (
        r.assignment_due=p.next_due OR r.work_date BETWEEN COALESCE(g.first_date,p.evidence_from,?) AND ?))
    ON CONFLICT(site_id) DO UPDATE SET last_date=excluded.last_date,units=excluded.units,exterior=excluded.exterior,
      interior=excluded.interior,notes=excluded.notes,author_id=excluded.author_id,author_name=excluded.author_name,updated_at=excluded.updated_at
    WHERE excluded.last_date>=work_progress.last_date AND excluded.units>=work_progress.units
      AND excluded.exterior>=work_progress.exterior AND excluded.interior>=work_progress.interior
  `).bind(workDate,workDate,units,exterior,interior,notes,account.id,account.name || account.email,now,siteId,units,
    admin,admin,account.email,workDate,admin,workDate,workDate,account.id,units,exterior,interior,
    workDate,workDate,workDate,workDate,workDate).run();
  if (!result.meta.changes) throw new context.HttpError(409, '배정 수량보다 작은 누적 완료 수량을 입력해 주세요. 이미 제출·마감됐거나 이전 완료 수량보다 줄어든 경우도 저장할 수 없습니다.');
  return { partial: true };
}
