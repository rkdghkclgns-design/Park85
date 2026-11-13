-- Existing media and global limits remain intact. Only work captures have
-- owner/site budgets; report archives and signup documents keep their limits.
CREATE TABLE IF NOT EXISTS media_proof_scopes (
  key TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  site_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS media_proof_scope_owner ON media_proof_scopes(owner_id);
CREATE INDEX IF NOT EXISTS media_proof_scope_site ON media_proof_scopes(site_id);
CREATE TABLE IF NOT EXISTS media_proof_usage (
  kind TEXT NOT NULL CHECK(kind IN ('owner','site')),
  scope_id TEXT NOT NULL,
  stored_bytes INTEGER NOT NULL CHECK(stored_bytes>=0),
  PRIMARY KEY(kind,scope_id)
);
CREATE TRIGGER IF NOT EXISTS media_proof_scope_added AFTER INSERT ON media_proof_scopes
BEGIN
  INSERT INTO media_proof_usage(kind,scope_id,stored_bytes)
    VALUES ('owner',NEW.owner_id,COALESCE((SELECT SUM(length(content)) FROM media_parts WHERE key=NEW.key),0))
    ON CONFLICT(kind,scope_id) DO UPDATE SET stored_bytes=stored_bytes+excluded.stored_bytes;
  INSERT INTO media_proof_usage(kind,scope_id,stored_bytes)
    VALUES ('site',NEW.site_id,COALESCE((SELECT SUM(length(content)) FROM media_parts WHERE key=NEW.key),0))
    ON CONFLICT(kind,scope_id) DO UPDATE SET stored_bytes=stored_bytes+excluded.stored_bytes;
END;
CREATE TRIGGER IF NOT EXISTS media_proof_scope_removed BEFORE DELETE ON media_proof_scopes
BEGIN
  UPDATE media_proof_usage SET stored_bytes=stored_bytes-COALESCE((SELECT SUM(length(content)) FROM media_parts WHERE key=OLD.key),0)
    WHERE (kind='owner' AND scope_id=OLD.owner_id) OR (kind='site' AND scope_id=OLD.site_id);
END;
CREATE TRIGGER IF NOT EXISTS media_proof_owner_capacity BEFORE INSERT ON media_parts
WHEN EXISTS (SELECT 1 FROM media_proof_scopes s JOIN media_proof_usage u
  ON u.kind='owner' AND u.scope_id=s.owner_id
  WHERE s.key=NEW.key AND u.stored_bytes+length(NEW.content)>70000000)
BEGIN
  SELECT RAISE(ABORT,'photo_owner_limit');
END;
CREATE TRIGGER IF NOT EXISTS media_proof_site_capacity BEFORE INSERT ON media_parts
WHEN EXISTS (SELECT 1 FROM media_proof_scopes s JOIN media_proof_usage u
  ON u.kind='site' AND u.scope_id=s.site_id
  WHERE s.key=NEW.key AND u.stored_bytes+length(NEW.content)>140000000)
BEGIN
  SELECT RAISE(ABORT,'photo_site_limit');
END;
CREATE TRIGGER IF NOT EXISTS media_proof_part_added AFTER INSERT ON media_parts
BEGIN
  UPDATE media_proof_usage SET stored_bytes=stored_bytes+length(NEW.content)
    WHERE (kind='owner' AND scope_id=(SELECT owner_id FROM media_proof_scopes WHERE key=NEW.key))
       OR (kind='site' AND scope_id=(SELECT site_id FROM media_proof_scopes WHERE key=NEW.key));
END;
CREATE TRIGGER IF NOT EXISTS media_proof_part_removed AFTER DELETE ON media_parts
BEGIN
  UPDATE media_proof_usage SET stored_bytes=stored_bytes-length(OLD.content)
    WHERE (kind='owner' AND scope_id=(SELECT owner_id FROM media_proof_scopes WHERE key=OLD.key))
       OR (kind='site' AND scope_id=(SELECT site_id FROM media_proof_scopes WHERE key=OLD.key));
END;
-- No FK on the scope map: its AFTER DELETE cleanup must run after media_parts'
-- cascade, so part-removal counters can still resolve the original scope.
CREATE TRIGGER IF NOT EXISTS media_proof_file_removed AFTER DELETE ON media_files
BEGIN
  DELETE FROM media_proof_scopes WHERE key=OLD.key;
END;
