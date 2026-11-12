ALTER TABLE site_reporting ADD COLUMN contractor_emails TEXT NOT NULL DEFAULT '[]'
  CHECK (json_valid(contractor_emails) AND json_type(contractor_emails) = 'array');
--> statement-breakpoint
ALTER TABLE qa_site_reporting ADD COLUMN contractor_emails TEXT NOT NULL DEFAULT '[]'
  CHECK (json_valid(contractor_emails) AND json_type(contractor_emails) = 'array');
