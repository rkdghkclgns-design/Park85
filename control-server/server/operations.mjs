const operationsTaskKinds = ['delay', 'evidence', 'revision', 'fault', 'mail'];
const operationsText = value => typeof value === 'string' ? value.trim() : '';

const operationsTaskSource = `
  WITH task_sources AS (
    SELECT 'delay' AS kind, p.site_id || ':' || p.next_due AS reference, p.site_id AS siteId,
      NULL AS reportId, w.name AS title, p.next_due AS workDate,
      p.worker_name || CASE WHEN p.delay_date=p.next_due AND p.delay_reason <> '' THEN ' · ' || p.delay_reason ELSE '' END AS detail
    FROM work_plan_cycles p JOIN work_sites w ON w.id=p.site_id WHERE p.next_due < ?
    UNION ALL
    SELECT 'evidence', r.id, r.site_id, r.id, r.site_name, r.work_date,
      '보고 ' || r.units || '기 · 증빙 ' || COUNT(e.id) || '기'
    FROM field_reports r LEFT JOIN charger_evidence e ON e.site_id=r.site_id AND e.work_date BETWEEN COALESCE(r.progress_from,r.work_date) AND r.work_date
    WHERE r.status='submitted' AND r.assignment_due IS NOT NULL GROUP BY r.id
    HAVING COUNT(e.id) <> r.units OR COALESCE(SUM(e.exterior),0) <> r.exterior OR COALESCE(SUM(e.interior),0) <> r.interior
    UNION ALL
    SELECT 'revision', r.id, r.site_id, r.id, r.site_name, r.work_date, r.review_note
    FROM field_reports r WHERE r.status='revision'
    UNION ALL
    SELECT 'fault', e.id, e.site_id, r.id, w.name, e.work_date,
      COALESCE(z.name || ' · ','') || COALESCE('충전기 ' || e.device_number,e.asset_code) || ' · ' || COALESCE(NULLIF(e.issue,''),json_extract(e.result_detail,'$.faultNote'),'')
    FROM charger_evidence e JOIN work_sites w ON w.id=e.site_id
    LEFT JOIN work_zones z ON z.id=e.zone_id LEFT JOIN field_reports r ON r.site_id=e.site_id AND e.work_date BETWEEN COALESCE(r.progress_from,r.work_date) AND r.work_date
    WHERE e.followup_status <> 'resolved' AND (e.issue <> '' OR json_extract(e.result_detail,'$.faultStatus')='issue')
    UNION ALL
    SELECT 'mail', m.id, NULL, NULL, m.subject, substr(m.created_at,1,10),
      CASE WHEN m.hold_at IS NOT NULL THEN '발송 결과 확인 필요' ELSE '발송 대기 시간이 길어졌습니다.' END
    FROM report_mail m WHERE m.sent_at IS NULL AND m.canceled_at IS NULL AND m.test_day IS NULL
      AND (m.hold_at IS NOT NULL OR (m.requested_by IS NOT NULL AND julianday(m.created_at) < julianday('now','-30 minutes')))
  )
`;

async function readOperationsTasks(db, day, kind, owner) {
  const [{ results: tasks }, { results: members }] = await Promise.all([
    db.prepare(operationsTaskSource + `
      SELECT s.*, COALESCE(t.assignee,'') AS assignee, COALESCE(t.due_date,'') AS dueDate, COALESCE(t.note,'') AS note
      FROM task_sources s LEFT JOIN operations_tasks t ON t.kind=s.kind AND t.reference=s.reference
      WHERE (?='' OR s.kind=?)
      ORDER BY CASE WHEN t.due_date <> '' THEN t.due_date ELSE s.workDate END, s.kind,s.reference LIMIT 201
    `).bind(day,kind,kind).all(),
    db.prepare("SELECT email,name FROM members WHERE active=1 AND role IN ('admin','cleaner') ORDER BY name,email").all(),
  ]);
  return { tasks: tasks.slice(0,200), overflow: tasks.length > 200, members: [{ email: owner, name: '본연 관리자' }, ...members] };
}

async function saveOperationsTask(db, body, account, context, owner) {
  const { HttpError, validDate, koreaDate } = context;
  const { kind, reference } = body ?? {};
  const assignee = operationsText(body?.assignee);
  const dueDate = operationsText(body?.dueDate);
  const note = operationsText(body?.note);
  if (!operationsTaskKinds.includes(kind) || typeof reference !== 'string' || !reference || reference.length > 180
    || assignee.length > 254 || (dueDate && !validDate(dueDate)) || note.length > 500) {
    throw new HttpError(400, '처리 건과 담당자, 기한, 메모를 확인해 주세요.');
  }
  const result = await db.prepare(operationsTaskSource + `
    INSERT INTO operations_tasks(kind,reference,assignee,due_date,note,updated_at,updated_by)
    SELECT s.kind,s.reference,?,?,?,?,? FROM task_sources s WHERE s.kind=? AND s.reference=?
      AND (?='' OR ?=? OR EXISTS(SELECT 1 FROM members WHERE email=? AND active=1 AND role IN ('admin','cleaner')))
    ON CONFLICT(kind,reference) DO UPDATE SET assignee=excluded.assignee, due_date=excluded.due_date,
      note=excluded.note, updated_at=excluded.updated_at, updated_by=excluded.updated_by
  `).bind(koreaDate(), assignee, dueDate, note, new Date().toISOString(), account.name || account.email,
    kind, reference, assignee, assignee, owner, assignee).run();
  if (!result.meta.changes) throw new HttpError(409, '이미 처리된 건이거나 담당자 계정이 바뀌었습니다. 목록을 새로고침해 주세요.');
}

