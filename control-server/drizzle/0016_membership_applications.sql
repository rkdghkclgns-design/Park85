CREATE TABLE signup_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('individual', 'business')),
  business_name TEXT NOT NULL DEFAULT '',
  invoice_email TEXT NOT NULL DEFAULT '',
  business_mime TEXT,
  bank_mime TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX signup_pending_email ON signup_applications(email) WHERE status = 'pending';
--> statement-breakpoint
CREATE UNIQUE INDEX signup_pending_user ON signup_applications(user_id) WHERE status = 'pending';
--> statement-breakpoint
CREATE INDEX signup_applicant ON signup_applications(user_id, email, created_at);
--> statement-breakpoint
CREATE TRIGGER approve_signup_member
AFTER UPDATE OF status ON signup_applications
WHEN OLD.status = 'pending' AND NEW.status = 'approved'
BEGIN
  INSERT INTO members(email, user_id, name, role, active, updated_at)
  VALUES (NEW.email, NEW.user_id, NEW.name, 'cleaner', 1, NEW.reviewed_at);
END;
