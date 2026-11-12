-- Isolated operating-site verification schema. Mirrors the application schema through migration 0013.
CREATE TABLE qa_work_sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat REAL NOT NULL CHECK (lat BETWEEN -85 AND 85),
  lng REAL NOT NULL CHECK (lng BETWEEN -180 AND 180),
  status TEXT NOT NULL CHECK (status IN ('pending', 'delayed', 'done')),
  due_date TEXT NOT NULL,
  updated_at TEXT NOT NULL
, delay_reason TEXT, assignee TEXT, assignee_contact TEXT, completed_date TEXT NOT NULL DEFAULT '', work_note TEXT NOT NULL DEFAULT '');
--> statement-breakpoint
CREATE TABLE qa_charger_regions (
  region_name TEXT PRIMARY KEY NOT NULL,
  charger_count INTEGER NOT NULL CHECK (charger_count >= 0),
  source_date TEXT NOT NULL,
  contract_price INTEGER CHECK (contract_price BETWEEN 0 AND 9007199254740991),
  worker_price INTEGER CHECK (worker_price BETWEEN 0 AND 9007199254740991)
);
--> statement-breakpoint
CREATE TABLE "qa_members" (
  email TEXT PRIMARY KEY,
  user_id TEXT UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer', 'cleaner')),
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE qa_site_reporting (
  site_id TEXT PRIMARY KEY REFERENCES qa_work_sites(id),
  region_name TEXT REFERENCES qa_charger_regions(region_name),
  contractor_email TEXT NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE qa_control_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  admin_email TEXT NOT NULL
, tax_email TEXT NOT NULL DEFAULT '', worker_mail_enabled INTEGER NOT NULL DEFAULT 0 CHECK (worker_mail_enabled IN (0, 1)), office_auto_enabled INTEGER NOT NULL DEFAULT 0 CHECK (office_auto_enabled IN (0, 1)));
--> statement-breakpoint
CREATE TABLE qa_field_reports (
  id TEXT PRIMARY KEY NOT NULL,
  site_id TEXT NOT NULL REFERENCES qa_work_sites(id),
  work_date TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  site_name TEXT NOT NULL,
  site_address TEXT NOT NULL,
  units INTEGER NOT NULL,
  exterior INTEGER NOT NULL,
  interior INTEGER NOT NULL,
  notes TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'revision', 'approved')),
  review_note TEXT NOT NULL DEFAULT '',
  region_name TEXT,
  contract_price INTEGER,
  worker_price INTEGER,
  updated_at TEXT NOT NULL, assignment_due TEXT, approved_at TEXT, completion_reported_at TEXT,
  UNIQUE (site_id, work_date)
);
--> statement-breakpoint
CREATE TABLE qa_report_mail (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  reference TEXT NOT NULL,
  recipient TEXT NOT NULL,
  sender TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  lease_until TEXT,
  provider_id TEXT,
  sent_at TEXT
, html TEXT, requested_by TEXT, canceled_at TEXT, payload_key TEXT, office_base_key TEXT, claim_request_id TEXT, hold_at TEXT, test_day TEXT, office_signal_id INTEGER);
--> statement-breakpoint
CREATE TABLE qa_work_plans (
  site_id TEXT PRIMARY KEY REFERENCES qa_work_sites(id),
  worker_email TEXT NOT NULL REFERENCES qa_members(email),
  start_date TEXT NOT NULL,
  repeat_days INTEGER NOT NULL CHECK (repeat_days BETWEEN 1 AND 365),
  instructions TEXT NOT NULL,
  delay_date TEXT,
  delay_reason TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE qa_charger_evidence (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES qa_work_sites(id),
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
  created_at TEXT NOT NULL, charger_type TEXT NOT NULL DEFAULT 'unknown'
  CHECK (charger_type IN ('slow', 'fast', 'unknown')), canopy TEXT NOT NULL DEFAULT 'unknown'
  CHECK (canopy IN ('included', 'excluded', 'unknown')),
  UNIQUE (site_id, work_date, asset_code)
);
--> statement-breakpoint
CREATE TABLE qa_settlement_months (
  month TEXT PRIMARY KEY,
  closed_at TEXT NOT NULL,
  closed_by TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE qa_settlement_payments (
  report_id TEXT PRIMARY KEY REFERENCES qa_field_reports(id),
  billed INTEGER NOT NULL CHECK (billed >= 0),
  received INTEGER NOT NULL CHECK (received >= 0),
  paid INTEGER NOT NULL CHECK (paid >= 0),
  billing_ref TEXT NOT NULL,
  note TEXT NOT NULL,
  updated_at TEXT NOT NULL
, vat INTEGER CHECK (vat BETWEEN 0 AND billed), worker_breakdown TEXT NOT NULL DEFAULT '[]'
  CHECK (json_valid(worker_breakdown) AND json_type(worker_breakdown) = 'array'), payment_version INTEGER NOT NULL DEFAULT 1
  CHECK (payment_version BETWEEN 1 AND 9007199254740991));
--> statement-breakpoint
CREATE TABLE qa_gmail_report_runner (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  activated_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE qa_office_mail_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('worker', 'tax')),
  reference TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('assignment', 'payout', 'close', 'amounts')),
  source_id TEXT NOT NULL, withdrawn INTEGER NOT NULL DEFAULT 0 CHECK (withdrawn IN (0, 1)), withdrawn_date TEXT,
  UNIQUE(kind, reference, source, source_id)
);
--> statement-breakpoint
CREATE TABLE qa_office_mail_progress (
  kind TEXT NOT NULL,
  reference TEXT NOT NULL,
  signal_id INTEGER NOT NULL,
  PRIMARY KEY(kind, reference)
);
--> statement-breakpoint
CREATE INDEX qa_field_reports_work_date ON qa_field_reports(work_date);
--> statement-breakpoint
CREATE INDEX qa_field_reports_site_cycle ON qa_field_reports(site_id, status, assignment_due);
--> statement-breakpoint
CREATE INDEX qa_field_reports_recent_site ON qa_field_reports(site_id, work_date DESC);
--> statement-breakpoint
CREATE INDEX qa_charger_evidence_date ON qa_charger_evidence(work_date);
--> statement-breakpoint
CREATE INDEX qa_field_reports_completion ON qa_field_reports(completion_reported_at) WHERE completion_reported_at IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX qa_report_mail_active_payload ON qa_report_mail(payload_key)
  WHERE payload_key IS NOT NULL AND canceled_at IS NULL;
