ALTER TABLE work_camera_photos ADD COLUMN upload_id TEXT;
--> statement-breakpoint
ALTER TABLE work_camera_photos ADD COLUMN upload_hash TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX camera_upload_once ON work_camera_photos(author_id,upload_id) WHERE upload_id IS NOT NULL;
--> statement-breakpoint
ALTER TABLE work_sites ADD COLUMN history_actor TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE work_plans ADD COLUMN history_actor TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE field_reports ADD COLUMN history_actor TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE charger_evidence ADD COLUMN history_actor TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE settlement_payments ADD COLUMN history_actor TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE settlement_payments ADD COLUMN history_reason TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE field_reports ADD COLUMN revision_evidence_id TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE field_reports ADD COLUMN revision_photo_id TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE field_reports ADD COLUMN revision_target TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE TABLE operations_tasks (
  kind TEXT NOT NULL, reference TEXT NOT NULL, assignee TEXT NOT NULL DEFAULT '', due_date TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL, updated_by TEXT NOT NULL,
  PRIMARY KEY(kind, reference)
);
--> statement-breakpoint
CREATE TABLE operations_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, occurred_at TEXT NOT NULL, kind TEXT NOT NULL,
  site_id TEXT, report_id TEXT, reference TEXT NOT NULL DEFAULT '',
  worker TEXT NOT NULL DEFAULT '', actor TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE INDEX operations_events_time ON operations_events(occurred_at DESC,id DESC);
--> statement-breakpoint
CREATE INDEX operations_events_site ON operations_events(site_id,occurred_at DESC);
--> statement-breakpoint
CREATE TABLE settlement_snapshots (
  month TEXT NOT NULL, report_id TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)),
  legacy INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(month,report_id)
);
--> statement-breakpoint
CREATE TRIGGER history_site_add AFTER INSERT ON work_sites
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,worker,actor,detail)
  VALUES(NEW.updated_at,'site_import',NEW.id,COALESCE(NEW.assignee,''),NEW.history_actor,NEW.name || ' · 현장 등록');
END;
--> statement-breakpoint
CREATE TRIGGER history_site_update AFTER UPDATE ON work_sites
WHEN OLD.updated_at <> NEW.updated_at
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,worker,actor,detail)
  VALUES(NEW.updated_at,'site_import',NEW.id,COALESCE(NEW.assignee,''),NEW.history_actor,NEW.name || ' · 현장 갱신');
END;
--> statement-breakpoint
INSERT INTO operations_events(occurred_at,kind,site_id,worker,actor,detail)
SELECT updated_at,'site_import',id,COALESCE(assignee,''),'',name || ' · 기존 현장 기록' FROM work_sites;
--> statement-breakpoint
INSERT INTO operations_events(occurred_at,kind,site_id,reference,worker,detail)
SELECT p.created_at,'capture',p.site_id,p.id,COALESCE(m.name,''),p.asset_code || ' · ' ||
  CASE p.slot WHEN 'exteriorBefore' THEN '외함 작업 전' WHEN 'exteriorAfter' THEN '외함 작업 후'
    WHEN 'interiorBefore' THEN '내함 작업 전' ELSE '내함 작업 후' END
FROM work_camera_photos p LEFT JOIN members m ON m.user_id=p.author_id;
--> statement-breakpoint
CREATE TRIGGER history_plan_add AFTER INSERT ON work_plans
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'assignment', NEW.site_id, NULL, '', NEW.worker_email, NEW.history_actor,
    NEW.start_date || ' · ' || NEW.repeat_days || '일 주기';
END;
--> statement-breakpoint
CREATE TRIGGER history_plan_change AFTER UPDATE ON work_plans WHEN OLD.worker_email <> NEW.worker_email OR OLD.start_date <> NEW.start_date OR OLD.repeat_days <> NEW.repeat_days OR OLD.instructions <> NEW.instructions
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'assignment', NEW.site_id, NULL, '', NEW.worker_email, NEW.history_actor,
    NEW.start_date || ' · ' || NEW.repeat_days || '일 주기';
