import assert from 'node:assert/strict';
import test from 'node:test';
import { evidenceDrafts } from '../../public/control-app/evidence-drafts.js';
import { mountFieldGuide } from '../../public/control-app/field-guide.js';

const today='2026-11-13',due='2026-11-10';
const fields=['siteId','workDate','zoneId','assetCode','chargerType','canopy','exterior','interior','safety',
  'guide_access','guide_equipment','guide_condition','guide_power','guide_isolation','issue','exteriorResultNote',
  'interiorResultNote','surroundingsStatus','surroundingsNote','faultStatus','faultNote'];
function storage() {
  const data=new Map();
  return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
}
function node() {
  const children=new Map();
  return {hidden:false,dataset:{},innerHTML:'',textContent:'',focus(){},scrollIntoView(){},
    querySelector(selector){if(!children.has(selector))children.set(selector,node());return children.get(selector);},
    querySelectorAll(){return [];},insertAdjacentHTML(){}};
}
function harness({local=storage(),server={instructions:'기존 현장 안내',version:'v1',confirmed:true},photos=new Map()}={}) {
  globalThis.location={pathname:'/control-app/'};globalThis.localStorage=local;globalThis.window=new EventTarget();
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
  const signal=new AbortController();
  const root=node(),listeners=new Map(),form=Object.assign(new EventTarget(),node()),requests=[],resets=[];
  let assignmentDue=due;
  root.addEventListener=(type,handler)=>listeners.set(type,handler);
  form.elements=Object.fromEntries(fields.map(name=>[name,{value:'',checked:false,defaultChecked:name==='exterior',options:[{value:'unknown'}]}]));
  form.elements.workDate.value=today;form.elements.exterior.checked=true;
  form.elements.zoneId.selectedOptions=[{textContent:'A구역'}];
  const draft=evidenceDrafts(form,'worker-a',{signal:signal.signal,getAssignmentDue:()=>assignmentDue});
  const context=()=>JSON.stringify(['siteId','workDate','assetCode','zoneId'].map(name=>form.elements[name].value));
  const workflow={form,draft,checkSetup:()=>form.elements.guide_access.checked,setupValid:()=>form.elements.guide_access.checked,
    camera:{missingSlot:phase=>photos.get(context())?.includes(phase)?null:'exterior'+phase},
    async setEvidenceSite(id,date){
      draft.flush();form.elements.siteId.value=id;form.elements.workDate.value=date;form.elements.zoneId.value='';draft.restore();
      await server.beforeSetupFinish?.();
    },
    async restoreDraft(saved){
      await this.setEvidenceSite(saved.siteId,saved.workDate);form.elements.zoneId.value=saved.zoneId;draft.restore();
      if(form.elements.assetCode.value!==saved.assetCode)draft.useDevice(saved.assetCode,saved.assetLabel);
      return true;
    },
    resetSafety(){resets.push(draft.snapshot());form.elements.guide_access.checked=false;draft.save({automatic:true});},
    recheckAssignment(){draft.restore();},
  };
  const guide=mountFieldGuide(root,{today,signal:signal.signal,workflow,notify(){},prefillCompletion:async()=>({units:1}),
    api:async(path,options={})=>{
      requests.push({path,...options});
      if(server.fail){throw Object.assign(Error('연결 실패'),{status:503});}
      if(options.method==='PUT') {
        if(options.body.version!==server.version || options.body.assignmentDue!==(server.assignmentDue || due)) {
          throw Object.assign(Error('안내가 변경되었습니다'),{status:409});
        }
        server.confirmed=true;
      }
      const response={instructions:server.instructions,version:server.version,assignmentDue:server.assignmentDue || due,
        confirmedAt:server.confirmed?'2026-11-13T00:00:00Z':null};
      if(options.method==='PUT')await server.afterConfirm?.();
      else if(server.afterGuidance)await server.afterGuidance();
      return response;
    },
  });
  const setModel=(overrides={})=>{
    assignmentDue=overrides.nextDue || assignmentDue;
    guide.setModel({sites:[{id:'site',name:'현장',nextDue:assignmentDue,plannedUnits:2,instructions:server.instructions,...overrides}],evidence:[]});
  };
  setModel();
  async function action(id) {
    const button={dataset:{guideAction:id},disabled:false,closest(){return this;}};
    await listeners.get('click')({target:button});
  }
  function edit(name,value) {
    form.elements[name].value=value;form.dispatchEvent(new Event('input'));listeners.get('input')({target:form.elements[name]});
  }
  function prepareProof() {
    form.elements.zoneId.value='zone-a';draft.restore();form.elements.guide_access.checked=true;
    edit('chargerType','slow');edit('issue','보존할 작업 메모');photos.set(context(),['Before','After']);
  }
  return {guide,form,draft,workflow,local,server,photos,resets,requests,action,edit,prepareProof,setModel,
    flow:()=>JSON.parse(local.getItem(draft.scope+'flow')),step:()=>root.querySelector('.guide-header').querySelector('[data-guide-title]').textContent,
    confirm:()=>{root.querySelector('[data-guide-site]').querySelector('[data-guide-confirm]').checked=true;},close:()=>signal.abort()};
}

