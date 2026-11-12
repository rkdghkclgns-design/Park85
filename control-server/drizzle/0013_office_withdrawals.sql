ALTER TABLE office_mail_signals ADD COLUMN withdrawn INTEGER NOT NULL DEFAULT 0 CHECK (withdrawn IN (0, 1));
--> statement-breakpoint
ALTER TABLE office_mail_signals ADD COLUMN withdrawn_date TEXT;
--> statement-breakpoint
ALTER TABLE report_mail ADD COLUMN office_signal_id INTEGER;
--> statement-breakpoint
CREATE INDEX report_mail_office_signal ON report_mail(kind, reference, office_signal_id)
  WHERE office_signal_id IS NOT NULL AND canceled_at IS NULL;
--> statement-breakpoint
CREATE TRIGGER office_mail_assignment_withdrawn
AFTER DELETE ON work_plans
BEGIN
  INSERT INTO office_mail_signals(kind, reference, source, source_id, withdrawn, withdrawn_date)
  SELECT 'worker', substr(OLD.start_date, 1, 7) || ':' || OLD.worker_email, 'assignment', OLD.site_id, 1, OLD.start_date
  WHERE EXISTS (SELECT 1 FROM report_mail WHERE kind = 'worker'
    AND reference = substr(OLD.start_date, 1, 7) || ':' || OLD.worker_email AND canceled_at IS NULL
    AND (sent_at IS NOT NULL OR (provider_id LIKE 'gmail:%' AND hold_at IS NULL)))
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id, withdrawn = 1, withdrawn_date = excluded.withdrawn_date;
END;
--> statement-breakpoint
CREATE TRIGGER office_mail_assignment_replaced
AFTER UPDATE OF worker_email, start_date ON work_plans
WHEN OLD.worker_email IS NOT NEW.worker_email OR substr(OLD.start_date, 1, 7) IS NOT substr(NEW.start_date, 1, 7)
BEGIN
  INSERT INTO office_mail_signals(kind, reference, source, source_id, withdrawn, withdrawn_date)
  SELECT 'worker', substr(OLD.start_date, 1, 7) || ':' || OLD.worker_email, 'assignment', OLD.site_id, 1, OLD.start_date
  WHERE EXISTS (SELECT 1 FROM report_mail WHERE kind = 'worker'
    AND reference = substr(OLD.start_date, 1, 7) || ':' || OLD.worker_email AND canceled_at IS NULL
    AND (sent_at IS NOT NULL OR (provider_id LIKE 'gmail:%' AND hold_at IS NULL)))
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id, withdrawn = 1, withdrawn_date = excluded.withdrawn_date;
END;
--> statement-breakpoint
CREATE TRIGGER office_mail_payout_removed
AFTER UPDATE OF worker_breakdown ON settlement_payments
WHEN NEW.worker_breakdown IS NOT OLD.worker_breakdown
BEGIN
  INSERT INTO office_mail_signals(kind, reference, source, source_id, withdrawn, withdrawn_date)
  SELECT 'worker', substr(r.work_date, 1, 7) || ':' || json_extract(previous.value, '$.email'), 'payout', r.id, 1, r.work_date
  FROM field_reports r, json_each(OLD.worker_breakdown) previous
  WHERE r.id = OLD.report_id AND json_extract(previous.value, '$.email') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM json_each(NEW.worker_breakdown) current
    WHERE json_extract(current.value, '$.email') = json_extract(previous.value, '$.email')
  ) AND EXISTS (
    SELECT 1 FROM report_mail WHERE kind = 'worker'
      AND reference = substr(r.work_date, 1, 7) || ':' || json_extract(previous.value, '$.email') AND canceled_at IS NULL
      AND (sent_at IS NOT NULL OR (provider_id LIKE 'gmail:%' AND hold_at IS NULL))
  )
  ON CONFLICT(kind, reference, source, source_id) DO UPDATE SET id = excluded.id, withdrawn = 1, withdrawn_date = excluded.withdrawn_date;
END;
