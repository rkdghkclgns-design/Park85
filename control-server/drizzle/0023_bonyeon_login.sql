CREATE TABLE app_login_keys (
  email TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  issued_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE app_login_sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL REFERENCES app_login_keys(email) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX app_login_sessions_expiry ON app_login_sessions(expires_at);
--> statement-breakpoint
CREATE INDEX app_login_sessions_email ON app_login_sessions(email);
--> statement-breakpoint
CREATE TRIGGER revoke_app_login_on_member_access_change
AFTER UPDATE OF role, active ON members
WHEN OLD.role IS NOT NEW.role OR OLD.active IS NOT NEW.active
BEGIN
  DELETE FROM app_login_sessions WHERE email=NEW.email;
END;
