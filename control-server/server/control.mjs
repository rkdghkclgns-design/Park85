import { buildOfficeAcceptanceMails, buildOfficeMail } from './office-mail.mjs';
import { validMailbox } from './addresses.mjs';
import { archivedDetailDb, readTestArchive } from './operational-data.mjs';
import { clientRecipients, clientRecipientsSql, finalClientReportSql, legacyClientPolicy, normalizeClientRecipients } from './client-recipients.mjs';
import { displayWorkResults, normalizeWorkResults } from './work-results.mjs';
import { internalWorkUnits, readReportDraftList, readWorkerEarnings, saveReportDraft, savePartialWork, workerCanMoveEvidenceZone } from './progress.mjs';

const controlDate = timestamp => new Date(timestamp + 9 * 3600_000).toISOString().slice(0, 10);
const validReportEmail = validMailbox;
const formatReportNumber = value => value.toLocaleString('ko-KR');
const canManageReports = account => ['owner', 'admin'].includes(account.role);
const canDeliverReports = env => Boolean(env.BONYEON_RESEND_API_KEY && validReportEmail(env.BONYEON_REPORT_FROM));
const validGmailRecipient = validMailbox;
const officeMailKinds = new Set(['worker', 'tax']);
const gmailConfigured = env => validGmailRecipient(env.BONYEON_GMAIL_FROM);
const exampleId = 'completion-example';
const defaultSiteOrigin = 'https://cleanreport-demo.smart433699.chatgpt.site';
const detailPath = (kind, id, day = '') => '#control-detail/' + kind + '/'
  + encodeURIComponent(id).replace(/[!'()*~]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase())
  + (day ? '?month=' + day.slice(0, 7) : '');
export function portalDetailUrl(env, kind, id, day) {
  const detail = detailPath(kind, id, day);
  if (env.BONYEON_PORTAL_LINKS === '1') {
    return 'https://bonyeonclean.com/#/service/charger/charger-cleaning?' + new URLSearchParams({ view:detail.slice(1) });
  }
  const query = kind === 'mail' ? '?mail=' + id : '';
  return (env.BONYEON_SITE_ORIGIN || defaultSiteOrigin) + '/' + query + detail;
}

const detailLink = (env, kind, id, text, day) => id
  ? { text, href: portalDetailUrl(env, kind, id, day) } : text;

async function readControlOverview(db, month, account, env) {
  const admin = canManageReports(account);
  const sitesQuery = admin ? `
    SELECT w.id, w.name, w.address, w.planned_units AS plannedUnits,s.region_name AS region, COALESCE(s.contractor_email, '') AS contractorEmail,
      s.contractor_email,s.contractor_emails
    FROM work_sites w LEFT JOIN site_reporting s ON w.id = s.site_id ORDER BY w.name
  ` : `SELECT w.id, w.name, w.address, w.planned_units AS plannedUnits FROM work_sites w
          WHERE EXISTS (SELECT 1 FROM work_plans p WHERE p.site_id = w.id AND p.worker_email = ?) ORDER BY w.name`;
  const sites = (await (admin ? db.prepare(sitesQuery) : db.prepare(sitesQuery).bind(account.email)).all()).results;
  if (admin) for (const site of sites) {
    site.contractorEmails = clientRecipients(site);
    delete site.contractor_email;
    delete site.contractor_emails;
  }
  const fields = admin ? ', r.region_name AS region, r.contract_price AS contractPrice, r.worker_price AS workerPrice' : '';
  const restriction = admin ? '' : ' AND r.author_id = ?';
  const args = admin ? [month + '-%'] : [month + '-%', account.id];
  const reports = (await db.prepare(`
    SELECT r.id, r.site_id AS siteId, r.site_name AS siteName, r.work_date AS workDate,
           r.author_id AS authorId, r.author_name AS authorName, r.units, r.exterior, r.interior, r.notes, r.status,
           r.completion_reported_at AS completionReportedAt,r.planned_units AS plannedUnits,r.internal_work AS internalWork,r.internal_units AS internalUnits,
           r.review_note AS reviewNote, r.revision_target AS revisionTarget${fields}
    FROM field_reports r WHERE r.work_date LIKE ?${restriction} ORDER BY r.work_date DESC, r.site_name
  `).bind(...args).all()).results;
  const [{ results: progress }, drafts] = await Promise.all([
    db.prepare(`SELECT g.site_id AS siteId,w.name AS siteName,g.last_date AS workDate,g.units,g.planned_units AS plannedUnits,g.author_name AS authorName
      FROM work_progress g JOIN work_sites w ON w.id=g.site_id LEFT JOIN work_plans p ON p.site_id=w.id
      WHERE ? OR p.worker_email=? ORDER BY g.updated_at DESC`).bind(Number(admin),account.email).all(),
    readReportDraftList(db,account),
  ]);
  if (!admin) return { sites, reports, progress, drafts,earnings:await readWorkerEarnings(db,month,account) };
  const regions = (await db.prepare('SELECT region_name AS name FROM charger_regions ORDER BY region_name').all()).results;
  const [{ results: deliveries }, gmailRunner, mailSettings, { results: workers }] = await Promise.all([
    db.prepare(`
      SELECT kind, reference, recipient, subject, created_at AS createdAt, sent_at AS sentAt, canceled_at AS canceledAt, hold_at AS holdAt,
             CASE WHEN ${storageHeldReport()} THEN 'storage' WHEN hold_at IS NOT NULL THEN 'uncertain' END AS holdReason,
             CASE WHEN kind IN ('worker', 'tax') AND canceled_at IS NULL THEN payload_key END AS detailKey,
             requested_by IS NOT NULL AND provider_id IS NULL AND canceled_at IS NULL AS queued
      FROM report_mail WHERE test_day IS NULL AND (requested_by IS NOT NULL OR sent_at IS NOT NULL OR provider_id LIKE 'gmail:%')
      ORDER BY COALESCE(sent_at, created_at) DESC LIMIT 50
    `).all(),
    env.BONYEON_GMAIL_FROM ? db.prepare('SELECT activated_at AS activatedAt, last_seen_at AS lastSeenAt FROM gmail_report_runner WHERE id = 1').first() : null,
    readMailSettings(db, env),
    db.prepare("SELECT email,name FROM members WHERE role IN ('cleaner','admin') AND active=1 ORDER BY name,email").all(),
  ]);
  return { sites, reports, progress, drafts, regions, deliveries, workers, gmailConfigured: gmailConfigured(env), gmailRunner,
    adminEmail: mailSettings.adminEmail, mailSettings, mailReady: Boolean(gmailRunner) || canDeliverReports(env) };
}

async function readMailSettings(db, env) {
  const saved = await db.prepare('SELECT admin_email, tax_email, worker_mail_enabled, office_auto_enabled FROM control_settings WHERE id = 1').first();
  return { adminEmail: saved?.admin_email || env.BONYEON_OWNER_EMAIL, taxEmail: saved?.tax_email || '',
    workerMailEnabled: Boolean(saved?.worker_mail_enabled), officeAutoEnabled: Boolean(saved?.office_auto_enabled),
    centralEmail: env.BONYEON_GMAIL_FROM || '' };
}

const readAdminRecipient = async (db, env) => (await readMailSettings(db, env)).adminEmail;

async function saveReportSite(db, body, { HttpError }, account) {
  const { siteId, region } = body ?? {};
  const emails = normalizeClientRecipients(body?.contractorEmails ?? body?.contractorEmail);
  if (typeof siteId !== 'string' || (region !== null && typeof region !== 'string')
    || !emails) {
    throw new HttpError(400, '현장, 구역과 클라이언트 이메일을 확인해 주세요. 유효한 이메일을 최대 20개 지정할 수 있습니다.');
  }
  const saved = await db.prepare(`
    INSERT INTO site_reporting (site_id, region_name, contractor_email, contractor_emails,updated_at,history_actor)
    SELECT id, ?, ?, ?,?,? FROM work_sites WHERE id = ?
      AND (? IS NULL OR EXISTS (SELECT 1 FROM charger_regions WHERE region_name = ?))
    ON CONFLICT(site_id) DO UPDATE SET region_name = excluded.region_name, contractor_email = excluded.contractor_email,
      contractor_emails = excluded.contractor_emails,updated_at=excluded.updated_at,history_actor=excluded.history_actor
  `).bind(region, emails[0] || '', JSON.stringify(emails),new Date().toISOString(),account.name || account.email, siteId, region, region).run();
  if (!saved.meta.changes) throw new HttpError(404, '선택한 현장 또는 구역을 찾을 수 없습니다.');
}

async function submitFieldReport(db, body, account, { HttpError, validDate, koreaDate }) {
  const { siteId, workDate, units, exterior, interior } = body ?? {};
  const notes = typeof body?.notes === 'string' ? body.notes.trim() : '';
  const validNumber = value => Number.isSafeInteger(value) && value >= 0;
  if (typeof siteId !== 'string' || typeof workDate !== 'string' || !validDate(workDate) || workDate > koreaDate()
    || ![units, exterior, interior].every(validNumber) || units < 1
    || units < Math.max(exterior, interior) || BigInt(units) > BigInt(exterior) + BigInt(interior)
    || notes.length > 1500) {
    throw new HttpError(400, '작업일과 실제 작업 수량을 확인해 주세요. 내·외부를 모두 청소한 충전기는 실작업 수량에서 한 기로 셉니다.');
  }
  const submittedAt = new Date().toISOString();
  const internal = Number(account.role==='cleaner' && account.canSwitchMode===true);
  const result = await db.prepare(`
    INSERT INTO field_reports (id, site_id, work_date, author_id, author_name, site_name, site_address,
                               units, exterior, interior, notes, status, updated_at, assignment_due, completion_reported_at, history_actor,
                               planned_units,progress_from,internal_work,internal_units)
    SELECT ?, w.id, ?, ?, ?, w.name, w.address, ?, ?, ?, ?, 'submitted', ?, p.next_due, ?, ?,
      COALESCE(g.planned_units,w.planned_units),COALESCE(g.first_date,p.evidence_from,?),?,
      MIN(?,COALESCE((SELECT SUM(e.internal_work) FROM charger_evidence e
        WHERE e.site_id=w.id AND e.work_date BETWEEN COALESCE(g.first_date,p.evidence_from,?) AND ?),?))
    FROM work_sites w LEFT JOIN work_plan_cycles p ON p.site_id = w.id LEFT JOIN work_progress g ON g.site_id=w.id WHERE w.id = ?
      AND (COALESCE(g.planned_units,w.planned_units) IS NULL OR ?=COALESCE(g.planned_units,w.planned_units))
      AND (g.site_id IS NULL OR (? >= g.last_date AND ?>=g.exterior AND ?>=g.interior))
      AND ((? AND 0) OR EXISTS (
        SELECT COUNT(*) FROM charger_evidence e WHERE e.site_id=w.id AND e.work_date BETWEEN COALESCE(g.first_date,p.evidence_from,?) AND ?
          AND (g.site_id IS NOT NULL OR e.author_id=?)
        HAVING COUNT(*)=COUNT(DISTINCT upper(trim(e.asset_code))) AND COUNT(*)=? AND COALESCE(SUM(e.exterior),0)=? AND COALESCE(SUM(e.interior),0)=?))
      AND NOT EXISTS (SELECT 1 FROM settlement_months WHERE month = substr(?, 1, 7))
      AND ((p.site_id IS NULL AND ?) OR ((? OR p.worker_email = ?) AND ? >= p.next_due
        AND NOT EXISTS (SELECT 1 FROM field_reports r WHERE r.site_id = w.id
                        AND r.assignment_due = p.next_due AND r.work_date <> ?)))
    ON CONFLICT(site_id, work_date) DO UPDATE SET
      units = excluded.units, exterior = excluded.exterior, interior = excluded.interior, notes = excluded.notes,
      assignment_due = COALESCE(field_reports.assignment_due, excluded.assignment_due),
      completion_reported_at = COALESCE(field_reports.completion_reported_at, excluded.completion_reported_at),
      status = 'submitted', review_note = '', revision_evidence_id='', revision_photo_id='', revision_target='',
      updated_at = excluded.updated_at, history_actor=excluded.history_actor,
      planned_units=excluded.planned_units,progress_from=excluded.progress_from,internal_work=excluded.internal_work,internal_units=excluded.internal_units
    WHERE field_reports.author_id = excluded.author_id AND field_reports.status <> 'approved'
  `).bind(crypto.randomUUID(), workDate, account.id, account.name || '본연 작업자',
    units, exterior, interior, notes, submittedAt, account.role === 'cleaner' ? submittedAt : null, account.name || account.email,
    workDate,internal,units,workDate,workDate,internal*units,siteId,
    units,workDate,exterior,interior,Number(canManageReports(account)),workDate,workDate,account.id,units,exterior,interior,workDate,
    Number(canManageReports(account)), Number(canManageReports(account)), account.email, workDate, workDate).run();
  if (!result.meta.changes) throw new HttpError(409, '배정 수량과 예정일을 확인해 주세요. 일부만 끝난 경우 부분 완료로 등록해 주세요. 중복·승인·마감된 보고는 제출할 수 없습니다.');
}

async function reviewFieldReport(db, body, account, { HttpError }) {
  const { id, action } = body ?? {};
  const note = typeof body?.note === 'string' ? body.note.trim() : '';
  if (typeof id !== 'string' || !['approve', 'revise', 'rates'].includes(action)
    || note.length > 500 || (action === 'revise' && !note)) {
    throw new HttpError(400, '보고서와 처리 내용을 확인해 주세요.');
  }
  const time = new Date().toISOString();
  const actor = account.name || account.email;
  if (action === 'revise') {
    const evidenceId = body.evidenceId ?? '';
    const photoId = body.photoId ?? '';
    if (typeof evidenceId !== 'string' || evidenceId.length > 36 || typeof photoId !== 'string' || photoId.length > 36 || (!evidenceId && photoId)) {
      throw new HttpError(400, '보완할 구역 또는 사진을 확인해 주세요.');
    }
    let target = '';
    if (evidenceId) {
      const row = await db.prepare(`
        SELECT COALESCE('충전기 ' || e.device_number,e.asset_code) AS asset, e.zone_name_snapshot AS zone, p.slot
        FROM field_reports r JOIN charger_evidence e ON e.site_id=r.site_id AND e.work_date BETWEEN COALESCE(r.progress_from,r.work_date) AND r.work_date
        LEFT JOIN work_zones z ON z.id=e.zone_id LEFT JOIN work_camera_photos p ON p.evidence_id=e.id AND p.id=?
        WHERE r.id=? AND e.id=? AND (?='' OR p.id IS NOT NULL)
      `).bind(photoId, id, evidenceId, photoId).first();
      if (!row) throw new HttpError(404, '이 보고에 속한 증빙 사진을 선택해 주세요.');
      const slot = { exteriorBefore: '외함 작업 전', exteriorAfter: '외함 작업 후', interiorBefore: '내함 작업 전', interiorAfter: '내함 작업 후' }[row.slot];
      target = [row.zone, row.asset, slot].filter(Boolean).join(' · ');
    }
    const result = await db.prepare(`UPDATE field_reports SET status = 'revision', review_note = ?, updated_at = ?, history_actor=?,
      revision_evidence_id=?, revision_photo_id=?, revision_target=?
      WHERE id = ? AND status = 'submitted'
      AND NOT EXISTS (SELECT 1 FROM settlement_months WHERE month = substr(field_reports.work_date, 1, 7))`)
      .bind(note, time, actor, evidenceId, photoId, target, id).run();
    if (!result.meta.changes) throw new HttpError(409, '보완 요청할 수 있는 제출 상태가 아닙니다.');
    return;
  }
  const expected = action === 'approve' ? 'submitted' : 'approved';
  const result = await db.prepare(`
    UPDATE field_reports AS report
    SET status = 'approved', review_note = '', updated_at = ?, approved_at = COALESCE(approved_at, ?), history_actor=?,
        completion_reported_at = COALESCE(completion_reported_at, ?),
        region_name = COALESCE(region_name, (SELECT region_name FROM site_reporting WHERE site_id = report.site_id)),
        contract_price = COALESCE(contract_price, (
          SELECT c.contract_price FROM charger_regions c
          WHERE c.region_name = COALESCE(report.region_name, (SELECT region_name FROM site_reporting WHERE site_id = report.site_id))
        )),
        worker_price = COALESCE(worker_price, (
          SELECT c.worker_price FROM charger_regions c
          WHERE c.region_name = COALESCE(report.region_name, (SELECT region_name FROM site_reporting WHERE site_id = report.site_id))
        ))
    WHERE id = ? AND status = ?
      AND NOT EXISTS (SELECT 1 FROM settlement_months WHERE month = substr(report.work_date, 1, 7))
      AND (? = 'approved' OR (
        SELECT COUNT(*)=COUNT(DISTINCT upper(trim(e.asset_code))) AND COUNT(*) = report.units AND COALESCE(SUM(e.exterior), 0) = report.exterior
          AND COALESCE(SUM(e.interior), 0) = report.interior
        FROM charger_evidence e WHERE e.site_id = report.site_id AND e.work_date BETWEEN COALESCE(report.progress_from,report.work_date) AND report.work_date
      ))
  `).bind(time, time, actor, time, id, expected, expected).run();
  if (!result.meta.changes) throw new HttpError(409, '승인할 수 없는 상태입니다. 정기 배정 건은 충전기별 증빙 수량이 보고와 일치해야 합니다.');
}

function fieldReportLines(row, includeNotes = true) {
  return [
    '현장: ' + row.site_name,
    row.site_address && '주소: ' + row.site_address,
    '작업일: ' + row.work_date,
    `${row.planned_units ? '배정 ' + formatReportNumber(row.planned_units) + '기 · ' : ''}실작업 ${formatReportNumber(row.units)}기 · 외부 ${formatReportNumber(row.exterior)}기 · 내부 ${formatReportNumber(row.interior)}기`,
    includeNotes && row.notes && '작업 메모: ' + row.notes,
  ].filter(Boolean);
}

const reportMoney = value => value == null ? '미입력' : formatReportNumber(value) + '원';
const reportUnits = value => formatReportNumber(value) + '기';
const reviewStatus = { submitted: '확인 대기', approved: '승인', revision: '보완 요청' };
const chargerLabels = { slow: '완속 충전기', fast: '급속 충전기', unknown: '미입력' };
const canopyLabels = { included: '포함', excluded: '미포함', unknown: '미입력' };
const reportEscape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const reportSection = (title, columns, rows, note = '') => ({ title, columns, rows, note });
const sumReport = (rows, get) => rows.reduce((total, row) => total + BigInt(get(row)), 0n);

function detailedReport(title, period, intro, metrics, sections) {
  const cellHtml = value => typeof value === 'object' && value?.href
    ? `<a style="color:#17609a;text-decoration:underline" target="_blank" rel="noopener" href="${reportEscape(value.href)}">${reportEscape(value.text)}</a>`
    : reportEscape(value);
  const cellText = value => typeof value === 'object' && value?.href ? value.text + ' (' + value.href + ')' : value;
  const table = (columns, rows) => `<table width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px;overflow-wrap:anywhere"><thead><tr>${columns.map(column =>
    `<th align="left" bgcolor="#edf2f7" style="padding:8px;color:#29415a">${reportEscape(column)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value =>
    `<td style="padding:8px;border-bottom:1px solid #e1e8ef;vertical-align:top;white-space:pre-line">${cellHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const paragraph = text => `<p style="margin:10px 0;white-space:pre-line">${reportEscape(text)}</p>`;
  const summary = `<table width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#f0f5fa;border-collapse:collapse"><tr>${metrics.map(([label, value]) =>
    `<td style="padding:11px 8px;border:1px solid #d9e2ec;vertical-align:top"><span style="font-size:12px;color:#3e556c">${reportEscape(label)}</span><br><strong style="font-size:17px;color:#142c45">${reportEscape(value)}</strong></td>`).join('')}</tr></table>`;
  const html = `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;width:100%;border:1px solid #d9e2ec;border-collapse:collapse;font:14px/1.6 'Malgun Gothic',Arial,sans-serif;color:#182a3b"><tr><td bgcolor="#17334e" style="padding:18px;color:#fff;background:#17334e"><span style="color:#c3d8ec">본연 · 충전기 청소 운영</span><br><strong style="font-size:22px">${reportEscape(title)}</strong><br>${reportEscape(period)}</td></tr><tr><td style="padding:15px">${paragraph(intro)}${summary}${sections.map(({ title, columns, rows, note }) =>
    `<p style="margin:18px 0 7px;font-weight:bold;font-size:16px;color:#142c45">${reportEscape(title)}</p>${rows.length ? table(columns, rows) : paragraph('등록된 내역이 없습니다.')}${note ? paragraph(note) : ''}`).join('')}</td></tr><tr><td bgcolor="#eef3f8" style="padding:11px 15px;color:#40576b">본연 | 충전기 청소 작업 보고</td></tr></table>`;
  const detailText = [title, period, intro, metrics.map(pair => pair.join(' ')).join(' · '), ...sections.flatMap(section =>
    ['', section.title, ...(section.rows.length ? [section.columns.join(' | '), ...section.rows.map(row => row.map(cellText).join(' | '))]
      : ['등록된 내역이 없습니다.']), section.note].filter(line => line !== undefined))].join('\n');
  return { html, detailText };
}

async function reportEquipment(db, kind, reference) {
  const filter = { contractor: 'r.id = ?', completion: 'r.id = ?', daily: 'r.work_date = ?', settlement: 'r.work_date LIKE ?' }[kind];
  const { results } = await db.prepare(`
    SELECT r.id AS report_id,COALESCE('충전기 ' || e.device_number,e.asset_code) AS asset_code,e.charger_type,e.canopy,e.exterior,e.interior,e.safety_checked,e.result_detail,e.zone_name_snapshot AS zoneName
    FROM field_reports r JOIN charger_evidence e ON e.site_id=r.site_id AND e.work_date BETWEEN COALESCE(r.progress_from,r.work_date) AND r.work_date
    LEFT JOIN work_zones z ON z.id = e.zone_id
    WHERE ${filter} ORDER BY r.id, e.asset_code
  `).bind(kind === 'settlement' ? reference + '-%' : reference).all();
  const grouped = new Map();
  for (const item of results) {
    if (!grouped.has(item.report_id)) grouped.set(item.report_id, []);
    grouped.get(item.report_id).push(item);
  }
  return grouped;
}

function chargerDetailSections(reports, equipment, individual = true, perSite = false) {
  const types = Object.keys(chargerLabels);
  const scopes = Object.keys(canopyLabels);
  const categories = new Map(types.map(type => [type, new Map(scopes.map(scope => [scope, 0n]))]));
  let unmatched = false;
  const detailRows = [];
  const siteRows = [];
  for (const report of reports) {
    const devices = equipment.get(report.id) ?? [];
    const missing = BigInt(report.units) - BigInt(devices.length);
    const reportCounts = new Map();
    const add = (type, scope, count) => {
      categories.get(type).set(scope, categories.get(type).get(scope) + count);
      const key = type + '/' + scope;
      reportCounts.set(key, (reportCounts.get(key) ?? 0n) + count);
    };
    if (missing > 0n) add('unknown', 'unknown', missing);
    if (missing < 0n) unmatched = true;
    for (const item of devices) {
      add(item.charger_type, item.canopy, 1n);
      if (individual) detailRows.push([report.site_name, item.asset_code, chargerLabels[item.charger_type], canopyLabels[item.canopy],
        item.exterior ? '완료' : '대상 아님', item.interior ? '완료' : '대상 아님', item.safety_checked ? '확인' : '미확인']);
    }
    if (perSite) {
      const entries = [...reportCounts.entries()].map(([key, value]) => {
        const [type, scope] = key.split('/');
        return chargerLabels[type] + ' / ' + canopyLabels[scope] + ' ' + reportUnits(value);
      });
      siteRows.push([report.work_date, report.site_name, entries.join('\n') || '등록된 분류 없음']);
    }
  }
  const note = '캐노피 열은 작업 범위 포함 여부입니다. 증빙이 없는 작업 수량은 미입력으로 표시합니다.'
    + (unmatched ? ' 증빙 수량이 보고 수량보다 많은 건은 증빙 내역에 따라 표시했습니다.' : '');
  const sections = [reportSection('완속·급속 및 캐노피 구분', ['충전기 유형', '캐노피 포함', '캐노피 미포함', '캐노피 미입력'],
    reports.length ? types.map(type => [chargerLabels[type], ...scopes.map(scope => reportUnits(categories.get(type).get(scope)))]) : [], note)];
  if (perSite) sections.push(reportSection('현장별 기기 유형 및 캐노피', ['작업일', '현장', '충전기 유형 / 캐노피'], siteRows));
  if (individual) sections.push(reportSection('기기별 청소 결과', ['현장', '기기 번호', '유형', '캐노피', '외부', '내부', '안전 확인'], detailRows));
  return sections;
}

function reportPaymentSections(rows, env, workerIds) {
  const approved = rows.filter(row => row.status === 'approved');
  const billed = approved.filter(row => row.billing_record && (row.billed > 0 || row.vat != null || row.billing_ref));
  const vatConfirmed = billed.filter(row => row.vat != null);
  const payments = [];
  const internal = [];
  const byWorker = new Map();
  let unassigned = 0;
  let unassignedPaid = 0n;
  const siteCell = row => detailLink(env, 'site', row.site_id, row.work_date + '\n' + row.site_name, row.work_date);
  for (const row of approved) {
    const workers = JSON.parse(row.worker_breakdown ?? '[]');
    const internalUnits = internalWorkUnits(row,workers);
    if (!workers.length && internalUnits) internal.push([internalUnits===row.units ? row.author_name : '관리자 작업 (증빙 집계)',
      siteCell(row),reportUnits(internalUnits),'지급 제외']);
    if (!workers.length && internalUnits < row.units) {
      unassigned++;
      unassignedPaid += BigInt(row.paid);
    }
    for (const worker of workers) {
      if (worker.internal) { internal.push([worker.name,siteCell(row),reportUnits(worker.units),'지급 제외']); continue; }
      const paid = BigInt(worker.paid);
      const amount = row.worker_price == null ? null : BigInt(worker.units) * BigInt(row.worker_price);
      const unpaid = amount == null ? null : amount > paid ? amount - paid : 0n;
      const name = detailLink(env, 'worker', workerIds.get(worker.email), worker.name, row.work_date);
      const total = byWorker.get(worker.email) ?? { name, units: 0n, amount: 0n, paid: 0n, unpaid: 0n, missingRate: false };
      total.units += BigInt(worker.units);
      total.amount += amount ?? 0n;
      total.paid += paid;
      total.unpaid += unpaid ?? 0n;
      total.missingRate ||= amount == null;
      byWorker.set(worker.email, total);
      payments.push([name, siteCell(row), reportUnits(worker.units), reportMoney(row.worker_price),
        reportMoney(amount), reportMoney(paid) + (worker.paidDate ? '\n' + worker.paidDate : ''), reportMoney(unpaid)]);
    }
  }
  const supply = sumReport(vatConfirmed, row => row.billed - row.vat);
  const vat = sumReport(vatConfirmed, row => row.vat);
  const amounts = billed.map(row => [siteCell(row), row.billing_ref || '미입력',
    reportMoney(row.vat == null ? null : row.billed - row.vat), reportMoney(row.vat),
    reportMoney(row.billed), reportMoney(row.received), reportMoney(row.billed - row.received)]);
  if (billed.length) amounts.push(['합계', '', reportMoney(vatConfirmed.length ? supply : null),
    reportMoney(vatConfirmed.length ? vat : null), reportMoney(sumReport(billed, row => row.billed)),
    reportMoney(sumReport(billed, row => row.received)), reportMoney(sumReport(billed, row => row.billed - row.received))]);
  const missingVat = billed.length - vatConfirmed.length;
  return [
    reportSection('고객 청구·입금 상세', ['작업일·현장', '청구번호', '공급가액', '부가세', '청구 합계', '입금액', '미수금'], amounts,
      (missingVat ? `부가세 미입력 ${missingVat}건. 공급가액과 부가세 합계는 입력분 기준입니다. ` : '')
      + '공급가액은 청구 합계에서 기록된 부가세를 뺀 금액입니다.'),
    reportSection('실제 작업자별 지급 합계', ['실제 작업자', '작업 수량', '정산액', '지급액', '미지급액'],
      [...byWorker.values()].map(row => [row.name, reportUnits(row.units), reportMoney(row.missingRate ? null : row.amount),
        reportMoney(row.paid), reportMoney(row.missingRate ? null : row.unpaid)]),
      unassigned ? `실제 작업자 미입력 승인 보고 ${unassigned}건 · 작업자별 미배정 지급액 ${reportMoney(unassignedPaid)}` : ''),
    reportSection('실제 작업자별 지급 상세', ['실제 작업자', '작업일·현장', '수량', '대당 단가', '정산액', '지급액·지급일', '미지급액'], payments),
    ...(internal.length ? [reportSection('관리자 직접 작업', ['작업자','작업일·현장','수량','구분'], internal)] : []),
  ];
}

const paymentFields = `COALESCE(p.billed, 0) AS billed, COALESCE(p.received, 0) AS received,
  COALESCE(p.paid, 0) AS paid, p.vat, p.report_id IS NOT NULL AS billing_record,
  COALESCE(p.billing_ref, '') AS billing_ref, COALESCE(p.worker_breakdown, '[]') AS worker_breakdown`;

function contractorDetails(row, equipment) {
  return detailedReport('충전기 청소 결과', row.site_name + ' · ' + row.work_date, '안녕하세요. 본연입니다. 승인된 충전기 청소 결과를 안내드립니다.',
    [['실작업', reportUnits(row.units)], ['외부 청소', reportUnits(row.exterior)], ['내부 청소', reportUnits(row.interior)]],
    [reportSection('작업 개요', ['항목', '확인 내용'], [
      ['현장', row.site_name],
      ['주소', row.site_address || '미입력'], ['작업일', row.work_date], ['처리 상태', '승인'],
    ]), ...chargerDetailSections([row], equipment)]);
}

function adminDetails(kind, reference, rows, equipment, due = [], closed = false, env = {}, workerIds = new Map()) {
  const monthly = kind === 'settlement';
  const approved = rows.filter(row => row.status === 'approved');
  const counted = monthly ? approved : rows;
  const sections = [
    reportSection('현장별 작업 상세', ['작업일·현장', '보고 작업자', '실작업', '외부 / 내부', '처리 상태', '작업 메모'],
      rows.map(row => [detailLink(env, 'site', row.site_id, row.work_date + '\n' + row.site_name, row.work_date),
        detailLink(env, 'worker', row.author_id, row.author_name || '미입력', row.work_date),
        reportUnits(row.units), reportUnits(row.exterior) + ' / ' + reportUnits(row.interior),
        reviewStatus[row.status], row.notes || '—'])),
    ...chargerDetailSections(counted, equipment, !monthly, monthly),
    ...reportPaymentSections(rows, env, workerIds),
  ];
  if (due.length) sections.push(reportSection('정기 작업 확인 필요', ['현장', '담당자', '예정일', '지연 사유'],
    due.map(row => [detailLink(env, 'site', row.site_id, row.name, row.due),
      detailLink(env, 'worker', workerIds.get(row.worker_email), row.worker, row.due), row.due, row.reason || '—'])));
  return detailedReport(monthly ? '관리자 월 결산' : '일일 현장 보고', reference + ' · 관리자용',
    monthly ? (closed ? '월 마감 완료' : '월 마감 전 · 잠정 집계') : '현장별 작업 기록과 확인 상태를 정리했습니다.',
    [['보고', rows.length + '건'], ['실작업', reportUnits(sumReport(counted, row => row.units))], ['승인', approved.length + '건']], sections);
}

function completionDetails(row, equipment, env) {
  const resultRows = (equipment.get(row.id) ?? []).map(device => [device.zoneName || '구역 미지정', device.asset_code,
    ...displayWorkResults(device).items.map(item => item.status + (item.note ? '\n' + item.note : ''))]);
  return detailedReport('작업 완료 보고', row.site_name + ' · ' + row.work_date, '현장 작업자가 청소 결과를 등록했습니다.',
    [['실작업', reportUnits(row.units)], ['외부 청소', reportUnits(row.exterior)], ['내부 청소', reportUnits(row.interior)]],
    [reportSection('등록 내용', ['항목', '상세'], [
      ['현장', detailLink(env, 'site', row.site_id, row.site_name, row.work_date)],
      ['작업자', detailLink(env, 'worker', row.author_id, row.author_name, row.work_date)],
      ['주소', row.site_address || '미입력'], ['작업일', row.work_date],
      ['처리 상태', reviewStatus[row.status]], ['작업 메모', row.notes || '—'],
      ['증빙·사진', detailLink(env, 'report', row.id, '등록한 작업 결과 보기')],
    ]), reportSection('기기별 작업 결과', ['구역', '기기 번호', '외함', '내함', '주변', '고장확인'], resultRows),
      ...chargerDetailSections([row], equipment)]);
}

function completionExample(day) {
  return {
    row: {
      id: exampleId, site_id: exampleId, author_id: exampleId, site_name: '서식 테스트 현장', author_name: '예시 작업자',
      site_address: '예시 주소', work_date: day, units: 2, exterior: 2, interior: 1, status: 'submitted',
      notes: '완속 기기는 캐노피와 내·외부, 급속 기기는 외부를 청소했습니다.',
    },
    devices: [
      { asset_code: '예시-완속-01', charger_type: 'slow', canopy: 'included', exterior: 1, interior: 1, safety_checked: 1 },
      { asset_code: '예시-급속-02', charger_type: 'fast', canopy: 'excluded', exterior: 1, interior: 0, safety_checked: 1 },
    ],
  };
}

const completionSubject = row => `[본연] 작업 완료 보고 · ${row.site_name} · ${row.work_date}`;

async function readControlDetail(db, kind, id, month, account, context) {
  const admin = canManageReports(account);
  const missing = () => new context.HttpError(404, '조회할 수 있는 작업자, 현장 또는 보고를 찾을 수 없습니다.');
  if (id === exampleId && admin) {
    const { row, devices } = completionExample(context.koreaDate());
    const report = {
      id, siteId: id, siteName: row.site_name, address: row.site_address, workDate: row.work_date, authorId: id,
      authorName: row.author_name, units: row.units, exterior: row.exterior, interior: row.interior,
      notes: row.notes, status: row.status, completionReportedAt: row.work_date,
    };
    return { example: true, title: kind === 'worker' ? row.author_name : row.site_name,
      address: kind !== 'worker' ? row.site_address : '', reports: [report], devices: kind === 'report' ? devices : [] };
  }
  const columns = `r.id, r.site_id AS siteId, r.site_name AS siteName, r.site_address AS address, r.work_date AS workDate,
    r.author_id AS authorId, r.author_name AS authorName, r.units, r.exterior, r.interior, r.notes, r.status,
    r.planned_units AS plannedUnits,r.progress_from AS progressFrom,r.internal_work AS internalWork,r.internal_units AS internalUnits,
    r.review_note AS reviewNote, r.revision_target AS revisionTarget, r.revision_evidence_id AS revisionEvidenceId,
    r.revision_photo_id AS revisionPhotoId, r.completion_reported_at AS completionReportedAt`;
  if (kind === 'report') {
    const report = await db.prepare(`SELECT ${columns} FROM field_reports r WHERE r.id = ? AND (? OR r.author_id = ?)`)
      .bind(id, Number(admin), account.id).first();
    if (!report) throw missing();
    const closed = await db.prepare('SELECT 1 FROM settlement_months WHERE month=?').bind(report.workDate.slice(0,7)).first();
    const { results } = await db.prepare(`
      SELECT e.id,COALESCE('충전기 ' || e.device_number,e.asset_code) AS asset_code,e.charger_type,e.canopy,e.exterior,e.interior,e.safety_checked,e.issue,e.result_detail,e.safety_checklist,
        e.site_id AS siteId,e.work_date AS workDate,e.zone_id AS zoneId,e.zone_name_snapshot AS zoneName,(? OR (${workerCanMoveEvidenceZone})) AS canMoveZone
      FROM charger_evidence e LEFT JOIN work_zones z ON z.id = e.zone_id
      WHERE e.site_id = ? AND e.work_date BETWEEN ? AND ? AND (? OR e.author_id = ?)
      ORDER BY z.name,e.device_number,e.asset_code LIMIT 201
    `).bind(Number(admin),account.id,account.email,report.siteId,report.progressFrom || report.workDate,report.workDate,Number(admin),account.id).all();
    const visible = results.slice(0, 200);
    const { results: captures } = await db.prepare(`
      SELECT id, slot, evidence_id, created_at FROM work_camera_photos
      WHERE evidence_id IN (SELECT value FROM json_each(?)) ORDER BY created_at, id
    `).bind(JSON.stringify(visible.map(device => device.id))).all();
    const byEvidence = Map.groupBy(captures, photo => photo.evidence_id);
    const devices = visible.map(({ safety_checklist,...device }) => ({ ...device, safetyChecklist:JSON.parse(safety_checklist),
      workResults: displayWorkResults(device), canMoveZone: !closed && device.canMoveZone, photos: byEvidence.get(device.id) || [] }));
    return { title: report.siteName, address: report.address, reports: [report], devices, canEditResults: admin && !closed, overflow: results.length > 200,
      ...(admin ? { billing: await readDetailBilling(db, kind, id, month) } : {}) };
  }
  if (kind === 'worker' && !admin && id !== account.id) throw missing();
  const entity = kind === 'site'
    ? await db.prepare(`
        SELECT w.name AS title, w.address, CASE WHEN ? OR p.worker_email = ? THEN p.next_due END AS nextDue
        FROM work_sites w LEFT JOIN work_plan_cycles p ON p.site_id = w.id WHERE w.id = ?
          AND (? OR p.worker_email = ?
            OR EXISTS (SELECT 1 FROM field_reports r WHERE r.site_id = w.id AND r.author_id = ?))
      `).bind(Number(admin), account.email, id, Number(admin), account.email, account.id).first()
    : await db.prepare(`
        SELECT ? AS title, ? AS email WHERE ?=?
        UNION ALL SELECT name AS title,email FROM members WHERE user_id=?
        UNION ALL SELECT author_name,'' FROM field_reports WHERE author_id=? LIMIT 1
      `).bind(account.name,account.email,id,account.id,id,id).first();
  if (!entity) throw missing();
  const workerEmail = kind === 'worker' ? entity.email : '';
  const filter = kind === 'site' ? 'r.site_id = ?' : `
    (r.author_id = ? OR (? AND EXISTS (
      SELECT 1 FROM settlement_payments p, json_each(p.worker_breakdown) w
      WHERE p.report_id = r.id AND json_extract(w.value, '$.email') = ?
    )))`;
  const args = kind === 'site' ? [id] : [id, Number(admin && Boolean(workerEmail)), workerEmail];
  const { results } = await db.prepare(`
    SELECT ${columns} FROM field_reports r
    WHERE r.work_date LIKE ? AND (${filter}) AND (? OR r.author_id = ?)
    ORDER BY r.work_date DESC, r.site_name, r.id LIMIT 101
  `).bind(month + '-%', ...args, Number(admin), account.id).all();
  const detail = { title: entity.title, address: entity.address, nextDue: entity.nextDue,
    reports: results.slice(0, 100), overflow: results.length > 100 };
  if (kind === 'site' && admin) detail.billing = await readDetailBilling(db, kind, id, month);
  if (kind === 'worker' && workerEmail) {
    const { results: payouts } = await db.prepare(`
      SELECT r.work_date AS date, r.site_name AS site, r.worker_price AS rate,
        json_extract(w.value, '$.units') AS units, json_extract(w.value, '$.paid') AS paid,
        json_extract(w.value, '$.paidDate') AS paidDate
      FROM field_reports r JOIN settlement_payments p ON p.report_id = r.id
      JOIN json_each(p.worker_breakdown) w ON json_extract(w.value, '$.email') = ?
      WHERE r.work_date LIKE ? AND r.status = 'approved' AND COALESCE(json_extract(w.value,'$.internal'),0)=0
      ORDER BY r.work_date DESC, r.site_name LIMIT 101
    `).bind(workerEmail, month + '-%').all();
    detail.payouts = payouts.slice(0, 100).map(row => {
      const expected = row.rate == null ? null : BigInt(row.rate) * BigInt(row.units);
      const paid = BigInt(row.paid);
      return { ...row, expected: reportMoney(expected),
        unpaid: reportMoney(expected == null ? null : expected > paid ? expected - paid : 0n),
        overpaid: reportMoney(expected == null ? null : paid > expected ? paid - expected : 0n) };
    });
    detail.overflow ||= payouts.length > 100;
  }
  return detail;
}

async function readDetailBilling(db, kind, id, month) {
  const filter = kind === 'report' ? 'r.id = ?' : 'r.site_id = ? AND r.work_date LIKE ?';
  const { results } = await db.prepare(`
    SELECT r.work_date AS date, p.billed, p.vat, p.received, p.paid, p.billing_ref AS billingRef
    FROM field_reports r JOIN settlement_payments p ON p.report_id = r.id
    WHERE ${filter} ORDER BY r.work_date DESC, r.id LIMIT 100
  `).bind(id, ...(kind === 'site' ? [month + '-%'] : [])).all();
  return results;
}

function reportTemplateSamples(sender, day) {
  const end = new Date(day.slice(0, 7) + '-01T00:00:00Z');
  end.setUTCDate(0);
  const month = end.toISOString().slice(0, 7);
  const sample = {
    id: 'sample', site_name: '서식 테스트 현장', site_address: '예시 주소', work_date: day, units: 2, exterior: 2, interior: 1,
    status: 'approved', notes: '서식 테스트에 사용하는 예시 작업입니다.', worker_price: 10000,
    billing_record: true, billed: 55000, vat: 5000, received: 44000, paid: 17000, billing_ref: '예시-001',
    worker_breakdown: JSON.stringify([
      { email: 'sample-a@example.invalid', name: '예시 작업자 A', units: 1, paid: 10000, paidDate: day },
      { email: 'sample-b@example.invalid', name: '예시 작업자 B', units: 1, paid: 7000, paidDate: day },
    ]),
  };
  const equipment = new Map([[sample.id, [
    { asset_code: '예시-완속-01', charger_type: 'slow', canopy: 'included', exterior: 1, interior: 1, safety_checked: 1 },
    { asset_code: '예시-급속-02', charger_type: 'fast', canopy: 'excluded', exterior: 1, interior: 0, safety_checked: 1 },
  ]]]);
  const samples = [
    ['daily', '[본연] 일일 현장 보고 · ' + day, adminDetails('daily', day, [sample], equipment)],
    ['settlement', '[본연] 관리자 월 결산 · ' + month,
      adminDetails('settlement', month, [{ ...sample, work_date: month + '-01' }], equipment, [], true)],
    ['contractor', '[본연] 서식 테스트 현장 충전기 청소 결과 · ' + day, contractorDetails(sample, equipment)],
  ];
  const notice = '자동 발송 서식 테스트 · 예시 데이터';
  return samples.map(([kind, subject, detail]) => ({
    id: 'report-details-v1-' + kind, to: sender, subject: subject + ' · 테스트',
    body: notice + '\n\n' + detail.detailText,
    html: '<p style="color:#80530e;font-weight:bold">' + notice + '</p>' + detail.html,
  }));
}

async function buildControlMail(db, env, kind, reference, context) {
  const { HttpError, validDate, koreaDate } = context;
  if (typeof reference !== 'string') throw new HttpError(400, '보고 기간 또는 현장을 선택해 주세요.');
  if (officeMailKinds.has(kind)) {
    return buildOfficeMail(db, kind, reference, context, { ...await readMailSettings(db, env), detailedReport });
  }
  if (kind === 'contractor') {
    const row = await db.prepare(`
      SELECT r.id, r.site_id, r.site_name, r.site_address, r.work_date, r.units, r.exterior, r.interior,
             s.contractor_email,s.contractor_emails,r.approved_at
      FROM field_reports r LEFT JOIN site_reporting s ON r.site_id = s.site_id
      WHERE r.id = ? AND ${finalClientReportSql('r')}
    `).bind(reference).first();
    if (!row) throw new HttpError(404, '배정 수량 전체가 완료되고 관리자 승인을 마친 현장 보고를 선택해 주세요.');
    const detail = contractorDetails(row, await reportEquipment(db, kind, reference));
    const { results:policies } = await db.prepare('SELECT email,enabled_at FROM client_mail_recipients WHERE site_id=?').bind(row.site_id).all();
    const recipientPolicies=Object.fromEntries(policies.map(policy=>[policy.email,policy.enabled_at]));
    const recipients=clientRecipients(row);
    const historicalRecipients=recipients.filter(email=>row.approved_at<(recipientPolicies[email] || legacyClientPolicy));
    return {
      recipient: recipients[0] || '',recipients,recipientPolicies,historicalRecipients,requiresHistoricalConsent:historicalRecipients.length>0,
      workDate:row.work_date,warnings:historicalRecipients.length ? ['수신처 등록 이전에 승인된 작업입니다. 과거 보고 발송 대상을 확인해 주세요.'] : [],
      subject: `[본연] ${row.site_name} 충전기 청소 결과 · ${row.work_date}`,
      text: ['안녕하세요. 본연입니다.', '', ...fieldReportLines(row, false), '', detail.detailText].join('\n'),
      html: detail.html,
    };
  }
  const recipient = await readAdminRecipient(db, env);
  if (kind === 'completion') {
    const row = await db.prepare("SELECT * FROM field_reports WHERE id = ? AND status = 'approved' AND completion_reported_at IS NOT NULL").bind(reference).first();
    if (!row) throw new HttpError(404, '관리자 승인을 마친 작업 완료 보고를 선택해 주세요.');
    const detail = completionDetails(row, await reportEquipment(db, kind, reference), env);
    return { recipient, subject: completionSubject(row), text: detail.detailText, html: detail.html };
  }
  const members = await db.prepare('SELECT email, user_id FROM members WHERE user_id IS NOT NULL').all();
  const workerIds = new Map(members.results.map(member => [member.email, member.user_id]));
  if (kind === 'daily' && validDate(reference) && reference <= koreaDate()) {
    const { results } = await db.prepare(`
      SELECT r.*, ${paymentFields} FROM field_reports r LEFT JOIN settlement_payments p ON p.report_id = r.id
      WHERE r.work_date = ? ORDER BY r.site_name
    `).bind(reference).all();
    const label = { submitted: '확인 대기', approved: '승인', revision: '보완 요청' };
    const units = results.reduce((sum, row) => sum + BigInt(row.units), 0n);
    const { results: due } = await db.prepare(`
      SELECT w.id AS site_id, w.name, p.worker_email, p.worker_name AS worker, p.next_due AS due,
             CASE WHEN p.delay_date = p.next_due THEN p.delay_reason ELSE '' END AS reason
      FROM work_plan_cycles p JOIN work_sites w ON p.site_id = w.id
      WHERE p.next_due <= ? ORDER BY p.next_due, w.name LIMIT 100
    `).bind(reference).all();
    const lines = [
      `일일 보고 ${results.length}건 · 신고된 실작업 ${formatReportNumber(units)}기`,
      `승인 ${results.filter(row => row.status === 'approved').length}건 · 확인 대기 ${results.filter(row => row.status === 'submitted').length}건 · 보완 요청 ${results.filter(row => row.status === 'revision').length}건`,
      ...results.flatMap(row => ['', ...fieldReportLines(row), '작성자: ' + row.author_name, '처리: ' + label[row.status]]),
    ];
    if (!results.length) lines.push('', '등록된 현장 보고가 없습니다.');
    if (due.length) lines.push('', '정기 작업 확인 필요', ...due.map(row =>
      `${row.name} · ${row.worker} · 예정 ${row.due}${row.reason ? ' · ' + row.reason : ''}`));
    const detail = adminDetails(kind, reference, results, await reportEquipment(db, kind, reference), due, false, env, workerIds);
    return { recipient, subject: '[본연] 일일 현장 보고 · ' + reference,
      text: [...lines, '', detail.detailText].join('\n'), html: detail.html };
  }
  if (kind === 'settlement' && validDate(reference + '-01') && reference <= koreaDate().slice(0, 7)) {
    const { results: live } = await db.prepare(`
      SELECT r.*, ${paymentFields}
      FROM field_reports r LEFT JOIN settlement_payments p ON p.report_id = r.id
      WHERE r.work_date LIKE ? ORDER BY r.work_date, r.site_name
    `).bind(reference + '-%').all();
    const close = await db.prepare('SELECT closed_at FROM settlement_months WHERE month = ?').bind(reference).first();
    let results=live;
    let legacySnapshot=false;
    if (close) {
      const { results:snapshots } = await db.prepare('SELECT report_id,data,legacy FROM settlement_snapshots WHERE month=? ORDER BY report_id').bind(reference).all();
      if (!snapshots.length) throw new HttpError(409,'마감 당시 자료를 찾을 수 없습니다. 정산 내보내기 자료를 확인해 주세요.');
      const source=new Map(live.map(row=>[row.id,row]));
      results=snapshots.map(({report_id,data,legacy})=>{
        legacySnapshot ||= Boolean(legacy);
        const row=JSON.parse(data);
        return { ...source.get(report_id),id:row.id,site_name:row.siteName,author_name:row.authorName,
          work_date:row.workDate,units:row.units,status:row.status,contract_price:row.contractPrice,
          worker_price:row.workerPrice,billed:row.billed,received:row.received,paid:row.paid,
          billing_ref:row.billingRef,note:row.note,vat:row.vat,
          billing_record:row.paymentVersion>0 || row.billed>0 || row.received>0 || row.paid>0 || row.vat!=null || Boolean(row.billingRef),worker_breakdown:JSON.stringify(row.workerBreakdown || []),
          internal_work:row.internalWork ?? 0,internal_units:row.recordedInternalUnits ?? (row.internalWork ? row.units : 0) };
      });
    }
    const approved = results.filter(row => row.status === 'approved');
    const units = approved.reduce((sum, row) => sum + BigInt(row.units), 0n);
    let revenue = 0n;
    let labor = 0n;
    let missing = 0;
    let billed = 0n;
    let received = 0n;
    let paid = 0n;
    const details = approved.map(row => {
      const count = BigInt(row.units);
      const sales = row.contract_price == null ? null : count * BigInt(row.contract_price);
      const internal = internalWorkUnits(row);
      const external = count - BigInt(internal);
      const wages = external === 0n ? 0n : row.worker_price == null ? null : external * BigInt(row.worker_price);
      revenue += sales ?? 0n;
      labor += wages ?? 0n;
      billed += BigInt(row.billed);
      received += BigInt(row.received);
      paid += BigInt(row.paid);
      if (sales === null || wages === null) missing++;
      const money = amount => amount == null ? '단가 미확정' : formatReportNumber(amount) + '원';
      return `${row.work_date} · ${row.site_name} · ${row.author_name} · ${row.region_name || '구역 미지정'} · ${row.units}기${internal ? ' · 관리자 직접 작업 ' + internal + '기 지급 제외' : ''} · 계약 ${money(sales)} · 작업자 ${money(wages)} · 청구 ${money(BigInt(row.billed))} · 입금 ${money(BigInt(row.received))} · 지급 ${money(BigInt(row.paid))}${row.billing_ref ? ' · 청구번호 ' + row.billing_ref : ''}`;
    });
    const detail = adminDetails(kind, reference, results, await reportEquipment(db, kind, reference), [], Boolean(close), env, workerIds);
    if (close && legacySnapshot) detail.html='<p>이전 마감 이관 자료 · 이관 시점 금액</p>'+detail.html;
    return {
      recipient,
      subject: '[본연] 관리자 월 결산 · ' + reference,
      text: [
        close ? (legacySnapshot ? '이전 마감 이관 자료 · 이관 시점 금액' : '월 마감 완료 · 마감 당시 확정 금액') : '월 마감 전 · 잠정 집계',
        `승인 ${approved.length}건 · 실작업 ${formatReportNumber(units)}기 · 미승인 ${results.length - approved.length}건`,
        `계약단가 확정분 ${formatReportNumber(revenue)}원 · 작업자 단가 확정분 ${formatReportNumber(labor)}원`,
        `단가 확인이 필요한 승인 보고 ${missing}건`,
        `청구 ${formatReportNumber(billed)}원 · 입금 ${formatReportNumber(received)}원 · 미수 ${formatReportNumber(billed - received)}원 · 지급 ${formatReportNumber(paid)}원 · 작업자 정산 차액 ${formatReportNumber(labor - paid)}원`,
        '금액은 실작업 수량 × 승인 시 기록한 단가 기준입니다.',
        '', ...details, '', detail.detailText,
      ].join('\n'),
      html: detail.html,
    };
  }
  throw new HttpError(400, '보고 유형과 기간을 확인해 주세요.');
}

async function dispatchControlMail(db, env, kind, reference, message, { HttpError,recipientBatchLimit=8 }) {
  if (kind === 'contractor' && message.recipients) {
    const { results:delivered } = await db.prepare("SELECT recipient FROM report_mail WHERE kind='contractor' AND reference=? AND sent_at IS NOT NULL")
      .bind(reference).all();
    const sent = new Set(delivered.map(row=>row.recipient));
    const remaining = message.recipients.filter(recipient=>!sent.has(recipient)
      && (message.allowHistorical || !message.historicalRecipients?.includes(recipient)));
    const batch = remaining.slice(0,recipientBatchLimit);
    const results = [];
    for (const recipient of batch) results.push(await dispatchControlMail(db,env,kind,reference,
      { ...message,recipient,recipients:undefined },{ HttpError }));
    return { sent:remaining.length<=batch.length,partial:remaining.length>batch.length,
      sentCount:results.length,remainingCount:remaining.length-batch.length,alreadySent:remaining.length===0 };
  }
  if (!canDeliverReports(env)) throw new HttpError(503, '메일 발신 주소와 발송 서비스 연결이 필요합니다.');
  if (!validReportEmail(message.recipient)) throw new HttpError(400, '보고 메일을 받을 이메일 주소를 등록해 주세요.');
  const deliveryId = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(JSON.stringify([kind, reference, message.recipient])))), byte => byte.toString(16).padStart(2, '0')).join('');
  const now = new Date();
  const nowText = now.toISOString();
  await db.prepare(`
    INSERT INTO report_mail (id, kind, reference, recipient, sender, subject, body, html, created_at,recipient_policy_at,historical_consent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?,?) ON CONFLICT(id) DO UPDATE SET
      sender=excluded.sender,subject=excluded.subject,body=excluded.body,html=excluded.html,created_at=excluded.created_at,
      recipient_policy_at=excluded.recipient_policy_at,historical_consent_at=excluded.historical_consent_at
    WHERE excluded.kind='contractor' AND report_mail.sent_at IS NULL AND report_mail.provider_id IS NULL AND report_mail.lease_until IS NULL
  `).bind(deliveryId, kind, reference, message.recipient, env.BONYEON_REPORT_FROM, message.subject, message.text, message.html, nowText,
    message.recipientPolicies?.[message.recipient] || null,message.allowHistorical ? nowText : null).run();
  const stored = await db.prepare('SELECT * FROM report_mail WHERE id = ?').bind(deliveryId).first();
  if (stored.sent_at) return { sent: true, alreadySent: true, sentAt: stored.sent_at };
  if (+now - Date.parse(stored.created_at) >= 23 * 3600_000) {
    throw new HttpError(409, '이전 발송 결과를 메일 서비스에서 확인해 주세요. 중복 발송을 방지하기 위해 재시도를 중단했습니다.');
  }
  const until = new Date(+now + 45_000).toISOString();
  const target = kind==='contractor' ? queuedMailRoute({kind,reference,recipient:message.recipient,
    recipient_policy_at:stored.recipient_policy_at,historical_consent_at:stored.historical_consent_at},env) : null;
  // Reserve and read the same snapshot; another request may refresh an unclaimed row.
  const claim = await db.prepare(`
    UPDATE report_mail SET lease_until = ?
    WHERE id = ? AND sent_at IS NULL AND (lease_until IS NULL OR lease_until <= ?)
      ${target ? `AND ?=(${target.sql})` : ''}
    RETURNING sender,recipient,subject,body,html
  `).bind(until, deliveryId, nowText,...(target ? [message.recipient,...target.args] : [])).first();
  if (!claim) throw new HttpError(409, '수신처·완료 상태가 변경됐거나 같은 메일을 처리 중입니다. 미리보기를 다시 확인해 주세요.');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.BONYEON_RESEND_API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'bonyeon-report/' + deliveryId,
      },
      body: JSON.stringify({ from: claim.sender, to: [claim.recipient], subject: claim.subject, text: claim.body, ...(claim.html ? { html: claim.html } : {}) }),
      signal: AbortSignal.timeout(12_000),
    });
    const receipt = await response.json();
    if (!response.ok || typeof receipt?.id !== 'string') throw new Error('Provider did not accept the message');
    const sentAt = new Date().toISOString();
    await db.prepare('UPDATE report_mail SET provider_id = ?, sent_at = ?, lease_until = NULL WHERE id = ?')
      .bind(receipt.id, sentAt, deliveryId).run();
    return { sent: true, alreadySent: false, sentAt };
  } catch {
    throw new HttpError(502, '메일 발송 결과를 확인하지 못했습니다. 발송 설정을 확인하고 잠시 후 다시 시도해 주세요.');
  }
}

async function requireReportRunner(request, env, context) {
  const secret = env.BONYEON_REPORT_RUN_SECRET;
  const token = request.headers.get('Authorization') ?? '';
  const digest = env.BONYEON_REPORT_RUN_DIGEST;
  if (/^[a-f0-9]{64}$/.test(digest || '')) {
    const bearer = /^Bearer ([a-f0-9]{64})$/.exec(token)?.[1];
    if (bearer) {
      const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bearer)));
      const actual = Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');
      let difference=0;
      for (let index=0;index<digest.length;index++) difference |= digest.charCodeAt(index)^actual.charCodeAt(index);
      if (!difference) return;
    }
  } else if (typeof secret === 'string' && secret.length>=32 && token==='Bearer ' + secret) {
    return;
  }
  throw new context.HttpError(403, '정기 보고 발송 권한이 없습니다.');
}

async function runScheduledReports(request, env, context) {
  await requireReportRunner(request, env, context);
  if (gmailConfigured(env)) throw new context.HttpError(409, '이 사이트는 Gmail 대기열에서 자동 발송합니다.');
  if (!canDeliverReports(env) || !context.validDate(env.BONYEON_REPORT_START_DATE)) {
    throw new context.HttpError(503, '발신 서비스와 자동 발송 시작일을 먼저 설정해 주세요.');
  }
  const yesterday = controlDate(Date.now() - 86400_000);
  const start = new Date(env.BONYEON_REPORT_START_DATE + 'T00:00:00+09:00').toISOString();
  const [year, month] = context.koreaDate().split('-').map(Number);
  const lastMonth = new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 7);
  const closed = await env.DB.prepare(`
    SELECT c.month FROM settlement_months c WHERE c.month <= ? AND c.closed_at >= ?
      AND NOT EXISTS (SELECT 1 FROM report_mail m WHERE m.kind = 'settlement' AND m.reference = c.month AND m.sent_at IS NOT NULL)
    ORDER BY c.month LIMIT 1
  `).bind(lastMonth, start).first();
  const { results: contractorReports } = await env.DB.prepare(`
    SELECT r.id FROM field_reports r JOIN site_reporting s ON s.site_id = r.site_id
    WHERE ${finalClientReportSql('r')} AND r.approved_at >= ? AND s.contractor_email <> ''
      AND EXISTS (SELECT 1 FROM json_each(${clientRecipientsSql('s')}) c WHERE c.value<>''
        AND EXISTS(SELECT 1 FROM client_mail_recipients p WHERE p.site_id=r.site_id AND p.email=c.value AND r.approved_at>=p.enabled_at)
        AND NOT EXISTS (SELECT 1 FROM report_mail m WHERE m.kind='contractor' AND m.reference=r.id AND m.recipient=c.value AND m.sent_at IS NOT NULL))
    ORDER BY r.approved_at, r.id LIMIT 10
  `).bind(start).all();
  const jobs = [
    ...(yesterday >= env.BONYEON_REPORT_START_DATE ? [['daily', yesterday]] : []),
    ...(closed && context.koreaDate() >= env.BONYEON_REPORT_START_DATE ? [['settlement', closed.month]] : []),
    ...(context.koreaDate() >= env.BONYEON_REPORT_START_DATE ? contractorReports.map(row => ['contractor', row.id]) : []),
  ];
  const results = [];
  for (const [kind, reference] of jobs) {
    try {
      const message = await buildControlMail(env.DB, env, kind, reference, context);
      const result = await dispatchControlMail(env.DB, env, kind, reference, message, { ...context,recipientBatchLimit:3 });
      results.push({ kind, reference, ...result });
    } catch (error) {
      results.push({ kind, reference, sent: false, error: error instanceof context.HttpError ? error.message : '발송 처리 오류' });
    }
    if (kind==='contractor') break;
  }
  return context.json({ results }, results.some(row => !row.sent) ? 502 : 200);
}

async function mailPreviewToken(kind, reference, message, signalId) {
  const parts = [kind, reference, message.recipient, message.subject, message.text, message.html];
  if (kind === 'contractor') parts.push(message.recipients || [message.recipient],message.recipientPolicies || {});
  if (signalId !== undefined) parts.push(signalId);
  const bytes = new TextEncoder().encode(JSON.stringify(parts));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

function controlMailReference(kind, reference) {
  if (kind !== 'worker' || typeof reference !== 'string') return reference;
  return reference.slice(0, 8) + reference.slice(8).toLowerCase();
}

function officeSnapshotLink(kind, token, env) {
  const url = portalDetailUrl(env, 'mail', token);
  const label = kind === 'worker' ? '작업 배정·지급 상세 보기' : '세무 비용 자료 상세 보기';
  return { text: label + '\n' + url + '\n본연 사이트 로그인 필요',
    html: `<p style="margin:0 0 16px;font:14px Arial,sans-serif"><a href="${reportEscape(url)}" target="_blank" rel="noopener" style="display:inline-block;background:#17609a;color:#fff;padding:9px 14px;border-radius:5px;text-decoration:none">${label}</a> <span style="color:#526477">본연 사이트 로그인 필요</span></p>` };
}

function identifyOfficeSnapshot(kind, message, token, env) {
  if (!officeMailKinds.has(kind)) return message;
  const identified = { ...message, subject: message.subject + ' · 자료 ' + token.slice(0, 8).toUpperCase() };
  if (!env) return identified;
  const link = officeSnapshotLink(kind, token, env);
  return { ...identified, text: identified.text + '\n\n' + link.text, html: link.html + identified.html };
}

function gmailOfficeBody(kind, key, body, html, env) {
  if (!officeMailKinds.has(kind) || !key) return { body, html };
  const encoder = new TextEncoder();
  if (encoder.encode(body).length + encoder.encode(html || '').length <= 170_000) return { body, html };
  const link = officeSnapshotLink(kind, key, env);
  const notice = '자료 분량이 길어 전체 내역을 본연 관제에 보관했습니다.';
  return { body: notice + '\n\n' + link.text, html: '<p>' + notice + '</p>' + link.html };
}

const reportMailMarker = 'bonyeon-report:gzip:';
const reportMailRowLimit = 1_350_000;
const reportArchiveMarker = 'bonyeon-report:archive:';
const reportMailInlineLimit = 12_000_000;
const reportMailRawLimit = 24_000_000;
const reportMailJsonLimit = 32_000_000;

function reportArchiveInfo(body, html) {
  if (html || !body?.startsWith(reportArchiveMarker)) return null;
  const match = /^bonyeon-report:archive:([a-f0-9]{64}):([0-9]{1,8}):([a-f0-9]{64})$/.exec(body);
  if (!match || Number(match[2]) > reportMailRawLimit) throw new Error('보관된 보고 자료의 확인 정보가 올바르지 않습니다.');
  return { hash:match[1], size:Number(match[2]), gzipHash:match[3] };
}

async function reportDigest(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');
}

function reportArchiveQuery(env) {
  const budget = env.reportMailQueryBudget;
  if (budget && !budget.has(1)) throw new Error('보고 자료 보관 확인은 다음 실행에서 재시도합니다.');
  budget?.spend(1);
}

async function limitedReportBytes(stream, limit) {
  const reader = stream.getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { done,value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) throw new Error('보고 자료가 안전한 처리 한도를 초과했습니다.');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(()=>{});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
  return bytes;
}

async function storedReportArchive(env, hash) {
  if (!env.BUCKET) throw new Error('보고 자료 보관 저장소를 연결해 주세요.');
  reportArchiveQuery(env);
  const object = await env.BUCKET.get('report-archives/'+hash);
  return object ? limitedReportBytes(object.body,reportMailJsonLimit) : null;
}

async function verifiedReportArchive(env, archive) {
  const bytes = await storedReportArchive(env,archive.hash);
  if (!bytes || await reportDigest(bytes) !== archive.gzipHash) throw new Error('보관된 보고 자료를 확인할 수 없어 재시도가 필요합니다.');
  return bytes;
}

function reportArchiveNotice(env, archive) {
  const url = portalDetailUrl(env,'archive',archive.hash);
  const notice = '전체 보고 자료를 본연 관제에 안전하게 보관했습니다. 로그인 후 상세 페이지에서 HTML 또는 텍스트 파일을 내려받아 모든 내역을 확인해 주세요.';
  return { body:notice+'\n\n'+url+'\n관리자 로그인 필요',
    html:'<p>'+notice+'</p><p><a href="'+reportEscape(url)+'" target="_blank" rel="noopener">전체 보고 자료 열기 및 다운로드</a> · 관리자 로그인 필요</p>' };
}

function packedGmailBody(kind, key, packed, text, html, env) {
  const archive = reportArchiveInfo(packed.text,packed.html);
  return archive?.size > reportMailInlineLimit ? reportArchiveNotice(env,archive) : gmailOfficeBody(kind,key,text,html,env);
}

function reportJsonWithinLimit(text, html, size) {
  let length = size + 7; // Two quoted strings inside a JSON array.
  for (const value of [text,html]) {
    const escaped = /["\\\u0000-\u001f\ud800-\udfff]/g;
    for (let match; (match = escaped.exec(value));) {
      const code = match[0].charCodeAt(0);
      if (code >= 0xd800 && code <= 0xdbff && /[\udc00-\udfff]/.test(value[escaped.lastIndex] || '')) {
        escaped.lastIndex++;
        continue;
      }
      const shortEscape = code === 8 || code === 9 || code === 10 || code === 12 || code === 13;
      length += code >= 0xd800 ? 3 : code < 32 && !shortEscape ? 5 : 1;
      if (length > reportMailJsonLimit) return false;
    }
  }
  return length <= reportMailJsonLimit;
}

async function packReportMail(text, html, env) {
  const encoder = new TextEncoder();
  html ||= '';
  const size = encoder.encode(text).length + encoder.encode(html).length;
  if (size > reportMailRawLimit) return null;
  if (size <= reportMailRowLimit) return { text, html };
  // Reject escape-heavy input before JSON.stringify can allocate a much larger copy.
  if (!reportJsonWithinLimit(text,html,size)) return null;
  const raw = encoder.encode(JSON.stringify([text,html]));
  if (raw.length > reportMailJsonLimit) return null;
  const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  if (size > reportMailInlineLimit || Math.ceil(bytes.length/3)*4 + reportMailMarker.length > reportMailRowLimit) {
    if (!env?.BUCKET || (env.reportMailQueryBudget && !env.reportMailQueryBudget.has(5))) return null;
    const hash = await reportDigest(raw);
    let gzipHash = await reportDigest(bytes);
    const key = 'report-archives/'+hash;
    let exists;
    if (env.BUCKET.head) {
      reportArchiveQuery(env);
      exists = await env.BUCKET.head(key);
    } else exists = true;
    const previous = exists ? await storedReportArchive(env,hash) : null;
    let verified = false;
    if (previous) {
      const previousHash = await reportDigest(previous);
      verified = previousHash === gzipHash;
      if (!verified) {
        // A different gzip implementation can encode identical JSON differently.
        // Preserve a valid immutable object so older row references remain usable.
        try {
          const decoded = await limitedReportBytes(new Blob([previous]).stream().pipeThrough(new DecompressionStream('gzip')),reportMailJsonLimit);
          verified = await reportDigest(decoded) === hash;
        } catch { verified = false; }
        if (verified) gzipHash = previousHash;
      }
    }
    if (!verified) {
      reportArchiveQuery(env);
      await env.BUCKET.put(key,bytes,{ httpMetadata:{ contentType:'application/gzip' } });
      await verifiedReportArchive(env,{hash,gzipHash});
    }
    return { text:reportArchiveMarker+hash+':'+size+':'+gzipHash, html:'' };
  }
  let binary = '';
  for (let offset=0;offset<bytes.length;offset+=8192) binary += String.fromCharCode(...bytes.subarray(offset,offset+8192));
  return { text:reportMailMarker+btoa(binary),html:'' };
}

async function unpackReportMail(body, html, env, { full = false } = {}) {
  const archive = reportArchiveInfo(body,html);
  if (archive) {
    const bytes = await verifiedReportArchive(env,archive);
    if (!full && archive.size > reportMailInlineLimit) return reportArchiveNotice(env,archive);
    const raw = await limitedReportBytes(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),reportMailJsonLimit);
    if (await reportDigest(raw) !== archive.hash) throw new Error('보관된 보고 자료의 내용이 일치하지 않습니다.');
    const payload = JSON.parse(new TextDecoder().decode(raw));
    if (!Array.isArray(payload) || payload.length !== 2 || payload.some(value=>typeof value !== 'string') ||
      new TextEncoder().encode(payload[0]).length + new TextEncoder().encode(payload[1]).length !== archive.size) {
      throw new Error('보관된 보고 자료의 형식이 올바르지 않습니다.');
    }
    return { body:payload[0],html:payload[1] };
  }
  if (html || !body.startsWith(reportMailMarker)) return { body, html };
  const bytes = Uint8Array.from(atob(body.slice(reportMailMarker.length)), char => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const [text, markup] = await new Response(stream).json();
  return { body:text, html:markup };
}

const heldReportText = '보고 분량이 발송 저장 한도를 초과했습니다. 관제에서 해당 보고 기간의 상세 내역을 확인해 주세요.';
function storageHeldReport(alias = '') {
  const field = name => alias ? alias + '.' + name : name;
  return `(${field('hold_at')} IS NOT NULL AND ${field('sent_at')} IS NULL AND ${field('claim_request_id')} IS NULL
    AND ${field('provider_id')} LIKE 'gmail:%' AND ${field('body')} = '${heldReportText}' AND ${field('html')} = '')`;
}

async function readOfficeSnapshot(db, key, account, { HttpError }, env) {
  const missing = () => new HttpError(404, '조회할 수 있는 메일 자료가 없습니다.');
  if (!/^[a-f0-9]{64}$/.test(key || '')) throw missing();
  const row = await db.prepare(`
    SELECT kind, reference, recipient, subject, html, body AS text, sent_at AS sentAt, created_at AS createdAt
    FROM report_mail WHERE kind IN ('worker', 'tax') AND payload_key = ? AND canceled_at IS NULL
  `).bind(key).first();
  if (!row || (!canManageReports(account) && !(row.kind === 'worker' && row.sentAt && row.recipient === account.email
    && row.reference.slice(8) === account.email))) throw missing();
  const { body, html } = await unpackReportMail(row.text,row.html,env,{full:true});
  return { kind: row.kind, subject: row.subject, html, text: body, sentAt: row.sentAt, createdAt: row.createdAt };
}

async function officeAcceptanceStatus(db, day) {
  const { results } = await db.prepare(`
    SELECT kind, subject, recipient, payload_key AS detailKey, created_at AS createdAt, sent_at AS sentAt,
      hold_at AS holdAt, canceled_at AS canceledAt, provider_id IS NOT NULL AS claimed
    FROM report_mail WHERE test_day = ? ORDER BY kind DESC
  `).bind(day).all();
  return { messages: results };
}

async function queueOfficeAcceptance(env, account, day, { HttpError }) {
  const db = env.DB;
  const settings = await readMailSettings(db, env);
  if (!gmailConfigured(env) || !settings.officeAutoEnabled || settings.workerMailEnabled || settings.taxEmail !== settings.centralEmail
    || !(await db.prepare('SELECT 1 FROM gmail_report_runner WHERE id = 1').first())) {
    throw new HttpError(409, '검증용 메일은 두 수신처가 본연 Gmail이고 자동 발송이 켜져 있을 때만 등록할 수 있습니다.');
  }
  const createdAt = new Date().toISOString();
  const values = [];
  for (const [kind, rendered] of buildOfficeAcceptanceMails(day, settings.centralEmail, detailedReport)) {
    if (rendered.blocking.length) throw new HttpError(500, '검증 자료의 필수 항목을 확인해 주세요.');
    const reference = 'test:' + day;
    const notice = '예약 자동발송 검증 · 운영 장부와 분리된 예시 데이터';
    const fixture = { ...rendered, subject: rendered.subject + ' · 자동발송 테스트 ' + day,
      text: notice + '\n\n' + rendered.text,
      html: '<p style="font-weight:bold;color:#80530e">' + notice + '</p>' + rendered.html };
    const key = await mailPreviewToken(kind, reference, fixture);
    const payload = identifyOfficeSnapshot(kind, fixture, key, env);
    values.push('gmail:test:' + day + ':' + kind, kind, reference, payload.recipient, settings.centralEmail,
      payload.subject, payload.text, payload.html, createdAt, account.id, key, day);
  }
  await db.prepare(`
    INSERT INTO report_mail(id,kind,reference,recipient,sender,subject,body,html,created_at,requested_by,payload_key,test_day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING
  `).bind(...values).run();
  return officeAcceptanceStatus(db, day);
}

async function queueGmailMail(db, env, account, kind, reference, message, key, { HttpError }) {
  if (!(await db.prepare('SELECT 1 FROM gmail_report_runner WHERE id = 1').first())) {
    throw new HttpError(503, '본연 Gmail 자동 발송을 연결해 주세요.');
  }
  const stored = await packReportMail(message.text,message.html,env);
  if (!stored) throw new HttpError(413,heldReportText);
  if (kind === 'contractor') {
    const recipients = message.recipients || [message.recipient];
    const stamp = new Date().toISOString();
    const result = await db.prepare(`
      INSERT INTO report_mail(id,kind,reference,recipient,sender,subject,body,html,created_at,requested_by,recipient_policy_at,historical_consent_at)
      SELECT 'gmail:manual:' || lower(hex(randomblob(16))),'contractor',?,c.value,?,?,?,?,?,?,
        (SELECT enabled_at FROM client_mail_recipients WHERE site_id=(SELECT site_id FROM field_reports WHERE id=?) AND email=c.value),?
      FROM json_each(?) c
      WHERE ?=(SELECT ${clientRecipientsSql('s')} FROM site_reporting s JOIN field_reports r ON r.site_id=s.site_id
        WHERE r.id=? AND ${finalClientReportSql('r')})
        AND NOT EXISTS (SELECT 1 FROM report_mail m WHERE m.kind='contractor' AND m.reference=? AND m.recipient=c.value
          AND m.canceled_at IS NULL AND (m.sent_at IS NOT NULL OR m.provider_id LIKE 'gmail:%' OR m.requested_by IS NOT NULL))
    `).bind(reference,env.BONYEON_GMAIL_FROM,message.subject,stored.text,stored.html,stamp,account.id,reference,message.allowHistorical ? stamp : null,
      JSON.stringify(recipients),JSON.stringify(recipients),reference,reference).run();
    const previous = await db.prepare(`SELECT COUNT(*) AS total,SUM(sent_at IS NOT NULL) AS sent
      FROM report_mail WHERE kind='contractor' AND reference=? AND canceled_at IS NULL
        AND recipient IN (SELECT value FROM json_each(?))
        AND (sent_at IS NOT NULL OR provider_id LIKE 'gmail:%' OR requested_by IS NOT NULL)`)
      .bind(reference,JSON.stringify(recipients)).first();
    if (!result.meta.changes && previous.total < recipients.length) throw new HttpError(409,'수신처가 변경되었습니다. 미리보기를 다시 확인해 주세요.');
    return { queued:previous.sent<recipients.length,queuedCount:result.meta.changes,
      alreadyQueued:!result.meta.changes && previous.sent<recipients.length,alreadySent:previous.sent>=recipients.length };
  }
  const snapshot = officeMailKinds.has(kind);
  const existing = snapshot ? '(payload_key = ? OR office_base_key = ?)' : `kind = ? AND reference = ?
    AND (sent_at IS NOT NULL OR provider_id LIKE 'gmail:%' OR requested_by IS NOT NULL)`;
  const identity = snapshot ? [key, key] : [kind, reference];
  const stamp = new Date().toISOString();
  const result = await db.prepare(`
    INSERT INTO report_mail (id, kind, reference, recipient, sender, subject, body, html, created_at, requested_by, payload_key)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM report_mail WHERE canceled_at IS NULL AND ${existing})
    ON CONFLICT DO NOTHING
  `).bind('gmail:manual:' + crypto.randomUUID(), kind, reference, message.recipient, env.BONYEON_GMAIL_FROM,
    message.subject, stored.text, stored.html, stamp, account.id, key, ...identity).run();
  if (result.meta.changes) return { queued: true };
  const previous = await db.prepare(`SELECT sent_at FROM report_mail WHERE canceled_at IS NULL AND ${existing} LIMIT 1`)
    .bind(...identity).first();
  return { queued: !previous?.sent_at, alreadyQueued: !previous?.sent_at, alreadySent: Boolean(previous?.sent_at) };
}

function queuedMailRoute(job, env) {
  if (job.test_day?.startsWith('verification:')) return { sql: 'SELECT ?', args: [env.BONYEON_GMAIL_FROM] };
  if (job.test_day) return { sql: `SELECT ? WHERE EXISTS (
    SELECT 1 FROM control_settings WHERE id = 1 AND tax_email = ? AND worker_mail_enabled = 0 AND office_auto_enabled = 1
  )`, args: [env.BONYEON_GMAIL_FROM, env.BONYEON_GMAIL_FROM] };
  if (job.kind === 'worker') {
    return { sql: `SELECT CASE WHEN COALESCE((SELECT worker_mail_enabled FROM control_settings WHERE id = 1), 0)
                            THEN email ELSE ? END
                  FROM members WHERE role IN ('cleaner','admin') AND active=1 AND email=?`,
      args: [env.BONYEON_GMAIL_FROM, job.reference.slice(8).trim().toLowerCase()] };
  }
  if (job.kind === 'consultation') return { sql:'SELECT ?',args:[env.BONYEON_CONSULTATION_EMAIL || env.BONYEON_GMAIL_FROM] };
  if (job.kind === 'tax') return { sql: 'SELECT tax_email FROM control_settings WHERE id = 1', args: [] };
  if (job.kind === 'completion') return {
    sql: `SELECT COALESCE((SELECT admin_email FROM control_settings WHERE id=1), ?)
      FROM field_reports WHERE id=? AND status='approved' AND completion_reported_at IS NOT NULL`,
    args: [env.BONYEON_OWNER_EMAIL || '', job.reference],
  };
  if (job.kind === 'contractor') {
    return { sql: `SELECT c.email AS value FROM field_reports r JOIN client_mail_recipients c ON c.site_id=r.site_id
                   WHERE r.id=? AND ${finalClientReportSql('r')} AND c.email=? AND c.enabled_at=COALESCE(?,?)
                     AND (r.approved_at>=c.enabled_at OR ? IS NOT NULL)`,
      args:[job.reference,job.recipient,job.recipient_policy_at || null,legacyClientPolicy,job.historical_consent_at || null] };
  }
  return { sql: 'SELECT COALESCE((SELECT admin_email FROM control_settings WHERE id = 1), ?)', args: [env.BONYEON_OWNER_EMAIL || ''] };
}

export async function queueVerificationCompletion(request, env, qa, id, ownerId) {
  const mailbox = env.BONYEON_GMAIL_FROM;
  if (!validGmailRecipient(mailbox) || !(await env.DB.prepare('SELECT 1 FROM gmail_report_runner WHERE id = 1').first())) {
    return Response.json({ error: '운영 Gmail 실행기를 먼저 연결해 주세요.' }, { status: 503 });
  }
  const row = await qa.DB.prepare("SELECT * FROM field_reports WHERE id = ? AND status = 'approved'").bind(id).first();
  if (!row) return Response.json({ error: '승인된 검증 작업 완료 보고를 찾을 수 없습니다.' }, { status: 404 });
  const equipment = await reportEquipment(qa.DB, 'completion', id);
  if (!equipment.get(id)?.length) return Response.json({ error: '검증 보고에 첨부된 증빙이 없습니다.' }, { status: 409 });
  const origin = (env.BONYEON_FRONTEND_ORIGIN || new URL(request.url).origin) + '/verification';
  const detail = completionDetails(row, equipment, { ...qa, BONYEON_SITE_ORIGIN: origin });
  const url = origin + '/' + detailPath('report', id);
  const camera = await qa.DB.prepare(`SELECT 1 FROM charger_evidence WHERE site_id=? AND work_date BETWEEN ? AND ?
    AND json_array_length(capture_ids)>0 LIMIT 1`).bind(row.site_id,row.progress_from || row.work_date,row.work_date).first();
  const notice = camera ? '테스트 완료 보고 · 현장 카메라 증빙이 포함된 검증 기록' : '테스트 완료 보고 · 가상 증빙 사진이 포함된 검증 기록';
  const reportLink = `<p><a href="${reportEscape(url)}" target="_blank" rel="noopener">청소 전후 사진 및 검증 보고서 열기</a></p>`;
  const reference = 'verification:' + id;
  const baseSubject = completionSubject(row) + ' · 검증 테스트';
  const text = notice + '\n\n' + detail.detailText + '\n\n' + url;
  const html = '<p>' + notice + '</p>' + reportLink + detail.html;
  const key = await mailPreviewToken('completion', reference, { recipient: mailbox, subject: baseSubject, text, html });
  const deliveryId = 'gmail:qa-completion:' + id + ':' + key.slice(0, 16);
  const previous = await env.DB.prepare('SELECT 1 FROM report_mail WHERE kind = ? AND reference = ? AND id <> ?').bind('completion', reference, deliveryId).first();
  const subject = baseSubject + (previous ? ' · 수정본 ' : ' · 자료 ') + key.slice(0, 8).toUpperCase();
  const stamp = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO report_mail(id,kind,reference,recipient,sender,subject,body,html,created_at,requested_by,test_day)
    VALUES (?,'completion',?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING
  `).bind(deliveryId, reference, mailbox, mailbox, subject, text, html, stamp, ownerId, 'verification:' + controlDate(Date.now())).run();
  const receipt = await env.DB.prepare('SELECT sent_at AS sentAt, hold_at AS holdAt FROM report_mail WHERE id = ?').bind(deliveryId).first();
  return Response.json({ subject, ...receipt }, { headers: { 'Cache-Control': 'no-store' } });
}

