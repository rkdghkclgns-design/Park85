ALTER TABLE work_sites ADD COLUMN planned_units INTEGER CHECK(planned_units BETWEEN 1 AND 10000);
--> statement-breakpoint
ALTER TABLE field_reports ADD COLUMN planned_units INTEGER CHECK(planned_units BETWEEN 1 AND 10000);
--> statement-breakpoint
ALTER TABLE field_reports ADD COLUMN progress_from TEXT;
--> statement-breakpoint
ALTER TABLE field_reports ADD COLUMN internal_work INTEGER NOT NULL DEFAULT 0 CHECK(internal_work IN (0,1));
--> statement-breakpoint
ALTER TABLE charger_evidence ADD COLUMN device_number INTEGER;
--> statement-breakpoint
ALTER TABLE charger_evidence ADD COLUMN internal_work INTEGER NOT NULL DEFAULT 0 CHECK(internal_work IN (0,1));
--> statement-breakpoint
ALTER TABLE field_reports ADD COLUMN internal_units INTEGER NOT NULL DEFAULT 0 CHECK(internal_units>=0);
--> statement-breakpoint
CREATE TABLE work_progress (
  site_id TEXT PRIMARY KEY REFERENCES work_sites(id), first_date TEXT NOT NULL, last_date TEXT NOT NULL,
  planned_units INTEGER NOT NULL CHECK(planned_units BETWEEN 1 AND 10000),
  units INTEGER NOT NULL CHECK(units > 0 AND units < planned_units),
  exterior INTEGER NOT NULL, interior INTEGER NOT NULL, notes TEXT NOT NULL DEFAULT '',
  author_id TEXT NOT NULL, author_name TEXT NOT NULL, updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE work_report_drafts (
  site_id TEXT NOT NULL REFERENCES work_sites(id), work_date TEXT NOT NULL, author_id TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)), updated_at TEXT NOT NULL, PRIMARY KEY(site_id,work_date,author_id)
);
--> statement-breakpoint
CREATE INDEX report_drafts_owner ON work_report_drafts(author_id,updated_at DESC);
--> statement-breakpoint
CREATE TRIGGER partial_progress_insert AFTER INSERT ON work_progress
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,worker,actor,detail)
  VALUES(NEW.updated_at,'partial_progress',NEW.site_id,NEW.author_name,NEW.author_name,
    NEW.units || ' / ' || NEW.planned_units || '기 완료');
  DELETE FROM work_report_drafts WHERE site_id=NEW.site_id AND author_id=NEW.author_id AND work_date=NEW.last_date;
END;
--> statement-breakpoint
CREATE TRIGGER final_progress_insert AFTER INSERT ON field_reports
WHEN NEW.status IN ('submitted','approved')
BEGIN
  DELETE FROM work_report_drafts WHERE site_id=NEW.site_id AND author_id=NEW.author_id AND work_date=NEW.work_date;
  DELETE FROM work_progress WHERE site_id=NEW.site_id AND first_date=NEW.progress_from AND NEW.status='approved';
END;
--> statement-breakpoint
CREATE TRIGGER partial_progress_update AFTER UPDATE ON work_progress
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,worker,actor,detail)
  VALUES(NEW.updated_at,'partial_progress',NEW.site_id,NEW.author_name,NEW.author_name,
    NEW.units || ' / ' || NEW.planned_units || '기 완료');
  DELETE FROM work_report_drafts WHERE site_id=NEW.site_id AND author_id=NEW.author_id AND work_date=NEW.last_date;
END;
--> statement-breakpoint
CREATE TRIGGER final_progress_update AFTER UPDATE ON field_reports
WHEN NEW.status IN ('submitted','approved')
BEGIN
  DELETE FROM work_report_drafts WHERE site_id=NEW.site_id AND author_id=NEW.author_id AND work_date=NEW.work_date;
  DELETE FROM work_progress WHERE site_id=NEW.site_id AND first_date=NEW.progress_from AND NEW.status='approved';
