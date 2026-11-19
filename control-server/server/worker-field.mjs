import { hasReportContribution } from './field-integrity.mjs';

const dayMs = 86_400_000;
const isoDay = value => new Date(value).toISOString().slice(0, 10);

export const floorProjection = `z.id,z.name,z.planned_units AS units,z.charger_type AS chargerType,
  z.housing,z.canopy_scope AS canopy,z.cleaning_scope AS scope,z.repair`;

export function siteFloors(siteAlias) {
  return `(SELECT json_group_array(json_object('id',z.id,'name',z.name,'units',z.planned_units,
    'chargerType',z.charger_type,'housing',z.housing,'canopy',z.canopy_scope,'scope',z.cleaning_scope,'repair',z.repair))
    FROM work_zones z WHERE z.site_id=${siteAlias}.id AND z.deleted_at IS NULL AND z.planned_units IS NOT NULL)`;
}

export function planOccursInMonth(nextDue, repeatDays, month, today) {
  if (!nextDue) return '';
  if (nextDue.slice(0, 7) === month) return nextDue;
  // Keep the original due date for carried-over work. Later months can show
  // the first projected visit without rewriting the plan.
  const currentMonth=today.slice(0,7);
  if (month===currentMonth && nextDue<month+'-01') return nextDue;
  if (month<=currentMonth || !repeatDays) return '';
  const start = Date.parse(month + '-01');
  const due = Date.parse(nextDue);
  if (due > start) return '';
  const interval = repeatDays * dayMs;
  const projected = isoDay(due + Math.ceil((start - due) / interval) * interval);
  return projected.slice(0, 7) === month ? projected : '';
}

export async function workerMonthMap(db, account, month, today) {
  const { results } = await db.prepare(`
    SELECT w.id,w.name,w.address,w.lat,w.lng,w.planned_units AS plannedUnits,
      p.next_due AS nextDue,p.repeat_days AS repeatDays,p.start_date AS startDate,
      COALESCE(NULLIF(p.instructions,''),w.work_note) AS workNote,
      CASE WHEN p.delay_date=p.next_due THEN p.delay_reason ELSE '' END AS delayReason,
      g.units AS progressUnits,
      (SELECT fr.status FROM field_reports fr WHERE fr.site_id=p.site_id AND fr.assignment_due=p.next_due
        ORDER BY fr.work_date DESC LIMIT 1) AS currentReportStatus,
      r.id AS reportId,r.status AS reportStatus,r.work_date AS reportDate,
      COALESCE(r.assignment_due,r.work_date) AS reportDue,
      ${siteFloors('w')} AS floorData
    FROM work_sites w
    LEFT JOIN work_plan_cycles p ON p.site_id=w.id AND p.worker_email=?
    LEFT JOIN work_progress g ON g.site_id=p.site_id
    LEFT JOIN field_reports r ON r.site_id=w.id AND (r.author_id=? OR (r.status='approved' AND ${hasReportContribution('r','?')}))
      AND (COALESCE(r.assignment_due,r.work_date) LIKE ?
        OR (? AND r.assignment_due=p.next_due AND p.next_due<?))
    WHERE p.site_id IS NOT NULL OR r.id IS NOT NULL
    ORDER BY w.name,w.id,r.work_date,r.id
  `).bind(account.email,account.id,account.id,month+'-%',Number(month===today.slice(0,7)),month+'-01').all();
  const visits=new Map();
  function add(row,dueDate,report) {
    const visitId=row.id+':'+dueDate;
    if (!dueDate || (!report && visits.has(visitId))) return;
    const reportStatus=report ? row.reportStatus : dueDate===row.nextDue ? row.currentReportStatus : null;
    const done=reportStatus==='approved';
    const awaiting=reportStatus==='submitted';
    const delayDays=!done && !awaiting && dueDate<today ? Math.round((Date.parse(today)-Date.parse(dueDate))/dayMs) : 0;
    visits.set(visitId,{
      id:row.id,visitId,name:row.name,address:row.address,lat:row.lat,lng:row.lng,assignee:account.name,
      dueDate,delayDays,status:done?'done':awaiting?'review':delayDays?'delayed':'pending',
      delayReason:dueDate===row.nextDue?row.delayReason:'',
      progressUnits:dueDate===row.nextDue?row.progressUnits:null,
      reportId:report?row.reportId:null,reportStatus,
      completedDate:done?row.reportDate:null,projected:!report && dueDate!==row.nextDue,
      carriedOver:!done && dueDate.slice(0,7)<month,
      repeatDays:row.repeatDays,workNote:row.nextDue?row.workNote:'',plannedUnits:row.nextDue?row.plannedUnits:null,
      floors:row.nextDue?JSON.parse(row.floorData):[],
    });
  }
  for (const row of results) {
    add(row,planOccursInMonth(row.nextDue,row.repeatDays,month,today),false);
    if (row.reportDue) add(row,row.reportDue,true);
  }
  return [...visits.values()].sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.name.localeCompare(b.name,'ko'));
}

