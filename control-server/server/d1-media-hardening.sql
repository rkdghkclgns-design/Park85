CREATE TABLE IF NOT EXISTS media_signup_usage (
  id INTEGER PRIMARY KEY CHECK (id=1),
  bytes INTEGER NOT NULL
);
INSERT INTO media_signup_usage(id,bytes)
  SELECT 1,COALESCE(SUM(length(content)),0) FROM media_parts WHERE key GLOB 'signup-documents/*'
  ON CONFLICT(id) DO NOTHING;
CREATE TRIGGER IF NOT EXISTS media_signup_capacity BEFORE INSERT ON media_parts
WHEN NEW.key GLOB 'signup-documents/*'
  AND (SELECT bytes FROM media_signup_usage WHERE id=1)+length(NEW.content)>100000000
BEGIN
  SELECT RAISE(ABORT,'signup_media_limit');
END;
CREATE TRIGGER IF NOT EXISTS media_signup_added AFTER INSERT ON media_parts
WHEN NEW.key GLOB 'signup-documents/*'
BEGIN
  UPDATE media_signup_usage SET bytes=bytes+length(NEW.content) WHERE id=1;
END;
CREATE TRIGGER IF NOT EXISTS media_signup_removed AFTER DELETE ON media_parts
WHEN OLD.key GLOB 'signup-documents/*'
BEGIN
  UPDATE media_signup_usage SET bytes=bytes-length(OLD.content) WHERE id=1;
END;
