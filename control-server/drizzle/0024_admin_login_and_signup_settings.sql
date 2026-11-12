CREATE TABLE app_admin_login_limit (
  id INTEGER PRIMARY KEY CHECK (id=1),
  attempts INTEGER NOT NULL,
  reset_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE app_signup_settings (
  id INTEGER PRIMARY KEY CHECK (id=1),
  enabled INTEGER NOT NULL CHECK (enabled IN (0,1))
);
--> statement-breakpoint
INSERT INTO app_signup_settings (id,enabled) VALUES (1,1);
--> statement-breakpoint
ALTER TABLE signup_applications ADD COLUMN initial_login_key_hash TEXT;
--> statement-breakpoint
CREATE TRIGGER issue_signup_login_key
AFTER INSERT ON signup_applications
WHEN NEW.initial_login_key_hash IS NOT NULL
BEGIN
  INSERT INTO app_login_keys(email,user_id,key_hash,issued_at)
    VALUES (NEW.email,NEW.user_id,NEW.initial_login_key_hash,NEW.created_at);
  UPDATE signup_applications SET initial_login_key_hash=NULL WHERE id=NEW.id;
END;
