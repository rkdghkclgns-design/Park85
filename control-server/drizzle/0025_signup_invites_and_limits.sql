CREATE TABLE app_request_limits (
  scope TEXT NOT NULL,
  source TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  reset_at TEXT NOT NULL,
  PRIMARY KEY (scope, source)
);
--> statement-breakpoint
CREATE INDEX app_request_limits_expiration ON app_request_limits(reset_at);
--> statement-breakpoint
CREATE TABLE signup_invite_requests (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  requested_at TEXT NOT NULL
);
--> statement-breakpoint
ALTER TABLE app_login_keys ADD COLUMN invite_verified INTEGER NOT NULL DEFAULT 1 CHECK (invite_verified IN (0, 1));
--> statement-breakpoint
UPDATE app_login_keys SET invite_verified=0 WHERE EXISTS (
  SELECT 1 FROM signup_applications a WHERE a.email=app_login_keys.email
    AND a.created_at=app_login_keys.issued_at
);
--> statement-breakpoint
DELETE FROM app_login_sessions WHERE email IN (SELECT email FROM app_login_keys WHERE invite_verified=0);
--> statement-breakpoint
DROP TRIGGER issue_signup_login_key;
