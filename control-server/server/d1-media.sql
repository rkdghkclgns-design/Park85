CREATE TABLE IF NOT EXISTS media_files (
  key TEXT PRIMARY KEY,
  content_type TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media_parts (
  key TEXT NOT NULL REFERENCES media_files(key) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  content TEXT NOT NULL,
  PRIMARY KEY(key, sequence)
);
