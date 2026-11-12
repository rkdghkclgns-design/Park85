ALTER TABLE charger_evidence ADD COLUMN zone_name_snapshot TEXT;
--> statement-breakpoint
ALTER TABLE charger_evidence ADD COLUMN zone_snapshot_legacy INTEGER NOT NULL DEFAULT 1 CHECK(zone_snapshot_legacy IN (0,1));
--> statement-breakpoint
UPDATE charger_evidence SET zone_name_snapshot=(SELECT name FROM work_zones WHERE id=charger_evidence.zone_id);
--> statement-breakpoint
CREATE INDEX evidence_cycle_device ON charger_evidence(site_id,upper(trim(asset_code)),work_date);
--> statement-breakpoint
CREATE TRIGGER snapshot_evidence_zone_added AFTER INSERT ON charger_evidence
BEGIN
  UPDATE charger_evidence SET zone_name_snapshot=(SELECT name FROM work_zones WHERE id=NEW.zone_id),zone_snapshot_legacy=0 WHERE id=NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER snapshot_open_evidence_zone_renamed AFTER UPDATE OF name ON work_zones
WHEN OLD.name IS NOT NEW.name
BEGIN
  UPDATE charger_evidence SET zone_name_snapshot=NEW.name WHERE zone_id=NEW.id
    AND NOT EXISTS (SELECT 1 FROM settlement_months c WHERE c.month=substr(charger_evidence.work_date,1,7)
      OR EXISTS (SELECT 1 FROM field_reports r WHERE r.site_id=charger_evidence.site_id
        AND c.month=substr(r.work_date,1,7)
        AND charger_evidence.work_date BETWEEN COALESCE(r.progress_from,r.work_date) AND r.work_date));
END;
--> statement-breakpoint
CREATE TRIGGER snapshot_evidence_zone_moved AFTER UPDATE OF zone_id ON charger_evidence
WHEN OLD.zone_id IS NOT NEW.zone_id
BEGIN
  UPDATE charger_evidence SET zone_name_snapshot=(SELECT name FROM work_zones WHERE id=NEW.zone_id),zone_snapshot_legacy=0 WHERE id=NEW.id;
END;
--> statement-breakpoint
ALTER TABLE qa_charger_evidence ADD COLUMN zone_name_snapshot TEXT;
--> statement-breakpoint
ALTER TABLE qa_charger_evidence ADD COLUMN zone_snapshot_legacy INTEGER NOT NULL DEFAULT 1 CHECK(zone_snapshot_legacy IN (0,1));
--> statement-breakpoint
UPDATE qa_charger_evidence SET zone_name_snapshot=(SELECT name FROM qa_work_zones WHERE id=qa_charger_evidence.zone_id);
--> statement-breakpoint
CREATE INDEX qa_evidence_cycle_device ON qa_charger_evidence(site_id,upper(trim(asset_code)),work_date);
--> statement-breakpoint
CREATE TRIGGER qa_snapshot_evidence_zone_added AFTER INSERT ON qa_charger_evidence
BEGIN
  UPDATE qa_charger_evidence SET zone_name_snapshot=(SELECT name FROM qa_work_zones WHERE id=NEW.zone_id),zone_snapshot_legacy=0 WHERE id=NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER qa_snapshot_evidence_zone_moved AFTER UPDATE OF zone_id ON qa_charger_evidence
WHEN OLD.zone_id IS NOT NEW.zone_id
BEGIN
  UPDATE qa_charger_evidence SET zone_name_snapshot=(SELECT name FROM qa_work_zones WHERE id=NEW.zone_id),zone_snapshot_legacy=0 WHERE id=NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER qa_snapshot_open_evidence_zone_renamed AFTER UPDATE OF name ON qa_work_zones
WHEN OLD.name IS NOT NEW.name
BEGIN
  UPDATE qa_charger_evidence SET zone_name_snapshot=NEW.name WHERE zone_id=NEW.id
    AND NOT EXISTS (SELECT 1 FROM qa_settlement_months c WHERE c.month=substr(qa_charger_evidence.work_date,1,7)
      OR EXISTS (SELECT 1 FROM qa_field_reports r WHERE r.site_id=qa_charger_evidence.site_id
        AND c.month=substr(r.work_date,1,7)
        AND qa_charger_evidence.work_date BETWEEN COALESCE(r.progress_from,r.work_date) AND r.work_date));
END;
--> statement-breakpoint
DROP VIEW work_plan_cycles;
--> statement-breakpoint
CREATE VIEW work_plan_cycles AS
WITH scheduled AS (
  SELECT p.*,m.name AS worker_name,
    COALESCE(date(MAX(r.assignment_due),'+' || p.repeat_days || ' days'),p.start_date) AS next_due
  FROM work_plans p JOIN members m ON m.email=p.worker_email
  LEFT JOIN field_reports r ON r.site_id=p.site_id AND r.status='approved'
    AND r.assignment_due>=p.start_date
    AND CAST(julianday(r.assignment_due)-julianday(p.start_date) AS INTEGER)%p.repeat_days=0
  GROUP BY p.site_id
)
SELECT scheduled.*,MAX(next_due,COALESCE((SELECT date(MAX(r.work_date),'+1 day')
  FROM field_reports r WHERE r.site_id=scheduled.site_id AND r.status='approved'),next_due)) AS evidence_from
FROM scheduled;
--> statement-breakpoint
DROP VIEW qa_work_plan_cycles;
--> statement-breakpoint
CREATE VIEW qa_work_plan_cycles AS
WITH scheduled AS (
  SELECT p.*,m.name AS worker_name,
    COALESCE(date(MAX(r.assignment_due),'+' || p.repeat_days || ' days'),p.start_date) AS next_due
  FROM qa_work_plans p JOIN qa_members m ON m.email=p.worker_email
  LEFT JOIN qa_field_reports r ON r.site_id=p.site_id AND r.status='approved'
    AND r.assignment_due>=p.start_date
    AND CAST(julianday(r.assignment_due)-julianday(p.start_date) AS INTEGER)%p.repeat_days=0
  GROUP BY p.site_id
)
SELECT scheduled.*,MAX(next_due,COALESCE((SELECT date(MAX(r.work_date),'+1 day')
  FROM qa_field_reports r WHERE r.site_id=scheduled.site_id AND r.status='approved'),next_due)) AS evidence_from
FROM scheduled;