export async function saveFloorPlan(db, body, account, { HttpError }) {
  const {siteId,zoneId,units,chargerType,housing,canopy,scope,repair} = body ?? {};
  const name = typeof body?.name==='string' ? body.name.normalize('NFKC').trim() : '';
  if (typeof siteId!=='string' || !siteId || siteId.length>80 ||
    (zoneId && (typeof zoneId!=='string' || !/^[a-f0-9-]{36}$/.test(zoneId))) ||
    !name || name.length>80 || !Number.isInteger(units) || units<1 || units>10000 ||
    !['slow','fast'].includes(chargerType) || !['standalone','canopy','enclosure','box','other'].includes(housing) ||
    !['included','excluded'].includes(canopy) || !['exterior','interior','both'].includes(scope) || typeof repair!=='boolean') {
    throw new HttpError(400,'층·구역명, 충전기 유형, 수량, 설치 형태와 작업 범위를 모두 확인해 주세요.');
  }
  const values=[name,units,chargerType,housing,canopy,scope,Number(repair)];
  const proposed=`WITH changed_floor(id,units,charger_type,canopy,scope) AS (
    VALUES (COALESCE(?,(SELECT id FROM work_zones WHERE site_id=? AND name=?),''),?,?,?,?)
  ), cycle AS (
    SELECT MIN(w.planned_units,COALESCE(g.planned_units,w.planned_units)) AS capacity,
      COALESCE(g.first_date,p.evidence_from) AS first_date,
      changed_floor.*,
      changed_floor.units+COALESCE((SELECT SUM(z.planned_units) FROM work_zones z
        WHERE z.site_id=w.id AND z.deleted_at IS NULL AND z.id<>changed_floor.id),0) AS allocated
    FROM work_sites w CROSS JOIN changed_floor
    LEFT JOIN work_progress g ON g.site_id=w.id LEFT JOIN work_plan_cycles p ON p.site_id=w.id
    WHERE w.id=?
  )`;
  const proposedArgs=[zoneId||null,siteId,name,units,chargerType,canopy,scope,siteId];
  const limit=`EXISTS (SELECT 1 FROM cycle cfg WHERE cfg.allocated<=cfg.capacity
    AND NOT EXISTS (SELECT 1 FROM charger_evidence e WHERE e.site_id=? AND e.zone_id=cfg.id AND e.work_date>=cfg.first_date
      AND (e.charger_type<>cfg.charger_type OR e.canopy<>cfg.canopy OR e.exterior<>(cfg.scope<>'interior') OR e.interior<>(cfg.scope<>'exterior')))
    AND (SELECT COUNT(DISTINCT upper(trim(e.asset_code))) FROM charger_evidence e
      WHERE e.site_id=? AND e.zone_id=cfg.id AND e.work_date>=cfg.first_date)<=cfg.units
    AND (SELECT COUNT(DISTINCT upper(trim(e.asset_code))) FROM charger_evidence e
      WHERE e.site_id=? AND e.work_date>=cfg.first_date AND e.zone_id IS NOT cfg.id
        AND NOT (${managedFloor('e.site_id','e.zone_id')}))<=cfg.capacity-cfg.allocated)`;
  const zone = zoneId ? await db.prepare(`${proposed}
    UPDATE work_zones SET name=?,planned_units=?,charger_type=?,housing=?,canopy_scope=?,cleaning_scope=?,repair=?
    WHERE id=? AND site_id=? AND deleted_at IS NULL AND ${limit}
      AND NOT EXISTS(SELECT 1 FROM work_zones z WHERE z.site_id=? AND z.name=? AND z.id<>?)
    RETURNING id
  `).bind(...proposedArgs,...values,zoneId,siteId,siteId,siteId,siteId,siteId,name,zoneId).first() : await db.prepare(`${proposed}
    INSERT INTO work_zones(id,site_id,name,planned_units,charger_type,housing,canopy_scope,cleaning_scope,repair,created_at,created_by)
    SELECT ?,w.id,?,?,?,?,?,?,?,?,? FROM work_sites w WHERE w.id=? AND ${limit}
    ON CONFLICT(site_id,name) DO UPDATE SET deleted_at=NULL,planned_units=excluded.planned_units,
      charger_type=excluded.charger_type,housing=excluded.housing,canopy_scope=excluded.canopy_scope,
      cleaning_scope=excluded.cleaning_scope,repair=excluded.repair WHERE work_zones.deleted_at IS NOT NULL
    RETURNING id
  `).bind(...proposedArgs,crypto.randomUUID(),...values,new Date().toISOString(),account.id,siteId,siteId,siteId,siteId).first();
  if (!zone) throw new HttpError(409,'구역명과 배정 수량을 확인해 주세요. 이미 저장된 이번 회차 증빙의 층별 수량·작업 범위와 충돌하는 배정은 저장할 수 없습니다.');
  return zone;
}

