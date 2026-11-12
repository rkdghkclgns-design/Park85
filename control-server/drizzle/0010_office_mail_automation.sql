ALTER TABLE control_settings ADD COLUMN office_auto_enabled INTEGER NOT NULL DEFAULT 0 CHECK (office_auto_enabled IN (0, 1));
--> statement-breakpoint
ALTER TABLE report_mail ADD COLUMN office_base_key TEXT;
--> statement-breakpoint
CREATE TABLE office_mail_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('worker', 'tax')),
  reference TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('assignment', 'payout', 'close', 'amounts')),
  source_id TEXT NOT NULL,
  UNIQUE(kind, reference, source, source_id)
);
--> statement-breakpoint
CREATE TABLE office_mail_progress (
  kind TEXT NOT NULL,
  reference TEXT NOT NULL,
  signal_id INTEGER NOT NULL,
  PRIMARY KEY(kind, reference)
);
--> statement-breakpoint
CREATE TRIGGER office_mail_assignment_added
AFTER INSERT ON work_plans
BEGIN
  INSERT INTO office_mail_signals(kind, reference, source, source_id)
  VALUES ('worker', substr(NEW.start_date, 1, 7) || ':' || NEW.worker_email, 'assignment', NEW.site_id)
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
END;
--> statement-breakpoint
CREATE TRIGGER office_mail_assignment_changed
AFTER UPDATE OF worker_email, start_date, repeat_days, instructions ON work_plans
WHEN NEW.worker_email IS NOT OLD.worker_email OR NEW.start_date IS NOT OLD.start_date
  OR NEW.repeat_days IS NOT OLD.repeat_days OR NEW.instructions IS NOT OLD.instructions
BEGIN
  INSERT INTO office_mail_signals(kind, reference, source, source_id)
  VALUES ('worker', substr(NEW.start_date, 1, 7) || ':' || NEW.worker_email, 'assignment', NEW.site_id)
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
END;
--> statement-breakpoint
CREATE TRIGGER office_mail_settlement_added
AFTER INSERT ON settlement_payments
BEGIN
  INSERT INTO office_mail_signals(kind, reference, source, source_id)
  SELECT 'worker', substr(r.work_date, 1, 7) || ':' || json_extract(w.value, '$.email'), 'payout', r.id
  FROM field_reports r, json_each(NEW.worker_breakdown) w
  WHERE r.id = NEW.report_id AND json_extract(w.value, '$.email') IS NOT NULL
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
  INSERT INTO office_mail_signals(kind, reference, source, source_id)
  SELECT 'tax', substr(work_date, 1, 7), 'amounts', id FROM field_reports WHERE id = NEW.report_id
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
END;
--> statement-breakpoint
CREATE TRIGGER office_mail_settlement_changed
AFTER UPDATE OF billed, vat, received, paid, billing_ref, worker_breakdown ON settlement_payments
WHEN NEW.billed IS NOT OLD.billed OR NEW.vat IS NOT OLD.vat OR NEW.received IS NOT OLD.received
  OR NEW.paid IS NOT OLD.paid OR NEW.billing_ref IS NOT OLD.billing_ref OR NEW.worker_breakdown IS NOT OLD.worker_breakdown
BEGIN
  INSERT INTO office_mail_signals(kind, reference, source, source_id)
  SELECT 'worker', substr(r.work_date, 1, 7) || ':' || json_extract(w.value, '$.email'), 'payout', r.id
  FROM field_reports r, json_each(NEW.worker_breakdown) w
  WHERE r.id = NEW.report_id AND json_extract(w.value, '$.email') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM json_each(OLD.worker_breakdown) previous
    WHERE json_extract(previous.value, '$.email') = json_extract(w.value, '$.email')
      AND json_extract(previous.value, '$.units') IS json_extract(w.value, '$.units')
      AND json_extract(previous.value, '$.paid') IS json_extract(w.value, '$.paid')
      AND COALESCE(json_extract(previous.value, '$.paidDate'), '') = COALESCE(json_extract(w.value, '$.paidDate'), '')
  )
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
  INSERT INTO office_mail_signals(kind, reference, source, source_id)
  SELECT 'tax', substr(work_date, 1, 7), 'amounts', id FROM field_reports WHERE id = NEW.report_id
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
END;
--> statement-breakpoint
CREATE TRIGGER office_mail_month_closed
AFTER INSERT ON settlement_months
BEGIN
  INSERT INTO office_mail_signals(kind, reference, source, source_id)
  VALUES ('tax', NEW.month, 'close', NEW.month)
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
END;
--> statement-breakpoint
CREATE TRIGGER office_mail_worker_rate_confirmed
AFTER UPDATE OF worker_price ON field_reports
WHEN NEW.worker_price IS NOT NULL AND NEW.worker_price IS NOT OLD.worker_price
BEGIN
  INSERT INTO office_mail_signals(kind, reference, source, source_id)
  SELECT 'worker', substr(NEW.work_date, 1, 7) || ':' || json_extract(w.value, '$.email'), 'payout', NEW.id
  FROM settlement_payments p, json_each(p.worker_breakdown) w
  WHERE p.report_id = NEW.id AND json_extract(w.value, '$.email') IS NOT NULL
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id;
END;
