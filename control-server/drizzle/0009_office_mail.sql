ALTER TABLE control_settings ADD COLUMN tax_email TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE control_settings ADD COLUMN worker_mail_enabled INTEGER NOT NULL DEFAULT 0 CHECK (worker_mail_enabled IN (0, 1));
--> statement-breakpoint
ALTER TABLE report_mail ADD COLUMN requested_by TEXT;
--> statement-breakpoint
ALTER TABLE report_mail ADD COLUMN canceled_at TEXT;
--> statement-breakpoint
ALTER TABLE report_mail ADD COLUMN payload_key TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX report_mail_active_payload ON report_mail(payload_key)
  WHERE payload_key IS NOT NULL AND canceled_at IS NULL;
--> statement-breakpoint
CREATE INDEX report_mail_manual_queue ON report_mail(created_at)
  WHERE requested_by IS NOT NULL AND sent_at IS NULL AND canceled_at IS NULL AND provider_id IS NULL;