export const floorPlanTotal = siteId => `(SELECT COALESCE(SUM(z.planned_units),0) FROM work_zones z WHERE z.site_id=${siteId} AND z.deleted_at IS NULL)`;

export const managedFloor = (siteId, zoneId) => `EXISTS (SELECT 1 FROM work_zones assigned_zone WHERE assigned_zone.site_id=${siteId}
  AND assigned_zone.id=${zoneId} AND assigned_zone.deleted_at IS NULL AND assigned_zone.planned_units IS NOT NULL)`;

export async function requireAssignedFloor(db,{siteId,zoneId,chargerType,canopy,exterior,interior},HttpError) {
  const rules=await db.prepare(`
    SELECT z.planned_units AS quantity,z.charger_type AS chargerType,z.canopy_scope AS canopy,z.cleaning_scope AS scope,
      COALESCE(g.planned_units,w.planned_units) AS total,${floorPlanTotal('w.id')} AS allocated
    FROM work_sites w LEFT JOIN work_progress g ON g.site_id=w.id
      LEFT JOIN work_zones z ON z.site_id=w.id AND z.id=? AND z.deleted_at IS NULL
    WHERE w.id=?
  `).bind(zoneId,siteId).first();
  if (!rules?.quantity) {
    if (rules?.total && rules.allocated>=rules.total) {
      throw new HttpError(409,'모든 설비가 층별로 배정되었습니다. 배정된 층을 선택해 주세요. 기존 사진은 보관됩니다.');
    }
    return;
  }
  if (chargerType!==rules.chargerType || canopy!==rules.canopy ||
    exterior!==(rules.scope!=='interior') || interior!==(rules.scope!=='exterior')) {
    throw new HttpError(409,'관리자가 지정한 층별 작업 정보가 바뀌었습니다. 사진은 보존됩니다. 최신 배정을 확인해 주세요.');
  }
}