END;
--> statement-breakpoint
ALTER TABLE qa_work_sites ADD COLUMN planned_units INTEGER CHECK(planned_units BETWEEN 1 AND 10000);
--> statement-breakpoint
ALTER TABLE qa_field_reports ADD COLUMN planned_units INTEGER CHECK(planned_units BETWEEN 1 AND 10000);
--> statement-breakpoint
ALTER TABLE qa_field_reports ADD COLUMN progress_from TEXT;
--> statement-breakpoint
ALTER TABLE qa_field_reports ADD COLUMN internal_work INTEGER NOT NULL DEFAULT 0 CHECK(internal_work IN (0,1));
--> statement-breakpoint
ALTER TABLE qa_charger_evidence ADD COLUMN device_number INTEGER;
--> statement-breakpoint
ALTER TABLE qa_charger_evidence ADD COLUMN internal_work INTEGER NOT NULL DEFAULT 0 CHECK(internal_work IN (0,1));
--> statement-breakpoint
ALTER TABLE qa_field_reports ADD COLUMN internal_units INTEGER NOT NULL DEFAULT 0 CHECK(internal_units>=0);
--> statement-breakpoint
CREATE TABLE qa_work_progress (
  site_id TEXT PRIMARY KEY REFERENCES qa_work_sites(id), first_date TEXT NOT NULL, last_date TEXT NOT NULL,
  planned_units INTEGER NOT NULL CHECK(planned_units BETWEEN 1 AND 10000),
  units INTEGER NOT NULL CHECK(units > 0 AND units < planned_units),
  exterior INTEGER NOT NULL, interior INTEGER NOT NULL, notes TEXT NOT NULL DEFAULT '',
  author_id TEXT NOT NULL, author_name TEXT NOT NULL, updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE qa_work_report_drafts (
  site_id TEXT NOT NULL REFERENCES qa_work_sites(id), work_date TEXT NOT NULL, author_id TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)), updated_at TEXT NOT NULL, PRIMARY KEY(site_id,work_date,author_id)
);
--> statement-breakpoint
CREATE INDEX qa_report_drafts_owner ON qa_work_report_drafts(author_id,updated_at DESC);
--> statement-breakpoint
CREATE TRIGGER qa_partial_progress_insert AFTER INSERT ON qa_work_progress
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,worker,actor,detail)
  VALUES(NEW.updated_at,'partial_progress',NEW.site_id,NEW.author_name,NEW.author_name,
    NEW.units || ' / ' || NEW.planned_units || '기 완료');
  DELETE FROM qa_work_report_drafts WHERE site_id=NEW.site_id AND author_id=NEW.author_id AND work_date=NEW.last_date;
END;
--> statement-breakpoint
CREATE TRIGGER qa_final_progress_insert AFTER INSERT ON qa_field_reports
WHEN NEW.status IN ('submitted','approved')
BEGIN
  DELETE FROM qa_work_report_drafts WHERE site_id=NEW.site_id AND author_id=NEW.author_id AND work_date=NEW.work_date;
  DELETE FROM qa_work_progress WHERE site_id=NEW.site_id AND first_date=NEW.progress_from AND NEW.status='approved';
END;
--> statement-breakpoint
CREATE TRIGGER qa_partial_progress_update AFTER UPDATE ON qa_work_progress
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,worker,actor,detail)
  VALUES(NEW.updated_at,'partial_progress',NEW.site_id,NEW.author_name,NEW.author_name,
    NEW.units || ' / ' || NEW.planned_units || '기 완료');
  DELETE FROM qa_work_report_drafts WHERE site_id=NEW.site_id AND author_id=NEW.author_id AND work_date=NEW.last_date;
END;
--> statement-breakpoint
CREATE TRIGGER qa_final_progress_update AFTER UPDATE ON qa_field_reports
WHEN NEW.status IN ('submitted','approved')
BEGIN
  DELETE FROM qa_work_report_drafts WHERE site_id=NEW.site_id AND author_id=NEW.author_id AND work_date=NEW.work_date;
  DELETE FROM qa_work_progress WHERE site_id=NEW.site_id AND first_date=NEW.progress_from AND NEW.status='approved';
END;
--> statement-breakpoint
DROP TRIGGER capture_closed_settlement;
--> statement-breakpoint
CREATE TRIGGER capture_closed_settlement AFTER INSERT ON settlement_months
BEGIN
  INSERT INTO settlement_snapshots(month,report_id,data,legacy)
  SELECT NEW.month,r.id,json_object('id',r.id,'siteName',r.site_name,'authorName',r.author_name,'workDate',r.work_date,
    'units',r.units,'status',r.status,'contractPrice',r.contract_price,'workerPrice',r.worker_price,
    'billed',COALESCE(p.billed,0),'received',COALESCE(p.received,0),'paid',COALESCE(p.paid,0),
    'billingRef',COALESCE(p.billing_ref,''),'note',COALESCE(p.note,''),'vat',p.vat,
    'workerBreakdown',json(COALESCE(p.worker_breakdown,'[]')),'paymentVersion',COALESCE(p.payment_version,0),'internalWork',r.internal_work,'recordedInternalUnits',r.internal_units),0 FROM field_reports r LEFT JOIN settlement_payments p ON p.report_id = r.id WHERE substr(r.work_date,1,7) = NEW.month;
END;
--> statement-breakpoint
DROP TRIGGER qa_capture_closed_settlement;
--> statement-breakpoint
CREATE TRIGGER qa_capture_closed_settlement AFTER INSERT ON qa_settlement_months
BEGIN
  INSERT INTO qa_settlement_snapshots(month,report_id,data,legacy)
  SELECT NEW.month,r.id,json_object('id',r.id,'siteName',r.site_name,'authorName',r.author_name,'workDate',r.work_date,
    'units',r.units,'status',r.status,'contractPrice',r.contract_price,'workerPrice',r.worker_price,
    'billed',COALESCE(p.billed,0),'received',COALESCE(p.received,0),'paid',COALESCE(p.paid,0),
    'billingRef',COALESCE(p.billing_ref,''),'note',COALESCE(p.note,''),'vat',p.vat,
    'workerBreakdown',json(COALESCE(p.worker_breakdown,'[]')),'paymentVersion',COALESCE(p.payment_version,0),'internalWork',r.internal_work,'recordedInternalUnits',r.internal_units),0 FROM qa_field_reports r LEFT JOIN qa_settlement_payments p ON p.report_id = r.id WHERE substr(r.work_date,1,7) = NEW.month;
END;
