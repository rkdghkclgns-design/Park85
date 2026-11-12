ALTER TABLE field_reports ADD COLUMN completion_reported_at TEXT;
--> statement-breakpoint
CREATE INDEX field_reports_completion ON field_reports(completion_reported_at) WHERE completion_reported_at IS NOT NULL;