const availableGmailRequest = `(? IS NULL OR NOT EXISTS (SELECT 1 FROM report_mail WHERE claim_request_id = ?))`;

function gmailClaimBudget(db) {
  let queries = 0;
  const wrap = statement => ({
    bind: (...args) => wrap(statement.bind(...args)),
    first: (...args) => { queries++; return statement.first(...args); },
    all: (...args) => { queries++; return statement.all(...args); },
    run: (...args) => { queries++; return statement.run(...args); },
  });
  return { db: { prepare: sql => wrap(db.prepare(sql)) }, has: reserve => queries + reserve <= 38,
    // D1 counts a media-store batch as one query, including its chunk statements.
    spend: count => { queries += count; } };
}

async function claimQueuedGmailReport(db, env, now, requestId, budget, context, consultation = false) {
  if (!budget.has(3)) return null;
  const { results: jobs } = await db.prepare(`
    SELECT id, kind, reference, recipient, subject, body, html, payload_key, test_day,recipient_policy_at,historical_consent_at,requested_by FROM report_mail
    WHERE requested_by IS NOT NULL AND sent_at IS NULL AND canceled_at IS NULL AND provider_id IS NULL AND hold_at IS NULL
      AND (kind = 'consultation') = ?
    ORDER BY created_at, id LIMIT 8
  `).bind(Number(consultation)).all();
  for (let job of jobs) {
    if (!budget.has(3)) break;
    let prepared;
    if (job.kind === 'completion' && job.requested_by === 'auto:approval') {
      if (!budget.has(12)) break;
      let message;
      try { message = await buildControlMail(db, env, 'completion', job.reference, context); }
      catch (error) {
        if (!(error instanceof context.HttpError) || error.status !== 404) throw error;
        await db.prepare('UPDATE report_mail SET canceled_at=? WHERE id=? AND provider_id IS NULL AND sent_at IS NULL')
          .bind(now.toISOString(),job.id).run();
        continue;
      }
      if (!validGmailRecipient(message.recipient)) continue;
      const packed = await packReportMail(message.text,message.html,env);
      const body = packed?.text ?? heldReportText;
      const html = packed?.html ?? '';
      const stored = await db.prepare(`UPDATE report_mail SET recipient=?,sender=?,subject=?,body=?,html=?,
        hold_at=?,provider_id=?,payload_key=?
        WHERE id=? AND body=? AND provider_id IS NULL AND sent_at IS NULL AND canceled_at IS NULL
          AND EXISTS(SELECT 1 FROM field_reports WHERE id=report_mail.reference AND status='approved')`)
        .bind(message.recipient,env.BONYEON_GMAIL_FROM,message.subject,body,html,
          packed ? null : now.toISOString(),packed ? null : 'gmail:storage:' + crypto.randomUUID(),
          packed ? null : await mailPreviewToken('completion',job.reference,message),job.id,job.body).run();
      if (!stored.meta.changes || !packed) continue;
      job = { ...job,recipient:message.recipient,subject:message.subject,body,html };
      prepared = { packed,text:message.text,html:message.html };
    }
    const recipient = consultation ? env.BONYEON_CONSULTATION_EMAIL || env.BONYEON_GMAIL_FROM : job.recipient;
    if (!validGmailRecipient(recipient)) continue;
    const target = queuedMailRoute(job, env);
    // A consultation can change mailbox only before any reservation or Gmail attempt.
    const current = `? = (${target.sql}) AND (
      kind NOT IN ('worker', 'tax') OR NOT EXISTS (
        SELECT 1 FROM report_mail newer WHERE newer.kind = report_mail.kind AND newer.reference = report_mail.reference
          AND newer.recipient = report_mail.recipient AND newer.canceled_at IS NULL AND newer.rowid > report_mail.rowid
      )
    )`;
    const claim = crypto.randomUUID();
    const reserved = await db.prepare(`
      UPDATE report_mail SET
        recipient = ?,
        provider_id = CASE WHEN ${current} THEN ? ELSE NULL END,
        claim_request_id = CASE WHEN ${current} THEN ? ELSE NULL END,
        canceled_at = CASE WHEN ${current} OR (kind='completion' AND requested_by='auto:approval') THEN NULL ELSE ? END
      WHERE id = ? AND sent_at IS NULL AND canceled_at IS NULL AND provider_id IS NULL AND ${availableGmailRequest}
      RETURNING provider_id
    `).bind(recipient, recipient, ...target.args, 'gmail:' + claim, recipient, ...target.args, requestId,
      recipient, ...target.args, now.toISOString(), job.id, requestId, requestId).first();
    if (reserved?.provider_id) {
      if (prepared) return { id:job.id,claim,to:recipient,subject:job.subject,
        ...packedGmailBody(job.kind,null,prepared.packed,prepared.text,prepared.html,env) };
      const { body, html } = await unpackReportMail(job.body,job.html,env);
      return { id:job.id,claim,to:recipient,subject:job.subject,...gmailOfficeBody(job.kind,job.payload_key,body,html,env) };
    }
  }
  return null;
}

