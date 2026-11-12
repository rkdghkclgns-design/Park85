ALTER TABLE charger_evidence ADD COLUMN charger_type TEXT NOT NULL DEFAULT 'unknown'
  CHECK (charger_type IN ('slow', 'fast', 'unknown'));
--> statement-breakpoint
ALTER TABLE charger_evidence ADD COLUMN canopy TEXT NOT NULL DEFAULT 'unknown'
  CHECK (canopy IN ('included', 'excluded', 'unknown'));
--> statement-breakpoint
ALTER TABLE settlement_payments ADD COLUMN vat INTEGER CHECK (vat BETWEEN 0 AND billed);
--> statement-breakpoint
ALTER TABLE settlement_payments ADD COLUMN worker_breakdown TEXT NOT NULL DEFAULT '[]'
  CHECK (json_valid(worker_breakdown) AND json_type(worker_breakdown) = 'array');
--> statement-breakpoint
ALTER TABLE report_mail ADD COLUMN html TEXT;
