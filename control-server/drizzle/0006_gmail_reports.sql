CREATE TABLE gmail_report_runner (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  activated_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
