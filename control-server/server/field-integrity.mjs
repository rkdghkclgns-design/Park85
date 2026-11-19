// SQL fragments take application-owned column expressions, never request values.
export const proofInReport = (proof,report) => `${proof}.site_id=${report}.site_id
  AND ${proof}.work_date BETWEEN COALESCE(${report}.progress_from,${report}.work_date) AND ${report}.work_date`;

export const hasReportContribution = (report,author) => `EXISTS (
  SELECT 1 FROM charger_evidence e WHERE ${proofInReport('e',report)} AND e.author_id=${author}
)`;

export const hasHandedOverWork = report => `EXISTS (
  SELECT 1 FROM charger_evidence e WHERE ${proofInReport('e',report)} AND e.author_id<>${report}.author_id
)`;

// A quantity used by progress or a pending report is part of that visit.
export const allowsSiteQuantity = (site,current,proposed) => `(
  ${proposed} IS ${current} OR (
    COALESCE(${proposed},0)>=(SELECT COALESCE(SUM(z.planned_units),0) FROM work_zones z
      WHERE z.site_id=${site} AND z.deleted_at IS NULL)
    AND NOT EXISTS (SELECT 1 FROM work_progress g WHERE g.site_id=${site} AND g.planned_units>${proposed})
    AND NOT EXISTS (SELECT 1 FROM work_plan_cycles p WHERE p.site_id=${site} AND (
      (SELECT COUNT(DISTINCT upper(trim(e.asset_code))) FROM charger_evidence e
        WHERE e.site_id=p.site_id AND e.work_date>=p.evidence_from)>COALESCE(${proposed},0)
      OR EXISTS (SELECT 1 FROM field_reports r WHERE r.site_id=p.site_id AND r.assignment_due=p.next_due
        AND r.status IN ('submitted','revision'))
    ))
  )
)`;

export function floorEvidenceComplete(site, start, end) {
  return `NOT EXISTS (
    SELECT 1 FROM work_zones assigned
    WHERE assigned.site_id=${site} AND assigned.deleted_at IS NULL AND assigned.planned_units IS NOT NULL
      AND NOT EXISTS (
        SELECT COUNT(*) FROM charger_evidence proof
        WHERE proof.site_id=assigned.site_id AND proof.zone_id=assigned.id AND proof.work_date BETWEEN ${start} AND ${end}
        HAVING COUNT(*)=assigned.planned_units AND SUM(CASE WHEN
          proof.charger_type=assigned.charger_type AND proof.canopy=assigned.canopy_scope
          AND proof.exterior=(assigned.cleaning_scope<>'interior')
          AND proof.interior=(assigned.cleaning_scope<>'exterior') THEN 1 ELSE 0 END)=assigned.planned_units
      )
  )`;
}
