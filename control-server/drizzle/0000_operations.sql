CREATE TABLE members (
  email TEXT PRIMARY KEY,
  user_id TEXT UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE work_sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat REAL NOT NULL CHECK (lat BETWEEN -85 AND 85),
  lng REAL NOT NULL CHECK (lng BETWEEN -180 AND 180),
  status TEXT NOT NULL CHECK (status IN ('pending', 'delayed', 'done')),
  due_date TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
