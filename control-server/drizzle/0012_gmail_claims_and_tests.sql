ALTER TABLE report_mail ADD COLUMN claim_request_id TEXT;
--> statement-breakpoint
ALTER TABLE report_mail ADD COLUMN hold_at TEXT;
--> statement-breakpoint
ALTER TABLE report_mail ADD COLUMN test_day TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX report_mail_claim_request ON report_mail(claim_request_id) WHERE claim_request_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX report_mail_office_test ON report_mail(test_day) WHERE test_day IS NOT NULL;
--> statement-breakpoint
CREATE INDEX report_mail_active_scope ON report_mail(kind, reference, recipient) WHERE canceled_at IS NULL;