END;
--> statement-breakpoint
CREATE TRIGGER history_plan_remove AFTER DELETE ON work_plans
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'assignment_removed', OLD.site_id, NULL, '', OLD.worker_email, '', '정기 배정 해제';
END;
--> statement-breakpoint
CREATE TRIGGER history_delay AFTER UPDATE ON work_plans WHEN NEW.delay_date IS NOT NULL AND (OLD.delay_date IS NOT NEW.delay_date OR OLD.delay_reason <> NEW.delay_reason)
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'delay', NEW.site_id, NULL, '', NEW.worker_email, NEW.history_actor, NEW.delay_reason;
END;
--> statement-breakpoint
CREATE TRIGGER history_report_add AFTER INSERT ON field_reports
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, NEW.status, NEW.site_id, NEW.id, '', NEW.author_name, NEW.history_actor,
    CASE NEW.status WHEN 'revision' THEN NEW.revision_target || CASE WHEN NEW.revision_target <> '' THEN ' · ' ELSE '' END || NEW.review_note
      ELSE NEW.units || '기' END;
END;
--> statement-breakpoint
CREATE TRIGGER history_report_update AFTER UPDATE ON field_reports WHEN OLD.status <> NEW.status OR (NEW.status = 'submitted' AND OLD.updated_at <> NEW.updated_at)
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, NEW.status, NEW.site_id, NEW.id, '', NEW.author_name, NEW.history_actor,
    CASE NEW.status WHEN 'revision' THEN NEW.revision_target || CASE WHEN NEW.revision_target <> '' THEN ' · ' ELSE '' END || NEW.review_note
      ELSE NEW.units || '기' END;
END;
--> statement-breakpoint
CREATE TRIGGER history_rate AFTER UPDATE ON field_reports WHEN OLD.status = 'approved' AND (OLD.contract_price IS NOT NEW.contract_price OR OLD.worker_price IS NOT NEW.worker_price)
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'rates', NEW.site_id, NEW.id, '', NEW.author_name, NEW.history_actor, '단가 반영';
END;
--> statement-breakpoint
CREATE TRIGGER history_zone AFTER INSERT ON work_zones
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.created_at, 'zone', NEW.site_id, NULL, NEW.id, '', NEW.created_by, NEW.name;
END;
--> statement-breakpoint
CREATE TRIGGER history_camera_capture AFTER INSERT ON work_camera_photos
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.created_at, 'capture', NEW.site_id, NULL, NEW.id, COALESCE(m.name,''), '', NEW.asset_code || ' · ' ||
    CASE NEW.slot WHEN 'exteriorBefore' THEN '외함 작업 전' WHEN 'exteriorAfter' THEN '외함 작업 후'
      WHEN 'interiorBefore' THEN '내함 작업 전' ELSE '내함 작업 후' END
  FROM (SELECT 1) LEFT JOIN members m ON m.user_id=NEW.author_id;
END;
--> statement-breakpoint
CREATE TRIGGER history_evidence_add AFTER INSERT ON charger_evidence
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.created_at, 'evidence', NEW.site_id, NULL, NEW.id, NEW.author_name, NEW.author_name, NEW.asset_code;
END;
--> statement-breakpoint
CREATE TRIGGER history_evidence_change AFTER UPDATE ON charger_evidence WHEN OLD.result_detail <> NEW.result_detail OR OLD.charger_type <> NEW.charger_type OR OLD.canopy <> NEW.canopy
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'evidence_change', NEW.site_id, NULL, NEW.id, NEW.author_name, NEW.history_actor, NEW.asset_code;
END;
--> statement-breakpoint
CREATE TRIGGER history_evidence_remove AFTER DELETE ON charger_evidence
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'evidence_removed', OLD.site_id, NULL, OLD.id, OLD.author_name, '', OLD.asset_code;
END;
--> statement-breakpoint
CREATE TRIGGER history_issue AFTER UPDATE ON charger_evidence WHEN OLD.followup_status <> NEW.followup_status OR OLD.followup_owner <> NEW.followup_owner OR OLD.followup_note <> NEW.followup_note
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'issue', NEW.site_id, NULL, NEW.id, NEW.author_name, NEW.history_actor, NEW.asset_code || ' · ' || NEW.followup_status || ' · ' || NEW.followup_note;
END;
--> statement-breakpoint
CREATE TRIGGER history_payment_add AFTER INSERT ON settlement_payments
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'payment', r.site_id, NEW.report_id, '', r.author_name, NEW.history_actor,
    '청구 ' || NEW.billed || '원 · 입금 ' || NEW.received || '원 · 지급 ' || NEW.paid || '원' || CASE WHEN NEW.history_reason <> '' THEN ' · 변경 사유 ' || NEW.history_reason ELSE '' END FROM field_reports r WHERE r.id = NEW.report_id;
