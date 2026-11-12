const guidedChecks = ['guide_access','guide_equipment','guide_condition','guide_power','guide_isolation'];
const savedFields = ['chargerType','canopy','exterior','interior','safety',...guidedChecks,'issue','exteriorResultNote','interiorResultNote',
  'surroundingsStatus','surroundingsNote','faultStatus','faultNote'];
const checkFields = new Set(['exterior','interior','safety',...guidedChecks]);

export function evidenceDrafts(form,userId,{ signal,getAssignmentDue=()=>'',onError=()=>{} }={}) {
  const scope = 'bonyeon-proof:' + JSON.stringify([location.pathname,userId]) + ':';
  const memory = new Map();
  let current='';
  let hasWork=false;
  let failed=false;
  const status=message=>{ const output=form.querySelector('[data-evidence-draft-status]'); if (output) output.textContent=message; };
  const context=()=>Object.fromEntries(['siteId','workDate','zoneId'].map(name=>[name,form.elements[name].value]));
  const assignment=()=>getAssignmentDue(form.elements.siteId.value) || '';
  const key=()=>{
    const {siteId,workDate,zoneId}=context();
    return siteId && workDate ? scope+JSON.stringify([siteId,workDate,zoneId,assignment()]) : '';
  };
  const deviceKey=(id,assetCode)=>id+':device:'+JSON.stringify(assetCode);
  function write(id,record) {
    memory.set(id,record);
    try { localStorage.setItem(id,JSON.stringify(record)); return true; } catch { return false; }
  }
  function read(id) {
    if (memory.has(id)) return memory.get(id);
    try { return JSON.parse(localStorage.getItem(id) || 'null'); } catch { return null; }
  }
  function remove(id) {
    memory.delete(id);
    try { localStorage.removeItem(id); } catch {}
  }
  function fresh() { return {assetCode:'AUTO-'+crypto.randomUUID().toUpperCase(),assignmentDue:assignment()}; }
  function apply(record) {
    form.elements.assetCode.value=record.assetCode;
    form.dataset.assetLabel=record.assetLabel || '';
    for (const name of savedFields) {
      const field=form.elements[name];
      if (!field) continue;
      if (checkFields.has(name)) field.checked=record.values?.[name] ?? field.defaultChecked;
      else if (name.endsWith('Status')) field.value=record.values?.[name] ?? field.options[0].value;
      else field.value=record.values?.[name] ?? '';
    }
    form.elements.faultNote.required=form.elements.faultStatus.value==='issue';
    hasWork=Boolean(record.values);
    status(hasWork ? '이 기기에 자동 저장한 입력을 불러왔습니다. 사진 전송 상태는 촬영 목록에서 확인하세요.' : '');
  }
  function restore() {
    const next=key();
    if (current===next) return;
    current=next;
    if (!next) { form.elements.assetCode.value=''; hasWork=false; return; }
    let record=read(next);
    if (!record) {
      const fields=context();
      const legacy=read(scope+JSON.stringify([fields.siteId,fields.workDate,fields.zoneId]));
      if (legacy?.values && typeof legacy.assetCode==='string' && (!assignment() || fields.workDate>=assignment())) {
        record={...legacy,assignmentDue:assignment(),values:{...legacy.values,
          ...Object.fromEntries(['safety',...guidedChecks].map(name=>[name,false]))}};
      }
    }
    if (!record || record.assignmentDue!==assignment() || typeof record.assetCode!=='string') record=fresh();
    apply(record);
    write(current,record);
  }
  function save({ automatic=false }={}) {
    restore();
    if (!current) return false;
    const values=Object.fromEntries(savedFields.filter(name=>form.elements[name]).map(name=>{
      const field=form.elements[name]; return [name,checkFields.has(name) ? field.checked : field.value];
    }));
    const {siteId,workDate,zoneId}=context();
    const zone=form.elements.zoneId;
    const record={assetCode:form.elements.assetCode.value,assetLabel:form.dataset.assetLabel || '',assignmentDue:assignment(),values,
      zoneName:zone.selectedOptions?.[0]?.textContent || '',updatedAt:new Date().toISOString()};
    hasWork=true;
    const stored=write(current,record) && write(deviceKey(current,record.assetCode),record)
      && write(scope+'latest',{siteId,workDate,zoneId,assignmentDue:record.assignmentDue,assetCode:record.assetCode,zoneName:record.zoneName});
    failed=!stored;
    if (!stored) throw new Error('입력을 기기에 저장하지 못했습니다. 이 화면을 유지하고 브라우저 저장 공간을 확인해 주세요.');
    status(automatic ? '입력 자동 저장 완료 · 사진 전송 상태는 촬영 목록에서 확인하세요.' : '이 기기에 임시저장했습니다.');
    return true;
  }
  function flush() { return hasWork ? save({automatic:true}) : false; }
  function autoSave() {
    if (!form.elements.siteId.value || !form.elements.workDate.value) return;
    try { save({automatic:true}); } catch (error) { failed=true; status(error.message); onError(error); }
  }
  function useDevice(assetCode,assetLabel) {
    flush(); restore();
    if (!current) return;
    const record=read(deviceKey(current,assetCode));
    apply(record?.assignmentDue===assignment() ? record : {assetCode,assetLabel,assignmentDue:assignment()});
    write(current,record?.assignmentDue===assignment() ? record : {assetCode,assetLabel,assignmentDue:assignment()});
  }
  function reset() {
    if (!current) return;
    const asset=form.elements.assetCode.value;
    const saved=resume();
    remove(deviceKey(current,asset)); remove(current);
    if (saved?.assetCode===asset) remove(scope+'latest');
    hasWork=false; failed=false;
    const record=fresh(); apply(record); write(current,record);
  }
  function resume() {
    const saved=read(scope+'latest');
    if (!saved || typeof saved.siteId!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(saved.workDate || '')) return null;
    const due=getAssignmentDue(saved.siteId) || '';
    if (!due || saved.workDate>=due) {
      if (saved.assignmentDue===due) return saved;
      if (saved.assignmentDue===undefined) return {...saved,assignmentDue:due,legacy:true};
    }
    return null;
  }
  form.addEventListener('input',autoSave,{signal});
  form.addEventListener('change',autoSave,{signal});
  const safeFlush=()=>{try { flush(); } catch(error) {failed=true;status(error.message);onError(error);} };
  signal?.addEventListener('abort',safeFlush,{once:true});
  globalThis.window?.addEventListener('pagehide',safeFlush,{signal});
  globalThis.window?.addEventListener('beforeunload',event=>{
    safeFlush(); if (failed && hasWork) { event.preventDefault(); event.returnValue=''; }
  },{signal});
  globalThis.document?.addEventListener('click',event=>{
    if (!hasWork || !event.target.closest?.('a[href], [data-action="toggle-work-mode"], [data-action="native-logout"]')) return;
    safeFlush();
    if (failed) { event.preventDefault(); event.stopImmediatePropagation(); }
  },{signal,capture:true});
  return {restore,save,flush,useDevice,reset,resume,scope,hasWork:()=>hasWork,
    snapshot:()=>({...context(),assignmentDue:assignment(),assetCode:form.elements.assetCode.value,assetLabel:form.dataset.assetLabel || '',
      zoneName:form.elements.zoneId.selectedOptions?.[0]?.textContent || ''})};
}