test('changed work date restores the same charger, zone, notes and photo stage after a restart',async()=>{
  const first=harness();await first.guide.selectSite('site');await first.action('continue');
  first.edit('workDate','2026-11-12');first.prepareProof();await first.action('to-before');await first.action('to-after');
  const saved=first.draft.snapshot();
  assert.equal(first.flow().workDate,'2026-11-12');assert.equal(first.flow().proof.assetCode,saved.assetCode);
  first.close();
  const next=harness({local:first.local,server:first.server,photos:first.photos});await next.guide.restore();
  assert.equal(next.form.elements.workDate.value,'2026-11-12');assert.equal(next.form.elements.zoneId.value,'zone-a');
  assert.equal(next.form.elements.assetCode.value,saved.assetCode);assert.equal(next.form.elements.issue.value,'보존할 작업 메모');
  assert.equal(next.step(),'작업 후 촬영');assert.deepEqual([...next.photos],[...first.photos]);
  next.close();
});

for (const retry of ['retry-site','restart']) test('an initial recovery guidance failure preserves the original flow until '+retry+' succeeds',async()=>{
  const first=harness();await first.guide.selectSite('site');await first.action('continue');
  first.edit('workDate','2026-11-12');first.prepareProof();await first.action('to-before');await first.action('to-after');
  const saved=first.flow(),photos=[...first.photos];first.close();first.server.fail=true;
  let next=harness({local:first.local,server:first.server,photos:first.photos});await next.guide.restore();
  assert.deepEqual(next.flow(),saved,'a failed initial guidance request must not replace the saved step or device');
  if (retry==='restart') {
    next.close();first.server.fail=false;
    next=harness({local:first.local,server:first.server,photos:first.photos});await next.guide.restore();
  } else {
    first.server.fail=false;await next.action('retry-site');await next.action('continue');
  }
  assert.equal(next.step(),'작업 후 촬영');assert.equal(next.form.elements.workDate.value,saved.workDate);
  assert.equal(next.form.elements.assetCode.value,saved.proof.assetCode);assert.equal(next.form.elements.zoneId.value,saved.proof.zoneId);
  assert.equal(next.form.elements.issue.value,'보존할 작업 메모');assert.deepEqual([...next.photos],photos);next.close();
});

test('a guidance confirmation conflict keeps the recovered device until the latest version is confirmed',async()=>{
  const first=harness();await first.guide.selectSite('site');await first.action('continue');
  first.prepareProof();await first.action('to-before');await first.action('to-after');
  const saved=first.flow(),photos=[...first.photos];first.close();
  first.server.version='v2';first.server.instructions='변경 안내';first.server.confirmed=false;
  const next=harness({local:first.local,server:first.server,photos:first.photos});await next.guide.restore();next.confirm();
  next.server.version='v3';next.server.instructions='최종 안전 안내';
  await next.action('continue');assert.deepEqual(next.flow(),saved,'a 409 refresh must preserve the original recovery');
  next.confirm();await next.action('continue');
  assert.equal(next.step(),'충전기 안전 점검');assert.equal(next.form.elements.guide_access.checked,false);
  assert.equal(next.form.elements.assetCode.value,saved.proof.assetCode);assert.equal(next.form.elements.zoneId.value,saved.proof.zoneId);
  assert.equal(next.form.elements.issue.value,'보존할 작업 메모');assert.deepEqual([...next.photos],photos);next.close();
});

