import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

test('removing an assignment preserves the cleaner own history without exposing current site instructions', async () => {
  const DB = await createPreviewDb();
  const origin = 'https://map-access.example.invalid';
  const owner = 'owner@example.invalid';
  const worker = 'worker@example.invalid';
  const stamp = '2025-01-02T00:00:00.000Z';
  const env = { DB, BONYEON_OWNER_EMAIL: owner, BONYEON_SITE_ORIGIN: origin };
  await DB.prepare(`INSERT INTO members(email,user_id,name,role,active,updated_at)
    VALUES(?,'worker','Former cleaner','cleaner',1,?)`).bind(worker,stamp).run();
  await DB.prepare(`INSERT INTO work_sites(id,name,address,lat,lng,status,due_date,updated_at,work_note,assignee,delay_reason)
    VALUES('site','Historical site','Address',37,127,'pending','2025-01-01',?,
      'Prior site instructions','Former cleaner','')`).bind(stamp).run();
  await DB.prepare(`INSERT INTO work_plans(site_id,worker_email,start_date,repeat_days,instructions,updated_at)
    VALUES('site',?,'2025-01-01',30,'Assigned instructions',?)`).bind(worker,stamp).run();
  await DB.prepare(`INSERT INTO field_reports(id,site_id,work_date,author_id,author_name,site_name,site_address,
    units,exterior,interior,notes,status,updated_at,assignment_due)
    VALUES(?,'site','2025-01-02','worker','Former cleaner','Historical site','Address',
      1,1,0,'Own report','approved',?,'2025-01-01')`).bind(crypto.randomUUID(),stamp).run();
  const sites = async (email,id) => {
    const response = await handleApi(new Request(origin+'/api/sites',{headers:{Origin:origin,
      'oai-authenticated-user-id':id,'oai-authenticated-user-email':email}}),env,handleControl,handleWorkflows);
    assert.equal(response.status,200);
    return (await response.json()).sites;
  };
  assert.equal((await sites(worker,'worker'))[0].workNote,'Assigned instructions');
  await DB.prepare("DELETE FROM work_plans WHERE site_id='site'").bind().run();
  await DB.prepare(`UPDATE work_sites SET work_note='Current private access instructions',assignee='Current contact',
    delay_reason='Current private delay reason',due_date='2026-11-01',updated_at='2026-11-01T00:00:00.000Z'
    WHERE id='site'`).bind().run();
  const [history] = await sites(worker,'worker');
  assert.equal(history.reportWorker,'Former cleaner');
  assert.equal(history.reportDate,'2025-01-02');
  assert.equal(history.units,1);
  assert.equal(history.workNote,'');
  assert.equal(history.delayReason,'');
  assert.equal(history.assignee,'Former cleaner');
  assert.equal(history.nextDue,'');
  assert.equal(history.status,'done');
  assert.equal(history.dueDate,'');
  assert.equal(history.completedDate,'2025-01-02');
  const [managed] = await sites(owner,'owner');
  assert.equal(managed.workNote,'Current private access instructions');
  assert.equal(managed.delayReason,'Current private delay reason');
  assert.equal(managed.assignee,'Current contact');
  assert.equal(managed.nextDue,'2026-11-01');
});