--> statement-breakpoint
CREATE INDEX qa_report_mail_manual_queue ON qa_report_mail(created_at)
  WHERE requested_by IS NOT NULL AND sent_at IS NULL AND canceled_at IS NULL AND provider_id IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX qa_report_mail_claim_request ON qa_report_mail(claim_request_id) WHERE claim_request_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX qa_report_mail_office_test ON qa_report_mail(test_day) WHERE test_day IS NOT NULL;
--> statement-breakpoint
CREATE INDEX qa_report_mail_active_scope ON qa_report_mail(kind, reference, recipient) WHERE canceled_at IS NULL;
--> statement-breakpoint
CREATE INDEX qa_report_mail_office_signal ON qa_report_mail(kind, reference, office_signal_id)
  WHERE office_signal_id IS NOT NULL AND canceled_at IS NULL;
--> statement-breakpoint
CREATE VIEW qa_work_plan_cycles AS
SELECT p.*, m.name AS worker_name,
  COALESCE(date(MAX(r.assignment_due), '+' || p.repeat_days || ' days'), p.start_date) AS next_due
FROM qa_work_plans p JOIN qa_members m ON m.email = p.worker_email
LEFT JOIN qa_field_reports r ON r.site_id = p.site_id AND r.status = 'approved'
  AND r.assignment_due >= p.start_date
  AND CAST(julianday(r.assignment_due) - julianday(p.start_date) AS INTEGER) % p.repeat_days = 0
