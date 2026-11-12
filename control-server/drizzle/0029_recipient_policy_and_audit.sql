ALTER TABLE site_reporting ADD COLUMN history_actor TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_reporting ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE control_settings ADD COLUMN history_actor TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE control_settings ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE report_mail ADD COLUMN recipient_policy_at TEXT;
--> statement-breakpoint
ALTER TABLE report_mail ADD COLUMN historical_consent_at TEXT;
--> statement-breakpoint
CREATE TABLE client_mail_recipients(site_id TEXT NOT NULL REFERENCES work_sites(id),email TEXT NOT NULL,enabled_at TEXT NOT NULL,PRIMARY KEY(site_id,email));
--> statement-breakpoint
INSERT INTO client_mail_recipients(site_id,email,enabled_at) SELECT s.site_id,c.value,'1970-01-01T00:00:00.000Z' FROM site_reporting s,json_each(CASE WHEN json_array_length(s.contractor_emails)>0 THEN s.contractor_emails ELSE json_array(s.contractor_email) END) c WHERE c.value<>'';
--> statement-breakpoint
CREATE TRIGGER client_recipient_insert AFTER INSERT ON site_reporting BEGIN
 INSERT INTO client_mail_recipients(site_id,email,enabled_at) SELECT NEW.site_id,j.value,COALESCE(NULLIF(NEW.updated_at,''),'1970-01-01T00:00:00.000Z') FROM json_each(CASE WHEN json_array_length(NEW.contractor_emails)>0 THEN NEW.contractor_emails ELSE json_array(NEW.contractor_email) END) j WHERE j.value<>'' AND NOT EXISTS(SELECT 1 FROM client_mail_recipients p WHERE p.site_id=NEW.site_id AND p.email=j.value);
 INSERT INTO operations_events(occurred_at,kind,site_id,actor,detail) VALUES(COALESCE(NULLIF(NEW.updated_at,''),strftime('%Y-%m-%dT%H:%M:%fZ','now')),'mail_settings',NEW.site_id,NEW.history_actor,'클라이언트 수신처 등록: '||NEW.contractor_email||' '||NEW.contractor_emails);
END;
--> statement-breakpoint
CREATE TRIGGER client_recipient_update AFTER UPDATE OF contractor_email,contractor_emails ON site_reporting BEGIN
 DELETE FROM client_mail_recipients WHERE site_id=NEW.site_id AND email NOT IN(SELECT value FROM json_each(CASE WHEN json_array_length(NEW.contractor_emails)>0 THEN NEW.contractor_emails ELSE json_array(NEW.contractor_email) END));
 INSERT INTO client_mail_recipients(site_id,email,enabled_at) SELECT NEW.site_id,j.value,COALESCE(NULLIF(NEW.updated_at,''),'1970-01-01T00:00:00.000Z') FROM json_each(CASE WHEN json_array_length(NEW.contractor_emails)>0 THEN NEW.contractor_emails ELSE json_array(NEW.contractor_email) END) j WHERE j.value<>'' AND NOT EXISTS(SELECT 1 FROM client_mail_recipients p WHERE p.site_id=NEW.site_id AND p.email=j.value);
 INSERT INTO operations_events(occurred_at,kind,site_id,actor,detail) SELECT COALESCE(NULLIF(NEW.updated_at,''),strftime('%Y-%m-%dT%H:%M:%fZ','now')),'mail_settings',NEW.site_id,NEW.history_actor,'클라이언트 수신처 변경 · 이전: '||OLD.contractor_email||' '||OLD.contractor_emails||' → 변경: '||NEW.contractor_email||' '||NEW.contractor_emails WHERE OLD.contractor_email<>NEW.contractor_email OR OLD.contractor_emails<>NEW.contractor_emails;
END;
--> statement-breakpoint
CREATE TRIGGER mail_settings_update AFTER UPDATE ON control_settings WHEN OLD.admin_email<>NEW.admin_email OR OLD.tax_email<>NEW.tax_email OR OLD.worker_mail_enabled<>NEW.worker_mail_enabled OR OLD.office_auto_enabled<>NEW.office_auto_enabled BEGIN
 INSERT INTO operations_events(occurred_at,kind,actor,detail) VALUES(NEW.updated_at,'mail_settings',NEW.history_actor,'전체 발송 설정 변경 · 관리자 '||OLD.admin_email||' → '||NEW.admin_email||' · 세무 '||OLD.tax_email||' → '||NEW.tax_email||' · 작업자 직접발송 '||OLD.worker_mail_enabled||' → '||NEW.worker_mail_enabled||' · 자동발송 '||OLD.office_auto_enabled||' → '||NEW.office_auto_enabled);
