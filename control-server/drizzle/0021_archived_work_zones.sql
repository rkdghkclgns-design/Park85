ALTER TABLE work_zones ADD COLUMN deleted_at TEXT;
--> statement-breakpoint
ALTER TABLE qa_work_zones ADD COLUMN deleted_at TEXT;
--> statement-breakpoint
CREATE INDEX work_camera_photos_zone ON work_camera_photos(zone_id) WHERE zone_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX qa_work_camera_photos_zone ON qa_work_camera_photos(zone_id) WHERE zone_id IS NOT NULL;