const currentOfficeAssignment = `EXISTS (
  SELECT 1 FROM work_plans w WHERE w.site_id = s.source_id AND w.worker_email = substr(s.reference, 9)
    AND substr(w.start_date, 1, 7) = substr(s.reference, 1, 7)
)`;
const currentOfficeAllocation = `EXISTS (
  SELECT 1 FROM settlement_payments p, json_each(p.worker_breakdown) w
  WHERE p.report_id = s.source_id AND json_extract(w.value, '$.email') = substr(s.reference, 9)
    AND COALESCE(json_extract(w.value,'$.internal'),0)=0
)`;
const officeWithdrawal = `s.withdrawn = 1 AND (
  (s.source = 'assignment' AND NOT (${currentOfficeAssignment}))
  OR (s.source = 'payout' AND NOT (${currentOfficeAllocation}))
) AND EXISTS (
  SELECT 1 FROM report_mail prior WHERE prior.kind = 'worker' AND prior.reference = s.reference
    AND prior.sent_at IS NOT NULL AND prior.canceled_at IS NULL
)`;
const activeOfficeSignals = `
  (CASE s.source
    WHEN 'assignment' THEN ${currentOfficeAssignment}
    WHEN 'payout' THEN EXISTS (
      SELECT 1 FROM settlement_payments p JOIN field_reports r ON r.id = p.report_id, json_each(p.worker_breakdown) w
      WHERE p.report_id = s.source_id AND r.status = 'approved' AND r.worker_price IS NOT NULL
        AND json_extract(w.value, '$.email') = substr(s.reference, 9)
        AND COALESCE(json_extract(w.value,'$.internal'),0)=0
        AND (json_extract(w.value, '$.paid') = 0 OR COALESCE(json_extract(w.value, '$.paidDate'), '') <> '')
    )
    ELSE EXISTS (SELECT 1 FROM settlement_months c WHERE c.month = s.reference)
  END) OR (${officeWithdrawal})`;