END;
--> statement-breakpoint
ALTER TABLE qa_site_reporting ADD COLUMN history_actor TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE qa_site_reporting ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE qa_control_settings ADD COLUMN history_actor TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE qa_control_settings ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE qa_report_mail ADD COLUMN recipient_policy_at TEXT;
--> statement-breakpoint
ALTER TABLE qa_report_mail ADD COLUMN historical_consent_at TEXT;
--> statement-breakpoint
CREATE TABLE qa_client_mail_recipients(site_id TEXT NOT NULL REFERENCES qa_work_sites(id),email TEXT NOT NULL,enabled_at TEXT NOT NULL,PRIMARY KEY(site_id,email));
--> statement-breakpoint
INSERT INTO qa_client_mail_recipients(site_id,email,enabled_at) SELECT s.site_id,c.value,'1970-01-01T00:00:00.000Z' FROM qa_site_reporting s,json_each(CASE WHEN json_array_length(s.contractor_emails)>0 THEN s.contractor_emails ELSE json_array(s.contractor_email) END) c WHERE c.value<>'';
--> statement-breakpoint
CREATE TRIGGER qa_client_recipient_insert AFTER INSERT ON qa_site_reporting BEGIN
 INSERT INTO qa_client_mail_recipients(site_id,email,enabled_at) SELECT NEW.site_id,j.value,COALESCE(NULLIF(NEW.updated_at,''),'1970-01-01T00:00:00.000Z') FROM json_each(CASE WHEN json_array_length(NEW.contractor_emails)>0 THEN NEW.contractor_emails ELSE json_array(NEW.contractor_email) END) j WHERE j.value<>'' AND NOT EXISTS(SELECT 1 FROM qa_client_mail_recipients p WHERE p.site_id=NEW.site_id AND p.email=j.value);
 INSERT INTO qa_operations_events(occurred_at,kind,site_id,actor,detail) VALUES(COALESCE(NULLIF(NEW.updated_at,''),strftime('%Y-%m-%dT%H:%M:%fZ','now')),'mail_settings',NEW.site_id,NEW.history_actor,'클라이언트 수신처 등록: '||NEW.contractor_email||' '||NEW.contractor_emails);
END;
--> statement-breakpoint
CREATE TRIGGER qa_client_recipient_update AFTER UPDATE OF contractor_email,contractor_emails ON qa_site_reporting BEGIN
 DELETE FROM qa_client_mail_recipients WHERE site_id=NEW.site_id AND email NOT IN(SELECT value FROM json_each(CASE WHEN json_array_length(NEW.contractor_emails)>0 THEN NEW.contractor_emails ELSE json_array(NEW.contractor_email) END));
 INSERT INTO qa_client_mail_recipients(site_id,email,enabled_at) SELECT NEW.site_id,j.value,COALESCE(NULLIF(NEW.updated_at,''),'1970-01-01T00:00:00.000Z') FROM json_each(CASE WHEN json_array_length(NEW.contractor_emails)>0 THEN NEW.contractor_emails ELSE json_array(NEW.contractor_email) END) j WHERE j.value<>'' AND NOT EXISTS(SELECT 1 FROM qa_client_mail_recipients p WHERE p.site_id=NEW.site_id AND p.email=j.value);
 INSERT INTO qa_operations_events(occurred_at,kind,site_id,actor,detail) SELECT COALESCE(NULLIF(NEW.updated_at,''),strftime('%Y-%m-%dT%H:%M:%fZ','now')),'mail_settings',NEW.site_id,NEW.history_actor,'클라이언트 수신처 변경 · 이전: '||OLD.contractor_email||' '||OLD.contractor_emails||' → 변경: '||NEW.contractor_email||' '||NEW.contractor_emails WHERE OLD.contractor_email<>NEW.contractor_email OR OLD.contractor_emails<>NEW.contractor_emails;
END;
--> statement-breakpoint
CREATE TRIGGER qa_mail_settings_update AFTER UPDATE ON qa_control_settings WHEN OLD.admin_email<>NEW.admin_email OR OLD.tax_email<>NEW.tax_email OR OLD.worker_mail_enabled<>NEW.worker_mail_enabled OR OLD.office_auto_enabled<>NEW.office_auto_enabled BEGIN
 INSERT INTO qa_operations_events(occurred_at,kind,actor,detail) VALUES(NEW.updated_at,'mail_settings',NEW.history_actor,'전체 발송 설정 변경 · 관리자 '||OLD.admin_email||' → '||NEW.admin_email||' · 세무 '||OLD.tax_email||' → '||NEW.tax_email||' · 작업자 직접발송 '||OLD.worker_mail_enabled||' → '||NEW.worker_mail_enabled||' · 자동발송 '||OLD.office_auto_enabled||' → '||NEW.office_auto_enabled);
END;

--> statement-breakpoint
CREATE TRIGGER mail_settings_insert AFTER INSERT ON control_settings BEGIN
 INSERT INTO operations_events(occurred_at,kind,actor,detail) VALUES(COALESCE(NULLIF(NEW.updated_at,''),strftime('%Y-%m-%dT%H:%M:%fZ','now')),'mail_settings',NEW.history_actor,'발송 설정 등록 · 관리자 '||NEW.admin_email||' · 세무 '||NEW.tax_email||' · 작업자 직접발송 '||NEW.worker_mail_enabled||' · 자동발송 '||NEW.office_auto_enabled);
END;

--> statement-breakpoint
CREATE TRIGGER qa_mail_settings_insert AFTER INSERT ON qa_control_settings BEGIN
 INSERT INTO qa_operations_events(occurred_at,kind,actor,detail) VALUES(COALESCE(NULLIF(NEW.updated_at,''),strftime('%Y-%m-%dT%H:%M:%fZ','now')),'mail_settings',NEW.history_actor,'발송 설정 등록 · 관리자 '||NEW.admin_email||' · 세무 '||NEW.tax_email||' · 작업자 직접발송 '||NEW.worker_mail_enabled||' · 자동발송 '||NEW.office_auto_enabled);
END;
