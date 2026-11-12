import assert from 'node:assert/strict';
import test from 'node:test';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

test('settlement editors reject stale inserts and updates without changing amounts or mail signals', async () => {
  const DB = await createPreviewDb();
  const origin = 'https://bonyeon.example';
  const owner = 'owner@bonyeon.example';
  const id = '00000000-0000-4000-8000-000000000001';
  const date = '2025-01-02';
  const stamp = date + 'T10:00:00.000Z';
  const env = { DB, BONYEON_OWNER_EMAIL: owner, BONYEON_SITE_ORIGIN: origin };
  await DB.prepare(`
    INSERT INTO work_sites(id, name, address, lat, lng, status, updated_at, due_date)
    VALUES ('version-site', '정산 검증 현장', '서울', 37, 127, 'pending', ?, ?)
  `).bind(stamp, date).run();
  await DB.prepare(`
    INSERT INTO field_reports(id, site_id, work_date, author_id, author_name, site_name, site_address,
      units, exterior, interior, notes, status, updated_at, approved_at, contract_price, worker_price)
    VALUES (?, 'version-site', ?, 'worker', '작업자', '정산 검증 현장', '서울',
      2, 2, 1, '', 'approved', ?, ?, 25000, 10000)
  `).bind(id, date, stamp, stamp).run();

  function request(path, method = 'GET', body) {
    const headers = { Origin: origin, 'oai-authenticated-user-id': 'owner', 'oai-authenticated-user-email': owner };
    if (body) headers['Content-Type'] = 'application/json';
    return handleApi(new Request(origin + '/api/work/settlement' + path, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
    }), env, handleControl, handleWorkflows);
  }
  async function ledger() {
    const response = await request('?month=2025-01');
    assert.equal(response.status, 200);
    const { rows } = await response.json();
    return rows[0];
  }
  const pay = (billed, paymentVersion) => request('/payments', 'PATCH', {
    id, billed, received: 10000, paid: 0, vat: 5000, paymentVersion,
  });
  const signal = () => DB.prepare('SELECT id FROM office_mail_signals WHERE kind = ? AND source_id = ?')
    .bind('tax', id).first();

  const initial = await ledger();
  assert.equal(initial.paymentVersion, 0);
  assert.equal((await pay(40000, 1)).status, 409);
  assert.equal(await signal(), null);

  const firstWrites = await Promise.all([pay(50000, 0), pay(51000, 0)]);
  assert.deepEqual(firstWrites.map(response => response.status).sort(), [200, 409]);
  const first = await ledger();
  assert.equal(first.paymentVersion, 1);
  assert.equal(first.billed, firstWrites[0].status === 200 ? 50000 : 51000);
  assert.match((await firstWrites.find(response => response.status === 409).json()).error, /정산 새로고침/);

  const updated = await Promise.all([pay(52000, 1), pay(53000, 1)]);
  assert.deepEqual(updated.map(response => response.status).sort(), [200, 409]);
  const second = await ledger();
  assert.equal(second.paymentVersion, 2);
  assert.equal(second.billed, updated[0].status === 200 ? 52000 : 53000);
  const signalBefore = await signal();
  assert.equal((await pay(54000, 1)).status, 409);
  assert.equal((await pay(54000, null)).status, 400);
  assert.equal((await ledger()).billed, second.billed);
  assert.deepEqual(await signal(), signalBefore);

  assert.equal((await pay(55000)).status, 400);
  assert.equal((await ledger()).paymentVersion, 2);
});