END;
--> statement-breakpoint
CREATE TRIGGER history_payment_update AFTER UPDATE ON settlement_payments
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'payment', r.site_id, NEW.report_id, '', r.author_name, NEW.history_actor,
    '청구 ' || OLD.billed || ' → ' || NEW.billed || '원 · 입금 ' || OLD.received || ' → ' || NEW.received ||
    '원 · 지급 ' || OLD.paid || ' → ' || NEW.paid || '원 · 부가세 ' || COALESCE(OLD.vat,'미입력') || ' → ' || COALESCE(NEW.vat,'미입력') ||
    CASE WHEN NEW.history_reason <> '' THEN ' · 변경 사유 ' || NEW.history_reason ELSE '' END FROM field_reports r WHERE r.id = NEW.report_id;
END;
--> statement-breakpoint
CREATE TRIGGER history_month AFTER INSERT ON settlement_months
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.closed_at, 'close', NULL, NULL, NEW.month, '', NEW.closed_by, NEW.month || ' 월 마감';
END;
--> statement-breakpoint
CREATE TRIGGER history_mail_add AFTER INSERT ON report_mail
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.created_at, 'mail_queued', NULL, NULL, NEW.id, '', COALESCE(NEW.requested_by,''), NEW.subject;
END;
--> statement-breakpoint
CREATE TRIGGER history_mail_update AFTER UPDATE ON report_mail WHEN (OLD.sent_at IS NULL AND NEW.sent_at IS NOT NULL) OR (OLD.hold_at IS NULL AND NEW.hold_at IS NOT NULL) OR (OLD.canceled_at IS NULL AND NEW.canceled_at IS NOT NULL)
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT COALESCE(NEW.sent_at,NEW.hold_at,NEW.canceled_at), CASE WHEN NEW.sent_at IS NOT NULL THEN 'mail_sent'
      WHEN NEW.canceled_at IS NOT NULL THEN 'mail_canceled' ELSE 'mail_held' END, NULL, NULL, NEW.id, '', '', NEW.subject;
END;
--> statement-breakpoint
CREATE TRIGGER history_task_insert AFTER INSERT ON operations_tasks
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'task', NULL, NULL, NEW.reference, NEW.assignee, NEW.updated_by,
    NEW.kind || ' · ' || NEW.due_date || ' · ' || NEW.note;
END;
--> statement-breakpoint
CREATE TRIGGER history_task_update AFTER UPDATE ON operations_tasks
BEGIN
  INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'task', NULL, NULL, NEW.reference, NEW.assignee, NEW.updated_by,
    NEW.kind || ' · ' || NEW.due_date || ' · ' || NEW.note;
END;
--> statement-breakpoint
CREATE TRIGGER capture_closed_settlement AFTER INSERT ON settlement_months
BEGIN
  INSERT INTO settlement_snapshots(month,report_id,data,legacy)
  SELECT NEW.month,r.id,json_object('id',r.id,'siteName',r.site_name,'authorName',r.author_name,'workDate',r.work_date,
    'units',r.units,'status',r.status,'contractPrice',r.contract_price,'workerPrice',r.worker_price,
    'billed',COALESCE(p.billed,0),'received',COALESCE(p.received,0),'paid',COALESCE(p.paid,0),
    'billingRef',COALESCE(p.billing_ref,''),'note',COALESCE(p.note,''),'vat',p.vat,
    'workerBreakdown',json(COALESCE(p.worker_breakdown,'[]')),'paymentVersion',COALESCE(p.payment_version,0)),0 FROM field_reports r LEFT JOIN settlement_payments p ON p.report_id = r.id WHERE substr(r.work_date,1,7) = NEW.month;
END;
--> statement-breakpoint
INSERT INTO settlement_snapshots(month,report_id,data,legacy)
SELECT c.month,r.id,json_object('id',r.id,'siteName',r.site_name,'authorName',r.author_name,'workDate',r.work_date,
    'units',r.units,'status',r.status,'contractPrice',r.contract_price,'workerPrice',r.worker_price,
    'billed',COALESCE(p.billed,0),'received',COALESCE(p.received,0),'paid',COALESCE(p.paid,0),
    'billingRef',COALESCE(p.billing_ref,''),'note',COALESCE(p.note,''),'vat',p.vat,
    'workerBreakdown',json(COALESCE(p.worker_breakdown,'[]')),'paymentVersion',COALESCE(p.payment_version,0)),1 FROM field_reports r LEFT JOIN settlement_payments p ON p.report_id = r.id JOIN settlement_months c ON c.month = substr(r.work_date,1,7);