const officeHandledSignal = `MAX(COALESCE(progress.signal_id, 0), COALESCE((
  SELECT MAX(m.office_signal_id) FROM report_mail m
  WHERE m.kind = s.kind AND m.reference = s.reference AND m.office_signal_id IS NOT NULL AND m.canceled_at IS NULL
    AND NOT ${storageHeldReport('m')}
), 0))`;

const activeTaxMail = `EXISTS (SELECT 1 FROM report_mail m WHERE m.kind = 'tax' AND m.reference = ?
  AND m.canceled_at IS NULL AND (m.sent_at IS NOT NULL OR m.provider_id LIKE 'gmail:%' OR m.requested_by IS NOT NULL))`;
const lastWorkerPayload = `SELECT COALESCE(m.office_base_key, m.payload_key) AS baseKey FROM report_mail m
  WHERE m.kind = 'worker' AND m.reference = ? AND m.recipient = ? AND m.canceled_at IS NULL
  ORDER BY m.rowid DESC LIMIT 1`;

async function markOfficeSignal(db, kind, reference, id) {
  await db.prepare(`
    INSERT INTO office_mail_progress(kind, reference, signal_id) VALUES (?, ?, ?)
    ON CONFLICT(kind, reference) DO UPDATE SET signal_id = MAX(signal_id, excluded.signal_id)
  `).bind(kind, reference, id).run();
}