GROUP BY p.site_id;
--> statement-breakpoint
CREATE TRIGGER qa_office_mail_assignment_added
AFTER INSERT ON qa_work_plans
BEGIN
  INSERT INTO qa_office_mail_signals(kind, reference, source, source_id)
  VALUES ('worker', substr(NEW.start_date, 1, 7) || ':' || NEW.worker_email, 'assignment', NEW.site_id)
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
END;
--> statement-breakpoint
CREATE TRIGGER qa_office_mail_assignment_changed
AFTER UPDATE OF worker_email, start_date, repeat_days, instructions ON qa_work_plans
WHEN NEW.worker_email IS NOT OLD.worker_email OR NEW.start_date IS NOT OLD.start_date
  OR NEW.repeat_days IS NOT OLD.repeat_days OR NEW.instructions IS NOT OLD.instructions
BEGIN
  INSERT INTO qa_office_mail_signals(kind, reference, source, source_id)
  VALUES ('worker', substr(NEW.start_date, 1, 7) || ':' || NEW.worker_email, 'assignment', NEW.site_id)
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
END;
--> statement-breakpoint
CREATE TRIGGER qa_office_mail_settlement_added
AFTER INSERT ON qa_settlement_payments
BEGIN
  INSERT INTO qa_office_mail_signals(kind, reference, source, source_id)
  SELECT 'worker', substr(r.work_date, 1, 7) || ':' || json_extract(w.value, '$.email'), 'payout', r.id
  FROM qa_field_reports r, json_each(NEW.worker_breakdown) w
  WHERE r.id = NEW.report_id AND json_extract(w.value, '$.email') IS NOT NULL
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
  INSERT INTO qa_office_mail_signals(kind, reference, source, source_id)
  SELECT 'tax', substr(work_date, 1, 7), 'amounts', id FROM qa_field_reports WHERE id = NEW.report_id
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
END;
--> statement-breakpoint
CREATE TRIGGER qa_office_mail_settlement_changed
AFTER UPDATE OF billed, vat, received, paid, billing_ref, worker_breakdown ON qa_settlement_payments
WHEN NEW.billed IS NOT OLD.billed OR NEW.vat IS NOT OLD.vat OR NEW.received IS NOT OLD.received
  OR NEW.paid IS NOT OLD.paid OR NEW.billing_ref IS NOT OLD.billing_ref OR NEW.worker_breakdown IS NOT OLD.worker_breakdown
