import { proofJpeg } from './fixtures/photo.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { handleApi } from '../server/api.mjs';
import { handleControl } from '../server/control.mjs';
import { createPreviewDb } from '../server/local-db.mjs';
import { handleWorkflows } from '../server/workflows.mjs';
import { completionProgress } from '../../public/control-app/report-completion.js';

const owner = 'owner@example.invalid';
const worker = 'worker@example.invalid';
const other = 'other@example.invalid';
const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);

test('completion follows the count of saved evidence instead of a previous selection', () => {
  assert.deepEqual(completionProgress(2,0),{ state:'empty',mode:'',remaining:2 });
  assert.deepEqual(completionProgress(2,1),{ state:'partial',mode:'partial',remaining:1 });
  assert.deepEqual(completionProgress(2,2,1),{ state:'full',mode:'full',remaining:0 });
  assert.deepEqual(completionProgress(2,3),{ state:'excess',mode:'',remaining:0 });
  assert.deepEqual(completionProgress(2,1,2),{ state:'missing',mode:'',remaining:1 });
  assert.deepEqual(completionProgress(null,1),{ state:'unplanned',mode:'full',remaining:null });
});

async function fixture({ loseCameraReply=false } = {}) {
  const origin = 'https://bonyeon.example';
  const storage = await createPreviewDb();
  const DB = { prepare(sql) {
    const statement = storage.prepare(sql);
    if (!loseCameraReply || !sql.includes('INSERT INTO work_camera_photos')) return statement;
    return { bind(...args) { return { async run() {
      const result = await statement.bind(...args).run();
      if (loseCameraReply && result.meta.changes) {
        loseCameraReply = false;
        throw new Error('Simulated lost D1 commit response');
      }
      return result;
    } }; } };
  } };
  const objects = new Map();
  const env = { DB, BONYEON_OWNER_EMAIL: owner, BONYEON_SITE_ORIGIN: origin,
    BUCKET: {
      async put(key, body) { objects.set(key, body); },
      async get(key) { return objects.has(key) ? { body: objects.get(key) } : null; },
      async delete(key) { objects.delete(key); },
    },
  };
  return async function call(path, { email = owner, method = 'GET', body, status = 200, fieldMode = false } = {}) {
    const form = body instanceof FormData;
    const response = await handleApi(new Request(origin + '/api/' + path, { method,
      headers: { Origin: origin, ...(email ? { 'oai-authenticated-user-id': email, 'oai-authenticated-user-email': email } : {}),
        ...(body && !form ? { 'Content-Type': 'application/json' } : {}),
        ...(fieldMode ? { 'X-Bonyeon-Work-Mode':'cleaner' } : {}) },
      body: form ? body : body ? JSON.stringify(body) : undefined,
    }), env, handleControl, handleWorkflows);
    assert.equal(response.status, status, path);
    return response.headers.get('Content-Type')?.includes('json') ? response.json() : response;
  };
}

const formData = fields => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
};

const safetyChecklist = { access:true,equipment:true,condition:true,power:true };
async function confirmGuidance(call,siteId,actor) {
  const { version,assignmentDue } = await call('work/guidance?'+new URLSearchParams({ siteId }),actor);
  return call('work/guidance',{ ...actor,method:'PUT',body:{ siteId,version,assignmentDue,confirmed:true } });
}

test('business signup keeps evidence private and approval enables real field assignment', async () => {
  const call = await fixture();
  const body = formData({ name: '가상 작업자', kind: 'business', businessName: '가상 사업자', invoiceEmail: 'Invoice@Example.Invalid' });
  const sample = new Blob(['%PDF-1.4\nsynthetic test document'], { type: 'application/pdf' });
  await call('signup', { email: null, status: 401 });
  await call('signup', { method: 'POST', email: worker, body, status: 400 });
  body.set('businessCertificate', sample, 'synthetic-registration.pdf');
  body.set('bankCopy', sample, 'synthetic-bank-copy.pdf');
  await call('signup', { method: 'POST', email: worker, body, status: 201 });
  await call('signup', { method: 'POST', email: worker, body, status: 409 });
  assert.equal((await call('signup', { email: worker })).application.status, 'pending');
  assert.equal((await call('signup', { email: other })).application, null);
  await call('signup/admin', { email: worker, status: 403 });
  const { applications: [application] } = await call('signup/admin');
  assert.equal(application.invoiceEmail, 'invoice@example.invalid');
  const document = 'signup/document?' + new URLSearchParams({ id: application.id, kind: 'bankCopy' });
  await call(document, { email: worker, status: 403 });
  const download = await call(document);
  assert.match(download.headers.get('Content-Disposition'), /^attachment;/);
  assert.equal(await download.text(), await sample.text());
  await call('signup/admin', { method: 'PATCH', body: { id: application.id, status: 'approved' } });
  await call('signup/admin', { method: 'PATCH', body: { id: application.id, status: 'approved' }, status: 409 });
  assert.equal((await call('session', { email: worker })).role, 'cleaner');
  assert.ok((await call('work/overview')).workers.some(member => member.email === worker));
});

