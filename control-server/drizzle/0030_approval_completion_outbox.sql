-- Only future submitted -> approved transitions create mail. Existing approvals
-- are deliberately not backfilled. This insert is atomic with the approval.
CREATE TRIGGER completion_mail_on_approval
AFTER UPDATE OF status ON field_reports
WHEN OLD.status <> 'approved' AND NEW.status = 'approved'
  AND NEW.approved_at IS NOT NULL AND NEW.completion_reported_at IS NOT NULL
BEGIN
  INSERT INTO report_mail(id,kind,reference,recipient,sender,subject,body,html,created_at,requested_by)
  SELECT 'gmail:completion:' || NEW.id,'completion',NEW.id,
    COALESCE((SELECT admin_email FROM control_settings WHERE id=1),''),'',
    '[본연] 작업 완료 보고 · ' || NEW.site_name || ' · ' || NEW.work_date,
    'bonyeon:approval-pending:v1','',NEW.approved_at,'auto:approval'
  WHERE NOT EXISTS (
    SELECT 1 FROM report_mail m WHERE m.kind='completion' AND m.reference=NEW.id
      AND m.canceled_at IS NULL
      AND (m.sent_at IS NOT NULL OR m.provider_id LIKE 'gmail:%' OR m.requested_by IS NOT NULL)
  )
  ON CONFLICT(id) DO NOTHING;
END;
