-- Preserve historical test records while excluding them from every operating read.
CREATE TABLE production_test_sites(site_id TEXT PRIMARY KEY REFERENCES work_sites(id),reason TEXT NOT NULL,archived_at TEXT NOT NULL,archived_by TEXT NOT NULL);
--> statement-breakpoint
CREATE VIEW operational_work_sites AS SELECT t.* FROM work_sites t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=t.id);
--> statement-breakpoint
CREATE VIEW operational_work_plans AS SELECT t.* FROM work_plans t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=t.site_id);
--> statement-breakpoint
CREATE VIEW operational_work_plan_cycles AS SELECT t.* FROM work_plan_cycles t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=t.site_id);
--> statement-breakpoint
CREATE VIEW operational_site_reporting AS SELECT t.* FROM site_reporting t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=t.site_id);
--> statement-breakpoint
CREATE VIEW operational_client_mail_recipients AS SELECT t.* FROM client_mail_recipients t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=t.site_id);
--> statement-breakpoint
CREATE VIEW operational_field_reports AS SELECT t.* FROM field_reports t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=t.site_id);
--> statement-breakpoint
CREATE VIEW operational_charger_evidence AS SELECT t.* FROM charger_evidence t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=t.site_id);
--> statement-breakpoint
CREATE VIEW operational_work_zones AS SELECT t.* FROM work_zones t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=t.site_id);
--> statement-breakpoint
CREATE VIEW operational_work_camera_photos AS SELECT t.* FROM work_camera_photos t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=t.site_id);
--> statement-breakpoint
CREATE VIEW operational_work_progress AS SELECT t.* FROM work_progress t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=t.site_id);
--> statement-breakpoint
CREATE VIEW operational_work_report_drafts AS SELECT t.* FROM work_report_drafts t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=t.site_id);
--> statement-breakpoint
CREATE VIEW operational_work_guidance_receipts AS SELECT t.* FROM work_guidance_receipts t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=t.site_id);
--> statement-breakpoint
CREATE VIEW operational_settlement_payments AS SELECT t.* FROM settlement_payments t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=(SELECT r.site_id FROM field_reports r WHERE r.id=t.report_id));
--> statement-breakpoint
CREATE VIEW operational_settlement_snapshots AS SELECT t.* FROM settlement_snapshots t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=(SELECT r.site_id FROM field_reports r WHERE r.id=t.report_id));
--> statement-breakpoint
CREATE VIEW operational_operations_events AS SELECT t.* FROM operations_events t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=t.site_id);
--> statement-breakpoint
CREATE VIEW operational_office_mail_signals AS SELECT t.* FROM office_mail_signals t WHERE NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE (t.source='assignment' AND x.site_id=t.source_id) OR (t.source IN ('payout','amounts') AND x.site_id=(SELECT r.site_id FROM field_reports r WHERE r.id=t.source_id)));
--> statement-breakpoint
CREATE TRIGGER archived_test_work_sites_insert BEFORE INSERT ON work_sites WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_sites_update BEFORE UPDATE ON work_sites WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.id) OR EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_sites_delete BEFORE DELETE ON work_sites WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_plans_insert BEFORE INSERT ON work_plans WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_plans_update BEFORE UPDATE ON work_plans WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) OR EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_plans_delete BEFORE DELETE ON work_plans WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_site_reporting_insert BEFORE INSERT ON site_reporting WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_site_reporting_update BEFORE UPDATE ON site_reporting WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) OR EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_site_reporting_delete BEFORE DELETE ON site_reporting WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_client_mail_recipients_insert BEFORE INSERT ON client_mail_recipients WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_client_mail_recipients_update BEFORE UPDATE ON client_mail_recipients WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) OR EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_client_mail_recipients_delete BEFORE DELETE ON client_mail_recipients WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_field_reports_insert BEFORE INSERT ON field_reports WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_field_reports_update BEFORE UPDATE ON field_reports WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) OR EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_field_reports_delete BEFORE DELETE ON field_reports WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_charger_evidence_insert BEFORE INSERT ON charger_evidence WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_charger_evidence_update BEFORE UPDATE ON charger_evidence WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) OR EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_charger_evidence_delete BEFORE DELETE ON charger_evidence WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_zones_insert BEFORE INSERT ON work_zones WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_zones_update BEFORE UPDATE ON work_zones WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) OR EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_zones_delete BEFORE DELETE ON work_zones WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_camera_photos_insert BEFORE INSERT ON work_camera_photos WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_camera_photos_update BEFORE UPDATE ON work_camera_photos WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) OR EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_camera_photos_delete BEFORE DELETE ON work_camera_photos WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_progress_insert BEFORE INSERT ON work_progress WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_progress_update BEFORE UPDATE ON work_progress WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) OR EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_progress_delete BEFORE DELETE ON work_progress WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_report_drafts_insert BEFORE INSERT ON work_report_drafts WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_report_drafts_update BEFORE UPDATE ON work_report_drafts WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) OR EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_report_drafts_delete BEFORE DELETE ON work_report_drafts WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_guidance_receipts_insert BEFORE INSERT ON work_guidance_receipts WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_guidance_receipts_update BEFORE UPDATE ON work_guidance_receipts WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) OR EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=NEW.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_work_guidance_receipts_delete BEFORE DELETE ON work_guidance_receipts WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=OLD.site_id) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_settlement_payments_insert BEFORE INSERT ON settlement_payments WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=(SELECT site_id FROM field_reports WHERE id=NEW.report_id)) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_settlement_payments_update BEFORE UPDATE ON settlement_payments WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=(SELECT site_id FROM field_reports WHERE id=OLD.report_id)) OR EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=(SELECT site_id FROM field_reports WHERE id=NEW.report_id)) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER archived_test_settlement_payments_delete BEFORE DELETE ON settlement_payments WHEN EXISTS(SELECT 1 FROM production_test_sites WHERE site_id=(SELECT site_id FROM field_reports WHERE id=OLD.report_id)) BEGIN SELECT RAISE(ABORT,'ARCHIVED_TEST_READ_ONLY'); END;
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
    'workerBreakdown',json(COALESCE(p.worker_breakdown,'[]')),'paymentVersion',COALESCE(p.payment_version,0),'internalWork',r.internal_work,'recordedInternalUnits',r.internal_units),0 FROM field_reports r LEFT JOIN settlement_payments p ON p.report_id = r.id WHERE substr(r.work_date,1,7) = NEW.month AND NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=r.site_id);
