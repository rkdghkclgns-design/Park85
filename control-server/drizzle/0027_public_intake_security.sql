CREATE TABLE public_challenge_uses (
  token_hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX public_challenge_uses_expiration ON public_challenge_uses(expires_at);
--> statement-breakpoint
DROP TRIGGER revoke_app_login_on_member_access_change;
--> statement-breakpoint
CREATE TRIGGER revoke_app_login_on_member_access_change
AFTER UPDATE OF role, active ON members
WHEN OLD.role IS NOT NEW.role OR OLD.active IS NOT NEW.active
BEGIN
  DELETE FROM app_login_sessions WHERE email=NEW.email;
  DELETE FROM app_login_keys WHERE email=NEW.email;
END;