async function readOperationsAnalytics(db, url, context) {
  const { HttpError, validDate, koreaDate } = context;
  const end = url.searchParams.get('to') || koreaDate();
  const start = url.searchParams.get('from') || '0001-01-01';
  const site = operationsText(url.searchParams.get('site'));
  const worker = operationsText(url.searchParams.get('worker'));
  const type = operationsText(url.searchParams.get('kind'));
  const before = Number(url.searchParams.get('before') || 0);
  if (!validDate(start) || !validDate(end) || start > end || end > koreaDate() ||
    site.length > 80 || worker.length > 120 || type.length > 32 || !Number.isSafeInteger(before) || before < 0) {
    throw new HttpError(400, '조회 기간과 필터를 확인해 주세요.');
  }
  const reportFilter = `r.work_date BETWEEN ? AND ? AND (?='' OR r.site_id=?) AND
    (?='' OR instr(lower(r.author_name),lower(?))>0 OR EXISTS (
      SELECT 1 FROM members m WHERE m.user_id=r.author_id AND instr(lower(m.email),lower(?))>0)
    OR EXISTS (SELECT 1 FROM json_each(p.worker_breakdown) w WHERE instr(lower(json_extract(w.value,'$.name')),lower(?))>0
      OR instr(lower(json_extract(w.value,'$.email')),lower(?))>0))`;
  const reportArgs = [start,end,site,site,worker,worker,worker,worker,worker];
  const eventFilter = `date(e.occurred_at,'+9 hours') BETWEEN ? AND ? AND (?='' OR e.site_id=?)
    AND (?='' OR instr(lower(e.worker),lower(?))>0 OR instr(lower(COALESCE(m.name,'')),lower(?))>0)
    AND (?='' OR e.kind=?)`;
  const eventArgs = [start,end,site,site,worker,worker,worker,type,type];
  const [{ results: periods }, { results: events }, { results: sites }, bounds] = await Promise.all([
    db.prepare(`
      SELECT substr(r.work_date,1,7) AS month, COUNT(*) AS reports, SUM(r.status='approved') AS approved,
        SUM(r.status='revision') AS revision, SUM(CASE WHEN r.status='approved' THEN r.units ELSE 0 END) AS units,
        SUM(CASE WHEN r.status='approved' AND r.assignment_due < r.work_date THEN 1 ELSE 0 END) AS late,
        CAST(SUM(CASE WHEN r.status='approved' THEN COALESCE(p.billed,0) ELSE 0 END) AS TEXT) AS billed,
        CAST(SUM(CASE WHEN r.status='approved' THEN COALESCE(p.received,0) ELSE 0 END) AS TEXT) AS received,
        CAST(SUM(CASE WHEN r.status='approved' THEN COALESCE(p.paid,0) ELSE 0 END) AS TEXT) AS paid
      FROM field_reports r LEFT JOIN settlement_payments p ON p.report_id=r.id
      WHERE ${reportFilter} GROUP BY month ORDER BY month DESC
    `).bind(...reportArgs).all(),
    db.prepare(`
      SELECT e.id,e.occurred_at AS time,e.kind,e.site_id AS siteId,w.name AS siteName,e.report_id AS reportId,
        e.reference,COALESCE(m.name,e.worker) AS worker,e.actor,e.detail
      FROM operations_events e LEFT JOIN work_sites w ON w.id=e.site_id LEFT JOIN members m ON m.email=e.worker
      WHERE ${eventFilter} AND (?=0 OR (e.occurred_at,e.id)<(
        SELECT occurred_at,id FROM operations_events WHERE id=?))
      ORDER BY e.occurred_at DESC,e.id DESC LIMIT 51
    `).bind(...eventArgs,before,before).all(),
    db.prepare('SELECT id,name FROM work_sites ORDER BY name,id').all(),
    db.prepare("SELECT date(MIN(occurred_at),'+9 hours') AS first FROM operations_events").first(),
  ]);
  return { periods, events: events.slice(0,50), next: events.length > 50 ? events[49].id : 0, sites, first: bounds?.first };
}

export async function handleOperations(path, request, env, account, context) {
  const { json, requireRole, readJson, HttpError, koreaDate } = context;
  requireRole(account, 'admin');
  if (path === '/api/control/tasks') {
    const owner = operationsText(env.BONYEON_OWNER_EMAIL).toLowerCase();
    if (request.method === 'GET') {
      const kind = new URL(request.url).searchParams.get('kind') || '';
      if (kind && !operationsTaskKinds.includes(kind)) throw new HttpError(400, '업무 유형을 확인해 주세요.');
      return json(await readOperationsTasks(env.DB, koreaDate(), kind, owner));
    }
    if (request.method === 'PATCH') {
      await saveOperationsTask(env.DB, await readJson(request, env), account, context, owner);
      return json({ ok: true });
    }
  }
  if (path === '/api/control/analytics' && request.method === 'GET') {
    return json(await readOperationsAnalytics(env.DB, new URL(request.url), context));
  }
  throw new HttpError(404, '요청한 운영 관제 기능을 찾을 수 없습니다.');
}
