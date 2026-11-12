import assert from 'node:assert/strict';
import test from 'node:test';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleWorkflows } from '../server/workflows.mjs';

test('the map limits cleaner scope and keeps internal instructions and contacts private', async () => {
  const db = await createPreviewDb();
  const origin = 'https://bonyeon.example';
  const owner = 'owner@bonyeon.example';
  const cleaner = 'cleaner@bonyeon.example';
  const other = 'other@bonyeon.example';
  const editor = 'editor@bonyeon.example';
  const viewer = 'viewer@bonyeon.example';
  const env = { DB: db, BONYEON_OWNER_EMAIL: owner, BONYEON_SITE_ORIGIN: origin };
  const now = new Date();
  const kst = +now + 9 * 3600_000;
  const day = offset => new Date(kst + offset * 86_400_000).toISOString().slice(0, 10);
  const yesterday = day(-1);
  const today = day(0);
  const call = (path, email, method = 'GET', body) => handleApi(new Request(origin + '/api/' + path, {
    method,
    headers: {
      Origin: origin,
      ...(email ? { 'oai-authenticated-user-email': email, 'oai-authenticated-user-id': email } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }), env, handleControl, handleWorkflows);
  const ok = async (path, email, method, body, status = 200) => {
    const response = await call(path, email, method, body);
    const data = await response.json();
    assert.equal(response.status, status, JSON.stringify(data));
    return data;
  };

  for (const [email, name, role] of [[cleaner, '김 작업자', 'cleaner'], [other, '이 작업자', 'cleaner'],
    [editor, '편집자', 'editor'], [viewer, '조회자', 'viewer']]) {
    await ok('users', owner, 'POST', { email, name, role, active: true }, 201);
  }
  const createSite = (id, info = {}) => ({
    id, name: id, address: id + ' 주소', lat: 37, lng: 127, dueDate: today, status: 'pending', ...info,
  });
  await ok('sites/import', editor, 'POST', { rows: [
    createSite('assigned', { assignee: '김 작업자', assigneeContact: '담당자 연락처' }),
    createSite('unassigned', { assigneeContact: '이전 담당자 연락처', workNote: '공용 작업 안내' }),
    createSite('hidden', { address: '다른 작업자 현장 주소' }),
    createSite('reassigned'),
  ] });
  for (const [siteId, workerEmail, instructions] of [
    ['assigned', cleaner, '내 작업 안내'], ['hidden', other, '다른 현장 작업 안내'], ['reassigned', other, '새 담당자만 보는 안내'],
  ]) {
    await ok('work/plan', owner, 'PUT', { siteId, workerEmail, startDate: yesterday, repeatDays: 30, instructions });
  }
  await ok('work/delay', other, 'PATCH', { siteId: 'reassigned', dueDate: yesterday, reason: '새 담당자 지연 사유' });
  const insertReport = db.prepare(`
    INSERT INTO field_reports (id,site_id,work_date,author_id,author_name,site_name,site_address,units,exterior,interior,
                               notes,status,updated_at)
    VALUES (?,'reassigned',?,?,?,'reassigned','예시 주소',?,?,0,?,'submitted',?)
  `);
  await insertReport.bind('my-report', yesterday, cleaner, '김 작업자', 1, 1, '내 보고 메모', now.toISOString()).run();
  await insertReport.bind('other-report', today, other, '이 작업자', 5, 5, '새 담당자 보고 메모', now.toISOString()).run();
  const insertProof = db.prepare(`
    INSERT INTO charger_evidence (id,site_id,work_date,asset_code,author_id,author_name,exterior,interior,
                                  safety_checked,issue,created_at)
    VALUES (?,'reassigned',?,?,?,?,1,0,1,'',?)
  `);
  await insertProof.bind('my-photo', yesterday, 'my-asset', cleaner, '김 작업자', now.toISOString()).run();
  await insertProof.bind('other-photo', yesterday, 'other-asset', other, '이 작업자', now.toISOString()).run();

  const byId = ({ sites }) => Object.fromEntries(sites.map(site => [site.id, site]));
  const cleanerSites = byId(await ok('sites', cleaner));
  assert.deepEqual(Object.keys(cleanerSites).sort(), ['assigned', 'reassigned']);
  assert.equal(cleanerSites.assigned.workNote, '내 작업 안내');
  assert.equal((await call('control/detail?kind=site&id=unassigned', cleaner)).status, 404);
  assert.equal(cleanerSites.reassigned.status, 'pending');
  assert.equal(cleanerSites.reassigned.nextDue, '');
  assert.equal(cleanerSites.reassigned.repeatDays, null);
  assert.equal(cleanerSites.reassigned.workNote, '');
  assert.equal(cleanerSites.reassigned.delayReason, '');
  assert.equal(cleanerSites.reassigned.assignee, '김 작업자');
  assert.equal(cleanerSites.reassigned.reportWorker, '김 작업자');
  assert.equal(cleanerSites.reassigned.reportDate, yesterday);
  assert.equal(cleanerSites.reassigned.units, 1);
  assert.equal(cleanerSites.reassigned.evidenceCount, 1);
  assert.equal((await call('control/detail?kind=site&id=hidden', cleaner)).status, 404);
  assert.equal((await ok('control/detail?kind=site&id=reassigned', cleaner)).nextDue, null);

  const viewerSites = byId(await ok('sites', viewer));
  assert.equal(viewerSites.hidden.address, '다른 작업자 현장 주소');
  assert.equal(viewerSites.reassigned.delayReason, '새 담당자 지연 사유');
  assert.ok(Object.values(viewerSites).every(site => !site.assigneeContact && !site.workNote));
  const editorSites = byId(await ok('sites', editor));
  assert.equal(editorSites.assigned.assigneeContact, '담당자 연락처');
  assert.equal(editorSites.reassigned.workNote, '새 담당자만 보는 안내');
  assert.equal(editorSites.reassigned.reportWorker, '이 작업자');
  assert.equal(editorSites.reassigned.units, 5);
  assert.equal((await call('sites')).status, 401);
});