async function readOfficeWithdrawals(db, reference, signalId) {
  const { results } = await db.prepare(`
    SELECT DISTINCT s.source, s.withdrawn_date AS date
    FROM office_mail_signals s LEFT JOIN office_mail_progress progress ON progress.kind = s.kind AND progress.reference = s.reference
    WHERE s.kind = 'worker' AND s.reference = ? AND s.id <= ? AND s.id > ${officeHandledSignal} AND (${officeWithdrawal})
    ORDER BY date, s.source
  `).bind(reference, signalId).all();
  return results;
}

async function claimOfficeMail(env, context, now, requestId, budget) {
  if (!budget.has(5)) return null;
  const db = env.DB;
  const settings = await readMailSettings(db, env);
  if (!settings.officeAutoEnabled) return null;
  const { results: candidates } = await db.prepare(`
    SELECT s.kind, s.reference, MAX(s.id) AS signalId
    FROM office_mail_signals s LEFT JOIN office_mail_progress progress ON progress.kind = s.kind AND progress.reference = s.reference
    WHERE s.id > ${officeHandledSignal} AND (${activeOfficeSignals})
      AND NOT EXISTS (SELECT 1 FROM report_mail m WHERE m.kind=s.kind AND m.reference=s.reference
        AND m.canceled_at IS NULL AND ${storageHeldReport('m')})
      AND ((s.kind = 'worker' AND EXISTS (
        SELECT 1 FROM members m WHERE m.email=substr(s.reference,9) AND m.role IN ('cleaner','admin') AND m.active=1
      )) OR (s.kind = 'tax' AND ? AND NOT EXISTS (
        SELECT 1 FROM report_mail m WHERE m.kind = 'tax' AND m.reference = s.reference AND m.canceled_at IS NULL
          AND (m.sent_at IS NOT NULL OR m.provider_id LIKE 'gmail:%' OR m.requested_by IS NOT NULL)
      )))
    GROUP BY s.kind, s.reference ORDER BY signalId LIMIT 20
  `).bind(Number(validGmailRecipient(settings.taxEmail))).all();
  for (const { kind, reference, signalId } of candidates) {
    if (!budget.has(24)) break;
    let message;
    try {
      const withdrawals = kind === 'worker' ? await readOfficeWithdrawals(db, reference, signalId) : [];
      message = await buildOfficeMail(db, kind, reference, context, { ...settings, detailedReport, confirmedOnly: true, withdrawals });
    } catch (error) {
      if (error instanceof context.HttpError && [400, 404].includes(error.status)) {
        if (error.status === 400) await markOfficeSignal(db, kind, reference, signalId);
        continue;
      }
      throw error;
    }
    if (!validGmailRecipient(message.recipient) || message.blocking.length) {
      // A later close or change in the required amounts creates a new signal.
      if (kind === 'tax' && validGmailRecipient(message.recipient)) await markOfficeSignal(db, kind, reference, signalId);
      continue;
    }
    const baseKey = await mailPreviewToken(kind, reference, message);
    const key = kind === 'worker' ? await mailPreviewToken(kind, reference, message, signalId) : baseKey;
    const payload = identifyOfficeSnapshot(kind, message, key, env);
    const packed = await packReportMail(payload.text,payload.html,env);
    const heldAt = packed ? null : now.toISOString();
    const id = 'gmail:office:' + crypto.randomUUID();
    const claim = crypto.randomUUID();
    const target = queuedMailRoute({ kind, reference }, env);
    const inserted = await db.prepare(`
      INSERT INTO report_mail (id, kind, reference, recipient, sender, subject, body, html, created_at, provider_id, payload_key, office_base_key, claim_request_id, office_signal_id, hold_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM control_settings WHERE id = 1 AND office_auto_enabled = 1)
        AND ? = (${target.sql})
        AND ? = (SELECT MAX(s.id) FROM office_mail_signals s WHERE s.kind = ? AND s.reference = ? AND (${activeOfficeSignals}))
        AND (? <> 'tax' OR NOT (${activeTaxMail}))
        AND (? <> 'worker' OR ? IS NOT (${lastWorkerPayload}))
        AND ${availableGmailRequest}
      ON CONFLICT DO NOTHING
    `).bind(id, kind, reference, payload.recipient, env.BONYEON_GMAIL_FROM, payload.subject, packed?.text ?? heldReportText, packed?.html ?? '',
      now.toISOString(), 'gmail:' + claim, key, baseKey, packed ? requestId : null, signalId, heldAt, payload.recipient, ...target.args, signalId, kind, reference, kind, reference,
      kind, baseKey, reference, payload.recipient, requestId, requestId).run();
    if (inserted.meta.changes) {
      if (!packed) continue;
      return { id, claim, to: payload.recipient, subject: payload.subject,
        ...packedGmailBody(kind,key,packed,payload.text,payload.html,env) };
    }
    const existing = await db.prepare('SELECT 1 FROM report_mail WHERE payload_key = ? AND canceled_at IS NULL').bind(key).first();
    const latest = !existing && kind === 'worker'
      ? await db.prepare(lastWorkerPayload).bind(reference, payload.recipient).first() : null;
    if (existing || latest?.baseKey === baseKey) await markOfficeSignal(db, kind, reference, signalId);
  }
  return null;
}

