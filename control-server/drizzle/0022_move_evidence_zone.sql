ALTER TABLE work_camera_photos ADD COLUMN upload_zone_before_move TEXT;
--> statement-breakpoint
ALTER TABLE qa_work_camera_photos ADD COLUMN upload_zone_before_move TEXT;
--> statement-breakpoint
CREATE TRIGGER move_evidence_zone AFTER UPDATE OF zone_id ON charger_evidence
WHEN OLD.zone_id IS NOT NEW.zone_id
BEGIN
  UPDATE work_camera_photos SET upload_zone_before_move=COALESCE(upload_zone_before_move,zone_id,''),zone_id=NEW.zone_id
  WHERE evidence_id=NEW.id;
  INSERT INTO operations_events(occurred_at,kind,site_id,reference,worker,actor,detail)
  VALUES (strftime('%Y-%m-%dT%H:%M:%fZ','now'),'evidence_zone_move',NEW.site_id,NEW.id,NEW.author_name,NEW.history_actor,
    COALESCE('충전기 ' || NEW.device_number,NEW.asset_code) || ' · ' ||
    COALESCE((SELECT name FROM work_zones WHERE id=OLD.zone_id),'구역 미지정') || ' → ' ||
    COALESCE((SELECT name FROM work_zones WHERE id=NEW.zone_id),'구역 미지정'));
END;
--> statement-breakpoint
CREATE TRIGGER qa_move_evidence_zone AFTER UPDATE OF zone_id ON qa_charger_evidence
WHEN OLD.zone_id IS NOT NEW.zone_id
BEGIN
  UPDATE qa_work_camera_photos SET upload_zone_before_move=COALESCE(upload_zone_before_move,zone_id,''),zone_id=NEW.zone_id
  WHERE evidence_id=NEW.id;
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,reference,worker,actor,detail)
  VALUES (strftime('%Y-%m-%dT%H:%M:%fZ','now'),'evidence_zone_move',NEW.site_id,NEW.id,NEW.author_name,NEW.history_actor,
    COALESCE('충전기 ' || NEW.device_number,NEW.asset_code) || ' · ' ||
    COALESCE((SELECT name FROM qa_work_zones WHERE id=OLD.zone_id),'구역 미지정') || ' → ' ||
    COALESCE((SELECT name FROM qa_work_zones WHERE id=NEW.zone_id),'구역 미지정'));
END;