test('partial visits survive reassignment and only external units accrue payable earnings', async () => {
  const call = await fixture();
  const prior = new Date(Date.now()+9*3_600_000-86_400_000).toISOString().slice(0,10);
  const month = today.slice(0,7);
  const siteId = 'mixed-visit';
  const write = (method,body,extra={}) => ({ method,body,...extra });
  const asOwnerWorker = { fieldMode:true };
  const asWorker = { email:worker };
  await call('users',write('POST',{ email:worker,name:'외부 작업자',role:'cleaner',active:true },{ status:201 }));
  await call('sites/import',write('POST',{ rows:[{ id:siteId,name:'배정 수량 현장',address:'검증 주소',lat:37,lng:127,
    dueDate:prior,status:'pending',plannedUnits:2 }] }));
  await call('control/site',write('PATCH',{ siteId,region:'서울특별시',contractorEmail:'' }));
  for (const [kind,price] of [['contract',40000],['worker',19000]]) {
    await call('charger-regions/price',write('PATCH',{ region:'서울특별시',kind,price,previousPrice:null }));
  }
  const assign = workerEmail => call('work/plan',write('PUT',{ siteId,workerEmail,startDate:prior,repeatDays:30,instructions:'' }));
  await assign(owner);
  assert.equal((await call('session',asOwnerWorker)).role,'cleaner');
  await call('control/analytics',{ ...asOwnerWorker,status:403 });
  const context = workDate => ({ siteId,workDate });
  const counts = (day,who) => call('work/completion-counts?'+new URLSearchParams(context(day)),who);
  const status = async () => (await call('sites')).sites.find(site=>site.id===siteId);
  const draft = { ...context(prior),units:null,exterior:null,interior:null,completionMode:'full',notes:'초안만 저장' };
  await call('control/report-draft',write('PUT',draft,asOwnerWorker));
  assert.equal((await counts(prior,asOwnerWorker)).draft.notes,'초안만 저장');
  assert.equal((await status()).status,'delayed');
  await call('control/report-draft',write('PUT',draft,{ ...asWorker,status:409 }));
  const image = new Blob([proofJpeg],{ type:'image/jpeg' });
  async function prove(day,who) {
    await confirmGuidance(call,siteId,who);
    const assetCode = 'AUTO-'+crypto.randomUUID();
    const fields = { ...context(day),assetCode };
    const captures = [];
    for (const slot of ['exteriorBefore','exteriorAfter']) {
      const result = await call('work/captures',write('POST',formData({ ...fields,slot,photo:image }),{ ...who,status:201 }));
      captures.push(result.id);
    }
    return call('work/evidence',write('POST',formData({ ...fields,exterior:'1',safety:'1',chargerType:'slow',
      canopy:'included',safetyChecklist:JSON.stringify(safetyChecklist),captureIds:JSON.stringify(captures) }),{ ...who,status:201 }));
  }
  const submit = (day,units,completionMode,who,expected=200) => call('control/report',write('POST',{
    ...context(day),units,exterior:units,...(completionMode==='full' ? { interior:null } : {}),completionMode },{ ...who,status:expected }));
  await submit(prior,1,'partial',asOwnerWorker,409);
  await prove(prior,asOwnerWorker);
  await submit(prior,1,'partial',asOwnerWorker);
  assert.equal((await status()).status,'in_progress');
  assert.equal((await status()).progressUnits,1);
  assert.equal((await counts(prior,asOwnerWorker)).draft,null);
  await assign(worker);
  assert.equal((await counts(today,asWorker)).previousUnits,1);
  assert.equal((await call('control/overview',asWorker)).earnings.expected,'38000');
  await submit(today,1,'full',asWorker,409);
  await prove(today,asWorker);
  assert.equal((await counts(today,asWorker)).units,2);
  await submit(today,2,'full',asWorker);
  const report = (await call('control/overview?month='+month)).reports[0];
  assert.equal(report.internalUnits,1);
  await call('control/review',write('PATCH',{ id:report.id,action:'approve' }));
  assert.equal((await status()).status,'done');
  const detail = await call('control/detail?'+new URLSearchParams({ kind:'report',id:report.id }));
  assert.equal(detail.devices.length,2);
  assert.deepEqual(detail.devices.map(device=>device.asset_code),['충전기 1','충전기 2']);
  assert.equal((await call('control/overview?month='+month,asWorker)).earnings.approved,'19000');
  assert.equal((await call('control/overview?month='+month,asOwnerWorker)).earnings.internalUnits,1);
  const payment = { id:report.id,paymentVersion:0,billed:88000,vat:8000,received:0,paid:19000,workers:[
    { email:owner,units:1,paid:0 },{ email:worker,units:1,paid:19000,paidDate:today }] };
  await call('work/settlement/payments',write('PATCH',{ ...payment,paid:20000,workers:[
    { ...payment.workers[0],paid:1000 },payment.workers[1]] },{ status:400 }));
  await call('work/settlement/payments',write('PATCH',{ ...payment,workers:[
    { email:worker,units:2,paid:19000,paidDate:today }] },{ status:409 }));
  await call('work/settlement/payments',write('PATCH',payment));
  const ledger = (await call('work/settlement?month='+month)).rows[0];
  assert.equal(ledger.internalUnits,1);
  assert.equal(ledger.paid,19000);
  assert.equal(ledger.workerBreakdown.find(item=>item.email===owner).internal,true);
  const preview = await call('control/mail?kind=settlement&reference='+month);
  assert.match(preview.html,/관리자 직접 작업/);
  assert.match(preview.text,/작업자 19,000원/);
});

