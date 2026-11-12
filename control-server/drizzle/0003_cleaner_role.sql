CREATE TABLE members_with_cleaner (
  email TEXT PRIMARY KEY,
  user_id TEXT UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer', 'cleaner')),
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
INSERT INTO members_with_cleaner (email, user_id, name, role, active, updated_at)
SELECT email, user_id, name, role, active, updated_at FROM members;
--> statement-breakpoint
DROP TABLE members;
--> statement-breakpoint
ALTER TABLE members_with_cleaner RENAME TO members;