--> statement-breakpoint
INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT p.updated_at,'assignment',p.site_id,NULL,'',p.worker_email,'',p.start_date || ' · ' || p.repeat_days || '일 주기' FROM work_plans p;
--> statement-breakpoint
INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT COALESCE(r.approved_at,r.updated_at),r.status,r.site_id,r.id,'',r.author_name,'',r.units || '기' FROM field_reports r;
--> statement-breakpoint
INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT r.completion_reported_at,'submitted',r.site_id,r.id,'',r.author_name,'',r.units || '기' FROM field_reports r WHERE r.completion_reported_at IS NOT NULL AND r.status <> 'submitted';
--> statement-breakpoint
INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT z.created_at,'zone',z.site_id,NULL,z.id,'',z.created_by,z.name FROM work_zones z;
--> statement-breakpoint
INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT e.created_at,'evidence',e.site_id,NULL,e.id,e.author_name,e.author_name,e.asset_code FROM charger_evidence e;
--> statement-breakpoint
INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT p.updated_at,'payment',r.site_id,r.id,'',r.author_name,'','청구 ' || p.billed || '원 · 입금 ' || p.received || '원 · 지급 ' || p.paid || '원' FROM settlement_payments p JOIN field_reports r ON r.id = p.report_id;
--> statement-breakpoint
INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT c.closed_at,'close',NULL,NULL,c.month,'',c.closed_by,c.month || ' 월 마감' FROM settlement_months c;
--> statement-breakpoint
INSERT INTO operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT COALESCE(m.sent_at,m.canceled_at,m.hold_at,m.created_at),CASE WHEN m.sent_at IS NOT NULL THEN 'mail_sent' WHEN m.canceled_at IS NOT NULL THEN 'mail_canceled' WHEN m.hold_at IS NOT NULL THEN 'mail_held' ELSE 'mail_queued' END,NULL,NULL,m.id,'','',m.subject FROM report_mail m;
--> statement-breakpoint
ALTER TABLE qa_work_camera_photos ADD COLUMN upload_id TEXT;
--> statement-breakpoint
ALTER TABLE qa_work_camera_photos ADD COLUMN upload_hash TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX qa_camera_upload_once ON qa_work_camera_photos(author_id,upload_id) WHERE upload_id IS NOT NULL;
--> statement-breakpoint
ALTER TABLE qa_work_sites ADD COLUMN history_actor TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE qa_work_plans ADD COLUMN history_actor TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE qa_field_reports ADD COLUMN history_actor TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE qa_charger_evidence ADD COLUMN history_actor TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE qa_settlement_payments ADD COLUMN history_actor TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE qa_settlement_payments ADD COLUMN history_reason TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE qa_field_reports ADD COLUMN revision_evidence_id TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE qa_field_reports ADD COLUMN revision_photo_id TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE qa_field_reports ADD COLUMN revision_target TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE TABLE qa_operations_tasks (
  kind TEXT NOT NULL, reference TEXT NOT NULL, assignee TEXT NOT NULL DEFAULT '', due_date TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL, updated_by TEXT NOT NULL,
  PRIMARY KEY(kind, reference)
);
--> statement-breakpoint
CREATE TABLE qa_operations_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, occurred_at TEXT NOT NULL, kind TEXT NOT NULL,
  site_id TEXT, report_id TEXT, reference TEXT NOT NULL DEFAULT '',
  worker TEXT NOT NULL DEFAULT '', actor TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE INDEX qa_operations_events_time ON qa_operations_events(occurred_at DESC,id DESC);
