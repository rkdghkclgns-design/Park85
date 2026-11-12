ALTER TABLE field_reports ADD COLUMN assignment_due TEXT;
--> statement-breakpoint
ALTER TABLE field_reports ADD COLUMN approved_at TEXT;
--> statement-breakpoint
ALTER TABLE work_sites ADD COLUMN completed_date TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE work_sites ADD COLUMN work_note TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE INDEX field_reports_site_cycle ON field_reports(site_id, status, assignment_due);
--> statement-breakpoint
CREATE INDEX field_reports_recent_site ON field_reports(site_id, work_date DESC);
--> statement-breakpoint
CREATE TABLE work_plans (
  site_id TEXT PRIMARY KEY REFERENCES work_sites(id),
  worker_email TEXT NOT NULL REFERENCES members(email),
  start_date TEXT NOT NULL,
  repeat_days INTEGER NOT NULL CHECK (repeat_days BETWEEN 1 AND 365),
  instructions TEXT NOT NULL,
  delay_date TEXT,
  delay_reason TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE VIEW work_plan_cycles AS
SELECT p.*, m.name AS worker_name,
  COALESCE(date(MAX(r.assignment_due), '+' || p.repeat_days || ' days'), p.start_date) AS next_due
FROM work_plans p JOIN members m ON m.email = p.worker_email
LEFT JOIN field_reports r ON r.site_id = p.site_id AND r.status = 'approved'
  AND r.assignment_due >= p.start_date
  AND CAST(julianday(r.assignment_due) - julianday(p.start_date) AS INTEGER) % p.repeat_days = 0
GROUP BY p.site_id;
--> statement-breakpoint
CREATE TABLE charger_evidence (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES work_sites(id),
  work_date TEXT NOT NULL,
  asset_code TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  exterior INTEGER NOT NULL CHECK (exterior IN (0, 1)),
  interior INTEGER NOT NULL CHECK (interior IN (0, 1)),
  safety_checked INTEGER NOT NULL CHECK (safety_checked IN (0, 1)),
  issue TEXT NOT NULL,
  followup_owner TEXT NOT NULL DEFAULT '',
  followup_status TEXT NOT NULL DEFAULT 'open' CHECK (followup_status IN ('open', 'assigned', 'resolved')),
  followup_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (site_id, work_date, asset_code)
);
--> statement-breakpoint
CREATE INDEX charger_evidence_date ON charger_evidence(work_date);
--> statement-breakpoint
CREATE TABLE settlement_months (
  month TEXT PRIMARY KEY,
  closed_at TEXT NOT NULL,
  closed_by TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE settlement_payments (
  report_id TEXT PRIMARY KEY REFERENCES field_reports(id),
  billed INTEGER NOT NULL CHECK (billed >= 0),
  received INTEGER NOT NULL CHECK (received >= 0),
  paid INTEGER NOT NULL CHECK (paid >= 0),
  billing_ref TEXT NOT NULL,
  note TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