async function claimGmailReport(env, context, now, requestId) {
  const budget = gmailClaimBudget(env.DB);
  env = { ...env, DB: budget.db, reportMailQueryBudget:budget };
  const db = env.DB;
  const manual = await claimQueuedGmailReport(db, env, now, requestId, budget, context);
  if (manual) return manual;
  // Recover previously unstored reports with a fresh query allowance. No Gmail
  // attempt has occurred for these holds, so this cannot repeat an uncertain send.
  const recovered = env.BUCKET && await retryStorageHeldReport(env,context,now,requestId,budget);
  if (recovered) return recovered;
  const office = await claimOfficeMail(env, context, now, requestId, budget);
  if (office) return office;
  const today = context.koreaDate();
  const hour = new Date(+now + 9 * 3600_000).getUTCHours();
  const dailyThrough = controlDate(+now - (hour < 8 ? 2 : 1) * 86400_000);
  const start = new Date(env.BONYEON_REPORT_START_DATE + 'T00:00:00+09:00').toISOString();
  // A short daily catch-up window avoids a burst of old daily reports after a long interruption.
  const dailyFrom = [env.BONYEON_REPORT_START_DATE, controlDate(+now - 7 * 86400_000)].sort().at(-1);
  const { results: jobs } = budget.has(12) ? await db.prepare(`
    WITH RECURSIVE days(day) AS (
      SELECT ? WHERE ? <= ?
      UNION ALL SELECT date(day, '+1 day') FROM days WHERE day < ?
    ), eligible(kind, reference, priority, sequence, recipient) AS (
      SELECT 'daily', day, 1, day, NULL FROM days
      UNION ALL
      SELECT 'settlement', month, 2, closed_at, NULL FROM settlement_months WHERE closed_at >= ? AND month < ?
      UNION ALL
      SELECT 'contractor', r.id, 3, r.approved_at, c.email FROM field_reports r JOIN client_mail_recipients c ON c.site_id=r.site_id
        WHERE ${finalClientReportSql('r')} AND r.approved_at >= ? AND r.approved_at>=c.enabled_at
    )
    SELECT kind, reference, recipient FROM eligible e
    WHERE NOT EXISTS (
      SELECT 1 FROM report_mail m WHERE m.kind = e.kind AND m.reference = e.reference AND m.canceled_at IS NULL
        AND (e.kind<>'contractor' OR m.recipient=e.recipient)
        AND (m.sent_at IS NOT NULL OR m.provider_id LIKE 'gmail:%' OR m.requested_by IS NOT NULL)
    )
    ORDER BY priority, sequence, reference LIMIT 20
  `).bind(dailyFrom, dailyFrom, dailyThrough, dailyThrough, start, today.slice(0, 7), start).all() : { results: [] };
  for (const { kind, reference, recipient } of jobs) {
    if (!budget.has(12)) break;
    const message = await buildControlMail(db, env, kind, reference, context);
    if (kind === 'contractor') message.recipient = recipient;
    if (!validGmailRecipient(message.recipient)) continue;
    const packed = await packReportMail(message.text,message.html,env);
    const heldAt = packed ? null : now.toISOString();
    const payloadKey = packed ? null : await mailPreviewToken(kind,reference,message);
    const id = 'gmail:' + kind + ':' + reference + ':' + crypto.randomUUID();
    const claim = crypto.randomUUID();
    const policyAt=kind==='contractor' ? message.recipientPolicies[message.recipient] : null;
    const target = queuedMailRoute({ kind, reference, recipient:message.recipient,recipient_policy_at:policyAt }, env);
    const result = await db.prepare(`
      INSERT INTO report_mail (id, kind, reference, recipient, sender, subject, body, html, created_at, provider_id, claim_request_id, hold_at, payload_key,recipient_policy_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?
      WHERE NOT EXISTS (
        SELECT 1 FROM report_mail WHERE kind = ? AND reference = ? AND canceled_at IS NULL
          AND (?<>'contractor' OR recipient=?)
          AND (sent_at IS NOT NULL OR provider_id LIKE 'gmail:%' OR requested_by IS NOT NULL)
      ) AND ? = (${target.sql}) AND ${availableGmailRequest}
      ON CONFLICT(id) DO NOTHING
    `).bind(id, kind, reference, message.recipient, env.BONYEON_GMAIL_FROM,
      message.subject, packed?.text ?? heldReportText, packed?.html ?? '', now.toISOString(), 'gmail:' + claim,
      packed ? requestId : null, heldAt, payloadKey,policyAt, kind, reference,kind,message.recipient,
      message.recipient, ...target.args, requestId, requestId).run();
    if (result.meta.changes && packed) return { id,claim,to:message.recipient,subject:message.subject,
      ...packedGmailBody(kind,null,packed,message.text,message.html,env) };
  }
  const consultation = await claimQueuedGmailReport(db, env, now, requestId, budget, context, true);
  if (consultation) return consultation;
  return env.BUCKET ? null : await retryStorageHeldReport(env,context,now,requestId,budget);
}