--> statement-breakpoint
CREATE INDEX qa_operations_events_site ON qa_operations_events(site_id,occurred_at DESC);
--> statement-breakpoint
CREATE TABLE qa_settlement_snapshots (
  month TEXT NOT NULL, report_id TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)),
  legacy INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(month,report_id)
);
--> statement-breakpoint
CREATE TRIGGER qa_history_site_add AFTER INSERT ON qa_work_sites
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,worker,actor,detail)
  VALUES(NEW.updated_at,'site_import',NEW.id,COALESCE(NEW.assignee,''),NEW.history_actor,NEW.name || ' · 현장 등록');
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_site_update AFTER UPDATE ON qa_work_sites
WHEN OLD.updated_at <> NEW.updated_at
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,worker,actor,detail)
  VALUES(NEW.updated_at,'site_import',NEW.id,COALESCE(NEW.assignee,''),NEW.history_actor,NEW.name || ' · 현장 갱신');
END;
--> statement-breakpoint
INSERT INTO qa_operations_events(occurred_at,kind,site_id,worker,actor,detail)
SELECT updated_at,'site_import',id,COALESCE(assignee,''),'',name || ' · 기존 현장 기록' FROM qa_work_sites;
--> statement-breakpoint
INSERT INTO qa_operations_events(occurred_at,kind,site_id,reference,worker,detail)
SELECT p.created_at,'capture',p.site_id,p.id,COALESCE(m.name,''),p.asset_code || ' · ' ||
  CASE p.slot WHEN 'exteriorBefore' THEN '외함 작업 전' WHEN 'exteriorAfter' THEN '외함 작업 후'
    WHEN 'interiorBefore' THEN '내함 작업 전' ELSE '내함 작업 후' END
