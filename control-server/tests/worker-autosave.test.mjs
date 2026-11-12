import assert from 'node:assert/strict';
import test from 'node:test';
import { evidenceDrafts } from '../../public/control-app/evidence-drafts.js';
import { safeRecoveryStep, recoveryMatches } from '../../public/control-app/work-recovery.js';
import { workRecovery } from '../../public/control-app/work-recovery.js';

const fields = ['siteId','workDate','zoneId','assetCode','chargerType','canopy','exterior','interior','safety',
  'guide_access','guide_equipment','guide_condition','guide_power','guide_isolation','issue','exteriorResultNote',
  'interiorResultNote','surroundingsStatus','surroundingsNote','faultStatus','faultNote'];

function storage() {
  const data=new Map();
  return { data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key) };
}
function form() {
  const value=new EventTarget();
  value.elements=Object.fromEntries(fields.map(name=>[name,{value:'',checked:false,defaultChecked:name==='exterior',options:[{value:'unknown'}]}]));
  value.elements.siteId.value='site-a'; value.elements.workDate.value='2026-11-12'; value.elements.zoneId.value='zone-a';
  value.elements.exterior.checked=true;
  value.elements.surroundingsStatus.value=value.elements.faultStatus.value='unknown';
  value.dataset={}; const status={textContent:''}; value.querySelector=()=>status;
  return value;
}

test('typing automatically preserves device identity and notes across navigation, but not another account or assignment', () => {
  globalThis.location={pathname:'/verification/worker/'};
  globalThis.localStorage=storage();
  const first=form(); const abort=new AbortController();
  const draft=evidenceDrafts(first,'worker-a',{signal:abort.signal,getAssignmentDue:()=> '2026-11-10'});
  draft.restore(); const asset=first.elements.assetCode.value;
  first.elements.issue.value='현장 결과 입력 중'; first.dispatchEvent(new Event('input'));
  first.elements.faultNote.value='메뉴 이동 직전 입력'; abort.abort();
  const reopened=form(); evidenceDrafts(reopened,'worker-a',{getAssignmentDue:()=> '2026-11-10'}).restore();
  assert.equal(reopened.elements.assetCode.value,asset);
  assert.equal(reopened.elements.issue.value,'현장 결과 입력 중');
  assert.equal(reopened.elements.faultNote.value,'메뉴 이동 직전 입력');
  const other=form(); evidenceDrafts(other,'worker-b',{getAssignmentDue:()=> '2026-11-10'}).restore();
  assert.equal(other.elements.issue.value,'');
  const next=form(); evidenceDrafts(next,'worker-a',{getAssignmentDue:()=> '2026-11-12'}).restore();
  assert.equal(next.elements.issue.value,''); assert.notEqual(next.elements.assetCode.value,asset);
  globalThis.location={pathname:'/control-app/'};
  const production=form(); evidenceDrafts(production,'worker-a',{getAssignmentDue:()=> '2026-11-10'}).restore();
  assert.equal(production.elements.issue.value,'');
});

test('zone and device changes keep separate notes and successful save cannot resurrect a cleared draft', () => {
  globalThis.location={pathname:'/control-app/'}; globalThis.localStorage=storage();
  const value=form(); const signal=new AbortController();
  const draft=evidenceDrafts(value,'worker-a',{signal:signal.signal,getAssignmentDue:()=> '2026-11-10'});
  draft.restore(); const first=value.elements.assetCode.value;
  value.elements.issue.value='첫 기기'; value.dispatchEvent(new Event('input'));
  draft.useDevice('DEVICE-B','충전기 2');
  value.elements.issue.value='두 번째 기기'; value.dispatchEvent(new Event('input'));
  draft.useDevice(first,'충전기 1'); assert.equal(value.elements.issue.value,'첫 기기');
  value.elements.zoneId.value='zone-b'; draft.restore(); assert.equal(value.elements.issue.value,'');
  value.elements.issue.value='다른 구역'; value.dispatchEvent(new Event('change'));
  value.elements.zoneId.value='zone-a'; draft.restore(); assert.equal(value.elements.issue.value,'첫 기기');
  draft.reset(); signal.abort(); assert.notEqual(draft.resume()?.assetCode,first);
  const reopened=form(); const again=evidenceDrafts(reopened,'worker-a',{getAssignmentDue:()=> '2026-11-10'});
  again.restore(); assert.equal(reopened.elements.issue.value,''); assert.notEqual(reopened.elements.assetCode.value,first);
});

test('restoring a later stage always rechecks current guidance, safety and required photos', () => {
  assert.equal(safeRecoveryStep('results',{guidance:false,setup:true,before:true,after:true}),'site');
  assert.equal(safeRecoveryStep('results',{guidance:true,setup:false,before:true,after:true}),'setup');
  assert.equal(safeRecoveryStep('results',{guidance:true,setup:true,before:false,after:true}),'before');
  assert.equal(safeRecoveryStep('results',{guidance:true,setup:true,before:true,after:false}),'after');
  assert.equal(safeRecoveryStep('results',{guidance:true,setup:true,before:true,after:true}),'results');
  assert.equal(recoveryMatches({siteId:'a',workDate:'2026-11-12',assignmentDue:'2026-11-10'},{id:'a',nextDue:'2026-11-11'},'2026-11-12'),false);
  assert.equal(recoveryMatches({siteId:'a',workDate:'2026-11-12',assignmentDue:'2026-11-10'},{id:'a',nextDue:'2026-11-10'},'2026-11-12'),true);
  assert.equal(recoveryMatches({siteId:'a',workDate:'2026-11-31',assignmentDue:'2026-11-10'},{id:'a',nextDue:'2026-11-10'},'2026-12-12'),false);
});

test('legacy notes stay available within their assignment and require safety checks again', () => {
  globalThis.location={pathname:'/control-app/'};globalThis.localStorage=storage();
  const scope='bonyeon-proof:'+JSON.stringify(['/control-app/','worker-a'])+':';
  const legacy=scope+JSON.stringify(['site-a','2026-11-12','zone-a']);
  localStorage.setItem(legacy,JSON.stringify({assetCode:'OLD-DEVICE',values:{issue:'기존 임시자료',guide_access:true,safety:true}}));
  const current=form();const draft=evidenceDrafts(current,'worker-a',{getAssignmentDue:()=> '2026-11-10'});
  draft.restore();assert.equal(current.elements.issue.value,'기존 임시자료');
  assert.equal(current.elements.guide_access.checked,false);assert.equal(current.elements.safety.checked,false);
  draft.reset();assert.ok(localStorage.getItem(legacy),'legacy data is preserved');
  const next=form();evidenceDrafts(next,'worker-a',{getAssignmentDue:()=> '2026-11-10'}).restore();
  assert.equal(next.elements.issue.value,'');
});

test('unavailable storage reports failure and recovery state is not shared across accounts', () => {
  globalThis.location={pathname:'/control-app/'};const local=storage();globalThis.localStorage=local;
  const current=form();const errors=[];evidenceDrafts(current,'worker-a',{onError:e=>errors.push(e.message)}).restore();
  local.setItem=()=>{throw new Error('QuotaExceeded');};
  current.elements.issue.value='보관이 필요한 입력';current.dispatchEvent(new Event('input'));
  assert.match(errors[0],/화면을 유지/);
  globalThis.localStorage=storage();
  const a=workRecovery('account-a:');const b=workRecovery('account-b:');
  assert.equal(a.save({step:'before'}),true);assert.deepEqual(a.read(),{step:'before'});assert.equal(b.read(),null);
  a.clear();assert.equal(a.read(),null);
});
