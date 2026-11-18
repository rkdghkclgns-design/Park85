ALTER TABLE work_zones ADD COLUMN planned_units INTEGER CHECK(planned_units IS NULL OR planned_units BETWEEN 1 AND 10000);
--> statement-breakpoint
ALTER TABLE work_zones ADD COLUMN charger_type TEXT CHECK(charger_type IN ('slow','fast'));
--> statement-breakpoint
ALTER TABLE work_zones ADD COLUMN housing TEXT CHECK(housing IN ('standalone','canopy','enclosure','box','other'));
--> statement-breakpoint
ALTER TABLE work_zones ADD COLUMN canopy_scope TEXT CHECK(canopy_scope IN ('included','excluded'));
--> statement-breakpoint
ALTER TABLE work_zones ADD COLUMN cleaning_scope TEXT CHECK(cleaning_scope IN ('exterior','interior','both'));
--> statement-breakpoint
ALTER TABLE work_zones ADD COLUMN repair INTEGER NOT NULL DEFAULT 0 CHECK(repair IN (0,1));
--> statement-breakpoint
ALTER TABLE qa_work_zones ADD COLUMN planned_units INTEGER CHECK(planned_units IS NULL OR planned_units BETWEEN 1 AND 10000);
--> statement-breakpoint
ALTER TABLE qa_work_zones ADD COLUMN charger_type TEXT CHECK(charger_type IN ('slow','fast'));
--> statement-breakpoint
ALTER TABLE qa_work_zones ADD COLUMN housing TEXT CHECK(housing IN ('standalone','canopy','enclosure','box','other'));
--> statement-breakpoint
ALTER TABLE qa_work_zones ADD COLUMN canopy_scope TEXT CHECK(canopy_scope IN ('included','excluded'));
--> statement-breakpoint
ALTER TABLE qa_work_zones ADD COLUMN cleaning_scope TEXT CHECK(cleaning_scope IN ('exterior','interior','both'));
--> statement-breakpoint
ALTER TABLE qa_work_zones ADD COLUMN repair INTEGER NOT NULL DEFAULT 0 CHECK(repair IN (0,1));
--> statement-breakpoint
CREATE TRIGGER site_quantity_floor_limit
BEFORE UPDATE OF planned_units ON work_sites
WHEN COALESCE(NEW.planned_units,0)<COALESCE((
  SELECT SUM(planned_units) FROM work_zones WHERE site_id=OLD.id AND deleted_at IS NULL
),0)
BEGIN
  SELECT RAISE(ABORT,'FLOOR_PLAN_EXCEEDS_SITE_QUANTITY');
END;
--> statement-breakpoint
CREATE TRIGGER qa_site_quantity_floor_limit
BEFORE UPDATE OF planned_units ON qa_work_sites
WHEN COALESCE(NEW.planned_units,0)<COALESCE((
  SELECT SUM(planned_units) FROM qa_work_zones WHERE site_id=OLD.id AND deleted_at IS NULL
),0)
BEGIN
  SELECT RAISE(ABORT,'FLOOR_PLAN_EXCEEDS_SITE_QUANTITY');
END;