FROM qa_work_camera_photos p LEFT JOIN qa_members m ON m.user_id=p.author_id;
--> statement-breakpoint
CREATE TRIGGER qa_history_plan_add AFTER INSERT ON qa_work_plans
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'assignment', NEW.site_id, NULL, '', NEW.worker_email, NEW.history_actor,
    NEW.start_date || ' · ' || NEW.repeat_days || '일 주기';
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_plan_change AFTER UPDATE ON qa_work_plans WHEN OLD.worker_email <> NEW.worker_email OR OLD.start_date <> NEW.start_date OR OLD.repeat_days <> NEW.repeat_days OR OLD.instructions <> NEW.instructions
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'assignment', NEW.site_id, NULL, '', NEW.worker_email, NEW.history_actor,
    NEW.start_date || ' · ' || NEW.repeat_days || '일 주기';
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_plan_remove AFTER DELETE ON qa_work_plans
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'assignment_removed', OLD.site_id, NULL, '', OLD.worker_email, '', '정기 배정 해제';
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_delay AFTER UPDATE ON qa_work_plans WHEN NEW.delay_date IS NOT NULL AND (OLD.delay_date IS NOT NEW.delay_date OR OLD.delay_reason <> NEW.delay_reason)
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'delay', NEW.site_id, NULL, '', NEW.worker_email, NEW.history_actor, NEW.delay_reason;
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_report_add AFTER INSERT ON qa_field_reports
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, NEW.status, NEW.site_id, NEW.id, '', NEW.author_name, NEW.history_actor,
    CASE NEW.status WHEN 'revision' THEN NEW.revision_target || CASE WHEN NEW.revision_target <> '' THEN ' · ' ELSE '' END || NEW.review_note
      ELSE NEW.units || '기' END;
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_report_update AFTER UPDATE ON qa_field_reports WHEN OLD.status <> NEW.status OR (NEW.status = 'submitted' AND OLD.updated_at <> NEW.updated_at)
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, NEW.status, NEW.site_id, NEW.id, '', NEW.author_name, NEW.history_actor,
    CASE NEW.status WHEN 'revision' THEN NEW.revision_target || CASE WHEN NEW.revision_target <> '' THEN ' · ' ELSE '' END || NEW.review_note
      ELSE NEW.units || '기' END;
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_rate AFTER UPDATE ON qa_field_reports WHEN OLD.status = 'approved' AND (OLD.contract_price IS NOT NEW.contract_price OR OLD.worker_price IS NOT NEW.worker_price)
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'rates', NEW.site_id, NEW.id, '', NEW.author_name, NEW.history_actor, '단가 반영';
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_zone AFTER INSERT ON qa_work_zones
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.created_at, 'zone', NEW.site_id, NULL, NEW.id, '', NEW.created_by, NEW.name;
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_camera_capture AFTER INSERT ON qa_work_camera_photos
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.created_at, 'capture', NEW.site_id, NULL, NEW.id, COALESCE(m.name,''), '', NEW.asset_code || ' · ' ||
    CASE NEW.slot WHEN 'exteriorBefore' THEN '외함 작업 전' WHEN 'exteriorAfter' THEN '외함 작업 후'
      WHEN 'interiorBefore' THEN '내함 작업 전' ELSE '내함 작업 후' END
  FROM (SELECT 1) LEFT JOIN qa_members m ON m.user_id=NEW.author_id;
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_evidence_add AFTER INSERT ON qa_charger_evidence
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.created_at, 'evidence', NEW.site_id, NULL, NEW.id, NEW.author_name, NEW.author_name, NEW.asset_code;
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_evidence_change AFTER UPDATE ON qa_charger_evidence WHEN OLD.result_detail <> NEW.result_detail OR OLD.charger_type <> NEW.charger_type OR OLD.canopy <> NEW.canopy
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'evidence_change', NEW.site_id, NULL, NEW.id, NEW.author_name, NEW.history_actor, NEW.asset_code;
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_evidence_remove AFTER DELETE ON qa_charger_evidence
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'evidence_removed', OLD.site_id, NULL, OLD.id, OLD.author_name, '', OLD.asset_code;
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_issue AFTER UPDATE ON qa_charger_evidence WHEN OLD.followup_status <> NEW.followup_status OR OLD.followup_owner <> NEW.followup_owner OR OLD.followup_note <> NEW.followup_note
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'issue', NEW.site_id, NULL, NEW.id, NEW.author_name, NEW.history_actor, NEW.asset_code || ' · ' || NEW.followup_status || ' · ' || NEW.followup_note;
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_payment_add AFTER INSERT ON qa_settlement_payments
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'payment', r.site_id, NEW.report_id, '', r.author_name, NEW.history_actor,
    '청구 ' || NEW.billed || '원 · 입금 ' || NEW.received || '원 · 지급 ' || NEW.paid || '원' || CASE WHEN NEW.history_reason <> '' THEN ' · 변경 사유 ' || NEW.history_reason ELSE '' END FROM qa_field_reports r WHERE r.id = NEW.report_id;
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_payment_update AFTER UPDATE ON qa_settlement_payments
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'payment', r.site_id, NEW.report_id, '', r.author_name, NEW.history_actor,
    '청구 ' || OLD.billed || ' → ' || NEW.billed || '원 · 입금 ' || OLD.received || ' → ' || NEW.received ||
    '원 · 지급 ' || OLD.paid || ' → ' || NEW.paid || '원 · 부가세 ' || COALESCE(OLD.vat,'미입력') || ' → ' || COALESCE(NEW.vat,'미입력') ||
    CASE WHEN NEW.history_reason <> '' THEN ' · 변경 사유 ' || NEW.history_reason ELSE '' END FROM qa_field_reports r WHERE r.id = NEW.report_id;
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_month AFTER INSERT ON qa_settlement_months
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.closed_at, 'close', NULL, NULL, NEW.month, '', NEW.closed_by, NEW.month || ' 월 마감';
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_mail_add AFTER INSERT ON qa_report_mail
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.created_at, 'mail_queued', NULL, NULL, NEW.id, '', COALESCE(NEW.requested_by,''), NEW.subject;
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_mail_update AFTER UPDATE ON qa_report_mail WHEN (OLD.sent_at IS NULL AND NEW.sent_at IS NOT NULL) OR (OLD.hold_at IS NULL AND NEW.hold_at IS NOT NULL) OR (OLD.canceled_at IS NULL AND NEW.canceled_at IS NOT NULL)
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT COALESCE(NEW.sent_at,NEW.hold_at,NEW.canceled_at), CASE WHEN NEW.sent_at IS NOT NULL THEN 'mail_sent'
      WHEN NEW.canceled_at IS NOT NULL THEN 'mail_canceled' ELSE 'mail_held' END, NULL, NULL, NEW.id, '', '', NEW.subject;
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_task_insert AFTER INSERT ON qa_operations_tasks
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'task', NULL, NULL, NEW.reference, NEW.assignee, NEW.updated_by,
    NEW.kind || ' · ' || NEW.due_date || ' · ' || NEW.note;
