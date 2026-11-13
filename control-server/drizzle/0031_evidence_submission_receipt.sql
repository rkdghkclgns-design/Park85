-- Immutable request receipts allow a lost response to be retried without changing
-- an existing evidence record, its photographs, or its later administrative edits.
ALTER TABLE charger_evidence ADD COLUMN submission_hash TEXT;
--> statement-breakpoint
ALTER TABLE qa_charger_evidence ADD COLUMN submission_hash TEXT;