test('renaming and moving assigned evidence keeps immediate photos even after a lost database response', async () => {
  const call = await fixture({ loseCameraReply:true });
  for (const email of [worker, other]) await call('users', { method: 'POST', body: { email, name: email, role: 'cleaner', active: true }, status: 201 });
  const rows = ['garage', 'annex'].map(id => ({ id, name: id, address: '검증 주소', lat: 37, lng: 127, dueDate: today, status: 'pending', plannedUnits:1 }));
  await call('sites/import', { method: 'POST', body: { rows } });
  for (const [siteId, workerEmail] of [['garage', worker], ['annex', other]]) {
    await call('work/plan', { method: 'PUT', body: { siteId, workerEmail, startDate: today, repeatDays: 30, instructions: '' } });
  }
  const zone = async (email, siteId, name, status = 200) => (await call('work/zones', { email, method: 'POST', body: { siteId, name }, status })).zone;
  const removeZone = (email,siteId,zoneId,status=200) => call('work/zones',{ email,method:'DELETE',body:{ siteId,zoneId },status });
  const renameZone = (email,siteId,zoneId,name,status=200) => call('work/zones',{ email,method:'PATCH',body:{ siteId,zoneId,name },status });
  const first = await zone(worker, 'garage', '지하 1층');
  const second = await zone(worker, 'garage', '지하 2층 B구역');
  assert.equal((await zone(worker, 'garage', '지하 2층 Ｂ구역')).id, second.id);
  const foreign = await zone(other, 'annex', '별관');
  const typo = await zone(worker,'garage','오입력');
  await removeZone(other,'garage',typo.id,404);
  await removeZone(worker,'garage',foreign.id,404);
  await removeZone(worker,'garage',typo.id);
  await renameZone(other,'garage',second.id,'타인 구역',404);
  await renameZone(worker,'garage',foreign.id,'다른 현장 구역',404);
  await renameZone(worker,'garage',typo.id,'삭제된 구역',404);
  await renameZone(worker,'garage',second.id,'오입력',409);
  await renameZone(worker,'garage',second.id,'지하 １층',409);
  await renameZone(worker,'garage',second.id,'　',400);
  await removeZone(worker,'garage',typo.id);
  assert.equal((await zone(worker,'garage','오입력')).id,typo.id);
  await removeZone(worker,'garage',typo.id);
  await zone(worker, 'annex', '타인 현장', 404);
  await call('work/zones?siteId=garage', { email: other, status: 404 });
  assert.deepEqual((await call('work/zones?siteId=garage', { email: worker })).zones.map(row => row.id), [first.id, second.id]);

  const jpeg = proofJpeg;
  const fields = { siteId: 'garage', workDate: today, assetCode: 'QA-01', zoneId: second.id };
  const image = new Blob([jpeg], { type: 'image/jpeg' });
  const take = (slot, status, zoneId = second.id, uploadId = crypto.randomUUID()) => call('work/captures', { email: worker, method: 'POST', status,
    body: formData({ ...fields, zoneId, slot, photo: image, uploadId }) });
  await take('exteriorAfter', 409);
  assert.match((await take('exteriorBefore',409,typo.id)).error,/구역을 다시 추가/);
  await take('exteriorBefore', 400, foreign.id);
  const uploadId = crypto.randomUUID();
  const before1 = await take('exteriorBefore', 201, second.id, uploadId);
  const renamed = await renameZone(worker,'garage',second.id,' 지하 2층 Ｃ구역 ');
  assert.deepEqual(renamed.zone,{ id:second.id,name:'지하 2층 C구역' });
  assert.deepEqual((await call('work/zones?siteId=garage',{ email:worker })).zones,[first,renamed.zone]);
  assert.match((await removeZone(worker,'garage',second.id,409)).error,/사진이나 작업 기록/);
  assert.equal((await take('exteriorBefore', 200, second.id, uploadId)).id, before1.id);
  await take('exteriorBefore', 409, first.id, uploadId);
  const before2 = await take('exteriorBefore', 201);
  await take('exteriorAfter', 409, first.id);
  const after = await take('exteriorAfter', 201);
  const drafts = 'work/captures?' + new URLSearchParams(fields);
  const selected = [before1.id, before2.id, after.id];
  assert.deepEqual(new Set((await call(drafts, { email: worker })).captures.map(row => row.id)), new Set(selected));
  const capturedImage = 'work/capture?id=' + before2.id;
  await call(capturedImage, { email: other, status: 404 });
  assert.deepEqual(new Uint8Array(await (await call(capturedImage, { email: worker })).arrayBuffer()), jpeg);

  const proof = formData({ ...fields, exterior: '1', safety: '1', chargerType: 'slow', canopy: 'included', exteriorBefore: image, exteriorAfter: image });
  await call('work/guidance?siteId=garage',{ email:other,status:404 });
  const unconfirmed = await call('work/guidance?siteId=garage',{ email:worker });
  assert.equal(unconfirmed.confirmedAt,null);
  await call('work/evidence',{ email:worker,method:'POST',body:proof,status:409 });
  const confirmed = await confirmGuidance(call,'garage',{ email:worker });
  assert.ok(confirmed.confirmedAt);
  await call('work/plan',{ method:'PUT',body:{ siteId:'garage',workerEmail:worker,startDate:today,repeatDays:30,instructions:'지하 경비실 방문' } });
  const changed = await call('work/guidance?siteId=garage',{ email:worker });
  assert.equal(changed.confirmedAt,null);
  assert.notEqual(changed.version,confirmed.version);
  await call('work/guidance',{ email:worker,method:'PUT',body:{ siteId:'garage',version:confirmed.version,
    assignmentDue:confirmed.assignmentDue,confirmed:true },status:409 });
  await confirmGuidance(call,'garage',{ email:worker });
  assert.match((await call('work/evidence',{ email:worker,method:'POST',body:proof,status:400 })).error,/기본 안전 점검/);
  proof.set('safetyChecklist',JSON.stringify(safetyChecklist));
  await call('work/evidence', { email: worker, method: 'POST', body: proof, status: 400 });
  proof.set('captureIds', JSON.stringify(selected));
  proof.set('zoneId', first.id);
  await call('work/evidence', { email: worker, method: 'POST', body: proof, status: 400 });
  proof.set('zoneId', second.id);
  const { id } = await call('work/evidence', { email: worker, method: 'POST', body: proof, status: 201 });
  await removeZone(worker,'garage',second.id,409);
  assert.deepEqual((await call(drafts, { email: worker })).captures, []);
  const saved = (await call('work/overview', { email: worker })).evidence.find(row => row.id === id);
  assert.equal(saved.zoneName,renamed.zone.name);
  assert.deepEqual(saved.safetyChecklist,safetyChecklist);
  assert.deepEqual(new Set(saved.photos.map(row => row.id)), new Set(selected));
  await call('work/captures', { email: worker, method: 'DELETE', body: { id: before2.id }, status: 409 });
  await call('control/report', { email: worker, method: 'POST', body: { siteId: 'garage', workDate: today, units: 1, exterior: 1, interior: 0 } });
  const { reports: [report] } = await call('control/overview');
  await call('control/review', { method: 'PATCH', body: { id: report.id, action: 'revise', evidenceId: id, photoId: before2.id, note: '외함 전 사진 각도 보완' } });
  const finalName = '지하 2층 C동';
  assert.deepEqual((await renameZone(worker,'garage',second.id,finalName)).zone,{ id:second.id,name:finalName });
  const detail = await call('control/detail?' + new URLSearchParams({ kind: 'report', id: report.id }), { email: worker });
  assert.equal(detail.devices[0].id,id);
  assert.equal(detail.devices[0].zoneName,finalName);
  assert.deepEqual(new Set(detail.devices[0].photos.map(photo=>photo.id)),new Set(selected));
  assert.deepEqual(new Uint8Array(await (await call(capturedImage,{ email:worker })).arrayBuffer()),jpeg);
  assert.deepEqual(detail.devices[0].safetyChecklist,safetyChecklist);
  assert.match(detail.reports[0].revisionTarget,/지하 2층 C구역.*QA-01.*외함 작업 전/);
  assert.equal(detail.reports[0].revisionEvidenceId,id);
  assert.equal(detail.reports[0].revisionPhotoId,before2.id);
  const { tasks } = await call('control/tasks');
  assert.ok(tasks.some(task => task.reference === report.id && task.kind === 'revision'));
  await call('control/tasks', { method: 'PATCH', body: { kind: 'revision', reference: report.id, assignee: worker, dueDate: today, note: '보완 요청 전달' } });
  assert.ok((await call('control/tasks')).tasks.some(task => task.reference === report.id && task.assignee === worker));
  await call('control/tasks', { email: worker, status: 403 });

  const move = (email,fromZoneId,zoneId,status=200) => call('work/evidence/zone',{
    email,method:'PATCH',body:{ id,fromZoneId,zoneId },status,
  });
  const reportDetail = actor => call('control/detail?' + new URLSearchParams({ kind:'report',id:report.id }),actor);
  assert.equal(detail.devices[0].canMoveZone,1);
  await move(other,second.id,first.id,404);
  await move(worker,second.id,foreign.id,400);
  await move(worker,second.id,typo.id,400);
  await move(worker,null,first.id,409);
  const moveResult = { zoneId:first.id,zoneName:first.name };
  assert.deepEqual(await move(worker,second.id,first.id),moveResult);
  assert.deepEqual(await move(worker,second.id,first.id),moveResult);
  assert.equal((await take('exteriorBefore',200,second.id,uploadId)).id,before1.id);
  await removeZone(worker,'garage',second.id);
  assert.equal((await take('exteriorBefore',200,second.id,uploadId)).id,before1.id);
  const moved = (await reportDetail({ email:worker })).devices[0];
  assert.equal(moved.id,id);
  assert.equal(moved.zoneId,first.id);
  assert.equal(moved.zoneName,first.name);
  assert.deepEqual(moved.photos,detail.devices[0].photos);
  assert.deepEqual(moved.safetyChecklist,safetyChecklist);
  assert.deepEqual(moved.workResults,detail.devices[0].workResults);
  for (const photoId of selected) {
    const photo = await call('work/capture?id='+photoId,{ email:worker });
    assert.deepEqual(new Uint8Array(await photo.arrayBuffer()),jpeg);
  }

  await call('control/report',{ email:worker,method:'POST',body:{ siteId:'garage',workDate:today,units:1,exterior:1 } });
  await call('control/review',{ method:'PATCH',body:{ id:report.id,action:'approve' } });
  assert.equal((await reportDetail({ email:worker })).devices[0].canMoveZone,0);
  assert.equal((await zone(worker,'garage',finalName)).id,second.id);
  await move(worker,first.id,second.id,403);
  assert.deepEqual(await move(owner,first.id,second.id),{ zoneId:second.id,zoneName:finalName });
  assert.equal((await reportDetail({ email:worker })).devices[0].zoneName,finalName);
  const { events }=await call('control/analytics?kind=evidence_zone_move');
  assert.equal(events.length,2);
  assert.deepEqual(events.map(event=>event.reference),[id,id]);
  assert.deepEqual(events.map(event=>event.detail),[
    'QA-01 · 지하 1층 → 지하 2층 C동',
    'QA-01 · 지하 2층 C동 → 지하 1층',
  ]);
});