END;
--> statement-breakpoint
CREATE TRIGGER qa_history_task_update AFTER UPDATE ON qa_operations_tasks
BEGIN
  INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
  SELECT NEW.updated_at, 'task', NULL, NULL, NEW.reference, NEW.assignee, NEW.updated_by,
    NEW.kind || ' · ' || NEW.due_date || ' · ' || NEW.note;
END;
--> statement-breakpoint
CREATE TRIGGER qa_capture_closed_settlement AFTER INSERT ON qa_settlement_months
BEGIN
  INSERT INTO qa_settlement_snapshots(month,report_id,data,legacy)
  SELECT NEW.month,r.id,json_object('id',r.id,'siteName',r.site_name,'authorName',r.author_name,'workDate',r.work_date,
    'units',r.units,'status',r.status,'contractPrice',r.contract_price,'workerPrice',r.worker_price,
    'billed',COALESCE(p.billed,0),'received',COALESCE(p.received,0),'paid',COALESCE(p.paid,0),
    'billingRef',COALESCE(p.billing_ref,''),'note',COALESCE(p.note,''),'vat',p.vat,
    'workerBreakdown',json(COALESCE(p.worker_breakdown,'[]')),'paymentVersion',COALESCE(p.payment_version,0)),0 FROM qa_field_reports r LEFT JOIN qa_settlement_payments p ON p.report_id = r.id WHERE substr(r.work_date,1,7) = NEW.month;
END;
--> statement-breakpoint
INSERT INTO qa_settlement_snapshots(month,report_id,data,legacy)
SELECT c.month,r.id,json_object('id',r.id,'siteName',r.site_name,'authorName',r.author_name,'workDate',r.work_date,
    'units',r.units,'status',r.status,'contractPrice',r.contract_price,'workerPrice',r.worker_price,
    'billed',COALESCE(p.billed,0),'received',COALESCE(p.received,0),'paid',COALESCE(p.paid,0),
    'billingRef',COALESCE(p.billing_ref,''),'note',COALESCE(p.note,''),'vat',p.vat,
    'workerBreakdown',json(COALESCE(p.worker_breakdown,'[]')),'paymentVersion',COALESCE(p.payment_version,0)),1 FROM qa_field_reports r LEFT JOIN qa_settlement_payments p ON p.report_id = r.id JOIN qa_settlement_months c ON c.month = substr(r.work_date,1,7);
--> statement-breakpoint
INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT p.updated_at,'assignment',p.site_id,NULL,'',p.worker_email,'',p.start_date || ' · ' || p.repeat_days || '일 주기' FROM qa_work_plans p;
--> statement-breakpoint
INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT COALESCE(r.approved_at,r.updated_at),r.status,r.site_id,r.id,'',r.author_name,'',r.units || '기' FROM qa_field_reports r;
--> statement-breakpoint
INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT r.completion_reported_at,'submitted',r.site_id,r.id,'',r.author_name,'',r.units || '기' FROM qa_field_reports r WHERE r.completion_reported_at IS NOT NULL AND r.status <> 'submitted';
--> statement-breakpoint
INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT z.created_at,'zone',z.site_id,NULL,z.id,'',z.created_by,z.name FROM qa_work_zones z;
--> statement-breakpoint
INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT e.created_at,'evidence',e.site_id,NULL,e.id,e.author_name,e.author_name,e.asset_code FROM qa_charger_evidence e;
--> statement-breakpoint
INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT p.updated_at,'payment',r.site_id,r.id,'',r.author_name,'','청구 ' || p.billed || '원 · 입금 ' || p.received || '원 · 지급 ' || p.paid || '원' FROM qa_settlement_payments p JOIN qa_field_reports r ON r.id = p.report_id;
--> statement-breakpoint
INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT c.closed_at,'close',NULL,NULL,c.month,'',c.closed_by,c.month || ' 월 마감' FROM qa_settlement_months c;
--> statement-breakpoint
INSERT INTO qa_operations_events(occurred_at,kind,site_id,report_id,reference,worker,actor,detail)
SELECT COALESCE(m.sent_at,m.canceled_at,m.hold_at,m.created_at),CASE WHEN m.sent_at IS NOT NULL THEN 'mail_sent' WHEN m.canceled_at IS NOT NULL THEN 'mail_canceled' WHEN m.hold_at IS NOT NULL THEN 'mail_held' ELSE 'mail_queued' END,NULL,NULL,m.id,'','',m.subject FROM qa_report_mail m;