async function retryStorageHeldReport(env, context, now, requestId, budget) {
  if (!budget.has(16)) return null;
  const db = env.DB;
  const old = await db.prepare(`
    SELECT * FROM report_mail WHERE canceled_at IS NULL AND ${storageHeldReport()}
      AND (lease_until IS NULL OR lease_until <= ?) ORDER BY COALESCE(lease_until,created_at),id LIMIT 1
  `).bind(now.toISOString()).first();
  if (!old) return null;
  const retryAt = new Date(+now + 15 * 60_000).toISOString();
  await db.prepare(`UPDATE report_mail SET lease_until=? WHERE id=? AND canceled_at IS NULL AND ${storageHeldReport()}`)
    .bind(retryAt,old.id).run();
  let message;
  let signalId = null;
  if (officeMailKinds.has(old.kind)) {
    const settings = await readMailSettings(db,env);
    if (!settings.officeAutoEnabled) return null;
    signalId = (await db.prepare(`SELECT MAX(s.id) AS id FROM office_mail_signals s
      WHERE s.kind=? AND s.reference=? AND (${activeOfficeSignals})`).bind(old.kind,old.reference).first())?.id;
    if (!signalId) return null;
    const withdrawals = old.kind === 'worker' ? await readOfficeWithdrawals(db,old.reference,signalId) : [];
    try {
      message = await buildOfficeMail(db,old.kind,old.reference,context,{ ...settings,detailedReport,confirmedOnly:true,withdrawals });
    } catch (error) {
      if (!(error instanceof context.HttpError) || ![400,404,409].includes(error.status)) throw error;
      return null;
    }
    if (message.blocking.length) return null;
  } else {
    try {
      message = await buildControlMail(db,env,old.kind,old.reference,context);
    } catch (error) {
      if (!(error instanceof context.HttpError) || ![400,404,409].includes(error.status)) throw error;
      return null;
    }
  }
  if (old.kind === 'contractor') {
    if (!message.recipients.includes(old.recipient)) {
      await db.prepare('UPDATE report_mail SET canceled_at=? WHERE id=? AND canceled_at IS NULL').bind(now.toISOString(),old.id).run();
      return null;
    }
    message.recipient = old.recipient;
  }
  if (!validGmailRecipient(message.recipient)) return null;
  const baseKey = await mailPreviewToken(old.kind,old.reference,message);
  const key = old.kind === 'worker' ? await mailPreviewToken(old.kind,old.reference,message,signalId) : baseKey;
  if (old.payload_key === key && !env.BUCKET) return null;
  const payload = officeMailKinds.has(old.kind) ? identifyOfficeSnapshot(old.kind,message,key,env) : message;
  const packed = await packReportMail(payload.text,payload.html,env);
  if (!packed) {
    // Remember the failed content without reserving a delivery or duplicating the hold.
    await db.prepare(`UPDATE OR IGNORE report_mail SET payload_key=?,office_base_key=?,office_signal_id=?
      WHERE id=? AND canceled_at IS NULL AND ${storageHeldReport()}`).bind(key,baseKey,signalId,old.id).run();
    return null;
  }
  if (old.kind === 'completion' && old.requested_by === 'auto:approval') {
    const claim = crypto.randomUUID();
    const target = queuedMailRoute(old,env);
    const restored = await db.prepare(`UPDATE report_mail SET recipient=?,sender=?,subject=?,body=?,html=?,
      hold_at=NULL,lease_until=NULL,provider_id=?,claim_request_id=?,payload_key=NULL
      WHERE id=? AND canceled_at IS NULL AND ${storageHeldReport()}
        AND ?=(${target.sql}) AND ${availableGmailRequest}`)
      .bind(payload.recipient,env.BONYEON_GMAIL_FROM,payload.subject,packed.text,packed.html,'gmail:'+claim,requestId,
        old.id,payload.recipient,...target.args,requestId,requestId).run();
    if (!restored.meta.changes) return null;
    return { id:old.id,claim,to:payload.recipient,subject:payload.subject,
      ...packedGmailBody(old.kind,null,packed,payload.text,payload.html,env) };
  }
  const cleared = await db.prepare(`UPDATE report_mail SET canceled_at=?
    WHERE id=? AND canceled_at IS NULL AND ${storageHeldReport()}`).bind(now.toISOString(),old.id).run();
  if (!cleared.meta.changes) return null;
  const id = 'gmail:recovered:' + crypto.randomUUID();
  const claim = crypto.randomUUID();
  const target = queuedMailRoute({ ...old,recipient:payload.recipient },env);
  const inserted = await db.prepare(`
    INSERT INTO report_mail(id,kind,reference,recipient,sender,subject,body,html,created_at,provider_id,
      claim_request_id,payload_key,office_base_key,office_signal_id,recipient_policy_at,historical_consent_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
    WHERE ?=(${target.sql}) AND ${availableGmailRequest}
      AND NOT EXISTS (SELECT 1 FROM report_mail m WHERE m.kind=? AND m.reference=? AND m.canceled_at IS NULL
        AND (?<>'contractor' OR m.recipient=?)
        AND (m.sent_at IS NOT NULL OR m.provider_id LIKE 'gmail:%' OR m.requested_by IS NOT NULL))
      AND (? IS NULL OR ?=(SELECT MAX(s.id) FROM office_mail_signals s
        WHERE s.kind=? AND s.reference=? AND (${activeOfficeSignals})))
    ON CONFLICT DO NOTHING
  `).bind(id,old.kind,old.reference,payload.recipient,env.BONYEON_GMAIL_FROM,payload.subject,packed.text,packed.html,now.toISOString(),
    'gmail:'+claim,requestId,key,baseKey,signalId,old.recipient_policy_at,old.historical_consent_at,payload.recipient,...target.args,requestId,requestId,
    old.kind,old.reference,old.kind,payload.recipient,signalId,signalId,old.kind,old.reference).run();
  if (!inserted.meta.changes) return null;
  return { id,claim,to:payload.recipient,subject:payload.subject,
    ...packedGmailBody(old.kind,key,packed,payload.text,payload.html,env) };
}

