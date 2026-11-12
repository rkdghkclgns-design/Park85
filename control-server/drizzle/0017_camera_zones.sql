CREATE TABLE work_zones (
  id TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES work_sites(id),
  name TEXT NOT NULL COLLATE NOCASE, created_at TEXT NOT NULL, created_by TEXT NOT NULL,
  UNIQUE(site_id, name)
);
--> statement-breakpoint
ALTER TABLE charger_evidence ADD COLUMN zone_id TEXT REFERENCES work_zones(id);
--> statement-breakpoint
ALTER TABLE charger_evidence ADD COLUMN capture_ids TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(capture_ids) AND json_type(capture_ids) = 'array');
--> statement-breakpoint
CREATE TABLE work_camera_photos (
  id TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES work_sites(id),
  work_date TEXT NOT NULL, asset_code TEXT NOT NULL, zone_id TEXT REFERENCES work_zones(id),
  author_id TEXT NOT NULL, slot TEXT NOT NULL CHECK (slot IN ('exteriorBefore','exteriorAfter','interiorBefore','interiorAfter')),
  created_at TEXT NOT NULL, evidence_id TEXT REFERENCES charger_evidence(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX work_camera_drafts ON work_camera_photos(site_id,work_date,asset_code,author_id,zone_id) WHERE evidence_id IS NULL;
--> statement-breakpoint
CREATE INDEX work_camera_evidence ON work_camera_photos(evidence_id);
--> statement-breakpoint
CREATE TRIGGER link_work_camera_photos AFTER INSERT ON charger_evidence
WHEN json_array_length(NEW.capture_ids) > 0
BEGIN
  UPDATE work_camera_photos SET evidence_id = NEW.id
  WHERE id IN (SELECT value FROM json_each(NEW.capture_ids)) AND evidence_id IS NULL;
END;
--> statement-breakpoint
CREATE TABLE qa_work_zones (
  id TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES qa_work_sites(id),
  name TEXT NOT NULL COLLATE NOCASE, created_at TEXT NOT NULL, created_by TEXT NOT NULL,
  UNIQUE(site_id, name)
);
--> statement-breakpoint
ALTER TABLE qa_charger_evidence ADD COLUMN zone_id TEXT REFERENCES qa_work_zones(id);
--> statement-breakpoint
ALTER TABLE qa_charger_evidence ADD COLUMN capture_ids TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(capture_ids) AND json_type(capture_ids) = 'array');
--> statement-breakpoint
CREATE TABLE qa_work_camera_photos (
  id TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES qa_work_sites(id),
  work_date TEXT NOT NULL, asset_code TEXT NOT NULL, zone_id TEXT REFERENCES qa_work_zones(id),
  author_id TEXT NOT NULL, slot TEXT NOT NULL CHECK (slot IN ('exteriorBefore','exteriorAfter','interiorBefore','interiorAfter')),
  created_at TEXT NOT NULL, evidence_id TEXT REFERENCES qa_charger_evidence(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX qa_work_camera_drafts ON qa_work_camera_photos(site_id,work_date,asset_code,author_id,zone_id) WHERE evidence_id IS NULL;
--> statement-breakpoint
CREATE INDEX qa_work_camera_evidence ON qa_work_camera_photos(evidence_id);
--> statement-breakpoint
CREATE TRIGGER qa_link_work_camera_photos AFTER INSERT ON qa_charger_evidence
WHEN json_array_length(NEW.capture_ids) > 0
BEGIN
  UPDATE qa_work_camera_photos SET evidence_id = NEW.id
  WHERE id IN (SELECT value FROM json_each(NEW.capture_ids)) AND evidence_id IS NULL;
END;