BEGIN
  INSERT INTO qa_office_mail_signals(kind, reference, source, source_id)
  SELECT 'worker', substr(r.work_date, 1, 7) || ':' || json_extract(w.value, '$.email'), 'payout', r.id
  FROM qa_field_reports r, json_each(NEW.worker_breakdown) w
  WHERE r.id = NEW.report_id AND json_extract(w.value, '$.email') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM json_each(OLD.worker_breakdown) previous
    WHERE json_extract(previous.value, '$.email') = json_extract(w.value, '$.email')
      AND json_extract(previous.value, '$.units') IS json_extract(w.value, '$.units')
      AND json_extract(previous.value, '$.paid') IS json_extract(w.value, '$.paid')
      AND COALESCE(json_extract(previous.value, '$.paidDate'), '') = COALESCE(json_extract(w.value, '$.paidDate'), '')
  )
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
  INSERT INTO qa_office_mail_signals(kind, reference, source, source_id)
  SELECT 'tax', substr(work_date, 1, 7), 'amounts', id FROM qa_field_reports WHERE id = NEW.report_id
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
END;
--> statement-breakpoint
CREATE TRIGGER qa_office_mail_month_closed
AFTER INSERT ON qa_settlement_months
BEGIN
  INSERT INTO qa_office_mail_signals(kind, reference, source, source_id)
  VALUES ('tax', NEW.month, 'close', NEW.month)
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
END;
--> statement-breakpoint
CREATE TRIGGER qa_office_mail_worker_rate_confirmed
AFTER UPDATE OF worker_price ON qa_field_reports
WHEN NEW.worker_price IS NOT NULL AND NEW.worker_price IS NOT OLD.worker_price
BEGIN
  INSERT INTO qa_office_mail_signals(kind, reference, source, source_id)
  SELECT 'worker', substr(NEW.work_date, 1, 7) || ':' || json_extract(w.value, '$.email'), 'payout', NEW.id
  FROM qa_settlement_payments p, json_each(p.worker_breakdown) w
  WHERE p.report_id = NEW.id AND json_extract(w.value, '$.email') IS NOT NULL
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
END;
--> statement-breakpoint
CREATE TRIGGER qa_office_mail_assignment_withdrawn
AFTER DELETE ON qa_work_plans
BEGIN
  INSERT INTO qa_office_mail_signals(kind, reference, source, source_id, withdrawn, withdrawn_date)
  SELECT 'worker', substr(OLD.start_date, 1, 7) || ':' || OLD.worker_email, 'assignment', OLD.site_id, 1, OLD.start_date
  WHERE EXISTS (SELECT 1 FROM qa_report_mail WHERE kind = 'worker'
    AND reference = substr(OLD.start_date, 1, 7) || ':' || OLD.worker_email AND canceled_at IS NULL
    AND (sent_at IS NOT NULL OR (provider_id LIKE 'gmail:%' AND hold_at IS NULL)))
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id, withdrawn = 1, withdrawn_date = excluded.withdrawn_date;
END;
--> statement-breakpoint
CREATE TRIGGER qa_office_mail_assignment_replaced
AFTER UPDATE OF worker_email, start_date ON qa_work_plans
WHEN OLD.worker_email IS NOT NEW.worker_email OR substr(OLD.start_date, 1, 7) IS NOT substr(NEW.start_date, 1, 7)
BEGIN
  INSERT INTO qa_office_mail_signals(kind, reference, source, source_id, withdrawn, withdrawn_date)
  SELECT 'worker', substr(OLD.start_date, 1, 7) || ':' || OLD.worker_email, 'assignment', OLD.site_id, 1, OLD.start_date
  WHERE EXISTS (SELECT 1 FROM qa_report_mail WHERE kind = 'worker'
    AND reference = substr(OLD.start_date, 1, 7) || ':' || OLD.worker_email AND canceled_at IS NULL
    AND (sent_at IS NOT NULL OR (provider_id LIKE 'gmail:%' AND hold_at IS NULL)))
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id, withdrawn = 1, withdrawn_date = excluded.withdrawn_date;
END;
--> statement-breakpoint
CREATE TRIGGER qa_office_mail_payout_removed
AFTER UPDATE OF worker_breakdown ON qa_settlement_payments
WHEN NEW.worker_breakdown IS NOT OLD.worker_breakdown
BEGIN
  INSERT INTO qa_office_mail_signals(kind, reference, source, source_id, withdrawn, withdrawn_date)
  SELECT 'worker', substr(r.work_date, 1, 7) || ':' || json_extract(previous.value, '$.email'), 'payout', r.id, 1, r.work_date
  FROM qa_field_reports r, json_each(OLD.worker_breakdown) previous
  WHERE r.id = OLD.report_id AND json_extract(previous.value, '$.email') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM json_each(NEW.worker_breakdown) current
    WHERE json_extract(current.value, '$.email') = json_extract(previous.value, '$.email')
  ) AND EXISTS (
    SELECT 1 FROM qa_report_mail WHERE kind = 'worker'
      AND reference = substr(r.work_date, 1, 7) || ':' || json_extract(previous.value, '$.email') AND canceled_at IS NULL
      AND (sent_at IS NOT NULL OR (provider_id LIKE 'gmail:%' AND hold_at IS NULL))
  )
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id, withdrawn = 1, withdrawn_date = excluded.withdrawn_date;
END;
--> statement-breakpoint
INSERT INTO qa_charger_regions (region_name, charger_count, source_date) VALUES ('서울특별시', 0, '2000-01-01');
--> statement-breakpoint
CREATE TABLE qa_login_codes (code_hash TEXT PRIMARY KEY, email TEXT NOT NULL REFERENCES qa_members(email), expires_at TEXT NOT NULL, used_at TEXT);
--> statement-breakpoint
CREATE TABLE qa_login_sessions (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL REFERENCES qa_members(email), expires_at TEXT NOT NULL);