async function readGmailClaimForRequest(env, requestId) {
  if (!requestId) return undefined;
  const job = await env.DB.prepare(`
    SELECT id, kind, reference, recipient, subject, body, html, payload_key, provider_id, sent_at, hold_at, canceled_at, test_day, office_signal_id,recipient_policy_at,historical_consent_at
    FROM report_mail WHERE claim_request_id = ?
  `).bind(requestId).first();
  if (!job) return undefined;
  if (job.sent_at || job.hold_at || job.canceled_at) return null;
  const target = queuedMailRoute(job, env);
  const checked = await env.DB.prepare(`
    UPDATE report_mail SET canceled_at = CASE WHEN recipient = (${target.sql}) AND (
      office_signal_id IS NULL OR (
        EXISTS (SELECT 1 FROM control_settings WHERE id=1 AND office_auto_enabled=1) AND office_signal_id = (
          SELECT MAX(s.id) FROM office_mail_signals s WHERE s.kind = ? AND s.reference = ? AND (${activeOfficeSignals})
        )
      )
    ) THEN NULL ELSE ? END
    WHERE claim_request_id = ? AND sent_at IS NULL AND hold_at IS NULL AND canceled_at IS NULL
    RETURNING canceled_at
  `).bind(...target.args, job.kind, job.reference, new Date().toISOString(), requestId).first();
  if (!checked || checked.canceled_at) return null;
  const { body, html } = await unpackReportMail(job.body,job.html,env);
  return { id: job.id, claim: job.provider_id.slice(6), to: job.recipient, subject: job.subject,
    ...gmailOfficeBody(job.kind, job.payload_key, body, html, env) };
}

async function handleGmailRunner(path, request, env, context) {
  await requireReportRunner(request, env, context);
  const { json, HttpError, validDate } = context;
  if (!validGmailRecipient(env.BONYEON_GMAIL_FROM) || !validDate(env.BONYEON_REPORT_START_DATE)) {
    throw new HttpError(503, 'Gmail 발신 주소와 시작일 설정이 필요합니다.');
  }
  const db = env.DB;
  const now = new Date();
  const stamp = now.toISOString();
  if (path === '/api/control/gmail/check') return json({ sender: env.BONYEON_GMAIL_FROM });
  if (path === '/api/control/gmail/template-tests') {
    return json({ messages: reportTemplateSamples(env.BONYEON_GMAIL_FROM, context.koreaDate()) });
  }
  if (path === '/api/control/gmail/completion-test') {
    const { row, devices } = completionExample(context.koreaDate());
    const detail = completionDetails(row, new Map([[row.id, devices]]), env);
    const notice = '자동 발송 서식 테스트 · 예시 데이터';
    return json({ message: { id: 'completion-example-v1', to: env.BONYEON_GMAIL_FROM,
      subject: completionSubject(row) + ' · 테스트', body: notice + '\n\n' + detail.detailText,
      html: '<p style="color:#80530e;font-weight:bold">' + notice + '</p>' + detail.html } });
  }
  if (path === '/api/control/gmail/activate') {
    await db.prepare(`
      INSERT INTO gmail_report_runner (id, activated_at, last_seen_at) VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at
    `).bind(stamp, stamp).run();
    return json({ active: true });
  }
  if (path === '/api/control/gmail/claim') {
    if (!(await db.prepare('SELECT 1 FROM gmail_report_runner WHERE id = 1').first())) {
      throw new HttpError(409, 'Google Apps Script에서 자동 발송을 활성화해 주세요.');
    }
    const { requestId = null } = (request.body ? await context.readJson(request, env) : null) ?? {};
    if (requestId !== null && (typeof requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(requestId))) {
      throw new HttpError(400, '발송 요청 식별자를 확인해 주세요.');
    }
    let message = await readGmailClaimForRequest(env, requestId);
    if (message === undefined) {
      message = await claimGmailReport(env, context, now, requestId);
      if (!message && requestId) message = (await readGmailClaimForRequest(env, requestId)) ?? null;
    }
    if (!message) await db.prepare('UPDATE gmail_report_runner SET last_seen_at = ? WHERE id = 1').bind(stamp).run();
    return json({ message });
  }
  if (path === '/api/control/gmail/complete' || path === '/api/control/gmail/hold') {
    const { id, claim } = (await context.readJson(request, env)) ?? {};
    if (typeof id !== 'string' || !id.startsWith('gmail:') || id.length > 100 ||
      typeof claim !== 'string' || !/^[0-9a-f-]{36}$/.test(claim)) throw new HttpError(400, '메일 발송 확인 정보가 올바르지 않습니다.');
    if (path.endsWith('/complete')) {
      const row = await db.prepare('SELECT body,html,sent_at FROM report_mail WHERE id=? AND provider_id=?').bind(id,'gmail:'+claim).first();
      if (!row) throw new HttpError(404,'발송 확인 대상이 없습니다.');
      const archive = reportArchiveInfo(row.body,row.html);
      if (archive && !row.sent_at) await verifiedReportArchive(env,archive);
    }
    const update = path.endsWith('/hold') ? 'hold_at = CASE WHEN sent_at IS NULL THEN COALESCE(hold_at, ?) ELSE hold_at END'
      : 'sent_at = COALESCE(sent_at, ?), hold_at = NULL';
    const completed = await db.prepare(`UPDATE report_mail SET ${update} WHERE id = ? AND provider_id = ?`).bind(stamp, id, 'gmail:' + claim).run();
    if (!completed.meta.changes) throw new HttpError(404, '발송 확인 대상이 없습니다.');
    if (path.endsWith('/complete')) await db.prepare('UPDATE gmail_report_runner SET last_seen_at = ? WHERE id = 1').bind(stamp).run();
    return json({ ok: true });
  }
  throw new HttpError(404, '요청한 Gmail 발송 기능을 찾을 수 없습니다.');
}

export async function handleControl(path, request, env, account, context) {
  const { requireRole, readJson, json, HttpError, validDate, koreaDate, emailAddress } = context;
  const db = env.DB;
  if (path.startsWith('/api/control/gmail/') && request.method === 'POST') return await handleGmailRunner(path, request, env, context);
  if (path === '/api/control/run' && request.method === 'POST') return await runScheduledReports(request, env, context);
  requireRole(account, 'viewer');
  const admin = canManageReports(account);
  if (!admin && account.role !== 'cleaner') throw new HttpError(403, '현장 보고 권한이 없습니다.');
  const url = new URL(request.url);
  if (path === '/api/control/overview' && request.method === 'GET') {
    const month = url.searchParams.get('month') || koreaDate().slice(0, 7);
    if (!validDate(month + '-01')) throw new HttpError(400, '보고 월을 확인해 주세요.');
    return json(await readControlOverview(db, month, account, env));
  }
  if (path === '/api/control/detail' && request.method === 'GET') {
    const kind = url.searchParams.get('kind');
    const id = url.searchParams.get('id');
    const month = url.searchParams.get('month') || koreaDate().slice(0, 7);
    if (!['site', 'worker', 'report', 'mail'].includes(kind) || !id || id.length > 160 || !validDate(month + '-01')) {
      throw new HttpError(400, '조회할 상세 정보와 월을 확인해 주세요.');
    }
    if (kind === 'mail') return json(await readOfficeSnapshot(db, id, account, context, env));
    const archived=await archivedDetailDb(env,kind,id);
    if(archived) {
      requireRole(account,'admin');
      const detail=await readControlDetail(archived,kind,id,month,account,context);
      const siteId=kind==='site'?id:detail.reports[0]?.siteId;
      const {results:archivedCaptures}=siteId?await archived.prepare(`SELECT id,slot,work_date AS workDate,asset_code AS assetCode FROM work_camera_photos
        WHERE site_id=? AND evidence_id IS NULL ORDER BY created_at LIMIT 61`).bind(siteId).all():{results:[]};
      return json({...detail,testArchive:true,canEditResults:false,devices:(detail.devices||[]).map(d=>({...d,canMoveZone:false})),
        archivedCaptures:archivedCaptures.slice(0,60),archivedCapturesOverflow:archivedCaptures.length>60});
    }
    return json(await readControlDetail(db, kind, id, month, account, context));
  }
  if (path === '/api/control/report' && request.method === 'POST') {
    const input = await readJson(request, env);
    const body = input && { ...input,interior:input.interior ?? 0 };
    if (body?.completionMode === 'partial') return json(await savePartialWork(db,body,account,context));
    await submitFieldReport(db, body, account, context);
    return json({ ok: true });
  }
  if (path === '/api/control/report-draft' && request.method === 'PUT') {
    return json(await saveReportDraft(db,await readJson(request,env),account,context));
  }
  requireRole(account, 'admin');
  if(path==='/api/control/test-archive'&&request.method==='GET') {
    return json(await readTestArchive(env.BONYEON_ALL_DATA_DB||db));
  }
  if (path === '/api/control/mail/archive' && request.method === 'GET') {
    const hash = url.searchParams.get('id');
    if (!/^[a-f0-9]{64}$/.test(hash || '')) throw new HttpError(400,'조회할 보고 자료를 확인해 주세요.');
    const row = await db.prepare(`SELECT body,html FROM report_mail
      WHERE body LIKE ? AND html='' AND canceled_at IS NULL LIMIT 1`).bind(reportArchiveMarker+hash+':%').first();
    if (!row) throw new HttpError(404,'조회할 수 있는 보고 자료가 없습니다.');
    const archive = reportArchiveInfo(row.body,row.html);
    if (archive?.hash !== hash) throw new HttpError(404,'조회할 수 있는 보고 자료가 없습니다.');
    const { body,html } = await unpackReportMail(row.body,row.html,env,{full:true});
    return json({ text:body,html });
  }
  if (path === '/api/control/office-test' && ['GET', 'POST'].includes(request.method)) {
    requireRole(account, 'owner');
    if (request.method === 'GET') return json(await officeAcceptanceStatus(db, koreaDate()));
    await readJson(request, env);
    return json(await queueOfficeAcceptance(env, account, koreaDate(), context));
  }
  if (path === '/api/control/review' && request.method === 'PATCH') {
    await reviewFieldReport(db, await readJson(request, env), account, context);
    return json({ ok: true });
  }
  if (path === '/api/control/site' && request.method === 'PATCH') {
    await saveReportSite(db, await readJson(request, env), context,account);
    return json({ ok: true });
  }
  if (path === '/api/control/settings' && request.method === 'PATCH') {
    const body = (await readJson(request, env)) ?? {};
    const email = emailAddress(body.email);
    const taxEmail = body.taxEmail === undefined ? null : emailAddress(body.taxEmail);
    const workerEnabled = body.workerMailEnabled === undefined ? null : Number(body.workerMailEnabled);
    const autoEnabled = body.officeAutoEnabled === undefined ? null : Number(body.officeAutoEnabled);
    if (!validGmailRecipient(email)) throw new HttpError(400, '관리자 수신 이메일 한 개를 확인해 주세요.');
    if ((taxEmail !== null && typeof body.taxEmail !== 'string') || (taxEmail && !validGmailRecipient(taxEmail))) {
      throw new HttpError(400, '세무 수신 이메일 한 개를 확인해 주세요.');
    }
    if (workerEnabled !== null && typeof body.workerMailEnabled !== 'boolean') {
      throw new HttpError(400, '작업자 수신 설정을 확인해 주세요.');
    }
    if (autoEnabled !== null && typeof body.officeAutoEnabled !== 'boolean') {
      throw new HttpError(400, '자동 발송 설정을 확인해 주세요.');
    }
    await db.prepare(`
      INSERT INTO control_settings (id, admin_email, tax_email, worker_mail_enabled, office_auto_enabled,updated_at,history_actor)
      VALUES (1, ?, COALESCE(?, ''), COALESCE(?, 0), COALESCE(?, 0),?,?)
      ON CONFLICT(id) DO UPDATE SET admin_email = excluded.admin_email,
        tax_email = COALESCE(?, control_settings.tax_email),
        worker_mail_enabled = COALESCE(?, control_settings.worker_mail_enabled),
        office_auto_enabled = COALESCE(?, control_settings.office_auto_enabled),updated_at=excluded.updated_at,history_actor=excluded.history_actor
    `).bind(email, taxEmail, workerEnabled, autoEnabled,new Date().toISOString(),account.name || account.email, taxEmail, workerEnabled, autoEnabled).run();
    return json({ ok: true });
  }
  if (path === '/api/control/mail' && request.method === 'GET') {
    const kind = url.searchParams.get('kind');
    const reference = controlMailReference(kind, url.searchParams.get('reference'));
    const mail = await buildControlMail(db, env, kind, reference, context);
    const connected = gmailConfigured(env)
      ? Boolean(await db.prepare('SELECT 1 FROM gmail_report_runner WHERE id = 1').first())
      : !officeMailKinds.has(kind) && canDeliverReports(env);
    const previewToken = await mailPreviewToken(kind, reference, mail);
    return json({ ...identifyOfficeSnapshot(kind, mail, previewToken),
      mailReady: connected && validGmailRecipient(mail.recipient) && !mail.blocking?.length, previewToken });
  }
  if (path === '/api/control/mail' && request.method === 'POST') {
    const body = (await readJson(request, env)) ?? {};
    const { kind, recipient, previewToken } = body;
    const reference = controlMailReference(kind, body.reference);
    const mail = await buildControlMail(db, env, kind, reference, context);
    if (!validGmailRecipient(mail.recipient) || mail.blocking?.length) {
      throw new HttpError(409, mail.blocking?.[0] || '수신 이메일을 등록해 주세요.');
    }
    const key = await mailPreviewToken(kind, reference, mail);
    if (mail.recipient !== recipient || ((gmailConfigured(env) || kind==='contractor') && previewToken !== key)) {
      throw new HttpError(409, '수신 주소 또는 보고 내용이 바뀌었습니다. 미리보기를 다시 확인해 주세요.');
    }
    if (kind==='contractor' && mail.requiresHistoricalConsent && body.allowHistorical!==true) {
      throw new HttpError(409,'이 수신처가 등록되기 전에 승인된 보고입니다. 과거 보고 발송 대상과 작업일을 확인하고 동의해 주세요.');
    }
    if (kind==='contractor') mail.allowHistorical=body.allowHistorical===true;
    if (gmailConfigured(env)) return json(await queueGmailMail(db, env, account, kind, reference, identifyOfficeSnapshot(kind, mail, key, env), key, context));
    if (officeMailKinds.has(kind)) throw new HttpError(503, '본연 Gmail 자동 발송을 연결해 주세요.');
    return json(await dispatchControlMail(db, env, kind, reference, mail, context));
  }
  throw new HttpError(404, '요청한 보고 기능을 찾을 수 없습니다.');
}