test('bulk evidence moves are atomic, scoped to one site and safe to retry', async () => {
  const call = await fixture();
  const asWorker = { email:worker };
  const write = (method,body,actor={})=>({ ...actor,method,body });
  await call('users',write('POST',{ email:worker,name:'검증 작업자',role:'cleaner',active:true },{ status:201 }));
  const rows = ['bulk-garage','bulk-annex'].map(id=>({ id,name:id,address:'검증 주소',lat:37,lng:127,dueDate:today,status:'pending',plannedUnits:4 }));
  await call('sites/import',write('POST',{ rows }));
  for (const { id:siteId } of rows) {
    await call('work/plan',write('PUT',{ siteId,workerEmail:worker,startDate:today,repeatDays:30,instructions:'' }));
    await confirmGuidance(call,siteId,asWorker);
  }
  const makeZone=async (siteId,name)=>(await call('work/zones',write('POST',{ siteId,name },asWorker))).zone;
  const wrong=await makeZone(rows[0].id,'오등록 구역');
  const correct=await makeZone(rows[0].id,'올바른 구역');
  const foreign=await makeZone(rows[1].id,'별관 구역');
  const bytes=proofJpeg;
  const image=new Blob([bytes],{ type:'image/jpeg' });
  async function save(siteId,zoneId,assetCode) {
    const scope={ siteId,zoneId,workDate:today,assetCode };
    const photos=[];
    for (const slot of ['exteriorBefore','exteriorAfter']) {
      const captured=await call('work/captures',write('POST',formData({ ...scope,slot,photo:image }),{ ...asWorker,status:201 }));
      photos.push(captured.id);
    }
    const saved=await call('work/evidence',write('POST',formData({ ...scope,exterior:'1',safety:'1',
      safetyChecklist:JSON.stringify(safetyChecklist),captureIds:JSON.stringify(photos),exteriorResultNote:assetCode }),{ ...asWorker,status:201 }));
    return { id:saved.id,fromZoneId:zoneId,photos };
  }
  const first=await save(rows[0].id,wrong.id,'MOVE-A');
  const second=await save(rows[0].id,wrong.id,'MOVE-B');
  const kept=await save(rows[0].id,wrong.id,'MOVE-C');
  const otherSite=await save(rows[1].id,foreign.id,'MOVE-OTHER-SITE');
  const move=(records,status=200)=>call('work/evidence/zones',write('PATCH',{ zoneId:correct.id,
    moves:records.map(({ id,fromZoneId })=>({ id,fromZoneId })) },{ ...asWorker,status }));
  const read=async () => new Map((await call('work/overview',asWorker)).evidence.map(row=>[row.id,row]));
  const before=await read();
  await move([first,otherSite],400);
  await move([first,first],400);
  await move([first,{ ...second,fromZoneId:null }],409);
  assert.deepEqual(await read(),before);
  assert.deepEqual((await call('control/analytics?kind=evidence_zone_move')).events,[]);

  const expected={ zoneId:correct.id,zoneName:correct.name,count:2 };
  assert.deepEqual(await move([first,second]),expected);
  assert.deepEqual(await move([first,second]),expected);
  const after=await read();
  for (const record of [first,second]) {
    assert.deepEqual(after.get(record.id),{ ...before.get(record.id),zoneId:correct.id,zoneName:correct.name });
    for (const id of record.photos) {
      const photo=await call('work/capture?id='+id,asWorker);
      assert.deepEqual(new Uint8Array(await photo.arrayBuffer()),bytes);
    }
  }
  for (const record of [kept,otherSite]) assert.deepEqual(after.get(record.id),before.get(record.id));
  const { events }=await call('control/analytics?kind=evidence_zone_move');
  assert.equal(events.length,2);
  assert.deepEqual(new Set(events.map(event=>event.reference)),new Set([first.id,second.id]));
});
