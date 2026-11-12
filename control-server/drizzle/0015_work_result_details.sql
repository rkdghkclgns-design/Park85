ALTER TABLE charger_evidence ADD COLUMN result_detail TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(result_detail) AND json_type(result_detail) = 'object');
--> statement-breakpoint
ALTER TABLE qa_charger_evidence ADD COLUMN result_detail TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(result_detail) AND json_type(result_detail) = 'object');