for(const changed of ['assignment','instructions'])test('a delayed confirmation cannot reopen work after '+changed+' changes',async()=>{
  const h=harness({server:{instructions:'처음 안내',version:'v1',confirmed:false}});await h.guide.selectSite('site');h.confirm();
  let release;h.server.afterConfirm=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.action('continue');assert.equal(h.requests.at(-1).method,'PUT');
  h.server.instructions='최신 안전 안내';h.server.version='v2';h.server.confirmed=false;
  if(changed==='assignment'){h.server.assignmentDue='2026-11-11';h.setModel({nextDue:h.server.assignmentDue});}
  else {h.setModel();await Promise.resolve();}
  const expected=changed==='assignment'?'내 현장 보고':'현장 정보와 청소 안내';
  assert.equal(h.step(),expected);delete h.server.afterConfirm;release();await pending;
  assert.equal(h.step(),expected,'the obsolete PUT reply must not restore the previous confirmation or stage');
  if(changed==='assignment')await h.guide.selectSite('site');
  h.confirm();await h.action('continue');assert.equal(h.requests.at(-1).body.version,'v2');
  assert.equal(h.requests.at(-1).body.assignmentDue,h.server.assignmentDue || due);assert.equal(h.step(),'충전기 안전 점검');h.close();
});

test('a delayed inspection setup cannot reopen work after an assignment change',async()=>{
  const h=harness();await h.guide.selectSite('site');let release;
  h.server.beforeSetupFinish=()=>new Promise(resolve=>{release=resolve;});const pending=h.action('continue');
  h.server.assignmentDue='2026-11-11';h.server.instructions='새 배정 안내';h.server.version='v2';h.server.confirmed=false;
  h.setModel({nextDue:h.server.assignmentDue});assert.equal(h.step(),'내 현장 보고');
  delete h.server.beforeSetupFinish;release();await pending;
  assert.equal(h.step(),'내 현장 보고','the obsolete zone lookup must not reopen the setup stage');h.close();
});

test('an instruction change during the initial guidance request invalidates its old confirmed reply',async()=>{
  const h=harness();let release,count=0;const gate=new Promise(resolve=>{release=resolve;});
  h.server.afterGuidance=()=>++count===1?gate:undefined;
  const pending=h.guide.selectSite('site');h.server.instructions='최신 안전 안내';h.server.version='v2';h.server.confirmed=false;
  h.setModel();release();await pending;await Promise.resolve();
  assert.equal(h.requests.length,2,'changing instructions while GET is pending must reload current guidance');
  h.confirm();await h.action('continue');
  assert.equal(h.requests.at(-1).method,'PUT');assert.equal(h.requests.at(-1).body.version,'v2');
  assert.equal(h.step(),'충전기 안전 점검');h.close();
});

test('a temporarily invalid date does not replace the last recoverable photo context',async()=>{
  const h=harness();await h.guide.selectSite('site');await h.action('continue');h.prepareProof();await h.action('to-before');
  const previous=h.flow();h.edit('workDate','');
  assert.deepEqual(h.flow(),previous);h.close();
});

test('an earlier broken flow without proof can recover its preserved same-assignment device draft',async()=>{
  const first=harness();await first.guide.selectSite('site');await first.action('continue');
  first.edit('workDate','2026-11-12');first.prepareProof();await first.action('to-before');
  const proof=first.draft.snapshot();first.close();
  first.local.setItem(first.draft.scope+'flow',JSON.stringify({...first.flow(),workDate:today,proof:null}));
  const next=harness({local:first.local,server:first.server,photos:first.photos});await next.guide.restore();
  assert.equal(next.form.elements.workDate.value,proof.workDate);assert.equal(next.form.elements.assetCode.value,proof.assetCode);
  assert.equal(next.form.elements.zoneId.value,proof.zoneId);assert.equal(next.form.elements.issue.value,'보존할 작업 메모');next.close();
});