END;

--> statement-breakpoint
CREATE TRIGGER archive_pending_mail AFTER INSERT ON production_test_sites
BEGIN
  UPDATE report_mail SET hold_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE sent_at IS NULL AND provider_id IS NULL AND canceled_at IS NULL AND hold_at IS NULL AND test_day IS NULL AND requested_by IS NOT NULL AND (
    (kind IN ('completion','contractor') AND reference IN (SELECT id FROM field_reports WHERE site_id=NEW.site_id))
    OR kind='daily'
    OR (kind IN ('settlement','tax') AND reference IN (SELECT substr(work_date,1,7) FROM field_reports WHERE site_id=NEW.site_id))
    OR (kind='worker' AND (reference IN (SELECT substr(p.start_date,1,7)||':'||p.worker_email FROM work_plans p WHERE p.site_id=NEW.site_id)
      OR reference IN (SELECT substr(r.work_date,1,7)||':'||m.email FROM field_reports r JOIN members m ON m.user_id=r.author_id WHERE r.site_id=NEW.site_id)
      OR reference IN (SELECT substr(r.work_date,1,7)||':'||json_extract(w.value,'$.email') FROM field_reports r JOIN settlement_payments p ON p.report_id=r.id, json_each(p.worker_breakdown) w WHERE r.site_id=NEW.site_id)))
  );
END;
