CREATE TABLE work_guidance_receipts (
  site_id TEXT NOT NULL REFERENCES work_sites(id) ON DELETE CASCADE, author_id TEXT NOT NULL, assignment_due TEXT NOT NULL,
  version TEXT NOT NULL, confirmed_at TEXT NOT NULL,
  PRIMARY KEY(site_id,author_id,assignment_due,version)
);
--> statement-breakpoint
ALTER TABLE charger_evidence ADD COLUMN safety_checklist TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(safety_checklist));
--> statement-breakpoint
CREATE TABLE qa_work_guidance_receipts (
  site_id TEXT NOT NULL REFERENCES qa_work_sites(id) ON DELETE CASCADE, author_id TEXT NOT NULL, assignment_due TEXT NOT NULL,
  version TEXT NOT NULL, confirmed_at TEXT NOT NULL,
  PRIMARY KEY(site_id,author_id,assignment_due,version)
);
--> statement-breakpoint
ALTER TABLE qa_charger_evidence ADD COLUMN safety_checklist TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(safety_checklist));