test('reread fetches changed guidance and requires renewed safety checks without deleting photos or notes',async()=>{
  const h=harness();await h.guide.selectSite('site');await h.action('continue');h.prepareProof();
  await h.action('to-before');await h.action('to-after');await h.action('to-results');
  const proof=h.draft.snapshot(),before=h.requests.length,photos=[...h.photos];
  h.server.instructions='변경된 현장 안전 안내';h.server.version='v2';h.server.confirmed=false;
  await h.action('reread');
  assert.equal(h.requests.length,before+1);assert.match(h.requests.at(-1).path,/^work\/guidance\?/);
  assert.match(h.flow().guidanceVersion,/v1/,'old recovery remains intact until the new guidance is confirmed');
  assert.match(h.form.elements.issue.value,/보존할/);assert.equal(h.guide.canSave({siteId:'site'}),false);
  h.confirm();await h.action('continue');
  assert.equal(h.requests.at(-1).body.version,'v2');assert.equal(h.step(),'충전기 안전 점검');
  assert.equal(h.form.elements.guide_access.checked,false);assert.equal(h.resets.length,1);
  assert.equal(h.form.elements.assetCode.value,proof.assetCode);assert.equal(h.form.elements.zoneId.value,proof.zoneId);
  assert.equal(h.form.elements.issue.value,'보존할 작업 메모');assert.deepEqual([...h.photos],photos);
  await h.action('back');await h.action('continue');
  assert.equal(h.step(),'충전기 안전 점검','returning through site guidance must not bypass the renewed safety step');h.close();
});

test('unchanged guidance returns to the prior photo stage and failed refresh can retry without losing context',async()=>{
  const h=harness();await h.guide.selectSite('site');await h.action('continue');h.prepareProof();await h.action('to-before');
  const proof=h.draft.snapshot();h.server.fail=true;await h.action('reread');
  h.server.fail=false;await h.action('retry-site');await h.action('continue');
  assert.equal(h.step(),'작업 전 촬영');assert.equal(h.resets.length,0);assert.equal(h.form.elements.assetCode.value,proof.assetCode);
  assert.equal(h.form.elements.issue.value,'보존할 작업 메모');h.close();
});

test('a model refresh with new instructions interrupts active work for confirmation, but leaves the home screen alone',async()=>{
  const h=harness();await h.guide.selectSite('site');await h.action('continue');h.prepareProof();await h.action('to-before');
  const original=h.draft.snapshot();h.server.instructions='새 출입 및 안전 절차';h.server.version='v2';h.server.confirmed=false;
  h.setModel();await Promise.resolve();
  assert.equal(h.step(),'현장 정보와 청소 안내');assert.equal(h.guide.canSave({siteId:'site'}),false);
  h.confirm();await h.action('continue');assert.equal(h.step(),'충전기 안전 점검');
  assert.equal(h.form.elements.assetCode.value,original.assetCode);assert.equal(h.form.elements.issue.value,'보존할 작업 메모');
  await h.action('home');h.server.instructions='다음 안내';h.server.version='v3';h.server.confirmed=false;
  const count=h.requests.length;h.setModel();await Promise.resolve();assert.equal(h.requests.length,count);h.close();
});

test('once a newer unconfirmed version is observed, offline selection cannot reuse the old confirmed version',async()=>{
  const h=harness();await h.guide.selectSite('site');await h.action('continue');h.prepareProof();
  h.server.instructions='새 안전 절차';h.server.version='v2';h.server.confirmed=false;await h.action('reread');
  await h.action('home');navigator.onLine=false;h.server.fail=true;
  await assert.rejects(h.guide.selectSite('site'),/연결 실패/);h.close();
});
