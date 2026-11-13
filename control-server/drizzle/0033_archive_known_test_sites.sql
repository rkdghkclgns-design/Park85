-- Explicitly identified software verification sites; no source records are removed.
INSERT INTO production_test_sites(site_id,reason,archived_at,archived_by)
SELECT id,'운영 전 소프트웨어 검증 자료 · 실제 실적에서 제외',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'release:0033' FROM work_sites WHERE id IN ('live-persistent-offline-20261113','live-approval-mail-20261113','live-radios-off-20261113','live-phone-redo-20261113','BONYEON-TEST-01','BONYEON-TEST-02','BONYEON-TEST-03') AND (name LIKE '[운영 검증]%' OR name LIKE '테스트 · %') AND NOT EXISTS(SELECT 1 FROM production_test_sites x WHERE x.site_id=work_sites.id);
