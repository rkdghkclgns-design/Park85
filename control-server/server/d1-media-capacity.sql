CREATE TABLE IF NOT EXISTS media_storage_usage (
  id INTEGER PRIMARY KEY CHECK(id=1),
  total_bytes INTEGER NOT NULL,
  proof_bytes INTEGER NOT NULL
);
INSERT INTO media_storage_usage(id,total_bytes,proof_bytes)
SELECT 1,COALESCE(SUM(length(content)),0),
  COALESCE(SUM(CASE WHEN key NOT GLOB 'signup-documents/*' THEN length(content) ELSE 0 END),0)
FROM media_parts WHERE 1 ON CONFLICT(id) DO NOTHING;
CREATE TRIGGER IF NOT EXISTS media_storage_capacity BEFORE INSERT ON media_parts
WHEN (SELECT total_bytes FROM media_storage_usage WHERE id=1)+length(NEW.content)>450000000
  OR (NEW.key NOT GLOB 'signup-documents/*'
    AND (SELECT proof_bytes FROM media_storage_usage WHERE id=1)+length(NEW.content)>350000000)
BEGIN
  SELECT RAISE(ABORT,'photo_media_limit');
END;
CREATE TRIGGER IF NOT EXISTS media_storage_added AFTER INSERT ON media_parts
BEGIN
  UPDATE media_storage_usage SET total_bytes=total_bytes+length(NEW.content),
    proof_bytes=proof_bytes+CASE WHEN NEW.key NOT GLOB 'signup-documents/*' THEN length(NEW.content) ELSE 0 END
  WHERE id=1;
END;
CREATE TRIGGER IF NOT EXISTS media_storage_removed AFTER DELETE ON media_parts
BEGIN
  UPDATE media_storage_usage SET total_bytes=total_bytes-length(OLD.content),
    proof_bytes=proof_bytes-CASE WHEN OLD.key NOT GLOB 'signup-documents/*' THEN length(OLD.content) ELSE 0 END
  WHERE id=1;
END;
